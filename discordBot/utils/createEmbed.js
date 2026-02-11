
export function createJobEmbed(job) {
    const fields = [];

    // Add company and location
    if (job.company) {
        fields.push({
            name: '🏢 Company',
            value: job.company,
            inline: true
        });
    }

    if (job.location) {
        fields.push({
            name: '📍 Location',
            value: job.location,
            inline: true
        });
    }

    // Add skills if available
    if (job.skills && job.skills.length > 0) {
        fields.push({
            name: '💻 Skills',
            value: job.skills.slice(0, 5).join(', '),
            inline: false
        });
    }



    // Handle differences between raw DB job and enriched job
    const title = job.title || 'Job Posting';
    const url = job.url || job.applyLink;
    const postedDate = job.postedDate || job.createdAt;
    const timestamp = job.createdAt && typeof job.createdAt.toDate === 'function'
        ? job.createdAt.toDate().toISOString()
        : new Date().toISOString();

    const footerText = job.createdAt && typeof job.createdAt.toDate === 'function'
        ? `Posted: ${job.createdAt.toDate().toLocaleDateString()}`
        : `Posted: ${new Date().toLocaleDateString()}`;

    return {
        title: title,
        url: url,
        color: 0x0099ff,
        fields: fields,
        footer: {
            text: footerText
        },
        timestamp: timestamp
    };
}
