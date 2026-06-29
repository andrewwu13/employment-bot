import { fetchBoard } from '@repo/scraper';

const cases = [
  {
    name: 'Greenhouse',
    url: 'https://boards.greenhouse.io/stripe',
  },
  {
    name: 'Lever',
    url: 'https://jobs.lever.co/mistral',
  },
  {
    name: 'Workday',
    url: 'https://ea.wd3.myworkdayjobs.com/en-US/Careers',
  },
  {
    name: 'Ashby',
    url: 'https://jobs.ashbyhq.com/ramp',
  },
];

async function runTargets() {
  for (const { name, url } of cases) {
    console.log(`\n=== ${name} ===`);
    console.log(`URL: ${url}`);
    try {
      const jobs = await fetchBoard(url);
      console.log(`Found ${jobs.length} postings`);
      console.log('Sample:', JSON.stringify(jobs[0], null, 2));
    } catch (error) {
      console.error(`${name} failed:`, error.message);
    }
  }
}

runTargets();
