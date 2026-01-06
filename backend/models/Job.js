// the model/schema for the job datatype, that we will throw around to all the views (discord message, email, etc.)

export class Job {
  // job is instantiated with an object with the following properties; keep in mind the curly braces around the construtor.
  constructor({
    url='',
    skills=[],
    qualifications='',
    title='',
    company='',
    location='',
    description='',
    postedDate=new Date(),
  }) 
  {
    this.url = url;
    this.skills = skills;
    this.qualifications = qualifications;
    this.title = title;
    this.company = company;
    this.location = location;
    this.description = description;
    this.postedDate = postedDate;
  }

  // convert to a plain object to add to DB
  toFirestore() {
    return {
      url: this.url,
      skills: this.skills,
      qualifications: this.qualifications,
      title: this.title,
      company: this.company,
      location: this.location,
      description: this.description,
      postedDate: this.postedDate
    }
  }

}
