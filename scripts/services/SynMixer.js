(function(){
'use strict';

angular
    .module('SyntheaApp')
    .factory('SynMixer', SynMixer);

SynMixer.$inject = ['SynSubgroup','SynProject','$interval'];

function SynMixer(SynSubgroup,SynProject,$interval) {

    /**
     * A pointer to the current SynMixer instance, so we can
     * stop any playback/timers when instantiating a new one
     *
     * @private
     */
    var mixer;
    var Howler = require('howler').Howler;

    /**
     * Creates an instance of **SynMixer**, which is the Mixer singleton, the
     * master controller of all Subgroups and Channels in the Project.
     *
     * The Mixer manages the queuing, fading, and replacing
     * of cues according to global and cue-specific configs.
     * For each Subgroup, the Mixer maintains an array of Channels
     * that handle individual cues. Each Channel can be assigned
     * only one cue at a time.
     *
     * @property {array} channels An array of *every* Channel that
     *   exists in the Mixer
     * @property {number} fadeInDuration The global default for
     *   fade-in time on new cues (used only when fade-in is active)
     * @property {number} fadeOutDuration The global default for fade-out
     *   time on new cue (used in all cases of pausing/stopping playback)
     * @property {boolean} isCloudProject A flag to identify whether
     *   the current Project is stored locally or in the cloud, which
     *   has ramifications on how playback is handled.
     * @property {object} subgroups A mapping of all
     *   the available Subgroups in the Mixer. This is
     *   populated on-demand as cues are loaded.
     */
    function Mixer() {

        this.$interval_ = $interval;

        this.channels = [];
        this.subgroups = {};
        window.channels = this.channels;

        // Global settings from the project
        var p = SynProject.getProject();
        var d = SynProject.getProjectDef();

        // Set our global Howler options
        Howler.autoSuspend = false;

        // Fail? So far, only on debug refresh of render window
        if (!p.config || !d.documentRoot) {
            console.warn('Unable to load Mixer, missing project or config');
            return;
        }

        this.fadeInDuration = p.config.fadeInDuration || 2000;
        this.fadeOutDuration = p.config.fadeOutDuration || 2000;
        this.isCloudProject = !!d.documentRoot.match('https?://');

        return this;
    }


    Mixer.prototype._buildAnalyser = function() {

        // Create a analyser/visualization node and splice it in between the
        // Howler masterGain and destination nodes
        this.analyser = Howler.ctx.createAnalyser();
        Howler.masterGain.connect(this.analyser);
        this.analyser.connect(Howler.ctx.destination);

    };

    /**
     * Universal method to play a cue, really just a convenience method to call
     * `Mixer.queue` with `opts.autoplay = true`.
     *
     * @param {Cue} cue - the Cue object to be played
     * @param {object} [opts] options to define playback
     * @return {Channel}
     */
    Mixer.prototype.play = function(cue, opts) {

        // Accept any incoming options, and add autoplay
        var options = angular.merge({autoplay: true}, opts);
        // Return the channel on which it plays
        return this.queue(cue, options);
    };

    /**
     * Universal method to queue a cue for playback (which essentially passes
     * the command down the line to Subgroup to Channel to Player)
     *
     * @param {Cue} cue - the Cue object to be queued
     * @param {object} [opts] - options for the cue playback
     * @return {Channel}
     */
    Mixer.prototype.queue = function(cue,opts) {

        var subname;

        // Is there a subgroup for this button?
        // If not, use the common subgroup
        subname = cue.subgroup || '__COMMON__';

        // Does this subgroup need to be created?
        if (!this.subgroups.hasOwnProperty(subname)) {
            this.subgroups[subname] = new SynSubgroup(subname,this);
        }

        // Should we make an analyser?
        if (!this.analyser) {

            // Keep an eye out for our howler context
            // TODO: use a callback rather than interval
            var contextInterval = this.$interval_(function() {
                if (Howler.ctx) {
                    this._buildAnalyser();
                    this.$interval_.cancel(contextInterval);
                }
            }.bind(this));
        }

        // Return the channel on which it plays
        return this.subgroups[subname].queue(cue,opts);
    };

    /**
     * Global method to stop playback on all Channels.
     *
     * @param {boolean} fullstop Force all channels (including queued) to stop & flush
     */
    Mixer.prototype.stop = function(fullstop, hardstop) {

        // Iterate through the Subgroups and stop them all
        angular.forEach(this.subgroups, function(subgroup) {
            // If fullstop, clear ALL channels including queue
            if (fullstop) {
                subgroup.stopFull(hardstop);
            }
            // If regular stop, only stop current/active channels
            else {
                subgroup.stopExcept();
            }
        });
    };

    /**
     * Flush the queue and playback all cues that are queued
     */
    Mixer.prototype.toggleLock = function() {

        // Iterate through the Channels and play any that are queued
        angular.forEach(this.channels, function(ch) {
            if (ch.is_queued) {
                ch.play();
            }
        });

    };

    return {
        createMixer: function() {

            // Clear out an existing mixer, if need be
            if (mixer) {
                mixer.stop();
            }

            mixer = new Mixer();
            return mixer;
        },
        getMixer: function() {
            return mixer;
        }
    };

}

// IIFE
})();