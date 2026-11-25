const path = require('path');

module.exports = {
  logger: require('../helpers/logger'),
  errorHandler: require('../errors/handler'),
  audit: require('../errors/audit'),
  loadCommands: require('../loaders/commands'),
  loadEvents: require('../loaders/events'),
  loadComponents: require('../loaders/components'),
  loadBlueprints: require('../loaders/blueprints'),
  loadPlugins: require('../loaders/plugins'),
  loadTasks: require('../loaders/tasks'),
  database: require('../middleground/database'),
};