(function() {
'use strict';

angular
    .module('SyntheaDocsApp',['ngAnimate','ngAria','ngMaterial','ngRoute','ngScrollTo'])
    .config(SyntheaDocsConfig)
    .controller('SyntheaDocsController', SyntheaDocsController);

SyntheaDocsConfig.$inject = ['$locationProvider','$mdThemingProvider','$routeProvider'];

function SyntheaDocsConfig($locationProvider,$mdThemingProvider,$routeProvider) {



    $locationProvider.html5Mode = {
        enabled: false,
        requireBase: true,
        rewriteLinks: true,
    };

    $mdThemingProvider.theme('synthea')
        .primaryPalette('grey')
        .accentPalette('pink');

    $routeProvider
    .when('/cues', {
        templateUrl: 'templates/docs-cues.html',
    })
    .when('/editing', {
        templateUrl: 'templates/docs-editing.html',
    })
    .when('/help', {
        templateUrl: 'templates/docs-help.html',
    })
    .when('/playing', {
        templateUrl: 'templates/docs-playing.html',
    })
    .when('/media', {
        templateUrl: 'templates/docs-media.html',
    })
    .otherwise({
        templateUrl: 'templates/docs-intro.html'
    });

}

SyntheaDocsController.$inject = ['$mdSidenav','$scope','$timeout'];

function SyntheaDocsController($mdSidenav,$scope,$timeout) {

    var vm = this;

    this.openSidenav = openSidenav;

    $scope.$on('$routeChangeSuccess', function(evt,route) {

        $mdSidenav('left').close();
        if (route.$$route && route.$$route.originalPath !== '/') {
            $scope.currentPage = route.$$route.originalPath.replace('/','');
        }
        else {
            $scope.currentPage = 'home';
        }

        // Hide the scrollbar
        document.getElementById('body-content').style.overflow = 'hidden';

        // Wait 250ms for the page to fade out before jumping to the top
        $timeout(function() {
            document.getElementById('body-content').scrollTop = 0;
        },250);

        // Wait 500ms for the new page to fade in before restoring scrollbar
        $timeout(function() {
            document.getElementById('body-content').style.overflow = 'auto';
        },500);

    });

    function openSidenav() {
        $mdSidenav('left').open();
    }
}

// IIFE
})();