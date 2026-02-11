// Create Discord embed from database job object
export function createJobEmbedFromDB(job) {
  const applyUrl = job.url || job.applyLink || null;
  const fields = [];

  // Company & Location on a single row
  if (job.company) {
    fields.push({
      name: 'Company',
      value: job.company,
      inline: true
    });
  }

  if (job.location) {
    // Clean up location formatting (e.g. "Canada- Montreal- 2351 Alfred Nobel" → "Montreal, Canada")
    const cleanLocation = job.location
      .split(/[-–]/)
      .map(s => s.trim())
      .filter(Boolean)
      .reverse()
      .slice(0, 2)
      .reverse()
      .join(', ');
    fields.push({
      name: 'Location',
      value: cleanLocation,
      inline: true
    });
  }

  // Skills displayed as inline code tags for a cleaner look
  if (job.skills && job.skills.length > 0) {
    const skillTags = job.skills.slice(0, 8).map(s => `\`${s}\``).join('  ');
    fields.push({
      name: 'Skills',
      value: skillTags,
      inline: false
    });
  }

  // Format the posted date
  let footerText = 'Employment Bot';
  try {
    const date = job.createdAt.toDate ? job.createdAt.toDate() : new Date(job.createdAt);
    footerText += ` • ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  } catch {
    // ignore date formatting errors
  }

  return {
    title: `📋  ${job.title || 'Job Posting'}`,
    url: applyUrl,
    color: 0x5865F2, // Discord blurple
    fields: fields,
    footer: {
      text: footerText
    }
  };
}
