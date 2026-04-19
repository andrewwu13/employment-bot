import { chromium } from 'playwright';
import * as cheerio from 'cheerio';
import { Logger } from '@repo/shared';
import { SITE_HANDLERS, COOKIE_DISMISS_SELECTORS, allSkills } from '@repo/shared';

export class JobScraper {
  constructor(options = {}) {
    this.timeout = options.timeout ?? 30000;
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

    // Block non-essential resources to speed up page loads
    await page.route('**/*', (route) => {
      const type = route.request().resourceType();
      if (['image', 'stylesheet', 'font', 'media'].includes(type)) {
        return route.abort();
      }
      return route.continue();
    });

    try {
      Logger.info(`[JobScraper] Navigating to ${url}...`);

      // Navigate to page
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
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

      const html = await page.content();
      const jobContent = await this.extractData(html, finalUrl);

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

  // Extract data using JSON-LD if available, otherwise fall back to HTML parsing
  async extractData(pageHTML, url) {
    const $ = cheerio.load(pageHTML);

    // Try JSON-LD first
    const jsonLdScript = $('script[type="application/ld+json"]').html();
    if (jsonLdScript) {
      try {
        let JSONData = JSON.parse(jsonLdScript);

        // Some pages embed an array of JSON-LD objects
        if (Array.isArray(JSONData)) {
          JSONData = JSONData.find(item => item['@type'] === 'JobPosting') || JSONData[0];
        }

        if (JSONData && JSONData.title) {
          Logger.info('[JobScraper] Extracted data from JSON-LD');
          return {
            url,
            title: JSONData.title,
            company: JSONData.hiringOrganization?.name ?? null,
            location: JSONData.jobLocation?.address?.addressLocality ?? null,
            skills: this.extractSkills(JSONData.description ?? ''),
            postedDate: JSONData.datePosted ?? null,
          };
        }
      } catch (e) {
        Logger.warn('[JobScraper] JSON-LD parse failed, falling back to HTML');
      }
    }

    // Fallback: extract from HTML elements
    Logger.info('[JobScraper] Extracting data from HTML (no JSON-LD found)');

    // Title: try <title>, <h1>, or og:title
    const rawTitle = $('title').text().trim()
      || $('h1').first().text().trim()
      || $('meta[property="og:title"]').attr('content')
      || '';

    // Company: try og:site_name, or parse from title (often "Job Title - Company")
    const company = $('meta[property="og:site_name"]').attr('content')
      || this.parseCompanyFromTitle(rawTitle)
      || null;

    // Clean the title by removing the company name and job ID suffixes
    const title = this.cleanTitle(rawTitle, company);

    // Location: try meta tags or common selectors
    const location = $('meta[name="geo.placename"]').attr('content')
      || $('meta[property="og:locale"]').attr('content')
      || null;

    // Description: grab body text for skills extraction
    const bodyText = $('body').text();

    return {
      url,
      title: title || null,
      company,
      location,
      skills: this.extractSkills(bodyText),
      postedDate: null,
    };
  }

  // Parse company name from title tag (e.g., "Software Engineer - 210946 - Electronic Arts")
  parseCompanyFromTitle(title) {
    const parts = title.split(/\s[-–|]\s/);
    if (parts.length >= 2) {
      return parts[parts.length - 1].trim();
    }
    return null;
  }

  // Clean title by removing company name and numeric job IDs
  cleanTitle(rawTitle, company) {
    let title = rawTitle;
    // Remove company name from end
    if (company) {
      const companyPattern = new RegExp(`\\s*[-–|]\\s*${company.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i');
      title = title.replace(companyPattern, '');
    }
    // Remove numeric job IDs (e.g., "- 210946")
    title = title.replace(/\s*[-–|]\s*\d{4,}\s*/g, '');
    return title.trim();
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
