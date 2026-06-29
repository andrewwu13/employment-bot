import { fetchGreenhouse, fetchLever, fetchWorkday, fetchAshby } from './target-scrape.js';

const PROVIDERS = [
  { match: 'greenhouse.io', fetch: fetchGreenhouse },
  { match: 'lever.co', fetch: fetchLever },
  { match: 'myworkdayjobs.com', fetch: fetchWorkday },
  { match: 'ashbyhq.com', fetch: fetchAshby },
];

// Scrape a job board by URL, dispatching to the right ATS provider.
export async function fetchBoard(url) {
  const host = new URL(url).host;
  const provider = PROVIDERS.find((p) => host.includes(p.match));
  if (!provider) throw new Error(`Unsupported job board: ${url}`);
  return provider.fetch(url);
}
