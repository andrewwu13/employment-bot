# employment-bot
A Discord bot to automate job postings and streamline the application process.

Built using Node.js, Playwright and JavaScript.

## Running the App Locally
### Prerequisites
- [ ] Node.js installed (20.0 or higher)
- [ ] Environment Variables (from Discord SDK, you need a TOKEN, APPLICATION_ID, and PUBLIC_KEY )

### 1. Install Dependencies
```bash
npm install
```

### 2. Refresh Gmail Token
Get new gmail refresh token
```bash
node src/controllers/oauth.js
```
Then, visit http://localhost:3000/auth, and sign into google account. Enter refresh token into .env file

### 3. Run using node or nodemon
run scraper in dev mode:
```bash
npm run scraper:dev
```
run discord bot in dev mode:
```bash
npm run discord:dev
```