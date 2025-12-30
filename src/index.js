import 'dotenv/config.js'
import cron from "node-cron";
import { Client, Events, GatewayIntentBits } from 'discord.js';
import { REST, Routes } from 'discord.js';
//import { commands } from './commands.js';
import { scrape } from './services/scrapeService.js';
import { fetchUnreadEmails, cleanEmails } from './controllers/gmail.js';
import { createJobEmbed } from './utils/createEmbed.js'


// Helper debug function: logs embed size and fields info
function debugEmbedSize(stage, embed, index = null) {
  const size =
    (embed.title?.length || 0) +
    (embed.description?.length || 0) +
    (Array.isArray(embed.fields)
      ? embed.fields.reduce(
          (sum, f) =>
            sum + (f.name?.length || 0) + (f.value?.length || 0),
          0
        )
      : 0);

  const fieldCount = embed.fields?.length || 0;

  console.log(
    `[DEBUG] ${stage}` +
      (index !== null ? ` [${index}]` : "") +
      ` | fields=${fieldCount} | size=${size}`
  );

  if (Array.isArray(embed.fields)) {
    embed.fields.forEach((f, i) => {
      const fs = (f.name?.length || 0) + (f.value?.length || 0);
      if (fs > 1024) {
        console.log(
          `[DEBUG]   Field ${i} exceeds 1024 chars (${fs}) | name="${f.name}"`
        );
      }
    });
  }
}

const commands = [
  {
    name: 'ping',
    description: 'Replies with Pong!',
  },
  {
    name: 'scrape',
    description: 'scrapes website'
  },
  {
    name: 'mail', 
    description: 'fetchest latest emails'
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
  // cron job
  cron.schedule("* * * * *", async () => {
    // run hourly at the top of the hour (minute 0)
    const now = new Date();
    const hours = now.getHours();
    const min = now.getMinutes();
    const seconds = now.getSeconds();
    const milliseconds = now.getMilliseconds();

    const hh = String(hours).padStart(2, '0');
    const mm = String(min).padStart(2, '0');
    const ss = String(seconds).padStart(2,'0');
    const ms = String(milliseconds).padStart(2,'0');

    console.log(`Running hourly email checker | ${hh}:${mm}:${ss}:${ms}`);

    const recipient = "no-reply@notify.careers";
    
    try {
      const rawEmails = await fetchUnreadEmails(recipient);
      const discordReady = await cleanEmails(rawEmails);
      if (!discordReady.length) {
        console.log("No new job emails found -- nothing sent to Discord.");
        return;
      }
      // Since cleanEmails now returns embeds already batched by 10, send directly
      const channel = await client.channels.fetch(process.env.JOB_CHANNEL_ID);

      for (let i = 0; i < discordReady.length; i++) {
        debugEmbedSize("before-send", discordReady[i], i);
        await channel.send({ embeds: [discordReady[i]] });
        console.log(`Sent job posting batch ${i + 1}/${discordReady.length}`);
      }
      console.log(`All batches sent.`)
    } catch (error) {
      console.error("Error running hourly email check: ", error)
    }
  }, {
    timezone: "America/Toronto"
  });
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  if (commandName === 'ping') {
    await interaction.reply('Pong!');
  } 
  else if (commandName === 'scrape') {
    const data = await scrape();
    await interaction.reply({ content: `${data.pageTitle}\n${data.elementText}` });
  } 
  else if (commandName === 'mail') {
    try {
      const emails = await fetchUnreadEmails();

      if (!emails.length) {
        await interaction.reply("No new job emails found.");
        return;
      }

      // Use createJobEmbed for all email embeds
      const embeds = emails.map(e => createJobEmbed(e));

      await interaction.reply({
        content: "Here are the latest job alerts:",
        embeds: embeds
      });
    } catch (err) {
      console.error(err);
      await interaction.reply("Failed to fetch job emails. Check logs.");
    }
  }
});
client.login(process.env.TOKEN)
