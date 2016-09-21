(function() {

const {ipcRenderer} = require('electron');

angular
    .module('SyntheaApp')
    .controller("SynPlayerController", SynPlayerController);

SynPlayerController.$inject = ['SynMixer','SynProject','$location','$log','$scope','$timeout'];

/**
 * The main controller for the "player" view, aka the board when in playback mode.
 * @constructor
 *
 * @property {Project} [project] The project object for the current project
 * @property {Mixer} [mixer] The mixer object for the current project
 * @property {SynMixer} [SynMixer_] Internal reference to the SynMixer service
 * @property {SynProject} [SynProject_] Internal reference to the SynProject service
 */
function SynPlayerController(SynMixer,SynProject,$location,$log,$scope,$timeout) {

    var spVm = this;
    window.spVm = spVm;

    this.SynMixer_ = SynMixer;
    this.SynProject_ = SynProject;
    this.$location_ = $location;
    this.$log_ = $log;
    this.$scope_ = $scope;
    this.$timeout_ = $timeout;

    // We need a mixer
    var mixer;
    // We need to track some variables
    var vars = {
        is_dj_mode: false,
    };

    this.activate();


    /** LISTENERS **/

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


    // These functions cannot be prototyped, because their identity must exist
    // on the instance to be cancelable
    var _onKeyPress = function(e) {
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
                if (hotkey._cue) {
                    // SHIFT to queue, no shift to play
                    // AVW: Does this make sense? I'm going both ways on how
                    // shift is to be handled... out to sort that out...
                    if (e.shiftKey) {
                        this.mixer.queue(hotkey._cue);
                    } else {
                        this.mixer.play(hotkey._cue);
                    }
                }
            }
        }

        // This is a non-angular event
        this.$scope_.$apply();
    }.bind(this);

    var _onKeyUp = function(e) {
        // If we're in an input, DON'T trigger any keypress events
        if (e.target.nodeName === 'INPUT') {
            return;
        }

        switch (e.code) {
            case 'Backspace':
                this.mixer.stop();
                break;
        }

        // This is a non-angular event
        $scope.$apply();
    }.bind(this);

    document.addEventListener('keypress', _onKeyPress);
    document.addEventListener('keyup', _onKeyUp);

    $scope.$on('$destroy', function() {
        this.stopAll();
        document.removeEventListener('keypress', _onKeyPress);
        document.removeEventListener('keyup', _onKeyUp);
    }.bind(this));

}


SynPlayerController.prototype.activate =  function() {

    // If we have a mixer already, stop anything it's doing
    if (this.mixer) {
        this.stopAll();
    }

    // Get our project and mixer and bind here for convenience
    this.project = this.SynProject_.getProject();
    this.mixer = this.SynMixer_.createMixer();

};

/**
 * Define a "context" action (aka right-click) for a cue. Creating a
 * contextCue() method allows us to bind to the OS-level event once
 * and let each controller define the appropriate behavior.
 *
 * In this case, we call mixer.queue() on the cue that was right-clicked.
 */
SynPlayerController.prototype.contextCue = function(cue,event) {
    this.mixer.queue(cue);
};

/**
 * With DJ Mode, you can enjoy all the cues a board has to offer. DJ Mode
 * randomly plays cues from the board ad infinitum, including looped tracks.
 * It has very little practial utility, but can be enjoyable for the board creator.
 *
 */
SynPlayerController.prototype.enableDJMode = function() {

    // How many new tracks before repeat?
    const TOTAL_TRACKS = this.project.cues.length;
    const PLAY_MEMORY = Math.min( TOTAL_TRACKS, 10);
    let recently_played = [];

    var syn = this;

    // Too lazy to integrate the existing track into DJ mode
    this.stopAll();

    // Play a random track
    function getRandomTrack() {
        var tracknum = Math.floor(Math.random() * TOTAL_TRACKS);
        return syn.project.cues[ tracknum ];
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
                // Add up to an additional loop
                playtime += Math.floor(Math.random() * playtime * 1);
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

/**
 * Basic handling of a click on a cue object. Like this.contextCue, a basic
 * binding allows us to separate the OS-level event handling from the
 * controller-specific actions.
 *
 * The event for this method can include a modifier key to force the fadeIn
 * state: click+shift will force fadeIn = true, while click+alt will force
 * fadeIn = false.
 *
 * @param  {Cue} cue   The cue object that was clicked
 * @param  {$event} event The click event
 * @return {Channel}       The channel on which the cue is to be played
 */
SynPlayerController.prototype.selectCue = function(cue,event) {

    // We can pass in a "force" value for fadeIn
    var forceFadeIn;
    if (event && event.shiftKey) { forceFadeIn = true; }
    else if (event && event.altKey) { forceFadeIn = false;}

    // Use the mixer's method, which handles all the necessary
    // group and channel logic. It returns the channel that the cue
    // gets assigned to.
    return this.mixer.play(cue,{forceFadeIn: forceFadeIn});
};


/**
 * Global stop method to gracefully kill playback on all channels. A wrapper for
 * the mixer's method to do the same, plus remove any latent timers.
 *
 */
SynPlayerController.prototype.stopAll = function() {

    // Use the mixer's stop() method to handle all audio stoppage
    this.mixer.stop();
    // Do we have a DJ timer to cancel?
    if (this.dj_timer_) {
        // Stop that funky music!
        this.$timeout_.cancel(this.dj_timer_);
    }
};


// IIFE
})();