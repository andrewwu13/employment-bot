/**
 * Site-specific handlers for common job boards
 * Each handler knows how to extract job data from its specific site structure
 */
export const SITE_HANDLERS = {
  // Workday job sites (e.g., company.wd3.myworkdayjobs.com)
  workday: {
    pattern: /workday|\.wd\d+\./i,
    selectors: {
      title: '[data-automation-id="jobPostingHeader"] h2, [data-automation-id="jobTitle"], .css-1q2dra3',
      company: '[data-automation-id="company"], [data-automation-id="organizationName"]',
      location: '[data-automation-id="locations"], [data-automation-id="location"]',
      qualifications: '[data-automation-id="jobPostingQualifications"]'
    },
    waitFor: '[data-automation-id="jobPostingHeader"]'
  },

  // Lever job sites (jobs.lever.co)
  lever: {
    pattern: /lever\.co/i,
    selectors: {
      title: '.posting-headline h2, .posting-title',
      company: '.main-header-logo img[alt], .company-name',
      location: '.posting-categories .location, .workplaceTypes',
      qualifications: '.posting-page .section-wrapper:has(h3:contains("Requirements"))'
    },
    waitFor: '.posting-headline'
  },

  // Greenhouse job sites (boards.greenhouse.io)
  greenhouse: {
    pattern: /greenhouse\.io/i,
    selectors: {
      title: '.app-title, #header .job-title, h1.job-title',
      company: '.company-name, #header .company-name',
      location: '.location, .job-info .location',
      qualifications: '#content .section-wrapper:has(h3:contains("Requirements"))'
    },
    waitFor: '.app-title, #header'
  },

  // Generic fallback for unknown sites
  generic: {
    pattern: /.*/,
    selectors: {
      title: 'h1:not([class*="cookie"]):not([class*="consent"]):not([class*="banner"]), [class*="job-title"], [class*="jobTitle"]',
      company: '[class*="company"], [class*="employer"]',
      location: '[class*="location"]',
      qualifications: '[class*="requirements"], [class*="qualifications"]'
    },
    waitFor: null
  }
};

/**
 * Common cookie consent button selectors
 */
export const COOKIE_DISMISS_SELECTORS = [
  // OneTrust (very common)
  '#onetrust-accept-btn-handler',
  '#onetrust-reject-all-handler',
  '.onetrust-close-btn-handler',
  // Generic patterns
  'button[id*="cookie"][id*="accept"]',
  'button[id*="cookie"][id*="reject"]',
  'button[class*="cookie"][class*="accept"]',
  'button[class*="consent"][class*="accept"]',
  '[class*="cookie-banner"] button[class*="accept"]',
  '[class*="cookie-banner"] button[class*="close"]',
  '[class*="cookie"] button:has-text("Accept")',
  '[class*="cookie"] button:has-text("OK")',
  '[class*="cookie"] button:has-text("Got it")',
  '[class*="consent"] button:has-text("Accept")',
  // GDPR specific
  '#gdpr-banner-accept',
  '.gdpr-accept',
  // Specific sites
  '.cc-btn.cc-dismiss', // Cookie Consent lib
  '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll', // Cookiebot
];


// All skills in one big pattern
export const allSkills = [
  // Languages
  'JavaScript', 'TypeScript', 'Python', 'Java', 'C\\+\\+', 'C#', 'Ruby', 'PHP', 'Go', 'Rust', 'Swift', 'Kotlin',
  // Frameworks
  'React', 'Angular', 'Vue', 'Node\\.js', 'Express', 'Django', 'Flask', 'Spring', 'Laravel', '\\.NET', 'FastAPI', 'Spring Boot', 'Springboot',
  // Databases
  'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Oracle', 'SQL Server', 'DynamoDB', 'Cassandra',
  // Cloud
  'AWS', 'Azure', 'GCP', 'Google Cloud', 'Docker', 'Kubernetes', 'Jenkins', 'Terraform', 'Ansible',
  // Tools
  'Git', 'GitHub', 'GitLab', 'Bitbucket', 'JIRA', 'Yocto', 'GCC', 'GDB', 'Grafana',
  // Web
  'HTML', 'CSS', 'GraphQL', 'REST', 'API', 'OAuth',
  // Methodologies
  'Agile', 'Scrum', 'Kanban', 'DevOps', 'CI\\/CD', 'Microservices',
  // Data/AI
  'Machine Learning', 'ML', 'AI', 'Deep Learning', 'TensorFlow', 'PyTorch',
  // OS
  'Linux', 'Unix', 'Windows', 'macOS', 'Android', 'iOS'
];
