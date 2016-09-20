(function() {
'use strict';

angular
    .module('SyntheaApp')
    .directive('synChannelPlayer', function() {

    return {
        link: function(scope,ele,attrs) {
            scope.ele = ele;
        },
        controller: SynChannelPlayerController,
        controllerAs: 'cVm',
        restrict: 'E',
        scope: {
            channel: '=',
            queue: '@',
        },
        templateUrl: 'templates/partials/channel-player.html',
    };

});

SynChannelPlayerController.$inject = ['$scope'];

function SynChannelPlayerController($scope) {

    var cVm = this;
    cVm.$scope_ = $scope;

    cVm.channel = $scope.channel;
    cVm.isInQueue = !!$scope.queue;
    cVm.isExpanded = false;
    cVm.seekPreview = undefined;

    window.cVm = this;
    window.scope = $scope;
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
    // Where are we, physically, relative to the timeline DOM?
    var seekTarget = evt.offsetX / evt.target.offsetWidth;
    // Take the above calculation (as a percentage) and multiply by the duration
    this.seekPreview = seekTarget * this.channel.getDuration();
    // Return the value, in case somebody needs it?
    return this.seekPreview;
};

// IIFE
})();