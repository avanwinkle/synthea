(function() {
'use strict';

angular
    .module("SyntheaApp",['ngAnimate','ngAria','ngMaterial'])
    .config(SyntheaAppConfig)
    .filter('secondsToTimecode', secondsToTimecode);


SyntheaAppConfig.$inject = ['$mdThemingProvider'];

function SyntheaAppConfig($mdThemingProvider) {


    $mdThemingProvider.theme('default')
        .primaryPalette('grey')
        .accentPalette('pink');

}

function secondsToTimecode() {
    return function(duration) {
        var sec_num = parseInt(duration, 10); // don't forget the second param
        var minutes = Math.floor(sec_num / 60);
        var seconds = sec_num - (minutes * 60);

        if (minutes < 10) {minutes = "0"+minutes;}
        if (seconds < 10) {seconds = "0"+seconds;}
        return minutes+':'+seconds;

    };
}


require('./SynCue.js');
require('./SynMixer.js');
require('./SynProject.js');
require('./SyntheaController.js');

// IIFE
})();

