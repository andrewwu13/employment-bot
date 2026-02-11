import { JobScraper } from '../backend/services/JobScraper.js';
import { Logger } from '../backend/utils/logger.js';
import { Job } from '../backend/models/Job.js';

// testing scrape
async function runScrapeTest() {
    Logger.info("Starting scraper test...");

    const url = "https://ciena.wd5.myworkdayjobs.com/Careers/job/Ottawa/Waveserver-Software-Developer-Co-op--Spring-Summer-2026-_R029532";

    try {
        const scraper = new JobScraper({ headless: true });
        Logger.info(`Scraping URL: ${url}`);

        const jobData = await scraper.scrape(url);
        const job = jobData instanceof Job ? jobData : new Job(jobData);

        if (job) {
            Logger.success("Scraping successful!");
            Logger.logJob(job);
            console.log(job.toFirestore());
        } else {
            Logger.warn("No job data found.");
        }

    } catch (error) {
        Logger.error("Scraping failed", error);
    }
}

runScrapeTest();
