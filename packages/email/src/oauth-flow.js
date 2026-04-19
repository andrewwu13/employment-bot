import express from 'express';
import { google } from 'googleapis';
import { exec } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { Logger } from '@repo/shared';

const PORT = 3000;
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`;

// Resolve the .env file at the monorepo root
function findEnvPath(startDir) {
  let dir = startDir;
  while (dir !== '/') {
    const candidate = resolve(dir, '.env');
    if (existsSync(candidate)) return candidate;
    dir = resolve(dir, '..');
  }
  return resolve(startDir, '.env');
}

// Read existing .env and update/add a key-value pair
function upsertEnvVar(envPath, key, value) {
  let content = '';
  if (existsSync(envPath)) {
    content = readFileSync(envPath, 'utf8');
  }

  const regex = new RegExp(`^${key}=.*$`, 'm');
  if (regex.test(content)) {
    content = content.replace(regex, `${key}=${value}`);
  } else {
    content = content.trimEnd() + `\n${key}=${value}\n`;
  }

  writeFileSync(envPath, content, 'utf8');
}

/**
 * Starts the OAuth2 flow:
 * 1. Spins up an Express server
 * 2. Opens the browser to the auth URL
 * 3. Waits for the callback with the refresh token
 * 4. Writes the token to .env
 * 5. Shuts down the server
 *
 * @param {object} options
 * @param {string} options.clientId - Gmail OAuth client ID
 * @param {string} options.clientSecret - Gmail OAuth client secret
 * @param {string} options.projectRoot - Path to the monorepo root (for .env resolution)
 * @returns {Promise<string>} The refresh token
 */
export function startOAuthFlow({ clientId, clientSecret, projectRoot }) {
  return new Promise((resolve, reject) => {
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      REDIRECT_URI
    );

    const app = express();

    app.get('/auth', (req, res) => {
      const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/gmail.modify'],
        prompt: 'consent',
      });
      res.redirect(url);
    });

    app.get('/oauth2callback', async (req, res) => {
      const { code } = req.query;

      if (!code) {
        res.status(400).send('Missing authorization code. Start from /auth.');
        return;
      }

      try {
        const { tokens } = await oauth2Client.getToken(code);
        const refreshToken = tokens.refresh_token;

        if (!refreshToken) {
          res.status(500).send('No refresh token received. Try revoking access and re-authorizing.');
          reject(new Error('No refresh token received'));
          return;
        }

        // Write all credentials to .env
        const envPath = findEnvPath(projectRoot);
        upsertEnvVar(envPath, 'GMAIL_CLIENT_ID', clientId);
        upsertEnvVar(envPath, 'GMAIL_CLIENT_SECRET', clientSecret);
        upsertEnvVar(envPath, 'GMAIL_REFRESH_TOKEN', refreshToken);

        Logger.success(`Credentials written to ${envPath}`);

        res.send('<p>Authentication successful. You can close this tab.</p>');

        // Shut down the server
        server.close();
        resolve(refreshToken);
      } catch (err) {
        res.status(500).send('Error retrieving tokens. Check console.');
        reject(err);
      }
    });

    const server = app.listen(PORT, () => {
      Logger.info(`OAuth server running on port ${PORT}`);
      const authUrl = `http://localhost:${PORT}/auth`;
      Logger.info(`Opening browser to ${authUrl}`);

      // Open browser (macOS: open, Linux: xdg-open)
      const cmd = process.platform === 'darwin' ? 'open' : 'xdg-open';
      exec(`${cmd} "${authUrl}"`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        reject(new Error(`Port ${PORT} is already in use. Stop any existing OAuth server and try again.`));
      } else {
        reject(err);
      }
    });
  });
}
