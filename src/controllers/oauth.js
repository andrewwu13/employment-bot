import express from "express";
import { google } from "googleapis";
import dotenv from "dotenv"

dotenv.config();

const app = express();
const PORT = 3000;

const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  ''
);

app.get("/auth", (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/gmail.modify"],
    prompt: "consent"
  });
  res.redirect(url)
});

app.get("/oauth2callback", async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).send("Missing code query parameter. Start from /auth.");
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    console.log("REFRESH TOKEN:", tokens.refresh_token); // logs to console

    // Send both messages in one response
    res.send(`
      <p>REFRESH TOKEN (check console for logs): ${tokens.refresh_token}</p>
      <p>Copy the refresh token from your server logs.</p>
    `);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error retrieving tokens. Check console.");
  }
});
app.listen(PORT, () => console.log(`OAuth server running on ${PORT}`))
console.log("CLIENT ID:", process.env.GMAIL_CLIENT_ID);
console.log("CLIENT SECRET:", process.env.GMAIL_CLIENT_SECRET);