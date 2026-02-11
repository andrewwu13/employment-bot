import 'dotenv/config.js';
import cron from "node-cron";
import { Client, Events, GatewayIntentBits } from 'discord.js';
import { REST, Routes } from 'discord.js';
import { DatabaseService } from '../backend/services/DatabaseService.js';
import { Logger } from '../backend/utils/logger.js';
import { createJobEmbedFromDB } from './utils/createEmbed.js';

// Initialize backend services
const dbService = new DatabaseService();

const commands = [
  {
    name: 'ping',
    description: 'Replies with Pong!',
  },
  {
    name: 'jobs',
    description: 'Show pending jobs from database'
  },
  {
    name: 'post',
    description: 'Post pending jobs to this channel'
  }
];

// set up discord bot client
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

// setting up command server
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
try {
  Logger.info('Started refreshing application (/) commands.');

  await rest.put(
    Routes.applicationGuildCommands(process.env.APPLICATION_ID, process.env.GUILD_ID),
    { body: commands }
  );

  Logger.success('Successfully reloaded application (/) commands.');
} catch (error) {
  Logger.error(error);
}

// set up client and cron job
client.once(Events.ClientReady, (c) => {
  Logger.success(`Ready! Logged in as ${c.user.tag}`);

  // Cron job - Post pending jobs from database every 59 seconds
  cron.schedule("*/59 * * * * *", async () => {
    const now = new Date();
    Logger.info(`[DiscordBot] Running job posting every 59 seconds | ${now.toISOString()}`);

    try {
      await postPendingJobs();
      Logger.success(`[DiscordBot] Job posting complete`);
    } catch (error) {
      Logger.error("[DiscordBot] Error in job posting:", error);
    }
  }, {
    timezone: "America/Toronto"
  });
});

// set up channel (either testing or production)
const discordChannelID = process.env.DEV_MODE == "false" ? process.env.JOB_CHANNEL_ID : process.env.JOB_CHANNEL_ID // to be replaced with the dev channel

// Function to post pending jobs from database to Discord
async function postPendingJobs() {
  try {
    // Get pending jobs from database
    const pendingJobs = await dbService.getPendingJobs(10);

    if (!pendingJobs.length) {
      Logger.info("[DiscordBot] No pending jobs to post.");
      return;
    }

    Logger.info(`[DiscordBot] Found ${pendingJobs.length} pending jobs to post`);

    // Claim all jobs by marking as 'posting' BEFORE sending to Discord
    // This prevents other cron runs or /post commands from picking them up
    const jobIds = pendingJobs.map(job => job.id);
    await dbService.markJobsAsPosting(jobIds);
    Logger.info(`[DiscordBot] Claimed ${jobIds.length} jobs as 'posting'`);

    // Specifying which channel to post to. 
    const channel = await client.channels.fetch(discordChannelID);

    // Post each job as an embed
    for (let i = 0; i < pendingJobs.length; i++) {
      const job = pendingJobs[i];

      try {
        // Create Discord embed from job data
        const embed = createJobEmbedFromDB(job);
        await channel.send({ embeds: [embed] });

        // Mark as posted in database
        await dbService.markJobAsPosted(job.id);
        Logger.success(`[DiscordBot] Posted job ${i + 1}/${pendingJobs.length}: ${job.title} at ${job.company}`);
      } catch (postError) {
        // If posting fails, revert this job back to pending so it can be retried
        Logger.error(`[DiscordBot] Failed to post job ${job.id}, reverting to pending:`, postError);
        await dbService.markJobAsFailed(job.id);
      }

      // Small delay to avoid rate limiting
      if (i < pendingJobs.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return pendingJobs.length;
  } catch (error) {
    Logger.error("[DiscordBot] Error posting jobs:", error);
    throw error;
  }
}



// Command handlers
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  if (commandName === 'ping') {
    await interaction.reply('Pong!');
  }
  else if (commandName === 'jobs') {
    try {
      await interaction.deferReply();

      // Fetch pending jobs from database
      const pendingJobs = await dbService.getPendingJobs(5);

      if (!pendingJobs.length) {
        await interaction.editReply("No pending jobs in the database.");
        return;
      }

      // Create embeds for jobs
      const embeds = pendingJobs.map(job => createJobEmbedFromDB(job));

      await interaction.editReply({
        content: `Found ${pendingJobs.length} pending job(s):`,
        embeds: embeds.slice(0, 10) // Discord limit
      });
    } catch (err) {
      Logger.error(err);
      await interaction.editReply("Failed to fetch jobs from database. Check logs.");
    }
  }
  else if (commandName === 'post') {
    try {
      await interaction.deferReply();

      // Post pending jobs to current channel
      const channel = interaction.channel;
      const pendingJobs = await dbService.getPendingJobs(5);

      if (!pendingJobs.length) {
        await interaction.editReply("No pending jobs to post.");
        return;
      }

      // Claim jobs first to prevent duplicates
      const jobIds = pendingJobs.map(job => job.id);
      await dbService.markJobsAsPosting(jobIds);

      let posted = 0;
      for (const job of pendingJobs) {
        try {
          const embed = createJobEmbedFromDB(job);
          await channel.send({ embeds: [embed] });
          await dbService.markJobAsPosted(job.id);
          posted++;
        } catch (postError) {
          Logger.error(`[DiscordBot] Failed to post job ${job.id}, reverting:`, postError);
          await dbService.markJobAsFailed(job.id);
        }
      }

      await interaction.editReply(`✅ Posted ${posted} job(s) to this channel!`);
    } catch (err) {
      Logger.error(err);
      await interaction.editReply("Failed to post jobs. Check logs.");
    }
  }
});

client.login(process.env.TOKEN);
