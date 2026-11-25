const Database = require('better-sqlite3');
const path = require('path');
const paths = require('../../../paths.config');
const fs = require('fs');

let db = null;

module.exports = {
  connect: () => {
    if (db) return db;
    if (!fs.existsSync(paths.database)) {
      fs.mkdirSync(paths.database, { recursive: true });
    }
    const dbPath = path.join(paths.database, 'database.sqlite');
    db = new Database(dbPath);
    
    // Run schema if exists
    const schemaPath = path.join(paths.database, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf8');
      if (schema.trim()) {
        db.exec(schema);
      }
    }
    return db;
  },
  getInstance: () => db
};
