# Development Rules

## Project Structure

This project utilizes a monorepo structure, organized into `apps/` and `packages/` directories.
- `apps/`: Contains deployable applications such as the Discord bot and CLI tool.
- `packages/`: Houses shared libraries and functionalities used across different applications, like AI, database, email, and scraper modules.

## Conversational Style

- Keep answers short and concise
- No emojis in commits, issues, PR comments, or code
- No fluff or cheerful filler text
- Technical prose only, be kind but direct (e.g., "Thanks @user" not "Thanks so much @user!")

## Forbidden Git Operations

These commands can destroy other agents' work:

- `git reset --hard` - destroys uncommitted changes
- `git checkout .` - destroys uncommitted changes
- `git clean -fd` - deletes untracked files
- `git stash` - stashes ALL changes including other agents' work
- `git commit --no-verify` - bypasses required checks and is never allowed

## Security

- Never commit `.env` files or files containing secrets
- No hardcoded API keys, tokens, or credentials in source code
- Use environment variables for all sensitive configuration
- Never log sensitive data (passwords, tokens, PII)
- Validate and sanitize all user inputs

## Code Quality

- No `console.log` in production code; use the logger utility
- All functions must handle errors appropriately
- No unused imports or variables
- Use `const` by default, `let` only when reassignment needed, never `var`
- Never use `eval()` or dynamic code execution
- Write self-documenting code; comments explain "why", not "what"

## TypeScript

- Enable `strict` mode in `tsconfig.json`
- No `any` types; use `unknown` when type is uncertain
- Always define return types for public functions
- Use interfaces for object shapes; types for unions/intersections
- Prefer readonly arrays and properties where mutation is not needed
- Use optional chaining (`?.`) and nullish coalescing (`??`) over manual checks
- Avoid type assertions (`as`); use type guards instead
- Explicitly mark class member visibility (`public`, `private`, `protected`)
- Use `const` assertions for literal types (`as const`)
- Import types explicitly: `import type { Foo }` when only types are needed

## Testing

- All new features require tests
- Tests must pass before committing
- Mock external services, not internal logic
- Integration tests must hit real databases, not mocks

## Dependencies

- Declare each third-party dependency in the `package.json` of the workspace package or app that imports it, not in the root manifest. The root manifest is reserved for repo-wide tooling (test runner, linter, nodemon, TypeScript).
- Reference other workspace packages by their `@repo/*` name with version `*`; never import across packages by relative path (`../../packages/...`).
- Keep `package-lock.json` committed
- Pin dependency versions explicitly
- Run `npm audit` before major releases
- Minimize dependencies; prefer built-in solutions
- Review new dependencies for maintenance status and security

## Database

- Use parameterized queries only (never string concatenation)
- Run migrations in transactions where possible
- Schema changes require backwards compatibility
- Never drop columns or tables without deprecation period

## Running the Application

The Discord bot is the single orchestration point. One cron job handles the full pipeline: fetch emails, scrape job URLs, persist to Firestore, and post to Discord.

```bash
# Production mode
npm run discord

# Development mode with auto-restart on file changes
npm run discord:dev
```

### Gmail OAuth Setup

The bot authenticates with Gmail via OAuth2. A one-time setup is required to obtain a refresh token:

1. Create OAuth 2.0 credentials in [Google Cloud Console](https://console.cloud.google.com/) with redirect URI `http://localhost:3000/oauth2callback`.
2. Set `GMAIL_CLIENT_ID` and `GMAIL_CLIENT_SECRET` in `.env`.
3. Run `node packages/email/src/oauth-config.js` and visit `http://localhost:3000/auth`.
4. Authorize the Google account that receives job emails.
5. Copy the logged refresh token into `.env` as `GMAIL_REFRESH_TOKEN`.

At runtime, `packages/email/src/gmail-config.js` creates the OAuth2 client and the `googleapis` library handles access token refresh automatically.

### Testing

```bash
# Run all tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

`test/providers.test.js` runs offline against trimmed real API responses in
`test/fixtures/`. Re-record a fixture when a provider changes shape.

`test/database.test.js` exercises `DatabaseService` against the Firestore
emulator and skips itself unless `FIRESTORE_EMULATOR_HOST` is set:

```bash
npx firebase emulators:start --only firestore --project demo-employment-bot
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm test
```

### Board canary

Checks the live Greenhouse/Lever/Ashby/Workday APIs and exits non-zero if a
board stops returning postings. Network-dependent, so it is not part of `npm
test` - run it on a schedule or when the scraper looks wrong.

```bash
npm run check:boards
```

## CLI Tool (apps/cli)

A testing tool for scraping and email inspection. No database writes.

### Setup

```bash
npm install
npm link --workspace=apps/cli  # Creates `emp` command globally
```

### Commands

```bash
# Scrape a single URL
emp url "https://company.com/jobs/123"

# List job postings from unread Gmail emails (read-only, no mark as read)
emp emails
emp emails --limit 3

# List AND scrape each job URL from emails
emp emails --scrape
emp emails --limit 2 --scrape
```

## Git Workflow

- Branch from `main`: `feat/description` or `fix/description`
- Keep commits atomic and focused
- Write descriptive, *one line* commit messages (imperative mood) - conventional commit format
- Open PRs for all changes; no direct pushes to `main`
- Resolve merge conflicts properly; never discard others' work
