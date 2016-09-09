(function() {
'use strict';

angular
    .module('SyntheaDocsApp',['ngAnimate','ngAria','ngMaterial','ngRoute'])
    .config(SyntheaDocsConfig)
    .controller('SyntheaDocsController', SyntheaDocsController);

SyntheaDocsConfig.$inject = ['$mdThemingProvider','$routeProvider'];

function SyntheaDocsConfig($mdThemingProvider,$routeProvider) {

    $mdThemingProvider.theme('synthea')
        .primaryPalette('grey')
        .accentPalette('pink');

    $routeProvider
    .otherwise({
        templateUrl: 'templates/intro.html'
    });

}

SyntheaDocsController.$inject = ['$mdSidenav'];

function SyntheaDocsController($mdSidenav) {

    var vm = this;
    console.log("Got the controller!")

    this.openSidenav = openSidenav;




    function openSidenav() {
        $mdSidenav('left').open();
    }
}

// IIFE
})();