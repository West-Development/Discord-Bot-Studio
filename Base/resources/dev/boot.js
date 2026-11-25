const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();
const paths = require('../../paths.config');
const botConfig = require(path.join(paths.config, 'bot.js'));
const logger = require(path.join(paths.helpers, 'logger'));
const errorHandler = require(path.join(paths.errors, 'handler'));
const database = require(path.join(paths.middleground, 'database'));

// Loaders
const loadCommands = require(path.join(paths.loaders, 'commands'));
const loadEvents = require(path.join(paths.loaders, 'events'));
const loadComponents = require(path.join(paths.loaders, 'components'));
const loadBlueprints = require(path.join(paths.loaders, 'blueprints'));
const loadPlugins = require(path.join(paths.loaders, 'plugins'));
const loadTasks = require(path.join(paths.loaders, 'tasks'));

async function start() {
  logger.info('Starting Discord bot boot sequence...');

  // Initialize Database
  await database.init();

  // Load modules
  if (typeof loadCommands === 'function') loadCommands();
  if (typeof loadEvents === 'function') loadEvents();
  if (typeof loadComponents === 'function') loadComponents();
  if (typeof loadBlueprints === 'function') loadBlueprints();
  if (typeof loadPlugins === 'function') loadPlugins();
  if (typeof loadTasks === 'function') loadTasks();

  const client = new Client({
    intents: botConfig.intents || [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  client.on('error', (err) => errorHandler.handleError(err, 'DiscordClient'));
  process.on('unhandledRejection', (err) => errorHandler.handleError(err, 'UnhandledRejection'));
  process.on('uncaughtException', (err) => errorHandler.handleError(err, 'UncaughtException'));

  client.once('clientReady', () => {
    logger.info(`Logged in as ${client.user.tag}!`);
  });

  if (!process.env.DISCORD_TOKEN) {
    logger.error('DISCORD_TOKEN is missing in environment variables (.env)!');
  } else {
    await client.login(process.env.DISCORD_TOKEN);
  }

  return client;
}

module.exports = start;
