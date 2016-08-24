(function() {
'use strict';

angular
    .module("SyntheaApp",['ngAnimate','ngAria','ngMaterial'])
    .config(SyntheaAppConfig)
    .run(SyntheaAppRun);


SyntheaAppConfig.$inject = ['$mdThemingProvider'];

function SyntheaAppConfig($mdThemingProvider) {


    $mdThemingProvider.theme('default')
        .primaryPalette('grey')
        .accentPalette('pink');

}

SyntheaAppRun.$inject = [];

function SyntheaAppRun() {

    window.addEventListener('contextmenu', function(e) {

        var target = angular.element(e.target).scope();

        // Is a Contextual action defined?
        if (target.hasOwnProperty('contextAction')) {
            // Escape the directive scope and pass the parent
            target.contextAction(target.$parent);
        }
    });
}

require('./filters.js');
require('./SynCue.js');
require('./SynMixer.js');
require('./SynProject.js');
require('./directives/synIcon.js');
require('./directives/synRightClick.js');
require('./SyntheaController.js');

// IIFE
})();

