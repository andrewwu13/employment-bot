import { Logger } from '@repo/shared';
import { PROVIDERS } from './providers.js';
import { scrapePage } from './browser.js';

export { closeBrowser } from './browser.js';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const MAX_REDIRECTS = 10;

function providerFor(url) {
  const host = new URL(url).host;
  return PROVIDERS.find((p) => host.includes(p.match)) ?? null;
}

async function nextRedirect(url) {
  try {
    const res = await fetch(url, { redirect: 'manual', headers: { 'User-Agent': USER_AGENT } });
    res.body?.cancel?.();
    const location = res.headers.get('location');
    if (res.status >= 300 && res.status < 400 && location) {
      return new URL(location, url).toString();
    }
  } catch {
    return null;
  }
  return null;
}

export async function fetchBoard(url) {
  const provider = providerFor(url);
  if (!provider) throw new Error(`Unsupported job board: ${url}`);
  return provider.fetchBoard(url);
}

export async function fetchPosting(url) {
  let current = url;

  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const provider = providerFor(current);
    if (provider?.fetchPosting && provider.isPosting?.(current)) {
      try {
        return await provider.fetchPosting(current);
      } catch (error) {
        Logger.warn(`[scraper] API fetch failed (${error.message}); falling back to browser`);
        break;
      }
    }

    const next = await nextRedirect(current);
    if (!next) break;
    current = next;
  }

  return scrapePage(current);
}
