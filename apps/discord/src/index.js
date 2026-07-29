import cron from 'node-cron';
import { Client, Events, GatewayIntentBits } from 'discord.js';
import { DatabaseService } from '@repo/database';
import { GmailService } from '@repo/email';
import { closeBrowser } from '@repo/scraper';
import { Logger } from '@repo/shared';
import { cronSchedule, cronTimezone, discordBotToken, runOnStartup } from './config.js';
import { deployCommandsToDiscord, handleInteraction } from './commands/index.js';
import { runPipelineAndPost } from './utils.js';

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

const services = {
  gmailService: new GmailService(),
  dbService: new DatabaseService()
};

await deployCommandsToDiscord();

client.once(Events.ClientReady, (c) => {
  Logger.success(`Ready! Logged in as ${c.user.tag}`);

  if (runOnStartup) {
    Logger.info('[DiscordBot] Running initial pipeline on startup...');
    runPipelineAndPost(client, services);
  }

  cron.schedule(cronSchedule, () => runPipelineAndPost(client, services), {
    timezone: cronTimezone
  });
});

client.on(Events.InteractionCreate, (interaction) => handleInteraction(interaction, services));

async function shutdown(signal) {
  Logger.info(`[DiscordBot] ${signal} received, shutting down...`);
  try {
    await closeBrowser();
    await client.destroy();
  } catch (error) {
    Logger.error('[DiscordBot] Error during shutdown:', error);
  } finally {
    process.exit(0);
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

client.login(discordBotToken);
