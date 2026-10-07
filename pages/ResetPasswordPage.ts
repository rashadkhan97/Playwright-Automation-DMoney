import { Page, Locator } from '@playwright/test';

// Forgot Password + Set New Password pages; used by tests/05-resetAgentPassword.spec.ts
export class ResetPasswordPage {
  private readonly identifierInput: Locator;
  private readonly sendLinkButton: Locator;
  private readonly linkSentMessage: Locator;
  private readonly newPasswordInput: Locator;
  private readonly confirmPasswordInput: Locator;
  private readonly resetButton: Locator;
  readonly resetDoneMessage: Locator; // "Password Reset!" confirmation, also checked by tests/05-resetAgentPassword.spec.ts

  constructor(private readonly page: Page) {
    this.identifierInput = page.getByPlaceholder(/user@gmail.com/);
    this.sendLinkButton = page.getByRole('button', { name: /^Send Reset Link/ });
    this.linkSentMessage = page.getByText(/reset link has been sent/i);
    this.newPasswordInput = page.locator('input[type="password"]').first();
    this.confirmPasswordInput = page.locator('input[type="password"]').nth(1);
    this.resetButton = page.getByRole('button', { name: /^Reset Password/ });
    this.resetDoneMessage = page.getByText('Password Reset!');
  }

  // Forgot Password page: asks the portal to email a reset link
  async requestResetLink(identifier: string) {
    await this.identifierInput.fill(identifier);
    await this.sendLinkButton.click();
    await this.linkSentMessage.waitFor();
  }

  // Link comes from GmailClient.waitForResetLink (utils/gmail.ts)
  async openResetLink(link: string) {
    await this.page.goto(link);
  }

  async setNewPassword(password: string) {
    await this.newPasswordInput.fill(password);
    await this.confirmPasswordInput.fill(password);
    await this.resetButton.click();
    await this.resetDoneMessage.waitFor(); // wait until the portal confirms, so the next step can't cut the request off
  }
}
