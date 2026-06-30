import * as cheerio from 'cheerio';
import { allSkills } from '@repo/shared';

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
