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

### Current Pipeline

index.js - entrypoint, runs cron job
fetch from fetchUnreadEmails (gmail.js)

### File Structure 
employment-bot/
├── backend/
│   ├── index.js                    # Optional API server (Express)
│   ├── services/
│   │   ├── DatabaseService.js      # Firestore operations
│   │   ├── GmailService.js         # Gmail API
│   │   ├── JobScraper.js          # Web scraping
│   │   └── ScraperService.js       # Orchestrates scraping
│   ├── models/
│   │   └── Job.js                  # Job data schema/validation
│   ├── config/
│   │   ├── firebaseConfig.js
│   │   └── gmailConfig.js
│   └── utils/
│       └── logger.js
│
├── discordBot/                      # Discord "view"
│   ├── index.js                     # Entry point
│   ├── bot.js                       # DiscordBotService
│   ├── commands/
│   │   └── commands.js
│   └── utils/
│       └── createEmbed.js
│
├── emailBot/                        # Future: Email digest "view"
│   ├── index.js
│   └── EmailBotService.js
│
├── scraperWorker/                   # Scraper worker process
│   └── index.js                     # Runs scraper service
│
├── package.json
├── .env
└── README.md
