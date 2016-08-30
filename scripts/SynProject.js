(function() {
'use strict';

angular
    .module('SyntheaApp')
    .service('SynProject',SynProject);

SynProject.$inject = ['$http','$q','$log'];

function SynProject($http,$q,$log) {

    // This is a singleton so every service/controller can access
    var project = {};
    window.p = project;

    function load(projectDef) {

        var defer = $q.defer();

        // Look for a layout file
        if (projectDef.documentRoot) {
            project.documentRoot = projectDef.documentRoot;
            $http.get(projectDef.documentRoot + '/layout').then(function(response){
                angular.extend(project, response.data);

                // Make a temporary id-based lookups
                var cols = {};
                var buts = {};
                angular.forEach(project.columns, function(c) {
                    cols[c.id] = c;
                    c._buttons = [];
                });

                // Create our cue objects
                angular.forEach(project.buttons, function(b) {
                    b._fullPath = project.documentRoot + '/normal/' + b.files[0];
                    // Add to each column
                    angular.forEach(b.column_ids, function(c) {
                        cols[c]._buttons.push(b);
                    });
                    // And the lookup
                    buts[b.id] = b;
                });

                // Map the cues to the hotkeys as well
                angular.forEach(project.hotKeys, function(h) {
                    h.cue = buts[h.target];
                });

                defer.resolve();
            });

        }
        else {
            console.error('No known project format');
        }

        return defer.promise;
    }

    // Return a page by index, or default to zero
    function getPage(idx) {
        idx = parseInt(idx) || 0;
        return project.pages[idx];
    }

    function getProject() {
        return project;
    }

    return {
        load: load,
        // getConfig: getConfig,
        getPage: getPage,
        getProject: getProject
    };

}


// Return array of string values, or NULL if CSV string not well formed.
function CSVtoArray(text) {
    var re_valid = /^\s*(?:'[^'\\]*(?:\\[\S\s][^'\\]*)*'|"[^"\\]*(?:\\[\S\s][^"\\]*)*"|[^,'"\s\\]*(?:\s+[^,'"\s\\]+)*)\s*(?:,\s*(?:'[^'\\]*(?:\\[\S\s][^'\\]*)*'|"[^"\\]*(?:\\[\S\s][^"\\]*)*"|[^,'"\s\\]*(?:\s+[^,'"\s\\]+)*)\s*)*$/;
    var re_value = /(?!\s*$)\s*(?:'([^'\\]*(?:\\[\S\s][^'\\]*)*)'|"([^"\\]*(?:\\[\S\s][^"\\]*)*)"|([^,'"\s\\]*(?:\s+[^,'"\s\\]+)*))\s*(?:,|$)/g;
    // Return NULL if input string is not well formed CSV string.
    if (!re_valid.test(text)) return null;
    var a = [];                     // Initialize array to receive values.
    text.replace(re_value, // "Walk" the string using replace with callback.
        function(m0, m1, m2, m3) {
            // Remove backslash from \' in single quoted values.
            if      (m1 !== undefined) a.push(m1.replace(/\\'/g, "'"));
            // Remove backslash from \" in double quoted values.
            else if (m2 !== undefined) a.push(m2.replace(/\\"/g, '"'));
            else if (m3 !== undefined) a.push(m3);
            return ''; // Return empty string.
        });
    // Handle special case of empty last value.
    if (/,\s*$/.test(text)) a.push('');
    return a;
}


// IIFE
})();