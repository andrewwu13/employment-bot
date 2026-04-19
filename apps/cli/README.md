# Employment Bot CLI

CLI tool for testing the employment-bot scraper without database writes. Built with TypeScript.

## Installation

```bash
cd cli
npm install
npm run build    # Compiles TypeScript to dist/
npm link         # Creates `employ-cli` command globally
```

This creates the `employ-cli` command globally on your system.

## Development

Run TypeScript directly without building (using tsx):

```bash
# Run scraper in development mode
npm run dev -- --help

# Scrape a URL in development mode
npm run dev -- url "https://company.com/jobs/123" --json
```

## Usage

### Scrape a single URL

```bash
# Basic usage
employ-cli url "https://company.com/jobs/123"

# Show browser window during scraping
employ-cli url "https://company.com/jobs/123" --visible

# Output raw JSON
employ-cli url "https://company.com/jobs/123" --json

# Custom timeout (60 seconds)
employ-cli url "https://company.com/jobs/123" --timeout 60000

# Combine options
employ-cli url "https://company.com/jobs/123" --visible --json
```

## Options

- `-v, --visible` - Show browser window (disable headless mode)
- `-j, --json` - Output raw JSON instead of formatted logs
- `-t, --timeout <ms>` - Page load timeout in milliseconds (default: 30000)

## Help

```bash
employ-cli --help
employ-cli url --help
```

## Project Structure

```
cli/
├── src/              # TypeScript source files
│   └── scrape.ts     # Main CLI entry point
├── dist/             # Compiled JavaScript (auto-generated)
│   └── scrape.js
├── package.json
└── tsconfig.json     # TypeScript configuration
```

## Uninstall

To remove the global command:

```bash
cd cli
npm unlink
```
