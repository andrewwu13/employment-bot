# employment-bot
A Discord bot to automate job postings and streamline the application process.

Built using Node.js, Playwright, and JavaScript.

## Prerequisites
- Node.js 20.0 or higher
- Docker (optional, for containerized deployment)
- Environment variables (see `.env.example`):
  - Discord: `TOKEN`, `APPLICATION_ID`, `GUILD_ID`, `JOB_CHANNEL_ID`
  - Gmail OAuth: `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`
  - Firebase: `FIREBASE_*` credentials
  - `DEV_MODE`: set `true` to use `test_postings` Firestore collection

## Gmail OAuth Setup

The bot reads job notification emails via the Gmail API. Authentication uses OAuth2 with a refresh token.

### 1. Create OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/) and create a project (or use an existing one).
2. Enable the **Gmail API** under APIs & Services > Library.
3. Go to APIs & Services > Credentials > Create Credentials > **OAuth 2.0 Client ID**.
4. Set application type to **Web application**.
5. Add `http://localhost:3000/oauth2callback` as an authorized redirect URI.
6. Copy the **Client ID** and **Client Secret** into your `.env` file:
   ```
   GMAIL_CLIENT_ID=your_client_id
   GMAIL_CLIENT_SECRET=your_client_secret
   ```

### 2. Obtain a Refresh Token

Run the OAuth helper server from the email package:
```bash
node packages/email/src/oauth-config.js
```

1. Visit `http://localhost:3000/auth` in your browser.
2. Sign into the Google account that receives job notification emails.
3. Google redirects back to `/oauth2callback` with an authorization code.
4. The server exchanges the code for tokens and logs the refresh token to the console.
5. Copy the refresh token into your `.env` file:
   ```
   GMAIL_REFRESH_TOKEN=your_refresh_token
   ```
6. Stop the OAuth server (Ctrl+C). You only need to do this once unless the token is revoked.

> **Note:** The refresh token is tied to a specific Google account. The scope requested is `gmail.modify` (read + mark as read).

### 3. How It Works at Runtime

- `packages/email/src/gmail-config.js` creates an OAuth2 client using the env vars and sets the refresh token.
- The `googleapis` library automatically refreshes the access token using the stored refresh token.
- `GmailService` uses this client to fetch unread emails and optionally mark them as read.

## Running the Application

The Discord bot is the single entry point. It orchestrates the full pipeline: fetch emails, scrape job URLs, persist to Firestore, and post to Discord.

```bash
# Install dependencies
npm install

# Development mode with hot reload
npm run discord:dev

# Production mode
npm run discord
```

### Docker Compose

```bash
docker compose up --build       # start
docker compose up --build -d    # start in background
docker compose down             # stop
```

## CLI Tool

A testing tool for scraping and email inspection. No database writes.

### Setup

```bash
npm install
npm link --workspace=apps/cli   # creates `employ-cli` command globally
```

### Commands

```bash
# Scrape a single job URL
employ-cli url "https://company.com/jobs/123"
employ-cli url "https://company.com/jobs/123" --json --timeout 60000

# List job postings from unread Gmail emails (read-only, no mark as read)
employ-cli emails
employ-cli emails --limit 3

# List AND scrape each job URL from emails
employ-cli emails --scrape
employ-cli emails --limit 2 --scrape --json
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run discord` | Run the Discord bot (single process) |
| `npm run discord:dev` | Run with hot reload (nodemon) |
| `npm test` | Run tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |

## Project Structure

```
employment-bot/
├── apps/
│   ├── discord/          # Discord bot (orchestrates full pipeline)
│   └── cli/              # CLI for testing scraper and email fetching
├── packages/
│   ├── ai/               # AI utilities
│   ├── database/         # Firestore read/write service
│   ├── email/            # Gmail OAuth config and email fetching
│   ├── job-pipeline/     # ScrapeService (email -> scrape -> persist)
│   ├── scraper/          # Playwright-based job page scraper
│   └── shared/           # Logger, Job model, constants, skills list
├── compose.yaml
└── Dockerfile
```