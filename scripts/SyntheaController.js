(function() {

const {ipcRenderer} = require('electron');

angular
    .module('SyntheaApp')
    .controller("SyntheaController", SyntheaController);

SyntheaController.$inject = ['SynMixer','SynProject','$log'];

function SyntheaController(SynMixer,SynProject,$log) {

    var sVm = this;
    window.sVm = sVm;
    this.SynMixer_ = SynMixer;
    this.SynProject_ = SynProject;
    this.$log_ = $log;
    // The current playing track(s)
    this.currentTracks = [];

    // We need a mixer
    var mixer;

    // Listen for the main application to broadcast a project change
    ipcRenderer.on('open-project', function(event,projectDef) {
        console.log("projectDef", projectDef)
        sVm.loadProject(projectDef);
    });

    activate();

    document.addEventListener('keypress', function(e) {

        // If we're in an input, DON'T trigger any keypress events
        if (e.target.nodeName === 'INPUT') {
            return;
        }

        // Spacebar is reserved for locking
        else if (e.code === 'Space') {
            // Chromium wants space to scroll the page, don't allow that
            e.preventDefault();
            this.mixer.toggleLock();
        }

        else if (this.project.hotKeys.hasOwnProperty(e.code)) {
            var hotkey = this.project.hotKeys[e.code];
            console.log('hotkey',hotkey);
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
        // sVm.loadProject('MMCP');
    }

}

// Define a "context" action (aka right-click) for a cue button
SyntheaController.prototype.contextCue = function(button) {
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
    this.currentColumns = this.project.columns[page];
    this.currentButtons = this.project.buttons[page];
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