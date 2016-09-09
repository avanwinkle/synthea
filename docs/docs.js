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
    .when('/editing', {
        templateUrl: 'templates/editing.html',
    })
    .when('/playing', {
        templateUrl: 'templates/playing.html',
    })
    .otherwise({
        templateUrl: 'templates/intro.html'
    });

}

SyntheaDocsController.$inject = ['$mdSidenav','$scope'];

function SyntheaDocsController($mdSidenav,$scope) {

    var vm = this;

    this.openSidenav = openSidenav;

    $scope.$on('$routeChangeSuccess', function() {
        console.log("route change!")
        document.getElementById('body-content').scrollTop = 0;
        $mdSidenav('left').close();
    });

    function openSidenav() {
        $mdSidenav('left').open();
    }
}

// IIFE
})();