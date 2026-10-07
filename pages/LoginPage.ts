import { Page, Locator } from '@playwright/test';

// Login/logout page object; used by tests/02-adminActivateAgentAccount.spec.ts and tests/03-systemDepositAgent.spec.ts
export class LoginPage {
  private readonly identifierInput: Locator;
  private readonly passwordInput: Locator;
  private readonly loginButton: Locator;
  private readonly otpInput: Locator;
  private readonly verifyOtpButton: Locator;
  private readonly forgotPasswordLink: Locator;
  readonly errorMessage: Locator;
  private readonly profileMenu: Locator;
  private readonly logoutItem: Locator;

  constructor(private readonly page: Page) {
    this.identifierInput = page.getByPlaceholder('Enter email or phone number');
    this.passwordInput = page.locator('input[type="password"]');
    this.loginButton = page.getByRole('button', { name: /^Login/ });
    this.otpInput = page.getByLabel(/4-Digit OTP/);
    this.verifyOtpButton = page.getByRole('button', { name: /^Verify OTP/ });
    this.forgotPasswordLink = page.getByText('Forgot password?');
    this.errorMessage = page.getByText(/Login failed/);
    this.profileMenu = page.locator('.MuiAppBar-root .MuiAvatar-root'); // top-right avatar opens the menu
    this.logoutItem = page.getByText('Logout');
  }

  // Admin login: no OTP, lands on /profile
  async login(email: string, password: string) {
    await this.page.goto('/login');
    await this.identifierInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
    await this.page.waitForURL('**/profile');
  }

  // Agent flow step 1: shows OTP screen (tests/04-agentLoginBalance.spec.ts)
  async submitCredentials(identifier: string, password: string) {
    await this.page.goto('/login');
    await this.identifierInput.fill(identifier);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  // Agent flow step 2: OTP comes from GmailClient (utils/gmail.ts), lands on /profile
  async submitOtp(otp: string) {
    await this.otpInput.fill(otp);
    await this.verifyOtpButton.click();
    await this.page.waitForURL('**/profile');
  }

  // Login screen -> Forgot Password page (tests/05-resetAgentPassword.spec.ts)
  async openForgotPassword() {
    await this.page.goto('/login');
    await this.forgotPasswordLink.click();
    await this.page.waitForURL('**/forgot-password');
  }

  // Top-right avatar -> Logout, lands back on /login
  async logout() {
    await this.profileMenu.click();
    await this.logoutItem.click();
    await this.page.waitForURL('**/login');
  }
}
