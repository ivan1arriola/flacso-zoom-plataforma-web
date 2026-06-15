import { describe, it, expect } from "vitest";
import { google } from "googleapis";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const getCredentials = () => ({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
  subject: process.env.GOOGLE_SERVICE_ACCOUNT_SUBJECT,
});

const hasGoogleIntegrationEnv = () => {
  const { email, key, subject } = getCredentials();
  return Boolean(
    email &&
    key.includes("BEGIN PRIVATE KEY") &&
    subject?.endsWith("@flacso.edu.uy") &&
    process.env.DRIVE_DESTINATION_ID
  );
};

const describeGoogleIntegration = hasGoogleIntegrationEnv() ? describe : describe.skip;

describeGoogleIntegration("Google Authentication & Permissions (integration)", () => {
  it("should have all required environment variables", () => {
    const { email, key, subject } = getCredentials();
    expect(email).toBeDefined();
    expect(key).toContain("BEGIN PRIVATE KEY");
    expect(subject).toMatch(/@flacso.edu.uy$/);
    expect(process.env.DRIVE_DESTINATION_ID).toBeDefined();
  });

  it("should successfully authorize with Domain-Wide Delegation", async () => {
    const { email, key, subject } = getCredentials();
    const auth = new google.auth.JWT({
      email,
      key,
      subject,
      scopes: ["https://www.googleapis.com/auth/drive.readonly"],
    });

    const token = await auth.authorize();
    expect(token.access_token).toBeDefined();
  });

  it("should be able to access the configured Drive destination folder", async () => {
    const { email, key, subject } = getCredentials();
    const folderId = process.env.DRIVE_DESTINATION_ID;
    expect(folderId).toBeDefined();

    const auth = new google.auth.JWT({
      email,
      key,
      subject,
      scopes: ["https://www.googleapis.com/auth/drive.readonly"],
    });

    const drive = google.drive({ version: "v3", auth });
    const res = await drive.files.get({
      fileId: folderId,
      fields: "id, name",
      supportsAllDrives: true,
    });

    expect(res.data.id).toBe(folderId);
    expect(res.data.name).toBeDefined();
  });

  it("should have permission to send emails via Gmail", async () => {
    const { email, key, subject } = getCredentials();
    const auth = new google.auth.JWT({
      email,
      key,
      subject,
      scopes: ["https://www.googleapis.com/auth/gmail.send"],
    });

    const token = await auth.authorize();
    expect(token.access_token).toBeDefined();
  });
});
