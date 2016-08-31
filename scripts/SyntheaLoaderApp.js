(function() {
'use strict';

const {ipcRenderer} = require('electron');

angular
    .module('SyntheaLoaderApp',['ngAnimate','ngAria','ngMaterial'])
    .controller('SyntheaLoaderController', SyntheaLoaderController);

SyntheaLoaderController.$inject = ['$http'];

function SyntheaLoaderController($http) {

    var slVm = this;

    slVm.close = window.close;

    activate();


    function activate() {

        $http.get('https://s3-us-west-2.amazonaws.com/synthea/projects.json')
        .then(function(response) {
            slVm.projects = response.data;
        });

    }
}

SyntheaLoaderController.prototype.loadProject = function(projectDef) {
    ipcRenderer.send('open-project', projectDef );
};

// IIFE
})();