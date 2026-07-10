import cron from 'node-cron';
import { Client, Events, GatewayIntentBits } from 'discord.js';
import { REST, Routes } from 'discord.js';
import { DatabaseService } from '@repo/database';
import { GmailService } from '@repo/email';
import { fetchPosting, closeBrowser } from '@repo/scraper';
import { classifyJob, Logger } from '@repo/shared';
import { createJobEmbedFromDB } from './embed.js';

const DEFAULT_SCRAPE_COOLDOWN = 1000;
const cooldown = parseInt(process.env.SCRAPE_COOLDOWN_MS, 10) || DEFAULT_SCRAPE_COOLDOWN;
const discordChannelID = process.env.JOB_CHANNEL_ID;

const gmailService = new GmailService();
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

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);
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

client.once(Events.ClientReady, (c) => {
  Logger.success(`Ready! Logged in as ${c.user.tag}`);

  if (process.env.RUN_ON_STARTUP !== 'false') {
    Logger.info('[DiscordBot] Running initial pipeline on startup...');
    runPipelineAndPost();
  }

  cron.schedule("*/20 * * * *", runPipelineAndPost, {
    timezone: "America/Toronto"
  });
});

async function runPipelineAndPost() {
  const now = new Date();
  Logger.info(`[DiscordBot] Starting scrape-and-post pipeline | ${now.toISOString()}`);

  try {
    const rawEmails = await fetchEmails();
    if (!rawEmails?.length) {
      Logger.info('[DiscordBot] No new emails found');
      return;
    }

    const jobs = parseJobsFromEmails(rawEmails);
    if (!jobs?.length) {
      Logger.info('[DiscordBot] No job postings found in emails');
      return;
    }

    const channel = await client.channels.fetch(discordChannelID);
    Logger.info(`[DiscordBot] Processing ${jobs.length} job(s) with ${cooldown}ms delay`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];
      Logger.info(`[DiscordBot] [${i + 1}/${jobs.length}] Processing: ${job.jobTitle} at ${job.companyName}`);

      try {
        Logger.info(`[DiscordBot] Scraping: ${job.applyLink}`);
        const scrapedData = await fetchPosting(job.applyLink);

        const { industry, country, remote, skillRoles } = classifyJob({
          title: job.jobTitle,
          skills: scrapedData.skills,
          location: scrapedData.location
        });

        const enrichedJob = {
          ...job,
          scrapedData,
          status: 'posting',
          createdAt: new Date(),
          postedAt: null,
          title: job.jobTitle,
          company: job.companyName,
          location: scrapedData.location,
          skills: scrapedData.skills,
          url: job.applyLink,
          industry,
          country,
          remote,
        };
        const docId = await dbService.write(enrichedJob);
        Logger.info(`[DiscordBot] Saved to DB: ${docId}`);

        const embed = createJobEmbedFromDB(enrichedJob);
        await channel.send({ embeds: [embed] });

        await dbService.markJobAsPosted(docId);
        Logger.success(`[DiscordBot] ✓ Posted ${job.jobTitle} at ${job.companyName}`);
        successCount++;

      } catch (error) {
        Logger.error(`[DiscordBot] ✗ Failed to process job ${job.jobTitle}:`, error.message);
        errorCount++;
      }

      if (i < jobs.length - 1) {
        await new Promise(resolve => setTimeout(resolve, cooldown));
      }
    }

    Logger.success(`[DiscordBot] Pipeline complete: ${successCount} posted, ${errorCount} failed`);

  } catch (error) {
    Logger.error('[DiscordBot] Pipeline error:', error);
  }
}

async function fetchEmails() {
  const recipient = 'no-reply@notify.careers';
  const rawEmails = await gmailService.fetchUnreadEmails(recipient);

  if (!rawEmails?.length) {
    Logger.info('[DiscordBot] No unread emails found');
    return null;
  }

  Logger.info(`[DiscordBot] Found ${rawEmails.length} unread emails`);
  return rawEmails;
}

function parseJobsFromEmails(rawEmails) {
  const allJobs = [];

  for (const email of rawEmails) {
    const jobs = email.jobs || [];
    for (const job of jobs) {
      allJobs.push({
        ...job,
        emailSubject: email.subject,
        emailDate: email.date,
        emailFrom: email.from
      });
    }
  }

  if (!allJobs.length) {
    return null;
  }

  Logger.info(`[DiscordBot] Extracted ${allJobs.length} job posting(s) from emails`);
  return allJobs;
}

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  if (commandName === 'ping') {
    await interaction.reply('Pong!');
  }
  else if (commandName === 'jobs') {
    try {
      await interaction.deferReply();

      const pendingJobs = await dbService.getPendingJobs(5);

      if (!pendingJobs.length) {
        await interaction.editReply("No pending jobs in the database.");
        return;
      }

      const embeds = pendingJobs.map(job => createJobEmbedFromDB(job));

      await interaction.editReply({
        content: `Found ${pendingJobs.length} pending job(s):`,
        embeds: embeds.slice(0, 10) // Discord caps embeds per message at 10
      });
    } catch (err) {
      Logger.error(err);
      await interaction.editReply("Failed to fetch jobs from database. Check logs.");
    }
  }
  else if (commandName === 'post') {
    try {
      await interaction.deferReply();

      const channel = interaction.channel;
      const pendingJobs = await dbService.getPendingJobs(5);

      if (!pendingJobs.length) {
        await interaction.editReply("No pending jobs to post.");
        return;
      }

      // Claim jobs before posting so concurrent runs don't repost them
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

client.login(process.env.DISCORD_BOT_TOKEN);
