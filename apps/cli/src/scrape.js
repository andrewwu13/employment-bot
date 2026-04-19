#!/usr/bin/env node

import { Command } from 'commander/typings/esm.d.mts';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..', '..');

// Import from main project using dynamic imports
const { JobScraper } = await import(join(projectRoot, 'lib/services/job-scraper.js'));
const { Logger } = await import(join(projectRoot, 'lib/utils/logger.js'));

const program = new Command();

program
  .name('job-scrape')
  .description('CLI tool for testing job scraper')
  .version('1.0.0');

program
  .command('url <jobUrl>')
  .description('Scrape a single job URL')
  .option('-v, --visible', 'show browser window (disable headless mode)', false)
  .option('-j, --json', 'output raw JSON instead of formatted logs', false)
  .option('-t, --timeout <ms>', 'page load timeout in milliseconds', '30000')
  .action(async (jobUrl, options) => {
    const url = jobUrl;
    const headless = !options.visible;
    const outputJson = options.json;
    const timeout = parseInt(options.timeout, 10);

    console.log(`URL: ${url}`);
    console.log(`Headless: ${headless}`);
    console.log(`Timeout: ${timeout}ms`);
    console.log('');

    try {
      const scraper = new JobScraper({ headless, timeout });
      const jobData = await scraper.scrape(url);

      if (outputJson) {
        console.log(JSON.stringify(jobData, null, 2));
      } else {
        Logger.logJob(jobData);
      }

      process.exit(0);
    } catch (error) {
      Logger.error('Scraping failed', error);
      process.exit(1);
    }
  });

program.parse();
