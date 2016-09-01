(function() {
'use strict';

angular
    .module('SyntheaApp')
    .factory('SynGroup', SynGroup);

SynGroup.$inject = ['SynChannel'];

function SynGroup(SynChannel) {

    /*
    The GROUP controls an arbitrary number of CHANNELS and manages any
    exclusivity/sequential/parallel playback of cues in that group.

    There are three TYPES of Groups:

    SOLO GROUPS have two channels but playback is serialized.
    These groups effectively have one channel, the second exists
    only as a buffer to improve performance. Solo Groups can
    be used to build effects sequences on-the-fly, but are
    primarily designed for dialogue assembly.

    EXCLUSIVE GROUPS have two channels and playback appears
    serialized because only one cue can be "active" at a time,
    but two channels allow for queues and cross-fades. One
    channel holds the currently-playing cue and the other holds
    the upcoming cue. Exclusive Groups can be used for dominant
    ambient effects (e.g. rain, jungle, machinery) but is most
    heavily utilized for music. Each Mixer has one exclusive
    Music Group by default.

    The COMMON GROUP has an arbitrary number of channels and plays
    cues in parallel. If a cue is delivered to the mixer and
    no channels are available, a new one will be created. Each
    Mixer has one Common Group by default. Any cue without a
    specified group will be handled by the common group.

    */

    function Group(groupname,mixer) {
        this.name = groupname;
        this.channels = [];
        this.mixer_ = mixer;

        // Start with a default channel
        this.addChannel();

        return this;
    }

    Group.prototype.addChannel = function() {
        var ch = new SynChannel(this, {
            fadeIn: this.mixer_.fadeInDuration,
            fadeOut: this.mixer_.fadeOutDuration,
            useWebAudio: this.mixer_.isCloudProject,
        });

        // Store a pointer in this group's channels list
        this.channels.push(ch);
        // Store a pointer in the master mixer channels list
        this.mixer_.channels.push(ch);

        return ch;
    };

    Group.prototype.findAvailableChannel = function(cue) {

        // We have to return a channel no matter what
        var ch;

        // Look for one that's available
        for (var i=0;i<this.channels.length;i++) {
            // Do we have THIS CUE in a channel already? EXCEPT the common
            // channel, cause those can overplay the same cues concurrently
            if (this.channels[i].media === cue && this.name!=='COMMON_') {
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

    Group.prototype.play = function(cue) {
        // Return the channel on which it plays
        return this.queue(cue,true);
    };

    Group.prototype.queue = function(cue,autoplay) {

        // Find an available channel
        var channel = this.findAvailableChannel(cue);
        console.log((autoplay ? 'playing':'queuing')+
            ' on '+this.name+' group, channel '+channel._id);

        // Is this channel already playing THIS cue?
        if (channel.is_current && channel.media === cue) {

            // Are we right-clicking? That means stop!
            if (!autoplay) {
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
            if (!autoplay) {
                channel.stop();
                return channel;
            }
        }

        // Use the loadCue promise to handle errors in the file
        channel.loadCue(cue,autoplay).then(function(response) {

        }, function(reason) {
            console.warn("Error loading cue ",cue.name);
            channel.stop();

            // HOWLER BLACK MAGICK:
            // A loading error triggers Howler to set a global
            // 'noAudio' flag, so let's manually reset that to
            // allow future playback
            require('howler').Howler.noAudio = false;
        });

        // Return the channel on which it plays
        return channel;
    };

    Group.prototype.stopExcept = function(cue) {
        // Stop all the channels, except if there's
        // one with a cue provided
        angular.forEach(this.channels, function(c) {
            // Don't stop ones that are queued
            if (c.media!==cue && c.is_current) {
                console.log('-- stopping channel ',c._id);
                c.stop();
            }
        });
    };

    return Group;

}

// IIFE
})();