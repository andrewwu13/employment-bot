import { Logger } from '@repo/shared';
import { htmlToText, isInternRole, toUnifiedJob, fetchJson, pathSegments } from './utils.js';

const greenhouse = {
  match: 'greenhouse.io',

  isPosting(url) {
    const segs = pathSegments(url);
    const i = segs.indexOf('jobs');
    return i !== -1 && segs.length > i + 1;
  },

  async fetchBoard(url) {
    const board = pathSegments(url)[0];
    if (!board) throw new Error(`Could not parse Greenhouse board token from: ${url}`);

    const apiUrl = `https://boards-api.greenhouse.io/v1/boards/${board}/jobs?content=true`;
    Logger.info(`[scraper] Greenhouse board API: ${apiUrl}`);

    const data = await fetchJson(apiUrl);
    return (data.jobs ?? [])
      .filter((job) => isInternRole(job.title))
      .map((job) => this.toJob(job, board));
  },

  async fetchPosting(url) {
    const segs = pathSegments(url);
    const board = segs[0];
    const id = segs[segs.indexOf('jobs') + 1];

    const apiUrl = `https://boards-api.greenhouse.io/v1/boards/${board}/jobs/${id}`;
    Logger.info(`[scraper] Greenhouse posting API: ${apiUrl}`);

    const job = await fetchJson(apiUrl);
    return this.toJob(job, board);
  },

  toJob(job, board) {
    return toUnifiedJob({
      url: job.absolute_url,
      title: job.title,
      company: job.company_name ?? board,
      location: job.location?.name ?? null,
      description: htmlToText(job.content),
      postedDate: job.updated_at ?? job.first_published ?? null,
    });
  },
};

const lever = {
  match: 'lever.co',

  isPosting(url) {
    return pathSegments(url).length >= 2;
  },

  async fetchBoard(url) {
    const company = pathSegments(url)[0];
    if (!company) throw new Error(`Could not parse Lever company from: ${url}`);

    const apiUrl = `https://api.lever.co/v0/postings/${company}?mode=json`;
    Logger.info(`[scraper] Lever board API: ${apiUrl}`);

    const postings = await fetchJson(apiUrl);
    return (Array.isArray(postings) ? postings : [])
      .filter((p) => isInternRole(p.text))
      .map((p) => this.toJob(p, company));
  },

  async fetchPosting(url) {
    const [company, id] = pathSegments(url);
    const apiUrl = `https://api.lever.co/v0/postings/${company}/${id}?mode=json`;
    Logger.info(`[scraper] Lever posting API: ${apiUrl}`);

    const posting = await fetchJson(apiUrl);
    return this.toJob(posting, company);
  },

  toJob(p, company) {
    return toUnifiedJob({
      url: p.hostedUrl,
      title: p.text,
      company,
      location: p.categories?.location ?? null,
      description: p.descriptionPlain ?? htmlToText(p.description),
      postedDate: p.createdAt ? new Date(p.createdAt).toISOString() : null,
    });
  },
};

const ashby = {
  match: 'ashbyhq.com',

  isPosting(url) {
    return pathSegments(url).length >= 2;
  },

  async fetchBoard(url) {
    const org = pathSegments(url)[0];
    if (!org) throw new Error(`Could not parse Ashby job board from: ${url}`);

    const data = await this.fetchBoardData(org);
    return (data.jobs ?? [])
      .filter((job) => isInternRole(job.title))
      .map((job) => this.toJob(job, org));
  },

  async fetchPosting(url) {
    const [org, id] = pathSegments(url);
    const data = await this.fetchBoardData(org);
    const job = (data.jobs ?? []).find((j) => j.id === id);
    if (!job) throw new Error(`Ashby posting ${id} not found on board ${org}`);
    return this.toJob(job, org);
  },

  fetchBoardData(org) {
    const apiUrl = `https://api.ashbyhq.com/posting-api/job-board/${org}`;
    Logger.info(`[scraper] Ashby board API: ${apiUrl}`);
    return fetchJson(apiUrl);
  },

  toJob(job, org) {
    return toUnifiedJob({
      url: job.jobUrl,
      title: job.title,
      company: org,
      location: job.location ?? null,
      description: htmlToText(job.descriptionHtml),
      postedDate: job.publishedAt ?? null,
    });
  },
};

const workday = {
  match: 'myworkdayjobs.com',

  async fetchBoard(url) {
    const parsed = new URL(url);
    const host = parsed.host;
    const tenant = host.split('.')[0];
    const site = pathSegments(url).pop();
    if (!site) throw new Error(`Could not parse Workday site from: ${url}`);

    const apiUrl = `https://${host}/wday/cxs/${tenant}/${site}/jobs`;
    Logger.info(`[scraper] Workday CXS API: ${apiUrl}`);

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
  },
};

export const PROVIDERS = [greenhouse, lever, workday, ashby];
