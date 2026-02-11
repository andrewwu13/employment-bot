import { chromium } from 'playwright';
import * as cheerio from 'cheerio';
import { Logger } from '../utils/logger.js';

const url = "https://boards.greenhouse.io/embed/job_app?token=5712997004&utm_source=jobright&jr_id=691f0925a49a885af9a2bda5";

const browser = await chromium.launch({ headless: true });

const context = await browser.newContext({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
});

const page = await context.newPage();

await page.goto(url);

const html = await page.content();
const $ = cheerio.load(html);
  
// Try to extract JSON-LD structured data first (best source)
const jsonLdScript = $('script[type="application/ld+json"]').html();
const JSONData = JSON.parse(jsonLdScript);

//Logger.info(JSONData);

await browser.close();

async function extractData(pageHTML, url) {
  const $ = cheerio.load(pageHTML);
  const jsonLdScript = $('script[type="application/ld+json"]').html();
  const JSONData = JSON.parse(jsonLdScript);

  return {
    url: url,
    title: JSONData.title,
    company: JSONData.hiringOrganization.name,
    location: JSONData.jobLocation.address.addressLocality,
    qualifications: '',
    skills: '',
    postedDate: JSONData.datePosted,
  };
}

console.log(await extractData(html, url));
