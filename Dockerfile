# Base stage for dependencies
FROM mcr.microsoft.com/playwright:v1.56.1-noble AS base
WORKDIR /app

# Copy package files and install
COPY package*.json ./
RUN npm install --production

# Copy all source folders
COPY backend/ ./backend/
COPY scraperWorker/ ./scraperWorker/
COPY discordBot/ ./discordBot/

# Default command
CMD ["npm", "run", "scraper"]