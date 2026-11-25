const { Client, GatewayIntentBits, Partials, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config/bot.js');

const client = new Client({
  partials: [Partials.GuildMember, Partials.User, Partials.Message, Partials.Channel],
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent
  ],
  sweepers: {
    messages: { interval: 3600, lifetime: 1800 }
  }
});

const slashCommands = new Map();
const prefixCommands = [];

client.once('clientReady', async () => {
  console.log(`Logged in as ${client.user.tag}!`);

  // Sync Bot Profile (Name, Description, Avatar) ONLY when changed + rename managed bot role
  try {
    const crypto = require('crypto');
    const projFile = path.join(__dirname, 'project.json');
    const cacheFile = path.join(__dirname, 'data', '.profile-cache.json');
    let lastSynced = {};
    if (fs.existsSync(cacheFile)) {
      try { lastSynced = JSON.parse(fs.readFileSync(cacheFile, 'utf8')); } catch (_) {}
    }

    if (fs.existsSync(projFile)) {
      const proj = JSON.parse(fs.readFileSync(projFile, 'utf8'));
      let cacheDirty = false;

      // 1. Only update username if it actually changed
      if (proj.name && proj.name !== lastSynced.name && client.user.username !== proj.name) {
        const ok = await client.user.setUsername(proj.name)
          .then(() => { console.log(`[Profile] Updated bot username to "${proj.name}"`); return true; })
          .catch((e) => { console.warn(`[Profile] Could not update bot username: ${e.message}`); return false; });
        if (ok) { lastSynced.name = proj.name; cacheDirty = true; }
      } else if (proj.name && client.user.username === proj.name && lastSynced.name !== proj.name) {
        lastSynced.name = proj.name;
        cacheDirty = true;
      }

      // 2. Only update avatar if the image file hash actually changed
      if (proj.icon && proj.icon !== '🤖') {
        const iconFullPath = path.join(__dirname, proj.icon);
        if (fs.existsSync(iconFullPath)) {
          const imgHash = crypto.createHash('sha256').update(fs.readFileSync(iconFullPath)).digest('hex');
          if (imgHash !== lastSynced.avatarHash) {
            const ok = await client.user.setAvatar(iconFullPath)
              .then(() => { console.log(`[Profile] Updated bot avatar from ${proj.icon}`); return true; })
              .catch((e) => { console.warn(`[Profile] Could not update bot avatar: ${e.message}`); return false; });
            if (ok) { lastSynced.avatarHash = imgHash; cacheDirty = true; }
          }
        }
      }

      // 3. Only update application description if it actually changed
      if (proj.description !== undefined && proj.description !== lastSynced.description && client.application) {
        await client.application.fetch().catch(() => null);
        if (client.application.description !== proj.description) {
          const ok = await client.application.edit({ description: proj.description })
            .then(() => { console.log(`[Profile] Updated bot description`); return true; })
            .catch((e) => { console.warn(`[Profile] Could not update bot description: ${e.message}`); return false; });
          if (ok) { lastSynced.description = proj.description; cacheDirty = true; }
        } else {
          lastSynced.description = proj.description;
          cacheDirty = true;
        }
      }

      if (cacheDirty) {
        if (!fs.existsSync(path.dirname(cacheFile))) fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
        fs.writeFileSync(cacheFile, JSON.stringify(lastSynced, null, 2), 'utf8');
      }
    }
  } catch (err) {
    console.warn('[Profile] Failed to sync profile from project.json:', err.message);
  }

  slashCommands.clear();
  prefixCommands.length = 0;

  const commandsPath = path.join(__dirname, 'commands');
  if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));
    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      delete require.cache[require.resolve(filePath)];
      const command = require(filePath);
      if (!command || typeof command.execute !== 'function') continue;

      if (command.type === 'prefix') {
        prefixCommands.push(command);
      } else if (command.data) {
        slashCommands.set(command.data.name, command);
      }
    }
  }

  try {
    const rest = new REST({ version: '10' }).setToken(config.token);
    const body = Array.from(slashCommands.values()).map((cmd) =>
      typeof cmd.data.toJSON === 'function' ? cmd.data.toJSON() : cmd.data
    );

    // 1. Always wipe old Global commands so duplicates never linger
    await rest.put(Routes.applicationCommands(config.clientId), { body: [] });

    // 2. Wipe old Guild commands on every server the bot is in, then register ONLY current slash commands
    const guilds = await client.guilds.fetch();
    for (const [guildId] of guilds) {
      await rest.put(Routes.applicationGuildCommands(config.clientId, guildId), { body: [] });
      if (body.length > 0) {
        await rest.put(Routes.applicationGuildCommands(config.clientId, guildId), { body });
      }
    }

    console.log(`[Deploy] Cleared all old commands and deployed ${body.length} slash command(s) + ${prefixCommands.length} prefix command(s)!`);
  } catch (error) {
    console.error('[Deploy Error] Failed to deploy commands:', error);
  }

  // Trigger startup sticky messages for any messageCreate events containing sticky_message
  const bootEventsPath = path.join(__dirname, 'events');
  if (fs.existsSync(bootEventsPath)) {
    for (const file of fs.readdirSync(bootEventsPath).filter((f) => f.endsWith('.js'))) {
      try {
        const evt = require(path.join(bootEventsPath, file));
        if (evt && evt.event === 'messageCreate' && typeof evt.execute === 'function') {
          await evt.execute(client, null, client);
        }
      } catch (_) {}
    }
  }
});

