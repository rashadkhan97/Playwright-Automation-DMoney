import { APIRequestContext, expect } from '@playwright/test';

// Loads GMAIL_ACCESS_TOKEN from .env (git-ignored)
process.loadEnvFile('.env');

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me/messages';

// Reads OTP mails via Gmail API; used by tests/04-agentLoginBalance.spec.ts and tests/05-resetAgentPassword.spec.ts
export class GmailClient {
  private readonly headers = { Authorization: `Bearer ${process.env.GMAIL_ACCESS_TOKEN}` };

  // `request` is Playwright's APIRequestContext fixture passed from the spec
  constructor(private readonly request: APIRequestContext) {}

  // Polls until an OTP mail received at/after `since` (epoch ms) arrives; older mails are ignored
  async waitForOtp(since: number, timeoutMs = 180_000, intervalMs = 3_000): Promise<string> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const otp = await this.findOtpSince(since);
      if (otp) return otp;
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    throw new Error(`No new "Your Login OTP" mail received within ${timeoutMs / 1000}s`);
  }

  // One poll: checks newest OTP mails, returns OTP only if mail is newer than `since`
  private async findOtpSince(since: number): Promise<string | null> {
    const listRes = await this.request.get(GMAIL_API, {
      headers: this.headers,
      params: { q: 'subject:"Your Login OTP"', maxResults: 5 },
    });
    expect(listRes.status(), await listRes.text()).toBe(200);
    const { messages = [] } = await listRes.json();

    for (const { id } of messages) {
      const readRes = await this.request.get(`${GMAIL_API}/${id}`, { headers: this.headers });
      expect(readRes.status(), await readRes.text()).toBe(200);
      const mail = await readRes.json();
      if (Number(mail.internalDate) < since) return null; // newest first, so the rest are older too
      const otp = this.extractOtp(mail.snippet);
      if (otp) return otp;
    }
    return null;
  }

  // Takes the 4-digit OTP from the mail snippet only
  extractOtp(snippet: string): string | null {
    return snippet.match(/\b\d{4}\b/)?.[0] ?? null;
  }

  // Polls until a password reset mail received at/after `since` (epoch ms) arrives; returns the reset link inside it
  async waitForResetLink(since: number, timeoutMs = 180_000, intervalMs = 3_000): Promise<string> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const link = await this.findResetLinkSince(since);
      if (link) return link;
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    throw new Error(`No new "Password Reset Request" mail received within ${timeoutMs / 1000}s`);
  }

  // One poll: checks newest reset mails, returns the link only if mail is newer than `since`
  private async findResetLinkSince(since: number): Promise<string | null> {
    const listRes = await this.request.get(GMAIL_API, {
      headers: this.headers,
      params: { q: 'subject:"Password Reset Request"', maxResults: 5 },
    });
    expect(listRes.status(), await listRes.text()).toBe(200);
    const { messages = [] } = await listRes.json();

    for (const { id } of messages) {
      const readRes = await this.request.get(`${GMAIL_API}/${id}`, { headers: this.headers });
      expect(readRes.status(), await readRes.text()).toBe(200);
      const mail = await readRes.json();
      if (Number(mail.internalDate) < since) return null; // newest first, so the rest are older too
      const link = this.extractResetLink(mail.payload);
      if (link) return link;
    }
    return null;
  }

  // Finds the reset-password URL in the plain-text part of the mail body (base64url encoded)
  extractResetLink(part: any): string | null {
    if (part.body?.data) {
      const text = Buffer.from(part.body.data, 'base64').toString();
      const link = text.match(/https?:\/\/\S*reset-password\?token=\w+/)?.[0];
      if (link) return link;
    }
    for (const child of part.parts ?? []) {
      const link = this.extractResetLink(child);
      if (link) return link;
    }
    return null;
  }
}
