(function() {

const {ipcRenderer} = require('electron');

angular
    .module('SyntheaApp')
    .controller("SynEditorController", SynEditorController);

SynEditorController.$inject = ['SynMixer','SynProject','$log','$mdDialog','$q'];

function SynEditorController(SynMixer,SynProject,$log,$mdDialog,$q) {

    var seVm = this;
    window.seVm = this;

    this.project = SynProject.getProject();
    this.projectDef = SynProject.getProjectDef();

    this.$mdDialog_ = $mdDialog;
    this.$q_ = $q;

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

SynEditorController.prototype.editCue = function(cue,$event) {

    // Make our own promise so we can intercept the response if needed
    var defer = this.$q_.defer();

    this.$mdDialog_.show({
        bindToController: true,
        controller: 'SynEditCueController',
        controllerAs: 'secVm',
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
            defer.resolve(cue);
        }

    }.bind(this), defer.reject);

    return defer.promise;
};


SynEditorController.prototype.saveAndClose = function() {
    ipcRenderer.send('save-and-open-project', this.project);
};

// IIFE
})();