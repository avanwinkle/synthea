(function() {
'use strict';

angular
    .module('SyntheaCore')
    .filter('cuesFromIds', cuesFromIds)
    .filter('isActive', isActive)
    .filter('isQueued', isQueued)
    .filter('secondsToTimecode', secondsToTimecode);

function cuesFromIds() {
    /*
    This filter will populate a section with buttons, to avoid maintaining
    two arrays of buttons (replaces the section._buttons array with a realtime
    filter populating an array of project.cues mapped against section.cue_ids.

    *** HOWEVER *** it can be *** VERY EXPENSIVE *** to render during playback,
    *since there are so many digest cycles. Therefore, this should always be
    one-time bound in a player and only two-way bound in editing.
    */
    return function(cue_ids, cues) {
        var filtered = angular.copy(cue_ids);
        angular.forEach(cues, function (c) {
            while (filtered.indexOf(c.id) !== -1) {
                // Replace the cue id with the cue object
                filtered.splice(filtered.indexOf(c.id),1,c);
            }
        });
        // Check it for any that we couldn't match
        angular.forEach(filtered, function(f,idx) {
            if (typeof(f)==='number') {
                console.warn('No cue found with id ',f);
                filtered.splice(idx,1);
            }
        });
        return filtered;
    };
}

function isActive() {
    return function(channel) {
        return channel.state === 'PLAYING' || channel.state === 'PAUSED';
    };
}

function isQueued() {
    return function(channel) {
        return channel.state === 'QUEUED';
    };
}

function secondsToTimecode() {
    return function(duration, showDecimals) {
        // If we can't make a timecode, make it look nice
        if (typeof(duration)!=='number') {
            return '--:--';
        }

        var sec_num = parseInt(duration, 10); // don't forget the second param
        var minutes = Math.floor(sec_num / 60);
        var seconds = sec_num - (minutes * 60);
        var decs = showDecimals ? '.'+Math.floor(duration % 1 * 10):'';

        if (minutes < 10) {minutes = "0"+minutes;}
        if (seconds < 10) {seconds = "0"+seconds;}

        return minutes+':'+seconds+decs;

    };
}

// IIFE
})();