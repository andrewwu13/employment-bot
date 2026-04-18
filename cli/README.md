# Employment Bot CLI

CLI tool for testing the employment-bot scraper without database writes.

## Installation

```bash
cd cli
npm install
```

## Usage

### Scrape a single URL

```bash
# Basic usage
node bin/scrape.js url "https://company.com/jobs/123"

# Show browser window during scraping
node bin/scrape.js url "https://company.com/jobs/123" --visible

# Output raw JSON
node bin/scrape.js url "https://company.com/jobs/123" --json

# Custom timeout (60 seconds)
node bin/scrape.js url "https://company.com/jobs/123" --timeout 60000

# Combine options
node bin/scrape.js url "https://company.com/jobs/123" --visible --json
```

## Options

- `-v, --visible` - Show browser window (disable headless mode)
- `-j, --json` - Output raw JSON instead of formatted logs
- `-t, --timeout <ms>` - Page load timeout in milliseconds (default: 30000)

## Help

```bash
node bin/scrape.js --help
node bin/scrape.js url --help
```
