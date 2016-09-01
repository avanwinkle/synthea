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
// Keep a global list of available projects
let PROJECTS;

const DEBUG_MODE = false;

function createMenus() {

    var projectNames = [];

    for (var i=0;i<PROJECTS.length;i++) {
        projectNames.push(PROJECTS[i]);
    }

    // Add a link to open the folder
    projectNames.push({ type: 'separator'});
    projectNames.push({
        label: 'Go to Projects Folder',
        click: function() {
            electron.shell.showItemInFolder(CONFIGS.projectFolder);
        },
    });
    projectNames.push({
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
    projectNames.push({ type: 'separator' });
    projectNames.push({
        label: 'Browse Cloud Projects...',
        click: function() {
            let child = new BrowserWindow({
                // parent: mainWindow,
                modal: true,
                show: false
            });

            let url = require('url').format({
              protocol: 'file',
              slashes: true,
              pathname: require('path').join(__dirname, 'loader.html')
            });

            child.loadURL(url);
            child.once('ready-to-show', () => {
              child.show();
              // if (DEBUG_MODE) { child.webContents.openDevTools(); }


              ipcMain.once('open-project', function(evt,projectDef) {
                openProject(projectDef);
                child.close();
              });
            });
        }
    });


    const template = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'New Project',
                    role: 'new',
                    enabled: false,
                },
                {
                    label: 'Open Project...',
                    role: 'open',
                },
                { type: 'separator',},
                {
                    label: 'Save Project',
                    role: 'save',
                    enabled: false,
                },
                {
                    label: 'Save Project As...',
                    role: 'saveAs',
                    enabled: false,
                }
            ]
        },
        {
            label: 'Projects',
            submenu: projectNames,
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
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);

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
  mainWindow.loadURL(`file://${__dirname}/index.html`);

  // Open the DevTools.
  if (DEBUG_MODE) { mainWindow.webContents.openDevTools(); }


  // OSX Icon
  app.dock.setIcon(
    electron.nativeImage.createFromPath('./assets/synthea_icon.png'));

  // Tray Icon (Untested)
  // const appIcon = new electron.Tray('./assets/synthea_icon.png');

  initializeSynthea(app);


  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });

}

function initializeSynthea() {

    // Does a config file exist?
    try {
        fs.statSync(CONFIG_PATH);
        CONFIGS = JSON.parse(fs.readFileSync(CONFIG_PATH));
    }
    catch(err) {

        var defaultFolder = app.getPath('userData')+'/Projects';

        // Make the folder, if need be
        try {
            fs.accessSync(defaultFolder);
        }
        catch(err) {
            fs.mkdirSync(defaultFolder);
        }

        // Make a default
        CONFIGS = {
            projectFolder: defaultFolder,
        };
        // Save it
        saveConfig();
    }

    // Lookup our available projects
    lookupProjects();

    // Create our menus
    createMenus();

    // If we have a last-used project, open that by default
    mainWindow.webContents.once('did-finish-load', function() {
        // Now that the menus are built, let's try opening our last project
        if (CONFIGS.lastProject) {
            console.log("looking for last project")
            for (var i=0;i<PROJECTS.length;i++) {
                console.log(PROJECTS[i])
                if (PROJECTS[i].key === CONFIGS.lastProject) {
                    openProject(PROJECTS[i]);
                    break;
                }
            }
        }
    });

}

function lookupProjects() {

    // Already done?
    if (PROJECTS) { return PROJECTS; }

    var projs = fs.readdirSync(CONFIGS.projectFolder);
    var output = [];

    for(var i=0;i<projs.length;i++) {

        if (projs[i][0] === '.') {
            continue;
        }

        var f;

        // Look for a layout file
        try {
            f = fs.readFileSync(
                CONFIGS.projectFolder+'/'+projs[i]+'/layout',
                { encoding:'UTF-8'}
            );

            var pconfig = JSON.parse(f);

            output.push({
                // Common attributes for all project definitions
                key: projs[i],
                name: pconfig.name,
                documentRoot: CONFIGS.projectFolder + '/' + projs[i],
                // Special attributes for the OS menu
                click: openProject,
                label: pconfig.name,
            });
        }

        catch(err) {
            continue;
        }


    }

    // Sort it!
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

    // Do the binding here so there'se no async risk
    PROJECTS = output;
    return PROJECTS;

}

function openProject(proj) {
    // New config
    if (proj.documentRoot) {
        mainWindow.webContents.send('open-project',proj);
    }
    else {
        console.error('No known project format');
    }

    // Remember that we opened this!
    if (proj.key && !proj.location && proj.key !== CONFIGS.lastProject) {
        CONFIGS.lastProject = proj.key;
        saveConfig();
    }
}

function saveConfig() {
    console.info("Saving configuration", CONFIGS)
    fs.writeFile(CONFIG_PATH,JSON.stringify(CONFIGS), function(err) {
        console.error(err);
    });
}

function toggleDJMode() {
    // Tell the main window to go DJ
    mainWindow.webContents.send('toggle-dj',Menu);
    /*
    // Toggle the checkmark on the menu
    var menu = Menu.getApplicationMenu();

    // Find it!
    for (var i=0;i<menu.items.length;i++) {
        console.log(menu.items[i]);
        // WARNING: This reduces the flexibility of where we can put the menu
        if (menu.items[i].label==='Extras') {
            var submenu = menu.items[i].submenu;
            for (var k=0;k<submenu.items.length;k++) {
                if (submenu.items[k].label === 'DJ Mode') {
                    // submenu.items[k].checked = !submenu.items[k].checked;
                    break;
                }
            }
            break;
        }
    }
    */

}

// app.setName('Butts');

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