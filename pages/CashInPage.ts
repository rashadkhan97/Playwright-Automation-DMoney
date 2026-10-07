import { Page, Locator, Response } from '@playwright/test';

// Cash In (deposit) page object for the System and Agent accounts; used by tests/03-systemDepositAgent.spec.ts and tests/04-agentLoginBalance.spec.ts
export class CashInPage {
  private readonly cashInMenu: Locator;
  private readonly phoneInput: Locator;
  private readonly amountInput: Locator;
  private readonly cashInButton: Locator;

  constructor(private readonly page: Page) {
    this.cashInMenu = page.getByRole('link', { name: 'Cash In' }).first();
    this.phoneInput = page.getByPlaceholder("Enter customer's phone number");
    this.amountInput = page.getByPlaceholder('Enter amount in BDT');
    this.cashInButton = page.getByRole('button', { name: /^Cash In/ });
  }

  // Skips the menu click when already on Cash In (re-clicking it on the same page breaks the form)
  async open() {
    if (!this.page.url().includes('/agent/cash-in')) {
      await this.cashInMenu.click();
      await this.page.waitForURL('**/agent/cash-in');
    }
  }

  // Deposits `amount` Tk to the account with this phone number
  // Returns the deposit API response so tests can check the transaction record
  async deposit(phoneNumber: string, amount: number): Promise<Response> {
    await this.phoneInput.fill(phoneNumber);
    await this.amountInput.fill(String(amount));
    const depositResponse = this.page.waitForResponse('**/transaction/deposit'); // wait for the request to finish so a following logout can't cut it off
    await this.cashInButton.click();
    return await depositResponse;
  }
}
