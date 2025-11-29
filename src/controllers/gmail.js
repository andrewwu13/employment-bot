import { google } from "googleapis";
import dotenv from "dotenv"

dotenv.config();

export async function fetchUnreadEmails() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET
  );
  oauth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN,
  });
  const gmail = google.gmail({ version: "v1", auth: oauth2Client })
  const list = await gmail.users.messages.list({
    userId: "me",
    q: "is:unread",
  });
  if (!list.data.messages) return [];
  const emails = [];
  for (const msg of list.data.messages) {
    const detail = await gmail.users.messages.get({
      userId: "me",
      id: msg.id,
    });
    const payload = detail.data.payload;
    const headers = payload.headers.reduce((acc,h) => {
      acc[h.name] = h.value;
      return acc;
    }, {});

    const body = Buffer.from(
      payload.parts?.[0]?.body?.data || "",
      "base64"
    ).toString();

    emails.push({
      id: msg.id,
      from: headers["From"],
      subject: headers["Subject"],
      date: headers["Date"],
      snippet: detail.data.snippet,
      body: body,
    });
  }
  return emails;
}