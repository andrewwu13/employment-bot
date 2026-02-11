// the model/schema for the job datatype, that we will throw around to all the views (discord message, email, etc.)

export class Job {
  // job is instantiated with an object with the following properties; keep in mind the curly braces around the construtor.
  // job is instantiated with an object that might be flat or have nested scrapedData
  constructor(data) {
    // Handle nested scrapedData if present (from ScrapeService)
    const sourceData = data.scrapedData || data;

    // Core job data (prefer scraped data, fallback to initial data)
    this.url = sourceData.url || data.applyLink || '';
    this.title = data.jobTitle || '';
    //this.company = sourceData.company || data.companyName || '';
    this.company = data.companyName || '';
    this.location = sourceData.location || '';

    this.skills = sourceData.skills || [];
    this.postedDate = sourceData.postedDate ? new Date(sourceData.postedDate) : new Date();

    // Metadata fields
    this.status = data.status || 'pending';
    this.createdAt = data.createdAt || new Date();
    this.postedAt = data.postedAt || new Date();

    // Email context (if available)
    this.emailSubject = data.emailSubject || '';
    this.emailDate = data.emailDate || '';
  }

  // convert to a plain object to add to DB
  toFirestore() {
    return {
      url: this.url,
      title: this.title,
      company: this.company,
      location: this.location,
      skills: this.skills,
      postedDate: this.postedDate,

      // Metadata
      status: this.status,
      createdAt: this.createdAt,
      postedAt: this.postedAt,
      emailSubject: this.emailSubject,
      emailDate: this.emailDate
    };
  }

}
