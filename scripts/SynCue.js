(function() {
'use strict';

angular
    .module('SyntheaApp')
    .factory('SynCue', SynCue);

SynCue.$inject = [];

function SynCue() {

    function Cue(config) {

        // Required
        this.name = config.name;
        this.column = config.column;
        this.file = config.file;
        this.isLoop = config.loop;

        // BLACK MAGICK: A crude method of identifying
        // music tracks until they're configured
        if (this.file.indexOf('mp3') !== this.file.indexOf('ogg')) {
            this.group = 'MUSIC_';
        }

        return this;
    }

    Cue.prototype.play = function() {
        console.log("PLAYING: " + this.file);
    };


    return Cue;

}

// IIFE
})();