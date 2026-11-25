const path = require('path');
const fs = require('fs');

module.exports = {
  handle: (cmd, folderName, proc, baseDir) => {
    const raw = String(cmd || '').trim();
    const clean = raw.replace(/^\//, '');
    const parts = clean.split(/\s+/);
    const command = (parts[0] || '').toLowerCase();

    if (!command) {
      return { type: 'system', action: 'noop' };
    }

    if (command === 'clear' || command === 'cls') {
      return { type: 'system', action: 'clear' };
    }

    if (command === 'help') {
      const helpText = [
        '=== Discord Bot Studio Console Commands ===',
        '  help                     - Show this command list',
        '  clear                    - Clear the console output',
        '  status / stats           - Show live bot ping, uptime, RAM, and servers',
        '  servers                  - List all Discord servers the bot is in',
        '  say <channelId> <msg>    - Send a message as the bot to a channel',
        '  dm <userId> <msg>        - Send a Direct Message as the bot to a user',
        '  deploy / reload          - Re-sync & reload slash/prefix commands',
        '  restart                  - Restart the active bot process',
        '  stop                     - Stop the active bot process',
        '  update                   - Update bot base files from Base/ and restart'
      ].join('\n');
      return { type: 'system', action: 'log', output: helpText };
    }

    if (command === 'restart') {
      return { type: 'system', action: 'restart' };
    }

    if (command === 'stop') {
      return { type: 'system', action: 'stop' };
    }

    if (command === 'update') {
      try {
        const rootDir = baseDir || path.join(__dirname, '..', '..');
        const botDir = path.join(rootDir, 'Projects', folderName);
        const srcIndex = path.join(rootDir, 'Base', 'index.js');
        const srcRes = path.join(rootDir, 'Base', 'resources');
        if (fs.existsSync(srcIndex)) fs.copyFileSync(srcIndex, path.join(botDir, 'index.js'));
        if (fs.existsSync(srcRes)) fs.cpSync(srcRes, path.join(botDir, 'resources'), { recursive: true });
        return {
          type: 'system',
          action: 'restart',
          output: '[Studio] Updated bot base files from Base/ and restarting...'
        };
      } catch (e) {
        return { type: 'system', action: 'error', output: `[Studio Error] Update failed: ${e.message}` };
      }
    }

    if (proc && proc.stdin) {
      proc.stdin.write(clean + '\n');
      return { type: 'proxy', command: clean };
    }

    return {
      type: 'system',
      action: 'error',
      output: '[Console] Bot is offline. Start the bot first or type "help" / "clear".'
    };
  }
};
