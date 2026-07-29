import { pendingJobLimit } from '../config.js';
import { publishJob } from '../utils.js';

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

  // Claim jobs before posting so concurrent runs don't repost them
  const jobIds = pendingJobs.map(job => job.id);
  await dbService.markJobsAsPosting(jobIds);

  let posted = 0;
  for (const job of pendingJobs) {
    try {
      await publishJob(channel, job, dbService);
      posted++;
    } catch {
      // publishJob already logged the failure and reverted the job status
    }
  }

  await interaction.editReply(`Posted ${posted} job(s) to this channel!`);
}
