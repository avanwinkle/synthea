(function() {

const {ipcRenderer} = require('electron');

angular
    .module('SyntheaApp')
    .controller("SynEditorController", SynEditorController);

SynEditorController.$inject = ['SynProject','$filter','$log','$mdDialog','$q','$timeout'];

/**
 * Main controller for editing Synthea projects
 */
function SynEditorController(SynProject,$filter,$log,$mdDialog,$q,$timeout) {

    var seVm = this;

    this.project = SynProject.getProject();
    this.projectDef = SynProject.getProjectDef();

    this.SynProject_ = SynProject;
    this.$filter_ = $filter;
    this.$mdDialog_ = $mdDialog;
    this.$q_ = $q;
    this.$timeout_ = $timeout;

    // Start at the zero page
    this.currentPage = this.project.pages[0];

    // Get an id counter, a crude-but-effective incrementer
    this.idCount = 0;
    // Find the ids of everything in the project and go one higher
    var allthings = this.project.pages.concat(
        this.project.sections, this.project.cues);
    for (var i=0;i<allthings.length;i++) {
        if (allthings[i].id >= this.idCount) {
            this.idCount = allthings[i].id + 1;
        }
    }

    // Listen for calls to save the project (from the menu)
    ipcRenderer.on('get-project', function(evt) {
        ipcRenderer.send('save-project', this.project);
    }.bind(this));

}

/**
 * Wrapper around the editCue() that creates a new cue object and passes it
 * into the project upon completion
 * @param {integer} idx     Position of the cue in the target section
 * @param {object} section Section to add the cue to
 * @param {$event} $event  Click event (for modal positioning)
 */
SynEditorController.prototype.addCue = function(idx, section, $event) {

    // This will become our new cue
    var newCue = {
        sources: [],
    };

    // Set a default subgroup? If the board configuration says so
    switch (this.project.config.boardType) {
        case "music":
            newCue.subgroup = 'music';
            break;
        case "ambient":
            newCue.subgroup = 'ambient';
            break;
        default:
            newCue.subgroup = null;
    }

    // Make a cue in the cue editing modal
    this.editCue(newCue,$event).then(function(response) {
        // If success? Give it an id!
        newCue.id = this.idCount++;
        // And add it to the project
        this.project.cues.push(newCue);
        // Store the cue ids on the sections
        // AVW: This double check is from the legacy migration, won't need in future
        if (!section.cue_ids) {
            section.cue_ids = [];
        }
        section.cue_ids.push(newCue.id);
    }.bind(this));
};

/**
 * Add a new page to the project
 * @param {$event} $event Click event
 */
SynEditorController.prototype.addPage = function($event) {

    // Use the basic mdDialog prompt window for this
    var prompt = this.$mdDialog_.prompt()
        .title('Name for this Page')
        .targetEvent($event)
        .ok('Add Page')
        .cancel('Cancel')
        .theme('pink');

    this.$mdDialog_.show(prompt).then(function(result) {
        // Create a page object inline and push it
        this.project.pages.push({
            id: this.idCount++,
            name: result,
            // page_id: this.currentPage.id,
            display_order: this.project.pages.length,
            // cue_ids: [],
        });
    }.bind(this));
};


/**
 * Wrapper to call the SynProject copyMediaToProject() method. Not bound
 * directly because, in all likelihood, we'll want to do some interception
 *
 * @return {promise} Promise from SynProject, resolved with media list
 */
SynEditorController.prototype.copyMediaToProject = function() {

    this.SynProject_.copyMediaToProject();
};

/**
 * Working with the angular drag-drop-lists library has some goofy behavior.
 * Even though returning `cue` should be the default behavior if no event
 * is defined, the current setup only works when we explicitly define thise.
 * @param  {SynCue} cue A cue object that's been dragged
 * @return {SynCue}     That same cue object...
 */
SynEditorController.prototype.insertCue = function(cue) {
    return cue;
};

/**
 * Edit a cue by opening up a modal and process the resolution of the modal
 * @param  {SynCue} cue    The cue to edit
 * @param  {$event} $event Click event (for modal positioning)
 * @return {promise}   A promise resolved with the updated cue
 */
SynEditorController.prototype.editCue = function(cue,$event) {

    // Make our own promise so we can intercept the response if needed
    var defer = this.$q_.defer();

    // Open up our dialog, which has its own controller because it's complex
    this.$mdDialog_.show({
        bindToController: true,
        clickOutsideToClose: false,
        controller: 'SynEditCueController',
        controllerAs: 'secVm',
        escapeToClose: false,
        locals: {
            // Send a COPY of the cue, so we can cancel changes
            cue: angular.copy(cue),
        },
        templateUrl: 'templates/modals/edit-cue.html',
        targetEv: $event,
    }).then(function(response) {
        // A 'null' response means delete the cue
        if (response===null) {
            // Splice from the list of cues
            this.project.cues.splice(
                this.project.cues.indexOf(cue),1);
            // Remove the id reference from any sections it was in
            angular.forEach(this.project.sections, function(s) {
                if (s.cue_ids && s.cue_ids.indexOf(cue.id)!== -1) {
                    s.cue_ids.splice(
                        s.cue_ids.indexOf(cue.id),1);
                }
            });
            // Promise still resolves
            defer.resolve(null);
        }
        // If it's not null, then it's our new/updated cue!
        else {
            // Merge the copy's changes back on to the original
            angular.merge(cue,response);

            // MIGRATION: Not all projects have subgroups
            if (!this.project.subgroups) { this.project.subgroups = {}; }

            // If this cue has a subgroup, make sure the project knows
            // (i.e. this might be a new subgroup)
            if (cue.subgroup && !this.project.subgroups[cue.subgroup]) {
                this.project.subgroups[cue.subgroup] = {
                    // We can't change subgroup fades yet, so don't define it
                    isFadeIn: undefined
                };
            }
            // Resolve with the original (yet updated cue)
            defer.resolve(cue);
        }

    }.bind(this), defer.reject);

    return defer.promise;
};

/**
 * Method to open a section-manager modal for adding, removing, reordering
 * @param  {integer} page_id Id of the page to manage sections of
 * @param  {$event} $event  Click event (for modal positioning)
 */
SynEditorController.prototype.manageSections = function(page_id, $event) {

    // Pull out an array of just the sections in the requested page
    var sections = this.$filter_('filter')(
                    this.project.sections, {page_id: page_id}
                ).map(function(s) {
                    // Store a copy of the name for changing
                    s._newname = s.name;
                    return s;
                });
    // Sort them according to their display_order because the modal
    // shows them in actual array index order
    sections.sort(function(a,b) { return a.display_order >= b.display_order; });

    // Make a modal
    this.$mdDialog_.show({
        bindToController: true,
        // When is a controller hefty enough to get its own file?
        controller: [ function() {
            var ssVm = this;

            ssVm.addSection = function() {
                ssVm.sections.push({
                    display_order: ssVm.sections.length,
                    page_id: page_id,
                    name: undefined,
                });
            };

            ssVm.deleteSection = function(idx) {
                ssVm.sections.splice(idx,1);
            };

            ssVm.saveSections = function() {
                // Drag and drop creates NEW COPIES of objects, so we can't
                // just modify in place. Instead, make an array of section ids
                var newOrder = ssVm.sections.map(function(s) {
                    // New sections don't have ids, just names
                    return s.id || s._newname;
                });
                // Return this array of ids/names to the controller, which will
                // match the ids against the original section objects and
                // propagate modifications to those originals
                ssVm.$hide({sections: ssVm.sections, order: newOrder});
            };
        }],
        controllerAs: 'ssVm',
        locals: {
            // Pass in the dialog methods for closing
            $cancel: this.$mdDialog_.cancel,
            $hide: this.$mdDialog_.hide,
            // Our sorted list of sections in the requested page
            sections: sections
        },
        templateUrl: 'templates/modals/manage-sections.html',
        targetEv: $event,
    }).then(function(response) {
        console.log(response)
        // Use the array of ids to set the display order
        for (var i=this.project.sections.length-1;i>=0;i--) {
            // The section of this iteration
            var s = this.project.sections[i];
            // The index of THIS section in the new sort order
            var idx = response.order.indexOf(s.id);

            // Does this section exist in the new sort order?
            if (idx !== -1) {
                s.display_order = idx;
                // Do we have a new name?
                if (response.sections[idx]._newname) {
                    s.name = response.sections[idx]._newname;
                }
            }
            // Was this section deleted from the page?
            else if (s.page_id === page_id) {
                this.project.sections.splice(i,1);
                // Also delete all the cues that used to live in this section?
                // AVW: Will need to decide how to behave once cues can be put
                // in multiple sections, i.e. when (if ever) are they collected?
                for (var k=this.project.cues.length-1;k>=0;k--) {
                    if (s.cue_ids.indexOf(this.project.cues[k].id)!== -1) {
                        this.project.cues.splice(k,1);
                    }
                }
            }
        }

        // Did we get any new sections?
        for (var j=0;j<response.order.length;j++) {
            // If it came back as a string, it's new
            if (typeof(response.order[j])==='string') {
                // Make a section object with an id
                 this.project.sections.push({
                    id: this.idCount++,
                    name: response.order[j],
                    page_id: page_id,
                    display_order: j,
                    cue_ids: [],
                });
            }
        }

    }.bind(this));
};

/**
 * Event callback for dragging a cue button within or between sections. This
 * is a callback from angular-drag-drop-lists, which isn't super clear on how
 * to handle these situations. This method is the result of a LOT of trial-and-error
 * and, while functional, is not fully understood.
 *
 * @param  {integer} cue_id  Id of the cue being moved
 * @param  {object} section  The section this cue started in
 * @param  {integer} orig_idx The original index of this cue in the section
 * @return {boolean}          Return true (for drag-drop-lists)
 */
SynEditorController.prototype.moveCue = function(cue_id, section, orig_idx) {
    // Because we track by $index and have a realtime filter on the array
    // to show the section cues, we cannot depend on the array position $index
    // argument to accurately reflect the object being moved. We know the id of
    // the cue that's moving though, because it appears twice in the array

    // If the original idx is the first one, that's the one we splice
    // (because we want to keep the second one, the non-original)
    if (section.cue_ids.lastIndexOf(cue_id)!==orig_idx) {
        section.cue_ids.splice(orig_idx,1);
    }
    // Otherwise, look to one position AFTER the original idx. If we moved the
    // cue up then its previous position would be pushed down by one. If the
    // cue id after the original idx appears twice, that's what happened.
    else if (section.cue_ids.indexOf(section.cue_ids[orig_idx+1])!==orig_idx+1 ||
            // OR, if this cue is the last one already, there's none after
            orig_idx+1 === section.cue_ids.length) {
        // Whichever the latter is (orig_idx or last in list), splice out
        section.cue_ids.splice( Math.min(orig_idx+1, section.cue_ids.length-1),1);
    }
    // Otherwise, we've moved the cue OUT of this section and just gotta remove
    // whatever the original idx was
    else {
        section.cue_ids.splice(orig_idx,1);
    }

    return true;
};

SynEditorController.prototype.openMenu = function($mdOpenMenu, ev) {
      originatorEv = ev;
      $mdOpenMenu(ev);
};

/**
 * When we're done editing, we can save the project, close the editor, and
 * open the project in the player.
 */
SynEditorController.prototype.saveAndClose = function() {
    ipcRenderer.send('save-and-open-project', this.project);
};

// IIFE
})();