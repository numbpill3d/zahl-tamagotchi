const { app, BrowserWindow, ipcMain, screen, Notification, globalShortcut } = require('electron');
const { execFile } = require('child_process');
const Store = require('electron-store');

const store = new Store();
let mainWindow;
let desktopMode = false;

const WIN_W = 170;
const WIN_H = 375;
const WIN_TITLE = 'ZAHL';

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
    title: WIN_TITLE,
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

  mainWindow.webContents.once('did-finish-load', () => {
    applyDesktopMode(store.get('desktopMode', false), true);
  });
}

// "Desktop mode" sits the window below every normal window, like a
// desktop icon or conky widget, instead of always-on-top. Electron can't
// flip a BrowserWindow's native `type` after creation, so this drives the
// EWMH _NET_WM_STATE_BELOW hint directly via wmctrl (XWayland window,
// works under sway the same as any X11 WM).
function applyDesktopMode(enabled, isInitial) {
  desktopMode = enabled;
  store.set('desktopMode', enabled);
  if (!mainWindow) return;

  mainWindow.setAlwaysOnTop(!enabled, 'normal');
  mainWindow.setSkipTaskbar(enabled);

  if (process.platform === 'linux') {
    const action = enabled ? 'add,below' : 'remove,below';
    execFile('wmctrl', ['-F', '-r', WIN_TITLE, '-b', action], () => { /* best effort */ });
  }

  mainWindow.webContents.send('desktop-mode-changed', desktopMode);

  if (!isInitial && Notification.isSupported()) {
    new Notification({
      title: 'Zahl',
      body: desktopMode ? 'Desktop mode on — sitting behind other windows.' : 'Desktop mode off — back on top.',
      silent: true,
    }).show();
  }
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

ipcMain.on('toggle-desktop-mode', () => {
  applyDesktopMode(!desktopMode, false);
});

ipcMain.on('get-desktop-mode', (event) => {
  event.returnValue = desktopMode;
});

app.whenReady().then(() => {
  createWindow();
  // A window sitting BELOW everything can end up unreliable to click
  // through (confirmed: xdotool clicks stopped reaching it once
  // _NET_WM_STATE_BELOW was set, even though the wmctrl hint itself
  // works fine). This guarantees a way back regardless of stacking.
  globalShortcut.register('Control+Alt+D', () => {
    applyDesktopMode(!desktopMode, false);
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
