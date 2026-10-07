import { Page, Locator } from '@playwright/test';

// Shape of sign-up data; tests/01-register.spec.ts builds one and passes it to register()
export interface RegisterModel {
  fullName: string;
  email: string; // portal accepts only @gmail.com
  password: string; // min 4 chars
  phoneNumber: string; // 11 digits, starts with 01
  nid: string; // 7-13 digits
  role: 'Customer' | 'Agent' | 'Merchant';
}

// Sign Up page object; used by tests/01-register.spec.ts
export class RegisterPage {
  private readonly signUpLink: Locator;
  private readonly fullNameInput: Locator;
  private readonly emailInput: Locator;
  private readonly passwordInput: Locator;
  private readonly phoneInput: Locator;
  private readonly nidInput: Locator;
  private readonly roleSelect: Locator;
  private readonly createAccountButton: Locator;

  constructor(private readonly page: Page) {
    this.signUpLink = page.getByRole('link', { name: 'Sign Up', exact: true }).first();
    this.fullNameInput = page.getByPlaceholder('Enter your full name');
    this.emailInput = page.getByPlaceholder('yourname@gmail.com');
    this.passwordInput = page.getByPlaceholder('Minimum 4 characters');
    this.phoneInput = page.getByPlaceholder(/11-digit phone number/);
    this.nidInput = page.getByPlaceholder(/7–13 digit NID/);
    this.roleSelect = page.getByRole('combobox');
    this.createAccountButton = page.getByRole('button', { name: /^Create Account/ });
  }

  // Home page -> Sign Up page via header link
  async open() {
    await this.page.goto('/');
    await this.signUpLink.click();
    await this.page.waitForURL('**/register');
  }

  // Role options carry an emoji prefix (e.g. "🏪 Agent"), so match by text, not exact name
  async selectRole(role: RegisterModel['role']) {
    await this.roleSelect.click();
    await this.page.getByRole('option', { name: role }).click();
  }

  // Fills whole form from RegisterModel, then submits
  async register(user: RegisterModel) {
    await this.fullNameInput.fill(user.fullName);
    await this.emailInput.fill(user.email);
    await this.passwordInput.fill(user.password);
    await this.phoneInput.fill(user.phoneNumber);
    await this.nidInput.fill(user.nid);
    await this.selectRole(user.role);
    await this.createAccountButton.click();
  }
}
