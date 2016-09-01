(function() {

angular
  .module('SyntheaApp')
  .directive('synIcon', function() {

    /* PELLEGO ICON DIRECTIVE

        Usage: <svg pgo-icon="bookmark" [pgo-icon-size="32"] ></svg>

        This directive supplies an SVG-rendered icon, smoother than a PNG and
        without the "pop-in" of ligature-based icon fonts. The directive is to
        be applied to an <svg> element and contain the name of the icon. An
        optional parameter can specify the (pixel) dimensions of the desired
        icon display.

        To render, the icon SVG definiton must be a defined <symbol> in the
        icon <svg> found at the end of core.html.

    */

    return {
      restrict: 'A',
      link: function synIcon(scope,ele,attrs) {


        // The defined <base> url messes up the relative <use> path
        var baseUrl = window.location.href.replace(window.location.hash, '');

        // We can pass in a size, or default to 24px;
        var size = attrs.size || '24';
        // We have SVG sets at 24px and 48px
        var svgSize = parseInt(size) > 24 ? '48' : '24';

        // Define the absolute path to the icon <symbol> (via core.html)
        scope.icPath = baseUrl + '#ic_' + attrs.synIcon + '_' + svgSize + 'px';

        // Define the size and class of the containing SVG element
        var e = ele[0];
        ele.addClass('syn-icon');
        e.style.width = size;
        e.style.height = size;

      },
      // Isolate the scope to avoid icPath overwrites in binding
      scope: {},
      template: '<use xlink:href="{{::icPath}}"></use>',
    };
  });


// IIFE
})();