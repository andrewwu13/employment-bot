import { jest } from '@jest/globals';
import { DatabaseService } from '../DatabaseService.js';

// Mock the firebase config
jest.mock('../../config/firebaseConfig.js', () => ({
  db: {
    collection: jest.fn()
  }
}));

describe('DatabaseService', () => {
  let dbService;
  let mockCollection;
  let mockDoc;
  let mockQuery;

  beforeEach(async () => {
    // Reset mocks
    mockDoc = {
      get: jest.fn(),
      update: jest.fn()
    };

    mockQuery = {
      where: jest.fn(),
      limit: jest.fn(),
      get: jest.fn()
    };

    mockCollection = {
      add: jest.fn(),
      doc: jest.fn(() => mockDoc),
      where: jest.fn(() => mockQuery),
      limit: jest.fn(() => mockQuery)
    };

    const { db } = await import('../../config/firebaseConfig.js');
    db.collection.mockReturnValue(mockCollection);
    mockQuery.where.mockReturnValue(mockQuery);
    mockQuery.limit.mockReturnValue(mockQuery);

    dbService = new DatabaseService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('write', () => {
    it('should write job data to Firestore', async () => {
      const jobData = {
        url: 'https://example.com/job',
        title: 'Software Engineer',
        company: 'Test Co',
        location: 'Remote',
        description: 'Test job',
        qualifications: 'Bachelor degree',
        skills: ['JavaScript', 'Node.js'],
        postedDate: new Date()
      };

      mockCollection.add.mockResolvedValue({ id: 'doc-123' });

      const docId = await dbService.write(jobData);

      expect(docId).toBe('doc-123');
      expect(mockCollection.add).toHaveBeenCalledWith(
        expect.objectContaining({
          url: jobData.url,
          title: jobData.title,
          company: jobData.company
        })
      );
    });

    it('should handle Job model instances', async () => {
      const { Job } = await import('../../models/Job.js');
      const job = new Job({
        url: 'https://example.com/job',
        title: 'Software Engineer',
        company: 'Test Co'
      });

      mockCollection.add.mockResolvedValue({ id: 'doc-456' });

      const docId = await dbService.write(job);

      expect(docId).toBe('doc-456');
      expect(mockCollection.add).toHaveBeenCalled();
    });

    it('should throw error on write failure', async () => {
      const jobData = {
        title: 'Test Job'
      };

      mockCollection.add.mockRejectedValue(new Error('Write failed'));

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
      expect(mockQuery.where).toHaveBeenCalledWith('status', '==', 'pending');
      expect(mockQuery.limit).toHaveBeenCalledWith(10);
    });

    it('should fetch pending jobs with custom limit', async () => {
      const mockSnapshot = {
        forEach: jest.fn()
      };

      mockQuery.get.mockResolvedValue(mockSnapshot);

      await dbService.getPendingJobs(5);

      expect(mockQuery.limit).toHaveBeenCalledWith(5);
    });

    it('should return empty array when no pending jobs', async () => {
      const mockSnapshot = {
        forEach: jest.fn()
      };

      mockQuery.get.mockResolvedValue(mockSnapshot);

      const result = await dbService.getPendingJobs();

      expect(result).toEqual([]);
    });

    it('should throw error on query failure', async () => {
      mockQuery.get.mockRejectedValue(new Error('Query failed'));

      await expect(dbService.getPendingJobs()).rejects.toThrow('Query failed');
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
