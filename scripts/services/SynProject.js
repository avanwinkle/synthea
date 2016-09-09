(function() {
'use strict';

const {ipcRenderer} = require('electron');

angular
    .module('SyntheaApp')
    .service('SynProject',SynProject);

SynProject.$inject = ['$http','$q','$log'];

function SynProject($http,$q,$log) {

    // This is a singleton so every service/controller can access
    var project = {};
    var def = {};
    window.p = project;

    function copyMediaToProject() {

        var defer = $q.defer();

        ipcRenderer.once('project-media', function(evt, media) {
            defer.resolve(media);
        });

        ipcRenderer.send('add-media-to-project',def.key);

        return defer.promise;

    }

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

            // Copy the project def
            def = angular.copy(projectDef);

            $http.get(projectDef.documentRoot + '/layout.json')
            .then(function(response){
                angular.extend(project, response.data);

                // Make an id lookup for cues so we can bind hotkeys
                var cue_ids = {};
                console.log('starting with '+project.cues.length+' cues');
                // Catch erroneous
                for (var i=project.cues.length;i--;i>=0) {
                    if (!project.cues[i]) {
                        console.log("  removing ",project.cues[i])
                        project.cues.splice(i,1);
                    }
                }

                // Create our cue objects
                angular.forEach(project.cues, function(c, idx) {

                    // Note the full path to the audio file, including the
                    // documentRoot (which is NOT saved in the project)
                    c._fullPath = projectDef.documentRoot + '/audio/' +
                        c.sources[0];
                    // AVW: Phasing out in favor of cuesInSection
                    // filter, but may regress if performance is hit too much
                    // // Add to each column
                    // angular.forEach(c.section_ids, function(s) {
                    //     secs[s]._cues.push(c);
                    // });
                    // And the lookup
                    cue_ids[c.id] = c;
                });

                // Map the cues to the hotkeys as well
                angular.forEach(project.hotKeys, function(h) {
                    h.cue = cue_ids[h.target];
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

    function getProjectMediaList() {

        // Create a promise to async fetch the listing
        var defer = $q.defer();

        // Create a listener for the impending broadcast
        ipcRenderer.once('project-media', function(evt, media) {
            defer.resolve(media);
        });

        ipcRenderer.send('get-project-media', {key: def.key});

        return defer.promise;
    }


    var SynProjectService = {
        copyMediaToProject: copyMediaToProject,
        load: load,
        // getConfig: getConfig,
        getPage: getPage,
        getProject: function() { return project; },
        getProjectDef: function() { return def; },
        getProjectMediaList: getProjectMediaList,
    };

    window.SynProject = SynProjectService;
    return SynProjectService;

}

// IIFE
})();