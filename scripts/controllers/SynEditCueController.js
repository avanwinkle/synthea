(function() {
'use strict';

angular
    .module('SyntheaApp')
    .controller('SynEditCueController', SynEditCueController);

SynEditCueController.$inject = ['SynProject','$mdDialog'];

function SynEditCueController(SynProject,$mdDialog) {

    var secVm = this;
    this.$mdDialog_ = $mdDialog;

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

SynEditCueController.prototype.copyMediaToProject = function() {
    SynProject.copyMediaToProject().then(function(response) {
        this.mediaList = response;
    }.bind(this));
};

SynEditCueController.prototype.deleteCue = function() {
    this.$mdDialog_.hide(null);
};

// IIFE
})();