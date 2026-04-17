// this is a standalone cron job runner. runs the scraper from ScrapeService.js, and can be deployed as a cloud CRON job.
import dotenv from 'dotenv';
dotenv.config();

import { DatabaseService } from "../lib/services/database-service.js";
import { GmailService } from "../lib/services/gmail-service.js";
import { MockGmailService } from "../lib/services/mock-gmail-service.js";
import { JobScraper } from "../lib/services/job-scraper.js";
import { ScrapeService } from "../lib/services/scrape-service.js";
import { Logger } from '../lib/utils/logger.js';

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
