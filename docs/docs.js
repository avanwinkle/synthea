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
        templateUrl: 'templates/cues.html',
    })
    .when('/editing', {
        templateUrl: 'templates/editing.html',
    })
    .when('/help', {
        templateUrl: 'templates/help.html',
    })
    .when('/playing', {
        templateUrl: 'templates/playing.html',
    })
    .when('/media', {
        templateUrl: 'templates/media.html',
    })
    .otherwise({
        templateUrl: 'templates/intro.html'
    });

}

SyntheaDocsController.$inject = ['$mdSidenav','$scope'];

function SyntheaDocsController($mdSidenav,$scope) {

    var vm = this;

    this.openSidenav = openSidenav;

    $scope.$on('$routeChangeSuccess', function(evt,route) {
        console.log(route)
        document.getElementById('body-content').scrollTop = 0;
        $mdSidenav('left').close();
        if (route.$$route && route.$$route.originalPath !== '/') {
            $scope.currentPage = route.$$route.originalPath.replace('/','');
        }
        else {
            $scope.currentPage = 'home';
        }
    });

    function openSidenav() {
        $mdSidenav('left').open();
    }
}

// IIFE
})();