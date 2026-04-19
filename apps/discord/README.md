# Discord Bot

This Discord bot is designed to automate the process of finding and posting job listings. It fetches job-related emails, scrapes job URLs from those emails, and then posts the details into designated Discord channels.

## Features

*   **Email Integration**: Fetches new job postings directly from configured Gmail accounts.
*   **Job Scraping**: Extracts detailed job information from various company career pages.
*   **Discord Posting**: Publishes job listings to Discord channels, including relevant details and links.
*   **Automated Workflow**: Configured to run automatically via a cron job, performing the full pipeline from email fetching to Discord posting.

## Environment Variables

Create a `.env` file in the project root with these variables:

| Variable | Description |
|----------|-------------|
| `DISCORD_BOT_TOKEN` | Your Discord bot token |
| `APPLICATION_ID` | Discord application ID |
| `GUILD_ID` | Discord server (guild) ID |
| `JOB_CHANNEL_ID` | Channel ID where jobs will be posted |
| `GMAIL_CLIENT_ID` | Gmail OAuth client ID |
| `GMAIL_CLIENT_SECRET` | Gmail OAuth client secret |
| `GMAIL_REFRESH_TOKEN` | Gmail OAuth refresh token |
| `FIREBASE_ADMIN_CONFIG` | Firebase service account JSON string |
| `SCRAPE_COOLDOWN_MS` | Delay between jobs in milliseconds (default: `1000`) |
| `RUN_ON_STARTUP` | Set to `false` to skip initial pipeline run (default: runs on startup) |
| `DEV_MODE` | Set to `true` for testing channel mode |

## Pipeline Flow

The bot processes jobs with **immediate scrape-and-post** execution:

```
Email 1 → Scrape Job 1 → Save → Post to Discord → Email 2 → Scrape Job 2 → Save → Post to Discord ...
```

Each job goes through the full pipeline immediately:

1. **Scrape**: Fetches job details from the URL (usually 1-3 seconds)
2. **Save**: Stores complete data to Firestore
3. **Post**: Creates Discord embed and sends to channel immediately
4. **Rate Limit**: Waits `SCRAPE_COOLDOWN_MS` milliseconds (default: 1 second) before next job

**Why this matters**: Unlike the old approach (scrape all, then post all), this gives immediate feedback. Each job appears in Discord within seconds of being scraped.

### Discord Rate Limits

Discord enforces **5 messages per 5 seconds per channel** (1 msg/sec sustained). The default `1000ms` cooldown prevents hitting this limit.

| Cooldown Setting | Time per Job | 10 Jobs Time |
|------------------|--------------|--------------|
| Fast (`500ms`) | ~4 seconds | ~40 seconds |
| **Default (`1000ms`)** | **~4 seconds** | **~45 seconds** |
| Safe (`2000ms`) | ~5 seconds | ~50 seconds |
| Conservative (`60000ms`) | ~65 seconds | ~10 minutes |

**⚠️ Warning**: Setting cooldown below `500ms` may trigger Discord rate limits, causing failed messages.

### Scheduling

- **On Startup**: Pipeline runs immediately when bot connects (unless `RUN_ON_STARTUP=false`)
- **Cron Schedule**: Every 20 minutes (`:00`, `:20`, `:40`) in America/Toronto timezone

### Running the Bot

Ensure you are in the app directory (`apps/discord`) or run from the monorepo root with the appropriate workspace command:

*   **Development Mode**: For local development with auto-restarts on file changes:
    ```bash
    npm run dev
    ```
*   **Production Mode**: For deployment:
    ```bash
    npm start
    ```

## Commands

The bot supports the following slash commands for manual interaction:

*   `/ping`: Checks if the bot is online and responsive. Replies with "Pong!".
*   `/jobs`: Shows up to 5 pending jobs from the database that haven't been posted yet.
*   `/post`: Manually triggers posting of pending jobs to the current Discord channel.

## File Structure

```
apps/discord/
├── src/
│   ├── index.js              # Main bot entry point and cron setup
│   ├── embed.js              # Discord embed creation utilities
│   ├── commands.js           # Command definitions (legacy, see index.js)
│   └── test-db-connection.js # Database connection test script
├── package.json
└── README.md
```

## Automated Operation

The bot operates automatically with **stream processing**:

1. **Startup**: Runs immediately when bot connects (unless `RUN_ON_STARTUP=false`)
2. **Scheduled Runs**: Every 20 minutes:
   - Fetches unread emails from Gmail
   - For each job found: **scrape → save → post** (one-by-one)
   - Respects `SCRAPE_COOLDOWN_MS` between jobs to avoid rate limits

This gives immediate feedback - jobs appear in Discord within seconds, not minutes.

Use `/jobs` to check pending jobs, or `/post` to manually trigger posting of any orphaned jobs (e.g., if previous run failed mid-way).
