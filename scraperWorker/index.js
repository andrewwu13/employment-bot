// this is a standalone cron job runner. runs the scraper from ScrapeService.js, and can be deployed as a cloud CRON job.
import dotenv from 'dotenv';
dotenv.config();

import { DatabaseService } from "../backend/services/DatabaseService.js";
import { GmailService } from "../backend/services/GmailService.js";
import { MockGmailService } from "../backend/services/MockGmailService.js";
import { JobScraper } from "../backend/services/JobScraper.js";
import { ScrapeService } from "../backend/services/ScrapeService.js";

import cron from 'node-cron';

// Use mock Gmail service in dev mode
const isDevMode = process.env.DEV_MODE === 'true';
if (isDevMode) {
  console.log('[scraperWorker] Running in DEV MODE - using mock Gmail service');
}

const gmailService = isDevMode ? new MockGmailService() : new GmailService();
const dbService = new DatabaseService();
const scraper = new JobScraper();

const scrapeService = new ScrapeService(gmailService, dbService, scraper, 2000);

// this runs every 59 seconds
cron.schedule('*/59 * * * * *', async () => {
  console.log('\n[scraperWorker] Starting scheduled scrape job...');
  scrapeService.runCron().then(() => {
    console.log('[scraperWorker] Scrape job completed.');
  }).catch((error) => {
      console.error('[scraperWorker] Error during scrape job:', error);
    });
});
