// read and writes from the firebase DB
import { db } from '../config/firebaseConfig.js';
import { Job } from '../models/Job.js';

export class DatabaseService {
  constructor() {

  }

  // read from firestore DB
  async read(docId) {
    try {
      const docRef = db.collection("job_postings").doc(docId);
      const doc = await docRef.get();
      
      if (!doc.exists) {
        console.log("No such document!");
        return null;
      }
      
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error("Error reading document: ", error);
      throw error;
    }
  }

  // Get all pending jobs
  async getPendingJobs(limit = 10) {
    try {
      const snapshot = await db.collection("job_postings")
        .where("status", "==", "pending")
        .limit(limit)
        .get();
      
      const jobs = [];
      snapshot.forEach(doc => {
        jobs.push({ id: doc.id, ...doc.data() });
      });
      
      return jobs;
    } catch (error) {
      console.error("Error getting pending jobs: ", error);
      throw error;
    }
  }

  // Mark job as posted
  async markJobAsPosted(docId) {
    try {
      await db.collection("job_postings").doc(docId).update({
        status: "posted",
        postedAt: new Date()
      });
      
      console.log("Document updated: ", docId);
      return docId;
    } catch (error) {
      console.error("Error updating document: ", error);
      throw error;
    }
  }

  async write(jobData) {
    try {
      // convert to Job model object
      // this essentially "cleans" the JSON as there will be a bunch of other info we don't need, maintains consistency
      const job = jobData instanceof Job ? jobData : new Job(jobData);
      
      // add to DB using firebase-admin syntax
      const docRef = await db.collection("job_postings").add(job.toFirestore());

      console.log("Document written with ID: ", docRef.id);

      return docRef.id;
    } catch (error) {
      console.error("Error adding document: ", error);
      throw error;
    }
  }
  
}
