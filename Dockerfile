# Run with: docker compose up --build -d

# Base stage for dependencies
FROM mcr.microsoft.com/playwright:v1.61.1-noble AS base
WORKDIR /app

# Copy root and workspace manifests first so `npm install` resolves the
# workspace layout correctly while keeping this layer cacheable.
COPY package*.json ./
COPY apps/discord/package.json ./apps/discord/package.json
COPY apps/cli/package.json ./apps/cli/package.json
COPY packages/ai/package.json ./packages/ai/package.json
COPY packages/database/package.json ./packages/database/package.json
COPY packages/email/package.json ./packages/email/package.json
COPY packages/scraper/package.json ./packages/scraper/package.json
COPY packages/shared/package.json ./packages/shared/package.json
RUN npm install --omit=dev

# Copy source
COPY apps/ ./apps/
COPY packages/ ./packages/

# Runs node directly because `npm run discord` passes --env-file=../../.env, which production doesn't have.
CMD ["node", "apps/discord/src/index.js"]
