// chromium - headless browser
import { chromium } from 'playwright';
import { mockPostings } from './mockData.js';
import { db } from '../config/firebaseConfig.js';
import { collection, addDoc } from 'firebase/firestore';
import { JobScraper } from './jobScraper.js';

export async function scrape() {

  // initializing new job scraper
  const scraper = new JobScraper();

  scraper.scrape(mockPostings[0].postingLink)

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
