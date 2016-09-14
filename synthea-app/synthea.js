(function() {

var fs = require('fs');
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


function addMediaToProject(evt,pkey) {

    dialog.showOpenDialog( {
        title: 'Select Media for Project',
        properties: ['openFile', 'multiSelections'],
    }, function(selection) {

        // Maybe nothing?
        if (!selection) { return; }

        for (var i=0;i<selection.length;i++) {
            try {

                var filename;
                // Windows slashes are backwards
                var splitter = process.platform === 'win32' ? '\\' : '/';
                var filename = selection[i].split(splitter).pop();
                
                // Open up the file and dump it to the project folder
                fs.createReadStream(selection[i])
                .pipe(fs.createWriteStream(
                    synthea.configs.projectFolder+'/'+pkey+'/audio/'+filename));
            }
            catch(err) {

            }
        }

        // Return the new list of files
        synthea.getProjectMedia(null,{key:pkey});

    });
}

function closeProject(evt) {

    mainWindow.webContents.send('open-project',null);
    setMenusEnabled('close-project');

    // Remove from the synthea.configs?
    if (synthea.configs.lastProject === synthea.currentProjectDef.key && !synthea.currentProjectDef.location) {
        synthea.configs.lastProject = undefined;
        synthea.saveConfig();
    }

    synthea.currentProjectDef = undefined;
}


function createProject(project) {

    // Make sure we have everything
    if (!project.name || !project.key || !project.pages ||
    !project.pages.length || !project.pages[0].name) {
        console.error('Invalid Project');
        return;
    }

    // TODO: Validate all of these fields

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
            console.log("DELETE PROJECT:",synthea.currentProjectDef );

            // Remove the audio
            var fs = require('fs');

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

function editProject(projectDef) {

    synthea.setMenusEnabled('edit-project');

    // We can pass a projectDef if it's passed to us
    if (!projectDef.documentRoot || !projectDef.key) {
        projectDef = undefined;
    }
    synthea.mainWindow.webContents.send('edit-project',projectDef);
}

function getProjectMedia(evt,proj) {
    var output = [];

    var media = fs.readdirSync(synthea.configs.projectFolder+'/'+proj.key+'/audio');
    for (var i=0;i<media.length;i++) {
        // Ignore hidden files and those without extensions
        if (media[i].indexOf('.') > 0) {
            output.push(media[i]);
        }
    }

    synthea.mainWindow.webContents.send('project-media',output);
}

function init(userDataPath) {
    // Keep a global reference to the application configuration
    synthea.config_path = userDataPath + '/config';


    // Does a config file exist?
    try {
        fs.statSync(synthea.config_path);
        synthea.configs = JSON.parse(fs.readFileSync(synthea.config_path));
    }
    // If not, let's make a config file (it lives in %APP_DIR% or equivalent)
    catch(err) {

        var defaultFolder = userDataPath + '/Projects';

        // Make the folder, if need be
        try {
            fs.accessSync(defaultFolder);
        }
        catch(err) {
            fs.mkdirSync(defaultFolder);
        }

        // Make a default config file, which is just the default folder
        synthea.configs = {
            projectFolder: defaultFolder,
        };
        // Save it
        synthea.saveConfig();
    }
}

function openProject(projectDef) {

    // Since we validate, might as well pass the layout file too
    var projectLayout;

    // Don't do any processing for cloud projects, yet
    if (projectDef && projectDef.location) {
        
    }
    // Check the config for a documentRoot, which is all we need
    else if (projectDef && projectDef.documentRoot) {

        projectLayout =
            JSON.parse(fs.readFileSync(projectDef.documentRoot + '/layout.json'));
        var validation = _validateProject(projectLayout);

        if (validation.errors.length) {
            synthea.openProject(null);
            return;
        }
    }

    // This means we got a project without a documentRoot, which is bad
    else if (projectDef) {
        console.error('No project documentRoot, unable to process',projectDef);
        projectDef = null;
    }

    synthea.currentProjectDef = projectDef;
    synthea.currentProjectLayout = projectLayout;
    synthea.mainWindow.webContents.send('open-project',projectDef,projectLayout);
    synthea.setMenusEnabled(projectDef ? 'open-project' : 'no-project');

    // Remember that we opened this!
    if (projectDef && projectDef.key && !projectDef.location && projectDef.key !== synthea.configs.lastProject) {
        synthea.configs.lastProject = projectDef.key;
        synthea.saveConfig();
    }
}


function saveAndOpenProject(evt, project) {

    // Save the project
    synthea.saveProject(evt,project, synthea.openProject);
}

function saveConfig() {
    console.info("Saving configuration", synthea.configs);
    fs.writeFile(synthea.config_path,JSON.stringify(synthea.configs), function(err) {
        console.error(err);
    });
}


function saveProject(evt, project, callbackFn) {
    console.info('Saving project!', project);

    // TODO: Implement a JSON schema validation method to streamline this

    function stripProps(obj) {
        // STRIP INTERNALS
        for (var prop in obj) {
            if (obj.hasOwnProperty(prop)) {
                if ( prop.indexOf('$')===0 || prop.indexOf('_')===0 || prop.indexOf('_')===prop.length-1) {
                    delete(obj[prop]);
                }
                // Recursion?
                else if (Array.isArray(obj[prop])) {
                    for (var i in obj[prop]) {
                        stripProps(obj[prop][i]);
                    }
                }
                else if (typeof(obj[prop])==='object') {
                    stripProps(obj[prop]);
                }
            }
        }
    }

    stripProps(project);

    // Validate the resulting project
    var validation = _validateProject(project);

    // If it didn't validate, abort
    if (validation.errors.length) {
        return;
    }

    // Create a project Def

    var projectDef = {
        documentRoot: synthea.configs.projectFolder+'/'+project.key,
        key: project.key,
        name: project.name
    };

    fs.writeFile(
        projectDef.documentRoot + '/layout.json',
        JSON.stringify(project,null,2),
        function() {
            if(typeof(callbackFn) === 'function') {
                callbackFn(projectDef);
            }
        }
    );
}

function _validateProject(projectLayout) {

    var v = new Validator();
    var schema = syntheaSchema.projectSchema;

    // Add the schema components to the validator
    v.addSchema(syntheaSchema.cueSchema, '/synCue');
    v.addSchema(syntheaSchema.pageSchema, '/synPage');
    v.addSchema(syntheaSchema.sectionSchema, '/synSection');

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
