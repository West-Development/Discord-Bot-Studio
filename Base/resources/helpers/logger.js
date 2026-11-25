const fs = require('fs');
const path = require('path');
const paths = require('../../paths.config');

const logFile = path.join(paths.logs, 'boot.log');

// Ensure logs directory exists
if (!fs.existsSync(paths.logs)) {
  fs.mkdirSync(paths.logs, { recursive: true });
}

// Overwrite logs/boot.log fresh on each start
fs.writeFileSync(logFile, `=== Boot Started at ${new Date().toISOString()} ===\n`, 'utf8');

const logger = {
  info: (msg) => {
    const output = `[INFO] ${new Date().toISOString()}: ${msg}\n`;
    console.log(msg);
    fs.appendFileSync(logFile, output, 'utf8');
  },
  error: (msg) => {
    const output = `[ERROR] ${new Date().toISOString()}: ${msg}\n`;
    console.error(msg);
    fs.appendFileSync(logFile, output, 'utf8');
  },
  warn: (msg) => {
    const output = `[WARN] ${new Date().toISOString()}: ${msg}\n`;
    console.warn(msg);
    fs.appendFileSync(logFile, output, 'utf8');
  }
};

module.exports = logger;
