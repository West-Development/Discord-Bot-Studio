const logger = require('./logger');

module.exports = {
  auditAction: (action, details) => {
    logger.info(`[Audit] Action: ${action} | Details: ${JSON.stringify(details)}`);
  }
};
