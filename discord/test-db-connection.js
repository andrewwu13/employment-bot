// testing the discord bot
import { DatabaseService } from "../lib/services/database-service.js";
import { Logger } from "../lib/utils/logger.js";

const dbService = new DatabaseService();

async function test() {
    const pendingJobs = await dbService.getPendingJobs();
    if (pendingJobs.length === 0) {
        Logger.info("No pending jobs found.");
        return;
    }
    else {
        Logger.info(`Pending jobs: ${pendingJobs.length}`);
    }
    //const timestamp = new Date(pendingJobs[0].createdAt).toISOString();
    const timestamp = pendingJobs[0].createdAt.toDate();
    Logger.info(`Timestamp: ${timestamp.toISOString()}`);
}

test();