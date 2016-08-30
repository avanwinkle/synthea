(function() {
'use strict';

angular
    .module('SyntheaApp')
    .filter('buttonsInColumn', buttonsInColumn)
    .filter('isActive', isActive)
    .filter('isQueued', isQueued)
    .filter('secondsToTimecode', secondsToTimecode);

function buttonsInColumn() {
    return function(buttons, column_id) {
        console.log(column_id, buttons);
        var filtered = [];
        angular.forEach(buttons, function (b) {
            if (b.columns.indexOf(column_id) !== -1) {
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
        var decs = showDecimals ? ':'+Math.floor(duration % 1 * 10):'';

        if (minutes < 10) {minutes = "0"+minutes;}
        if (seconds < 10) {seconds = "0"+seconds;}
        return minutes+':'+seconds+decs;

    };
}

// IIFE
})();