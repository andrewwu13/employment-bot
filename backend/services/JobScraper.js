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

  // Extracts text data from a job posting page and formats to match Job.js model
  async extractData(pageHTML, url) {
    const $ = cheerio.load(pageHTML);
    
    // Extract the main job title (usually in h1 or h2)
    const title = this.cleanText(
      $('h1, h2').first().text() || 
      $('[class*="title"], [class*="job-title"]').first().text() ||
      ''
    );
    
    // Extract company name
    const company = this.cleanText(
      $('[class*="company"]').first().text() ||
      $('meta[property="og:site_name"]').attr('content') ||
      this.extractCompanyFromUrl(url) ||
      ''
    );
    
    // Extract all text content from the main body
    const bodyText = $('body').text();
    
    // Extract location (multiple patterns)
    const location = this.cleanText(
      this.extractField(bodyText, /Location:\s*(.+?)(?:\n|Req|,)/i) ||
      this.extractField(bodyText, /\b(Remote|Hybrid|On-?site)\b/i) ||
      $('[class*="location"]').first().text() ||
      ''
    );
    
    // Extract description with better formatting
    const description = this.buildDescription($, bodyText);
    
    // Extract qualifications
    const qualifications = this.extractQualifications($, bodyText);
    
    // Extract skills from various sections
    const skills = this.extractSkills($, bodyText);
    
    // Try to extract or estimate posted date
    const postedDate = this.extractPostedDate($, bodyText);
    
    // Return data matching Job.js model
    const jobData = {
      url: url,
      title: title,
      company: company,
      location: location,
      description: description,
      qualifications: qualifications,
      skills: skills,
      postedDate: postedDate
    };
    
    return jobData;
  }

  // Clean and normalize text
  cleanText(text) {
    if (!text) return '';
    return text
      .replace(/\s+/g, ' ')      // Replace multiple spaces with single space
      .replace(/\n+/g, ' ')      // Replace newlines with space
      .replace(/\t+/g, ' ')      // Replace tabs with space
      .trim()                     // Remove leading/trailing whitespace
      .substring(0, 500);        // Limit length
  }

  // Extract company name from URL
  extractCompanyFromUrl(url) {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.replace('www.', '');
      const parts = hostname.split('.');
      // Get main domain name (e.g., "google" from "careers.google.com")
      return parts.length > 1 ? parts[parts.length - 2] : parts[0];
    } catch {
      return '';
    }
  }

  // Build comprehensive description
  buildDescription($, bodyText) {
    // Try multiple selectors for description
    const descriptionSelectors = [
      '[class*="description"]',
      '[class*="job-description"]',
      '[class*="content"]',
      '[class*="summary"]',
      'article',
      'main'
    ];
    
    let description = '';
    for (const selector of descriptionSelectors) {
      const elem = $(selector);
      if (elem.length) {
        description = elem.text();
        break;
      }
    }
    
    // If no specific description found, extract from sections
    if (!description) {
      const overview = this.extractSection($, bodyText, 'OVERVIEW|ABOUT|DESCRIPTION');
      const responsibilities = this.extractSection($, bodyText, 'RESPONSIBILITIES|DUTIES|ACCOUNTABILITIES');
      description = [overview, responsibilities].filter(Boolean).join(' ');
    }
    
    return this.cleanText(description).substring(0, 2000);
  }

  // Extract qualifications with better formatting
  extractQualifications($, bodyText) {
    const qualText = this.extractSection($, bodyText, 'QUALIFICATIONS|REQUIREMENTS|REQUIRED|MUST HAVE');
    
    if (!qualText) {
      // Try to find bullet points or lists
      const qualLists = $('ul, ol').filter((i, el) => {
        const text = $(el).text().toLowerCase();
        return text.includes('qualif') || text.includes('require') || text.includes('experience');
      });
      
      if (qualLists.length) {
        const items = [];
        qualLists.first().find('li').each((i, el) => {
          items.push(this.cleanText($(el).text()));
        });
        return items.join(' • ');
      }
    }
    
    return this.cleanText(qualText || '').substring(0, 1500);
  }

  // Extract skills from the page
  extractSkills($, bodyText) {
    const skills = [];
    
    // Common skill keywords to look for
    const skillPatterns = [
      /\b(JavaScript|TypeScript|Python|Java|C\+\+|React|Node\.js|SQL|AWS|Docker|Kubernetes)\b/gi,
      /\b(HTML|CSS|Git|Linux|MongoDB|PostgreSQL|Redis|GraphQL|REST|API)\b/gi,
      /\b(Agile|Scrum|CI\/CD|DevOps|Machine Learning|AI|Cloud|Microservices)\b/gi
    ];
    
    // Extract from skills section
    const skillsSection = this.extractSection($, bodyText, 'SKILLS|TECHNOLOGIES|TECHNICAL');
    if (skillsSection) {
      skillPatterns.forEach(pattern => {
        const matches = skillsSection.match(pattern);
        if (matches) {
          matches.forEach(skill => {
            if (!skills.includes(skill)) {
              skills.push(skill);
            }
          });
        }
      });
    }
    
    // Also check requirements section
    const reqSection = this.extractSection($, bodyText, 'REQUIREMENTS|QUALIFICATIONS');
    if (reqSection) {
      skillPatterns.forEach(pattern => {
        const matches = reqSection.match(pattern);
        if (matches) {
          matches.forEach(skill => {
            if (!skills.includes(skill) && skills.length < 10) {
              skills.push(skill);
            }
          });
        }
      });
    }
    
    return skills.slice(0, 10); // Limit to 10 skills
  }

  // Extract or estimate posted date
  extractPostedDate($, bodyText) {
    // Try to find date in meta tags
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
    
    // Try to extract from text
    const dateMatch = bodyText.match(/Posted:?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i) ||
                     bodyText.match(/Date:?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i);
    
    if (dateMatch) {
      const date = new Date(dateMatch[1]);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    
    // Default to now if not found
    return new Date();
  }

  // Helper to extract a field using regex
  extractField(text, regex) {
    const match = text.match(regex);
    return match ? match[1].trim() : null;
  }

  // Helper to extract sections by heading (supports multiple patterns)
  extractSection($, text, headingPattern) {
    const regex = new RegExp(`(${headingPattern})([\\s\\S]*?)(?=\\n[A-Z][A-Z\\s]+:|$)`, 'i');
    const match = text.match(regex);
    
    if (match) {
      return match[2].trim().replace(/\s+/g, ' ').substring(0, 1500);
    }
    
    return null;
  }
}

// Example usage:
// const scraper = new JobScraper({ headless: true });
// const jobDetails = await scraper.scrape('https://opg.com/careers/job-posting-url');
// console.log(jobDetails);
