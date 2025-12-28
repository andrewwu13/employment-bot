import { chromium } from 'playwright';
import * as cheerio from 'cheerio';

export class JobScraper {
  constructor(options = {}) {
    this.timeout = options.timeout ?? 30000;
    this.waitForNetworkIdle = options.waitForNetworkIdle ?? true;
    this.headless = options.headless ?? true;
  }

  async scrape(url) {
    const browser = await chromium.launch({ headless: this.headless });
    
    // Setting up a user agent to avoid detection 
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    
    const page = await context.newPage();
    
    try {
      console.log(`Navigating to ${url}...`);
      
      // Navigate to page
      await page.goto(url, { 
        waitUntil: this.waitForNetworkIdle ? 'networkidle' : 'domcontentloaded',
        timeout: this.timeout 
      });
      
      // Optional: Wait a bit for dynamic content to load
      await page.waitForTimeout(2000);
      
      // Optional: Auto-scroll to trigger lazy-loading
      await this.autoscroll(page);
      
      // Download page content
      const html = await page.content();
      
      // Extract data
      const jobContent = await this.extractData(html, url);
      
      console.log('Extracted job content:', JSON.stringify(jobContent, null, 2));
      return jobContent;
      
    } catch (error) {
      console.error('Error during scraping:', error.message);
      throw error;
    } finally {
      await browser.close();
    }
  }

  // Auto-scrolls the page to trigger lazy-loading
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

  // Extracts text data from a job posting page
  async extractData(pageHTML, url) {
    const $ = cheerio.load(pageHTML);
    
    // Extract the main job title (usually in h1 or h2)
    const title = $('h1, h2').first().text().trim() || 
                  $('[class*="title"], [class*="job-title"]').first().text().trim();
    
    // Extract all text content from the main body
    const bodyText = $('body').text();
    
    // Try to extract structured fields based on common patterns
    const jobData = {
      url: url,
      title: title,
      rawText: bodyText.replace(/\s+/g, ' ').trim(),
      
      // Extract location
      location: this.extractField(bodyText, /Location:\s*(.+?)(?:\n|Req)/i),
      
      // Extract requisition/job ID
      reqId: this.extractField(bodyText, /Req(?:uisition)?\s*(?:ID|#)?:\s*(\S+)/i),
      
      // Extract status
      status: this.extractField(bodyText, /Status:\s*(.+?)(?:\n|Education)/i),
      
      // Extract wage/salary
      wage: this.extractField(bodyText, /Wage:\s*(.+?)(?:\n|Electrify)/i) ||
             this.extractField(bodyText, /Salary:\s*(.+?)(?:\n|\.|$)/i),
      
      // Extract education level
      education: this.extractField(bodyText, /Education Level:\s*(.+?)(?:\n|Base)/i),
      
      // Extract base location
      baseLocation: this.extractField(bodyText, /Base Location:\s*(.+?)(?:\n|Position)/i),
      
      // Extract position type
      positionType: this.extractField(bodyText, /Position Type:\s*(.+?)(?:\n|Travel)/i),
      
      // Extract travel requirement
      travel: this.extractField(bodyText, /Travel:\s*(.+?)(?:\n|Deadline)/i),
      
      // Extract deadline
      deadline: this.extractField(bodyText, /Deadline to Apply:\s*(.+?)(?:\n|Wage)/i),
      
      // Extract full description (everything after key details)
      description: this.extractDescription($),
      
      // Extract qualifications
      qualifications: this.extractSection($, bodyText, 'QUALIFICATIONS'),
      
      // Extract key accountabilities/responsibilities
      responsibilities: this.extractSection($, bodyText, 'KEY ACCOUNTABILITIES'),
      
      // Extract application instructions
      applicationInstructions: this.extractSection($, bodyText, 'APPLYING TO'),
      
      // Metadata
      scrapedAt: new Date().toISOString(),
      textLength: bodyText.length
    };
    
    return jobData;
  }

  // Helper to extract a field using regex
  extractField(text, regex) {
    const match = text.match(regex);
    return match ? match[1].trim() : null;
  }

  // Helper to extract description section
  extractDescription($) {
    // Look for common description containers
    const descriptionSelectors = [
      '[class*="description"]',
      '[class*="job-description"]',
      '[class*="content"]',
      'article',
      'main'
    ];
    
    for (const selector of descriptionSelectors) {
      const elem = $(selector);
      if (elem.length) {
        return elem.text().trim().replace(/\s+/g, ' ').substring(0, 2000);
      }
    }
    
    return null;
  }

  // Helper to extract sections by heading
  extractSection($, text, heading) {
    const regex = new RegExp(`${heading}([\\s\\S]*?)(?=\\n[A-Z][A-Z\\s]+:|$)`, 'i');
    const match = text.match(regex);
    
    if (match) {
      return match[1].trim().replace(/\s+/g, ' ').substring(0, 1500);
    }
    
    return null;
  }
}

// Example usage:
// const scraper = new JobScraper({ headless: true });
// const jobDetails = await scraper.scrape('https://opg.com/careers/job-posting-url');
// console.log(jobDetails);
