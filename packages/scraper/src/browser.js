import { chromium } from 'playwright';
import { Logger, SITE_HANDLERS } from '@repo/shared';
import { extractFromHtml } from './utils.js';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const BLOCKED_RESOURCES = ['image', 'stylesheet', 'font', 'media'];

let sharedBrowser = null;
let browserPromise = null;

async function getBrowser() {
  if (sharedBrowser?.isConnected()) return sharedBrowser;
  if (!browserPromise) {
    browserPromise = chromium.launch({ headless: true }).then((browser) => {
      sharedBrowser = browser;
      browserPromise = null;
      return browser;
    });
  }
  return browserPromise;
}

export async function closeBrowser() {
  if (sharedBrowser) {
    await sharedBrowser.close();
    sharedBrowser = null;
  }
}

function siteHandlerFor(url) {
  for (const [name, handler] of Object.entries(SITE_HANDLERS)) {
    if (name !== 'generic' && handler.pattern.test(url)) {
      Logger.info(`[scraper] Detected site type: ${name}`);
      return handler;
    }
  }
  Logger.info(`[scraper] Using generic handler for: ${url}`);
  return SITE_HANDLERS.generic;
}

export async function scrapePage(url, timeout = 30000) {
  const browser = await getBrowser();
  const context = await browser.newContext({ userAgent: USER_AGENT });
  const page = await context.newPage();

  await page.route('**/*', (route) =>
    BLOCKED_RESOURCES.includes(route.request().resourceType())
      ? route.abort()
      : route.continue()
  );

  try {
    Logger.info(`[scraper] Navigating to ${url}...`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout });

    const finalUrl = page.url();
    if (finalUrl !== url) Logger.info(`[scraper] Redirected to: ${finalUrl}`);

    const { waitFor } = siteHandlerFor(finalUrl);
    if (waitFor) {
      try {
        await page.waitForSelector(waitFor, { timeout: 5000 });
      } catch {
        Logger.warn('[scraper] Site-specific selector not found, continuing...');
      }
    }

    return extractFromHtml(await page.content(), finalUrl);
  } catch (error) {
    Logger.error(`[scraper] Error during scraping: ${error.message}`);
    throw error;
  } finally {
    await context.close();
  }
}
