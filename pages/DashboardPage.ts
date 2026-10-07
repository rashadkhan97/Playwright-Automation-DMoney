import { Page, Locator } from '@playwright/test';

// Header balance button on every dashboard; used by tests/04-agentLoginBalance.spec.ts
export class DashboardPage {
  readonly balanceButton: Locator;

  constructor(private readonly page: Page) {
    // Button reads "Balance" until clicked, then shows "৳ 2000.00"
    this.balanceButton = page.getByRole('button', { name: /Balance|৳/ });
  }

  // Click reveals the amount inside the same button
  async showBalance() {
    await this.balanceButton.click();
  }
}
