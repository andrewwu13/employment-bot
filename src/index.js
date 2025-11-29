import 'dotenv/config.js'
import { Client, Events, GatewayIntentBits } from 'discord.js';
import { REST, Routes } from 'discord.js';
//import { commands } from './commands.js';
import { scrape } from './services/scrapeService.js';


const commands = [
  {
    name: 'ping',
    description: 'Replies with Pong!',
  },
  {
    name: 'scrape',
    description: 'scrapes website'
  }
];

// set up discord bot client
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

// setting up command server
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

try {
  console.log('Started refreshing application (/) commands.');

  await rest.put(
    Routes.applicationCommands(process.env.APPLICATION_ID, process.env.GUILD_ID), 
    { body: commands }
  );

  console.log('Successfully reloaded application (/) commands.');
} catch (error) {
  console.error(error);
}

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'ping') {
    await interaction.reply('Pong!');
  }
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'scrape') {
    const data = await scrape();
    await interaction.reply(data.pageTitle, data.elementText);
  }
});

client.login(process.env.TOKEN)
