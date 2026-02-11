import { jest } from '@jest/globals';

// ESM-compatible mocking: must use jest.unstable_mockModule before dynamic import
const mockCollection = {
  add: jest.fn(),
  doc: jest.fn(),
  where: jest.fn(),
  limit: jest.fn()
};

const mockDb = {
  collection: jest.fn(() => mockCollection)
};

jest.unstable_mockModule('../../config/firebaseConfig.js', () => ({
  db: mockDb
}));

// Dynamic import AFTER mock registration
const { DatabaseService } = await import('../DatabaseService.js');

describe('DatabaseService', () => {
  let dbService;
  let mockDoc;
  let mockQuery;

  beforeEach(() => {
    mockDoc = {
      get: jest.fn(),
      update: jest.fn()
    };

    mockQuery = {
      where: jest.fn(),
      limit: jest.fn(),
      get: jest.fn()
    };

    // Wire up chaining
    mockCollection.doc.mockReturnValue(mockDoc);
    mockCollection.where.mockReturnValue(mockQuery);
    mockQuery.where.mockReturnValue(mockQuery);
    mockQuery.limit.mockReturnValue(mockQuery);

    dbService = new DatabaseService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('write', () => {
    it('should write job data to Firestore', async () => {
      mockCollection.add.mockResolvedValue({ id: 'doc-123' });

      const jobData = {
        jobTitle: 'Software Engineer',
        companyName: 'Test Co',
        applyLink: 'https://example.com/job',
        scrapedData: {
          url: 'https://example.com/job',
          location: 'Remote',
          qualifications: 'Bachelor degree',
          skills: ['JavaScript', 'Node.js'],
          postedDate: new Date()
        }
      };

      const docId = await dbService.write(jobData);

      expect(docId).toBe('doc-123');
      expect(mockCollection.add).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://example.com/job',
          title: 'Software Engineer',
          company: 'Test Co'
        })
      );
    });

    it('should handle Job model instances', async () => {
      const { Job } = await import('../../models/Job.js');
      const job = new Job({
        jobTitle: 'Software Engineer',
        companyName: 'Test Co',
        applyLink: 'https://example.com/job'
      });

      mockCollection.add.mockResolvedValue({ id: 'doc-456' });

      const docId = await dbService.write(job);

      expect(docId).toBe('doc-456');
      expect(mockCollection.add).toHaveBeenCalled();
    });

    it('should throw error on write failure', async () => {
      mockCollection.add.mockRejectedValue(new Error('Write failed'));

      const jobData = { jobTitle: 'Test Job', companyName: 'Co' };

      await expect(dbService.write(jobData)).rejects.toThrow('Write failed');
    });
  });

  describe('read', () => {
    it('should read a document by ID', async () => {
      const mockData = {
        title: 'Software Engineer',
        company: 'Test Co',
        location: 'Remote'
      };

      mockDoc.get.mockResolvedValue({
        exists: true,
        id: 'doc-123',
        data: () => mockData
      });

      const result = await dbService.read('doc-123');

      expect(result).toEqual({
        id: 'doc-123',
        ...mockData
      });
      expect(mockCollection.doc).toHaveBeenCalledWith('doc-123');
    });

    it('should return null for non-existent document', async () => {
      mockDoc.get.mockResolvedValue({
        exists: false
      });

      const result = await dbService.read('non-existent');

      expect(result).toBeNull();
    });

    it('should throw error on read failure', async () => {
      mockDoc.get.mockRejectedValue(new Error('Read failed'));

      await expect(dbService.read('doc-123')).rejects.toThrow('Read failed');
    });
  });

  describe('getPendingJobs', () => {
    it('should fetch pending jobs with default limit', async () => {
      const mockJobs = [
        { id: 'job-1', title: 'Job 1', status: 'pending' },
        { id: 'job-2', title: 'Job 2', status: 'pending' }
      ];

      const mockSnapshot = {
        forEach: jest.fn((callback) => {
          mockJobs.forEach((job) => {
            callback({
              id: job.id,
              data: () => ({ title: job.title, status: job.status })
            });
          });
        })
      };

      mockQuery.get.mockResolvedValue(mockSnapshot);

      const result = await dbService.getPendingJobs();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'job-1',
        title: 'Job 1',
        status: 'pending'
      });
      expect(mockCollection.where).toHaveBeenCalledWith('status', '==', 'pending');
      expect(mockQuery.limit).toHaveBeenCalledWith(10);
    });

    it('should fetch pending jobs with custom limit', async () => {
      const mockSnapshot = { forEach: jest.fn() };
      mockQuery.get.mockResolvedValue(mockSnapshot);

      await dbService.getPendingJobs(5);

      expect(mockQuery.limit).toHaveBeenCalledWith(5);
    });

    it('should return empty array when no pending jobs', async () => {
      const mockSnapshot = { forEach: jest.fn() };
      mockQuery.get.mockResolvedValue(mockSnapshot);

      const result = await dbService.getPendingJobs();

      expect(result).toEqual([]);
    });

    it('should throw error on query failure', async () => {
      mockQuery.get.mockRejectedValue(new Error('Query failed'));

      await expect(dbService.getPendingJobs()).rejects.toThrow('Query failed');
    });
  });

  describe('markJobsAsPosting', () => {
    it('should batch-update multiple jobs to posting status', async () => {
      const mockBatch = {
        update: jest.fn(),
        commit: jest.fn().mockResolvedValue()
      };
      mockDb.batch = jest.fn(() => mockBatch);

      await dbService.markJobsAsPosting(['job-1', 'job-2', 'job-3']);

      expect(mockBatch.update).toHaveBeenCalledTimes(3);
      expect(mockBatch.commit).toHaveBeenCalled();
    });
  });

  describe('markJobAsFailed', () => {
    it('should revert job status to pending', async () => {
      mockDoc.update.mockResolvedValue();

      await dbService.markJobAsFailed('doc-123');

      expect(mockDoc.update).toHaveBeenCalledWith({ status: 'pending' });
      expect(mockCollection.doc).toHaveBeenCalledWith('doc-123');
    });
  });

  describe('markJobAsPosted', () => {
    it('should update job status to posted', async () => {
      mockDoc.update.mockResolvedValue();

      const result = await dbService.markJobAsPosted('doc-123');

      expect(result).toBe('doc-123');
      expect(mockDoc.update).toHaveBeenCalledWith({
        status: 'posted',
        postedAt: expect.any(Date)
      });
      expect(mockCollection.doc).toHaveBeenCalledWith('doc-123');
    });

    it('should throw error on update failure', async () => {
      mockDoc.update.mockRejectedValue(new Error('Update failed'));

      await expect(dbService.markJobAsPosted('doc-123')).rejects.toThrow('Update failed');
    });
  });
});
