(function() {
'use strict';

angular
    .module('SyntheaApp')
    .factory('SynMixer', SynMixer);

SynMixer.$inject = ['SynGroup','SynProject'];

function SynMixer(SynGroup,SynProject) {

    /*
    The MIXER manages the queuing, fading, and replacing
    of cues according to global and cue-specific configs.

    For each GROUP, the Mixer maintains an array of CHANNELS
    that handle individual cues. Each Channel can be assigned
    only one cue at a time.

    */

    // Our auctual mixer!
    var mixer_;

    function Mixer() {

        // All channels!
        this.channels = [];
        window.c = this.channels;

        // The groups, including defaults
        this.groups = {
            // SOLO_  : new Group('SOLO_'),
            MUSIC_ : new SynGroup('MUSIC_',this),
            COMMON_: new SynGroup('COMMON_',this),
        };

        // Global settings from the project
        var p = SynProject.getProject();
        var d = SynProject.getProjectDef();
        this.fadeInDuration = p.config.fadeInDuration || 2000;
        this.fadeOutDuration = p.config.fadeOutDuration || 2000;
        this.isCloudProject = !!d.documentRoot.match('https?://');

        return this;
    }

    Mixer.prototype.play = function(cue) {
        // Return the channel on which it plays
        return this.queue(cue,true);
    };

    Mixer.prototype.queue = function(cue,autoplay) {

        var gname;

        // Is there a group for this button?
        if (cue.group) {

            // Normalize the group names to avoid conflicts
            gname = cue.group.toLowerCase().replace('_','');

            // Does this group need to be created?
            if (!this.groups.hasOwnProperty(gname)) {
                this.groups[gname] = new SynGroup(gname,this);
            }
        }
        // If not, use the common group
        else {
            gname = 'COMMON_';
        }

        // Return the channel on which it plays
        return this.groups[gname].queue(cue,autoplay);
    };

    Mixer.prototype.stop = function() {

        angular.forEach(this.groups, function(group) {
            group.stopExcept();
        });
    };

    Mixer.prototype.toggleLock = function() {

        // Flush everything?
        angular.forEach(this.channels, function(ch) {
            if (ch.is_queued) {
                ch.play();
            }
        });

    };


    return {
        createMixer: function() {

            // Clear out an existing mixer, if need be
            if (mixer_) {
                mixer_.stop();
            }

            mixer_ = new Mixer();
            return mixer_;
        },
        getMixer: function() {
            return mixer_;
        }
    };

}


// IIFE
})();