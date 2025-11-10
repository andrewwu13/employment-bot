// chromium - headless browser
import { chromium } from 'playwright';

export async function scrape() {
  const browser = await chromium.launch();

  // setting up a user agent to avoid detection 
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'
  });

  const page = await context.newPage();
  await page.goto('https://www.scrapethissite.com');

  const pageTitle = await page.title()
  console.log(pageTitle)

  const elementText = await page.$eval('h1', el => el.textContent); 
  console.log(elementText);

  await browser.close();

  return { pageTitle, elementText }
}

