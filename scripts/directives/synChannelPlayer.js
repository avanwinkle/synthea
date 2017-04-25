(function() {
'use strict';

angular
    .module('SyntheaApp')
    .directive('synChannelPlayer', function() {

    return {
        link: function(scope,ele,attrs) {
            scope.ele = ele;
            scope.mode = attrs.mode || 'player';
        },
        controller: SynChannelPlayerController,
        controllerAs: 'cVm',
        restrict: 'E',
        scope: {
            channel: '=',
        },
        templateUrl: 'templates/partials/channel-player.html',
    };

});

SynChannelPlayerController.$inject = ['$scope','$timeout'];

function SynChannelPlayerController($scope,$timeout) {

    var cVm = this;
    cVm.$scope_ = $scope;

    cVm.seekPreview = undefined;

    window.cVm = this;
    window.scope = $scope;

    $timeout(function() {
        cVm.channel = $scope.channel;
        cVm.mode = $scope.ele.attr('mode');
        cVm.isInQueue = cVm.mode==='queue';
        cVm.isExpanded = cVm.mode!== 'queue';
    });
}

SynChannelPlayerController.prototype.expand = function() {
    this.isExpanded = !this.isExpanded;

    // Apply a class to the parent
    if (this.isExpanded) {
        this.$scope_.ele.parent().addClass('expanded');
    }
    else {
        this.$scope_.ele.parent().removeClass('expanded');
    }
};

SynChannelPlayerController.prototype.openMenu = function($mdOpenMenu, ev) {
      var originatorEv = ev;
      $mdOpenMenu(ev);
};

/**
 * Method for setting a channel to playback at a given rate. Should only be
 * used for tracks that are not currently playing
 */
SynChannelPlayerController.prototype.rateChange = function() {
    this.channel.setRate(this.channel.rate_pct);
}

/**
 * Wrapper method for setting a channel to playback at the specific time
 * based on the timeline hover position.
 *
 * The DOM could bind directly to the channel methods for this function, but
 * that may change so for now we'll stay here.
 *
 * @param  {$event} evt     Click event
 */
SynChannelPlayerController.prototype.timelineSeek = function(evt) {

    if (!this.channel.media) { return; }

    // We'll assume that we're seeking to the preview time, rather than
    // passing in a time (which could lead to delays? Who knows!)
    this.channel.setTime(this.seekPreview);
    // If we're not playing, update the current time manually
    if (!this.channel.is_playing) {
        this.channel.currentTime = this.seekPreview;
    }
};

/**
 * Hover-event method to calculate the timecode position of the cursor over the
 * timeline. Store the value locally so we can seek to it if desired.
 *
 * @param  {$event} evt     Click event
 * @return {number}         The time position of the seek preview
 */
SynChannelPlayerController.prototype.timelineSeekPreview = function(evt) {
    if (!this.channel.media) { return; }
    // Where are we, physically, relative to the timeline DOM?
    var seekTarget = evt.offsetX / evt.target.offsetWidth;
    // Take the above calculation (as a percentage) and multiply by the duration
    this.seekPreview = seekTarget * this.channel.getDuration();
    // Return the value, in case somebody needs it?
    return this.seekPreview;
};

/**
 * Callback function for changing the volume in realtime. Takes the ng-model
 * channel volume level and fades from the current level to that target.
 */
SynChannelPlayerController.prototype.volumeChange = function() {
    this.channel.setFullVolume(this.channel.volume_pct);
};

// IIFE
})();
