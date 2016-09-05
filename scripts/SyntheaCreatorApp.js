(function() {
'use strict';

const {ipcRenderer} = require('electron');

angular
    .module('SyntheaCreatorApp',['ngAnimate','ngAria','ngMaterial'])
    .controller('SyntheaCreatorController', SyntheaCreatorController);

SyntheaCreatorController.$inject = ['$window'];

function SyntheaCreatorController($window) {

    var scVm = this;
    this.$window_ = $window;

    // Bind a method to close the window, so we can "cancel" this view
    scVm.close = window.close;

    this.activate();

}

SyntheaCreatorController.prototype.activate = function() {

    // Create an empty project
    this.project = {
        name: undefined,
        key: undefined,
        config: {
            boardType: 'music',
            fadeInDuration: 1000,
            fadeOutDuration: 2000,
        },
        pages: [
            {
                display_order: 0,
                name: undefined,
                id: 1,
            }
        ],
        cues: [],
        sections: [],
        hotKeys: {},
    };

};

SyntheaCreatorController.prototype.createProject = function() {
    // Broadcast to the main process that we have a project
    ipcRenderer.send('create-project', this.project );
    // this.$window_.close();
};

// IIFE
})();