client.on('interactionCreate', async (interaction) => {
  // Handle Custom Button Panel Containers & Role Buttons
  if (interaction.isButton()) {
    if (client.__customButtons && client.__customButtons.has(interaction.customId)) {
      await client.__customButtons.get(interaction.customId)(interaction);
      client.emit('dbmButtonClick', interaction);
      return;
    }
    if (interaction.customId.startsWith('dbm_role_btn:')) {
      const roleId = interaction.customId.split(':')[1];
      const member = interaction.member;
      if (member && roleId) {
        const hasRole = member.roles.cache.has(roleId);
        try {
          if (hasRole) {
            await member.roles.remove(roleId);
            await interaction.reply({ content: `Removed <@&${roleId}>!`, ephemeral: true });
          } else {
            await member.roles.add(roleId);
            await interaction.reply({ content: `Added <@&${roleId}>!`, ephemeral: true });
          }
        } catch (err) {
          await interaction.reply({ content: `Failed to update role (check bot role hierarchy).`, ephemeral: true }).catch(() => null);
        }
      }
    }
    client.emit('dbmButtonClick', interaction);
    return;
  }

  // Handle Role Dropdown Menus (dbm_role_select)
  if (interaction.isStringSelectMenu()) {
    if (interaction.customId === 'dbm_role_select' && interaction.member) {
      const added = [];
      const removed = [];
      for (const val of interaction.values) {
        const roleId = val.split(':')[0];
        if (!roleId) continue;
        try {
          if (interaction.member.roles.cache.has(roleId)) {
            await interaction.member.roles.remove(roleId);
            removed.push(`<@&${roleId}>`);
          } else {
            await interaction.member.roles.add(roleId);
            added.push(`<@&${roleId}>`);
          }
        } catch (_) {}
      }
      const parts = [];
      if (added.length) parts.push(`**Added:** ${added.join(', ')}`);
      if (removed.length) parts.push(`**Removed:** ${removed.join(', ')}`);
      await interaction.reply({ content: parts.join('\n') || 'Roles updated!', ephemeral: true }).catch(() => null);
    }
    client.emit('dbmDropdownSelect', interaction);
    return;
  }

  if (!interaction.isChatInputCommand()) return;

  const command = slashCommands.get(interaction.commandName);
  if (!command) return;

  // Automatically defer slash commands so database/API calls never exceed Discord's 3-second limit
  // (Skip deferring if the command opens a modal form)
  const cmdSrc = command.execute.toString();
  if (!cmdSrc.includes('showModal') && !interaction.deferred && !interaction.replied) {
    await interaction.deferReply().catch(() => null);
  }

  try {
    await command.execute({ interaction, client });
  } catch (error) {
    console.error(`Error executing /${interaction.commandName}:`, error);
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
      } else {
        await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
      }
    } catch (e) {
      console.error('Failed to send error response:', e);
    }
  }
});

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  for (const command of prefixCommands) {
    const prefix = command.prefix || '!';
    const trigger = command.name || command.triggerName;
    if (!trigger) continue;

    const fullTrigger = `${prefix}${trigger}`;
    if (message.content === fullTrigger || message.content.startsWith(`${fullTrigger} `)) {
      try {
        await command.execute({ message, client });
      } catch (error) {
        console.error(`Error executing ${fullTrigger}:`, error);
      }
      break;
    }
  }
});

