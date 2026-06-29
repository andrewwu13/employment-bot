import {
  fetchGreenhouse,
  fetchLever,
  fetchWorkday,
} from '@repo/scraper';

const cases = [
  {
    name: 'Greenhouse',
    fn: fetchGreenhouse,
    url: 'https://boards.greenhouse.io/stripe',
  },
  {
    name: 'Lever',
    fn: fetchLever,
    url: 'https://jobs.lever.co/mistral',
  },
  {
    name: 'Workday',
    fn: fetchWorkday,
    url: 'https://ea.wd3.myworkdayjobs.com/en-US/Careers',
  },
];

async function runTargets() {
  for (const { name, fn, url } of cases) {
    console.log(`\n=== ${name} ===`);
    console.log(`URL: ${url}`);
    try {
      const jobs = await fn(url);
      console.log(`Found ${jobs.length} postings`);
      console.log('Sample:', JSON.stringify(jobs[0], null, 2));
    } catch (error) {
      console.error(`${name} failed:`, error.message);
    }
  }
}

runTargets();
