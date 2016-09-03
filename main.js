const electron = require('electron');
const fs = require('fs');
// Module to control application life.
// const app = electron.app;
const dialog = require('electron').dialog;
const {app, ipcMain, Menu, MenuItem, shell} = electron;
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow;
const VERSION = require('./package.json').version;

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

// Keep a global reference to the application configuration
let CONFIGS;
const CONFIG_PATH = app.getPath('userData')+'/config';

// Keep a pointer to the project menu so we can add/remove
let PROJECTS = [];

// Keep a reference on what we're doing in the main window

// HEY LISTEN! Developers, wanna see what's going on? TURN THIS ON!!
let DEBUG_MODE = false;

function addMediaToProject(evt,pkey) {

    dialog.showOpenDialog( {
        title: 'Select Media for Project',
        properties: ['openFile', 'multiSelections'],
    }, function(selection) {

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

function closeProject(evt) {
    mainWindow.webContents.send('open-project',null);
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
                },
                {
                    label: 'Close Project',
                    click: closeProject,
                },
                { type: 'separator',},
                {
                    label: 'Edit Project',
                    role: 'edit',
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
                    role: 'delete',
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
    let menu = Menu.buildFromTemplate(template);
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
        return;
    }
    catch(err) {
        fs.mkdirSync(targetFolder);
        fs.mkdirSync(targetFolder+'/audio');

        fs.writeFile(targetFolder+'/layout',
            JSON.stringify(project), function(err) {
                if (err) {
                    console.error(err);
                    return;
                }
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

function editProject(menuItem) {
    // menuItem.enabled = false;
    menuItem.label = 'Done Editing Project';
    for (var i=0;i<menuItem.menu.items.length;i++) {
        // Enable the "Save Project" menu option
        if (menuItem.menu.items[i].label === 'Save Project') {
            menuItem.menu.items[i].enabled = true;
            break;
        }
    }
    mainWindow.webContents.send('edit-project');
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
        // Now that the menus are built, let's try opening our last project
        if (CONFIGS.lastProject) {
            // Iterate over the projects we found in our Projects folder
            for (var i=0;i<PROJECTS.length;i++) {
                // Do any of those PROJECTS.items match the last one we opened?
                if (PROJECTS[i].key === CONFIGS.lastProject) {
                    openProject(PROJECTS[i]);
                    break;
                }
            }
        }
        // If we don't have a project to lad?
        else {
            openProject(null);
        }
    });

    /*** GENERAL SYNTHEA LISTENERS ***/

    ipcMain.on('add-media-to-project', addMediaToProject);

    ipcMain.on('create-project', openProjectCreator);

    ipcMain.on('get-project-media', getProjectMedia);

    ipcMain.on('save-project', saveProject);

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
        if (a.name < b.name) {
            return -1;
          }
          if (a.name > b.name) {
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
        click: function() {

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
    });

    return output;
}

function openProject(proj) {
    // Check the config for a documentRoot, which is all we need
    // Or null, to clear out any projects
    if (proj.documentRoot || proj===null) {
        mainWindow.webContents.send('open-project',proj);
    }
    else {
        console.error('No project documentRoot, unable to process',proj);
    }

    // Remember that we opened this!
    if (proj.key && !proj.location && proj.key !== CONFIGS.lastProject) {
        CONFIGS.lastProject = proj.key;
        saveConfig();
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

function saveConfig() {
    console.info("Saving configuration", CONFIGS)
    fs.writeFile(CONFIG_PATH,JSON.stringify(CONFIGS), function(err) {
        console.error(err);
    });
}

function saveProject(evt, project) {
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

    fs.writeFile(CONFIGS.projectFolder+'/'+project.key+'/layout.json',
        JSON.stringify(project,null,2));

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