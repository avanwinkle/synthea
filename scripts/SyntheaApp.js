(function() {
'use strict';

angular
    .module("SyntheaApp",['dndLists','SyntheaCore','ngRoute'])
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
        .when('/landing', {
            templateUrl: 'templates/landing.html',
        })
        .when('/loading', {
            templateUrl: 'templates/loading.html',
        })
        .otherwise({
            template: '<div>Synthea Error: Something has gone wrong :(</div>',
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
require('./SyntheaCore');
require('./controllers/SyntheaController');
require('./controllers/SynEditCueController');
require('./controllers/SynEditorController');
require('./controllers/SynListController');
require('./controllers/SynMediaController');
require('./controllers/SynPlayerController');
require('./directives/synChannelPlayer');
require('./services/SynChannel');
require('./services/SynMixer');
require('./services/SynProject');
require('./services/SynSubgroup');

// IIFE
})();

