import { JobScraper } from '@repo/scraper';
import { Logger } from '@repo/shared';

export function registerUrlCommand(program) {
  program
    .command('url <jobUrl>')
    .description('Scrape a single job URL')
    .option('-j, --json', 'output raw JSON instead of formatted logs', false)
    .option('-t, --timeout <ms>', 'page load timeout in milliseconds', '30000')
    .action(async (jobUrl, options) => {
      const timeout = parseInt(options.timeout, 10);

      console.log(`URL: ${jobUrl}`);
      console.log(`Timeout: ${timeout}ms`);
      console.log('');

      try {
        const start = performance.now();
        const scraper = new JobScraper({ timeout });
        const jobData = await scraper.scrape(jobUrl);
        const elapsed = ((performance.now() - start) / 1000).toFixed(2);

        if (options.json) {
          console.log(JSON.stringify(jobData, null, 2));
        } else {
          Logger.logJob(jobData);
        }

        console.log(`\nCompleted in ${elapsed}s`);
        process.exit(0);
      } catch (error) {
        Logger.error('Scraping failed', error);
        process.exit(1);
      }
    });
}
