// chromium - headless browser
import { chromium } from 'playwright';
import { mockPostings } from './mockData.js';
import { db } from '../config/firebaseConfig.js';
import { collection, addDoc } from 'firebase/firestore';

export async function scrape(jobPostings) {
  /**
   * Scrapes a website and returns the page title and text of a specific element.
   * @param {object} jobPostings - An object containing the company title, and the job posting link. 
   */
  const browser = await chromium.launch();

  // setting up a user agent to avoid detection 
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'
  });

  for (let posting of jobPostings) {
    let page;
    try {
      console.log(`Scraping job posting for ${posting.company} at ${posting.postingLink}`);
      page = await context.newPage();
      await page.goto(posting.postingLink, { waitUntil: 'domcontentloaded' });

      const pageTitle = await page.title()
      console.log(pageTitle)

      const elementText = await page.$eval('h1', el => el.textContent); 
      console.log(elementText);

      console.log(pageTitle, elementText);

      addDbEntry({ company: posting.company, postingLink: posting.postingLink, title: pageTitle, content: elementText });

    } catch (error) {
      console.error(`Error scraping ${posting.company}:`, error.message);
      // Continue to next posting even if this one fails
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  await browser.close();
}

async function addDbEntry(data) {
  /**
   * Adds an entry to the Firestore database.
   * @param {object} data - The data to be added to the database.
   */

  try {
    const docRef = await addDoc(collection(db, "job_postings"), data);
    console.log("Document written with ID: ", docRef.id);
  } catch (error) {
    console.error("Error adding document: ", error); 
  }

} 

// run for node testing in isolation
if (import.meta.url === `file://${process.argv[1]}`) {
  scrape(mockPostings).catch(console.error);
}