// Load & bind all compiled event handlers from ./events/
const eventsPath = path.join(__dirname, 'events');
if (fs.existsSync(eventsPath)) {
  const eventFiles = fs.readdirSync(eventsPath).filter((f) => f.endsWith('.js'));
  let loadedEvents = 0;
  for (const file of eventFiles) {
    try {
      const fullPath = path.join(eventsPath, file);
      delete require.cache[require.resolve(fullPath)];
      const evt = require(fullPath);
      if (evt && evt.event && typeof evt.execute === 'function') {
        if (evt.event === 'ready') {
          client.once('clientReady', () => evt.execute(client, null, client));
        } else if (evt.event === 'guildBoost' || evt.event === 'guildBoostRemove') {
          client.on('guildMemberUpdate', (oldMember, newMember) => evt.execute(oldMember, newMember, client));
        } else if (evt.event === 'buttonClick') {
          client.on('dbmButtonClick', (inter) => evt.execute(inter, null, client));
        } else if (evt.event === 'dropdownSelect') {
          client.on('dbmDropdownSelect', (inter) => evt.execute(inter, null, client));
        } else {
          client.on(evt.event, (arg1, arg2) => evt.execute(arg1, arg2, client));
        }
        loadedEvents++;
      }
    } catch (err) {
      console.error(`Failed to load event ${file}:`, err);
    }
  }
  console.log(`[Events] Loaded ${loadedEvents} event(s)!`);
}

function ensureDriverInstalled(pkgName) {
  try {
    require.resolve(pkgName, { paths: [__dirname] });
  } catch (_) {
    console.log(`[Database] Installing missing driver "${pkgName}"... please wait.`);
    const { execSync } = require('child_process');
    execSync(`npm install ${pkgName} --no-audit --no-fund`, { cwd: __dirname, stdio: 'inherit' });
  }
}

async function verifyDatabaseConnection() {
  const dbCfg = config.database;
  if (!dbCfg || !dbCfg.enabled) return;

  const dbType = String(dbCfg.type || 'json').toLowerCase();
  try {
    if (dbType === 'json') {
      const dbMiddleware = require('./resources/middleground/database.js');
      dbMiddleware.get('_health', 'ping', 'ok');
      console.log('[Database] Connected successfully (Local JSON storage).');
    } else if (dbType === 'mysql') {
      ensureDriverInstalled('mysql2');
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
      await conn.ping();
      await conn.end();
      console.log(`[Database] Connected successfully to MySQL (${dbCfg.host || '127.0.0.1'}:${dbCfg.port || 3306}/${dbCfg.name || ''})!`);
    } else if (dbType === 'postgresql') {
      ensureDriverInstalled('pg');
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
      await pg.query('SELECT 1');
      await pg.end();
      console.log(`[Database] Connected successfully to PostgreSQL (${dbCfg.host || '127.0.0.1'}:${dbCfg.port || 5432}/${dbCfg.name || ''})!`);
    } else if (dbType === 'sqlite') {
      ensureDriverInstalled('better-sqlite3');
      const Database = require('better-sqlite3');
      const dbFile = dbCfg.sqlitePath || path.join(__dirname, 'data', 'database.sqlite');
      if (!fs.existsSync(path.dirname(dbFile))) fs.mkdirSync(path.dirname(dbFile), { recursive: true });
      const db = new Database(dbFile);
      db.prepare('SELECT 1').get();
      db.close();
      console.log('[Database] Connected successfully to SQLite!');
    } else if (dbType === 'mongodb') {
      ensureDriverInstalled('mongodb');
      const { MongoClient } = require('mongodb');
      const uri = dbCfg.uri || `mongodb://${dbCfg.user ? `${encodeURIComponent(dbCfg.user)}:${encodeURIComponent(dbCfg.password || '')}@` : ''}${dbCfg.host || '127.0.0.1'}:${dbCfg.port || 27017}/${dbCfg.name || ''}`;
      const mongo = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
      await mongo.connect();
      await mongo.db(dbCfg.name || undefined).command({ ping: 1 });
      await mongo.close();
      console.log('[Database] Connected successfully to MongoDB!');
    }
  } catch (err) {
    console.error(`[Database Error] Failed to connect to ${dbType.toUpperCase()}: ${err.message}`);
  }
}

