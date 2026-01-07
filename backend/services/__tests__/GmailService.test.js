import { jest } from '@jest/globals';
import { GmailService } from '../GmailService.js';

// Mock the gmail config
jest.mock('../../config/gmailConfig.js', () => ({
  gmail: {
    users: {
      messages: {
        list: jest.fn(),
        get: jest.fn(),
        modify: jest.fn()
      }
    }
  }
}));

describe('GmailService', () => {
  let gmailService;
  let mockGmail;

  beforeEach(async () => {
    const { gmail } = await import('../../config/gmailConfig.js');
    mockGmail = gmail;
    gmailService = new GmailService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchUnreadEmails', () => {
    it('should fetch unread emails from specific sender', async () => {
      const mockEmailData = {
        data: {
          messages: [
            { id: 'msg-1' },
            { id: 'msg-2' }
          ]
        }
      };

      const mockMessageDetail = {
        data: {
          payload: {
            headers: [
              { name: 'From', value: 'test@example.com' },
              { name: 'Subject', value: 'Job Alert' },
              { name: 'Date', value: '2026-01-06' }
            ],
            body: { data: Buffer.from('<html><table><tr><td>Company A</td><td><a href="http://job1.com">Job 1</a></td></tr></table></html>').toString('base64') }
          }
        }
      };

      mockGmail.users.messages.list.mockResolvedValue(mockEmailData);
      mockGmail.users.messages.get.mockResolvedValue(mockMessageDetail);
      mockGmail.users.messages.modify.mockResolvedValue({});

      const result = await gmailService.fetchUnreadEmails('test@example.com');

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: 'msg-1',
        from: 'test@example.com',
        subject: 'Job Alert',
        date: '2026-01-06'
      });
      expect(result[0].jobs).toHaveLength(1);
      expect(result[0].jobs[0]).toMatchObject({
        companyName: 'Company A',
        jobTitle: 'Job 1',
        applyLink: 'http://job1.com'
      });
      expect(mockGmail.users.messages.list).toHaveBeenCalledWith({
        userId: 'me',
        q: 'is:unread from:test@example.com'
      });
    });

    it('should fetch all unread emails when no sender specified', async () => {
      mockGmail.users.messages.list.mockResolvedValue({ data: { messages: [] } });

      await gmailService.fetchUnreadEmails();

      expect(mockGmail.users.messages.list).toHaveBeenCalledWith({
        userId: 'me',
        q: 'is:unread'
      });
    });

    it('should return empty array when no messages found', async () => {
      mockGmail.users.messages.list.mockResolvedValue({ data: {} });

      const result = await gmailService.fetchUnreadEmails();

      expect(result).toEqual([]);
    });

    it('should mark emails as read after fetching', async () => {
      const mockEmailData = {
        data: {
          messages: [{ id: 'msg-1' }]
        }
      };

      const mockMessageDetail = {
        data: {
          payload: {
            headers: [
              { name: 'From', value: 'test@example.com' },
              { name: 'Subject', value: 'Test' },
              { name: 'Date', value: '2026-01-06' }
            ],
            body: { data: '' }
          }
        }
      };

      mockGmail.users.messages.list.mockResolvedValue(mockEmailData);
      mockGmail.users.messages.get.mockResolvedValue(mockMessageDetail);
      mockGmail.users.messages.modify.mockResolvedValue({});

      await gmailService.fetchUnreadEmails();

      expect(mockGmail.users.messages.modify).toHaveBeenCalledWith({
        userId: 'me',
        id: 'msg-1',
        requestBody: { removeLabelIds: ['UNREAD'] }
      });
    });

    it('should handle HTML email parts', async () => {
      const mockEmailData = {
        data: {
          messages: [{ id: 'msg-1' }]
        }
      };

      const mockMessageDetail = {
        data: {
          payload: {
            headers: [
              { name: 'From', value: 'test@example.com' },
              { name: 'Subject', value: 'Test' },
              { name: 'Date', value: '2026-01-06' }
            ],
            parts: [
              {
                mimeType: 'text/html',
                body: { data: Buffer.from('<html><body>Test</body></html>').toString('base64') }
              }
            ]
          }
        }
      };

      mockGmail.users.messages.list.mockResolvedValue(mockEmailData);
      mockGmail.users.messages.get.mockResolvedValue(mockMessageDetail);
      mockGmail.users.messages.modify.mockResolvedValue({});

      const result = await gmailService.fetchUnreadEmails();

      expect(result).toHaveLength(1);
    });

    it('should extract multiple jobs from email table', async () => {
      const mockEmailData = {
        data: {
          messages: [{ id: 'msg-1' }]
        }
      };

      const htmlContent = `
        <html>
          <table>
            <tr><th>Company</th><th>Job</th></tr>
            <tr><td>Company A</td><td><a href="http://job1.com">Engineer</a></td></tr>
            <tr><td>Company B</td><td><a href="http://job2.com">Designer</a></td></tr>
            <tr><td>Company C</td><td><a href="http://job3.com">Manager</a></td></tr>
          </table>
        </html>
      `;

      const mockMessageDetail = {
        data: {
          payload: {
            headers: [
              { name: 'From', value: 'test@example.com' },
              { name: 'Subject', value: 'Job Alerts' },
              { name: 'Date', value: '2026-01-06' }
            ],
            body: { data: Buffer.from(htmlContent).toString('base64') }
          }
        }
      };

      mockGmail.users.messages.list.mockResolvedValue(mockEmailData);
      mockGmail.users.messages.get.mockResolvedValue(mockMessageDetail);
      mockGmail.users.messages.modify.mockResolvedValue({});

      const result = await gmailService.fetchUnreadEmails();

      expect(result[0].jobs).toHaveLength(3);
      expect(result[0].jobs[0]).toMatchObject({
        companyName: 'Company A',
        jobTitle: 'Engineer',
        applyLink: 'http://job1.com'
      });
      expect(result[0].jobs[2]).toMatchObject({
        companyName: 'Company C',
        jobTitle: 'Manager',
        applyLink: 'http://job3.com'
      });
    });
  });

  describe('cleanEmails', () => {
    it('should create embeds from raw emails', async () => {
      const rawEmails = [
        {
          id: 'msg-1',
          from: 'test@example.com',
          subject: 'Job Alert',
          date: '2026-01-06',
          jobs: [
            { companyName: 'Company A', jobTitle: 'Job 1', applyLink: 'http://job1.com' },
            { companyName: 'Company B', jobTitle: 'Job 2', applyLink: 'http://job2.com' }
          ]
        }
      ];

      const result = await gmailService.cleanEmails(rawEmails);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('title');
      expect(result[0]).toHaveProperty('description');
      expect(result[0]).toHaveProperty('color');
    });

    it('should handle emails with no jobs', async () => {
      const rawEmails = [
        {
          id: 'msg-1',
          from: 'test@example.com',
          subject: 'Empty Email',
          date: '2026-01-06',
          jobs: []
        }
      ];

      const result = await gmailService.cleanEmails(rawEmails);

      expect(result).toHaveLength(1);
      expect(result[0].description).toBe('No job postings found.');
    });

    it('should chunk jobs into batches of 10', async () => {
      const jobs = Array.from({ length: 25 }, (_, i) => ({
        companyName: `Company ${i}`,
        jobTitle: `Job ${i}`,
        applyLink: `http://job${i}.com`
      }));

      const rawEmails = [
        {
          id: 'msg-1',
          from: 'test@example.com',
          subject: 'Job Alert',
          date: '2026-01-06',
          jobs: jobs
        }
      ];

      const result = await gmailService.cleanEmails(rawEmails);

      expect(result).toHaveLength(3); // 10 + 10 + 5
    });
  });
});
