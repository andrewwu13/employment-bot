// read and writes from the firebase DB
import { db } from '../config/firebaseConfig.js';
import { Job } from '../models/Job.js';
import { Logger } from '../utils/logger.js';

import dotenv from 'dotenv';
dotenv.config();

export class DatabaseService {
  constructor() {

  }

  // Helper to get the correct Firestore collection based on DEV_MODE
  _getCollection() {
    return process.env.DEV_MODE === 'true' ? 'test_postings' : 'job_postings';
  }

  // read from firestore DB
  async read(docId) {
    try {
      const docRef = db.collection(this._getCollection()).doc(docId);
      const doc = await docRef.get();

      if (!doc.exists) {
        Logger.info("No such document!");
        return null;
      }

      return { id: doc.id, ...doc.data() };
    } catch (error) {
      Logger.error("Error reading document: ", error);
      throw error;
    }
  }

  // Get all pending jobs
  async getPendingJobs(limit = 10) {
    try {
      const snapshot = await db.collection(this._getCollection())
        .where("status", "==", "pending")
        .limit(limit)
        .get();

      const jobs = [];
      snapshot.forEach(doc => {
        jobs.push({ id: doc.id, ...doc.data() });
      });

      return jobs;
    } catch (error) {
      Logger.error("Error getting pending jobs: ", error);
      throw error;
    }
  }

  // Claim jobs by marking them as 'posting' so other cron runs won't pick them up
  async markJobsAsPosting(jobIds) {
    const batch = db.batch();
    for (const id of jobIds) {
      batch.update(db.collection(this._getCollection()).doc(id), { status: "posting" });
    }
    await batch.commit();
  }

  // Revert a job back to pending if posting fails
  async markJobAsFailed(docId) {
    try {
      await db.collection(this._getCollection()).doc(docId).update({
        status: "pending"
      });
    } catch (error) {
      Logger.error("Error reverting job status: ", error);
    }
  }

  // Mark job as posted
  async markJobAsPosted(docId) {
    try {
      await db.collection(this._getCollection()).doc(docId).update({
        status: "posted",
        postedAt: new Date()
      });

      Logger.info("Document updated: ", docId);
      return docId;
    } catch (error) {
      Logger.error("Error updating document: ", error);
      throw error;
    }
  }

  async write(jobData) {
    try {
      // convert to Job model object
      // this essentially "cleans" the JSON as there will be a bunch of other info we don't need, maintains consistency
      const job = jobData instanceof Job ? jobData : new Job(jobData);

      // add to DB using firebase-admin syntax
      const docRef = await db.collection(this._getCollection()).add(job.toFirestore());

      Logger.info("Document written with ID: ", docRef.id);

      return docRef.id;
    } catch (error) {
      Logger.error("Error adding document: ", error);
      throw error;
    }
  }

}
