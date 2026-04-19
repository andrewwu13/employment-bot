import { GmailService } from '@repo/email';
import { JobScraper } from '@repo/scraper';
import { Logger } from '@repo/shared';

// Format a scraped job as a Discord-style embed (text representation)
function formatAsEmbed(job) {
  const colors = Logger.colors;
  const divider = `${colors.dim}${'─'.repeat(50)}${colors.reset}`;
  const title = job.title || 'Job Posting';
  const url = job.url || job.applyLink || '';

  const lines = [
    divider,
    `${colors.blue}${colors.bright}${title}${colors.reset}`,
    `${colors.dim}${url}${colors.reset}`,
  ];

  if (job.company) {
    lines.push(`${colors.bright}Company:${colors.reset}  ${job.company}`);
  }
  if (job.location) {
    lines.push(`${colors.bright}Location:${colors.reset} ${job.location}`);
  }
  if (job.skills && job.skills.length > 0) {
    const tags = job.skills.slice(0, 8).map(s => `${colors.cyan}${s}${colors.reset}`).join('  ');
    lines.push(`${colors.bright}Skills:${colors.reset}   ${tags}`);
  }
  if (job.postedDate) {
    const date = new Date(job.postedDate).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
    lines.push(`${colors.dim}Posted: ${date}${colors.reset}`);
  }
  lines.push(divider);

  return lines.join('\n');
}

export function registerLogCommand(program) {
  program
    .command('log')
    .description('Simulate the full pipeline: fetch emails, scrape jobs, display as embeds (no DB, no mark as read)')
    .option('-l, --limit <count>', 'max number of emails to fetch', '5')
    .option('-t, --timeout <ms>', 'scrape timeout in milliseconds', '30000')
    .option('-j, --json', 'output raw JSON', false)
    .action(async (options) => {
      const limit = parseInt(options.limit, 10);
      const timeout = parseInt(options.timeout, 10);

      console.log(`Simulating pipeline (read-only, no DB writes)...`);
      console.log(`Fetching up to ${limit} emails\n`);

      const start = performance.now();

      try {
        // Step 1: Fetch emails (read-only)
        const gmail = new GmailService();
        const sender = 'no-reply@notify.careers';
        const emails = await gmail.fetchUnreadEmails(sender, {
          markAsRead: false,
          limit,
        });

        if (!emails.length) {
          console.log('No unread emails found.');
          process.exit(0);
        }

        // Step 2: Collect all jobs
        const allJobs = [];
        for (const email of emails) {
          for (const job of email.jobs) {
            allJobs.push({ ...job, emailDate: email.date });
          }
        }

        Logger.info(`Found ${allJobs.length} job(s) across ${emails.length} email(s)`);
        console.log('');

        // Step 3: Scrape each job URL
        const scraper = new JobScraper({ timeout });
        let success = 0;
        let failed = 0;

        for (let i = 0; i < allJobs.length; i++) {
          const job = allJobs[i];
          Logger.info(`[${i + 1}/${allJobs.length}] Scraping ${job.companyName} - ${job.jobTitle}`);

          try {
            const jobData = await scraper.scrape(job.applyLink);

            if (options.json) {
              console.log(JSON.stringify(jobData, null, 2));
            } else {
              console.log(formatAsEmbed(jobData));
            }
            success++;
          } catch (error) {
            Logger.error(`Failed to scrape: ${error.message}`);
            failed++;
          }
        }

        const elapsed = ((performance.now() - start) / 1000).toFixed(2);
        console.log('');
        Logger.info(`Results: ${success} scraped, ${failed} failed`);
        console.log(`Completed in ${elapsed}s`);
        process.exit(0);
      } catch (error) {
        Logger.error('Pipeline failed', error);
        process.exit(1);
      }
    });
}
