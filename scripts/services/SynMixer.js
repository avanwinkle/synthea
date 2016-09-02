(function() {
'use strict';

angular
    .module('SyntheaApp')
    .factory('SynMixer', SynMixer);

SynMixer.$inject = ['SynSubgroup','SynProject'];

function SynMixer(SynSubgroup,SynProject) {

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

        // The subgroups, including defaults
        this.subgroups = {
            // SOLO_  : new SynSubgroup('SOLO_',this),
            MUSIC_ : new SynSubgroup('MUSIC_',this),
            COMMON_: new SynSubgroup('COMMON_',this),
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

        var subname;

        // Is there a subgroup for this button?
        // TODO: migrate all cue JSON from 'group' to 'subgroup'
        if (cue.group) {

            // Normalize the subgroup names to avoid conflicts
            subname = cue.group.toLowerCase().replace('_','');

            // Does this subgroup need to be created?
            if (!this.subgroups.hasOwnProperty(subname)) {
                this.subgroups[subname] = new SynSubgroup(subname,this);
            }
        }
        // If not, use the common subgroup
        else {
            subname = 'COMMON_';
        }

        // Return the channel on which it plays
        return this.subgroups[subname].queue(cue,autoplay);
    };

    Mixer.prototype.stop = function() {

        angular.forEach(this.subgroups, function(subgroup) {
            subgroup.stopExcept();
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