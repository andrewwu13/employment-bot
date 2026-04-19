import dotenv from 'dotenv';
dotenv.config();

import { DatabaseService } from "@repo/database";
import { GmailService } from "@repo/email";
import { MockGmailService } from "@repo/email";
import { JobScraper } from "@repo/scraper";
import { ScrapeService } from "@repo/scraper";
import { Logger } from '@repo/shared';
import cron from 'node-cron';

// Use mock Gmail service in dev mode
const isDevMode = process.env.DEV_MODE === 'true';
if (isDevMode) {
  Logger.info('[scraperWorker] Running in DEV MODE - using mock Gmail service');
}

const gmailService = isDevMode ? new MockGmailService() : new GmailService();
const dbService = new DatabaseService();
const scraper = new JobScraper();

const scrapeService = new ScrapeService(gmailService, dbService, scraper, 2000);

// this runs every 30 minutes
cron.schedule('0 */30 * * *', async () => {
  Logger.info('\n[scraperWorker] Starting scheduled 30-minute scrape job...');
  scrapeService.runCron().then(() => {
    Logger.info('[scraperWorker] Scrape job completed.')
  }).catch((error) => {
    Logger.error('[scraperWorker] Error during scrape job:', error);
  });
});
