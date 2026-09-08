# @repo/scraper

Scrapes job data from ATS boards. One entry point, two operations: get every posting
on a company board, or get a single posting's details.

## API

```js
import { fetchBoard, fetchPosting } from '@repo/scraper';
```

### `fetchBoard(url)` → `Promise<Job[]>`

Takes a company board URL and returns its **intern** postings (filtered by title).

```js
const jobs = await fetchBoard('https://boards.greenhouse.io/stripe');
```

Throws `Unsupported job board: <url>` if the host isn't a known ATS.

### `fetchPosting(url)` → `Promise<Job>`

Takes a single job-posting URL and returns one job. It walks the redirect chain
(handles email tracking links) and uses the ATS API for the first recognized posting
URL it sees. If no provider matches, it falls back to a headless browser
([Playwright](https://playwright.dev/)) that extracts data from the page (JSON-LD, then
meta tags). No intern filtering - it returns whatever posting the URL points at.

```js
const job = await fetchPosting('https://jobs.lever.co/mistral/<id>');
```

### `closeBrowser()` → `Promise<void>`

The browser fallback lazily launches a single headless browser and reuses it across
calls. Long-running processes (e.g. the Discord bot) should call `closeBrowser()` on
shutdown to release it. Short-lived scripts that exit don't need to.

## The `Job` shape

Every result - from any ATS or the browser fallback - has the same shape:

```js
{
  url: string,
  title: string | null,
  company: string | null,
  location: string | null,
  skills: string[],        // matched against the shared skills list
  postedDate: string | null
}
```

## Supported boards

| ATS | `fetchBoard` | `fetchPosting` |
|-----|:---:|:---:|
| Greenhouse (`greenhouse.io`) | yes | yes (API) |
| Lever (`lever.co`) | yes | yes (API) |
| Ashby (`ashbyhq.com`) | yes | yes (reads board, finds id) |
| Workday (`myworkdayjobs.com`) | yes | browser fallback |
| anything else | - | browser fallback |

## Adding a provider

Add one object to the `PROVIDERS` array in `src/providers.js`:

```js
const myats = {
  match: 'myats.com',                 // matched against the URL host
  isPosting(url) { /* true if URL is a single posting */ },
  async fetchBoard(url) { /* return Job[] (intern-filtered) */ },
  async fetchPosting(url) { /* return one Job */ },
};
```

Drop `fetchPosting`/`isPosting` to leave single postings to the browser fallback
(as Workday does). Consumers don't change - both entry points pick it up automatically.

## Structure

```
src/
  index.js              # entry point: fetchBoard, fetchPosting + redirect routing
  providers.js          # ATS providers + PROVIDERS registry
  utils.js              # shared utils (unified Job, skills, fetchJson)
  browser.js            # internal Playwright scraper (not exported)
```
