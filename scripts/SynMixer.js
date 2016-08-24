(function() {
'use strict';

angular
    .module('SyntheaApp')
    .factory('SynMixer', SynMixer);

SynMixer.$inject = ['SynProject','$interval','$q','$timeout'];

function SynMixer(SynProject,$interval,$q,$timeout) {

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

    // Track our channel counts
    var cidx = 0;
    // How frequently do we step our fades?
    const FADE_STEPS = 10;

    // Our auctual mixer!
    var mixer_;

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

        this.player_.src = './Projects/'+ mixer_.pkey +'/normal/'+cue.file;
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

    function createMixer() {
        mixer_ = new Mixer();
        return mixer_;
    }

    function getMixer() {
        return mixer_;
    }

    function Group(groupname,mixer) {
        this.name = groupname;
        this.channels = [];
        this.mixer_ = mixer;

        // Start with a default channel
        this.addChannel();

        return this;
    }

    Group.prototype.addChannel = function() {
        var ch = new Channel(this, {
            fadeIn: 0,
            fadeOut: 2000,
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
            // Do we have THIS CUE in a channel already?
            if (this.channels[i].media === cue) {
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
        this.queue(cue,true);
    };

    Group.prototype.queue = function(cue,autoplay) {

        // Find an available channel
        var channel = this.findAvailableChannel(cue);
        console.log((autoplay ? 'playing':'queuing')+
            ' on '+this.name+' group, channel',channel._id);
        channel.loadCue(cue,autoplay);
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

    function Mixer() {

        // When mixer is called, store the project key
        this.pkey = SynProject.getConfig('key');

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
        this.queue(cue,true);
    };

    Mixer.prototype.queue = function(cue,autoplay) {
        console.log("cueing!!!")
        var gname;

        // Is there a group for this button?
        if (cue.group) {

            // Normalize the group names to avoid conflicts
            gname = cue.group.toLowerCase().replace('_','');

            // Does this group need to be created?
            if (!this.groups.hasOwnProperty(gname)) {
                this.groups[gname] = new Group(gname,this);
            }
        }
        // If not, use the common group
        else {
            gname = 'COMMON_';
        }

        this.groups[gname].queue(cue,autoplay);

    };

    Mixer.prototype.stop = function() {

        angular.forEach(this.groups, function(group) {
            group.stopExcept();
        });
    };


    return {
        createMixer: createMixer,
        getMixer: getMixer,
    };

}


// IIFE
})();