(function(){
'use strict';

angular
    .module('SyntheaApp')
    .factory('SynChannel', SynChannel);

// Note what "full" volume is, so we can consistently fade in/out of it
const MAX_VOLUME = 0.5;

SynChannel.$inject = ['SynProject','SynHowlPlayer','$interval','$q','$timeout'];

/**
 * The SynChannel service returns the Channel constructor
 * @constructor
 *
 */
function SynChannel(SynProject,SynHowlPlayer,$interval,$q,$timeout) {

    // Track our channel counts so we can assign global ids
    var cidx = 0;

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

        // Store the options
        this.opts = opts || {};

        // In case we don't start playing immediately
        this.currentTime = 0;

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
    Channel.prototype._fade = function(direction,startingLevel,duration) {

        var start, end;
        var defer = $q.defer();

        switch (direction) {
            case 'in':
                start = startingLevel ?
                    // Constrain the start between zero and maximum volume,
                    // in case (somehow) we get a negative or excessive
                    // starting value
                    Math.min(Math.max(startingLevel,0), this.getFullVolume()):0;
                end = this.getFullVolume();
                duration = duration || SynProject.getProject().config.fadeInDuration;
                break;
            case 'out':
                // AVW: If a double-fade is somehow triggered, this could
                // possibly "pop" the track back to full volume. Is there a
                // downside to starting at this._player.volume() ?
                // start = this.getFullVolume();
                start = this._player.volume();
                end = 0;
                duration = duration || SynProject.getProject().config.fadeOutDuration;
                break;
            case 'to':
                start = this._player.volume();
                end = startingLevel;
                // For volume changes, default to half a second
                duration = duration || 500;
                break;
        }

        // HowlerJS player has trouble with too many decimal places?
        // TODO: Make pull request for Howler to fix bug on their end
        end = Math.round(end*100) / 100;

        // Resolve the promise, which triggers a $scope.digest automatically
        this._player.once('fade', function() {
            defer.resolve(duration);
        });

        // Make the fade
        this._player.fade(start,end,duration);

        return defer.promise;
    };

    /**
     * Fade in the Channel and return a promise that is resolved when the
     * fade-in is complete.
     *
     * @private
     * @param {boolean} opt_forceFadeIn If true, override the channel/track setting
     * @return {promise}
     */
    Channel.prototype._fadeIn = function(opt_forceFadeIn) {
        // Is there a sprite defined that we should call?
        var play_sprite = this._player._sprite.slice ? 'slice' : undefined;

        // Do we ACTUALLY fade in?
        if (opt_forceFadeIn || this.isFadeIn) {
            // Set the volume to zero for fade-in goodness
            this._player.volume(0);
            // Start playing before we start the fade, to ensure smoothness
            this._player.play(play_sprite);
            // Return the promise from the _fade() method
            return this._fade('in');
        }
        else {
            // Create a promise to resolve ourselves
            var fadeprom = $q.defer();
            // Set the channel to full volume
            this._player.volume( this.getFullVolume() );
            // Play immediately
            this._player.play(play_sprite);
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
     * Cross-fade to another place on the channel media's timeline
     *
     * @private
     * @return {promise}
     */
    Channel.prototype._fadeTo = function(timecode) {

        // Promise for loading the player media
        var mediaLoadDefer = $q.defer();
        // Promise for the fade itself
        var fadeToDefer = $q.defer();

        // Store the original volume target
        var targetVolume = this._player.volume();

        // If we have multiple sources, track the current one
        this.opts.targetSrc = this.media._last_source || this.media.sources[0];
        this.opts.preventLoadDefault = true;

        // If we are already doing a transition?
        if (this._temp_player) {
            /* There are a number of ways to handle multiple triggers of a crossfade,
               but most of them have a lot of overhead and callbacks. Until crossfade
               becomes a heavily-used feature and the ideal multiple-trigger behavior
               becomes clear, we'll stick with a simple solution:

               A crossfade triggered while an existing crossfade is in effect
               is delayed until the completion of the existing crossfade. If
               multiple crossfades are triggered in rapid succession, only the
               last (i.e. most recent) crossfade will be executed, and that
               execution will occur after the current crossfade completes.
            */

            // Wait for the existing to complete, then trigger the one from this request
            this._pending_timecode = timecode;
            return;
        }

        // Create a new Howl player from the existing media
        this._temp_player = new SynHowlPlayer(this, mediaLoadDefer);

        // When the new player is ready...
        mediaLoadDefer.promise.then(() => {
            // Jump to the desired timecode and start playing (silently)
            this._temp_player.seek(timecode);
            this._temp_player.volume(0);
            this._temp_player.play();

            // Promise resolve when the new player fades in is done
            this._temp_player.once('fade', () => {
                // Fade out the original player
                this._player.once('fade', () => {
                    var original_player = this._player;
                    // Replace the channel's player reference with the new one
                    this._player = this._temp_player;
                    this._temp_player = undefined;

                    // Stop and unload the original player
                    original_player.stop();
                    original_player.unload();

                    // Was another crossfade triggered?
                    if (this._pending_timecode) {
                        this._fadeTo(this._pending_timecode);
                        this._pending_timecode = undefined;
                    }

                    // Resolve the promise for the crossfade
                    fadeToDefer.resolve();

                    // Check for this cloud-project-related bug
                    if (this._player.volume() !== targetVolume) {
                        /*  A strange bug exists when using cloud projects, wherein at the end
                            of the cross-fade the Howl object tracks an internal '_volume' property
                            with a value of 0. Playback is unaffected at the end of the cross-fade,
                            but subsequent attempts to pause/stop/fade have a hard cut because the
                            internal volume is zero so no fade is triggered.

                            This here is a workaround: after the cross-fade completes, check if
                            the player's _volume property has the expected value, and if not,
                            brute force the property value to be the expected volume level.

                            This problem has only been reproduced on cloud projects, so it should not
                            impact live performances (which should always be run locally). Still,
                            this is not ideal and it's a bit confusing as to what causes the bug.

                            TODO: Fix this bug.
                        */
                        console.warn('Player volume does not match target: ' +
                                     this._player.volume() + ' vs ' + targetVolume);
                        this._player._volume = targetVolume;
                    }
                });
                this._player.fade(targetVolume, 0, 1000);
            });

            // Fade up to the same volume as the other (in 1/2 second)
            this._temp_player.fade(0, targetVolume, 1000 )
        });

        return fadeToDefer.promise;
    }

    /**
     * Wrapper method for getting the media duration
     * @return {number} Seconds of duration
     */
    Channel.prototype.getDuration = function() {
        return this._player.duration();
    };

    /**
     * Method to find the target volume for the channel, based on the global
     * default "full" volume and the channel media's volume adjustment
     * @return {number} Volume level (min 0, max 1)
     */
    Channel.prototype.getFullVolume = function() {
        return MAX_VOLUME * (this.volume_pct / 100);
    };

    /**
     * Wrapper method for getting the current playback position of the media
     * @return {number} Seconds elapsed
     */
    Channel.prototype.getTime = function() {
        if (this._temp_player) {
            return this._temp_player.seek();
        }
        return this._player.seek();
    };

    /**
     * Convenience method for determining whether this Channel is eligible to
     * load a new cue. Checks against the player and state.
     *
     * @return {boolean} True if this Channel is available, false if not
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

        // Reset values
        this.currentTime = undefined;
        this.duration = undefined;

        // Force opts
        // Use HTML5 mode to allow playback before full download
        // BUT the buffering process prevents seamless looping, so we
        // should only stream via HTML5 for non-looping tracks!
        // However, switching back and forth creates playback problems.
        // CURRENT SOLUTION: always HTML5 for cloud, never for local
        this.opts = angular.extend(opts || {},
            {useWebAudio: this.opts.useWebAudio});
        // Loading a cue returns a promise, to be resolved when the cue is ready
        var defer = $q.defer();

        // Store a reference to the cue object, for getting configs and attrs
        this.media = cue || {};

        // If there really isn't anything? Bail now
        if (!cue) { return; }

        // Back-ref this channel to the cue, so we can call channel methods
        // TODO: Use a listener or event to push a state onto the cue, to
        // avoid this privade backref and expose the state publically
        cue._channel = this;

        // We'll make a pointer to the channel to avoid having to .bind(this)
        // on every friggin callback function we make for the Howl
        var channel = this;

        // If there is an old player, dispose of it properly.
        // AVW: This is primarily a last-ditch attempt to catch players and
        // avoid orphaning Howls that make noise without controls. Typically
        // happens when switching projects and/or using DJ mode, so should be
        // resolved through bug tracking and tightening over time.
        if (this._player && this._player.playing()) {
            console.warn('Found an old player! Unloading it.');
            this._player.stop();
            this._player.unload();
        }


        this._player = new SynHowlPlayer(channel, defer);

        // The default "full" volume can be adjusted on a media-by-media basis,
        // measured  in percents from zero to 200
        channel.volume_pct = this.media.volume * 100 || 100;

        // Note that we're occupied!
        channel.state = 'QUEUING';
        // A queuing/queued channel is not "current", like a playing/paused is
        channel.is_current = false;


        // Mazlow's hierarchy of fade-in priorities
        //---------------------------------------------------
        // console.log("Fade in priority:")
        // FIRST PRIORITY: A hotkey override stored on the channel
        if (typeof(opts.forceFadeIn) === 'boolean') {
            channel.isFadeIn = this.forceFadeIn;
            // console.log('--forced');
        }
        // SECOND PRIORITY: The cue itself
        else if (typeof(this.media.isFadeIn) === 'boolean') {
            channel.isFadeIn = this.media.isFadeIn;
            // console.log('--media');
        }
        // THIRD PRIORITY: The subgroup we're in
        else if (this._subgroup && typeof(this._subgroup.opts.isFadeIn) === 'boolean') {
            channel.isFadeIn = this._subgroup.opts.isFadeIn;
            // console.log('--subgroup');
        }
        // FOURTH PRIORITY: The project default
        else {
            channel.isFadeIn = SynProject.getProject().config.isFadeIn;
            // console.log('--project');
        }

        // Other options can be set
        channel.forceFadeOut = opts.forceFadeOut;
        channel.dontUnload = opts.dontUnload;

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

        var pauseFn = function() {
            this._player.pause();
            this.state = 'PAUSED';
            this.is_playing = false;
            // No need to maintain the overhead of a counter
            $interval.cancel(this.elapsedCounter);
        }.bind(this);

        if (this.forceFadeOut!==false) {
            // Wait for the fade out to complete before actually pausing
            this._fadeOut().then(pauseFn);
        }
        else {
            pauseFn();
        }

    };

    /**
     * Begin playing the channel, with a fade in (if necessary)
     */
    Channel.prototype.play = function() {

        // If we are going from paused to playing, fade in (regardless of whether
        // the cue itself starts with a fade in or not)
        var forceFadeIn = this.state === 'PAUSED';

        this.state = 'PLAYING';

        this.is_current = true;
        this.is_playing = true;
        this.is_queued = false;

        // Delay the timer interval to avoid an off-sync that looks bad
        $timeout(() => {
            // Create an interval to update the playback time while the cue plays
            this.elapsedCounter = $interval(() => {

                // Are we playing? Get the current time!
                if (this._player && this._player.playing()) {
                    this.currentTime = this.getTime();
                }
                // The track might have been faded out, or ended, by the time we get here
                else {
                    // If there is no player? Possible glitch in the crossfade.
                    // TODO: Improve the cross-fade to handle multiple clicks
                    if (!this._player) {
                        console.warn('Player elapsed counter interval found NO PLAYER!');
                    }
                    // If we're not playing, stop this infernal counter
                    // AVW: I believe this occurs due to mis-syncing of the angular
                    // digest with the Howler events. Even though the channel stop()
                    // method explicitly cancels this counter, it still gets one last
                    // rendering in after the channel is stopped.
                    $interval.cancel(this.elapsedCounter);
                }

            },100);
        }, 0);

        // Fade in the cue, forcing a fade if the cue was paused
        this._fadeIn(forceFadeIn).then(function(duration) {
            // AVW: Trying to track some fades that don't make it all the way
            console.log(' -- channel '+this._id+' fade in complete ('+duration+'ms)');
            if (this._player._volume !== this._player._sounds[0]._volume) {
                /* There is a bug on some cloud projects relating to getting the player _volume
                   property, so we double-check and brute force the property to match the
                   actual playback value. See the note in channel _fadeTo method for details. */
                console.warn('Channel player volume does not match sound volume');
                this._player._volume = this._player._sounds[0]._volume;
            }
        }.bind(this));

        // If we are playing in a Subgroup, cancel the rest of the subgroup
        // AVW: Shouldn't this be handled higher up? Why isn't the "play" action
        // trickling down from the subgroup and the subgroup clearing itself?
        if (this._subgroup && this._subgroup.name !== '__COMMON__') {
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
        // Target time might be zero, so have to check for defined-ness
        this._player.seek(
            angular.isDefined(targetTime) ? targetTime : this.currentTime);
        // Update the current time to reflect
        this.currentTime = this._player.seek();
    };

    Channel.prototype.setFullVolume = function(adjustment,duration) {
        // Constraints, of course
        this.volume_pct = Math.max(0, Math.min(adjustment,200));
        // Make the fade to this volume
        this._fade('to',this.getFullVolume(),duration);
    };

    /**
     * Stop the playback of the media in this channel and cleanup
     */
    Channel.prototype.stop = function(opts) {

        var defer = $q.defer();
        opts = opts || {};

        // We might not need to take action if a stop is already in progress
        if (!this.media || this.state==='STOPPING'|| this.state==='STOPPED') {
            defer.resolve();
            return defer.promise;
        }

        // What happens when we stop?
        var stopFn = function() {
            // If that pesky counter is going, kill it
            if (this.elaspedCounter) {
                $interval.cancel(this.elapsedCounter);
            }

            this.is_playing = false;

            // Sometimes we don't want to flush everything
            if (this.dontUnload && !opts.forceUnload) {
                console.log(' -- channel '+this._id+' stopped and reset');
                // Hop to the beginning
                this.setTime(0);
                // Set a ready state
                this.state = 'QUEUED';
            }

            // But usually, yes we want to flush everything
            else {
                console.log(' -- channel '+this._id+' stopped and unloaded');
                // Clear out the flags so we're ready to use the channel again
                this.state = 'STOPPED';
                this.is_current = false;
                this.is_queued = false;

                // Clear the cue
                this.media._channel = undefined;
                // Flush the player to free up its memory allocation
                this._player.stop();
                this._player.unload();

                // Garbage collect: If there are more than two channels in
                // this subgroup (four for common), trim that down by removing
                // references to the channels and let the JS garbage collector
                // take care of them.
                if (this._subgroup && this._subgroup.channels && this._subgroup.channels.length >
                            (this._subgroup.name === '__COMMON__' ? 4 : 2)) {
                    console.log("Garbage collecting channel "+this._id)
                    // De-reference the channel from the subgroup
                    this._subgroup.channels.splice(
                        this._subgroup.channels.indexOf(this),1);
                    // De-reference the channel from the mixer
                    this._subgroup._mixer.channels.splice(
                        this._subgroup._mixer.channels.indexOf(this),1);
                }

            }

            defer.resolve();
        }.bind(this);

        // Set an interim state to show that the stop is in progress
        this.state = 'STOPPING';

        // Are we playing? Fade out before we stop
        if (this.is_playing && this.forceFadeOut!==false && opts.forceFadeOut!==false) {
            this._fadeOut().then(stopFn);
        }
        // If not? Death immediately!
        else {
            stopFn();
        }

        return defer.promise;

    };

    return Channel;
}

// IIFE
})();
