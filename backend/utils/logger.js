export const Logger = {
    // ANSI colors
    colors: {
        reset: "\x1b[0m",
        bright: "\x1b[1m",
        dim: "\x1b[2m",
        red: "\x1b[31m",
        green: "\x1b[32m",
        yellow: "\x1b[33m",
        blue: "\x1b[34m",
        magenta: "\x1b[35m",
        cyan: "\x1b[36m",
        white: "\x1b[37m",
        gray: "\x1b[90m",
    },

    info(message) {
        console.log(`${this.colors.blue}[INFO]${this.colors.reset} ${message}`);
    },

    success(message) {
        console.log(`${this.colors.green}[SUCCESS]${this.colors.reset} ${message}`);
    },

    warn(message) {
        console.log(`${this.colors.yellow}[WARN]${this.colors.reset} ${message}`);
    },

    error(message, error = null) {
        console.error(`${this.colors.red}[ERROR]${this.colors.reset} ${message}`);
        if (error) {
            console.error(error);
        }
    },

    logEmail(email) {
        console.log(`${this.colors.dim}----------------------------------------${this.colors.reset}`);
        console.log(`${this.colors.cyan}📧 NEW EMAIL FOUND${this.colors.reset}`);
        console.log(`${this.colors.bright}Subject:${this.colors.reset} ${email.subject}`);
        console.log(`${this.colors.bright}Date:${this.colors.reset}    ${email.date}`);

        if (email.jobs && email.jobs.length > 0) {
            console.log(`${this.colors.magenta}Jobs Found (${email.jobs.length}):${this.colors.reset}`);
            email.jobs.forEach(job => {
                console.log(`  • ${this.colors.white}${job.companyName}${this.colors.reset} - ${job.jobTitle}`);
            });
        } else {
            console.log(`${this.colors.gray}No jobs parsed from this email.${this.colors.reset}`);
        }
        console.log(`${this.colors.dim}----------------------------------------${this.colors.reset}`);
    },

    logJob(job) {
        console.log(`${this.colors.dim}========================================${this.colors.reset}`);
        console.log(`${this.colors.green}📋 SCRAPED JOB DATA${this.colors.reset}`);
        console.log(`${this.colors.bright}Title:${this.colors.reset}      ${job.title}`);
        console.log(`${this.colors.bright}Company:${this.colors.reset}    ${job.company}`);
        console.log(`${this.colors.bright}Location:${this.colors.reset}   ${job.location}`);
        console.log(`${this.colors.bright}Posted:${this.colors.reset}     ${job.postedDate ? new Date(job.postedDate).toLocaleDateString() : 'N/A'}`);
        console.log(`${this.colors.dim}URL:${this.colors.reset}        ${job.url}`);

        if (job.skills && job.skills.length > 0) {
            console.log(`${this.colors.yellow}Skills:${this.colors.reset}      ${job.skills.join(', ')}`);
        }

        if (job.description) {
            console.log(`${this.colors.magenta}Description (Excerpt):${this.colors.reset}`);
            console.log(`${this.colors.gray}${job.description.substring(0, 300)}...${this.colors.reset}`);
        }

        if (job.qualifications) {
            console.log(`${this.colors.magenta}Qualifications (Excerpt):${this.colors.reset}`);
            console.log(`${this.colors.gray}${job.qualifications.substring(0, 300)}...${this.colors.reset}`);
        }
        console.log(`${this.colors.dim}========================================${this.colors.reset}`);
    }
};
