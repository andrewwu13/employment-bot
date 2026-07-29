import { pendingJobLimit } from '../config.js';
import { postJobToDiscord } from '../utils.js';

export const name = 'post';
export const description = 'Post pending jobs to this channel';
export const errorMessage = 'Failed to post jobs. Check logs.';

export async function execute(interaction, { dbService }) {
  await interaction.deferReply();

  const channel = interaction.channel;
  const pendingJobs = await dbService.getPendingJobs(pendingJobLimit);

  if (!pendingJobs.length) {
    await interaction.editReply("No pending jobs to post.");
    return;
  }

  const jobIds = pendingJobs.map(job => job.id);
  await dbService.markJobsAsPosting(jobIds);

  let posted = 0;
  for (const job of pendingJobs) {
    try {
      await postJobToDiscord(channel, job, dbService);
      posted++;
    } catch { }
  }

  await interaction.editReply(`Posted ${posted} job(s) to this channel!`);
}
