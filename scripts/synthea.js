(function() {

angular.module("SyntheaApp",['ngAnimate','ngAria','ngMaterial']);

//var csvRe = new RegExp("(?:^|,)(?=[^\"\"]|(\"\")?)\"\"?((?(1)[^\"\"]*|[^,\"\"]*))\"\"?(?=,|$)");

require('./synProjectLoaderFactory.js');
require('./SyntheaController.js');

// IIFE
})();

