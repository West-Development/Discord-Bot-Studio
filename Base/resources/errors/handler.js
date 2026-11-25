const logger = require('../helpers/logger');
const i18n = require('../helpers/i18n');

module.exports = {
  handleError: (err, origin = 'Unknown') => {
    logger.error(`[ErrorHandler] [${origin}] ${err.stack || err.message || err}`);
  }
};
