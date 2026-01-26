# employment-bot
A Discord bot to automate job postings and streamline the application process.

Built using Node.js, Playwright, and JavaScript.

## Running the App Locally

### Prerequisites
- Node.js installed (20.0 or higher)
- Docker (for containerized deployment)
- Environment Variables (see `.env.example` for required variables):
  - Discord: `DISCORD_TOKEN`, `APPLICATION_ID`, `PUBLIC_KEY`
  - Gmail OAuth: `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`
  - Firebase: `FIREBASE_*` credentials

### 1. Install Dependencies
```bash
npm install
```

### 2. Get Gmail Refresh Token
Run the OAuth server:
```bash
node backend/config/oauthConfig.js
```
Then visit http://localhost:3000/auth and sign into the Google account that receives job notification emails. Copy the refresh token into your `.env` file as `GMAIL_REFRESH_TOKEN`.

> **Note:** The refresh token is tied to a specific Google account. Make sure to authorize with the account that has the job emails.

### 3. Run Locally (without Docker)

**Scraper (dev mode with hot reload):**
```bash
npm run scraper:dev
```

**Discord bot (dev mode with hot reload):**
```bash
npm run discord:dev
```

**Production mode:**
```bash
npm run scraper
npm run discord
```

### 4. Run with Docker Compose

**Build and start all services:**
```bash
docker compose up --build
```

**Run in background:**
```bash
docker compose up --build -d
```

**Stop services:**
```bash
docker compose down
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run scraper` | Run the email scraper once |
| `npm run scraper:dev` | Run scraper with hot reload (nodemon) |
| `npm run discord` | Run the Discord bot |
| `npm run discord:dev` | Run Discord bot with hot reload |
| `npm test` | Run tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |

## Project Structure

```
employment-bot/
├── backend/           # Shared services and utilities
│   ├── config/        # OAuth and Gmail configuration
│   ├── services/      # GmailService, ScrapeService, DatabaseService
│   └── utils/         # Logger and helpers
├── discordBot/        # Discord bot entry point and commands
├── scraperWorker/     # Standalone cron job runner for scraping
├── compose.yaml       # Docker Compose configuration
└── Dockerfile         # Container build configuration
```