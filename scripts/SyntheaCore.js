(function() {
'use strict';

angular
    .module('SyntheaCore',['ngAnimate','ngAria','ngMaterial'])
    .config(SyntheaCoreConfig);


SyntheaCoreConfig.$inject = ['$locationProvider','$mdThemingProvider'];

function SyntheaCoreConfig($locationProvider,$mdThemingProvider) {


    // $locationProvider.html5Mode(true);

    // Not much to configure, just some ngMaterial theme options
    $mdThemingProvider.theme('default')
        .primaryPalette('grey')
        .accentPalette('pink');

    $mdThemingProvider.theme('pink')
        .primaryPalette('pink')
        .accentPalette('blue');


}

require('howler');
require('./filters.js');
require('./directives/synIcon.js');
require('./directives/synRightClick.js');

// IIFE
})();

