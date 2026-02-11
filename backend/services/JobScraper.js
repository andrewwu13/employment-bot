import { chromium } from 'playwright';
import * as cheerio from 'cheerio';
import { Logger } from '../utils/logger.js';
import { SITE_HANDLERS, COOKIE_DISMISS_SELECTORS } from '../lib/siteHandlers.js';

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

      // Wait a bit for dynamic content
      await page.waitForTimeout(2000);

      // Dismiss cookie banners BEFORE extracting content
      await this.dismissCookieBanners(page);

      // Auto-scroll to trigger lazy-loading
      await this.autoscroll(page);

      // Get page content
      const html = await page.content();

      // Extract data using site-specific handler
      const jobContent = await this.extractData(html, finalUrl, handler);

      // Validate extraction quality
      this.validateExtraction(jobContent);

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
  async extractData(pageHTML, url, handler) {
    const $ = cheerio.load(pageHTML);
    const selectors = handler.selectors;

    // Extract title using site-specific selectors
    const title = this.extractWithFallback($, selectors.title) ||
      this.extractFromTitle($) ||
      '';

    // Extract company
    const company = this.extractWithFallback($, selectors.company) || this.extractCompanyFromUrl(url) || '';

    // Extract location
    const location = this.extractWithFallback($, selectors.location) || '';

    // Extract qualifications
    const qualifications = this.extractWithFallback($, selectors.qualifications) || '';

    // Extract skills from various sections
    const bodyText = $('body').text();
    const skills = this.extractSkills($, bodyText);

    // Try to extract posted date
    const postedDate = this.extractPostedDate($, bodyText);

    return {
      url: url,
      title: this.cleanText(title),
      company: this.cleanText(company),
      location: this.cleanText(location),
      qualifications: this.cleanText(qualifications).substring(0, 1500),
      skills: skills,
      postedDate: postedDate,
      _extractedBy: handler.name // For debugging
    };
  }

  // Try multiple selectors and return first match
  extractWithFallback($, selectorString) {
    if (!selectorString) return null;

    const selectors = selectorString.split(', ');
    for (const selector of selectors) {
      try {
        const elem = $(selector.trim()).first();
        if (elem.length) {
          const text = elem.text().trim();
          // Skip if it looks like cookie/consent content
          if (text && !this.looksLikeCookieContent(text)) {
            return text;
          }
        }
      } catch (e) {
        // Invalid selector, try next
      }
    }
    return null;
  }

  // Extract title from page <title> tag as fallback
  extractFromTitle($) {
    const pageTitle = $('title').text();
    if (!pageTitle) return null;

    // Common patterns: "Job Title | Company" or "Job Title - Company"
    const parts = pageTitle.split(/\s*[\|–-]\s*/);
    if (parts.length > 0) {
      const title = parts[0].trim();
      // Skip if it looks like a generic page title
      if (!title.match(/^(home|jobs|careers|apply)/i)) {
        return title;
      }
    }
    return null;
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

  // Validate extraction quality and log warnings
  validateExtraction(data) {
    const warnings = [];

    if (!data.title || data.title.length < 5) {
      warnings.push('Title extraction may have failed');
    }

    if (this.looksLikeCookieContent(data.title)) {
      warnings.push('Title looks like cookie content!');
    }

    if (!data.location) {
      warnings.push('Location not found');
    }

    if (warnings.length > 0) {
      Logger.warn(`[JobScraper] Quality warnings: ${warnings.join(', ')}`);
    }
  }

  cleanText(text) {
    if (!text) return '';
    return text
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, ' ')
      .replace(/\t+/g, ' ')
      .trim()
      .substring(0, 500);
  }

  extractCompanyFromUrl(url) {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.replace('www.', '');
      const parts = hostname.split('.');

      // Skip common job board domains
      const skipDomains = ['workdayjobs', 'myworkdayjobs', 'lever', 'greenhouse', 'jobvite', 'smartrecruiters'];
      for (const skip of skipDomains) {
        if (hostname.includes(skip)) {
          // Try to get company from subdomain or path
          if (parts[0] && !skipDomains.includes(parts[0])) {
            return parts[0];
          }
          const pathParts = urlObj.pathname.split('/').filter(Boolean);
          if (pathParts.length > 0) {
            return pathParts[0];
          }
        }
      }

      return parts.length > 1 ? parts[parts.length - 2] : parts[0];
    } catch {
      return '';
    }
  }

  extractSkills($, bodyText) {
    const skills = [];

    const skillPatterns = [
      /\b(JavaScript|TypeScript|Python|Java|C\+\+|React|Node\.js|SQL|AWS|Docker|Kubernetes)\b/gi,
      /\b(HTML|CSS|Git|Linux|MongoDB|PostgreSQL|Redis|GraphQL|REST|API)\b/gi,
      /\b(Agile|Scrum|CI\/CD|DevOps|Machine Learning|AI|Cloud|Microservices)\b/gi
    ];

    const searchText = bodyText.substring(0, 10000); // Limit search area

    skillPatterns.forEach(pattern => {
      const matches = searchText.match(pattern);
      if (matches) {
        matches.forEach(skill => {
          if (!skills.includes(skill) && skills.length < 10) {
            skills.push(skill.toLowerCase());
          }
        });
      }
    });

    return skills;
  }

  extractPostedDate($, bodyText) {
    const dateMetaSelectors = [
      'meta[property="article:published_time"]',
      'meta[name="date"]',
      'meta[property="og:updated_time"]'
    ];

    for (const selector of dateMetaSelectors) {
      const dateStr = $(selector).attr('content');
      if (dateStr) {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    }

    const dateMatch = bodyText.match(/Posted:?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i) ||
      bodyText.match(/Date:?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i);

    if (dateMatch) {
      const date = new Date(dateMatch[1]);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    return new Date();
  }
}
