(function() {
'use strict';

angular
    .module('SyntheaApp')
    .filter('buttonsInColumn', buttonsInColumn)
    .filter('isActive', isActive)
    .filter('isQueued', isQueued)
    .filter('secondsToTimecode', secondsToTimecode);

function buttonsInColumn() {
    /* This filter will populate a column with buttons, to avoid maintaining
    two arrays of buttons (replaces the column._buttons array). HOWEVER it can
    be VERY EXPENSIVE to render during playback, since there are so many digest
    cycles. Therefore, this should always be one-time bound in a player env and
    two-way bound in editing */
    return function(buttons, section_id) {
        var filtered = [];
        angular.forEach(buttons, function (b) {
            if (b.column_ids.indexOf(section_id) !== -1) {
                filtered.push(b);
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