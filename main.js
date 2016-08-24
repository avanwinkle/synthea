const electron = require('electron');
const fs = require('fs');
// Module to control application life.
const app = electron.app;
const dialog = require('electron').dialog;
const {Menu, MenuItem} = electron;
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow;
const VERSION = require('./package.json').version;

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

const DEBUG_MODE = true;

function createMenus() {

    var projectNames = [];
    var projs = fs.readdirSync('./Projects');


    function parseConfig(line,attr) {

        // What value are we looking for?
        attr = attr || 'name';

        if (!line) { return; }

        var l = line.split(':');

        if (l[0] === attr) {
            return l[1];
        }
    }

    for(var i=0;i<projs.length;i++) {

        if (projs[i][0] === '.') {
            continue;
        }

        var f = fs.readFileSync(
            './Projects/'+projs[i]+'/Config.txt',
            { encoding:'UTF-8'}
        );
        f = f.replace('\r','\n');
        f = f.split('\n');

        for (var k=0;k<f.length;k++) {
            // Call parse on each line
            var parse = parseConfig(f[k].trim());
            if (parse) {
                // If that parse returned, we found it and can stop looking
                projectNames.push({
                    label: parse,
                    path: projs[i],
                    click: openProject,
                });
                break;
            }
        }
    }

    // Sort it!
    projectNames.sort(function(a,b) {
        if (a.label < b.label) {
            return -1;
          }
          if (a.label > b.label) {
            return 1;
          }

          // names must be equal
          return 0;
    });


    const template = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'Open Project',
                    // role: 'open',
                    submenu: projectNames,
                },
                { type: 'separator',},
                {
                    label: 'Save Project',
                    role: 'save',
                },
                {
                    label: 'Save Project As...',
                    role: 'saveAs',
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

  // Create our menus
  createMenus();

  // OSX Icon
  app.dock.setIcon(
    electron.nativeImage.createFromPath('./assets/synthea_icon_cropped.png'));

  // Tray Icon (Untested)
  // const appIcon = new electron.Tray('./assets/synthea_icon_cropped.png');

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });

}

function openProject(proj, browserWindow, event) {
    mainWindow.webContents.send('open-project',proj.path);
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
