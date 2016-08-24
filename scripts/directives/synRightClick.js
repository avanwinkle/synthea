(function() {

angular
  .module('SyntheaApp')
  .directive('synRightClick', function() {

    return {
      link: function(scope,ele,attrs) {

        // Bind a contextual method from the parent scope
        scope.contextAction =
          scope.$parent.$eval(attrs.synRightClick);

      },
      restrict: 'A',
      scope:true,
    };
  });


// IIFE
})();