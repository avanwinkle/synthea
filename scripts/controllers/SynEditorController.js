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
        name: 'new cue '+idx,
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

SynEditorController.prototype.addSection = function(idx,$event) {

    var prompt = this.$mdDialog_.prompt()
        .title('Name for this Section')
        .targetEvent($event)
        .ok('Add Section')
        .cancel('Cancel');

    this.$mdDialog_.show(prompt).then(function(result) {
        this.project.sections.push({
            id: this.idCount++,
            name: 'new section '+idx,
            page_id: this.currentPage.id,
            display_order: idx,
            cue_ids: [],
        });
    }.bind(this));

};

SynEditorController.prototype.copyMediaToProject = function() {

    // This is an ugly way to handle a promise nobody cares about...
    // but I'm going to keep it until the full editing flow is done.

    var copyFun = function() {

        var defer = this.$q_.defer();

        ipcRenderer.once('project-media', function(evt, media) {
            defer.resolve(media);
        }.bind(this));

        ipcRenderer.send('add-media-to-project',this.projectDef.key);

        return defer.promise;
    }.bind(this);

    copyFun().then(function(media) {
        this.media = media;
    }.bind(this));
};

SynEditorController.prototype.editCue = function(cue,$event) {

    // Make our own promise so we can intercept the response if needed
    var defer = this.$q_.defer();
    var mediaProm = this.getProjectMediaList();

    this.$mdDialog_.show({
        bindToController: true,
        controller: 'SynEditCueController',
        controllerAs: 'secVm',
        locals: {
            cue: cue,
            // $mdDialog will automatically bind the result
            // of the promise to this local variable
            mediaList: mediaProm,
        },
        templateUrl: 'templates/modals/edit-cue.html',
        targetEv: $event,
    }).then(function(reason) {
        // A 'null' response means DELETE THIS CUE! :-O
        if (reason===null) {
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
            defer.resolve(reason);
        }

    }.bind(this), defer.reject);

    return defer.promise;
};

SynEditorController.prototype.getProjectMediaList = function() {

    // Create a promise to async fetch the listing
    var defer = this.$q_.defer();

    // Create a listener for the impending broadcast
    ipcRenderer.once('project-media', function(evt, media) {
        defer.resolve(media);
    });

    ipcRenderer.send('get-project-media', {key: this.projectDef.key});

    return defer.promise;
};


// IIFE
})();