const fs = require('fs');
const path = require('path');

module.exports = (bot) => {
    const blueprintsPath = path.join(__dirname, '../blueprints');
    if (!fs.existsSync(blueprintsPath)) return;
    // Blueprints are generally loaded by the compiler or specific commands
    // This loader can be used to pre-load any dynamic blueprint data
};