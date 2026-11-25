const { ipcMain, dialog, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

function setupCommandsIpc(baseDir) {
  ipcMain.handle('get-action-definitions', async () => {
    try {
      const actionsPath = path.join(baseDir, 'Base', 'resources', 'blueprints', 'actions.js');
      delete require.cache[require.resolve(actionsPath)];
      const defs = require(actionsPath);
      return Array.isArray(defs) ? defs : [];
    } catch (e) {
      console.error('Failed to load action definitions:', e);
      return [];
    }
  });

  ipcMain.handle('get-commands', async (event, folderName) => {
    try {
      const dataPath = path.join(baseDir, 'Projects', folderName, 'data', 'commands.json');
      if (fs.existsSync(dataPath)) {
        const parsed = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        return Array.isArray(parsed) ? parsed : Object.values(parsed);
      }
      return [];
    } catch (e) {
      return [];
    }
  });

  ipcMain.handle('save-commands', async (event, { folderName, commands }) => {
    try {
      const cmdArray = Array.isArray(commands) ? commands : Object.values(commands || {});
      const dataDir = path.join(baseDir, 'Projects', folderName, 'data');
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
      fs.writeFileSync(path.join(dataDir, 'commands.json'), JSON.stringify(cmdArray, null, 2));

      // Compile commands to standalone JS files
      const compilerPath = path.join(baseDir, 'Base', 'resources', 'blueprints', 'compiler.js');
      if (fs.existsSync(compilerPath)) {
        delete require.cache[require.resolve(compilerPath)];
        const { compileCommandToJS } = require(compilerPath);
        const cmdsDir = path.join(baseDir, 'Projects', folderName, 'commands');
        if (!fs.existsSync(cmdsDir)) fs.mkdirSync(cmdsDir, { recursive: true });

        // Clean old generated files so deleted/renamed commands don't linger
        const keepFiles = new Set();
        for (const cmdData of cmdArray) {
          const safeName = (cmdData.name || 'unnamed').replace(/[^a-zA-Z0-9_-]/g, '_');
          const fileName = `${safeName}.js`;
          keepFiles.add(fileName);
          const code = compileCommandToJS(cmdData);
          fs.writeFileSync(path.join(cmdsDir, fileName), code);
        }

        for (const existingFile of fs.readdirSync(cmdsDir)) {
          if (existingFile.endsWith('.js') && !keepFiles.has(existingFile)) {
            fs.unlinkSync(path.join(cmdsDir, existingFile));
          }
        }
      }

      return { success: true };
    } catch (e) {
      console.error('Failed to save/compile commands:', e);
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('export-command', async (event, cmdObj) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: 'Export Command Blueprint',
      defaultPath: `${(cmdObj?.name || 'command').replace(/[^a-zA-Z0-9_-]/g, '_')}.json`,
      filters: [{ name: 'DBM Command JSON', extensions: ['json'] }]
    });
    if (canceled || !filePath) return { success: false, canceled: true };
    fs.writeFileSync(filePath, JSON.stringify(cmdObj, null, 2));
    return { success: true, filePath };
  });

  ipcMain.handle('import-command', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      title: 'Import Command Blueprint',
      properties: ['openFile'],
      filters: [{ name: 'DBM Command JSON', extensions: ['json'] }]
    });
    if (canceled || !filePaths || !filePaths.length) return { success: false, canceled: true };
    try {
      const parsed = JSON.parse(fs.readFileSync(filePaths[0], 'utf8'));
      if (!parsed || !Array.isArray(parsed.actions)) throw new Error('Invalid blueprint format');
      return { success: true, command: parsed };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
}

module.exports = { setupCommandsIpc };