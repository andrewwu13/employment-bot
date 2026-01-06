import { JobScraper } from "../../backend/services/JobScraper.js";

/**
 * Creates a Discord embed object for a batch of job postings.
 *
 * @param {Object} email - The email object containing job postings.
 * @param {number|null} chunkIndex - The index of the batch (used for titles like "1/5").
 * @param {number} chunkSize - Maximum number of jobs per embed.
 * @returns {Object} - Discord embed object.
 */

export function createJobEmbed(email, chunkIndex = null, chunkSize = 10) {
  const jobs = email.jobs || [];

  // If no jobs, return a simple embed
  if (jobs.length === 0) {
    return {
      title: email.subject || 'Job Postings',
      description: 'No job postings found.',
      color: 0x0099ff,
      timestamp: new Date(email.date).toISOString(),
      footer: { text: `From: ${email.from}` },
    };
  }

  // Build the description lines
  const descriptionLines = jobs.map(
    ({ companyName, jobTitle, applyLink }) =>
      `**${companyName}** - ${jobTitle} [Apply](${applyLink})`
  );
  const description = descriptionLines.join('\n');

  // Determine the title with optional batch info
  const title =
    chunkIndex !== null && jobs.length > chunkSize
      ? `${email.subject} (${chunkIndex + 1}/${Math.ceil(jobs.length / chunkSize)})`
      : email.subject || 'Job Postings';

  return {
    title,
    description,
    color: 0x0099ff,
    timestamp: new Date(email.date).toISOString(),
    footer: { text: `From: ${email.from}` },
  };
}

// example usage
//import { createJobEmbed } from './utils/createEmbed.js';

// Suppose emailChunk contains up to 10 jobs from a larger email
//const embed = createJobEmbed(emailChunk, 0, 10);
//channel.send({ embeds: [embed] });
