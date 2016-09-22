(function(){
'use strict';

angular
    .module('SyntheaApp')
    .controller('SynCueSearchController', SynCueSearchController);

SynCueSearchController.$inject = ['SynProject','$filter','$mdDialog','$timeout'];

function SynCueSearchController(SynProject, $filter, $mdDialog, $timeout) {

    var csVm = this;
    this.$filter_ = $filter;
    this.$mdDialog_ = $mdDialog;
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
        this.$mdDialog_.cancel();
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

SynCueSearchController.prototype.queueCue = function(cue) {
    // Stop the click from "selecting" the cue
    this.queueInProgress = true;
    this.$mdDialog_.hide({
        cue:cue || this.searchSelected,
        queue: true
    });
};

/**
 * Callback for typeahead/autocomplete to search for a cue by its name
 * @return {Array<Cue>} List of cues matching search query
 */
SynCueSearchController.prototype.searchCues = function(query) {
    return this.$filter_('filter')(this.cues, {name: query});
};

SynCueSearchController.prototype.selectCue = function(cue) {

    // If we're already trying to queue something?
    if (this.queueInProgress) {
        return;
    }
    this.$mdDialog_.hide({cue: cue || this.searchSelected});
};


// IIFE
})();