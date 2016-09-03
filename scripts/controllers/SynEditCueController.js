(function() {
'use strict';

angular
    .module('SyntheaApp')
    .controller('SynEditCueController', SynEditCueController);

SynEditCueController.$inject = ['$mdDialog'];

function SynEditCueController($mdDialog) {

    var secVm = this;
    this.$mdDialog_ = $mdDialog;

}

SynEditCueController.prototype.activate = function() {
};

SynEditCueController.prototype.$cancel = function() {
    this.$mdDialog_.cancel();
};

SynEditCueController.prototype.$close = function() {
    this.$mdDialog_.hide(this.cue);
};

SynEditCueController.prototype.deleteCue = function() {
    this.$mdDialog_.hide(null);
};

// IIFE
})();