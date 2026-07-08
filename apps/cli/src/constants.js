// Target company job boards. Only Greenhouse, Lever, Workday, and Ashby boards
// are supported; companies on other ATSes (Apple/Google/Meta/Amazon custom
// portals, Scotiabank/SuccessFactors) can't be scraped yet.
export const TARGETS = [
  // AI / ML
  'https://boards.greenhouse.io/anthropic',
  'https://jobs.ashbyhq.com/openai',
  'https://jobs.lever.co/mistral',
  'https://jobs.ashbyhq.com/cohere',
  'https://jobs.ashbyhq.com/perplexity',
  'https://boards.greenhouse.io/scaleai',
  'https://boards.greenhouse.io/databricks',
  'https://jobs.ashbyhq.com/elevenlabs',
  'https://jobs.ashbyhq.com/harvey',
  'https://jobs.ashbyhq.com/sierra',
  'https://jobs.ashbyhq.com/writer',

  // Tech
  'https://boards.greenhouse.io/flyzipline', // Zipline
  'https://boards.greenhouse.io/figma',
  'https://boards.greenhouse.io/reddit',
  'https://boards.greenhouse.io/discord',
  'https://boards.greenhouse.io/datadog',
  'https://boards.greenhouse.io/cloudflare',
  'https://boards.greenhouse.io/dropbox',
  'https://boards.greenhouse.io/roblox',
  'https://boards.greenhouse.io/instacart',
  'https://boards.greenhouse.io/lyft',
  'https://boards.greenhouse.io/pinterest',
  'https://boards.greenhouse.io/twitch',
  'https://boards.greenhouse.io/airbnb',
  'https://boards.greenhouse.io/samsara',
  'https://boards.greenhouse.io/gitlab',
  'https://jobs.ashbyhq.com/notion',
  'https://jobs.ashbyhq.com/linear',
  'https://jobs.ashbyhq.com/vanta',

  // Banks (Workday)
  'https://rbc.wd3.myworkdayjobs.com/en-US/RBCEARLYTALENT1',
  'https://td.wd3.myworkdayjobs.com/en-US/TD_Bank_Careers',

  // Fintech
  'https://boards.greenhouse.io/stripe',
  'https://jobs.lever.co/wealthsimple',
  'https://jobs.lever.co/plaid',
  'https://boards.greenhouse.io/brex',
  'https://boards.greenhouse.io/affirm',
  'https://boards.greenhouse.io/robinhood',
  'https://boards.greenhouse.io/chime',
  'https://boards.greenhouse.io/mercury',
  'https://boards.greenhouse.io/marqeta',
  'https://boards.greenhouse.io/coinbase',
  'https://boards.greenhouse.io/sofi',
  'https://boards.greenhouse.io/block',
  'https://boards.greenhouse.io/nubank',
  'https://boards.greenhouse.io/adyen',
  'https://boards.greenhouse.io/monzo',
  'https://boards.greenhouse.io/carta',
  'https://boards.greenhouse.io/billcom', // Bill.com
  'https://boards.greenhouse.io/gemini',
  'https://boards.greenhouse.io/public',
  'https://jobs.ashbyhq.com/ramp',
  'https://jobs.ashbyhq.com/deel',
  'https://jobs.lever.co/wealthfront',
  'https://jobs.lever.co/kraken',

  // Startups - San Francisco
  'https://boards.greenhouse.io/gusto',
  'https://boards.greenhouse.io/airtable',
  'https://boards.greenhouse.io/faire',
  'https://boards.greenhouse.io/amplitude',
  'https://boards.greenhouse.io/webflow',
  'https://boards.greenhouse.io/vercel',
  'https://jobs.ashbyhq.com/benchling',
  'https://jobs.ashbyhq.com/verkada',

  // Startups - New York
  'https://boards.greenhouse.io/attentive',
  'https://boards.greenhouse.io/cockroachlabs',
  'https://boards.greenhouse.io/squarespace',
  'https://boards.greenhouse.io/mongodb',
  'https://boards.greenhouse.io/braze',
  'https://boards.greenhouse.io/justworks',
  'https://boards.greenhouse.io/oscar',
  'https://boards.greenhouse.io/yext',
  'https://boards.greenhouse.io/movableink',

  // Startups - Toronto
  'https://boards.greenhouse.io/flipp',
  'https://boards.greenhouse.io/ritual',
  'https://jobs.ashbyhq.com/1password',
  'https://jobs.ashbyhq.com/clearco',
  'https://jobs.ashbyhq.com/float',
  'https://jobs.ashbyhq.com/koho',
  'https://jobs.ashbyhq.com/jobber',

  // Storage / data infra / HPC (deep-systems, C++/Rust)
  'https://boards.greenhouse.io/purestorage',
  'https://boards.greenhouse.io/rubrik',
  'https://boards.greenhouse.io/druva',
  'https://boards.greenhouse.io/minio',
  'https://boards.greenhouse.io/clickhouse',
  'https://boards.greenhouse.io/singlestore',
  'https://boards.greenhouse.io/yugabyte',
  'https://boards.greenhouse.io/planetscale',
  'https://boards.greenhouse.io/lightmatter',
  'https://jobs.ashbyhq.com/neon',
  'https://jobs.ashbyhq.com/modal',
  'https://jobs.ashbyhq.com/anyscale',
  'https://jobs.ashbyhq.com/cerebras',
];

