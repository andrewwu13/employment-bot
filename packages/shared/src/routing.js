// Routing: keyword rules to classify job into an industry, country, and remote flag.
// The discord app maps these slugs ("swe", "us") to channel/role IDs via an env config. 
// Null classification means 'unmatched', send to a general channel, no pings
// Matching is case-sensitive substring against the job's title/location

export const INDUSTRIES = {
  swe : {
    label: "Software Engineering",
    keywords: ['software engineer', 'software developer', 'swe', 'sde', 'backend', 'back end', 'frontend', 'front end', 'fullstack', 'full stack', 'developer', 'programmer', 'web developer', 'mobile developer']
  },
  design: {
    label: 'Design',
    keywords: ['designer', 'ux', 'ui', 'user experience', 'user interface', 'product design', 'graphic design', 'visual design', 'interaction design']
  },
  electrical: {
    label: 'Electrical Engineering',
    keywords: ['electrical engineer', 'electrical engineering', 'circuit', 'power systems', 'embedded', 'hardware engineer', 'pcb', 'fpga']
  }
}

export const COUNTRIES = {
  us: {
    label: 'United States',
    keywords: ['united states', 'u.s.', 'usa', 'california', 'new york', 'texas', 'washington', 'massachusetts', 'illinois', 'georgia', 'colorado', 'florida', 'virginia', 'san francisco', 'SF', 'seattle', 'nyc', 'austin', 'boston', 'chicago']
  },
  canada: {
    label: "Canada",
    keywords: ['canada', 'ca', 'ontario', 'quebec', 'british columbia', 'alberta', 'nova scotia', 'torotno', 'vancouver', 'montreal', 'ottawa', 'waterloo', 'hamilton', 'calgary']
  }
}

export const REMOTE_PATTERN = /\b(remote|work from home|wfh|anywhere|distributed)\b/i


// TODO: add more skills
export const SKILL_ROLES = {
  react: { label: 'React', keywords: ['react', 'react.js', 'next.js'] },
  python: { label: 'Python', keywords: ['python', 'django', 'flask', 'fastapi'] },
  aws: { label: 'AWS', keywords: ['aws', 'amazon web services'] },
  sql: { label: 'SQL', keywords: ['sql', 'postgresql', 'mysql'] }
};
