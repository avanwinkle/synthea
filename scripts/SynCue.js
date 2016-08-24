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

        if (this.file.indexOf('mp3') !== -1) {
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