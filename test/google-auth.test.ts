import { describe, it, expect, beforeAll } from "vitest";
import { google } from "googleapis";
import dotenv from "dotenv";
import path from "path";

// Cargar variables de entorno antes de los tests
beforeAll(() => {
  dotenv.config({ path: path.resolve(__dirname, "../.env") });
});

describe("Google Authentication & Permissions", () => {
  const getCredentials = () => ({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    subject: process.env.GOOGLE_SERVICE_ACCOUNT_SUBJECT,
  });

  it("should have all required environment variables", () => {
    const { email, key, subject } = getCredentials();
    expect(email).toBeDefined();
    expect(key).toContain("BEGIN PRIVATE KEY");
    expect(subject).toMatch(/@flacso.edu.uy$/);
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
        supportsAllDrives: true 
    });

    expect(res.data.id).toBe(folderId);
    expect(res.data.name).toBeDefined();
    console.log(`✅ Drive Destination: ${res.data.name}`);
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
