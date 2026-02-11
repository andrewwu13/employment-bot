import { chromium } from 'playwright';
import * as cheerio from 'cheerio';
import { Logger } from '../utils/logger.js';
import { SITE_HANDLERS, COOKIE_DISMISS_SELECTORS, allSkills } from '../lib/constants.js';

export class JobScraper {
  constructor(options = {}) {
    this.timeout = options.timeout ?? 30000;
    this.waitForNetworkIdle = options.waitForNetworkIdle ?? true;
    this.headless = options.headless ?? true;
  }

  // Detect which site handler to use based on URL
  detectSiteHandler(url) {
    for (const [name, handler] of Object.entries(SITE_HANDLERS)) {
      if (name !== 'generic' && handler.pattern.test(url)) {
        Logger.info(`[JobScraper] Detected site type: ${name}`);
        return { name, ...handler };
      }
    }
    Logger.info(`[JobScraper] Using generic handler for: ${url}`);
    return { name: 'generic', ...SITE_HANDLERS.generic };
  }

  // Try to dismiss cookie consent banners
  async dismissCookieBanners(page) {
    for (const selector of COOKIE_DISMISS_SELECTORS) {
      try {
        const button = await page.$(selector);
        if (button) {
          await button.click();
          Logger.info(`[JobScraper] Dismissed cookie banner using: ${selector}`);
          await page.waitForTimeout(500); // Wait for banner to disappear
          return true;
        }
      } catch (e) {
        // Selector not found or click failed, try next
      }
    }
    return false;
  }

  async scrape(url) {
    const browser = await chromium.launch({ headless: this.headless });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    const page = await context.newPage();

    try {
      Logger.info(`[JobScraper] Navigating to ${url}...`);

      // Navigate to page
      await page.goto(url, {
        waitUntil: this.waitForNetworkIdle ? 'networkidle' : 'domcontentloaded',
        timeout: this.timeout
      });

      // Log the final URL after redirects
      const finalUrl = page.url();
      if (finalUrl !== url) {
        Logger.info(`[JobScraper] Redirected to: ${finalUrl}`);
      }

      // Detect site type from final URL
      const handler = this.detectSiteHandler(finalUrl);

      // Wait for site-specific content if defined
      if (handler.waitFor) {
        try {
          await page.waitForSelector(handler.waitFor, { timeout: 5000 });
        } catch (e) {
          Logger.warn(`[JobScraper] Site-specific selector not found, continuing...`);
        }
      }

      await page.waitForTimeout(1200);

      // Dismiss cookie banners BEFORE extracting content
      await this.dismissCookieBanners(page);

      // Auto-scroll to trigger lazy-loading
      await this.autoscroll(page);
      const html = await page.content(); // grabbing website html
      const jobContent = await this.extractData(html, finalUrl); // normalizing all html data into object

      return jobContent;

    } catch (error) {
      console.error('[JobScraper] Error during scraping:', error.message);
      throw error;
    } finally {
      await browser.close();
    }
  }

  async autoscroll(page) {
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 100;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });
  }

  // Extract data using site-specific selectors
  async extractData(pageHTML, url) {
    const $ = cheerio.load(pageHTML);
    const jsonLdScript = $('script[type="application/ld+json"]').html();
    const JSONData = JSON.parse(jsonLdScript);

    return {
      url: url,
      title: JSONData.title,
      company: JSONData.hiringOrganization.name,
      location: JSONData.jobLocation.address.addressLocality,
      skills: this.extractSkills(JSONData.description),
      postedDate: JSONData.datePosted,
    };
  }

  // Detect if text looks like cookie consent content
  looksLikeCookieContent(text) {
    if (!text) return false;
    const lowerText = text.toLowerCase();
    const cookiePatterns = [
      'we use cookies',
      'cookie policy',
      'cookie consent',
      'cookie preferences',
      'accept all cookies',
      'reject all cookies',
      'personalize content and ads',
      'privacy preferences',
      'consent to cookies',
      'this site uses cookies',
      'by continuing to browse',
      'gdpr',
      'privacy settings'
    ];
    return cookiePatterns.some(pattern => lowerText.includes(pattern));
  }

  extractSkills(description) {
    if (!description) return [];
    
    const skills = new Set();
    
    // Create one big regex pattern
    const pattern = new RegExp(`\\b(${allSkills.join('|')})\\b`, 'gi');
    
    const matches = description.match(pattern);
    if (matches) {
      matches.forEach(skill => {
        skills.add(skill.toLowerCase());
      });
    }
    
    return Array.from(skills).sort();
  }
}
