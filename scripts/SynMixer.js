(function() {
'use strict';

angular
    .module('SyntheaApp')
    .factory('SynMixer', SynMixer);

SynMixer.$inject = ['SynProject','$interval','$timeout'];

function SynMixer(SynProject,$interval,$timeout) {

    /*
    The MIXER manages the queuing, fading, and replacing
    of cues according to global and cue-specific configs.

    For each GROUP, the Mixer maintains an array of CHANNELS
    that handle individual cues. Each Channel can be assigned
    only one cue at a time. There are three TYPES of Groups:

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

    COMMON GROUPS have an arbitrary number of channels and play
    cues in parallel. If a cue is delivered to the mixer and
    no channels are available, a new one will be created. Each
    Mixer has one Common Group by default.

    */

    var pkey;
    // Track our channel counts
    var cidx = 0;

    function Channel(opts) {
        this._id = cidx += 1;
        this.player_ = document.createElement('audio');

        // Default ins and outs
        this.fadeIn = opts.fadeIn || 0;
        this.fadeOut = opts.fadeOut || 2000;

        return this;
    }

    Channel.prototype.isAvailable = function() {
        return !this.player_.src || this.player_.ended || !this.is_active;
    };

    Channel.prototype.loadCue = function(cue) {
        // Store a reference to the cue
        this.media = cue;

        this.player_.src = './Projects/'+ pkey +'/normal/'+cue.file;
        this.player_.loop = cue.isLoop;

        // Set volume, unless we have a fadeIn
        this.player_.volume = this.fadeIn ? 0 : 1;
        // Occupied!
        this.is_active = true;
        this.media.is_playing = true;

        window.p = this.player_;

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
            }.bind(this),0);
        }.bind(this);

        // When the track comes to and end?
        this.player_.onended = function() {
            this.is_active = false;
        }.bind(this);

        this.player_.play();

        var elapsedCounter = $interval(function() {
            this.currentTime = this.player_.currentTime;
            // Cancel if we're not playing anymore
            if (!this.is_active) {
                $interval.cancel(elapsedCounter);
            }
        }.bind(this),10);

    };

    Channel.prototype.pause = function() {
        this.player_.pause();
        this.media.is_playing = false;
    };

    Channel.prototype.play = function() {
        this.player_.play();
        this.media.is_playing = true;
    };

    Channel.prototype.setTime = function() {
        console.log("setting time!")
        this.player_.currentTime = this.currentTime;
    };

    Channel.prototype.stop = function() {

        // We might not need to
        if (!this.is_active) { return; }

        // Fade out somehow
        var fadepct = this.fadeOut;
        // How fast do we fade out?
        const FADE_STEPS = 100;

        var fadeAudio = $interval(function() {

            fadepct -= FADE_STEPS;

            // If it's still audible and playing
            if (this.player_.volume > 0 || !this.player_.ended) {
                // Player throws an error if volume < 0;
                this.player_.volume = Math.max(0,fadepct/this.fadeOut);
            }

            if (this.player_.volume === 0) {
                this.player_.pause();
                this.is_active = false;
                this.media.is_playing = false;
                $interval.cancel(fadeAudio);
            }
        }.bind(this),FADE_STEPS);


    };

    function Group(groupname,mixer) {
        this.name = groupname;
        this.channels = [];
        this.mixer_ = mixer;

        // Start with a default channel
        this.addChannel();

        return this;
    }

    Group.prototype.addChannel = function() {
        var ch = new Channel({
            fadeIn: 0,
            fadeOut: 2000,
        });

        // Store a pointer in this group's channels list
        this.channels.push(ch);
        // Store a pointer in the master mixer channels list
        this.mixer_.channels.push(ch);

        return ch;
    };

    Group.prototype.findAvailableChannel = function() {
        // Look for one that's available
        for (var i=0;i<this.channels.length;i++) {
            if (this.channels[i].isAvailable()) {
                return this.channels[i];
            }
        }
        // Make a new channel
        var newch = this.addChannel();
        return newch;
    };

    Group.prototype.play = function(cue) {

        // Find an available channel
        var channel = this.findAvailableChannel();
        console.log('playing on channel',channel._id);
        channel.loadCue(cue);
    };

    Group.prototype.stopExcept = function(cue) {
        // Stop all the channels, except if there's
        // one with a cue provided
        angular.forEach(this.channels, function(c) {
            if (c.media!==cue) {
                console.log('-- stopping channel ',c._id);
                c.stop();
            }
        });
    };

    function Mixer() {

        // When mixer is called, store the project key
        pkey = SynProject.getConfig('key');

        // All channels!
        this.channels = [];

        // The groups, including defaults
        this.groups = {
            // SOLO_  : new Group('SOLO_'),
            MUSIC_ : new Group('MUSIC_',this),
            COMMON_: new Group('COMMON_',this),
        };

        return this;
    }

    Mixer.prototype.play = function(cue) {

        // Is there a group for this button?
        if (cue.group) {

            // Normalize the group names to avoid conflicts
            var gname = cue.group.toLowerCase().replace('_','');

            // Does this group need to be created?
            if (!this.groups.hasOwnProperty(gname)) {
                this.groups[gname] = new Group(gname,this);
            }
            this.groups[gname].play(cue);

            // Stop all others in this group
            this.groups[gname].stopExcept(cue);
        }
        // If not, use the common group
        else {
            this.groups.COMMON_.play(cue);
        }
    };

    Mixer.prototype.stop = function() {

        angular.forEach(this.groups, function(group) {
            group.stopExcept();
        });
    };


    return Mixer;

}


// IIFE
})();