(function() {
'use strict'

angular
    .module('SyntheaApp')
    .factory('SynChannel', SynChannel);

SynChannel.$inject = ['$interval','$q','$timeout'];

function SynChannel($interval,$q,$timeout) {

    /*
    The CHANNEL manages the playback of a cue, including queueing,
    playing, pausing, stopping, fading in/out, and clearing memory.
    There is a 1:1 correlation between Synthea Channel objects and
    html <audio> elements used to produce audio playback.

    Channels are the direct interface to a sound CUE, and the channel's
    public methods are used to interact with a cue. Channels are
    created and allocated by their parent GROUP, and any given channel
    is exclusive to that group.

    */

    // Track our channel counts
    var cidx = 0;
    // How frequently do we step our fades?
    const FADE_STEPS = 10;

    function Channel(group,opts) {
        this._id = cidx += 1;
        this.group_ = group,
        this.player_ = document.createElement('audio');

        // Default ins and outs
        this.fadeInDuration_ = opts.fadeIn || 1000;
        this.fadeOutDuration_ = opts.fadeOut || 2000;

        return this;
    }

    Channel.prototype.fadeIn = function(duration) {
        var defer = $q.defer();

        // Fade out somehow
        var fadepct = 0;
        // How fast do we fade out?
        duration = duration || this.fadeInDuration_;

        // Don't risk a few ms of missed playback on an iteration,
        // set the volume to full if duration is exactly zero
        if (duration===0) {
            this.player_.volume = 1;
        } else {
            // Set initial state
            this.player_.volume = 0;
        }

        // And start playing
        this.player_.play();
        this.media.is_playing = true;
        // No longer queued
        this.state = 'PLAYING';

        // Create an interval to update the playback time
        this.elapsedCounter = $interval(function() {
            this.currentTime = this.player_.currentTime;
            // Cancel if we're not playing anymore
            if (this.state!=='PLAYING') {
                $interval.cancel(this.elapsedCounter);
            }
        }.bind(this),100);

        this.fadeInInterval_ = $interval(function() {
            fadepct += FADE_STEPS;

            // If it's still audible and playing
            if (this.player_.volume < 1 && !this.player_.ended) {
                // Player throws an error if volume < 0;
                this.player_.volume = Math.min(1,fadepct/duration);
            }
            else {
                this.player_.volume = 1;
                $interval.cancel(this.fadeInInterval_);
                defer.resolve();
            }
        }.bind(this),FADE_STEPS);

        return defer.promise;
    };

    Channel.prototype.fadeOut = function(duration) {
        var defer = $q.defer();

        // Fade out somehow
        var fadepct = this.fadeOutDuration_;
        // How fast do we fade out?
        duration = duration || this.fadeOutDuration_;

        // Avoid divide-by-zero errors and a ms rounding error
        if (duration === 0) {
            this.player_.volume = 0;
        }

        // Is there currently a fade-in in progress on this channel?
        if (this.fadeInInterval_) {
            // That can happen if we hit too many exclusive cues too fast.
            $interval.cancel(this.fadeInInterval_);
        }
        // Is there currently a fade-out in progress on this channel?
        if (this.fadeOutInterval_) {
            // That can happen if multiple cancel events occur
            defer.reject(); // ??? What to do with promises?
            return defer.promise;
        }

        this.fadeOutInterval_ = $interval(function() {

            fadepct -= FADE_STEPS;

            // If it's still audible and playing
            if (this.player_.volume > 0 && !this.player_.ended) {
                // Player throws an error if volume < 0;
                this.player_.volume = Math.max(0,fadepct/duration);
            }
            else {
                this.player_.pause();
                this.media.is_playing = false;
                // Stop this fade out interval
                $interval.cancel(this.fadeOutInterval_);
                // Stop the elapsed time counting
                $interval.cancel(this.elapsedCounter);
                this.state = 'PAUSED';
                defer.resolve();
            }
        }.bind(this),FADE_STEPS);

        return defer.promise;

    };

    Channel.prototype.isAvailable = function() {
        return !this.player_.src ||
               this.state === 'ENDED' ||
               this.state === 'STOPPED'
               ;
    };

    Channel.prototype.loadCue = function(cue,autoplay) {

        // Do we already have it?
        if (this.media === cue) {
            // If we have autoplay and the cue is queued, play it
            if (autoplay) {
                this.play();
            }
            return;
        }

        // Store a reference to the cue
        this.media = cue;

        this.player_.src = './Projects/'+ this.group_.mixer_.pkey +'/normal/'+cue.file;
        this.player_.loop = cue.isLoop;

        // Set volume, unless we have a fadeIn
        this.player_.volume = this.fadeIn ? 0 : 1;
        // Occupied!
        this.state = 'QUEUED';
        this.is_queued = true;
        this.is_current = false;

        // Listen for ready
        this.player_.oncanplay = function() {
            $timeout(function() {
                this.duration = this.player_.duration;
            }.bind(this),0);
        }.bind(this);

        // Listen for changes
        this.player_.onpause = function(state) {
            $timeout(function() {
                this.media.is_playing = false;
                this.state = 'PAUSED';
            }.bind(this),0);
        }.bind(this);

        // When the track comes to and end?
        this.player_.onended = function() {
            this.state = 'ENDED';
            this.is_current = false;
        }.bind(this);


        // Begin playback?
        if (autoplay) {
            this.play();
        }
    };

    Channel.prototype.pause = function() {
        this.state = 'PAUSING';
        this.fadeOut();
    };

    Channel.prototype.play = function() {
        this.fadeIn();
        this.is_queued = false;
        this.is_current = true;

        // If we're playing, bring out the rest of the group
        if (this.group_name !== 'COMMON_') {
            this.group_.stopExcept(this.media);
        }
    };

    Channel.prototype.repeat = function() {
        // Toggle it on a media-by-media basis
        this.media.isLoop = !this.media.isLoop;
        // Update the channel to reflect the media
        this.player_.loop = this.media.isLoop;
    };

    Channel.prototype.setTime = function() {
        this.player_.currentTime = this.currentTime;
    };

    Channel.prototype.stop = function() {

        // We might not need to
        if (this.state==='STOPPED') { return; }

        this.state = 'STOPPING';

        this.fadeOut().then(function() {
            this.state = 'STOPPED';
            this.is_queued = false;
            this.is_current = false;
        }.bind(this));

    };

    return Channel;
}

// IIFE
})();