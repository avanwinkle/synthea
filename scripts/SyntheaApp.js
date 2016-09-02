(function() {
'use strict';

angular
    .module("SyntheaApp",['SyntheaCore','ngAnimate','ngAria','ngMaterial','ngRoute'])
    .config(SyntheaAppConfig)
    .run(SyntheaAppRun);

SyntheaAppConfig.$inject = ['$routeProvider'];

function SyntheaAppConfig($routeProvider) {

    // Declare the routes!
    $routeProvider
        .when('/edit/:projectkey', {
            controller: 'SynEditorController',
            controllerAs: 'seVm',
            templateUrl: 'templates/editor.html',
        })
        .when('/player/:projectkey', {
            controller: 'SynPlayerController',
            controllerAs: 'spVm',
            templateUrl: 'templates/player.html',
        })
        .otherwise({
            templateUrl: 'templates/landing.html',
        });
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
require('./SyntheaCore.js');
require('./controllers/SyntheaController.js');
require('./controllers/SynEditorController');
require('./controllers/SynPlayerController');
require('./services/SynChannel.js');
require('./services/SynMixer.js');
require('./services/SynProject.js');
require('./services/SynSubgroup.js');

// IIFE
})();

