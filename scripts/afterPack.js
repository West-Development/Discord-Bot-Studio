const fs = require('fs');
const path = require('path');

exports.default = async function (context) {
  const srcBase = path.join(context.packager.projectDir, 'Base');
  const destBase = path.join(context.appOutDir, 'resources', 'app', 'Base');

  if (fs.existsSync(srcBase)) {
    fs.rmSync(destBase, { recursive: true, force: true });
    fs.cpSync(srcBase, destBase, { recursive: true, force: true });
    console.log('  • afterPack: Copied complete Base/ folder (including node_modules & subfolders)');
  }
};
