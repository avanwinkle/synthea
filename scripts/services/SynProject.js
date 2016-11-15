(function(){
'use strict';

const {ipcRenderer} = require('electron');

angular
    .module('SyntheaApp')
    .service('SynProject',SynProject);

SynProject.$inject = ['$http','$q','$log'];

/**
 * A service for handling projects and project-related tasks.
 */
function SynProject($http,$q,$log) {

    // This is a singleton so every service/controller can access
    var project = {};
    var def = {};

    // For debugging, direct access to the project is convenient
    window.p = project;

    var SynProjectService = {
        copyMediaToProject: copyMediaToProject,
        deleteMedia: deleteMedia,
        load: load,
        getPage: getPage,
        getProject: function() { return project; },
        getProjectDef: function() { return def; },
        getProjectMediaList: getProjectMediaList,
        getProjectMediaByAssignment: getProjectMediaByAssignment,
        saveProject: saveProject,
        showFile: showFile,
    };

    return SynProjectService;

    /**
     * Promise handler for copying media to a project. Other controllers/services
     * can request a media copy action from this service, which contacts the
     * main process to handle the OS-level engagement. After the OS dialog is
     * completed, this service will resolve the promise with the selected media.
     *
     * @return {promise} A promise, resolved with the list of media copied
     */
    function copyMediaToProject() {

        var defer = $q.defer();

        ipcRenderer.once('project-media', function(evt, media) {
            defer.resolve(media);
        });

        ipcRenderer.send('add-media-to-project',def.key);

        return defer.promise;
    }

    function deleteMedia(filename) {

        var defer = $q.defer();

        ipcRenderer.once('media-deleted', function(evt, fname) {
            defer.resolve(fname);
        });

        // Don't have a reason to do any promises yet, so just fire-and-forget
        ipcRenderer.send('delete-media',filename);

        return defer.promise;
    }

    /**
     * Main method for loading a project into the Synthea application. Accepts
     * either a layout file or a definition file (if the latter, will fetch the
     * layout itself).
     *
     * @param  {object} projectDef    Project definition file
     * @param  {object} projectLayout Project layout file
     * @return {promise}  A promise resolved when the project is fully loaded
     */
    function load(projectDef,projectLayout) {

        // Copy the project def
        def = angular.copy(projectDef);

        // Reset the project!
        for (var prop in project) {
            if (project.hasOwnProperty(prop)) {
                delete project[prop];
            }
        }

        var defer = $q.defer();

        // Look for a layout file
        if (projectLayout) {
            // console.log('Loading project from passed layout file',projectLayout)
            _processLayoutFile(projectLayout);
            defer.resolve();
        }

        // Look for a definition file that has a layout
        else if (projectDef.documentRoot) {
            // console.log("Loading project from projectDef file")

            $http.get(projectDef.documentRoot + '/layout.json')
            .then(function(response){
                _processLayoutFile(response.data);
                defer.resolve();
            });

        }
        else {
            console.error('No known project format');
        }

        return defer.promise;
    }

    /**
     * Simple method to select a page of a project
     * @param  {integer} idx Page number to select (default 0)
     * @return {SynPage}     The page of the project
     */
    function getPage(idx) {
        idx = parseInt(idx) || 0;
        return project.pages[idx];
    }

    function getProjectMediaByAssignment() {
        var defer = $q.defer();

        // Make a list of all cue media
        var cueMedia = {};
        angular.forEach(project.cues, function(c) {
            for (var i=0;i<c.sources.length;i++) {
                // Is this the first cue for this source?
                if (!cueMedia[c.sources[i]]) {
                    cueMedia[c.sources[i]] = [];
                }
                cueMedia[c.sources[i]].push(c);
            }
        });

        var response = {
            all: [],
            assigned: [],
            sprites: [],
            unassigned: [],
            size: 0,
        };

        getProjectMediaList(true).then(function(medialist) {

            response.all = medialist;
            var mediafiles = [];

            // Track media that's NOT in a cue
            angular.forEach(medialist, function(m) {
                mediafiles.push(m.name);

                if (!cueMedia[m.name]) {
                    response.unassigned.push(m);
                }
                else {
                    // Store the name as assigned
                    response.assigned.push(m);
                    // The list of assigned cues
                    m._assignedCues = cueMedia[m.name];
                }
                response.size += m.stats.size;
            });

            // Check all the sprites
            for (var k=project.sprites.length-1;k>=0;k--) {
                var s = project.sprites[k];
                // If we don't have the media, remove the sprite
                if (mediafiles.indexOf(s.source)==-1) {
                    console.warn('Unable to find media '+s.source+' for sprite '+s.name);
                    project.sprites.splice(k,1);
                }
                else {
                    // A sprite can be assigned or unassigned
                    if (!cueMedia[s.name]) {
                        response.unassigned.push(s);
                    }
                    else {
                        response.assigned.push(s);
                    }
                }
            }
            console.log(response)

            defer.resolve(response);
        });

        return defer.promise;
    }

    /**
     * Method to retrieve an array of filenames, listing all of the media files
     * in the projects `/audio/` folder. This service acts as the handler, while
     * passing the actual filesystem query to the main process.
     * @param {boolean} detailed Whether to include full stats (default: false)
     * @return {promise} A promise resolved with an array of filenames.
     */
    function getProjectMediaList(detailed) {

        // Create a promise to async fetch the listing
        var defer = $q.defer();

        // Create a listener for the impending broadcast
        ipcRenderer.once('project-media', function(evt, media) {
            defer.resolve(media);
        });

        ipcRenderer.send('get-project-media', {key: def.key}, detailed);

        return defer.promise;
    }

    function saveProject() {
        ipcRenderer.send('save-project', project);
    }

    function showFile(filename) {
        console.log('showing file',filename)
        ipcRenderer.send('show-file',
            def.documentRoot + '/audio/' + filename);
    }


    /**
     * Private method for parsing a layout JSON file and hooking up convenience
     * bindings. During these fragile dev days, this is also the optimal place
     * to put migrations and schema changes for backwards-compatibility.
     *
     * The primary effects of this method currently are to:
     *  * Drop cues pointing to non-existent source files
     *  * Bind hotkeys to their target cue objects
     *
     * @private
     * @param  {SynLayout} layoutfile A layout file
     *
     */
    function _processLayoutFile(layoutfile) {
        angular.extend(project, layoutfile);

        // Make a name lookup for sprites so we can connect cues
        var sprite_names = {}
        if (!project.sprites) { project.sprites = []; }
        for (var i=project.sprites.length;i--;i>=0) {
            sprite_names[project.sprites[i].name] = project.sprites[i];
        }

        // Make an id lookup for cues so we can bind hotkeys
        var cue_ids = {};

        // Catch erroneous bindings (i.e. hotkeys to cues that don't exist)
        // AVW: Does this still do anything? I can't figure out what the point is
        for (var i=project.cues.length;i--;i>=0) {
            if (!project.cues[i]) {
                console.log("  removing hotkey ",project.cues[i]);
                project.cues.splice(i,1);
            }
        }

        // Look over our cue objects and make some conveniences
        angular.forEach(project.cues, function(c, idx) {

            // Note the full path to the audio file, including the
            // documentRoot (which is NOT saved in the project)
            c._audioRoot = def.documentRoot + '/audio/';

            // And the lookup for hotkeys
            cue_ids[c.id] = c;

            // Look through the sources
            angular.forEach(c.sources, function(src) {
                // Do we have a sprite by this name?
                if (sprite_names[src]) {
                    // Is this the first sprite for this cue?
                    if (!c._sprites) { c._sprites = {}; }
                    // Store a pointer to the sprite in the cue
                    c._sprites[src] = sprite_names[src];
                }
            })
        });

        // Map the cues to the hotkeys so we can call the cue directly
        angular.forEach(project.hotKeys, function(h) {
            // MIGRATION: target to cue_id
            if (h.target) {
                console.warn('Hotkey.target is deprecated. Please use hotkey.cue_id');
                h.cue_id = h.target;
                delete(h.target);
            }
            h._cue = cue_ids[h.cue_id];
        });

        // Do we have a nice image? Show it!
        if (project.bannerImage) {
            project._bannerImage = 'url(\''+
                def.documentRoot + '/' +
                project.bannerImage + '\')';
        }
    }

}

// IIFE
})();
