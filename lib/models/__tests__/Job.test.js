import { describe, it, expect } from '@jest/globals';
import { Job } from '../Job.js';

describe('Job Model', () => {
  describe('constructor', () => {
    it('should create a Job instance with all fields from enriched data', () => {
      // Mirrors the enriched job shape that ScrapeService produces
      const jobData = {
        jobTitle: 'Software Engineer',
        companyName: 'Test Co',
        applyLink: 'https://example.com/job',
        emailSubject: 'Job Alert',
        emailDate: '2026-01-06',
        scrapedData: {
          url: 'https://example.com/job',
          location: 'Remote',
          skills: ['JavaScript', 'Node.js'],
          qualifications: 'Bachelor degree',
          postedDate: new Date('2026-01-06')
        }
      };

      const job = new Job(jobData);

      expect(job.url).toBe('https://example.com/job');
      expect(job.title).toBe('Software Engineer');
      expect(job.company).toBe('Test Co');
      expect(job.location).toBe('Remote');
      expect(job.skills).toEqual(['JavaScript', 'Node.js']);
      expect(job.qualifications).toBe('Bachelor degree');
      expect(job.postedDate).toEqual(jobData.scrapedData.postedDate);
      expect(job.emailSubject).toBe('Job Alert');
      expect(job.emailDate).toBe('2026-01-06');
    });

    it('should use default values for missing fields', () => {
      const job = new Job({});

      expect(job.url).toBe('');
      expect(job.title).toBe('');
      expect(job.company).toBe('');
      expect(job.location).toBe('');
      expect(job.skills).toEqual([]);
      expect(job.qualifications).toBe('');
      expect(job.postedDate).toBeInstanceOf(Date);
      expect(job.status).toBe('pending');
      expect(job.emailSubject).toBe('');
      expect(job.emailDate).toBe('');
    });

    it('should handle flat data without scrapedData', () => {
      // When no scrapedData is present, sourceData falls back to data itself
      const jobData = {
        jobTitle: 'Software Engineer',
        companyName: 'Test Co',
        url: 'https://example.com/job',
        location: 'Remote',
        skills: ['Python']
      };

      const job = new Job(jobData);

      expect(job.title).toBe('Software Engineer');
      expect(job.company).toBe('Test Co');
      expect(job.url).toBe('https://example.com/job');
      expect(job.location).toBe('Remote');
      expect(job.skills).toEqual(['Python']);
    });

    it('should prefer applyLink when url is missing', () => {
      const job = new Job({ applyLink: 'https://example.com/apply' });

      expect(job.url).toBe('https://example.com/apply');
    });
  });

  describe('toFirestore', () => {
    it('should convert Job to a plain object with expected keys', () => {
      const jobData = {
        jobTitle: 'Software Engineer',
        companyName: 'Test Co',
        scrapedData: {
          url: 'https://example.com/job',
          location: 'Remote',
          skills: ['JavaScript', 'Node.js'],
          qualifications: 'Bachelor degree',
          postedDate: new Date('2026-01-06')
        }
      };

      const job = new Job(jobData);
      const firestoreObj = job.toFirestore();

      expect(firestoreObj).not.toBeInstanceOf(Job);
      expect(firestoreObj.url).toBe('https://example.com/job');
      expect(firestoreObj.title).toBe('Software Engineer');
      expect(firestoreObj.company).toBe('Test Co');
      expect(firestoreObj.location).toBe('Remote');
      expect(firestoreObj.skills).toEqual(['JavaScript', 'Node.js']);
      expect(firestoreObj.qualifications).toBe('Bachelor degree');
    });

    it('should include all expected fields in Firestore object', () => {
      const job = new Job({
        jobTitle: 'Test Job',
        companyName: 'Test Co'
      });

      const firestoreObj = job.toFirestore();

      expect(firestoreObj).toHaveProperty('url');
      expect(firestoreObj).toHaveProperty('title');
      expect(firestoreObj).toHaveProperty('company');
      expect(firestoreObj).toHaveProperty('location');
      expect(firestoreObj).toHaveProperty('skills');
      expect(firestoreObj).toHaveProperty('qualifications');
      expect(firestoreObj).toHaveProperty('postedDate');
      expect(firestoreObj).toHaveProperty('status');
      expect(firestoreObj).toHaveProperty('createdAt');
      expect(firestoreObj).toHaveProperty('emailSubject');
      expect(firestoreObj).toHaveProperty('emailDate');
    });

    it('should preserve empty arrays and strings for missing data', () => {
      const job = new Job({});
      const firestoreObj = job.toFirestore();

      expect(firestoreObj.url).toBe('');
      expect(firestoreObj.title).toBe('');
      expect(firestoreObj.skills).toEqual([]);
      expect(firestoreObj.qualifications).toBe('');
    });
  });

  describe('data integrity', () => {
    it('should produce a plain object from toFirestore', () => {
      const jobData = {
        jobTitle: 'Software Engineer',
        companyName: 'Test Co',
        skills: ['JavaScript', 'Node.js']
      };

      const job = new Job(jobData);
      const firestoreObj = job.toFirestore();

      // toFirestore should produce an object with the expected keys
      expect(firestoreObj).toHaveProperty('title', 'Software Engineer');
      expect(firestoreObj).toHaveProperty('company', 'Test Co');
      expect(firestoreObj.skills).toEqual(['JavaScript', 'Node.js']);
    });

    it('should handle Date objects correctly', () => {
      const testDate = new Date('2026-01-06T12:00:00Z');
      const job = new Job({ postedDate: testDate });

      expect(job.postedDate).toEqual(testDate);
      expect(job.toFirestore().postedDate).toEqual(testDate);
    });

    it('should handle arrays correctly', () => {
      const skills = ['JavaScript', 'TypeScript', 'Node.js'];
      const job = new Job({ skills });

      expect(job.skills).toEqual(skills);
      expect(Array.isArray(job.skills)).toBe(true);
    });
  });
});
