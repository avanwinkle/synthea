const electron = require('electron');
const fs = require('fs');
// Module to control application life.
const {app, BrowserWindow, dialog, ipcMain, Menu, MenuItem, shell} = electron;
const VERSION = require('./package.json').version;

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

// Keep a global reference to the application configuration
let CONFIGS;
const CONFIG_PATH = app.getPath('userData')+'/config';

// Keep a pointer to the project menu so we can add/remove
let PROJECTS = [];
// And our current project
let CURRENT_PROJECT;

// Keep our menu accessible
let menu;

// HEY LISTEN! Developers, wanna see what's going on? TURN THIS ON!!
let DEBUG_MODE = false;

function addMediaToProject(evt,pkey) {

    dialog.showOpenDialog( {
        title: 'Select Media for Project',
        properties: ['openFile', 'multiSelections'],
    }, function(selection) {

        // Maybe nothing?
        if (!selection) { return; }

        for (var i=0;i<selection.length;i++) {
            try {

                var filename = selection[i].split('/').pop();

                fs.createReadStream(selection[i])
                .pipe(fs.createWriteStream(
                    CONFIGS.projectFolder+'/'+pkey+'/audio/'+filename));
            }
            catch(err) {

            }
        }

        // Return the new list of files
        getProjectMedia(null,{key:pkey});

    });
}

function browseCloudProjects() {

    // Create a new window to show the loader
    let child = new BrowserWindow({
        modal: true,
        show: false
    });

    // Create a node-formatted url for the loader window
    let url = require('url').format({
      protocol: 'file',
      slashes: true,
      pathname: require('path').join(__dirname, '/templates/loader.html')
    });

    child.loadURL(url);
    child.once('ready-to-show', () => {
      child.show();
      if (DEBUG_MODE) { child.webContents.openDevTools(); }

      // If the loader window broadcasts a project, handle it
      ipcMain.once('open-project', function(evt,projectDef) {
        openProject(projectDef);
        child.close();
      });
    });
}

function closeProject(evt) {
    mainWindow.webContents.send('open-project',null);

    // Set some menus
    let filemenu, playbackmenu;
    // Find the file menu
    for (var i=0;i<menu.items.length;i++) {
        if (menu.items[i].label === 'File') {
            filemenu = menu.items[i].submenu;
        }
        else if (menu.items[i].label === 'Playback') {
            playbackmenu = menu.items[i].submenu;
        }
    }

    // Parse the file menu to change some toggles
    for (i=0;i<filemenu.items.length;i++) {
        if (filemenu.items[i].label === 'Edit Project') {
            filemenu.items[i].enabled = false;
        }
        // Enable the "Save Project" filemenu option
        else if (filemenu.items[i].label === 'Save Project') {
            filemenu.items[i].enabled = false;
        }
        else if (filemenu.items[i].label === 'Delete Project') {
            filemenu.items[i].enabled = false;
        }
    }
    for (i=0;i<playbackmenu.items.length;i++) {
        // Uncheck the 'DJ Mode' menu item
        if (playbackmenu.items[i].label === 'DJ Mode') {
            playbackmenu.items[i].checked = false;
        }
    }

    // Remove from the configs?
    if (CONFIGS.lastProject === CURRENT_PROJECT.key && !CURRENT_PROJECT.location) {
        CONFIGS.lastProject = undefined;
        saveConfig();
    }

    CURRENT_PROJECT = undefined;
}

