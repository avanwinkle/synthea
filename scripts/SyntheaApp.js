(function() {
'use strict';

angular
    .module("SyntheaApp",['ngAnimate','ngAria','ngMaterial'])
    .config(SyntheaAppConfig)
    .run(SyntheaAppRun)
    .filter('secondsToTimecode', secondsToTimecode);


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

function secondsToTimecode() {
    return function(duration) {
        var sec_num = parseInt(duration, 10); // don't forget the second param
        var minutes = Math.floor(sec_num / 60);
        var seconds = sec_num - (minutes * 60);
        var decs = Math.floor(duration % 1 * 10);

        if (minutes < 10) {minutes = "0"+minutes;}
        if (seconds < 10) {seconds = "0"+seconds;}
        return minutes+':'+seconds+'.'+decs;

    };
}


require('./SynCue.js');
require('./SynMixer.js');
require('./SynProject.js');
require('./directives/synIcon.js');
require('./directives/synRightClick.js');
require('./SyntheaController.js');

// IIFE
})();

