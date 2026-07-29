export const name = 'ping';
export const description = 'Replies with Pong!';

export async function execute(interaction) {
  await interaction.reply('Pong!');
}
