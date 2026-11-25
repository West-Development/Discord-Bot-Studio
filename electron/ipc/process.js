const { ipcMain, BrowserWindow } = require('electron');
const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

let runningBots = {};

function killProcessTree(child) {
  if (!child || !child.pid) return;
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /PID ${child.pid} /T /F`, { stdio: 'ignore', windowsHide: true });
    } else {
      child.kill('SIGKILL');
    }
  } catch (_) {
    try {
      child.kill('SIGKILL');
    } catch (__) {}
  }
}

function stopAllRunningBots() {
  for (const key of Object.keys(runningBots)) {
    killProcessTree(runningBots[key]);
    delete runningBots[key];
  }
  if (process.platform === 'win32') {
    try {
      execSync(`wmic process where "name='node.exe' and commandline like '%index.js%'" call terminate`, {
        stdio: 'ignore',
        windowsHide: true
      });
    } catch (_) {}
  }
}

function getTargetWindow(mainWindow) {
  if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
    return mainWindow;
  }
  const allWindows = BrowserWindow.getAllWindows();
  if (allWindows.length > 0) {
    return allWindows[0];
  }
  return null;
}

function setupProcessIpc(baseDir, mainWindow) {
  ipcMain.handle('start-bot', async (event, folderName) => {
    // Always stop any other running bots first so only 1 bot runs in the background
    stopAllRunningBots();

    const botDir = path.join(baseDir, 'Projects', folderName);
    if (!fs.existsSync(botDir)) {
      return { success: false, error: 'Bot directory not found' };
    }

    try {
      const child = spawn('node', ['index.js'], {
        cwd: botDir,
        shell: true,
        env: { ...process.env, FORCE_COLOR: '1' }
      });

      runningBots[folderName] = child;

      child.stdout.on('data', (data) => {
        const win = getTargetWindow(mainWindow);
        if (win && win.webContents) {
          win.webContents.send('bot-log', { folderName, type: 'stdout', data: data.toString() });
        }
      });

      child.stderr.on('data', (data) => {
        const win = getTargetWindow(mainWindow);
        if (win && win.webContents) {
          win.webContents.send('bot-log', { folderName, type: 'stderr', data: data.toString() });
        }
      });

      child.on('close', (code) => {
        if (runningBots[folderName] === child) {
          delete runningBots[folderName];
        }
        const win = getTargetWindow(mainWindow);
        if (win && win.webContents) {
          win.webContents.send('bot-stopped', { folderName, code });
        }
      });

      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('stop-bot', async (event, folderName) => {
    const child = runningBots[folderName];
    if (child) {
      killProcessTree(child);
      delete runningBots[folderName];
    }
    return { success: true };
  });

  ipcMain.handle('console-command', async (event, { folderName, command }) => {
    const raw = String(command || '').trim();
    const clean = raw.replace(/^\//, '');
    const parts = clean.split(/\s+/);
    const cmdName = (parts[0] || '').toLowerCase();
    const win = getTargetWindow(mainWindow);

    if (cmdName === 'clear' || cmdName === 'cls') {
      return { success: true, action: 'clear' };
    }

    if (cmdName === 'help') {
      const helpText = [
        '=== Discord Bot Studio Console Commands ===',
        '  help                     - Show this command list',
        '  clear                    - Clear the console output',
        '  status / stats           - Show live bot ping, uptime, RAM, and servers',
        '  servers                  - List all Discord servers the bot is in',
        '  say <channelId> <msg>    - Send a message as the bot to a channel',
        '  dm <userId> <msg>        - Send a Direct Message as the bot to a user',
        '  deploy                   - Re-sync slash commands with Discord',
        '  reload                   - Hot-reload commands & events without restarting',
        '  restart                  - Restart the active bot process',
        '  stop                     - Stop the active bot process',
        '  update                   - Update bot base files from Base/ and restart'
      ].join('\n');
      if (win && win.webContents) {
        win.webContents.send('bot-log', { folderName, type: 'stdout', data: helpText + '\n' });
      }
      return { success: true };
    }

    if (cmdName === 'update') {
      try {
        const botDir = path.join(baseDir, 'Projects', folderName);
        const srcIndex = path.join(baseDir, 'Base', 'index.js');
        const srcRes = path.join(baseDir, 'Base', 'resources');
        if (fs.existsSync(srcIndex)) fs.copyFileSync(srcIndex, path.join(botDir, 'index.js'));
        if (fs.existsSync(srcRes)) fs.cpSync(srcRes, path.join(botDir, 'resources'), { recursive: true });
        if (win && win.webContents) {
          win.webContents.send('bot-log', { folderName, type: 'stdout', data: '[Studio] Updated bot base files from Base/!\n' });
        }
        return { success: true, action: 'restart' };
      } catch (e) {
        return { success: false, error: e.message };
      }
    }

    if (cmdName === 'restart') {
      return { success: true, action: 'restart' };
    }

    if (cmdName === 'stop') {
      const child = runningBots[folderName];
      if (child) {
        killProcessTree(child);
        delete runningBots[folderName];
      }
      return { success: true, action: 'stop' };
    }

    const child = runningBots[folderName];
    if (child && child.stdin) {
      child.stdin.write(clean + '\n');
      return { success: true };
    }
    return { success: false, error: 'Bot is offline. Start the bot first or type "help" / "clear".' };
  });
}

module.exports = { setupProcessIpc, stopAllRunningBots };