function createMenus() {

    // renderProjectsMenu();

    // The standard menu templates. Most things are disabled, but placeholders
    // as reminders of what's yet to come!
    let template = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'New Project',
                    role: 'new',
                    click: openProjectCreator
                },
                {
                    label: 'Open Project...',
                    role: 'open',
                    click: openProjectFromFolder,
                },
                {
                    label: 'Close Project',
                    click: closeProject,
                },
                { type: 'separator',},
                {
                    label: 'Edit Project',
                    role: 'edit',
                    enabled: false,
                    click: editProject,
                },
                {
                    label: 'Save Project',
                    role: 'save',
                    enabled: false,
                    click: function() {
                         // Broadcast the main window to return us a project to save
                        mainWindow.webContents.send('get-project');
                    }
                },
                {
                    label: 'Save Project As...',
                    role: 'saveAs',
                    enabled: false,
                },
                {   type: 'separator' },
                {
                    label: 'Delete Project',
                    enabled: false,
                    click: deleteProject,
                }
            ]
        },
        {
            label: 'Projects',
            submenu: renderProjectsMenu(),
        },
        {
            label: 'Playback',
            submenu: [
                {
                    label: 'General Settings...',
                    enabled: false,
                },
                {   type: 'separator'},
                {
                    label: 'Fade Incoming Tracks',
                    type: 'checkbox',
                    checked: false,
                    enabled: false,
                    accelerator: 'Tab'
                },
                {
                    label: 'Cross-blend Tracks',
                    type: 'checkbox',
                    checked: true,
                    enabled: false,
                    accelerator: 'Shift+Tab',
                },
                {   type: 'separator' },
                {
                    label: 'DJ Mode',
                    type: 'checkbox',
                    checked: false,
                    click: toggleDJMode,
                }
            ]
        }
    ];

    if (process.platform === 'darwin') {
        // const name = require('electron').remote.app.getName();
        template.unshift({
            label: 'synthea-webapp',
            submenu: [
                {
                    role: 'about',
                },
                {
                    label: 'Enable Debug Mode',
                    click: enableDebugMode,
                },
                {
                    label: 'Reset Audio Engine',
                    click: resetAudioEngine,
                },
                {
                    type: 'separator',
                },
                {
                    role: 'services',
                    submenu: [],
                },
                {
                    type: 'separator',
                },
                {
                    role: 'quit',
                }

            ]
        });
    }

    // This is async, so NOW build the menu
    menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

function createModalWindow(name,callbackFn) {
    // Create a new window to show the creator
    let child = new BrowserWindow({
        modal: false,
        show: false
    });

    // Create a node-formatted url for the loader window
    let url = require('url').format({
      protocol: 'file',
      slashes: true,
      pathname: require('path').join(__dirname, '/templates/'+name+'.html')
    });

    child.loadURL(url);
    child.once('ready-to-show', () => {
      child.show();
      if (DEBUG_MODE) { child.webContents.openDevTools(); }
    });

    return child;
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
    var targetFolder = CONFIGS.projectFolder+'/'+project.key;

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
                editProject(projectDef);
            });

    }
}

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    backgroundColor: '#EEEEEE',
    height: 600,
    icon: './assets/synthea_flat.ico',
    title: 'Synthea ' + VERSION,
    width: 1200,
  });

  // and load the index.html of the app.
  // AVW: This must be in GRAVES, not APOSTROPHES
  mainWindow.loadURL(`file://${__dirname}/templates/index.html`);

  // Open the DevTools.
  if (DEBUG_MODE) { mainWindow.webContents.openDevTools(); }


  // OSX Icon
  app.dock.setIcon(
    electron.nativeImage.createFromPath('./assets/synthea_icon.png'));

  // Tray Icon (Untested)
  // const appIcon = new electron.Tray('./assets/synthea_icon.png');

  initializeSynthea(app);
      renderProjectsMenu();


  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });
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
            console.log("DELETE PROJECT:",CURRENT_PROJECT );

            // Remove the audio
            var fs = require('fs');

            var layout = CURRENT_PROJECT.documentRoot+'/layout.json';
            var audio = CURRENT_PROJECT.documentRoot+'/audio';
            if( fs.existsSync(audio) && fs.existsSync(layout)) {
                fs.readdirSync(audio).forEach(function(file,index){
                    fs.unlinkSync(audio + '/' + file);
                });
                fs.rmdirSync(audio);
                fs.unlinkSync(layout);
                fs.rmdir(CURRENT_PROJECT.documentRoot);
            }


            // Close it
            closeProject();
        }

    });
}

