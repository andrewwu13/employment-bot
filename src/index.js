import 'dotenv/config.js'
import cron from "node-cron";
import { Client, Events, GatewayIntentBits } from 'discord.js';
import { REST, Routes } from 'discord.js';
//import { commands } from './commands.js';
import { scrape } from './services/scrapeService.js';
import { fetchUnreadEmails } from './controllers/gmail.js';



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
    const now = new Date();
    console.log(`Running hourly email checker | ${now.getHours}:${now.getMinutes}`);

    try {
      const emails = await fetchUnreadEmails();
      if (!emails.length) return;
      // Channel ID where bot should auto send job alerts to
      const channel = await client.channels.fetch(process.env.JOB_CHANNEL_ID);

      for (const e of emails) {
        await channel.send({
          embeds: [
            {
              title: e.subject || "No Subject",
              description: e.snippet || "No snippet",
              fields: [
                { name: "From", value: e.from || "Unknown"},
                { name: "Date", value: e.date || "Unknown"},
              ],
            },
          ],
        });
      }
      console.log(`Sent ${emails.length} new job postings to Discord`)
    } catch (error) {
      console.error("Error running hourly email check: ", error)
    }
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

      await interaction.reply({
        content: "Here are the latest job alerts:",
        embeds: emails.map(e => ({
          title: e.subject || "No Subject",
          description: e.snippet || "No snippet",
          fields: [
            { name: "From", value: e.from || "Unknown" },
            { name: "Date", value: e.date || "Unknown" },
          ],
        }))
      });
    } catch (err) {
      console.error(err);
      await interaction.reply("Failed to fetch job emails. Check logs.");
    }
  }
});
client.login(process.env.TOKEN)
