const fs = require('fs');
const path = require('path');

module.exports = (bot) => {
    const tasksPath = path.join(__dirname, '../tasks');
    if (!fs.existsSync(tasksPath)) return;
    
    const files = fs.readdirSync(tasksPath).filter(file => file.endsWith('.js'));
    for (const file of files) {
        const task = require(path.join(tasksPath, file));
        if (task.run) task.run(bot);
    }
};