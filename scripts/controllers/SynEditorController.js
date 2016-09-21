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
        // If we know the subgroup.
        // TODO: Handle arbitrary subgroups?
        case "music":
        case "ambient":
        case "rain":
        case "fire":
        case "wind":
            newCue.subgroup = this.project.config.boardType;
            break;
        default:
            newCue.subgroup = null;
    }

    // Make a cue in the cue editing modal
    this.editCue(newCue,$event).then(function(response) {
        // If success? Give it an id!
        newCue.id = this.idCount++;

        // Do we need to update a hotkey with the new id?
        if (newCue._hotkey) {
            newCue._hotkey.cue_id = newCue.id;
            this._attachHotkey(newCue._hotkey);
        }

        // And add it to the project
        this.project.cues.push(newCue);
        // Store the cue ids on the sections
        // AVW: This double check is from the legacy migration, won't need in future
        if (!section.cue_ids) {
            console.warn('Migration: section does not have cue ids array');
            section.cue_ids = [];
        }
        section.cue_ids.push(newCue.id);
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

SynEditorController.prototype.deleteCue = function(cue) {

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
            this.deleteCue(cue);
            // Promise still resolves
            defer.resolve(null);
        }
        // If it's not null, then it's our new/updated cue!
        else {
            // Merge the copy's changes back on to the original
            angular.merge(cue,response);

            // MIGRATION: Not all projects have subgroups
            if (!this.project.subgroups) {
                console.warn('Migration: project files need subgroups.');
                this.project.subgroups = {};
            }

            // If this cue has a subgroup, make sure the project knows
            // (i.e. this might be a new subgroup)
            if (cue.subgroup && !this.project.subgroups[cue.subgroup]) {
                this.project.subgroups[cue.subgroup] = {
                    // We can't change subgroup fades yet, so don't define it
                    isFadeIn: undefined
                };
            }

            // If this cue has a hotkey (and an id. New cues need to get ids first)
            if (cue.id && cue._hotkey) {
                // Make sure the id matches this cue
                cue._hotkey.cue_id = cue.id;
                this._attachHotkey(cue._hotkey);
            }

            // Resolve with the original (yet updated cue)
            defer.resolve(cue);
        }

    }.bind(this), defer.reject);

    return defer.promise;
};

SynEditorController.prototype.manageMedia = function($event) {
    // Make a modal
    this.$mdDialog_.show({
        bindToController: true,
        // When is a controller hefty enough to get its own file?
        controller: 'SynMediaController',
        controllerAs: 'smVm',
        // We can delete cues from within
        locals: {
            // But bind to this!
            deleteCue: this.deleteCue.bind(this),
        },
        templateUrl: 'templates/modals/manage-media.html',
        targetEv: $event,
    });
};

SynEditorController.prototype.managePages = function($event) {
    this._manageList($event, 'pages');
};
/**
 * Method to open a section-manager modal for adding, removing, reordering
 * @param  {integer} page_id Id of the page to manage sections of
 * @param  {$event} $event  Click event (for modal positioning)
 */
SynEditorController.prototype.manageSections = function(page_id, $event) {
    this._manageList($event, 'sections', page_id);
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

// TODO: Combine the saveProject and saveAndClose
SynEditorController.prototype.saveProject = function() {
    this.SynProject_.saveProject();
};

/**
 * Receive a hotkey object from the SynEditCueController and update the project
 * layout hotkeys configuration.
 *
 * @param  {object} hotkey A hotkey object with cue_id and _code properties
 */
SynEditorController.prototype._attachHotkey = function(hotkey) {

    // Only one hotkey per cue
    angular.forEach( this.project.hotKeys, function(keyobj,keycode) {
        if (keyobj.cue_id===hotkey.cue_id) {
            delete(this.project.hotKeys[keycode]);
        }
    }.bind(this));

    // Remove reference pointing-ness by creaty a copy of the hotkey object
    this.project.hotKeys[hotkey._code] = angular.copy(hotkey);
    // Clear out the temporary hotkey _code, don't need that anymore
    delete( this.project.hotKeys[hotkey._code]._code );

};

/**
 * Method for managing a list of items in a project, e.g. sections or pages.
 * This method opens a dialog window with the list manager after pulling the
 * appropriate items into an array.
 *
 * @param  {$event} $event   Click event (for modal positioning)
 * @param  {string} listtype Type of items to manage ('pages','sections')
 * @param  {integer} page_id  Current page number (for managing sections)
 */
SynEditorController.prototype._manageList = function($event, listtype, page_id) {

    // Assemble the appropriate array of objects to manage
    let list;
    if (listtype === 'sections') {
        // Pull out an array of just the sections in the requested page
        list = this.$filter_('filter')(
                        this.project.sections, {page_id: page_id}
                    ).map(function(s) {
                        // Store a copy of the name for changing
                        s._newname = s.name;
                        return s;
                    });
    }
    else if (listtype === 'pages') {
        // Make a a copy so changes can be cancelled
        list = angular.copy(this.project.pages);
    }
    else {
        console.error('Unknown list type \''+listtype+'\'');
        return;
    }

    // Make a promise for the modal resolution
    var defer = this.$q_.defer();

    // Make a modal
    this.$mdDialog_.show({
        bindToController: true,
        // When is a controller hefty enough to get its own file?
        controller: 'SynListController',
        controllerAs: 'slVm',
        locals: {
            // Our sorted list
            list: list,
            listtype: listtype,
        },
        templateUrl: 'templates/modals/manage-list.html',
        targetEv: $event,
        onComplete: function(scope) {
            scope.slVm.activate();
        }
    }).then(function(response) {

        // What do we target?
        var target;
        if (listtype==='sections') {
            target = this.project.sections;
        }
        else {
            target = this.project.pages;
        }

        // Use the array of ids to set the display order
        for (var i=target.length-1;i>=0;i--) {
            // The item of this iteration
            var s = target[i];
            // The index of the above item in the new sort order
            var idx = response.order.indexOf(s.id);

            // Does this item exist in the new sort order?
            if (idx !== -1) {
                // Set the display order according to the sort order
                s.display_order = idx;
                // Do we have a new name? Check the actual list that came back
                if (response.list[idx]._newname) {
                    s.name = response.list[idx]._newname;
                }
            }
            // Was it deleted? Any page not in the order is deleted, or any
            // section that belongs in the given page that's not there is too
            else if (listtype==='pages' || s.page_id === page_id) {
                target.splice(i,1);

                if (listtype==='sections') {
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
        }

        // Did we get any new items?
        for (var j=0;j<response.order.length;j++) {
            // If it came back as a string, it's new
            if (typeof(response.order[j])==='string') {
                // Make a new object with an id
                var newitem = {
                    id: this.idCount++,
                    name: response.order[j],
                    display_order: j,
                };

                // Sections need some additional properties
                if (listtype === 'sections') {
                    newitem.page_id = page_id;
                    newitem.cue_ids = [];
                }

                target.push(newitem);
            }
        }

    }.bind(this));

};

// IIFE
})();