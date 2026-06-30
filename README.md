# Employment Bot

<p align="center">
  <img src="docs/logo.svg" alt="Employment Bot" width="120">
</p>

<p align="center">
  Automated job aggregation from Gmail to Discord.
  <br />
  <a href="#architecture">Architecture</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#configuration">Configuration</a>
</p>

## What It Does

Employment Bot monitors a Gmail inbox for job notification emails, extracts job posting URLs, scrapes detailed information from each link, and posts formatted job listings to a Discord channel. It runs on a schedule with immediate feedback—each job appears in Discord seconds after being scraped.

## Architecture

<pre>
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Gmail     │────▶│  Job Links  │────▶│   Scraper   │────▶│  Firestore  │────┐
│   Emails    │     │  Extracted  │     │  (1-3 sec)  │     │  (pending)  │    │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘    │
                                                                                  │
┌───────────────────────────────────────────────────────────────────────────────┘
│
▼
┌─────────────┐     ┌─────────────┐
│   Discord   │◀────│  Job Embed  │
│   Channel   │     │  Formatted  │
└─────────────┘     └─────────────┘
</pre>

### Processing Pipeline

The bot processes jobs individually through a streaming pipeline:

1. **Fetch** — Poll Gmail API for unread emails from job notification services
2. **Extract** — Parse HTML emails to extract job posting URLs
3. **Scrape** — Use Playwright to visit each job URL and extract structured data
4. **Post** — Format as Discord embed and send to configured channel
5. **Rate Limit** — Wait configurable delay before next job (respects Discord's 5 msg/5s limit)

Each job appears in Discord within ~4 seconds of being scraped, rather than waiting for batch completion.

### Schedule

- **Startup**: Runs immediately when the bot connects (configurable via `RUN_ON_STARTUP`)
- **Cron**: Every 20 minutes (`:00`, `:20`, `:40` in America/Toronto timezone)

## Quick Start

### Prerequisites

- Node.js 20+
- Gmail OAuth credentials (for job email access)
- Firebase project (for job persistence)
- Discord bot token

### Setup

```bash
# Clone and install
npm install

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Run the bot
npm run discord:dev
```

See [AGENTS.md](AGENTS.md) for complete environment setup including Gmail OAuth flow.

### Docker

```bash
docker compose up --build -d   # Start
docker compose down            # Stop
```

## Configuration

Create `.env` in the project root:

| Variable | Description |
|----------|-------------|
| `DISCORD_BOT_TOKEN` | Discord bot authentication |
| `APPLICATION_ID` | Discord application ID |
| `GUILD_ID` | Discord server ID |
| `JOB_CHANNEL_ID` | Target channel for job postings |
| `GMAIL_CLIENT_ID` | Gmail OAuth client ID |
| `GMAIL_CLIENT_SECRET` | Gmail OAuth client secret |
| `GMAIL_REFRESH_TOKEN` | Gmail OAuth refresh token |
| `FIREBASE_ADMIN_CONFIG` | Firebase service account JSON |
| `SCRAPE_COOLDOWN_MS` | Delay between jobs (default: 1000ms) |
| `RUN_ON_STARTUP` | Run pipeline on bot startup (default: true) |

## Project Structure

```
employment-bot/
├── apps/
│   ├── discord/          # Discord bot (pipeline orchestration)
│   └── cli/              # CLI tool for testing (emp)
├── packages/
│   ├── ai/               # AI utilities
│   ├── database/         # Firestore service
│   ├── email/            # Gmail OAuth and API
│   ├── scraper/          # Job board + posting scraping
│   └── shared/           # Logger, models, constants
├── .env
├── compose.yaml
└── Dockerfile
```

## CLI Tool

Test scraper and email fetching without database writes:

```bash
# Install globally
npm link --workspace=apps/cli

# Scrape a URL
emp url "https://company.com/jobs/123"

# Check emails
emp emails --scrape --limit 3
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run discord` | Run Discord bot (production) |
| `npm run discord:dev` | Run with hot reload |
| `npm run cli` | Run CLI tool |
| `npm test` | Run test suite |
| `npm run test:watch` | Tests in watch mode |
| `npm run test:coverage` | Tests with coverage |

## License

MIT
