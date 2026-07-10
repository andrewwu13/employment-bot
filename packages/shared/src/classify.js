// keyword classifier

import { INDUSTRIES, COUNTRIES, REMOTE_PATTERN, SKILL_ROLES } from "./routing";

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function keywordRegex(keyword) {
  const kw = keyword.toLowerCase();
  const escaped = escapeRegex(kw);
  return /[^a-z0-9]/.test(kw) ? new RegExp(escaped, 'i') : new RegExp(`\\b${escaped}\\b`, "i");
}

function scoreMatches(text, keywords) {
  return keywords.reduce((n, kw) => (keywordRegex(kw).test(text) ? n + 1 : n), 0);
}

// return slug with the most keyword hits
function bestMatch(text, groups) { 
  let winner = null;
  let best = 0;
  for (const [slug, { keywords }] of Object.entries(groups)) {
    const score = scoreMatches(text, keywords);
    if (score > best) {
      best = score;
      winner = slug;
    }
  }
  return winner;
}

export function classifyJob({title = '', skills = [], location = ''} = {}) {
  const titleText = `${title} ${skills.join(" ")}`.toLowerCase();
  const locationText = location.toLowerCase();
  const industry = bestMatch(titleText, INDUSTRIES);
  const country = bestMatch(locationText, COUNTRIES);
  const remote = REMOTE_PATTERN.test(locationText) || REMOTE_PATTERN.test(title);
  const skillRoles = Object.entries(SKILL_ROLES)
    .filter(([, { keywords }]) => keywords.some(kw => keywordRegex(kw).test(titleText)))
    .map(([slug]) => slug);
  
  return { industry, country, remote, skillRoles };
}