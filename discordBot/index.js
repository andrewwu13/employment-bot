import 'dotenv/config.js';
import cron from "node-cron";
import { Client, Events, GatewayIntentBits } from 'discord.js';
import { REST, Routes } from 'discord.js';
import { DatabaseService } from '../backend/services/DatabaseService.js';

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
  console.log('Started refreshing application (/) commands.');

  await rest.put(
    Routes.applicationGuildCommands(process.env.APPLICATION_ID, process.env.GUILD_ID), 
    { body: commands }
  );

  console.log('Successfully reloaded application (/) commands.');
} catch (error) {
  console.error(error);
}

client.once(Events.ClientReady, (c) => {
  console.log(`Ready! Logged in as ${c.user.tag}`);
  
  // Cron job - Post pending jobs from database every hour
  cron.schedule("0 * * * *", async () => {
    const now = new Date();
    console.log(`[DiscordBot] Running hourly job posting | ${now.toISOString()}`);
    
    try {
      await postPendingJobs();
      console.log(`[DiscordBot] Hourly job posting complete`);
    } catch (error) {
      console.error("[DiscordBot] Error in hourly job posting:", error);
    }
  }, {
    timezone: "America/Toronto"
  });
});

// Function to post pending jobs from database to Discord
async function postPendingJobs() {
  try {
    // Get pending jobs from database
    const pendingJobs = await dbService.getPendingJobs(10);
    
    if (!pendingJobs.length) {
      console.log("[DiscordBot] No pending jobs to post.");
      return;
    }

    console.log(`[DiscordBot] Found ${pendingJobs.length} pending jobs to post`);
    
    const channel = await client.channels.fetch(process.env.JOB_CHANNEL_ID);

    // Post each job as an embed
    for (let i = 0; i < pendingJobs.length; i++) {
      const job = pendingJobs[i];
      
      // Create Discord embed from job data
      const embed = createJobEmbedFromDB(job);
      
      await channel.send({ embeds: [embed] });
      
      // Mark as posted in database
      await dbService.markJobAsPosted(job.id);
      
      console.log(`[DiscordBot] Posted job ${i + 1}/${pendingJobs.length}: ${job.title} at ${job.company}`);
      
      // Small delay to avoid rate limiting
      if (i < pendingJobs.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return pendingJobs.length;
  } catch (error) {
    console.error("[DiscordBot] Error posting jobs:", error);
    throw error;
  }
}

// Create Discord embed from database job object
function createJobEmbedFromDB(job) {
  const fields = [];
  
  // Add company and location
  if (job.company) {
    fields.push({
      name: '🏢 Company',
      value: job.company,
      inline: true
    });
  }
  
  if (job.location) {
    fields.push({
      name: '📍 Location',
      value: job.location,
      inline: true
    });
  }
  
  // Add skills if available
  if (job.skills && job.skills.length > 0) {
    fields.push({
      name: '💻 Skills',
      value: job.skills.slice(0, 5).join(', '),
      inline: false
    });
  }
  
  // Add description (truncated)
  if (job.description) {
    const desc = job.description.substring(0, 300);
    fields.push({
      name: '📝 Description',
      value: desc + (job.description.length > 300 ? '...' : ''),
      inline: false
    });
  }

  return {
    title: job.title || 'Job Posting',
    url: job.url || job.applyLink,
    color: 0x0099ff,
    fields: fields,
    footer: {
      text: `Posted: ${new Date(job.postedDate || job.createdAt).toLocaleDateString()}`
    },
    timestamp: new Date(job.createdAt).toISOString()
  };
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
      console.error(err);
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

      let posted = 0;
      for (const job of pendingJobs) {
        const embed = createJobEmbedFromDB(job);
        await channel.send({ embeds: [embed] });
        await dbService.markJobAsPosted(job.id);
        posted++;
      }

      await interaction.editReply(`✅ Posted ${posted} job(s) to this channel!`);
    } catch (err) {
      console.error(err);
      await interaction.editReply("Failed to post jobs. Check logs.");
    }
  }
});

client.login(process.env.TOKEN);
