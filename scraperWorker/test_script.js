import { JobScraper } from '../backend/services/JobScraper.js';
import { Logger } from '../backend/utils/logger.js';
import { Job } from '../backend/models/Job.js';

// testing scrape
async function runScrapeTest() {
    Logger.info("Starting scraper test...");

    const url = "https://links.notify.careers/CL0/https:%2F%2Fcareers-mercuryinsurance.icims.com%2Fjobs%2F5926%2Fjob%3Fmobile=true%26needsRedirect=false/1/0111019b93a5292d-96396d8e-750a-4781-bd33-2dcd8e95de5b-000000/t484Xap5cbjt4WFmP_EgbD6iAFciyENSXfNHpd2yI7Q=244";

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