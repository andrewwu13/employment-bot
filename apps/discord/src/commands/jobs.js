import { pendingJobLimit } from '../config.js';
import { createJobEmbedFromDB } from '../embed.js';

export const name = 'jobs';
export const description = 'Show pending jobs from database';
export const errorMessage = 'Failed to fetch jobs from database. Check logs.';

export async function execute(interaction, { dbService }) {
  await interaction.deferReply();

  const pendingJobs = await dbService.getPendingJobs(pendingJobLimit);

  if (!pendingJobs.length) {
    await interaction.editReply("No pending jobs in the database.");
    return;
  }

  const embeds = pendingJobs.map(job => createJobEmbedFromDB(job));

  await interaction.editReply({
    content: `Found ${pendingJobs.length} pending job(s):`,
    embeds: embeds.slice(0, 10) // Discord caps embeds per message at 10
  });
}
