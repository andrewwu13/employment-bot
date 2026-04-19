# Employment Bot CLI

CLI tool for testing the employment-bot scraper and email fetching. No database writes.

## Setup

From the monorepo root:

```bash
npm install
npm link --workspace=apps/cli
```

This creates the `employ-cli` command globally.

## Commands

### `employ-cli auth`

Authenticate with Gmail OAuth2. Reads `GMAIL_CLIENT_ID` and `GMAIL_CLIENT_SECRET` from `.env`, opens a browser for Google authorization, and writes the refresh token back to `.env`.

```bash
employ-cli auth
```

Requires `GMAIL_CLIENT_ID` and `GMAIL_CLIENT_SECRET` to be set in `.env` first. See the root README for how to obtain these from Google Cloud Console.

### `employ-cli url <jobUrl>`

Scrape a single job posting URL and display the extracted data.

```bash
# Basic usage
employ-cli url "https://company.com/jobs/123"

# Output raw JSON
employ-cli url "https://company.com/jobs/123" --json

# Custom timeout (60 seconds)
employ-cli url "https://company.com/jobs/123" --timeout 60000
```

| Option | Description | Default |
|--------|-------------|---------|
| `-j, --json` | Output raw JSON | `false` |
| `-t, --timeout <ms>` | Page load timeout | `30000` |

### `employ-cli emails`

List job postings from unread Gmail emails. Read-only: emails are **not** marked as read.

```bash
# List jobs from up to 5 emails
employ-cli emails

# Limit to 3 emails
employ-cli emails --limit 3

# List and scrape each job URL
employ-cli emails --scrape

# Combine options
employ-cli emails --limit 2 --scrape --json
```

| Option | Description | Default |
|--------|-------------|---------|
| `-l, --limit <count>` | Max emails to fetch | `5` |
| `-s, --scrape` | Scrape each job URL after listing | `false` |
| `-j, --json` | Output raw JSON | `false` |
| `-t, --timeout <ms>` | Scrape timeout | `30000` |

## Project Structure

```
apps/cli/
├── src/
│   ├── index.js              # Entry point, registers commands
│   └── commands/
│       ├── auth.js           # Gmail OAuth2 flow
│       ├── emails.js         # Email listing and scraping
│       └── url.js            # Single URL scraping
└── package.json
```

## Uninstall

```bash
npm unlink --workspace=apps/cli
```
