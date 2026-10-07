import { test, expect, BrowserContext, Page } from '@playwright/test';
import { SUITES } from '../utils/suits';
import * as fs from 'fs';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { CashInPage } from '../pages/CashInPage';
import { SelfStatementPage } from '../pages/SelfStatementPage';
import { GmailClient } from '../utils/gmail';

// Both tests share one context + one page, so the 2nd test continues in the same logged-in window
let browserContext: BrowserContext;
let page: Page;

test.describe('Agent session', () => {
  test.describe.configure({ mode: 'serial' }); // run in order

  // runs once before both tests; `browser` fixture comes from Playwright
  test.beforeAll(async ({ browser }) => {
    browserContext = await browser.newContext();
    page = await browserContext.newPage(); // the single page both tests use
  });

  // runs once after both tests; closes the context we opened manually
  test.afterAll(async () => {
    await browserContext.close();
  });

  test('Agent logs in with OTP and balance is 2000 Tk', { tag: SUITES.smoke }, async ({ request }) => {
    test.setTimeout(240_000); // OTP mail delay is random, so allow extra time
    const agent = JSON.parse(fs.readFileSync('data/agent.json', 'utf-8')); // agent saved by tests/01-register.spec.ts
    const loginPage = new LoginPage(page); // POM: submitCredentials() / submitOtp()
    const dashboardPage = new DashboardPage(page); // POM: header balance button

    const requestedAt = Date.now(); // mails older than this are stale OTPs
    await loginPage.submitCredentials(agent.phoneNumber, agent.password);
    const otp = await new GmailClient(request).waitForOtp(requestedAt); // utils/gmail.ts
    await loginPage.submitOtp(otp);
    await expect(page).toHaveURL(/\/profile/); // Agent can log in after activation -- validation 10
    await expect(page.getByText('Agent Dashboard')).toBeVisible();

    await dashboardPage.showBalance();
    await expect(dashboardPage.balanceButton).toContainText('2000.00'); // Agent balance is exactly 2000 Tk -- validation 11
  });

  test('Agent cash-in 500 Tk to customer and logs out', { tag: SUITES.smoke }, async () => {
    const loginPage = new LoginPage(page); // POM: logout()
    const dashboardPage = new DashboardPage(page); // POM: header balance button
    const cashInPage = new CashInPage(page); // POM: Cash In form
    const selfStatementPage = new SelfStatementPage(page); // POM: Self Statement table

    await cashInPage.open();
    const response = await cashInPage.deposit('01159981900', 500);
    expect(response.status()).toBe(201); // Agent can deposit 500 Tk to an existing Customer -- validation 12
    await expect(page.getByText('Deposit successful')).toBeVisible();

    // balance updated correctly = 2000 - 500 + 12.50 commission -- validation 13
    await expect(page.getByText(/CURRENT BALANCE/i).locator('..')).toContainText('1512.50'); // receipt
    await page.reload();
    await dashboardPage.showBalance();
    await expect(dashboardPage.balanceButton).toContainText('1512.50'); // header after reload

    // the customer deposit appears in the Agent's Self Statement -- validation 14
    await selfStatementPage.open();
    const table = await selfStatementPage.extractTable();
    const customerRow = table.find((row) => row[2] === '01159981900');
    expect(customerRow).toBeDefined();
    expect(customerRow![4]).toBe('500.00'); // Debit column

    await loginPage.logout();
    await expect(page).toHaveURL(/\/login/); //Agent logout works -- validation 15
  });
});
