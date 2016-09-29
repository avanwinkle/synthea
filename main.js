const electron = require('electron');
const fs = require('fs');
// Modules within electron to control application life.
const {app, BrowserWindow, dialog, ipcMain, Menu, MenuItem, shell} = electron;

// All of our project and related code is separate, for cleanliness
const synthea = require('./synthea-app/synthea');
// And store our version number, why not?
const VERSION = require('./package.json').version;

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

// Keep our menu accessible, cause we iterate over it a bunch to enable/disable
let menu;

let DEBUG_MODE;
// Developers, wanna see what's going on? >> $ electron . --debug
DEBUG_MODE = process.argv.indexOf('--debug') !== -1;


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
        synthea.openProject(projectDef);
        child.close();
      });
    });
}

function createMenus() {

    // The standard menu templates. Most things are disabled, but placeholders
    // as reminders of what's yet to come!
    let template = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'New Project',
                    role: 'new',
                    click: openProjectCreator,
                },
                {
                    label: 'Open Project...',
                    role: 'open',
                    click: openProjectFromFolder,
                },
                {
                    label: 'Close Project',
                    click: synthea.closeProject,
                },
                { type: 'separator',},
                {
                    label: 'Edit Project',
                    role: 'edit',
                    enabled: false,
                    click: synthea.editProject,
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
                /*
                {
                    label: 'Save Project As...',
                    role: 'saveAs',
                    enabled: false,
                },
                */
                {   type: 'separator' },
                {
                    label: 'Delete Project',
                    enabled: false,
                    click: synthea.deleteProject,
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
                { type: 'separator'},
                {
                    label: 'Search Cues...',
                    accelerator: 'Tab',
                    click: function() {
                        mainWindow.webContents.send('playback','search');
                    }
                },
                {
                    label: 'Play All Queued',
                    accelerator: 'Space',
                    click: function() {
                        mainWindow.webContents.send('playback','playqueue');
                    }
                },
                {
                    label: 'Stop All',
                    accelerator: 'Backspace',
                    click: function() {
                        mainWindow.webContents.send('playback','stopall');
                    }
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

    // This menu position will vary depending on platform (see below)

    // OSX has the special application menu first, so populate that with about
    if (process.platform === 'darwin') {
        var aboutMenu = {
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
                    accelerator: 'Ctrl+Escape',
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
        };

        aboutMenu.label = 'synthea-webapp';
        template.unshift(aboutMenu);
    }
    // Otherwise, put the about menu at the end
    else {
        var advancedMenu = {
            label: 'Advanced',
            submenu: [

                {
                    label: 'Enable Debug Mode',
                    click: enableDebugMode,
                },
                {
                    label: 'Reset Audio Engine',
                    click: resetAudioEngine,
                    accelerator: 'Escape',
                },
            ]
        };

        // Add the about menu to the end of the menus
        template.push(advancedMenu);
        // But we want 'Quit' to be in the 'File' menu
        template[0].submenu.push({ type: 'separator' });
        template[0].submenu.push({ role: 'quit' });
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


function createWindow () {

  // Create the browser window.
  mainWindow = new BrowserWindow({
    backgroundColor: '#EEEEEE',
    height: 720,
    icon: './assets/synthea_flat.ico',
    title: 'Synthea ' + VERSION,
    width: 1080,
  });
  synthea.mainWindow = mainWindow;

  // and load the index.html of the app.
  // AVW: This must be in GRAVES, not APOSTROPHES
  mainWindow.loadURL(`file://${__dirname}/templates/index.html`);

  // Open the DevTools.
  if (DEBUG_MODE) { mainWindow.webContents.openDevTools(); }


  // OSX Icon
  if (app.dock) {
    app.dock.setIcon(
        electron.nativeImage.createFromPath('./assets/synthea_icon.png'));
  }
  // Tray Icon
  else if (process.platform === 'win32') {
    // const appIcon = new electron.Tray('./assets/synthea_icon.png');
  }

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


function enableDebugMode() {
    DEBUG_MODE = true;
    mainWindow.webContents.openDevTools();
}


function initializeSynthea() {

    synthea.init( app.getPath('userData') );

    // Create our menus
    createMenus();
    // Map our menu modification method so the synthea module can call it
    synthea.setMenusEnabled = setMenusEnabled;

    // If we have a last-used project, open that by default
    mainWindow.webContents.once('did-finish-load', function() {

        var foundLastProject = false;

        // Now that the menus are built, let's try opening our last project
        if (synthea.configs.lastProject) {
            // Hop over to the Projects menu
            for (var i=0;i<menu.items.length;i++) {
                if (menu.items[i].label==='Projects') {
                    // Iterate over the projects we found in our Projects folder
                    for (var k=0;k<menu.items[i].submenu.items.length;k++) {
                        var menuitem = menu.items[i].submenu.items[k];
                        if (menuitem.key === synthea.configs.lastProject) {
                            synthea.openProject(menuitem);
                            foundLastProject = true;
                            break;
                        }
                    }
                    break;
                }
            }
        }

        // If we don't have a project to load?
        if (!foundLastProject) {
            synthea.openProject(null);
        }
    });

    /*** GENERAL SYNTHEA LISTENERS ***/

    ipcMain.on('add-media-to-project', synthea.addMediaToProject);
    ipcMain.on('browse-cloud-projects', browseCloudProjects);
    ipcMain.on('delete-media', synthea.deleteMedia);
    ipcMain.on('get-project-media', synthea.getProjectMedia);
    ipcMain.on('save-project', synthea.saveProject);
    ipcMain.on('save-and-open-project', synthea.saveAndOpenProject);
    ipcMain.on('show-file', showFile);
    ipcMain.on('open-create-project', openProjectCreator);
    ipcMain.on('open-project-from-folder', openProjectFromFolder);
    ipcMain.on('open-weburl', openWeburl);
}

function openProjectCreator() {
    var modal = createModalWindow('creator');
    // If the loader window broadcasts a project, handle it
    ipcMain.once('create-project', function(evt,project) {
        synthea.createProject(project);
        modal.close();
    });
}

function openProjectFromFolder() {
    dialog.showOpenDialog({
        title: 'Open a Project',
        // After much usage, I've decided that this is more convenient than not
        defaultPath: synthea.configs.projectFolder,
        properties:['openDirectory']
    }, function(d) {
        // Does openDialog always return an array?
        if (!d || !d.length) { return; }

        synthea.openProject({documentRoot: d[0]});

    });
}

function openWeburl(evt,url) {
    // Make sure it's a url or a mailto
    if (!/^(https?:\/\/|mailto:)/.exec(url) ) { url = 'http://' + url; }
    shell.openExternal(url);
}

function renderProjectsMenu() {


    var projects = [];

    // Look through everything in the Projects folder to see if it's a project
    var projs = fs.readdirSync(synthea.configs.projectFolder);
    var output = [];

    for(var i=0;i<projs.length;i++) {

        // No hidden files, obvs
        if (projs[i][0] === '.') {
            continue;
        }


        // Look for a layout file
        try {
            var f = fs.readFileSync(
                synthea.configs.projectFolder+'/'+projs[i]+'/layout.json',
                { encoding:'UTF-8'}
            );

            var pconfig = JSON.parse(f);

            // Store that this is a project
            projects.push({
                key: projs[i],
                name: pconfig.name,
                documentRoot: synthea.configs.projectFolder + '/' + projs[i],
            });

            // Create a menu item
            output.push({
                // Common attributes for all project definitions
                key: projs[i],
                name: pconfig.name,
                // Special attributes for the OS menu
                documentRoot: synthea.configs.projectFolder + '/' + projs[i],
                click: synthea.openProject,
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
            electron.shell.showItemInFolder(synthea.configs.projectFolder);
        },
    });
    output.push({
        label: 'Change Projects Folder...',
        click: function() {
            dialog.showOpenDialog({properties:['openDirectory']}, function(d) {
                if (!d) { return; }

                synthea.configs.projectFolder = d[0];
                synthea.saveConfig();
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

function setMenusEnabled(arg) {
    // We can pass in a string for predefined menu states
    var menustate;
    switch(arg) {
        case 'close-project':
            menustate = {
                'Close Project': false,
                'Edit Project': false,
                'Save Project': false,
                'Save Project As...': false,
                'Delete Project': false,
                'DJ Mode': { checked: false, enabled: false},
            };
            break;
        case 'edit-project':
            menustate = {
                'Close Project': true,
                'Edit Project': false,
                'Save Project': true,
                'Save Project As...': true,
                'DJ Mode': { checked: false, enabled: false},
            };
            break;
        case 'open-project':
            menustate = {
                'Close Project': true,
                'Edit Project': true,
                'Save Project': false,
                'Save Project As...': true,
                'Delete Project': true,
                'DJ Mode': { enabled: true, checked: false, },
            };
            break;
        case 'cloud-project':
            menustate = {
                'Close Project': true,
                'Edit Project': false,
                'Save Project': false,
                'Save Project As': false,
                'Delete Project': false,
            };
            break;
        // By default, the arg is the object of the states
        default:
            console.log("Unknown menus arg", arg)
            menustate = {};
    }

    // Iterate through
    for (var i=0;i<menu.items.length;i++) {

        for (var k=0;k<menu.items[i].submenu.items.length;k++) {

            var item = menu.items[i].submenu.items[k];

            // If nothing? Skip the rest
            if (!menustate.hasOwnProperty(item.label)) { continue; }

            var state = menustate[item.label];
            // Do we have something to define?
            switch( typeof(state)) {
                case 'boolean':
                    item.enabled = state;
                    break;
                case 'object':
                    // Map all appropriate object attributes to the menu item
                    for (var j in state) {
                        if (item.hasOwnProperty(j)) {
                            item[j] = state[j];
                        }
                    }
                    break;
                default:
                    console.log('Unknown menu state', state);
            }
        }
    }
}

function showFile(evt, path) {
    console.log(path)
    electron.shell.showItemInFolder(path);
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