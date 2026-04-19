#!/usr/bin/env node

import 'dotenv/config.js';
import { Command } from 'commander';
import { registerUrlCommand } from './commands/url.js';
import { registerEmailsCommand } from './commands/emails.js';
import { registerAuthCommand } from './commands/auth.js';
import { registerLogCommand } from './commands/log.js';

const program = new Command();

program
  .name('employ-cli')
  .description('CLI tool for testing job scraper')
  .version('1.0.0');

registerUrlCommand(program);
registerEmailsCommand(program);
registerAuthCommand(program);
registerLogCommand(program);

program.parse();
