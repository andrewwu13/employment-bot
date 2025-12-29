* this information (data flow) is going to be moved over to main readme once done.

### Typical Working Flow
- Initialize browser and page ( initialized using the job scraper class )
- Navigate to URL ( using playwright )
- Detect job board type (if possible) ( detection layer )
- Execute loading strategy to get all jobs visible
- Extract job elements (find all repeating containers)
- Parse each job element for title, company, location, description, etc.
- Clean and validate the data
- Export to JSON/CSV

### Components
**Job Scraper Class** - has functions that scrape from URL. One instance of the scraper is needed.
