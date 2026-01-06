import { describe, it, expect } from '@jest/globals';
import { Job } from '../Job.js';

describe('Job Model', () => {
  describe('constructor', () => {
    it('should create a Job instance with all fields', () => {
      const jobData = {
        url: 'https://example.com/job',
        skills: ['JavaScript', 'Node.js'],
        qualifications: 'Bachelor degree',
        title: 'Software Engineer',
        company: 'Test Co',
        location: 'Remote',
        description: 'Test job description',
        postedDate: new Date('2026-01-06')
      };

      const job = new Job(jobData);

      expect(job.url).toBe(jobData.url);
      expect(job.skills).toEqual(jobData.skills);
      expect(job.qualifications).toBe(jobData.qualifications);
      expect(job.title).toBe(jobData.title);
      expect(job.company).toBe(jobData.company);
      expect(job.location).toBe(jobData.location);
      expect(job.description).toBe(jobData.description);
      expect(job.postedDate).toBe(jobData.postedDate);
    });

    it('should use default values for missing fields', () => {
      const job = new Job({});

      expect(job.url).toBe('');
      expect(job.skills).toEqual([]);
      expect(job.qualifications).toBe('');
      expect(job.title).toBe('');
      expect(job.company).toBe('');
      expect(job.location).toBe('');
      expect(job.description).toBe('');
      expect(job.postedDate).toBeInstanceOf(Date);
    });

    it('should handle partial data', () => {
      const jobData = {
        title: 'Software Engineer',
        company: 'Test Co'
      };

      const job = new Job(jobData);

      expect(job.title).toBe('Software Engineer');
      expect(job.company).toBe('Test Co');
      expect(job.url).toBe('');
      expect(job.skills).toEqual([]);
    });
  });

  describe('toFirestore', () => {
    it('should convert Job to plain object', () => {
      const jobData = {
        url: 'https://example.com/job',
        skills: ['JavaScript', 'Node.js'],
        qualifications: 'Bachelor degree',
        title: 'Software Engineer',
        company: 'Test Co',
        location: 'Remote',
        description: 'Test job description',
        postedDate: new Date('2026-01-06')
      };

      const job = new Job(jobData);
      const firestoreObj = job.toFirestore();

      expect(firestoreObj).toEqual(jobData);
      expect(firestoreObj).not.toBeInstanceOf(Job);
    });

    it('should include all fields in Firestore object', () => {
      const job = new Job({
        title: 'Test Job',
        company: 'Test Co'
      });

      const firestoreObj = job.toFirestore();

      expect(firestoreObj).toHaveProperty('url');
      expect(firestoreObj).toHaveProperty('skills');
      expect(firestoreObj).toHaveProperty('qualifications');
      expect(firestoreObj).toHaveProperty('title');
      expect(firestoreObj).toHaveProperty('company');
      expect(firestoreObj).toHaveProperty('location');
      expect(firestoreObj).toHaveProperty('description');
      expect(firestoreObj).toHaveProperty('postedDate');
    });

    it('should preserve empty arrays and strings', () => {
      const job = new Job({});
      const firestoreObj = job.toFirestore();

      expect(firestoreObj.url).toBe('');
      expect(firestoreObj.skills).toEqual([]);
      expect(firestoreObj.qualifications).toBe('');
    });
  });

  describe('data integrity', () => {
    it('should not mutate original data on toFirestore', () => {
      const originalSkills = ['JavaScript', 'Node.js'];
      const jobData = {
        title: 'Software Engineer',
        skills: originalSkills
      };

      const job = new Job(jobData);
      const firestoreObj = job.toFirestore();

      firestoreObj.skills.push('Python');

      expect(job.skills).toEqual(['JavaScript', 'Node.js']);
      expect(originalSkills).toEqual(['JavaScript', 'Node.js']);
    });

    it('should handle Date objects correctly', () => {
      const testDate = new Date('2026-01-06T12:00:00Z');
      const job = new Job({ postedDate: testDate });

      expect(job.postedDate).toBe(testDate);
      expect(job.toFirestore().postedDate).toBe(testDate);
    });

    it('should handle arrays correctly', () => {
      const skills = ['JavaScript', 'TypeScript', 'Node.js'];
      const job = new Job({ skills });

      expect(job.skills).toEqual(skills);
      expect(Array.isArray(job.skills)).toBe(true);
    });
  });
});
