#!/usr/bin/env node

import { Command, OptionValues } from 'commander/typings/esm.mjs/typings/esm.mjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..', '..');

// Import from main project using dynamic imports
const { JobScraper } = await import(join(projectRoot, 'lib/services/job-scraper.js'));
const { Logger } = await import(join(projectRoot, 'lib/utils/logger.js'));

interface ScrapeOptions extends OptionValues {
  visible: boolean;
  json: boolean;
  timeout: string;
}

interface JobData {
  url: string;
  title: string;
  company: string;
  location: string;
  skills: string[];
  postedDate: string | Date;
}

const program = new Command();

program
  .name('employ-cli')
  .description('CLI tool for testing job scraper')
  .version('1.0.0');

program
  .command('url <jobUrl>')
  .description('Scrape a single job URL')
  .option('-v, --visible', 'show browser window (disable headless mode)', false)
  .option('-j, --json', 'output raw JSON instead of formatted logs', false)
  .option('-t, --timeout <ms>', 'page load timeout in milliseconds', '30000')
  .action(async (jobUrl: string, options: ScrapeOptions): Promise<void> => {
    const url: string = jobUrl;
    const headless: boolean = !options.visible;
    const outputJson: boolean = options.json;
    const timeout: number = parseInt(options.timeout, 10);

    console.log(`URL: ${url}`);
    console.log(`Headless: ${headless}`);
    console.log(`Timeout: ${timeout}ms`);
    console.log('');

    try {
      const scraper = new JobScraper({ headless, timeout });
      const jobData: JobData = await scraper.scrape(url);

      if (outputJson) {
        console.log(JSON.stringify(jobData, null, 2));
      } else {
        Logger.logJob(jobData);
      }

      process.exit(0);
    } catch (error: unknown) {
      Logger.error('Scraping failed', error as Error);
      process.exit(1);
    }
  });

program.parse();
