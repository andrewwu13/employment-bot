// normalizes an already-source-mapped job object into the Firestore document shape

export function toJobRecord(job) {
  return {
    url: job.url || '',
    title: job.title || '',
    company: job.company || '',
    location: job.location || '',
    skills: job.skills || [],
    postedDate: job.postedDate ? new Date(job.postedDate) : new Date(),

    status: job.status || 'pending',
    createdAt: job.createdAt || new Date(),
    postedAt: job.postedAt || new Date(),
    emailSubject: job.emailSubject || '',
    emailDate: job.emailDate || '',
  };
}
