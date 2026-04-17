# Development Rules

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

## Git Workflow

- Branch from `main`: `feat/description` or `fix/description`
- Keep commits atomic and focused
- Write descriptive commit messages (imperative mood) - conventional commit format
- Open PRs for all changes; no direct pushes to `main`
- Resolve merge conflicts properly; never discard others' work
