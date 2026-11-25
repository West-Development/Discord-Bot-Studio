const fs = require('fs');
const path = require('path');
const controller = require('../plugins/controller');

module.exports = (bot) => {
    const pluginsPath = path.join(__dirname, '../plugins');
    const files = fs.readdirSync(pluginsPath).filter(file => file.endsWith('.js') && file !== 'controller.js');
    
    for (const file of files) {
        const plugin = require(path.join(pluginsPath, file));
        if (plugin.init) plugin.init(bot, controller);
    }
};