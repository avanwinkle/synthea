(function() {
'use strict';

angular
    .module('SyntheaApp')
    .factory('SynCue', SynCue);

SynCue.$inject = [];

function SynCue() {

    function Cue(config,projectRoot) {
        console.warn(config)
        // Required
        this.name = config.name;
        this.columns = [config.column];
        // TODO: support multiple files for randomized playback
        this.file = config.files[0];
        this.isLoop = config.loop;
        this._fullPath = projectRoot + '/normal/' + config.files[0];

        // BLACK MAGICK: A crude method of identifying
        // music tracks until they're configured
        if (this.file.indexOf('mp3') !== this.file.indexOf('ogg')) {
            this.group = 'MUSIC_';
        }
        console.log(config)

        return this;
    }

    Cue.prototype.play = function() {
        console.log("PLAYING: " + this.file);
    };


    return Cue;

}

// IIFE
})();