(function() {
'use strict';

angular
    .module('SyntheaApp')
    .factory('SynSubgroup', SynSubgroup);

SynSubgroup.$inject = ['SynChannel','SynProject','$mdToast'];

/**
 * The SynSubgroup service returns the Subgroup constructor
 * @constructor
 *
 * @param {SynChannel} SynChannel Dependency Injection
 * @param {SynProject} SynProject Dependency Injection
 */
function SynSubgroup(SynChannel,SynProject,$mdToast) {

    /**
     * The Subgroup controls an arbitrary number of Channels and manages any
     * exclusivity/sequential/parallel playback of cues in that group.
     *
     * There are three types of Subgroup:
     *
     * **Solo Subgroups** have two channels but playback is serialized.
     * These subgroups effectively have one channel, the second exists
     * only as a buffer to improve performance. Solo Subgroup can
     * be used to build effects sequences on-the-fly, but are
     * primarily designed for dialogue assembly.
     *  -- NOT CURRENTLY IMPLEMENTED --
     *
     * **Standard Subgroups** have two channels and playback appears
     * serialized because only one cue can be "active" at a time,
     * but two channels allow for queues and cross-fades. One
     * channel holds the currently-playing cue and the other holds
     * the upcoming cue. The standard Subgroup can be used for dominant
     * ambient effects (e.g. rain, jungle, machinery) but is most
     * heavily utilized for music.
     *  -- Usage: add a 'subgroup' attribute to any cue json --
     *
     *  The **Common Subgroup** has an arbitrary number of channels and plays
     *  cues in parallel. If a cue is delivered to the subgroup and
     *  no channels are available, a new one will be created. Each
     *  Mixer has one Common Subgroup, and any cue without a
     *  specified subgroup will be handled by the common subgroup.
     *
     * @property {string} name The name of this Subgroup
     * @property {array} channels All of the Channels this Subgroup controls
     * @property {Mixer} _mixer A private reference to the master mixer, for binding channels
     * @property {Object} opts Configuration options pulled from the project `layout.json`
     *
     * @param {String} subgroupname The name of the subgroup
     * @param {Mixer} mixer The master mixer controlling this subgroup
     */
    function Subgroup(subgroupname,mixer) {
        this.name = subgroupname;
        // Keep a list of all the channels this subgroup controls
        this.channels = [];
        // Keep a reference to the master mixer for binding channels
        this._mixer = mixer;

        // We can define custom options from the project file
        var subgs = SynProject.getProject().subgroups || {};
        this.opts = subgs[subgroupname] || {};

        // Start with a channel for this subgroup
        this.addChannel();

        return this;
    }

    /**
     * Create a new channel in this Subgroup.
     *
     * @returns {Channel} The newly-created Channel object
     */
    Subgroup.prototype.addChannel = function() {
        // Create a new channel object using the mixer defaults
        var ch = new SynChannel(this, {
            fadeIn: this._mixer.fadeInDuration,
            fadeOut: this._mixer.fadeOutDuration,
            useWebAudio: this._mixer.isCloudProject,
        });

        // Store a pointer in this subgroup's channels list
        this.channels.push(ch);
        // Store a pointer in the master mixer channels list
        this._mixer.channels.push(ch);

        return ch;
    };

    /**
     * Find an available channel in this Subgroup that can play the provided
     * cue. The cue is passed so that if a channel already has this cue, that
     * channel is returned. If no channels are available, one is created and
     * returned.
     *
     * @param  {Cue} cue The cue object for which a channel is sought
     * @return {Channel} A channel that is available (or has the cue already)
     */
    Subgroup.prototype.findAvailableChannel = function(cue) {

        // We have to return a channel no matter what
        var ch;

        // Look for one that's available
        for (var i=0;i<this.channels.length;i++) {
            // Do we have THIS CUE in a channel already? EXCEPT the common
            // channel, cause those can overplay the same cues concurrently
            if (this.channels[i].media === cue && this.name!=='__COMMON__') {
                ch = this.channels[i];
                // And be done immediately
                break;
            }
            // Look for one available if we need one
            else if (!ch && this.channels[i].isAvailable()) {
                ch = this.channels[i];
                // But don't break, a later channel might have
                // this cue already
            }
        }
        // Make a new channel if we didn't get one
        if (!ch) {
            ch = this.addChannel();
        }

        return ch;
    };

    /**
     * Play a cue immediately on this Subgroup. Really, a convenience method
     * to call `Subgroup.queue()` with forced `opts.autoplay = true`.
     *
     * @param  {Cue} cue The cue to play on this Subgroup
     * @param {Object} [opts] A cue playback options object
     * @return {Channel} The Channel on which the cue is being played
     */
    Subgroup.prototype.play = function(cue,opts) {
        // Force autoplay, again
        var options = angular.merge({autoplay:true},opts);
        // Return the channel on which it plays
        return this.queue(cue,options);
    };

    /**
     * Queue the provided cue in the Subgroup, or handle appropriately if the
     * cue is already active:
     *  - Queued: Remove from queue
     *  - Playing: Stop playback
     *  - Paused: Resume playback
     *
     * @param  {Cue} cue The cue to play on this Subgroup
     * @param {Object} [opts] A cue playback options object
     * @return {Channel} The Channel on which the cue is being played
     */
    Subgroup.prototype.queue = function(cue,opts) {

        // Force opts
        opts = opts || {};

        // Find an available channel
        var channel = this.findAvailableChannel(cue);

        // Let's keep track of how many groups and channels we're racking up
        console.log((opts.autoplay ? 'Playing ':'Queuing ') + cue.name +
            ' on "'+this.name+'" sub, channel '+channel._id);

        // Is this channel already playing THIS cue?
        if (channel.is_current && channel.media === cue) {

            // Are we right-clicking? That means stop!
            if (!opts.autoplay) {
                channel.stop();
            }
            // Are we paused? Then play!
            else if (channel.state==='PAUSED') {
                channel.play();
            }
            // Are we playing? Then pause!
            else if (channel.state==='PLAYING') {
                channel.pause();
            }

            return channel;
        }
        // Is this channel already queued with THIS cue?
        else if (channel.is_queued && channel.media === cue) {
            // A right-click? Remove from queue
            if (!opts.autoplay) {
                channel.stop();
                return channel;
            }
        }

        // Use the loadCue promise to handle errors in the file
        channel.loadCue(cue,opts).then(function(response) {
            // No handling behavior for successful loading, right now
        }, function(reason) {
            console.warn("Error loading cue "+cue.name,reason);
            channel.stop();

            // I don't know what all the reason codes are, but 4 is not found
            if (reason===4) {
                $mdToast.showSimple(
                    'Error: File \''+cue.sources[0]+'\' not found');
            }

            // HOWLER BLACK MAGICK:
            // A loading error triggers Howler to set a global
            // 'noAudio' flag, so let's manually reset that to
            // allow future playback
            require('howler').Howler.noAudio = false;
        });

        // Return the channel on which it plays
        return channel;
    };

    /**
     * A sweeping method to stop playback on all cues currently active
     * in this Subgroup, possibly excepting one.
     *
     * @param {Cue} [cue] A cue to allow remaining in the Subgroup
     */
    Subgroup.prototype.stopExcept = function(cue) {
        // Stop all the channels, except if there's
        // one with a cue provided
        angular.forEach(this.channels, function(c) {
            // Only stop ones that are "current"ly playing, not queued ones
            // TODO: make a "super Stop" that kills the whole queue too
            if (c.media!==cue && c.is_current) {
                console.log(' -- stopping channel ',c._id);
                c.stop();
            }
        });
    };

    return Subgroup;

}

// IIFE
})();