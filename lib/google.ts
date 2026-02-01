import { google } from "googleapis";
import { prisma } from "@/lib/prisma";

export const getGoogleAuth = () => {
  // Legacy Service Account Auth
  const credentials = {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  };

  return new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
};

export const getUserAuth = async (userId: string) => {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "google" },
  });

  if (!account) {
    throw new Error("No Google account found for user");
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.AUTH_GOOGLE_ID,
    process.env.AUTH_GOOGLE_SECRET
  );

  oauth2Client.setCredentials({
    access_token: account.access_token,
    refresh_token: account.refresh_token,
    expiry_date: account.expires_at ? account.expires_at * 1000 : undefined,
  });
  
  // Refresh token logic is handled by googleapis automatically if refresh_token is present?
  // Yes, but we might want to update the DB with new tokens. 
  // For simplicity, we trust googleapis to refresh in-memory for the operation.
  // Ideally we should listen to 'tokens' event and update DB, but for now let's rely on valid refresh token.

  return oauth2Client;
};
