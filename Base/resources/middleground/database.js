const fs = require('fs');
const path = require('path');
const paths = require('../../paths.config');

function resolveDbPath() {
    return path.join(paths.root, 'data', 'database.json');
}

function load() {
    const f = resolveDbPath();
    try {
        if (!fs.existsSync(f)) return {};
        const raw = fs.readFileSync(f, 'utf8');
        return JSON.parse(raw || '{}');
    } catch (e) { return {}; }
}

function save(data) {
    const f = resolveDbPath();
    const dir = path.dirname(f);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(f, JSON.stringify(data, null, 2), 'utf8');
}

function get(table, key, defaultValue) {
    const data = load();
    return (data[table] && Object.prototype.hasOwnProperty.call(data[table], key)) ? data[table][key] : (defaultValue ?? null);
}

function set(table, key, value, mode) {
    const data = load();
    if (!data[table]) data[table] = {};
    if (mode === 'add_number') {
        data[table][key] = (parseFloat(data[table][key]) || 0) + (parseFloat(value) || 0);
    } else if (mode === 'push_list') {
        const list = Array.isArray(data[table][key]) ? data[table][key] : [];
        list.push(value);
        data[table][key] = list;
    } else {
        data[table][key] = value;
    }
    save(data);
    return data[table][key];
}

function del(table, key) {
    const data = load();
    if (data[table] && Object.prototype.hasOwnProperty.call(data[table], key)) {
        delete data[table][key];
        save(data);
        return true;
    }
    return false;
}

async function query(sql, params = []) {
    try {
        const botCfgPath = path.join(paths.root, 'config', 'bot.js');
        delete require.cache[require.resolve(botCfgPath)];
        const botCfg = require(botCfgPath);
        const dbCfg = botCfg?.database || {};
        if (!dbCfg.enabled) return { success: false, rows: [], error: 'Database is disabled in settings.' };

        const dbType = String(dbCfg.type || 'json').toLowerCase();
        if (dbType === 'mysql') {
            const mysql = require('mysql2/promise');
            const conn = dbCfg.uri
                ? await mysql.createConnection(dbCfg.uri)
                : await mysql.createConnection({
                    host: dbCfg.host || '127.0.0.1',
                    port: Number(dbCfg.port) || 3306,
                    user: dbCfg.user || 'root',
                    password: dbCfg.password ? String(dbCfg.password) : '',
                    database: dbCfg.name || undefined
                });
            const [rows] = await conn.execute(sql, params);
            await conn.end();
            return { success: true, rows };
        } else if (dbType === 'postgresql') {
            const { Client: PgClient } = require('pg');
            const pg = dbCfg.uri
                ? new PgClient({ connectionString: dbCfg.uri })
                : new PgClient({
                    host: dbCfg.host || '127.0.0.1',
                    port: Number(dbCfg.port) || 5432,
                    user: dbCfg.user || 'postgres',
                    password: dbCfg.password ? String(dbCfg.password) : '',
                    database: dbCfg.name || undefined
                });
            await pg.connect();
            const res = await pg.query(sql, params);
            await pg.end();
            return { success: true, rows: res.rows };
        } else if (dbType === 'sqlite') {
            const Database = require('better-sqlite3');
            const db = new Database(dbCfg.sqlitePath || path.join(paths.root, 'data', 'database.sqlite'));
            const stmt = db.prepare(sql);
            const rows = /^\s*select/i.test(sql) ? stmt.all(...params) : [stmt.run(...params)];
            db.close();
            return { success: true, rows };
        }
        return { success: false, rows: [], error: `SQL queries are not supported on "${dbType}".` };
    } catch (err) {
        return { success: false, rows: [], error: err.message };
    }
}

module.exports = { get, set, delete: del, query, resolveDbPath };
