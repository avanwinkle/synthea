(function() {

const {ipcRenderer} = require('electron');

angular
    .module('SyntheaApp')
    .controller("SyntheaController", SyntheaController);

SyntheaController.$inject = ['SynMixer','SynProject','$log','$scope','$timeout'];

function SyntheaController(SynMixer,SynProject,$log,$scope,$timeout) {

    var sVm = this;
    window.sVm = sVm;
    this.SynMixer_ = SynMixer;
    this.SynProject_ = SynProject;
    this.$log_ = $log;
    this.$timeout_ = $timeout;
    // The current playing track(s)
    this.currentTracks = [];

    // We need a mixer
    var mixer;
    // We need to track some variables
    var vars = {
        is_dj_mode: false,
    };

    // Listen for the main application to broadcast a project change
    ipcRenderer.on('open-project', function(event,projectDef) {
        sVm.loadProject(projectDef);
    });

    // Listen for DJ Mode!
    ipcRenderer.on('toggle-dj', function(event) {
        // Turn it off?
        if (vars.is_dj_mode) {
            this.stopAll();
        }
        else {
            this.enableDJMode();
        }

        vars.is_dj_mode = !vars.is_dj_mode;
    }.bind(this));

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

        else {

            // Assemble a composite keycode with accelerators
            var code =
                (e.ctrlKey ? 'Ctrl.':'') +
                (e.altKey ? 'Alt.' : '') +
                (e.shiftKey ? 'Shift.' : '') +
                e.code;
            if (this.project.hotKeys.hasOwnProperty(code)) {
                var hotkey = this.project.hotKeys[code];
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
        }

        // This is a non-angular event
        $scope.$apply();

    }.bind(this));

    document.addEventListener('keyup', function(e) {

        switch (e.code) {
            case 'Backspace':
                this.mixer.stop();
                break;
            case 'ArrowRight':
                this.selectPage('next');
                break;
            case 'ArrowLeft':
                this.selectPage('prev');
                break;
        }

        // This is a non-angular event
        $scope.$apply();

    }.bind(this));


    function activate() {
        // sVm.loadProject('MMCP');
    }

}

// Define a "context" action (aka right-click) for a cue button
SyntheaController.prototype.contextCue = function(button) {
    this.mixer.queue(cue);
};

SyntheaController.prototype.enableDJMode = function() {

    // How many new tracks before repeat?
    const TOTAL_TRACKS = this.project.buttons.length;
    const PLAY_MEMORY = Math.min( TOTAL_TRACKS, 10);
    let recently_played = [];

    var syn = this;

    // Too lazy to integrate the existing track into DJ mode
    this.stopAll();

    // Play a random track
    function getRandomTrack() {
        var tracknum = Math.floor(Math.random() * TOTAL_TRACKS);
        return syn.project.buttons[ tracknum ];
    }

    function playThatFunkyMusic() {

        // Don't let it be a recently played one
        var track = getRandomTrack();
        while (recently_played.indexOf(track) !== -1) {
            track = getRandomTrack();
        }

        // Note that we're recently played
        recently_played.push(track);
        // Trim the recent list, if need be
        if (recently_played.length == TOTAL_TRACKS - 1) {
            // When we clear the history, keep the last few to avoid repeats
            recently_played.splice(0, TOTAL_TRACKS - PLAY_MEMORY);
        }

        // Play it, for one
        var channel = syn.selectCue(track);

        // Rather than promise, just set a time
        syn.dj_timer_ = syn.$timeout_(function() {

            var playtime = channel.getDuration();

            // Loop? Make it random!
            // But also, skip anything that's too short
            if (track.isLoop && 30 < playtime < 120 ) {
                // Add up to two additional loops
                playtime += Math.floor(Math.random() * playtime * 2);
            }

            // When the time is up, change! (But start a touch earlier)
            syn.dj_timer_ =
                syn.$timeout_(playThatFunkyMusic, playtime*1000-3000);

            // Undercut
        // Wait a sec for the track to get going
        },1000);

    }

    playThatFunkyMusic();

};

SyntheaController.prototype.loadProject = function(pkey) {

    // If we have a mixer already, stop anything it's doing
    if (this.mixer) {
        this.stopAll();
    }

    this.SynProject_.load(pkey).then(function() {

        this.project = this.SynProject_.getProject();
        this.mixer = this.SynMixer_.createMixer();

        this.selectPage( this.SynProject_.getPage() );

        // And a nice title
        document.title = 'Synthea: ' + this.project.name;
    }.bind(this));
};

SyntheaController.prototype.selectPage = function(page) {
    var pages = this.project.pages;
    var currentIdx = pages.indexOf(this.currentPage);

    // We can scroll
    if (page==='next') {
        if (currentIdx < pages.length-1) {
            page = pages[currentIdx + 1];
        } else {
            page = pages[0];
        }
    }
    else if (page==='prev') {
        if (currentIdx === 0) {
            page = pages[pages.length-1];
        } else {
            page = pages[currentIdx - 1];
        }
    }

    this.currentPage = page;
    this.currentColumns = this.project.columns[page];
    this.currentButtons = this.project.buttons[page];
};

SyntheaController.prototype.selectCue = function(cue) {

    // Note that we're playing this cue
    if (this.currentTracks.indexOf(cue)===-1) {
        this.currentTracks.push(cue);
    }

    // Use the mixers method, which returns the channel
    return this.mixer.play(cue);

};

SyntheaController.prototype.stopAll = function() {
    this.mixer.stop();
    this.currentTracks = [];
    // Do we have a DJ timer to cancel?
    if (this.dj_timer_) {
        this.$timeout_.cancel(this.dj_timer_);
    }
};

// IIFE
})();