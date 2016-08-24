(function() {

angular
  .module('SyntheaApp')
  .directive('synRightClick', ['SynMixer', function(SynMixer) {

    return {
        restrict: 'A',

        link: function(scope,ele,attrs) {

            // Bind a contextual method from the parent scope
            scope.contextAction = function() {
                SynMixer.getMixer().queue(scope.cue);
            };

        },
        // scope:true,
    };
}]);


// IIFE
})();