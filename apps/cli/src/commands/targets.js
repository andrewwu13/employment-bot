import { spawn } from 'node:child_process';
import { select, Separator } from '@inquirer/prompts';
import { fetchBoard } from '@repo/scraper';
import { Logger } from '@repo/shared';
import { TARGETS, KEYWORDS, LOCATIONS } from '../constants.js';

function matchesKeywords(title) {
  if (KEYWORDS.length === 0) return true;
  const lower = (title ?? '').toLowerCase();
  return KEYWORDS.some((kw) => lower.includes(kw));
}

const LOCATION_RE = LOCATIONS.length
  ? new RegExp(`\\b(${LOCATIONS.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`)
  : null;

function matchesLocation(location) {
  if (!LOCATION_RE) return true;
  if (!location) return false;
  return LOCATION_RE.test(location.toLowerCase());
}

function openInBrowser(url) {
  spawn('open', [url], { detached: true, stdio: 'ignore' }).unref();
}

const c = Logger.colors;

function paint(text, ...styles) {
  return `${styles.join('')}${text}${c.reset}`;
}

function targetLabel(url) {
  return new URL(url).pathname.split('/').filter(Boolean).pop() ?? new URL(url).host;
}

export function registerTargetsCommand(program) {
  program
    .command('targets')
    .description('Scrape target companies for intern roles')
    .action(async () => {
      try {
        const start = performance.now();
        const allJobs = [];

        console.log(
          paint(`\n  Intern role search`, c.bright, c.cyan) +
            paint(`  ·  ${TARGETS.length} target companies\n`, c.gray)
        );

        for (const url of TARGETS) {
          const label = targetLabel(url);
          try {
            const jobs = (await fetchBoard(url)).filter(
              (job) => matchesKeywords(job.title) && matchesLocation(job.location)
            );
            allJobs.push(...jobs);
            const count = paint(`${jobs.length} role${jobs.length === 1 ? '' : 's'}`, c.green);
            console.log(`  ${paint('✓', c.green)} ${paint(label, c.bright)} ${paint('·', c.gray)} ${count}`);
          } catch (error) {
            console.log(`  ${paint('✗', c.red)} ${paint(label, c.bright)} ${paint(error.message, c.gray)}`);
          }
        }

        const elapsed = ((performance.now() - start) / 1000).toFixed(2);

        if (allJobs.length === 0) {
          console.log(paint(`\n  No intern roles found. `, c.yellow) + paint(`(${elapsed}s)\n`, c.gray));
          process.exit(0);
        }

        console.log(
          paint(`\n  Found `, c.gray) +
            paint(`${allJobs.length}`, c.bright, c.green) +
            paint(` intern role${allJobs.length === 1 ? '' : 's'} in ${elapsed}s\n`, c.gray)
        );

        const QUIT = '__quit__';
        let lastChoice;
        while (true) {
          const choice = await select({
            message: paint('Open a role in your browser', c.bright),
            pageSize: 15,
            loop: false,
            default: lastChoice,
            choices: [
              ...allJobs.map((job) => ({
                name: `${paint(job.company, c.cyan)} ${paint('·', c.gray)} ${job.title} ${paint(`(${job.location ?? 'N/A'})`, c.gray)}`,
                value: job.url,
                description: paint(job.url, c.blue),
              })),
              new Separator(),
              { name: paint('Quit', c.gray), value: QUIT },
            ],
          });

          if (choice === QUIT) break;
          lastChoice = choice;
          console.log(`  ${paint('→ opening', c.green)} ${paint(choice, c.blue)}`);
          openInBrowser(choice);
        }

        process.exit(0);
      } catch (error) {
        if (error?.name === 'ExitPromptError') process.exit(0);
        Logger.error('Failed to scrape targets', error);
        process.exit(1);
      }
    });
}
