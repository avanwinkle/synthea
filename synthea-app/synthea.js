(function() {

const fs = require('fs');
const {dialog} = require('electron');
const syntheaSchema = require('./schema');
const Validator = require('jsonschema').Validator;

var synthea = {
    addMediaToProject: addMediaToProject,
    closeProject: closeProject,
    createProject: createProject,
    configs: {},
    config_path: undefined,
    currentProjectDef: {},
    deleteMedia: deleteMedia,
    deleteProject: deleteProject,
    editProject: editProject,
    getProjectMedia: getProjectMedia,
    init: init,
    mainWindow: undefined,
    openProject: openProject,
    saveAndOpenProject: saveAndOpenProject,
    saveConfig: saveConfig,
    saveProject: saveProject,
    // The main.js will bind this to its own method
    setMenusEnabled: function() {},
};

// This is what becomes accessible via require('synthea');
module.exports = synthea;

/**
 * Open a native OS file-select dialog and copy any resulting files into
 * the project's audio folder
 * @param {event} evt  (Menu) Event
 * @param {string} pkey Project key to which the media should be added
 */
function addMediaToProject(evt,pkey) {

    dialog.showOpenDialog({
        title: 'Select Media for Project',
        properties: ['openFile', 'multiSelections'],
    }).then(function(value) {
        if (value.canceled) { return; }
        const selection = value.filePaths;

        // Maybe nothing?
        if (!selection) { return; }

        // TODO: Find an elegant way to create a single deferral that resolves
        //       when each of the file copy operations completes, so that callback
        //       behavior can assume that all the files exist in the project folder
        for (var i=0;i<selection.length;i++) {
            try {
                // Windows slashes are backwards
                var splitter = process.platform === 'win32' ? '\\' : '/';
                var filename = selection[i].split(splitter).pop();

                // Open up the file and dump it to the project folder
                fs.createReadStream(selection[i])
                .pipe(fs.createWriteStream(
                    synthea.configs.projectFolder+'/'+pkey+'/audio/'+filename));
            }
            catch(err) {
                console.error(err);
            }
        }

        // Return the new list of files
        synthea.getProjectMedia(null,{key:pkey});

    });
}

/**
 * Close the current project and return to the main Synthea screen
 * @param  {event} evt (Menu) Event
 */
function closeProject(evt) {

    synthea.mainWindow.webContents.send('open-project',null);
    synthea.setMenusEnabled('close-project');

    // Remove from the synthea.configs?
    if (synthea.configs.lastProject === synthea.currentProjectDef.key && !synthea.currentProjectDef.location) {
        synthea.configs.lastProject = undefined;
        synthea.saveConfig();
    }

    synthea.currentProjectDef = undefined;
}

/**
 * Create a new project from a layout file and open for editing
 * @param  {object} project Project layout JSON
 */
function createProject(project) {

    // Make sure we have everything
    var validation = _validateProject(project);

    if (validation.errors.length) {
        console.error('Invalid Project');
        return;
    }

    // Does this folder already exist?
    var targetFolder = synthea.configs.projectFolder+'/'+project.key;

    // Make the folder, if need be
    try {
        fs.accessSync(targetFolder);
        console.error('Project folder already exists!');
        dialog.showErrorBox('Unable to Create Project',
            'Project folder "'+project.key+'" already exists.');

        return;
    }
    catch(err) {
        fs.mkdirSync(targetFolder);
        fs.mkdirSync(targetFolder+'/audio');

        fs.writeFile(targetFolder+'/layout.json',
            JSON.stringify(project), function(err) {
                if (err) {
                    dialog.showErrorBox('Unable to Create Project', err);
                    console.error(err);
                    return;
                }
                // Open the project!
                var projectDef = {
                    key: project.key,
                    name: project.name,
                    documentRoot: targetFolder,
                };
                synthea.editProject(projectDef);
            });

    }
}


function deleteMedia(evt,filename) {

    const CANCEL_ID = 1;
    dialog.showMessageBox({
        buttons: ['Delete Media','Cancel'],
        cancelId: CANCEL_ID,
        defaultId: CANCEL_ID,
        type: 'question',
        title: 'Confirm Delete',
        message: 'This file will be deleted from the project folder. Are you sure?',
    }, function(response) {

        if (response!==CANCEL_ID) {
            var audio = synthea.currentProjectDef.documentRoot+'/audio';
            if( fs.existsSync(audio) && fs.existsSync(audio + '/' + filename)) {
                fs.unlinkSync(audio + '/' + filename);
            }
            synthea.mainWindow.webContents.send('media-deleted',filename);
        }

    });
}

/**
 * Delete the current project
 */
function deleteProject() {

    const CANCEL_ID = 1;
    dialog.showMessageBox({
        buttons: ['Delete Project','Cancel'],
        cancelId: CANCEL_ID,
        defaultId: CANCEL_ID,
        type: 'question',
        title: 'Confirm Delete',
        message: 'This project and all its media will be deleted. Are you sure?',
    }, function(response) {

        if (response!==CANCEL_ID) {

            // Remove the audio and layout files
            var layout = synthea.currentProjectDef.documentRoot+'/layout.json';
            var audio = synthea.currentProjectDef.documentRoot+'/audio';
            if( fs.existsSync(audio) && fs.existsSync(layout)) {
                fs.readdirSync(audio).forEach(function(file,index){
                    fs.unlinkSync(audio + '/' + file);
                });
                fs.rmdirSync(audio);
                fs.unlinkSync(layout);
                fs.rmdir(synthea.currentProjectDef.documentRoot);
            }


            // Close it
            synthea.closeProject();
        }

    });
}

/**
 * Open a project in the edit view (through a broadcast)
 * @param  {object} projectDef Project definition file (or menu object)
 */
function editProject(projectDef) {

    synthea.setMenusEnabled('edit-project');

    // We can pass a projectDef if it's passed to us
    if (!projectDef.documentRoot || !projectDef.key) {
        projectDef = undefined;
    }
    synthea.mainWindow.webContents.send('edit-project', projectDef);
}

/**
 * Fetch a file listing from the project's audio folder and return it via broadcast
 *
 * @param  {event} evt  (Menu) Event
 * @param  {object} proj Project layout OR definition
 */
function getProjectMedia(evt,proj,detailed) {
    var output = [];

    var media = fs.readdirSync(synthea.configs.projectFolder+'/'+proj.key+'/audio');
    for (var i=0;i<media.length;i++) {
        // Ignore hidden files and those without extensions
        if (media[i].indexOf('.') > 0) {
            var fd = synthea.configs.projectFolder+'/'+proj.key+'/audio/' + media[i];

            // A detailed request?
            if (detailed) {
                // Return an object with the name and stats
                output.push( {name: media[i], stats: fs.statSync(fd)});
            }
            // Otherwise, just the file name (as a string)
            else {
                output.push(media[i]);
            }
        }
    }

    synthea.mainWindow.webContents.send('project-media',output);
}

/**
 * Initialize Synthea in the given user-data path.
 * @param  {string} userDataPath Path for user data storage (Synthea configs)
 */
function init(userDataPath) {
    // Keep a global reference to the application configuration
    synthea.config_path = userDataPath + '/config';

    function createDefaultProjectFolder() {
        var defaultFolder = userDataPath + '/Projects';

        // Make the folder, if need be
        try {
            fs.accessSync(defaultFolder);
        }
        catch(err) {
            fs.mkdirSync(defaultFolder);
        }

        return defaultFolder;
    }

    // Does a config file exist in the user data folder?
    try {
        fs.statSync(synthea.config_path);
        synthea.configs = JSON.parse(fs.readFileSync(synthea.config_path));

        // Check if our projects folder exists
        if (!fs.existsSync(synthea.configs.projectFolder)) {
            // Go to the default
            synthea.configs.projectFolder = createDefaultProjectFolder();
            // Save it
            synthea.saveConfig();
        }
    }
    // If not, let's make a config file (it lives in %APP_DIR% or equivalent)
    catch(err) {
        console.warn('Error opening config file', err);

        // Make a default config file, which is just the default folder
        synthea.configs = {
            projectFolder: createDefaultProjectFolder(),
        };
        // Save it
        synthea.saveConfig();
    }
}

/**
 * Open a project by validating its layout and broadcasting to the render
 * window. Passing a `null` value will render the main Synthea splash page.
 * @param  {object} projectDef Project definition (or menu object)
 */
function openProject(projectDef) {

    // Since we validate, might as well pass the layout file too,
    // so let's store a reference to it
    var projectLayout, projectMenus;

    // Don't do any processing for cloud projects, yet
    if (projectDef && projectDef.location) {
        // Should we do anything different for clouds?
        projectMenus = 'cloud-project';
    }
    // Check the definition object for a documentRoot, which is all we need
    else if (projectDef && projectDef.documentRoot) {

        projectLayout =
            JSON.parse(fs.readFileSync(projectDef.documentRoot + '/layout.json'));
        var validation = _validateProject(projectLayout);

        if (validation.errors.length) {
            synthea.openProject(null);
            return;
        }

        // If we opened from a folder rather than a hydrated projectDef, grab
        // the project key from the project config file
        if (!projectDef.key) {
            projectDef.key = projectLayout.key;
        }

        projectMenus = 'open-project';
    }
    // This means we got a project without a documentRoot, which is bad
    else if (projectDef) {
        console.error('No project documentRoot, unable to process',projectDef);
        projectDef = null;
        projectMenus = 'no-project';
    }
    // This means we didn't get a project, aka a reset
    else {
        projectDef = null; // Force the type to null, for consistency
        projectMenus = 'no-project';
    }

    // Keep track of what's currently open, so we can reference it easily
    synthea.currentProjectDef = projectDef;
    synthea.currentProjectLayout = projectLayout;

    // Broadcast to the render window to open this project
    // starting with Electron 9, we cannot send full projectDef but only a subset
    synthea.mainWindow.webContents.send(
        'open-project', projectDef==null?null:{"key":projectDef.key,"documentRoot":projectDef.documentRoot,"location":projectDef.location}, projectLayout);
    // Set the appropriate menu items to be enabled/disabled
    synthea.setMenusEnabled(projectMenus);

    // Remember we opened this, if it's a local project and not our last opened
    if (projectDef && projectDef.key && !projectDef.location &&
        projectDef.key !== synthea.configs.lastProject) {
            synthea.configs.lastProject = projectDef.key;
            synthea.saveConfig();
    }
}

/**
 * Save the current project and open it. This method is the primary means of
 * "exiting" edit mode.
 * @param  {event} evt     (Menu) Event
 * @param  {object} projectLayout Project layout JSON
 */
function saveAndOpenProject(evt, projectLayout) {
    // Save the project and pass openProject as the callback
    synthea.saveProject(evt,projectLayout, synthea.openProject);
}

/**
 * Save the current Synthea app configuration (project folder + most recent)
 */
function saveConfig() {
    console.info("Saving configuration", synthea.configs);
    fs.writeFile(synthea.config_path,JSON.stringify(synthea.configs), function(err) {
        if (err) throw err;
    });
}

/**
 * Save a new (or existing) project from its layout file
 * @param  {event} evt           (Menu) Event
 * @param  {object} projectLayout Project layout JSON
 * @param  {function} callbackFn    Callback on project save success
 */
function saveProject(evt, projectLayout, callbackFn) {
    console.info('Saving project!', projectLayout);

    // A quick recursive method to strip out attributes we don't want to save
    function stripProps(obj) {
        for (var prop in obj) {
            if (obj.hasOwnProperty(prop)) {
                if (
                     // Strip leading $ marks, from angular
                     prop.indexOf('$')===0 ||
                     // Strip leading underscores, for convenience attributes
                     prop.indexOf('_')===0 ||
                     // Strip trailing underscores, for instance-prototype binding
                     prop.indexOf('_')===prop.length-1) {
                        delete(obj[prop]);
                }
                // Recursion: All the items in an array
                else if (Array.isArray(obj[prop])) {
                    for (var i in obj[prop]) {
                        stripProps(obj[prop][i]);
                    }
                }
                // Recursion: All the properties of an object
                else if (typeof(obj[prop])==='object') {
                    stripProps(obj[prop]);
                }
            }
        }
    }

    // Strip out the submitted project layout
    stripProps(projectLayout);

    // Validate the resulting project
    var validation = _validateProject(projectLayout);

    // If it didn't validate, abort
    if (validation.errors.length) { return; }

    // Create a project Def, which we'll return in the calback
    var projectDef = {
        documentRoot: synthea.configs.projectFolder+'/'+projectLayout.key,
        key: projectLayout.key,
        name: projectLayout.name
    };

    // Write this project layout to json
    fs.writeFile(
        projectDef.documentRoot + '/layout.json',
        JSON.stringify(projectLayout,null,2),
        function() {
            if(typeof(callbackFn) === 'function') {
                callbackFn(projectDef);
            }
        }
    );
}

/**
 * JSON validation method for checking a project layout. Will display an error
 * if validation fails, and returns the results of the validation. It shall be
 * the responsibility of the caller to take correct behavior if validation fails.
 *
 * @param  {object} projectLayout Project layout JSON
 * @return {validation}               Validation object
 */
function _validateProject(projectLayout) {

    var v = new Validator();
    var schema = syntheaSchema.projectSchema;

    // Add the schema components to the validator
    v.addSchema(syntheaSchema.cueSchema, '/synCue');
    v.addSchema(syntheaSchema.pageSchema, '/synPage');
    v.addSchema(syntheaSchema.sectionSchema, '/synSection');
    v.addSchema(syntheaSchema.spriteSchema, '/synSprite');

    var validation = v.validate(projectLayout,schema);

    if (validation.errors.length) {
        dialog.showErrorBox('Error: Invalid Project File',
            'Synthea is unable to read the requested project. The details '+
            'of the error are below.\n\n'+
            validation.errors.map(function(er) {
                return er.stack;
            }).join('\n\n')
        );
        console.error('Invalid project file!', validation.errors);
    }

    return validation;

}

// IIFE
})();
