import dotenv from "dotenv";
import * as cheerio from 'cheerio';
import { createJobEmbed } from '../../discordBot/utils/createEmbed.js';

// gmail object created from OAuth process; can work with it now to read/send gmails
import { gmail } from '../config/gmailConfig.js';

dotenv.config();

// reads from gmails, returns as JSON
export class GmailService {

  // fetches unread emails from gmail inbox, given a specified sender
  // should only return the two links (idk what links they are we will see)
  async fetchUnreadEmails(sender) {
    const query = sender ? `is:unread from:${sender}` : "is:unread";
    const list = await gmail.users.messages.list({
      userId: "me",
      q: query,
    });

    if (!list.data.messages) return [];

    const emails = [];

    for (const msg of list.data.messages) {
      const detail = await gmail.users.messages.get({
        userId: "me",
        id: msg.id,
      });
      const payload = detail.data.payload;
      const headers = payload.headers.reduce((acc,h) => {
        acc[h.name] = h.value;
        return acc;
      }, {});

      let body = "";
      if (payload.parts && payload.parts.length > 0) {
        // Try to find the HTML part
        const htmlPart = payload.parts.find(part => part.mimeType === "text/html");
        if (htmlPart && htmlPart.body && htmlPart.body.data) {
          body = Buffer.from(htmlPart.body.data, "base64").toString();
        } else {
          // Fallback to plain text
          const textPart = payload.parts.find(part => part.mimeType === "text/plain");
          if (textPart && textPart.body && textPart.body.data) {
            body = Buffer.from(textPart.body.data, "base64").toString();
          }
        }
      } else if (payload.body && payload.body.data) {
        // Single part message
        body = Buffer.from(payload.body.data, "base64").toString();
      }

      // Extract jobs from the email body
      const $ = cheerio.load(body);
      const jobs = [];
      // Find the first table in the email body (assuming it contains job postings)
      const table = $('table').first();
      if (table.length) {
        // Iterate over each row except the header row
        table.find('tr').slice(1).each((_, row) => {
          const cells = $(row).find('td');
          if (cells.length >= 2) {
            const companyName = $(cells[0]).text().trim();
            const jobCell = $(cells[1]);
            const jobTitle = jobCell.text().trim();
            const applyLink = jobCell.find('a').attr('href') || '';
            if (companyName && jobTitle && applyLink) {
              jobs.push({ companyName, jobTitle, applyLink });
            }
          }
        });
      }

      emails.push({
        id: msg.id,
        from: headers["From"],
        subject: headers["Subject"],
        date: headers["Date"],
        jobs: jobs
      });

      await gmail.users.messages.modify({
        userId: "me",
        id: msg.id,
        requestBody: { removeLabelIds: ["UNREAD"] }
      });
    }

    console.log(JSON.stringify(emails, null, 2));
    return emails;
  }

  async cleanEmails(rawEmails) {
    const allEmbeds = [];
    const chunkSize = 10;

    for (const email of rawEmails) {
      const jobs = email.jobs || [];
      if (jobs.length === 0) {
        allEmbeds.push(createJobEmbed(email));
        continue;
      }

      for (let i = 0; i < jobs.length; i += chunkSize) {
        const chunk = { ...email, jobs: jobs.slice(i, i + chunkSize) };
        allEmbeds.push(createJobEmbed(chunk, i / chunkSize, chunkSize));
      }
    }

    return allEmbeds;
  }

}
