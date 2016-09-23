(function(){
'use strict';

angular
    .module('SyntheaApp')
    .controller('SynCueSearchController', SynCueSearchController);

SynCueSearchController.$inject = ['SynProject','$filter','$scope','$timeout'];

function SynCueSearchController(SynProject, $filter, $scope, $timeout) {

    var csVm = this;
    this.$filter_ = $filter;
    this.$scope_ = $scope;
    this.$timeout_ = $timeout;

    this.cues = SynProject.getProject().cues;

    // UGLY HACK: Avoid calling select cue when queue is called, but why
    // doesn't event stopPropagation() work?
    this.queueInProgress = false;

    this.searchQuery = undefined;
    this.searchSelected = undefined;

}

SynCueSearchController.prototype.formSubmit = function($event) {
    if ($event.key==='Escape') {
        this.promise.reject();
    }
    if ($event.key==='Enter') {
        if ($event.shiftKey) {
            this.queueCue();
        }
        else {
            this.selectCue();
        }
    }
};

/**
 * Initialization function for the search dialog. Important for alluwing the
 * parent controller to pass in the deferral.
 * @param  {defer} promise A deferral to resolve/reject and close the dialog
 */
SynCueSearchController.prototype.init = function(promise) {
    this.promise = promise;

    // Make a separate function for the click-to-close, so we can bind listeners
    var closeFn = function() {
        console.log("reject!");
        this.promise.reject();
    }.bind(this);

    // Listen for a click
    document.body.addEventListener('click', closeFn);
    // When we close the modal, stop listening for that click
    this.$scope_.$on('$destroy', function() {
        document.body.removeEventListener('click', closeFn);
    });

    // Wait a digest and then select the input
    this.$timeout_(function(){
        document.getElementById('searchcue-input').focus();
    },0);
};

SynCueSearchController.prototype.queueCue = function(cue) {
    // Stop the click from "selecting" the cue
    this.queueInProgress = true;
    this.promise.resolve({
        cue:cue || this.searchSelected,
        queue: true
    });
};

/**
 * Callback for typeahead/autocomplete to search for a cue by its name
 * @return {Array<Cue>} List of cues matching search query
 */
SynCueSearchController.prototype.searchCues = function(query) {

    var querystring = query.toLowerCase().replace(/[^a-z0-9]/g,'');

    // return this.$filter_('filter')(this.cues, {name: query});
    return this.$filter_('filter')(this.cues, function(cue) {
        var cuename = cue.name.toLowerCase().replace(/[^a-z0-9]/g,'');
        return cuename.indexOf(querystring) !== -1;
    });
};

SynCueSearchController.prototype.selectCue = function(cue) {

    // If we're already trying to queue something?
    if (this.queueInProgress) {
        return;
    }
    this.promise.resolve({cue: cue || this.searchSelected});
};


// IIFE
})();