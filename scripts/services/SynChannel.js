(function() {
'use strict';

angular
    .module('SyntheaApp')
    .factory('SynChannel', SynChannel);

SynChannel.$inject = ['SynProject','$interval','$q','$timeout'];

/**
 * The SynChannel service returns the Channel constructor
 * @constructor
 *
 */
function SynChannel(SynProject,$interval,$q,$timeout) {


    // Track our channel counts so we can assign global ids
    var cidx = 0;
    // Store what "full" volume is, so we can consistently fade in/out of it
    const MAX_VOLUME = 0.5;

    /**
     * The Channel object
     *
     * The CHANNEL manages the playback of a cue, including queueing,
     * playing, pausing, stopping, fading in/out, and clearing memory.
     * There is a 1:1 correlation between Synthea Channel objects and
     * html `<audio>` elements used to produce audio playback.

     * Channels are the direct interface to a sound CUE, and the channel's
     * public methods are used to interact with a cue. Channels are
     * created and allocated by their parent GROUP, and any given channel
     * is exclusive to that subgroup.

     * This is where MOST OF THE MAGIC HAPPENS in Synthea. Have fun!
     *
     * @constructor
     * @param {Subgroup} subgroup - the Subgroup that will control this channel
     * @param {object} opts - values for fadeIn, fadeOut, useWebAudio
     */
    function Channel(subgroup,opts) {
       // Store a channel id, for reference. Simple incremental will do.
        this._id = cidx += 1;
        // Store a pointer to the subgroup that made this channel, so we can
        // trigger stopExcept() if this channel is part of an Exclusive Group
        this._subgroup = subgroup;

        // Web Audio for cloud-based projects, direct for local
        this.useWebAudio = opts.useWebAudio;

        return this;
    }

    /**
     * A method to call the howler fade and bind to an angular promise, for async
     * callbacks and fewer listeners. This is a private method, as fading
     * is done automatically on changes in playback state.
     *
     * If a cue should not be faded in from zero, a `startingLevel` can be
     * passed and the fade-in will start there.
     *
     * @private
     * @param  {string} direction One of 'in' or 'out'
     * @param  {number} startingLevel Volume at which to start the fade-in
     * @return {promise} A promise, resolved when the fade is complete
     */
    Channel.prototype._fade = function(direction,startingLevel) {

        var start, end, duration;
        var defer = $q.defer();

        switch (direction) {
            case 'in':
                start = startingLevel ?
                    // Constrain the start between zero and maximum volume
                    Math.min(Math.max(startingLevel,0),MAX_VOLUME) : 0;
                end = MAX_VOLUME;
                duration = SynProject.getProject().config.fadeInDuration;
                break;
            case 'out':
                // AVW: If a double-fade is somehow triggered, this could
                // possibly "pop" the track back to full volume. Is there a
                // downside to starting at this._player.volume() ?
                start = MAX_VOLUME;
                end = 0;
                duration = SynProject.getProject().config.fadeOutDuration;
        }

        // Make the fade
        this._player.fade(start,end,duration);
        // Resolve the promise, which triggers a $scope.digest?
        this._player.once('fade', function() {
            defer.resolve(duration);
        });

        return defer.promise;
    };

    /**
     * Fade in the Channel and return a promise that is resolved when the
     * fade-in is complete.
     *
     * @private
     * @return {promise}
     */
    Channel.prototype._fadeIn = function() {

        // Mazlow's hierarchy of fade-in priorities
        //---------------------------------------------------
        var isFadeIn;
        // console.log("Fade in priority:")
        // FIRST PRIORITY: A hotkey override stored on the channel
        if (typeof(this.forceFadeIn) === 'boolean') {
            isFadeIn = this.forceFadeIn;
            // console.log('--forced');
        }
        // SECOND PRIORITY: The cue itself
        else if (typeof(this.media.isFadeIn) === 'boolean') {
            isFadeIn = this.media.isFadeIn;
            // console.log('--media');
        }
        // THIRD PRIORITY: The subgroup we're in
        else if (typeof(this._subgroup.opts.isFadeIn) === 'boolean') {
            isFadeIn = this._subgroup.opts.isFadeIn;
            // console.log('--subgroup');
        }
        // FOURTH PRIORITY: The project default
        else {
            isFadeIn = SynProject.getProject().config.isFadeIn;
            // console.log('--project');
        }

        // Do we ACTUALLY fade in?
        if (isFadeIn) {
            // Set the volume to zero for fade-in goodness
            this._player.volume(0);
            // Start playing before we start the fade, to ensure smoothness
            this._player.play();
            // Return the promise from the _fade() method
            return this._fade('in');
        }
        else {
            // Create a promise to resolve ourselves
            var fadeprom = $q.defer();
            // Set the channel to full volume
            this._player.volume(MAX_VOLUME);
            // Play immediately
            this._player.play();
            // Resolve immediately so the "fade" is complete (duration == 0)
            fadeprom.resolve(0);
            // Return the promise
            return fadeprom.promise;
        }

    };

    /**
     * Convenience method to fade out this channel. Returns a promise when
     * the channel is fully faded out (this.state has changed).
     *
     * @private
     * @return {promise}
     */
    Channel.prototype._fadeOut = function() {
        return this._fade('out');
    };

    /**
     * Wrapper method for getting the media duration
     * @return {number} Seconds of duration
     */
    Channel.prototype.getDuration = function() {
        return this._player.duration();
    };

    /**
     * Wrapper method for getting the current playback position of the media
     * @return {number} Seconds elapsed
     */
    Channel.prototype.getTime = function() {
        return this._player.seek();
    };

    /**
     * Convenience method for determining whether this Channel is eligible to
     * load a new cue. Checks against the player and state.
     *
     * @return {Boolean} True if this Channel is available, false if not
     */
    Channel.prototype.isAvailable = function() {
        return !this._player ||
               this.state === 'ENDED' ||
               this.state === 'STOPPED'
               ;
    };

    /**
     * The big kahuna: create a player object (currently a Howl) for a cue object
     * and establish various listeners and callbacks based on the cues options.
     *
     * @param  {Cue} cue The cue object to be loaded
     * @param  {object} opts An optional object with additional configurations
     * @return {promise} A promise resolved when the cue is ready for playback
     */
    Channel.prototype.loadCue = function(cue,opts) {
        // Force opts
        opts = opts || {};
        // Loading a cue returns a promise, to be resolved when the cue is ready
        var defer = $q.defer();

        // Store a reference to the cue object, for getting configs and attrs
        this.media = cue;
        // Back-ref this channel to the cue, so we can call channel methods
        // TODO: Use a listener or event to push a state onto the cue, to
        // avoid this privade backref and expose the state publically
        cue._channel = this;

        // We'll make a pointer to the channel to avoid having to .bind(this)
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

                if (opts.autoplay) {
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

        // Note that we're occupied!
        this.state = 'QUEUING';
        // A queuing/queued channel is not "current", like a playing/paused is
        this.is_current = false;

        // If we have a fadeIn override, now is the place to set it
        // Conveniently, this will reset every time a cue is loaded. Hurray!
        this.forceFadeIn = opts.forceFadeIn;

        return defer.promise;
    };

    /**
     * Begin pausing of the channel, which calls a fade out and then updates
     * the various states and booleans.
     *
     * At some point we may want to make a promise to return, but no need yet.
     */
    Channel.prototype.pause = function() {

        this.state = 'PAUSING';

        // Wait for the fade out to complete before actually pausing
        this._fadeOut().then(function() {
            this._player.pause();
            this.state = 'PAUSED';
            this.is_playing = false;
            // No need to maintain the overhead of a counter
            $interval.cancel(this.elapsedCounter);
        }.bind(this));

    };

    /**
     * Begin playing the channel, with a fade in (if necessary)
     */
    Channel.prototype.play = function() {

        this.state = 'PLAYING';

        this.is_current = true;
        this.is_playing = true;
        this.is_queued = false;

        // Create an interval to update the playback time while the cue plays
        this.elapsedCounter = $interval(function() {

            // Are we playing? Get the current time!
            if (this._player.playing()) {
                this.currentTime = this._player.seek();
            }
            // The track might have been faded out, or ended, by the time we get here
            else {
                // If we're not playing, stop this infernal counter
                // AVW: I believe this occurs due to mis-syncing of the angular
                // digest with the Howler events. Even though the channel stop()
                // method explicitly cancels this counter, it still gets one last
                // rendering in after the channel is stopped.
                $interval.cancel(this.elapsedCounter);
            }

        }.bind(this),100);

        // Fade in the cue
        this._fadeIn().then(function(duration) {
            // AVW: Trying to track some fades that don't make it all the way
            console.log(' -- channel '+this._id+' fade in complete ('+duration+'ms)');
        }.bind(this));

        // If we are playing in a Subgroup, cancel the rest of the subgroup
        // AVW: Shouldn't this be handled higher up? Why isn't the "play" action
        // trickling down from the subgroup and the subgroup clearing itself?
        if (this._subgroup.name !== '__COMMON__') {
            this._subgroup.stopExcept(this.media);
        }

    };

    /**
     * Toggle the loop state of the media in the channel
     * @param {boolean} [force] A true/false value can be passed (rather than toggled)
     */
    Channel.prototype.repeat = function(force) {

        // If we're not forcing a value, we're toggling
        if (typeof(force)==='undefined') { force = !this.media.isLoop;}
        // Loop state is on a media-by-media basis, so set the media attribute
        this.media.isLoop = force;
        // Update the player to reflect the media's attribute
        this._player.loop(this.media.isLoop);
    };

    /**
     * Wrapper method for setting the playback position of the media
     * @param {float} targetTime  The target timecode to seek
     */
    Channel.prototype.setTime = function(targetTime) {
        this._player.seek(targetTime || this.currentTime);
    };

    /**
     * Stop the playback of the media in this channel and cleanup
     */
    Channel.prototype.stop = function() {

        // We might not need to take action if a stop is already in progress
        if (this.state==='STOPPING'|| this.state==='STOPPED') {
            return;
        }

        // What happens when we stop?
        var stopFn = function() {
            // If that pesky counter is going, kill it
            if (this.elaspedCounter) {
                $interval.cancel(this.elapsedCounter);
            }

            // Clear out the flags so we're ready to use the channel again
            this.state = 'STOPPED';
            this.is_current = false;
            this.is_queued = false;
            this.is_playing = false;

            // Clear the cue
            this.media._channel = undefined;

            // Flush the player to free up its memory allocation
            this._player.stop();
            this._player.unload();
            console.log(' -- channel '+this._id+' stopped');
        }.bind(this);

        // Set an interim state to show that the stop is in progress
        this.state = 'STOPPING';

        // Are we playing? Fade out before we stop
        if (this.is_playing) {
            this._fadeOut().then(stopFn);
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