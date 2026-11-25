const fs = require('fs');
const path = require('path');

module.exports = (bot) => {
    const componentsPath = path.join(__dirname, '../components');
    const walk = (dir) => {
        let results = [];
        const list = fs.readdirSync(dir);
        list.forEach(file => {
            file = path.join(dir, file);
            const stat = fs.statSync(file);
            if (stat && stat.isDirectory()) results = results.concat(walk(file));
            else if (file.endsWith('.js')) results.push(file);
        });
        return results;
    };
    
    if (!fs.existsSync(componentsPath)) return;
    const components = walk(componentsPath);
    for (const compPath of components) {
        const component = require(compPath);
        // Assuming components register themselves or exported an init
        if (component.init) component.init(bot);
    }
};