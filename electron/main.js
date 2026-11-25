const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const { setupBotIpc } = require('./ipc/bots');
const { setupProcessIpc, stopAllRunningBots } = require('./ipc/process');
const { setupCommandsIpc } = require('./ipc/commands');
const { setupEventsIpc } = require('./ipc/events');

let mainWindow;

function createWindow() {
  Menu.setApplicationMenu(null);

  mainWindow = new BrowserWindow({
    width: 1300,
    height: 800,
    backgroundColor: '#222224',
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'icon.png'),
    frame: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.maximize();
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  ipcMain.removeAllListeners('win-minimize');
  ipcMain.removeAllListeners('win-maximize');
  ipcMain.removeAllListeners('win-close');

  ipcMain.on('win-minimize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.minimize();
  });
  ipcMain.on('win-maximize', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  });
  ipcMain.on('win-close', () => {
    stopAllRunningBots();
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.close();
  });

  mainWindow.on('close', () => {
    stopAllRunningBots();
  });
}

app.whenReady().then(() => {
  const { nativeTheme } = require('electron');
  nativeTheme.themeSource = 'dark';
  const baseDir = path.join(__dirname, '..');
  setupBotIpc(baseDir);
  setupProcessIpc(baseDir, mainWindow);
  setupCommandsIpc(baseDir);
  setupEventsIpc(baseDir);

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', () => {
  try { stopAllRunningBots(); } catch (_) {}
});

app.on('will-quit', () => {
  try { stopAllRunningBots(); } catch (_) {}
});

process.on('exit', () => {
  try { stopAllRunningBots(); } catch (_) {}
});

app.on('window-all-closed', () => {
  try { stopAllRunningBots(); } catch (_) {}
  if (process.platform !== 'darwin') app.quit();
});
