import { REST, Routes } from 'discord.js';
import { Logger } from '@repo/shared';
import { applicationID, discordBotToken, guildID } from '../config.js';
import * as ping from './ping.js';
import * as jobs from './jobs.js';
import * as post from './post.js';

const commands = [ping, jobs, post];
const registry = new Map(commands.map(command => [command.name, command]));

export async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(discordBotToken);

  try {
    Logger.info('Started refreshing application (/) commands.');

    await rest.put(
      Routes.applicationGuildCommands(applicationID, guildID),
      { body: commands.map(({ name, description }) => ({ name, description })) }
    );

    Logger.success('Successfully reloaded application (/) commands.');
  } catch (error) {
    Logger.error(error);
  }
}

export async function handleInteraction(interaction, services) {
  if (!interaction.isChatInputCommand()) return;

  const command = registry.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction, services);
  } catch (error) {
    Logger.error(error);

    const message = command.errorMessage ?? 'Command failed. Check logs.';
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(message);
    } else {
      await interaction.reply(message);
    }
  }
}
