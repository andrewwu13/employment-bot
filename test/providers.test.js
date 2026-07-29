// Fixture-driven tests for the job board providers - API URL construction, internship filters and mapping onto Job type

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { fetchBoard } from '@repo/scraper';

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');

function loadFixture(name) {
  return JSON.parse(readFileSync(join(fixturesDir, `${name}.json`), 'utf8'));
}

// Replaces global fetch with a stub that always returns `payload`, and records
function stubFetch(payload) {
  const calls = [];
  global.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    return {
      ok: true,
      status: 200,
      json: async () => payload,
    };
  };
  return calls;
}

const realFetch = global.fetch;
afterEach(() => {
  global.fetch = realFetch;
});

describe('greenhouse', () => {
  it('requests the board API for the token in the URL', async () => {
    const calls = stubFetch(loadFixture('greenhouse-board'));

    await fetchBoard('https://boards.greenhouse.io/stripe');

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(
      'https://boards-api.greenhouse.io/v1/boards/stripe/jobs?content=true'
    );
  });

  it('keeps only intern roles and maps them to the unified shape', async () => {
    stubFetch(loadFixture('greenhouse-board'));

    const jobs = await fetchBoard('https://boards.greenhouse.io/stripe');

    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({
      url: 'https://stripe.com/jobs/search?gh_jid=8031833',
      title: 'Software Engineer, Intern',
      company: 'Stripe',
      location: 'Bengaluru',
      postedDate: '2026-07-22T13:25:41-04:00',
    });
    expect(Array.isArray(jobs[0].skills)).toBe(true);
  });

  it('rejects a URL with no board token', async () => {
    stubFetch(loadFixture('greenhouse-board'));

    await expect(fetchBoard('https://boards.greenhouse.io/')).rejects.toThrow(
      /board token/i
    );
  });
});

describe('lever', () => {
  it('requests the postings API for the company in the URL', async () => {
    const calls = stubFetch(loadFixture('lever-board'));

    await fetchBoard('https://jobs.lever.co/palantir');

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('https://api.lever.co/v0/postings/palantir?mode=json');
  });

  it('keeps only intern roles and maps them to the unified shape', async () => {
    stubFetch(loadFixture('lever-board'));

    const jobs = await fetchBoard('https://jobs.lever.co/palantir');

    expect(jobs).toHaveLength(2);
    expect(jobs[0]).toMatchObject({
      url: 'https://jobs.lever.co/palantir/774cf5c9-bf6a-4d77-bf60-d50ef1beb1a0',
      title: 'Deployment Strategist, Internship',
      company: 'palantir',
      location: 'Paris, France',
    });
    // createdAt is an epoch millisecond value; the provider normalises it.
    expect(jobs[0].postedDate).toBe(new Date(1778517108152).toISOString());
  });
});

describe('ashby', () => {
  it('requests the job board API for the org in the URL', async () => {
    const calls = stubFetch(loadFixture('ashby-board'));

    await fetchBoard('https://jobs.ashbyhq.com/ramp');

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('https://api.ashbyhq.com/posting-api/job-board/ramp');
  });

  it('keeps only intern roles and maps them to the unified shape', async () => {
    stubFetch(loadFixture('ashby-board'));

    const jobs = await fetchBoard('https://jobs.ashbyhq.com/ramp');

    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({
      url: 'https://jobs.ashbyhq.com/ramp/67fadb77-43d8-4449-954b-d4cf2c6d3b8b',
      title: 'Software Engineer Internship, Android ',
      company: 'ramp',
      location: 'New York, NY (HQ)',
      postedDate: '2025-08-07T20:49:38.961+00:00',
    });
  });
});

describe('workday', () => {
  it('posts to the CXS endpoint derived from the tenant and site', async () => {
    const calls = stubFetch(loadFixture('workday-board'));

    await fetchBoard('https://nvidia.wd5.myworkdayjobs.com/en-US/NVIDIAExternalCareerSite');

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(
      'https://nvidia.wd5.myworkdayjobs.com/wday/cxs/nvidia/NVIDIAExternalCareerSite/jobs'
    );
    expect(calls[0].options.method).toBe('POST');
    expect(JSON.parse(calls[0].options.body)).toMatchObject({ limit: 20, offset: 0 });
  });

  it('keeps only intern roles and builds absolute posting URLs', async () => {
    stubFetch(loadFixture('workday-board'));

    const jobs = await fetchBoard(
      'https://nvidia.wd5.myworkdayjobs.com/en-US/NVIDIAExternalCareerSite'
    );

    expect(jobs).toHaveLength(1);
    expect(jobs[0].title).toMatch(/Intern/);
    expect(jobs[0].company).toBe('nvidia');
    expect(jobs[0].location).toBe('US, CA, Santa Clara');
    expect(jobs[0].url).toBe(
      'https://nvidia.wd5.myworkdayjobs.com/en-US/NVIDIAExternalCareerSite' +
        '/job/US-CA-Santa-Clara/Applied-Deep-Learning-PhD-Research-Intern--Reinforcement-Learning-for-LLMs---Fall-2026_JR2012398'
    );
  });
});

describe('provider routing', () => {
  it('throws on a board it has no provider for', async () => {
    await expect(fetchBoard('https://example.com/careers')).rejects.toThrow(
      /Unsupported job board/
    );
  });
});
