#!/usr/bin/env node
// Live canary for the job board providers.
//
// Hits the real Greenhouse/Lever/Ashby/Workday APIs and reports which boards
// still return postings. This is deliberately NOT a jest test: it depends on
// the network and on third parties continuing to host these boards, so a
// failure here means an upstream API changed, not that a commit broke
// something. Run it on a schedule, or by hand when the scraper looks wrong.
//
//   node scripts/check-boards.js
//
// Exits non-zero if any board fails, so cron/CI can alert on it.

import { fetchBoard } from '@repo/scraper';

const BOARDS = [
  { name: 'Greenhouse', url: 'https://boards.greenhouse.io/stripe' },
  { name: 'Lever', url: 'https://jobs.lever.co/palantir' },
  { name: 'Ashby', url: 'https://jobs.ashbyhq.com/ramp' },
  {
    name: 'Workday',
    url: 'https://nvidia.wd5.myworkdayjobs.com/en-US/NVIDIAExternalCareerSite',
  },
];

async function check({ name, url }) {
  try {
    const jobs = await fetchBoard(url);
    // A board that parses but yields nothing is the silent-failure case worth
    // flagging: the API responded, the shape changed, and we mapped zero jobs.
    return { name, url, ok: jobs.length > 0, count: jobs.length };
  } catch (error) {
    return { name, url, ok: false, count: 0, error: error.message };
  }
}

const results = await Promise.all(BOARDS.map(check));

for (const { name, url, ok, count, error } of results) {
  const status = ok ? 'OK' : 'FAIL';
  console.log(`[${status}] ${name}: ${count} intern posting(s) - ${url}`);
  if (error) console.log(`        ${error}`);
}

const failed = results.filter((r) => !r.ok);
if (failed.length) {
  console.log(`\n${failed.length}/${results.length} board(s) need attention.`);
  process.exit(1);
}
console.log(`\nAll ${results.length} boards responding.`);
