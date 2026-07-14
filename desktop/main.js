const { app, BrowserWindow, ipcMain, screen } = require('electron');
const Store = require('electron-store');

const store = new Store();
let mainWindow;

const WIN_W = 340;
const WIN_H = 750;

function createWindow() {
  const bounds = store.get('windowBounds');
  const display = screen.getPrimaryDisplay();
  const defaultX = display.workArea.x + display.workArea.width - WIN_W - 40;
  const defaultY = display.workArea.y + 40;

  mainWindow = new BrowserWindow({
    width: WIN_W,
    height: WIN_H,
    x: bounds ? bounds.x : defaultX,
    y: bounds ? bounds.y : defaultY,
    frame: false,
    transparent: true,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadFile('index.html');

  mainWindow.on('moved', () => {
    store.set('windowBounds', mainWindow.getBounds());
  });
}

ipcMain.on('load-save', (event) => {
  event.returnValue = store.get('zahlState', null);
});

ipcMain.on('save-state', (event, zahlState) => {
  store.set('zahlState', zahlState);
});

ipcMain.on('quit-app', () => {
  app.quit();
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
