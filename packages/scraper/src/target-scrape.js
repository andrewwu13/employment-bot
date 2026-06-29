import * as cheerio from 'cheerio';
import { Logger, allSkills } from '@repo/shared';

function htmlToText(html) {
  if (!html) return '';
  return cheerio.load(html).text().replace(/\s+/g, ' ').trim();
}

function extractSkills(text) {
  if (!text) return [];
  const skills = new Set();
  const pattern = new RegExp(`\\b(${allSkills.join('|')})\\b`, 'gi');
  const matches = text.match(pattern);
  if (matches) matches.forEach((s) => skills.add(s.toLowerCase()));
  return Array.from(skills).sort();
}

function isInternRole(title) {
  return /\bintern(ship)?s?\b/i.test(title ?? '');
}

function toUnifiedJob({ url, title, company, location, description, postedDate }) {
  return {
    url,
    title: title ?? null,
    company: company ?? null,
    location: location ?? null,
    skills: extractSkills(description ?? ''),
    postedDate: postedDate ?? null,
  };
}

async function fetchJson(apiUrl, options = {}) {
  const res = await fetch(apiUrl, {
    ...options,
    headers: {
      Accept: 'application/json',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ...options.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`Request to ${apiUrl} failed with status ${res.status}`);
  }
  return res.json();
}

function lastPathSegment(url) {
  return new URL(url).pathname.split('/').filter(Boolean).pop();
}

export async function fetchGreenhouse(url) {
  const boardToken = lastPathSegment(url);
  if (!boardToken) {
    throw new Error(`Could not parse Greenhouse board token from: ${url}`);
  }

  const apiUrl = `https://boards-api.greenhouse.io/v1/boards/${boardToken}/jobs?content=true`;
  Logger.info(`[target] Greenhouse API: ${apiUrl}`);

  const data = await fetchJson(apiUrl);

  return (data.jobs ?? [])
    .filter((job) => isInternRole(job.title))
    .map((job) =>
      toUnifiedJob({
        url: job.absolute_url,
        title: job.title,
        company: job.company_name ?? boardToken,
        location: job.location?.name ?? null,
        description: htmlToText(job.content),
        postedDate: job.updated_at ?? job.first_published ?? null,
      })
    );
}

export async function fetchLever(url) {
  const company = lastPathSegment(url);
  if (!company) {
    throw new Error(`Could not parse Lever company from: ${url}`);
  }

  const apiUrl = `https://api.lever.co/v0/postings/${company}?mode=json`;
  Logger.info(`[target] Lever API: ${apiUrl}`);

  const postings = await fetchJson(apiUrl);

  return (Array.isArray(postings) ? postings : [])
    .filter((p) => isInternRole(p.text))
    .map((p) =>
      toUnifiedJob({
        url: p.hostedUrl,
        title: p.text,
        company,
        location: p.categories?.location ?? null,
        description: p.descriptionPlain ?? htmlToText(p.description),
        postedDate: p.createdAt ? new Date(p.createdAt).toISOString() : null,
      })
    );
}

export async function fetchAshby(url) {
  const boardToken = lastPathSegment(url);
  if (!boardToken) {
    throw new Error(`Could not parse Ashby job board from: ${url}`);
  }

  const apiUrl = `https://api.ashbyhq.com/posting-api/job-board/${boardToken}`;
  Logger.info(`[target] Ashby API: ${apiUrl}`);

  const data = await fetchJson(apiUrl);

  return (data.jobs ?? [])
    .filter((job) => isInternRole(job.title))
    .map((job) =>
      toUnifiedJob({
        url: job.jobUrl,
        title: job.title,
        company: boardToken,
        location: job.location ?? null,
        description: htmlToText(job.descriptionHtml),
        postedDate: job.publishedAt ?? null,
      })
    );
}

export async function fetchWorkday(url) {
  const parsed = new URL(url);
  const host = parsed.host;
  const tenant = host.split('.')[0];
  const site = parsed.pathname.split('/').filter(Boolean).pop();
  if (!site) {
    throw new Error(`Could not parse Workday site from: ${url}`);
  }

  const apiUrl = `https://${host}/wday/cxs/${tenant}/${site}/jobs`;
  Logger.info(`[target] Workday CXS API: ${apiUrl}`);

  const limit = 20;
  let offset = 0;
  let total = Infinity;
  const jobs = [];

  while (offset < total) {
    const data = await fetchJson(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit, offset, searchText: '', appliedFacets: {} }),
    });

    total = data.total ?? 0;
    const postings = data.jobPostings ?? [];
    if (postings.length === 0) break;

    for (const p of postings) {
      if (!isInternRole(p.title)) continue;
      jobs.push(
        toUnifiedJob({
          url: `https://${host}${parsed.pathname.replace(/\/$/, '')}${p.externalPath ?? ''}`,
          title: p.title,
          company: tenant,
          location: p.locationsText ?? null,
          description: (p.bulletFields ?? []).join(' '),
          postedDate: p.postedOn ?? null,
        })
      );
    }

    offset += limit;
  }

  return jobs;
}
