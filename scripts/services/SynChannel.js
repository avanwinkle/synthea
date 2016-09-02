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
    is exclusive to that subgroup.

    This is where MOST OF THE MAGIC HAPPENS in Synthea. Have fun!

    */

    // Track our channel counts so we can assign global ids
    var cidx = 0;
    // Store what "full" volume is, so we can consistently fade in/out of it
    const MAX_VOLUME = 0.5;

    function Channel(subgroup,opts) {
        // Store a channel id, for reference. Simple incremental will do.
        this._id = cidx += 1;
        // Store a pointer to the subgroup that made this channel, so we can
        // trigger stopExcept() if this channel is part of an Exclusive Group
        this._subgroup = subgroup;

        // Default ins and outs come from the options, but hardcode a fallback?
        this.fadeInDuration_ = opts.fadeIn || 0;
        this.fadeOutDuration_ = opts.fadeOut || 2000;

        // Web Audio for cloud-based projects, direct for local
        this.useWebAudio = opts.useWebAudio;

        return this;
    }

    // A common method to bind the howler fade in an angular promise
    Channel.prototype.fade_ = function(direction) {

        var start, end, duration;
        var defer = $q.defer();

        switch (direction) {
            case 'in':
                start = 0;
                end = MAX_VOLUME;
                duration = this.fadeInDuration_;
                break;
            case 'out':
                // AVW: If a double-fade is somehow triggered, this could
                // possibly "pop" the track back to full volume. Is there a
                // downside to starting at this._player.volume() ?
                start = MAX_VOLUME;
                end = 0;
                duration = this.fadeOutDuration_;
        }

        // Make the fade
        this._player.fade(start,end,duration);
        // Resolve the promise, which triggers a $scope.digest?
        this._player.once('fade', function() {
            defer.resolve();
        });

        return defer.promise;
    };

    // Convenience methods for binding to the internal methods
    Channel.prototype.fadeIn_ = function(duration) {
        return this.fade_('in');
    };

    Channel.prototype.fadeOut_ = function(duration) {
        return this.fade_('out');
    };

    Channel.prototype.getDuration = function() {
        return this._player.duration();
    };

    Channel.prototype.getTime = function() {
        return this._player.seek();
    };

    // There are numerous ways to define "available", which we consolidate here
    Channel.prototype.isAvailable = function() {
        return !this._player ||
               this.state === 'ENDED' ||
               this.state === 'STOPPED'
               ;
    };

    // The big kahuna: create a Howl object for a sound cue and create various
    // listeners and callbacks based on the cues parameters and user's actions
    Channel.prototype.loadCue = function(cue,autoplay) {

        // Loading a cue returns a promise, to be resolved when the cue is ready
        var defer = $q.defer();

        // Store a reference to the cue object, for getting configs and attrs
        this.media = cue;
        // Back-ref this channel to the cue, so we can call channel methods
        // TODO: Use a listener or event to push a state onto the cue, to
        // avoid this privade backref and expose the state publically
        cue._channel = this;

        // We'll make a pointer to the channel to avoid having to bind(this)
        // on every friggin callback function we make for the Howl
        var channel = this;

        this._player = new Howl({
            src: [cue._fullPath],
            // Additional params
            loop: cue.isLoop,
            // Use HTML5 mode to allow playback before full download
            // BUT the buffering process prevents seamless looping, so we
            // should only stream via HTML5 for non-looping tracks!
            // However, switching back and forth creates playback problems.
            // CURRENT SOLUTION: always HTML5 for cloud, never for local
            html5: this.useWebAudio,
            preload: true,
            // Set volume tu full, unless we have a fadeIn
            volume: channel.fadeInDuration_ ? 0 : MAX_VOLUME,
            onend: function() {
                // This event fires at the end of each loop
                if (!cue.isLoop) {
                    channel.state = 'ENDED';
                    channel.is_playing = false;
                    // Clear out the cue and all relatedness
                    channel.stop();
                }
            },
            onload: function() {
                channel.duration = channel._player.duration();
                defer.resolve(cue);

                if (autoplay) {
                    channel.play();
                }
                else {
                    // Wait a digest for this non-angular event
                    $timeout(function() {
                        // Occupied!
                        channel.state = 'QUEUED';
                        channel.is_queued = true;
                    },0);
                }
            },
            onloaderror: function(soundId,reason) {
                defer.reject(reason);
            },
            // onpause: function() {},
            // onplay: function() {}
        });

        // HOWLER BLACK MAGICK:
        // If an HTML5 non-loop file plays, it sets
        // the global Howler to use Web Audio, which then nullifies
        // audio output for non-HTML5 tracks. If this cue is a loop
        // (and therefore non-HTML5), we should force the global
        // Howler to switch off of Web Audio mode

        // AVW: This may be the cause of buggy behavior when streaming
        // over the network and mixing loop/nonloop tracks. One crude
        // solution would be to only allow seamless looping (an non-web
        // audio) on local projects...

        // For the time being, I'm restricting webAudio for only cloud projects
        // (at the cost of smooth looping) and commenting out this reset...

        /*
        if (cue.isLoop) {
            require('howler').Howler.usingWebAudio = false;
        }
        */

        // Notet that we're occupied!
        this.state = 'QUEUING';
        // A queuing/queued channel is not "current", like a playing/paused is
        this.is_current = false;

        return defer.promise;
    };

    Channel.prototype.pause = function() {

        this.state = 'PAUSING';

        this.fadeOut_().then(function() {
            this._player.pause();
            this.state = 'PAUSED';
            this.is_playing = false;
            $interval.cancel(this.elapsedCounter);
        }.bind(this));

    };

    Channel.prototype.play = function() {

        this.state = 'PLAYING';

        this.is_current = true;
        this.is_playing = true;
        this.is_queued = false;

        // Create an interval to update the playback time
        this.elapsedCounter = $interval(function() {

            // The track might have been faded out, or ended, by the time we get here
            if (this._player.playing()) {
                this.currentTime = this._player.seek();
            }
            else {
                // If we're not playing, stop this infernal counter
                // AVW: I believe this occurs due to mis-syncing of the angular
                // digest with the Howler events. Even though the channel stop()
                // method explicitly cancels this counter, it still gets one last
                // rendering in after the channel is stopped.
                $interval.cancel(this.elapsedCounter);
            }

        }.bind(this),100);

        // Start playing before we start the fade, to ensure smoothness
        this._player.volume(0);
        this._player.play();
        this.fadeIn_().then(function() {
            // AVW: Trying to track some fades that don't make it all the way
            console.log(' -- channel '+this._id+' fade in complete');
        }.bind(this));

        // If we are playing an Exclusive Group, cancel the rest of the subgroup
        if (this._subgroup.name !== 'COMMON_') {
            this._subgroup.stopExcept(this.media);
        }

    };

    Channel.prototype.repeat = function() {
        // Toggle it on a media-by-media basis
        this.media.isLoop = !this.media.isLoop;
        // Update the channel to reflect the media's attribute
        this._player.loop(this.media.isLoop);
    };

    // Public binding of private seek method to set an explicit time
    Channel.prototype.setTime = function(targetTime) {
        this._player.seek(targetTime || this.currentTime);
    };

    Channel.prototype.stop = function() {

        // We might not need to take action if we're already stopping it
        if (this.state==='STOPPING'|| this.state==='STOPPED') {
            return;
        }

        // What happens when we stop?
        var stopFn = function() {
            if (this.elaspedCounter) {
                $interval.cancel(this.elapsedCounter);
            }

            this.state = 'STOPPED';
            this.is_current = false;
            this.is_queued = false;
            this.is_playing = false;

            // Clear the cue
            this.media._channel = undefined;

            this._player.stop();
            this._player.unload();
            console.log(' -- channel '+this._id+' stopped');
        }.bind(this);

        this.state = 'STOPPING';

        // Are we playing? Fade out before we stop
        if (this.is_playing) {
            this.fadeOut_().then(stopFn);
        }
        // If not? Death immediately!
        else {
            stopFn();
        }

    };

    return Channel;
}

// IIFE
})();