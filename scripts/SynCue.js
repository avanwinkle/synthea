(function() {
'use strict';

angular
    .module('SyntheaApp')
    .factory('SynCue', SynCue);

SynCue.$inject = ['$q'];

function SynCue($q) {

    function Cue(config,projectRoot) {
        console.warn(config)

        angular.extend(this, config);

        // TODO: support multiple files for randomized playback
        this._fullPath = projectRoot + '/audio/' + config.files[0];

        // We can support promises
        this._promises = {
            end: [],
        };

        // BLACK MAGICK: A crude method of identifying
        // music tracks until they're configured
        if (!this.group && this.file.indexOf('mp3') !== this.file.indexOf('ogg')) {
            this.group = 'MUSIC_';
        }

        console.log(this)

        return this;
    }

    Cue.prototype.play = function() {
        console.log("PLAYING: " + this.file);
    };

    Cue.prototype.getEndPromise = function() {
        var defer = $q.defer();
        this._promises.end.push(defer);
        return defer.promise;
    };

    Cue.prototype.resolveEndPromises = function() {
        angular.forEach(this._promises.end, function(p) {
            p.resolve();
        });
        // Reset
        this._promises.end = [];
    };


    return Cue;

}

// IIFE
})();