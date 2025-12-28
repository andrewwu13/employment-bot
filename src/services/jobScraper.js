import { chromium } from 'playwright';
import * as cheerio from 'cheerio';

export class JobScraper {
  constructor(options = {}) {
    this.timeout = options.timeout ?? 30000;
    this.waitForNetworkIdle = options.waitForNetworkIdle ?? true;
    this.headless = options.headless ?? true;
  }

  async scrape(url) {
    const browser = await chromium.launch( this.headless );

    // setting up a user agent to avoid detection 
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'
    });

    const page = await context.newPage();

    try {
      console.log(`Navigating to ${url}...`);

      // navigating to page
      await page.goto(url, { 
        waitUntil: this.waitForNetworkIdle ? 'networkidle' : 'domcontentloaded',
        timeout: this.timeout 
      });

      // downloading page content
      const html = await page.content();

      // extracting data
      const jobContent = await this.extractData(html);

      console.log(jobContent)

    } catch {
      console.log("an error happened somewhere")
    }

    await browser.close();
    
  }

  // autoscrolls the page to trigger lazy-loading
  async autoscroll(page) {
    return null 
  }

  // extracts text data from the page
  async extractData(pageHTML) {

    console.log(pageHTML)
    const $ = cheerio.load(pageHTML);
    const contents = $('div').contents();

    console.log(contents)

    return contents.length();
  }

}
