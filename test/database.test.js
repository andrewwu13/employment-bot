// Run this file with `node test/database.test.js`

import { databaseService } from '@repo/database'; 

async function testDatabase() {
  try {
    // Attempt to read a document or get pending jobs
    // This is a placeholder and might need adjustment based on existing data in Firebase.
    const pendingJobs = await databaseService.getPostedJobs(1);
    console.log('Successfully queried database. Found pending jobs:', pendingJobs);

    // You can also try to read a specific document if you know its ID:
    // const docId = 'some-existing-doc-id';
    // const document = await databaseService.read(docId);
    // console.log('Successfully read document:', document);

  } catch (error) {
    console.error('Error querying database:', error);
  }
  // No explicit disconnect for Firebase, as it's typically managed by the app's lifecycle
}

testDatabase();
