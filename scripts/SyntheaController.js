(function() {

const {ipcRenderer} = require('electron');

angular
    .module('SyntheaApp')
    .controller("SyntheaController", SyntheaController);

SyntheaController.$inject = ['SynMixer','SynProject','$log'];

function SyntheaController(SynMixer,SynProject,$log) {

    var sVm = this;
    this.SynMixer_ = SynMixer;
    this.SynProject_ = SynProject;
    this.$log_ = $log;
    // The current playing track(s)
    this.currentTracks = [];

    // We need a mixer
    var mixer;

    // Listen for the main application to broadcast a project change
    ipcRenderer.on('open-project', function(event,projectName) {
        sVm.loadProject(projectName);
    });

    activate();


    function activate() {
        sVm.loadProject('BlackFlag');
    }

}

SyntheaController.prototype.loadProject = function(pkey) {

    this.SynProject_.load(pkey).then(function() {

        this.project = this.SynProject_.getProject();
        this.mixer = new this.SynMixer_();
        console.log(this.project);

        this.selectPage( this.SynProject_.getPage() );
    }.bind(this));
};

SyntheaController.prototype.selectPage = function(page) {
    this.currentPage = page;
    this.currentColumns = this.project.master.columns[page];
    this.currentButtons = this.project.master.buttons[page];
};

SyntheaController.prototype.selectCue = function(cue) {

    // Use it's internal method, so we know that's an option
    this.mixer.play(cue);

    // Track it
    if (this.currentTracks.indexOf(cue)===-1) {
        this.currentTracks.push(cue);
    }
};

SyntheaController.prototype.stopAll = function() {
    this.mixer.stop();
    this.currentTracks = [];
};

// IIFE
})();