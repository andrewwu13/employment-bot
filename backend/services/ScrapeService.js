import { Logger } from '../utils/logger.js';

export class ScrapeService {
  constructor(
    gmailService,
    dbService,
    jobScraper,
    cooldown = 60000 // default 1 minute cooldown between scrapes
  ) {
    this.scraper = jobScraper;
    this.dbService = dbService;
    this.gmailService = gmailService;
    this.cooldown = cooldown;
    this.isProcessing = false;
  }

  async runCron() {
    if (this.isProcessing) {
      Logger.info("Previous cron job still running, skipping...");
      return;
    }

    this.isProcessing = true;
    const startTime = new Date();
    Logger.info(`[ScrapeService] Starting cron job at ${startTime.toISOString()}`);

    try {
      // 1. Fetch emails
      const rawEmails = await this.fetchEmails();
      if (!rawEmails?.length) return this.buildResult(0, 0, startTime);

      // 2. Parse emails - extract jobs
      const jobs = this.parseEmails(rawEmails);
      if (!jobs?.length) return this.buildResult(0, 0, startTime);

      // 3. Scrape and write to DB
      const { successCount, errorCount } = await this.processJobs(jobs);

      return this.buildResult(successCount, errorCount, startTime);

    } catch (error) {
      Logger.error("[ScrapeService] Fatal error in cron job:", error);
      return { success: false, error: error.message };
    } finally {
      this.isProcessing = false;
    }
  }

  async fetchEmails() {
    const recipient = "no-reply@notify.careers";
    const rawEmails = await this.gmailService.fetchUnreadEmails(recipient);

    if (!rawEmails?.length) {
      Logger.info("[ScrapeService] No new emails found.");
      return null;
    }

    Logger.info(`[ScrapeService] Found ${rawEmails.length} unread emails`);
    return rawEmails;
  }

  buildResult(successCount, errorCount, startTime) {
    const endTime = new Date();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    Logger.info(`[ScrapeService] Cron job complete in ${duration}s`);
    Logger.info(`[ScrapeService] Success: ${successCount} | Errors: ${errorCount}`);

    return {
      success: true,
      processed: successCount,
      errors: errorCount,
      duration: duration
    };
  }

  parseEmails(rawEmails) {
    // Extract all jobs from emails
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
      Logger.info("[ScrapeService] No job postings found in emails.");
      return null;
    }

    Logger.info(`[ScrapeService] Found ${allJobs.length} job postings to scrape`);
    return allJobs;
  }

  async processJobs(jobs) {
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < jobs.length; i++) {
      const result = await this.processJobPosting(jobs[i], i, jobs.length);

      if (result.success) {
        successCount++;
      } else {
        errorCount++;
      }

      await this.applyCooldown(i, jobs.length);
    }

    return { successCount, errorCount };
  }

  async processJobPosting(job, index, total) {
    try {
      Logger.info(`[ScrapeService] [${index + 1}/${total}] ${job.companyName} - ${job.jobTitle}`);
      Logger.info(`[ScrapeService] Scraping: ${job.applyLink}`);

      // Scrape the job URL
      const scrapedData = await this.scraper.scrape(job.applyLink);

      Logger.info(`[ScrapeService] Scraped data: ${JSON.stringify(scrapedData)}`);

      // Combine email data + scraped data
      const enrichedJob = {
        ...job,
        scrapedData,
        status: 'pending',
        createdAt: new Date(),
        postedAt: null,
        title: job.jobTitle,
        company: job.companyName
      };

      Logger.info(`[ScrapeService] Enriched job: ${JSON.stringify(enrichedJob)}`);

      // Write to database
      const docId = await this.dbService.write(enrichedJob);

      Logger.success(`[ScrapeService] ✓ Saved to Firestore with ID: ${docId}`);
      return { success: true, docId };

    } catch (error) {
      Logger.error(`[ScrapeService] ✗ Error processing job ${index + 1}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  async applyCooldown(currentIndex, totalCount) {
    if (currentIndex < totalCount - 1) {
      await new Promise(resolve => setTimeout(resolve, this.cooldown));
    }
  }

}

// Run for node testing in isolation
if (import.meta.url === `file://${process.argv[1]}`) {
  const { GmailService } = await import('./GmailService.js');
  const { MockGmailService } = await import('./MockGmailService.js');
  const { DatabaseService } = await import('./DatabaseService.js');
  const { JobScraper } = await import('./JobScraper.js');

  const isDevMode = process.env.DEV_MODE === 'true';
  if (isDevMode) {
    Logger.info('[ScrapeService] Running in DEV MODE - using mock Gmail service');
  }

  const gmailService = isDevMode ? new MockGmailService() : new GmailService();
  const dbService = new DatabaseService();
  const scraper = new JobScraper();

  const scrapeService = new ScrapeService(gmailService, dbService, scraper, 2000);

  scrapeService.runCron().catch(console.error);
}

