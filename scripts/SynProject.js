(function() {
'use strict';

angular
    .module('SyntheaApp')
    .service('SynProject',SynProject);

SynProject.$inject = ['SynCue','$http','$q','$log'];

function SynProject(SynCue,$http,$q,$log) {

    // This is a singleton so every service/controller can access
    var project = {};

    function load(pkey) {

        project.key = pkey;
        project.master = {};

        var defer = $q.defer();

        // CONFIG FILE
        $http.get('./Projects/'+project.key+'/Config.txt')
        .then(function(response) {

            var config = {};

            var lines = response.data.split('\n');

            angular.forEach(lines, function(line) {
                var l = line.trim().split(':');
                if (l[0].trim())
                config[l[0]] = l[1];
            });

            project.config = config;

        });

        // LAYOUT FILE
        $http.get('./Projects/'+project.key+'/Layout.csv')
        .then( function(response) {

            var master = { pages: [], columns: {}, buttons: {} };

            var csv = response.data.split("\n");
            if (csv.length < 2) csv = response.data.split("\r");

            angular.forEach(csv, function(rawline) {

                // No comments
                if (rawline[0] != "#") {

                    // BLACK MAGICK: single quotes break
                    var line = rawline.replace(/'/g,"");
                    line = CSVtoArray(line);

                    if (!line || !line[0]) {

                        // Is it nothing?
                        if (!line) {
                            return;
                        }

                        // Empty lines are all commas
                        var commas = rawline.match(/,/g);
                        if (commas && commas.length==rawline.length) {
                            return;
                        }
                        else {
                            $log.warn("Unable to parse line:",rawline);

                        }
                    }

                    else {
                        // Parse for button args
                        var button = {
                            column: line[1],
                            name: line[2],
                            file: line[3],
                        };

                        // Additional args?
                        if (line.length > 4) {
                            button.args = line[4].split(',');
                        }

                        // Tooltip?
                        if (line.length > 5) {
                            button.tooltip = line[5];
                        }

                        // Add this to the column
                        var butparent = line[0]+"__"+line[1];

                        // Do we have this page?
                        if (master.pages.indexOf(line[0]) == -1) {
                            master.pages.push(line[0]);
                            master.columns[line[0]] = [];
                            master.buttons[line[0]] = [];
                        }
                        // Do we have this column?
                        if (master.columns[line[0]].indexOf(line[1]) == -1) {
                            master.columns[line[0]].push(line[1]);
                        }

                        // Create a button object
                        var b = new SynCue(button);

                        master.buttons[line[0]].push(b);

                    }
                }

            });

            // Set our master
            project.master = master;

            /// All done? Return it
            defer.resolve();
        });

        return defer.promise;
    }

    function getConfig(key) {
        if (key==='key') {
            return project.key;
        }
        else if (project.config.hasOwnProperty(key)) {
            return project[config[key]];
        }
        else {
            console.error('Project has no configuration "'+key+'"');
        }
    }

    // Return a page by index, or default to zero
    function getPage(idx) {
        idx = parseInt(idx) || 0;
        return project.master.pages[idx];
    }

    function getProject() {
        return project;
    }

    return {
        load: load,
        getConfig: getConfig,
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