function editProject(projectDef) {

    let submenu;
    // Find the file menu
    for (var i=0;i<menu.items.length;i++) {
        if (menu.items[i].label === 'File') {
            submenu = menu.items[i].submenu;
            break;
        }
    }

    // Parse the file menu to change some toggles
    for (i=0;i<submenu.items.length;i++) {
        if (submenu.items[i].label === 'Edit Project') {
            submenu.items[i].enabled = false;
        }
        // Enable the "Save Project" submenu option
        else if (submenu.items[i].label === 'Save Project') {
            submenu.items[i].enabled = true;
        }
    }

    // We can pass a projectDef if it's passed
    if (!projectDef.documentRoot || !projectDef.key) {
        projectDef = undefined;
    }
    mainWindow.webContents.send('edit-project',projectDef);
}

function enableDebugMode() {
    DEBUG_MODE = true;
    mainWindow.webContents.openDevTools();
}

function getProjectMedia(evt,proj) {
    var output = [];

    var media = fs.readdirSync(CONFIGS.projectFolder+'/'+proj.key+'/audio');
    for (var i=0;i<media.length;i++) {
        // Ignore hidden files and those without extensions
        if (media[i].indexOf('.') > 0) {
            output.push(media[i]);
        }
    }

    mainWindow.webContents.send('project-media',output);
}

function initializeSynthea() {

    // Does a config file exist?
    try {
        fs.statSync(CONFIG_PATH);
        CONFIGS = JSON.parse(fs.readFileSync(CONFIG_PATH));
    }
    // If not, let's make a config file (it lives in %APP_DIR% or equivalent)
    catch(err) {

        var defaultFolder = app.getPath('userData')+'/Projects';

        // Make the folder, if need be
        try {
            fs.accessSync(defaultFolder);
        }
        catch(err) {
            fs.mkdirSync(defaultFolder);
        }

        // Make a default config file, which is just the default folder
        CONFIGS = {
            projectFolder: defaultFolder,
        };
        // Save it
        saveConfig();
    }

    // Create our menus
    createMenus();

    // If we have a last-used project, open that by default
    mainWindow.webContents.once('did-finish-load', function() {

        var foundLastProject = false;

        // Now that the menus are built, let's try opening our last project
        if (CONFIGS.lastProject) {
            // Iterate over the projects we found in our Projects folder
            for (var i=0;i<PROJECTS.length;i++) {
                // Do any of those PROJECTS.items match the last one we opened?
                if (PROJECTS[i].key === CONFIGS.lastProject) {
                    openProject(PROJECTS[i]);
                    foundLastProject = true;
                    break;
                }
            }
        }
        // If we don't have a project to lad?
        if (!foundLastProject) {
            openProject(null);
        }
    });

    /*** GENERAL SYNTHEA LISTENERS ***/

    ipcMain.on('add-media-to-project', addMediaToProject);
    ipcMain.on('browse-cloud-projects', browseCloudProjects);
    ipcMain.on('get-project-media', getProjectMedia);
    ipcMain.on('save-project', saveProject);
    ipcMain.on('save-and-open-project', saveAndOpenProject);
    ipcMain.on('open-create-project', openProjectCreator);
    ipcMain.on('open-project-from-folder', openProjectFromFolder);
    ipcMain.on('open-weburl', openWeburl);
}

function openProject(projectDef) {
    // Check the config for a documentRoot, which is all we need
    // Or null, to clear out any projects
    if (!projectDef || projectDef.documentRoot) {
        mainWindow.webContents.send('open-project',projectDef);
    }
    // This means we got a project without a documentRoot, which is bad
    else {
        console.error('No project documentRoot, unable to process',projectDef);
    }

    CURRENT_PROJECT = projectDef;

    // Remember that we opened this!
    if (projectDef && projectDef.key && !projectDef.location && projectDef.key !== CONFIGS.lastProject) {
        CONFIGS.lastProject = projectDef.key;
        saveConfig();
    }

    // Set some menus
    let filemenu, playbackmenu;
    // Find the file menu
    for (var i=0;i<menu.items.length;i++) {
        if (menu.items[i].label === 'File') {
            filemenu = menu.items[i].submenu;
        }
        else if (menu.items[i].label === 'Playback') {
            playbackmenu = menu.items[i].submenu;
        }
    }

    // Parse the file menu to change some toggles
    for (i=0;i<filemenu.items.length;i++) {
        if (filemenu.items[i].label === 'Edit Project') {
            filemenu.items[i].enabled = true;
        }
        // Enable the "Save Project" filemenu option
        else if (filemenu.items[i].label === 'Save Project') {
            filemenu.items[i].enabled = false;
        }
        else if (filemenu.items[i].label === 'Delete Project') {
            filemenu.items[i].enabled = true;
        }
    }
    for (i=0;i<playbackmenu.items.length;i++) {
        // Uncheck the 'DJ Mode' menu item
        if (playbackmenu.items[i].label === 'DJ Mode') {
            playbackmenu.items[i].checked = false;
        }
    }
}

