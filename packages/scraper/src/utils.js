import * as cheerio from 'cheerio';
import { Logger, allSkills } from '@repo/shared';

export function htmlToText(html) {
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

export function isInternRole(title) {
  return /\bintern(ship)?s?\b/i.test(title ?? '');
}

export function toUnifiedJob({ url, title, company, location, description, postedDate }) {
  return {
    url,
    title: title ?? null,
    company: company ?? null,
    location: location ?? null,
    skills: extractSkills(description ?? ''),
    postedDate: postedDate ?? null,
  };
}

export async function fetchJson(apiUrl, options = {}) {
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

export function pathSegments(url) {
  return new URL(url).pathname.split('/').filter(Boolean);
}

function parseCompanyFromTitle(title) {
  const parts = title.split(/\s[-–|]\s/);
  return parts.length >= 2 ? parts[parts.length - 1].trim() : null;
}

function cleanTitle(rawTitle, company) {
  let title = rawTitle;
  if (company) {
    const escaped = company.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    title = title.replace(new RegExp(`\\s*[-–|]\\s*${escaped}\\s*$`, 'i'), '');
  }
  return title.replace(/\s*[-–|]\s*\d{4,}\s*/g, '').trim();
}

export function extractFromHtml(html, url) {
  const $ = cheerio.load(html);

  const jsonLdScript = $('script[type="application/ld+json"]').html();
  if (jsonLdScript) {
    try {
      let data = JSON.parse(jsonLdScript);
      if (Array.isArray(data)) {
        data = data.find((item) => item['@type'] === 'JobPosting') ?? data[0];
      }
      if (data?.title) {
        Logger.info('[scraper] Extracted data from JSON-LD');
        return toUnifiedJob({
          url,
          title: data.title,
          company: data.hiringOrganization?.name,
          location: data.jobLocation?.address?.addressLocality,
          description: data.description,
          postedDate: data.datePosted,
        });
      }
    } catch {
      Logger.warn('[scraper] JSON-LD parse failed, falling back to HTML');
    }
  }

  Logger.info('[scraper] Extracting data from HTML (no JSON-LD found)');

  const rawTitle =
    $('title').text().trim() ||
    $('h1').first().text().trim() ||
    $('meta[property="og:title"]').attr('content') ||
    '';

  const company =
    $('meta[property="og:site_name"]').attr('content') ?? parseCompanyFromTitle(rawTitle);

  return toUnifiedJob({
    url,
    title: cleanTitle(rawTitle, company) || null,
    company,
    location:
      $('meta[name="geo.placename"]').attr('content') ??
      $('meta[property="og:locale"]').attr('content'),
    description: $('body').text(),
  });
}
