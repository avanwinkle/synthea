(function() {
'use strict';

angular
    .module('SyntheaApp')
    .controller('SynEditCueController', SynEditCueController);

SynEditCueController.$inject = ['$mdDialog'];

function SynEditCueController($mdDialog) {

    var secVm = this;
    this.$mdDialog_ = $mdDialog;

    window.edit = this;


}

SynEditCueController.prototype.activate = function() {
};

SynEditCueController.prototype.$cancel = function() {
    this.$mdDialog_.cancel();
};

SynEditCueController.prototype.$close = function() {
    this.$mdDialog_.hide(this.cue);
};

// IIFE
})();