function openProjectCreator() {
    var modal = createModalWindow('creator');
    // If the loader window broadcasts a project, handle it
    ipcMain.once('create-project', function(evt,project) {
        createProject(project);
        modal.close();
    });
}

function openProjectFromFolder() {
    dialog.showOpenDialog({properties:['openDirectory']}, function(d) {
        // Does openDialog always return an array?
        if (!d || !d.length) { return; }

        openProject({documentRoot: d[0]});

    });
}

function openWeburl(evt,url) {
    // Make sure it's a url or a mailto
    if (!/^(https?:\/\/|mailto:)/.exec(url) ) { url = 'http://' + url; }
    shell.openExternal(url);
}

function renderProjectsMenu() {


    PROJECTS = [];

    // Look through everything in the Projects folder to see if it's a project
    var projs = fs.readdirSync(CONFIGS.projectFolder);
    var output = [];

    for(var i=0;i<projs.length;i++) {

        // No hidden files, obvs
        if (projs[i][0] === '.') {
            continue;
        }


        // Look for a layout file
        try {
            var f = fs.readFileSync(
                CONFIGS.projectFolder+'/'+projs[i]+'/layout.json',
                { encoding:'UTF-8'}
            );

            var pconfig = JSON.parse(f);

            // Store that this is a project
            PROJECTS.push({
                key: projs[i],
                name: pconfig.name,
                documentRoot: CONFIGS.projectFolder + '/' + projs[i],
            });

            // Create a menu item
            output.push({
                // Common attributes for all project definitions
                key: projs[i],
                name: pconfig.name,
                // Special attributes for the OS menu
                documentRoot: CONFIGS.projectFolder + '/' + projs[i],
                click: openProject,
                label: pconfig.name,
            });
        }

        catch(err) {
            // Eh, don't really know what to do with a folder that fails.
            // Just ignore it, I guess...
            continue;
        }


    }

    // Sort the projects alphabetically by name (for lack of a better plan)
    // But REVERSE so we can insert them
    output.sort(function(a,b) {
        if (a.name.toLowerCase() < b.name.toLowerCase()) {
            return -1;
          }
          if (a.name.toLowerCase() > b.name.toLowerCase()) {
            return 1;
          }

          // names must be equal
          return 0;
    });

    // Add a link to open the folder
    output.push({ type: 'separator'});
    output.push({
        label: 'Go to Projects Folder',
        click: function() {
            electron.shell.showItemInFolder(CONFIGS.projectFolder);
        },
    });
    output.push({
        label: 'Change Projects Folder...',
        click: function() {
            dialog.showOpenDialog({properties:['openDirectory']}, function(d) {
                if (!d) { return; }

                CONFIGS.projectFolder = d[0];
                saveConfig();
                createMenus();

            });
        }
    });
    output.push( { type: 'separator' });
    output.push( {
        label: 'Browse Cloud Projects...',
        click: browseCloudProjects,
    });

    return output;
}

function resetAudioEngine() {
    mainWindow.webContents.send('reset-audio-engine');
}

function saveConfig() {
    console.info("Saving configuration", CONFIGS)
    fs.writeFile(CONFIG_PATH,JSON.stringify(CONFIGS), function(err) {
        console.error(err);
    });
}

function saveAndOpenProject(evt, project) {

    // Save the project
    saveProject(evt,project,openProject);
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
                    stripProps(obj[prop])
                }
            }
        }
    }

    stripProps(project);

    // Create a project Def

    var projectDef = {
        documentRoot: CONFIGS.projectFolder+'/'+project.key,
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

function toggleDJMode() {
    // Tell the main window to go DJ
    mainWindow.webContents.send('toggle-dj',Menu);
}


// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
// console.log(init)