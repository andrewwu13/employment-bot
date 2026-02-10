import { Logger } from '../utils/logger.js';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Mock Gmail service for development/testing
 * Returns fixture data instead of making real API calls
 */
export class MockGmailService {
    constructor(options = {}) {
        this.fixtureFile = options.fixtureFile || join(__dirname, '../fixtures/sample-emails.json');
        this.markAsRead = options.markAsRead ?? true;
        this.processedIds = new Set();
    }

    async fetchUnreadEmails(sender) {
        Logger.info(`[MockGmailService] Fetching mock emails (sender: ${sender})`);

        try {
            const content = await readFile(this.fixtureFile, 'utf-8');
            const allEmails = JSON.parse(content);

            // Filter by sender if specified
            let emails = allEmails;
            if (sender) {
                emails = allEmails.filter(email =>
                    email.from?.toLowerCase().includes(sender.toLowerCase())
                );
            }

            // Filter out already processed emails (simulates marking as read)
            if (this.markAsRead) {
                emails = emails.filter(email => !this.processedIds.has(email.id));

                // Mark these as processed for future calls
                emails.forEach(email => this.processedIds.add(email.id));
            }

            Logger.info(`[MockGmailService] Returning ${emails.length} mock emails`);

            // Log the jobs for debugging
            for (const email of emails) {
                Logger.info(`[MockGmailService] Email: "${email.subject}" with ${email.jobs?.length || 0} jobs`);
            }

            return emails;

        } catch (error) {
            if (error.code === 'ENOENT') {
                Logger.warn(`[MockGmailService] Fixture file not found: ${this.fixtureFile}`);
                Logger.info(`[MockGmailService] Create fixtures at: backend/fixtures/sample-emails.json`);
                return [];
            }
            throw error;
        }
    }

    /**
     * Reset processed emails (useful for repeated testing)
     */
    reset() {
        this.processedIds.clear();
        Logger.info('[MockGmailService] Reset - all emails will be returned as unread');
    }
}
