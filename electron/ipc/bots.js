const { ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function setupBotIpc(baseDir) {
  // Clean up any leftover locked folders from previous deletes on startup
  const trashDir = path.join(baseDir, '.trash');
  if (fs.existsSync(trashDir)) {
    try {
      fs.rmSync(trashDir, { recursive: true, force: true });
    } catch (_) {}
  }

  ipcMain.handle('export-bot', async (event, { folderName, stripToken }) => {
    const win = require('electron').BrowserWindow.fromWebContents(event.sender);
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: 'Export Bot Package',
      defaultPath: `${folderName}.zip`,
      filters: [{ name: 'DBM Bot Package', extensions: ['zip'] }]
    });
    if (canceled || !filePath) return { success: false, canceled: true };

    const stageDir = path.join(baseDir, 'temp_stage_' + Date.now());
    fs.mkdirSync(stageDir, { recursive: true });

    const sourceDir = path.join(baseDir, 'Projects', folderName);
    const targetDir = path.join(stageDir, folderName);
    
    // Simple recursive copy/filter
    const copyRecursive = (src, dest) => {
      fs.mkdirSync(dest, { recursive: true });
      for (const entry of fs.readdirSync(src)) {
        if (entry === 'node_modules') continue;
        const srcPath = path.join(src, entry);
        const destPath = path.join(dest, entry);
        if (fs.lstatSync(srcPath).isDirectory()) {
          copyRecursive(srcPath, destPath);
        } else {
          let content = fs.readFileSync(srcPath, 'utf8');
          if (stripToken && entry === 'bot.js' && srcPath.includes('config')) {
             content = content.replace(/token:\s*["'][^"']*["']/g, 'token: ""');
          }
          fs.writeFileSync(destPath, content);
        }
      }
    };
    copyRecursive(sourceDir, targetDir);

    try {
      execSync(`powershell -NoProfile -Command "Compress-Archive -Path '${targetDir}\\*' -DestinationPath '${filePath}' -Force"`);
      return { success: true, filePath };
    } catch (e) {
      return { success: false, error: e.message };
    } finally {
      fs.rmSync(stageDir, { recursive: true, force: true });
    }
  });

  ipcMain.handle('import-bot', async (event) => {
    const win = require('electron').BrowserWindow.fromWebContents(event.sender);
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      title: 'Import Bot Package',
      properties: ['openFile'],
      filters: [{ name: 'DBM Bot Package', extensions: ['zip'] }]
    });
    if (canceled || !filePaths || filePaths.length === 0) return { success: false, canceled: true };

    const zipPath = filePaths[0];
    const projectName = path.basename(zipPath, '.zip');
    let finalFolder = projectName;
    if (fs.existsSync(path.join(baseDir, 'Projects', finalFolder))) {
        finalFolder += `_${Date.now().toString().slice(-4)}`;
    }
    const destDir = path.join(baseDir, 'Projects', finalFolder);
    fs.mkdirSync(destDir, { recursive: true });

    try {
        execSync(`powershell -NoProfile -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${destDir}' -Force"`);
        if (!fs.existsSync(path.join(destDir, 'project.json'))) {
            fs.writeFileSync(path.join(destDir, 'project.json'), JSON.stringify({ name: finalFolder }, null, 2));
        }
        return { success: true, folderName: finalFolder };
    } catch (e) {
        return { success: false, error: e.message };
    }
  });

  ipcMain.handle('get-bots', async () => {
    try {
      const projectsDir = path.join(baseDir, 'Projects');
      if (!fs.existsSync(projectsDir)) fs.mkdirSync(projectsDir, { recursive: true });
      const entries = fs.readdirSync(projectsDir, { withFileTypes: true });
      const bots = {};
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const cfgPath = path.join(projectsDir, entry.name, 'project.json');
          if (fs.existsSync(cfgPath)) {
            try {
              const data = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
              bots[entry.name] = data;
            } catch (e) {
              bots[entry.name] = { name: entry.name };
            }
          }
        }
      }
      return bots;
    } catch (e) {
      return {};
    }
  });

  ipcMain.handle('create-bot', async (event, payload) => {
    try {
      const { name, description, iconBase64, iconExt } = payload;
      const folderName = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const targetDir = path.join(baseDir, 'Projects', folderName);
      const baseBlueprint = path.join(baseDir, 'Base');

      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
        const copyRecursive = (src, dest) => {
          if (!fs.existsSync(src)) return;
          const stats = fs.statSync(src);
          if (stats.isDirectory()) {
            if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
            fs.readdirSync(src).forEach((child) =>
              copyRecursive(path.join(src, child), path.join(dest, child))
            );
          } else {
            fs.copyFileSync(src, dest);
          }
        };
        copyRecursive(baseBlueprint, targetDir);
      }

      let iconPath = null;
      if (iconBase64 && iconExt) {
        const uploadsDir = path.join(targetDir, 'public', 'assets');
        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
        const cleanExt = iconExt.startsWith('.') ? iconExt : `.${iconExt}`;
        iconPath = `public/assets/icon_${Date.now()}${cleanExt}`;
        fs.writeFileSync(path.join(targetDir, iconPath), Buffer.from(iconBase64, 'base64'));
      }

      const projectJson = {
        name,
        description: description || '',
        icon: iconPath || '🤖',
        createdAt: new Date().toISOString()
      };
      fs.writeFileSync(path.join(targetDir, 'project.json'), JSON.stringify(projectJson, null, 2));
      return { success: true, folderName };
    } catch (e) {
      console.error('Failed to create bot:', e);
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('delete-bot', async (event, folderName) => {
    try {
      const targetDir = path.join(baseDir, 'Projects', folderName);
      if (!fs.existsSync(targetDir)) return { success: true };

      // 1. Stop bot process if running
      try {
        const { runningBots } = require('./process.js');
        if (runningBots && runningBots.has(folderName)) {
          runningBots.get(folderName).kill();
          runningBots.delete(folderName);
        }
      } catch (_) {}

      // 2. Clear cached Node requires inside that bot folder
      Object.keys(require.cache).forEach((key) => {
        if (key.toLowerCase().startsWith(targetDir.toLowerCase())) {
          delete require.cache[key];
        }
      });

      // 3. Disable Electron ASAR wrapper & delete contents
      const prevNoAsar = process.noAsar;
      process.noAsar = true;
      try {
        const modulesPath = path.join(targetDir, 'node_modules');
        if (fs.existsSync(modulesPath)) {
          try {
            fs.unlinkSync(modulesPath);
          } catch (_) {
            fs.rmSync(modulesPath, { recursive: true, force: true });
          }
        }
        fs.rmSync(targetDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
      } catch (_) {
        // Windows Error 32: Another app (IDE/Explorer) has its CWD inside targetDir.
        // Move the empty folder out of Projects/ into .trash so it disappears immediately.
        if (fs.existsSync(targetDir)) {
          if (!fs.existsSync(trashDir)) fs.mkdirSync(trashDir, { recursive: true });
          const trashTarget = path.join(trashDir, `${folderName}_${Date.now()}`);
          fs.renameSync(targetDir, trashTarget);
          try {
            fs.rmSync(trashTarget, { recursive: true, force: true });
          } catch (_) {}
        }
      } finally {
        process.noAsar = prevNoAsar;
      }

      return { success: true };
    } catch (e) {
      console.error('Delete bot error:', e);
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('get-bot-config', async (event, folderName) => {
    try {
      const cfgPath = path.join(baseDir, 'Projects', folderName, 'config', 'bot.js');
      if (fs.existsSync(cfgPath)) {
        delete require.cache[require.resolve(cfgPath)];
        const loaded = require(cfgPath);
        return {
          token: loaded.token || '',
          clientId: loaded.clientId || '',
          clientSecret: loaded.clientSecret || '',
          guildId: loaded.guildId || '',
          database: {
            enabled: Boolean(loaded.database?.enabled),
            type: loaded.database?.type || 'json',
            host: loaded.database?.host || 'localhost',
            port: loaded.database?.port || 3306,
            name: loaded.database?.name || '',
            user: loaded.database?.user || '',
            password: loaded.database?.password || '',
            uri: loaded.database?.uri || ''
          }
        };
      }
      return { guildId: '', database: { enabled: false, type: 'json' } };
    } catch (e) {
      return {};
    }
  });

  ipcMain.handle('save-bot-config', async (event, { folderName, config }) => {
    try {
      const cfgPath = path.join(baseDir, 'Projects', folderName, 'config', 'bot.js');
      let existing = {};
      if (fs.existsSync(cfgPath)) {
        try {
          delete require.cache[require.resolve(cfgPath)];
          existing = require(cfgPath) || {};
        } catch (_) {}
      }
      const merged = {
        token: config.token !== undefined ? config.token : (existing.token || ''),
        clientId: config.clientId !== undefined ? config.clientId : (existing.clientId || ''),
        clientSecret: config.clientSecret !== undefined ? config.clientSecret : (existing.clientSecret || ''),
        guildId: config.guildId !== undefined ? config.guildId : (existing.guildId || ''),
        database: config.database !== undefined ? config.database : (existing.database || {
          enabled: false,
          type: 'json',
          host: 'localhost',
          port: 3306,
          name: '',
          user: '',
          password: '',
          uri: ''
        })
      };
      const content = `module.exports = ${JSON.stringify(merged, null, 2)};\n`;
      fs.writeFileSync(cfgPath, content, 'utf8');
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('update-bot-profile', async (event, { folderName, name, description, iconBase64, iconExt }) => {
    try {
      let currentFolder = folderName;
      let targetDir = path.join(baseDir, 'Projects', currentFolder);
      if (!fs.existsSync(targetDir)) {
        return { success: false, error: 'Bot folder not found' };
      }

      const projPath = path.join(targetDir, 'project.json');
      let existing = { name: currentFolder, description: '', icon: '🤖' };
      if (fs.existsSync(projPath)) {
        try {
          existing = JSON.parse(fs.readFileSync(projPath, 'utf8'));
        } catch (_) {}
      }

      const desiredName = (name || existing.name || currentFolder).trim();
      const sanitizedFolder = desiredName.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/^_+|_+$/g, '') || currentFolder;

      // Rename the bot directory on disk if the sanitized folder name changed
      if (sanitizedFolder !== currentFolder) {
        let newFolderName = sanitizedFolder;
        let newDir = path.join(baseDir, 'Projects', newFolderName);
        if (fs.existsSync(newDir) && newDir.toLowerCase() !== targetDir.toLowerCase()) {
          newFolderName = `${sanitizedFolder}_${Date.now().toString().slice(-4)}`;
          newDir = path.join(baseDir, 'Projects', newFolderName);
        }

        // Stop any running bot process first so Windows doesn't lock the folder
        try {
          const { stopAllRunningBots } = require('./process.js');
          if (typeof stopAllRunningBots === 'function') stopAllRunningBots();
        } catch (_) {}

        // Clear cached requires inside the old folder path
        Object.keys(require.cache).forEach((key) => {
          if (key.toLowerCase().startsWith(targetDir.toLowerCase())) {
            delete require.cache[key];
          }
        });

        fs.renameSync(targetDir, newDir);
        currentFolder = newFolderName;
        targetDir = newDir;
      }

      let iconPath = existing.icon || '🤖';
      let fullSavedIconPath = null;
      if (iconBase64 && iconExt) {
        const uploadsDir = path.join(targetDir, 'public', 'assets');
        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
        const cleanExt = iconExt.startsWith('.') ? iconExt : `.${iconExt}`;
        iconPath = `public/assets/icon_${Date.now()}${cleanExt}`;
        fullSavedIconPath = path.join(targetDir, iconPath);
        fs.writeFileSync(fullSavedIconPath, Buffer.from(iconBase64, 'base64'));
      }

      const updated = {
        ...existing,
        name: desiredName,
        description: description !== undefined ? description : (existing.description || ''),
        icon: iconPath,
        updatedAt: new Date().toISOString()
      };
      fs.writeFileSync(path.join(targetDir, 'project.json'), JSON.stringify(updated, null, 2), 'utf8');

      return {
        success: true,
        newFolderName: currentFolder,
        profile: updated,
        fullIconPath: fullSavedIconPath || (iconPath && iconPath !== '🤖' ? path.join(targetDir, iconPath) : null)
      };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  ipcMain.handle('update-bot-from-base', async (event, folderName) => {
    try {
      const baseDir = path.join(__dirname, '../../Base');
      const targetDir = path.join(__dirname, '../../Projects', folderName);

      if (global.runningBots && global.runningBots[folderName]) {
        global.runningBots[folderName].kill();
        delete global.runningBots[folderName];
      }

      const logs = [];
      const skip = new Set(['node_modules', 'project.json', 'config/bot.js', 'commands', 'data', 'public/assets']);

      const copyRecursive = (src, dest) => {
        if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
        for (const file of fs.readdirSync(src)) {
          const srcPath = path.join(src, file);
          const relPath = path.relative(baseDir, srcPath).replace(/\\/g, '/');

          if (skip.has(relPath) || relPath.startsWith('commands/') || relPath.startsWith('data/') || relPath.startsWith('public/assets/')) {
            logs.push(`[Update] Preserved (User Data): ${relPath}`);
            continue;
          }

          if (fs.lstatSync(srcPath).isDirectory()) {
            copyRecursive(srcPath, path.join(dest, file));
          } else {
            fs.copyFileSync(srcPath, path.join(dest, file));
            logs.push(`[Update] Copied/Updated: ${relPath}`);
          }
        }
      };

      copyRecursive(baseDir, targetDir);
      logs.push(`[Update] Finished! ${logs.filter(l => l.includes('Copied/Updated')).length} file(s) updated.`);

      const fullLog = logs.join('\n') + '\n';
      event.sender.send('bot-log', { folderName, log: fullLog });

      return { success: true, logs };
    } catch (e) {
      console.error(e);
      return { success: false, error: e.message };
    }
  });
}

module.exports = { setupBotIpc };
