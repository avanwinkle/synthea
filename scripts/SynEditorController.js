(function() {

const {ipcRenderer} = require('electron');

angular
    .module('SyntheaApp')
    .controller("SynEditorController", SynEditorController);

SynEditorController.$inject = ['SynMixer','SynProject','$log','$q'];

function SynEditorController(SynMixer,SynProject,$log,$q) {

    var seVm = this;
    window.seVm = this;

    this.project = SynProject.getProject();
    this.projectDef = SynProject.getProjectDef();
    this.$q_ = $q;

    // Start at the zero page
    this.currentPage = this.project.pages[0];

    // Get an id counter
    this.idCount = 0;
    var allthings = this.project.pages.concat(this.project.columns, this.project.buttons);
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

SynEditorController.prototype.activate = function() {

    this.getProjectMediaList().then(function(media) {
        this.media = media;
    }.bind(this));
};

SynEditorController.prototype.addColumn = function(idx) {
    this.project.columns.push({
        id: this.idCount++,
        name: 'new column '+idx,
        page_id: this.currentPage.id,
        display_order: idx,
        // _buttons: [],
    });
};

SynEditorController.prototype.addCue = function(idx, column) {
    var cue = {
        id: this.idCount++,
        files: [],
        name: 'new button '+idx,
        column_ids: [column.id],
        display_order: idx,
    };
    this.project.buttons.push(cue);
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