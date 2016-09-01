(function() {
'use strict';

angular
    .module("SyntheaApp",['ngAnimate','ngAria','ngMaterial'])
    .config(SyntheaAppConfig)
    .run(SyntheaAppRun);


SyntheaAppConfig.$inject = ['$mdThemingProvider'];

function SyntheaAppConfig($mdThemingProvider) {

    // Not much to configure, just some ngMaterial theme options
    $mdThemingProvider.theme('default')
        .primaryPalette('grey')
        .accentPalette('pink');

}

SyntheaAppRun.$inject = [];

function SyntheaAppRun() {

    // The 'contextmenu' event is a right-click, which we use for queuing
    window.addEventListener('contextmenu', function(e) {

        var target = angular.element(e.target).scope();

        // Is a Contextual action defined for this target?
        if (target.hasOwnProperty('contextAction')) {
            // Escape the directive scope and pass the parent
            target.contextAction(target.$parent);
        }
    });
}

require('howler');
require('./filters.js');
require('./SynChannel.js');
require('./SynGroup.js');
require('./SynMixer.js');
require('./SynProject.js');
require('./directives/synIcon.js');
require('./directives/synRightClick.js');
require('./SyntheaController.js');

// IIFE
})();

