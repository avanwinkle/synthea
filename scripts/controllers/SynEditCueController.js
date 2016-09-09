(function() {
'use strict';

angular
    .module('SyntheaApp')
    .controller('SynEditCueController', SynEditCueController);

SynEditCueController.$inject = ['SynProject','$mdDialog'];

function SynEditCueController(SynProject,$mdDialog) {

    var secVm = this;
    this.$mdDialog_ = $mdDialog;

    // The files selected in the file menu are not immediately atteched
    secVm.selectedFiles = [];

    this.activate();
}

SynEditCueController.prototype.activate = function() {

    // get the media list
    SynProject.getProjectMediaList().then(function(response) {
        this.mediaList = response;
    }.bind(this));

};

SynEditCueController.prototype.$cancel = function() {
    this.$mdDialog_.cancel();
};

SynEditCueController.prototype.$close = function() {
    this.$mdDialog_.hide(this.cue);
};

SynEditCueController.prototype.addFilesToCue = function() {

    // If nothing specific was passed, add the selection

    // Go individually so we don't duplicate
    angular.forEach(this.selectedFiles, function(f) {
        if (this.cue.sources.indexOf(f)===-1) {
            this.cue.sources.push(f);
        }
    }.bind(this));

    // If we don't have a title for this cue? Let's be nice and make one!
    if (!this.cue.name && this.cue.sources.length) {

        var whitespace = /[_-]/g;
        var leadingnums = /^([0-9\W]*)/;
        var titlecase = /(\b[a-z](?!\s))/g;

        var name = this.cue.sources[0].split('.')[0]
            .replace(whitespace,' ')
            .replace(leadingnums,'')
            .replace(titlecase, function(x){return x.toUpperCase();})
            .trim();

        this.cue.name = name;

    }
};

SynEditCueController.prototype.copyMediaToProject = function() {

    // Make a copy of the current list so we can see what's added
    var oldList = angular.copy(this.mediaList);

    SynProject.copyMediaToProject().then(function(response) {
        this.mediaList = response;
        // For clarity, delesect anything that was previously selected
        this.selectedFiles = [];

        // Select anything that's new
        angular.forEach(this.mediaList, function(filename) {
            if (oldList.indexOf(filename)===-1) {
                this.selectedFiles.push(filename);
            }
        }.bind(this));

        // For convenience, assume the newly added media should go to the cue?
        this.addFilesToCue();

    }.bind(this));
};

SynEditCueController.prototype.deleteCue = function() {
    this.$mdDialog_.hide(null);
};

SynEditCueController.prototype.removeFile = function(filename) {

    if (this.cue.sources.indexOf(filename) !== -1) {
        this.cue.sources.splice(this.cue.sources.indexOf(filename),1);
    }

};

// IIFE
})();