// Only keep roles whose title contains one of these keywords. Empty = keep all.
export const KEYWORDS = [
  'software',
  'engineer',
  'developer',
  'data',
  'machine learning',
  'ml',
  'ai',
  'mts',
  'technical',
];

// Keep only roles whose location matches one of these (North America by
// default). Empty = keep all. Codes like 'ca'/'ny'/'qc' are matched on word
// boundaries so they catch "San Francisco, CA" without matching random words.
export const LOCATIONS = [
  // countries
  'united states', 'usa', 'us', 'canada', 'mexico', 'north america',
  // us state codes ('or'/'in' omitted - too common as words; names cover them)
  'al', 'ak', 'az', 'ar', 'ca', 'co', 'ct', 'de', 'fl', 'ga', 'hi', 'id', 'il',
  'ia', 'ks', 'ky', 'la', 'me', 'md', 'ma', 'mi', 'mn', 'ms', 'mo', 'mt', 'ne',
  'nv', 'nh', 'nj', 'nm', 'ny', 'nc', 'nd', 'oh', 'ok', 'pa', 'ri', 'sc', 'sd',
  'tn', 'tx', 'ut', 'vt', 'va', 'wa', 'wv', 'wi', 'wy',
  // us state names
  'alabama', 'alaska', 'arizona', 'arkansas', 'california', 'colorado',
  'connecticut', 'delaware', 'florida', 'georgia', 'hawaii', 'idaho', 'illinois',
  'indiana', 'iowa', 'kansas', 'kentucky', 'louisiana', 'maine', 'maryland',
  'massachusetts', 'michigan', 'minnesota', 'mississippi', 'missouri', 'montana',
  'nebraska', 'nevada', 'new hampshire', 'new jersey', 'new mexico', 'new york',
  'north carolina', 'north dakota', 'ohio', 'oklahoma', 'oregon', 'pennsylvania',
  'rhode island', 'south carolina', 'south dakota', 'tennessee', 'texas', 'utah',
  'vermont', 'virginia', 'washington', 'west virginia', 'wisconsin', 'wyoming',
  // canadian province codes ('on' omitted - too common; name covers it)
  'ab', 'bc', 'mb', 'nb', 'nl', 'ns', 'nt', 'nu', 'pe', 'qc', 'sk', 'yt',
  // canadian province names
  'ontario', 'quebec', 'british columbia', 'alberta', 'manitoba',
  'saskatchewan', 'nova scotia', 'new brunswick', 'newfoundland', 'nunavut',
  'yukon',
];
