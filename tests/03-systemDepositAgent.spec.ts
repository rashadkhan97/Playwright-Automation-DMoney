import { test, expect, BrowserContext, Page } from '@playwright/test';
import { SUITES } from '../utils/suits';
import * as fs from 'fs';
import { LoginPage } from '../pages/LoginPage';
import { CashInPage } from '../pages/CashInPage';

// All tests share one context + one page, so the 2000 Tk deposit continues in the same logged-in window after the failed one
let browserContext: BrowserContext;
let page: Page;

test.describe('System session', () => {
  test.describe.configure({ mode: 'serial' }); // run in order

  // runs once before all tests; `browser` fixture comes from Playwright
  test.beforeAll(async ({ browser }) => {
    browserContext = await browser.newContext();
    page = await browserContext.newPage(); // the single page every test uses
  });

  // runs once after all tests; closes the context we opened manually
  test.afterAll(async () => {
    await browserContext.close();
  });

  test('System logs in', { tag: SUITES.smoke }, async () => {
    const loginPage = new LoginPage(page); // POM: login()

    await loginPage.login('system@dmoney.com', '1234');
    await expect(page).toHaveURL(/\/profile/); // System login is successful -- validation 07
    await expect(page.getByText('Agent Dashboard')).toBeVisible();
  });

  // Negative test 03 - System deposit huge amount 
  test('System deposit of a huge amount fails', async () => {
    const agent = JSON.parse(fs.readFileSync('data/agent.json', 'utf-8')); // agent saved by tests/01-register.spec.ts
    const cashInPage = new CashInPage(page); // POM: Cash In form

    await cashInPage.open();
    await cashInPage.deposit(agent.phoneNumber, 9999999999999); // far more than the SYSTEM balance

    await expect(page.getByText('SYSTEM account has insufficient balance')).toBeVisible();
  });

  test('System deposits 2000 Tk to the new Agent and logs out', { tag: SUITES.smoke }, async () => {
    const agent = JSON.parse(fs.readFileSync('data/agent.json', 'utf-8')); // agent saved by tests/01-register.spec.ts
    const loginPage = new LoginPage(page); // POM: logout()
    const cashInPage = new CashInPage(page); // POM: Cash In form

    await cashInPage.open();
    const response = await cashInPage.deposit(agent.phoneNumber, 2000);
    await expect(page.getByText('SYSTEM deposit to Agent successful')).toBeVisible(); // System can deposit 2000 Tk to the Agent -- validation 08

    // the deposit created the correct transaction record -- validation 09
    expect(response.status()).toBe(201);
    const transaction = await response.json();
    expect(transaction.amount).toBe(2000);
    expect(transaction.agentBalance).toBe(2000); // fresh Agent had 0 before
    expect(transaction.trnxId).toBeTruthy();
    await expect(page.getByText(transaction.trnxId)).toBeVisible(); // receipt shows the same transaction ID
    await expect(page.getByText('৳ 2000.00').first()).toBeVisible(); // receipt total amount

    await loginPage.logout();
    await expect(page).toHaveURL(/\/login/);
  });
});
