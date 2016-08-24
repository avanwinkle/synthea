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

        // When mixer is called, store the project key
        this.pkey = SynProject.getConfig('key');

        // All channels!
        this.channels = [];

        // The groups, including defaults
        this.groups = {
            // SOLO_  : new Group('SOLO_'),
            MUSIC_ : new SynGroup('MUSIC_',this),
            COMMON_: new SynGroup('COMMON_',this),
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
                this.groups[gname] = new SynGroup(gname,this);
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