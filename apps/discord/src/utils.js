import { fetchPosting } from '@repo/scraper';
import { Logger } from '@repo/shared';
import { cooldown, discordChannelID, emailRecipient } from './config.js';
import { createJobEmbedFromDB } from './embed.js';

export async function fetchEmails(gmailService) {
  const rawEmails = await gmailService.fetchUnreadEmails(emailRecipient);

  if (!rawEmails?.length) {
    Logger.info('[DiscordBot] No unread emails found');
    return null;
  }

  Logger.info(`[DiscordBot] Found ${rawEmails.length} unread emails`);
  return rawEmails;
}

export function parseJobsFromEmails(rawEmails) {
  const allJobs = [];

  for (const email of rawEmails) {
    const jobs = email.jobs || [];
    for (const job of jobs) {
      allJobs.push({
        ...job,
        emailSubject: email.subject,
        emailDate: email.date,
        emailFrom: email.from
      });
    }
  }

  if (!allJobs.length) {
    return null;
  }

  Logger.info(`[DiscordBot] Extracted ${allJobs.length} job posting(s) from emails`);
  return allJobs;
}

export async function postJobToDiscord(channel, job, dbService, docId = job.id) {
  try {
    const embed = createJobEmbedFromDB(job);
    await channel.send({ embeds: [embed] });
    await dbService.markJobAsPosted(docId);
  } catch (error) {
    Logger.error(`[DiscordBot] Failed to post job ${docId}, reverting:`, error);
    await dbService.markJobAsFailed(docId);
    throw error;
  }
}

export async function runPipelineAndPost(client, { gmailService, dbService }) {
  const now = new Date();
  Logger.info(`[DiscordBot] Starting scrape-and-post pipeline | ${now.toISOString()}`);

  try {
    const rawEmails = await fetchEmails(gmailService);
    if (!rawEmails?.length) {
      Logger.info('[DiscordBot] No new emails found');
      return;
    }

    const jobs = parseJobsFromEmails(rawEmails);
    if (!jobs?.length) {
      Logger.info('[DiscordBot] No job postings found in emails');
      return;
    }

    const channel = await client.channels.fetch(discordChannelID);
    Logger.info(`[DiscordBot] Processing ${jobs.length} job(s) with ${cooldown}ms delay`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];
      Logger.info(`[DiscordBot] [${i + 1}/${jobs.length}] Processing: ${job.jobTitle} at ${job.companyName}`);

      try {
        Logger.info(`[DiscordBot] Scraping: ${job.applyLink}`);
        const scrapedData = await fetchPosting(job.applyLink);

        const enrichedJob = {
          ...job,
          scrapedData,
          status: 'posting',
          createdAt: new Date(),
          postedAt: null,
          title: job.jobTitle,
          company: job.companyName,
          location: scrapedData.location,
          skills: scrapedData.skills,
          url: job.applyLink
        };
        const docId = await dbService.write(enrichedJob);
        Logger.info(`[DiscordBot] Saved to DB: ${docId}`);

        await postJobToDiscord(channel, enrichedJob, dbService, docId);

        Logger.success(`[DiscordBot] Posted ${job.jobTitle} at ${job.companyName}`);
        successCount++;

      } catch (error) {
        Logger.error(`[DiscordBot] Failed to process job ${job.jobTitle}:`, error.message);
        errorCount++;
      }

      if (i < jobs.length - 1) {
        await new Promise(resolve => setTimeout(resolve, cooldown));
      }
    }

    Logger.success(`[DiscordBot] Pipeline complete: ${successCount} posted, ${errorCount} failed`);

  } catch (error) {
    Logger.error('[DiscordBot] Pipeline error:', error);
  }
}
