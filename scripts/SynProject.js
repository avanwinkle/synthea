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

        // Reset the project!
        for (var prop in project) {
            if (project.hasOwnProperty(prop)) {
                delete project[prop];
            }
        }

        var defer = $q.defer();

        // Look for a layout file
        if (projectDef.documentRoot) {

            // If this is a local project (i.e. has no root saved)
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
                    // Note the full path to the audio file, including the
                    // documentRoot (which is NOT saved in the project)
                    b._fullPath = project.documentRoot + '/audio/' + b.files[0];
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

                // Do we have a nice image?
                if (project.bannerImage) {
                    project.bannerImage_ = 'url(\''+
                        projectDef.documentRoot + '/' +
                        project.bannerImage + '\')';
                }

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

// IIFE
})();