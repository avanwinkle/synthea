(function() {
'use strict';

angular
    .module('SyntheaCore',['ngAnimate','ngAria','ngMaterial'])
    .config(SyntheaCoreConfig);


SyntheaCoreConfig.$inject = ['$locationProvider','$mdThemingProvider'];

function SyntheaCoreConfig($locationProvider,$mdThemingProvider) {


    // $locationProvider.html5Mode(true);

    // Not much to configure, just some ngMaterial theme options

    $mdThemingProvider.theme('player')
        .primaryPalette('blue', {
            default: '600',
        })

        .warnPalette('pink');

    // 'Default' here actually means editor, or what? Ought to finish this
    $mdThemingProvider.theme('default')
        .primaryPalette('grey')
        .accentPalette('pink');

    $mdThemingProvider.theme('pink')
        .primaryPalette('pink')
        .accentPalette('grey');


}

require('./filters.js');
require('./directives/synIcon.js');
require('./directives/synRightClick.js');

// IIFE
})();

