(function() {

const {ipcRenderer} = require('electron');

angular
    .module('SyntheaApp')
    .controller("SynEditorController", SynEditorController);

SynEditorController.$inject = ['SynMixer','SynProject','$log','$mdDialog','$q','$timeout'];

function SynEditorController(SynMixer,SynProject,$log,$mdDialog,$q,$timeout) {

    var seVm = this;
    window.seVm = this;

    this.project = SynProject.getProject();
    this.projectDef = SynProject.getProjectDef();

    this.$mdDialog_ = $mdDialog;
    this.$q_ = $q;
    this.$timeout_ = $timeout;

    // Start at the zero page
    this.currentPage = this.project.pages[0];

    // Get an id counter
    this.idCount = 0;
    var allthings = this.project.pages.concat(
        this.project.sections, this.project.cues);
    for (var i=0;i<allthings.length;i++) {
        if (allthings[i].id >= this.idCount) {
            this.idCount = allthings[i].id + 1;
        }
    }

    // Listen for calls to save
    ipcRenderer.on('get-project', function(evt) {
        ipcRenderer.send('save-project', this.project);
    }.bind(this));

}

SynEditorController.prototype.addCue = function(idx, section, $event) {

    var newCue = {
        sources: [],
        section_ids: [section.id],
        display_order: idx,
    };

    // Set a default subgroup?
    switch (this.project.config.boardType) {
        case "music":
            newCue.subgroup = 'music';
            break;
        case "ambient":
            newCue.subgroup = 'ambience';
            break;
        default:
            newCue.subgroup = null;
    }

    // Make a cue in the cue editing modal
    this.editCue(newCue,$event).then(function(response) {
        // If success? Give it an id!
        newCue.id = this.idCount++;
        this.project.cues.push(newCue);
        // Try it this way: store the cue ids on the sections, rather than vice versa
        if (!section.cue_ids) {
            section.cue_ids = [];
        }
        section.cue_ids.push(newCue.id);
    }.bind(this));

};

SynEditorController.prototype.addPage = function($event) {

    var prompt = this.$mdDialog_.prompt()
        .title('Name for this Page')
        .targetEvent($event)
        .ok('Add Page')
        .cancel('Cancel')
        .theme('default');

    this.$mdDialog_.show(prompt).then(function(result) {
        this.project.pages.push({
            id: this.idCount++,
            name: result,
            page_id: this.currentPage.id,
            display_order: this.project.pages.length,
            cue_ids: [],
        });
    }.bind(this));

};

SynEditorController.prototype.addSection = function(idx,page_id,$event) {

    var prompt = this.$mdDialog_.prompt()
        .title('Name for this Section')
        .targetEvent($event)
        .ok('Add Section')
        .cancel('Cancel')
        .theme('pink');

    this.$mdDialog_.show(prompt).then(function(result) {
        this.project.sections.push({
            id: this.idCount++,
            name: result,
            page_id: page_id,
            display_order: idx,
            cue_ids: [],
        });
    }.bind(this));

};

SynEditorController.prototype.copyMediaToProject = function() {

    SynProject.copyMediaToProject();
};

SynEditorController.prototype.insertCue = function(cue) {
    // console.log('dropCue '+cue+' at index '+idx);
    // console.info(section.name, angular.copy(section.cue_ids))
    // Splice this cue out of the original array
    // section.cue_ids.splice(idx,0,1);
    return cue;
};

SynEditorController.prototype.editCue = function(cue,$event) {

    // Make our own promise so we can intercept the response if needed
    var defer = this.$q_.defer();

    this.$mdDialog_.show({
        bindToController: true,
        clickOutsideToClose: false,
        controller: 'SynEditCueController',
        controllerAs: 'secVm',
        escapeToClose: false,
        locals: {
            // Send a copy
            cue: angular.copy(cue),
        },
        templateUrl: 'templates/modals/edit-cue.html',
        targetEv: $event,
    }).then(function(response) {
        // A 'null' response means DELETE THIS CUE! :-O
        if (response===null) {
            // Splice from the list of cues
            this.project.cues.splice(
                this.project.cues.indexOf(cue),1);
            // Remove from any sections
            angular.forEach(this.project.sections, function(s) {
                if (s.cue_ids && s.cue_ids.indexOf(cue.id)!== -1) {
                    s.cue_ids.splice(
                        s.cue_ids.indexOf(cue.id),1);
                }
            });

            defer.resolve(null);
        }
        // If it's not null, then it's our new cue!
        else {
            // Merge the copy's changes back on
            angular.merge(cue,response);

            // MIGRATION: Not all projects have subgroups
            if (!this.project.subgroups) { this.project.subgroups = {}; }

            // If this cue has a subgroup, make sure the project knows
            if (cue.subgroup && !this.project.subgroups[cue.subgroup]) {
                this.project.subgroups[cue.subgroup] = {
                    // We can't change subgroup fades yet, so don't define it
                    isFadeIn: undefined
                };
            }

            defer.resolve(cue);
        }

    }.bind(this), defer.reject);

    return defer.promise;
};

SynEditorController.prototype.moveCue = function(cue_id, section, orig_idx) {
    // Because we track by $index, we cannot depend on the array position $index
    // argument to accurately reflect the object being moved. We know the id of
    // the cue that's moving though, because it appears twice in the array

    // If the original idx is the first one, that's the one we splice
    if (section.cue_ids.lastIndexOf(cue_id)!==orig_idx) {
        section.cue_ids.splice(orig_idx,1);
    }
    // Otherwise, look to one AFTER the original idx. If that appears twice,
    // splice out the first one
    else if (section.cue_ids.indexOf(section.cue_ids[orig_idx+1])!==orig_idx+1 ||
            // OR, if this cue is the last one already, there's none after
            orig_idx+1 === section.cue_ids.length) {
        // Whichever the latter is (orig_idx or last in list), splice out
        section.cue_ids.splice( Math.min(orig_idx+1, section.cue_ids.length-1),1);
    }
    // Otherwise, we've moved the cue OUT of this section and just gotta remove
    else {
        section.cue_ids.splice(orig_idx,1);
    }

    return true;

};

SynEditorController.prototype.saveAndClose = function() {
    ipcRenderer.send('save-and-open-project', this.project);
};

// IIFE
})();