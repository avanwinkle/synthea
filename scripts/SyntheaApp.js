(function() {

angular.module("SyntheaApp",['ngAnimate','ngAria','ngMaterial']);

//var csvRe = new RegExp("(?:^|,)(?=[^\"\"]|(\"\")?)\"\"?((?(1)[^\"\"]*|[^,\"\"]*))\"\"?(?=,|$)");

require('./SynCue.js');
require('./SynMixer.js');
require('./SynProject.js');
require('./SyntheaController.js');

// IIFE
})();

