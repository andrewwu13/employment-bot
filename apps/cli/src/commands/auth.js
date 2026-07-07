import { createInterface } from 'readline';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { existsSync, readFileSync } from 'fs';
import { startOAuthFlow } from '@repo/email';
import { Logger } from '@repo/shared';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Walk up to find the monorepo root (where the root package.json with "workspaces" lives)
function findProjectRoot() {
  let dir = __dirname;
  while (dir !== '/') {
    const pkgPath = resolve(dir, 'package.json');
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
      if (pkg.workspaces) return dir;
    }
    dir = resolve(dir, '..');
  }
  return process.cwd();
}

// Unused — no command flow currently calls this
function prompt(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

export function registerAuthCommand(program) {
  program
    .command('auth')
    .description('Authenticate with Gmail OAuth2 and save credentials to .env')
    .action(async () => {
      const projectRoot = findProjectRoot();
      const envPath = resolve(projectRoot, '.env');

      const clientId = process.env.GMAIL_CLIENT_ID;
      const clientSecret = process.env.GMAIL_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        Logger.error('GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET must be set in .env');
        process.exit(1);
      }

      Logger.info('Using Client ID and Secret from .env');
      Logger.info('Starting OAuth flow to obtain a new refresh token...');

      try {
        Logger.info('Starting OAuth flow...');
        Logger.info('A browser window will open for Google authorization.');
        console.log('');

        const refreshToken = await startOAuthFlow({
          clientId,
          clientSecret,
          projectRoot,
        });

        console.log('');
        Logger.success('Authentication complete.');
        Logger.success(`Credentials saved to ${envPath}`);
        Logger.info(`Refresh token: ${refreshToken.substring(0, 20)}...`);
        process.exit(0);
      } catch (error) {
        Logger.error('Authentication failed', error);
        process.exit(1);
      }
    });
}
