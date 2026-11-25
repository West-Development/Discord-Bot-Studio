const { ipcMain, dialog, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

function setupEventsIpc(baseDir) {
  const rootDir = baseDir || path.join(__dirname, '..', '..');

  function getProjectPaths(folderName) {
    return {
      dataPath: path.join(rootDir, 'Projects', folderName, 'data'),
      eventsPath: path.join(rootDir, 'Projects', folderName, 'events')
    };
  }

  ipcMain.handle('get-event-definitions', async () => {
    try {
      const eventsDefPath = path.join(rootDir, 'Base', 'resources', 'blueprints', 'events.js');
      delete require.cache[require.resolve(eventsDefPath)];
      const events = require(eventsDefPath);
      return Array.isArray(events) ? events : [];
    } catch (e) {
      console.error('Failed to load event definitions:', e);
      return [];
    }
  });

  ipcMain.handle('get-events', async (event, folderName) => {
    try {
      const { dataPath } = getProjectPaths(folderName);
      const eventsFile = path.join(dataPath, 'events.json');
      if (!fs.existsSync(eventsFile)) return [];
      const parsed = JSON.parse(fs.readFileSync(eventsFile, 'utf8'));
      return Array.isArray(parsed) ? parsed : Object.values(parsed || {});
    } catch (e) {
      return [];
    }
  });

  ipcMain.handle('save-events', async (event, arg1, arg2) => {
    try {
      const folderName = typeof arg1 === 'object' ? arg1.folderName : arg1;
      const events = Array.isArray(arg2) ? arg2 : (arg1?.events || []);

      const { dataPath, eventsPath } = getProjectPaths(folderName);
      if (!fs.existsSync(dataPath)) fs.mkdirSync(dataPath, { recursive: true });
      if (!fs.existsSync(eventsPath)) fs.mkdirSync(eventsPath, { recursive: true });

      const compilerPath = path.join(rootDir, 'Base', 'resources', 'blueprints', 'compiler.js');
      delete require.cache[require.resolve(compilerPath)];
      const { compileEventToJS } = require(compilerPath);

      const activeFiles = new Set();
      for (const evt of events) {
        const safeName = (evt.name || 'unnamed_event').replace(/[^a-zA-Z0-9_-]/g, '_');
        const fileName = `${safeName}.js`;
        activeFiles.add(fileName);
        if (typeof compileEventToJS === 'function') {
          const jsCode = compileEventToJS(evt);
          fs.writeFileSync(path.join(eventsPath, fileName), jsCode, 'utf8');
        }
      }

      for (const f of fs.readdirSync(eventsPath).filter((f) => f.endsWith('.js'))) {
        if (!activeFiles.has(f)) {
          fs.unlinkSync(path.join(eventsPath, f));
        }
      }

      fs.writeFileSync(path.join(dataPath, 'events.json'), JSON.stringify(events, null, 2), 'utf8');
      return { success: true };
    } catch (e) {
      console.error('Failed to save/compile events:', e);
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('export-event', async (event, evtObj) => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender);
      const defaultName = `${(evtObj?.name || 'event').replace(/[^a-zA-Z0-9_-]/g, '_')}.json`;
      const { canceled, filePath } = await dialog.showSaveDialog(win, {
        title: 'Export Event Blueprint',
        defaultPath: defaultName,
        filters: [{ name: 'DBM Event Blueprint', extensions: ['json'] }]
      });
      if (canceled || !filePath) return { success: false, canceled: true };

      fs.writeFileSync(filePath, JSON.stringify(evtObj, null, 2), 'utf8');
      return { success: true, filePath };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('import-event', async (event) => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender);
      const { canceled, filePaths } = await dialog.showOpenDialog(win, {
        title: 'Import Event Blueprint',
        properties: ['openFile'],
        filters: [{ name: 'DBM Event Blueprint', extensions: ['json'] }]
      });
      if (canceled || !filePaths || !filePaths.length) return { success: false, canceled: true };

      const raw = fs.readFileSync(filePaths[0], 'utf8');
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.actions)) {
        return { success: false, error: 'Invalid event blueprint JSON (missing actions array).' };
      }
      return { success: true, event: parsed };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
}

module.exports = { setupEventsIpc };
