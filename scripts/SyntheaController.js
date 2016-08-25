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

    document.addEventListener('keypress', function(e) {
        console.log('keypress',e);


        if (e.code === 'Space') {
            e.preventDefault();
            this.mixer.toggleLock();
        }

        else if (this.project.hotKeys.hasOwnProperty(e.code)) {
            var hotkey = this.project.hotKeys[e.code];
            // Is there a cue that matches this key?
            if (hotkey.cue) {
                // SHIFT to queue, no shift to play
                if (e.shiftKey) {
                    this.mixer.queue(hotkey.cue);
                } else {
                    this.mixer.play(hotkey.cue);
                }
            }
        }


    }.bind(this));

    document.addEventListener('keyup', function(e) {
        if (e.code === 'Backspace') {
            this.mixer.stop();
        }
    }.bind(this));


    function activate() {
        sVm.loadProject('MMCP');
    }

}

SyntheaController.prototype.contextCue = function(button) {
    console.info("RIGHT CLICK!",button.cue.name);
    console.info(this);
    this.mixer.queue(cue);
};

SyntheaController.prototype.loadProject = function(pkey) {

    this.SynProject_.load(pkey).then(function() {

        this.project = this.SynProject_.getProject();
        this.mixer = this.SynMixer_.createMixer();

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