require('dotenv').config()

const axios = require('axios');
const { Client, GatewayIntentBits } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

client.on('ready', () => {
  console.log('bot is ready');
})

client.on('messageCreate', async (message) => {
  if (message.content === 'ping') {
    message.reply({
      content: 'pong'
    })
  }
})

client.login(process.env.TOKEN)