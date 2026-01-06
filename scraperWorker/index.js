// this is a standalone cron job runner. runs the scraper from ScrapeService.js, and can be deployed as a cloud CRON job.
import { gmail } from "googleapis/build/src/apis/gmail/index.js";
import { DatabaseService } from "../backend/services/DatabaseService.js";
import { GmailService } from "../backend/services/GmailService.js";
import { JobScraper } from "../backend/services/JobScraper.js";
import { ScrapeService } from "../backend/services/ScrapeService.js";

import cron from 'node-cron';

const gmailService = new GmailService();
const dbService = new DatabaseService();
const scraper = new JobScraper();

const scrapeService = new ScrapeService(gmailService, dbService, scraper, 2000);

//cron.schedule('*/30 * * * * *', async () => {
//    console.log('\n[scraperWorker] Starting scheduled scrape job...');  
//    scrapeService.runCron().then(() => {
//        console.log('[scraperWorker] Scrape job completed.');
//    }).catch((error) => {
//        console.error('[scraperWorker] Error during scrape job:', error);
//    });
//});

// testing DB writes
/*
let mockObj = {
    company: "Google", 
    title: "Software Engineer",
}
await dbService.write(mockObj);
*/

// testing scraper
/*
const testUrl = "https://jobs.ea.com/en_US/careers/JobDetail/Sims-Analyst-Intern/210862";
const scrapedData = await scraper.scrape(testUrl);
console.log(scrapedData);
*/