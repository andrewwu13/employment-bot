const DEFAULT_SCRAPE_COOLDOWN = 1000;

export const cooldown = parseInt(process.env.SCRAPE_COOLDOWN_MS, 10) || DEFAULT_SCRAPE_COOLDOWN;
export const discordChannelID = process.env.JOB_CHANNEL_ID;
export const discordBotToken = process.env.DISCORD_BOT_TOKEN;
export const applicationID = process.env.APPLICATION_ID;
export const guildID = process.env.GUILD_ID;
export const runOnStartup = process.env.RUN_ON_STARTUP !== 'false';

export const emailRecipient = 'no-reply@notify.careers';
export const pendingJobLimit = 5;

export const cronSchedule = '*/20 * * * *';
export const cronTimezone = 'America/Toronto';
