(function() {
'use strict';

angular
    .module("SyntheaApp",['ngAnimate','ngAria','ngMaterial'])
    .config(SyntheaAppConfig);


SyntheaAppConfig.$inject = ['$mdThemingProvider'];

function SyntheaAppConfig($mdThemingProvider) {


    $mdThemingProvider.theme('default')
        .primaryPalette('grey')
        .accentPalette('pink');

}


require('./SynCue.js');
require('./SynMixer.js');
require('./SynProject.js');
require('./SyntheaController.js');

// IIFE
})();

