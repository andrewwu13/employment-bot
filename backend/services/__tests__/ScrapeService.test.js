import { jest } from '@jest/globals';
import { ScrapeService } from '../ScrapeService.js';

describe('ScrapeService', () => {
  let scrapeService;
  let mockGmailService;
  let mockDatabaseService;
  let mockJobScraper;

  beforeEach(() => {
    // Create mock services
    mockGmailService = {
      fetchUnreadEmails: jest.fn()
    };

    mockDatabaseService = {
      write: jest.fn()
    };

    mockJobScraper = {
      scrape: jest.fn()
    };

    // Initialize service with mocks
    scrapeService = new ScrapeService(
      mockGmailService,
      mockDatabaseService,
      mockJobScraper,
      100 // Short cooldown for tests
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('runCron', () => {
    it('should handle no emails found', async () => {
      // Mock: No emails
      mockGmailService.fetchUnreadEmails.mockResolvedValue([]);

      const result = await scrapeService.runCron();

      expect(result.success).toBe(true);
      expect(result.processed).toBe(0);
      expect(result.errors).toBe(0);
      expect(mockGmailService.fetchUnreadEmails).toHaveBeenCalledWith('no-reply@notify.careers');
      expect(mockJobScraper.scrape).not.toHaveBeenCalled();
    });

    it('should process emails with job postings', async () => {
      // Mock: Email with jobs
      const mockEmails = [
        {
          id: 'email-1',
          from: 'no-reply@notify.careers',
          subject: 'New Job Alerts',
          date: '2026-01-05T12:00:00Z',
          jobs: [
            {
              companyName: 'Test Company',
              jobTitle: 'Software Engineer',
              applyLink: 'https://example.com/job1'
            },
            {
              companyName: 'Another Company',
              jobTitle: 'Frontend Developer',
              applyLink: 'https://example.com/job2'
            }
          ]
        }
      ];

      mockGmailService.fetchUnreadEmails.mockResolvedValue(mockEmails);
      mockJobScraper.scrape.mockResolvedValue({
        title: 'Mock Scraped Job',
        description: 'Mock description',
        location: 'Remote'
      });
      mockDatabaseService.write.mockResolvedValue('doc-123');

      const result = await scrapeService.runCron();

      expect(result.success).toBe(true);
      expect(result.processed).toBe(2);
      expect(result.errors).toBe(0);
      expect(mockJobScraper.scrape).toHaveBeenCalledTimes(2);
      expect(mockDatabaseService.write).toHaveBeenCalledTimes(2);
      
      // Check that scraped data was written correctly
      const firstCall = mockDatabaseService.write.mock.calls[0][0];
      expect(firstCall).toMatchObject({
        companyName: 'Test Company',
        jobTitle: 'Software Engineer',
        applyLink: 'https://example.com/job1',
        emailSubject: 'New Job Alerts',
        status: 'pending'
      });
    });

    it('should handle scraping errors gracefully', async () => {
      const mockEmails = [
        {
          id: 'email-1',
          from: 'no-reply@notify.careers',
          subject: 'New Job Alerts',
          date: '2026-01-05T12:00:00Z',
          jobs: [
            {
              companyName: 'Test Company',
              jobTitle: 'Software Engineer',
              applyLink: 'https://example.com/job1'
            },
            {
              companyName: 'Another Company',
              jobTitle: 'Frontend Developer',
              applyLink: 'https://example.com/job2'
            }
          ]
        }
      ];

      mockGmailService.fetchUnreadEmails.mockResolvedValue(mockEmails);
      
      // First scrape succeeds, second fails
      mockJobScraper.scrape
        .mockResolvedValueOnce({ title: 'Success' })
        .mockRejectedValueOnce(new Error('Scraping failed'));
      
      mockDatabaseService.write.mockResolvedValue('doc-123');

      const result = await scrapeService.runCron();

      expect(result.success).toBe(true);
      expect(result.processed).toBe(1);
      expect(result.errors).toBe(1);
      expect(mockDatabaseService.write).toHaveBeenCalledTimes(1);
    });

    it('should prevent concurrent execution', async () => {
      mockGmailService.fetchUnreadEmails.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve([]), 1000))
      );

      const firstCall = scrapeService.runCron();
      const secondCall = scrapeService.runCron();

      await Promise.all([firstCall, secondCall]);

      // Should only fetch emails once
      expect(mockGmailService.fetchUnreadEmails).toHaveBeenCalledTimes(1);
    });

    it('should handle emails with no jobs', async () => {
      const mockEmails = [
        {
          id: 'email-1',
          from: 'no-reply@notify.careers',
          subject: 'Empty Email',
          date: '2026-01-05T12:00:00Z',
          jobs: []
        }
      ];

      mockGmailService.fetchUnreadEmails.mockResolvedValue(mockEmails);

      const result = await scrapeService.runCron();

      expect(result.success).toBe(true);
      expect(result.processed).toBe(0);
      expect(result.errors).toBe(0);
      expect(mockJobScraper.scrape).not.toHaveBeenCalled();
    });

    it('should enrich job data with email metadata', async () => {
      const mockEmails = [
        {
          id: 'email-1',
          from: 'no-reply@notify.careers',
          subject: 'Job Alert',
          date: '2026-01-05T12:00:00Z',
          jobs: [
            {
              companyName: 'Test Company',
              jobTitle: 'Software Engineer',
              applyLink: 'https://example.com/job1'
            }
          ]
        }
      ];

      mockGmailService.fetchUnreadEmails.mockResolvedValue(mockEmails);
      mockJobScraper.scrape.mockResolvedValue({ title: 'Scraped' });
      mockDatabaseService.write.mockResolvedValue('doc-123');

      await scrapeService.runCron();

      const writtenData = mockDatabaseService.write.mock.calls[0][0];
      
      expect(writtenData).toMatchObject({
        companyName: 'Test Company',
        jobTitle: 'Software Engineer',
        emailSubject: 'Job Alert',
        emailDate: '2026-01-05T12:00:00Z',
        emailFrom: 'no-reply@notify.careers',
        status: 'pending',
        scrapedData: { title: 'Scraped' }
      });
      expect(writtenData.createdAt).toBeInstanceOf(Date);
      expect(writtenData.postedAt).toBeNull();
    });

    it('should handle partial scrape data with undefined fields', async () => {
      const mockEmails = [
        {
          id: 'email-1',
          from: 'no-reply@notify.careers',
          subject: 'Job Alert',
          date: '2026-01-05T12:00:00Z',
          jobs: [
            {
              companyName: 'Test Company',
              jobTitle: 'Software Engineer',
              applyLink: 'https://example.com/job1'
            }
          ]
        }
      ];

      // Scraper returns partial data with some undefined fields
      mockGmailService.fetchUnreadEmails.mockResolvedValue(mockEmails);
      mockJobScraper.scrape.mockResolvedValue({
        title: 'Job Title',
        description: undefined,
        location: 'Remote',
        salary: undefined,
        requirements: undefined,
        benefits: null
      });
      mockDatabaseService.write.mockResolvedValue('doc-123');

      const result = await scrapeService.runCron();

      expect(result.success).toBe(true);
      expect(result.processed).toBe(1);
      expect(mockDatabaseService.write).toHaveBeenCalledTimes(1);

      const writtenData = mockDatabaseService.write.mock.calls[0][0];
      expect(writtenData.scrapedData).toEqual({
        title: 'Job Title',
        description: undefined,
        location: 'Remote',
        salary: undefined,
        requirements: undefined,
        benefits: null
      });
    });

    it('should handle scraper returning completely empty object', async () => {
      const mockEmails = [
        {
          id: 'email-1',
          from: 'no-reply@notify.careers',
          subject: 'Job Alert',
          date: '2026-01-05T12:00:00Z',
          jobs: [
            {
              companyName: 'Test Company',
              jobTitle: 'Software Engineer',
              applyLink: 'https://example.com/job1'
            }
          ]
        }
      ];

      mockGmailService.fetchUnreadEmails.mockResolvedValue(mockEmails);
      mockJobScraper.scrape.mockResolvedValue({});
      mockDatabaseService.write.mockResolvedValue('doc-123');

      const result = await scrapeService.runCron();

      expect(result.success).toBe(true);
      expect(result.processed).toBe(1);
      
      const writtenData = mockDatabaseService.write.mock.calls[0][0];
      expect(writtenData.scrapedData).toEqual({});
      expect(writtenData.companyName).toBe('Test Company');
      expect(writtenData.jobTitle).toBe('Software Engineer');
    });

    it('should handle scraper returning null', async () => {
      const mockEmails = [
        {
          id: 'email-1',
          from: 'no-reply@notify.careers',
          subject: 'Job Alert',
          date: '2026-01-05T12:00:00Z',
          jobs: [
            {
              companyName: 'Test Company',
              jobTitle: 'Software Engineer',
              applyLink: 'https://example.com/job1'
            }
          ]
        }
      ];

      mockGmailService.fetchUnreadEmails.mockResolvedValue(mockEmails);
      mockJobScraper.scrape.mockResolvedValue(null);
      mockDatabaseService.write.mockResolvedValue('doc-123');

      const result = await scrapeService.runCron();

      expect(result.success).toBe(true);
      expect(result.processed).toBe(1);
      
      const writtenData = mockDatabaseService.write.mock.calls[0][0];
      expect(writtenData.scrapedData).toBeNull();
    });

    it('should handle mixed results with some undefined scrapes', async () => {
      const mockEmails = [
        {
          id: 'email-1',
          from: 'no-reply@notify.careers',
          subject: 'Job Alert',
          date: '2026-01-05T12:00:00Z',
          jobs: [
            {
              companyName: 'Company A',
              jobTitle: 'Job A',
              applyLink: 'https://example.com/job1'
            },
            {
              companyName: 'Company B',
              jobTitle: 'Job B',
              applyLink: 'https://example.com/job2'
            },
            {
              companyName: 'Company C',
              jobTitle: 'Job C',
              applyLink: 'https://example.com/job3'
            }
          ]
        }
      ];

      mockGmailService.fetchUnreadEmails.mockResolvedValue(mockEmails);
      
      // First returns full data, second returns partial, third returns empty
      mockJobScraper.scrape
        .mockResolvedValueOnce({
          title: 'Full Data',
          description: 'Complete description',
          location: 'New York'
        })
        .mockResolvedValueOnce({
          title: 'Partial Data',
          description: undefined,
          location: undefined
        })
        .mockResolvedValueOnce({});
      
      mockDatabaseService.write.mockResolvedValue('doc-123');

      const result = await scrapeService.runCron();

      expect(result.success).toBe(true);
      expect(result.processed).toBe(3);
      expect(result.errors).toBe(0);
      expect(mockDatabaseService.write).toHaveBeenCalledTimes(3);

      // Check first job has full data
      const firstJob = mockDatabaseService.write.mock.calls[0][0];
      expect(firstJob.scrapedData.description).toBe('Complete description');

      // Check second job has undefined fields
      const secondJob = mockDatabaseService.write.mock.calls[1][0];
      expect(secondJob.scrapedData.description).toBeUndefined();

      // Check third job has empty scraped data
      const thirdJob = mockDatabaseService.write.mock.calls[2][0];
      expect(thirdJob.scrapedData).toEqual({});
    });
  });

  describe('fetchEmails', () => {
    it('should fetch unread emails from the correct sender', async () => {
      const mockEmails = [{ id: '1', jobs: [] }];
      mockGmailService.fetchUnreadEmails.mockResolvedValue(mockEmails);

      const result = await scrapeService.fetchEmails();

      expect(mockGmailService.fetchUnreadEmails).toHaveBeenCalledWith('no-reply@notify.careers');
      expect(result).toEqual(mockEmails);
    });
  });

  describe('parseEmails', () => {
    it('should extract jobs from multiple emails', () => {
      const rawEmails = [
        {
          subject: 'Job Alert 1',
          date: '2026-01-05',
          from: 'sender1@test.com',
          jobs: [
            { companyName: 'Company A', jobTitle: 'Job A', applyLink: 'http://a.com' },
            { companyName: 'Company B', jobTitle: 'Job B', applyLink: 'http://b.com' }
          ]
        },
        {
          subject: 'Job Alert 2',
          date: '2026-01-06',
          from: 'sender2@test.com',
          jobs: [
            { companyName: 'Company C', jobTitle: 'Job C', applyLink: 'http://c.com' }
          ]
        }
      ];

      const result = scrapeService.parseEmails(rawEmails);

      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({
        companyName: 'Company A',
        jobTitle: 'Job A',
        emailSubject: 'Job Alert 1',
        emailDate: '2026-01-05',
        emailFrom: 'sender1@test.com'
      });
    });

    it('should return null for emails with no jobs', () => {
      const rawEmails = [
        { subject: 'Empty', date: '2026-01-05', from: 'test@test.com', jobs: [] }
      ];

      const result = scrapeService.parseEmails(rawEmails);

      expect(result).toBeNull();
    });
  });
});
