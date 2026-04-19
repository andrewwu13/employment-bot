import { GmailService } from '@repo/email';
import { JobScraper } from '@repo/scraper';
import { Logger } from '@repo/shared';

export function registerEmailsCommand(program) {
  program
    .command('emails')
    .description('List job postings from unread Gmail emails (read-only)')
    .option('-l, --limit <count>', 'max number of emails to fetch', '5')
    .option('-s, --scrape', 'scrape each job URL after listing', false)
    .option('-j, --json', 'output raw JSON', false)
    .option('-t, --timeout <ms>', 'scrape timeout in milliseconds', '30000')
    .action(async (options) => {
      const limit = parseInt(options.limit, 10);
      const shouldScrape = options.scrape;
      const timeout = parseInt(options.timeout, 10);

      console.log(`Fetching up to ${limit} unread emails (read-only)...`);
      console.log('');

      try {
        const start = performance.now();
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

        // Collect all jobs across emails
        const allJobs = [];
        for (const email of emails) {
          for (const job of email.jobs) {
            allJobs.push({ ...job, emailDate: email.date, emailSubject: email.subject });
          }
        }

        console.log(`Found ${emails.length} email(s) with ${allJobs.length} job posting(s):\n`);

        // List all jobs
        for (let i = 0; i < allJobs.length; i++) {
          const job = allJobs[i];
          console.log(`  ${i + 1}. ${job.companyName} - ${job.jobTitle}`);
          console.log(`     ${job.applyLink}`);
        }

        // Optionally scrape each job URL
        if (shouldScrape && allJobs.length > 0) {
          console.log(`\nScraping ${allJobs.length} job URL(s)...\n`);
          const scraper = new JobScraper({ timeout });

          for (let i = 0; i < allJobs.length; i++) {
            const job = allJobs[i];
            try {
              const jobData = await scraper.scrape(job.applyLink);
              if (options.json) {
                console.log(JSON.stringify(jobData, null, 2));
              } else {
                Logger.logJob(jobData);
              }
            } catch (error) {
              Logger.error(`Failed to scrape ${job.companyName} - ${job.jobTitle}`, error);
            }
          }
        }

        const elapsed = ((performance.now() - start) / 1000).toFixed(2);
        console.log(`\nCompleted in ${elapsed}s`);
        process.exit(0);
      } catch (error) {
        Logger.error('Failed to fetch emails', error);
        process.exit(1);
      }
    });
}
