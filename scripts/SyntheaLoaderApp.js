(function() {
'use strict';

const {ipcRenderer} = require('electron');

angular
    .module('SyntheaLoaderApp',['ngAnimate','ngAria','ngMaterial'])
    .controller('SyntheaLoaderController', SyntheaLoaderController);

SyntheaLoaderController.$inject = ['$http'];

function SyntheaLoaderController($http) {

    var slVm = this;
    this.$http_ = $http;

    // Bind a method to close the window, so we can "cancel" this view
    slVm.close = window.close;

    this.activate();

}

SyntheaLoaderController.prototype.activate = function() {
    // Fetch the list of cloud projects
    this.$http_.get('https://s3-us-west-2.amazonaws.com/synthea/projects.json')
    .then(function(response) {
        this.projects = response.data;
    }.bind(this));
};

SyntheaLoaderController.prototype.loadProject = function(projectDef) {
    // Broadcast to the main process that we have a project
    ipcRenderer.send('open-project', projectDef );
};

// IIFE
})();