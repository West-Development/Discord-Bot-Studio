const path = require('path');

module.exports = {
  root: __dirname,
  commands: path.join(__dirname, 'commands'),
  events: path.join(__dirname, 'events'),
  logs: path.join(__dirname, 'logs'),
  config: path.join(__dirname, 'config'),
  resources: path.join(__dirname, 'resources')
};  
