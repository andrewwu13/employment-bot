import { chromium } from 'playwright';
import * as cheerio from 'cheerio';
import { allSkills } from './constants.js'; 

const url = "https://careers.trccompanies.com/jobs/25291?lang=en-us&iis=Job+Board&iisn=jobright&jr_id=698c0e590f6f7e7a2ce79f25";

const browser = await chromium.launch({ headless: true });

const context = await browser.newContext({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
});

const page = await context.newPage();
await page.goto(url);
const html = await page.content();
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
    skills: extractSkills(JSONData.description),
    postedDate: JSONData.datePosted,
  };
}

function extractSkills(description) {
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

console.log(await extractData(html, url));
