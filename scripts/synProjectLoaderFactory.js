(function() {

angular
    .module('SyntheaApp')
    .factory('ProjectLoader', ProjectLoaderFactory);

ProjectLoaderFactory.$inject = ['$http','$log','$q'];

function ProjectLoaderFactory($http,$log,$q) {

    var pl = this;

    pl.loadProject = function(pName) {

        var prom = $q.defer();

        $http.get('./Projects/'+pName+'/Layout.csv')
        .then( function(response) {

            var master = { pages: [], columns: {}, buttons: {} };

            csv = response.data.split("\n");
            if (csv.length < 2) csv = response.data.split("\r");

            angular.forEach(csv, function(rawline) {

                // No comments
                if (rawline[0] != "#") {

                    // BLACK MAGICK: single quotes break
                    line = rawline.replace(/'/g,"");
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
                        // Create a button
                        var button = {
                            column: line[1],
                            name: line[2],
                            file: line[3],
                        };

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

                        master.buttons[line[0]].push(button);

                    }
                }

            });

            /// All done? Return it
            prom.resolve(master);
        });

        return prom.promise;
    };
    return pl;
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