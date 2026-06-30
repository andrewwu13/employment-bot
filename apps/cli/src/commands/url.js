import { fetchPosting } from '@repo/scraper';
import { Logger } from '@repo/shared';

export function registerUrlCommand(program) {
  program
    .command('url <jobUrl>')
    .description('Scrape a single job URL')
    .action(async (jobUrl) => {
      console.log(`URL: ${jobUrl}`);
      console.log('');

      try {
        const start = performance.now();
        const jobData = await fetchPosting(jobUrl);
        const elapsed = ((performance.now() - start) / 1000).toFixed(2);

        Logger.logJob(jobData);

        console.log(`\nCompleted in ${elapsed}s`);
        process.exit(0);
      } catch (error) {
        Logger.error('Scraping failed', error);
        process.exit(1);
      }
    });
}
