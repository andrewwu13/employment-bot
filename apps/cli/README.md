# Employment Bot CLI

CLI tool for testing the employment-bot scraper and email fetching. No database writes.

## Setup

From the monorepo root:

```bash
npm install
npm link --workspace=apps/cli
```

This creates the `emp` command globally.

## Commands

### `emp auth`

Authenticate with Gmail OAuth2. Reads `GMAIL_CLIENT_ID` and `GMAIL_CLIENT_SECRET` from `.env`, opens a browser for Google authorization, and writes the refresh token back to `.env`.

```bash
emp auth
```

Requires `GMAIL_CLIENT_ID` and `GMAIL_CLIENT_SECRET` to be set in `.env` first. See the root README for how to obtain these from Google Cloud Console.

### `emp url <jobUrl>`

Scrape a single job posting URL and display the extracted data.

```bash
emp url "https://company.com/jobs/123"
```

### `emp emails`

List job postings from unread Gmail emails. Read-only: emails are **not** marked as read.

```bash
# List jobs from up to 5 emails
emp emails

# Limit to 3 emails
emp emails --limit 3

# List and scrape each job URL
emp emails --scrape

# Combine options
emp emails --limit 2 --scrape
```

| Option | Description | Default |
|--------|-------------|---------|
| `-l, --limit <count>` | Max emails to fetch | `5` |
| `-s, --scrape` | Scrape each job URL after listing | `false` |

### `emp log`

Simulates the full pipeline end-to-end (fetch emails, scrape each job URL, print as
Discord-style embeds) with no database writes and no marking emails as read.

```bash
emp log
emp log --limit 3
```

| Option | Description | Default |
|--------|-------------|---------|
| `-l, --limit <count>` | Max emails to fetch | `5` |

### `emp targets`

Scrapes the target company boards defined in `src/constants.js` (`TARGETS`) for intern
roles, filtered by `KEYWORDS` and `LOCATIONS`, then lets you pick a result to open in
your browser.

```bash
emp targets
```

## Project Structure

```
apps/cli/
├── src/
│   ├── index.js              # Entry point, registers commands
│   ├── constants.js          # Target company boards, keyword/location filters
│   └── commands/
│       ├── auth.js           # Gmail OAuth2 flow
│       ├── emails.js         # Email listing and scraping
│       ├── log.js            # Full pipeline simulation (no DB writes)
│       ├── targets.js        # Scrape target company boards for intern roles
│       └── url.js            # Single URL scraping
└── package.json
```

## Uninstall

```bash
npm unlink --workspace=apps/cli
```