// Interactive Console Command Listener (stdin)
process.stdin.setEncoding('utf8');
process.stdin.on('data', async (chunk) => {
  const lines = String(chunk).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    const clean = line.replace(/^\//, '');
    const parts = clean.split(/\s+/);
    const cmd = (parts[0] || '').toLowerCase();

    try {
      if (cmd === 'status' || cmd === 'stats' || cmd === 'ping') {
        const s = Math.floor((client.uptime || 0) / 1000);
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const mem = (process.memoryUsage().rss / 1024 / 1024).toFixed(1);
        console.log(`[Status] Tag: ${client.user?.tag || 'Offline'} | Ping: ${Math.round(client.ws?.ping ?? 0)}ms | Uptime: ${h}h ${m}m ${s % 60}s | RAM: ${mem} MB | Servers: ${client.guilds.cache.size}`);
      } else if (cmd === 'servers' || cmd === 'guilds') {
        const list = client.guilds.cache.map((g) => `• ${g.name} (${g.id}) — ${g.memberCount} members`).join('\n');
        console.log(`[Servers (${client.guilds.cache.size})]\n${list || 'None'}`);
      } else if (cmd === 'say') {
        const chId = parts[1];
        const msg = parts.slice(2).join(' ');
        if (!chId || !msg) {
          console.log('[Console] Usage: say <channelId> <message>');
          continue;
        }
        const ch = client.channels.cache.get(chId) || await client.channels.fetch(chId).catch(() => null);
        if (ch && ch.send) {
          await ch.send(msg);
          console.log(`[Console] Sent message to #${ch.name || chId}`);
        } else {
          console.log(`[Console Error] Channel "${chId}" not found.`);
        }
      } else if (cmd === 'dm') {
        const uId = parts[1];
        const msg = parts.slice(2).join(' ');
        if (!uId || !msg) {
          console.log('[Console] Usage: dm <userId> <message>');
          continue;
        }
        const usr = await client.users.fetch(uId).catch(() => null);
        if (usr) {
          await usr.send(msg);
          console.log(`[Console] Sent DM to ${usr.tag}`);
        } else {
          console.log(`[Console Error] User "${uId}" not found.`);
        }
      } else if (cmd === 'reload' || cmd === 'deploy') {
        slashCommands.clear();
        prefixCommands.length = 0;
        const cPath = path.join(__dirname, 'commands');
        if (fs.existsSync(cPath)) {
          for (const f of fs.readdirSync(cPath).filter((x) => x.endsWith('.js'))) {
            const fp = path.join(cPath, f);
            delete require.cache[require.resolve(fp)];
            const c = require(fp);
            if (!c || typeof c.execute !== 'function') continue;
            if (c.type === 'prefix') prefixCommands.push(c);
            else if (c.data) slashCommands.set(c.data.name, c);
          }
        }
        const rest = new REST({ version: '10' }).setToken(config.token);
        const body = Array.from(slashCommands.values()).map((c) => (typeof c.data.toJSON === 'function' ? c.data.toJSON() : c.data));
        const guilds = await client.guilds.fetch();
        for (const [gid] of guilds) {
          await rest.put(Routes.applicationGuildCommands(config.clientId, gid), { body });
        }
        console.log(`[Reload] Reloaded & deployed ${body.length} slash command(s) + ${prefixCommands.length} prefix command(s)!`);
      } else {
        console.log(`[Console] Unknown command "${cmd}". Type "help" to see available console commands.`);
      }
    } catch (err) {
      console.error(`[Console Error] ${err.message}`);
    }
  }
});

(async () => {
  await verifyDatabaseConnection();
  client.login(config.token).catch((err) => {
    console.error('Failed to login:', err);
  });
})();
