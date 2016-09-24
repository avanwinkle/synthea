(function() {
'use strict';

const {ipcRenderer} = require('electron');
require('./SyntheaCore');

angular
    .module('SyntheaCreatorApp',['SyntheaCore'])
    .controller('SyntheaCreatorController', SyntheaCreatorController);

SyntheaCreatorController.$inject = ['$timeout','$window'];

function SyntheaCreatorController($timeout,$window) {

    var scVm = this;
    this.$timeout_ = $timeout;
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
        subgroups: {},
        hotKeys: {},
    };

};

SyntheaCreatorController.prototype.checkAutoKey = function() {
    // If we've manually set a key, or have no name, do nothing
    if (this.isManualKey || !this.project.name) { return; }

    // Try and make a nice key
    this.project.key = this.project.name.replace(/[^0-9a-zA-Z]/g, '');

};

SyntheaCreatorController.prototype.createProject = function() {
    // Broadcast to the main process that we have a project
    ipcRenderer.send('create-project', this.project );
    // this.$window_.close();
};

SyntheaCreatorController.prototype.setManualKey = function(oldkey) {
    // Delay to separate the ng-model update from the original value
    this.$timeout_(function() {
        // If the value was CHANGED maunally (not just tabbed through)
        if (oldkey !== this.project.key) {
            // Note that the value was manually changed so we don't auto anymore
            this.isManualKey = true;
        }
    }.bind(this),0);
};

// IIFE
})();