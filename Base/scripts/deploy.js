const { REST, Routes, Client, GatewayIntentBits } = require('discord.js');
const config = require('../config/bot.js');
const fs = require('fs');
const path = require('path');

async function deployCommands() {
  const commands = [];
  const commandsPath = path.join(__dirname, '../commands');
  if (!fs.existsSync(commandsPath)) return;

  const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));

  for (const file of commandFiles) {
    const fullPath = path.join(commandsPath, file);
    delete require.cache[require.resolve(fullPath)];
    const command = require(fullPath);

    // Only register slash commands (skip prefix-only commands)
    if (command.type !== 'prefix' && 'data' in command && 'execute' in command) {
      commands.push(typeof command.data.toJSON === 'function' ? command.data.toJSON() : command.data);
    }
  }

  const rest = new REST({ version: '10' }).setToken(config.token);

  try {
    console.log('[Deploy] Clearing old global commands...');
    await rest.put(Routes.applicationCommands(config.clientId), { body: [] });

    // Fetch all guilds the bot is in so guild commands are wiped & updated even if guildId is blank
    const tempClient = new Client({ intents: [GatewayIntentBits.Guilds] });
    await tempClient.login(config.token);
    const guilds = await tempClient.guilds.fetch();

    for (const [guildId] of guilds) {
      await rest.put(Routes.applicationGuildCommands(config.clientId, guildId), { body: [] });
      if (commands.length > 0) {
        await rest.put(Routes.applicationGuildCommands(config.clientId, guildId), { body: commands });
      }
    }

    tempClient.destroy();
    console.log(`[Deploy] Cleared old duplicates and registered ${commands.length} slash command(s) across ${guilds.size} server(s)! (Press Ctrl+R in Discord if cached)`);
  } catch (error) {
    console.error('[Deploy Error]:', error);
  }
}

if (require.main === module) {
  deployCommands();
}

module.exports = { deployCommands };
