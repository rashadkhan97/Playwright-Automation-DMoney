import { test, expect, BrowserContext, Page } from '@playwright/test';
import { SUITES } from '../utils/suits';
import * as fs from 'fs';
import { LoginPage } from '../pages/LoginPage';
import { ResetPasswordPage } from '../pages/ResetPasswordPage';
import { SelfStatementPage } from '../pages/SelfStatementPage';
import { GmailClient } from '../utils/gmail';
import { saveCsv } from '../utils/csv';
import { generateRandomNumber } from '../utils/randomNumber';

// All tests share one context + one page, so each test continues in the same window
let browserContext: BrowserContext;
let page: Page;

test.describe('Agent password reset', () => {
  test.describe.configure({ mode: 'serial' }); // run in order

  const ranNumber = generateRandomNumber(10000, 99999); //used for newPassword
  const newPassword = String(ranNumber); //

  // runs once before all tests; `browser` fixture comes from Playwright
  test.beforeAll(async ({ browser }) => {
    browserContext = await browser.newContext();
    page = await browserContext.newPage(); // the single page every test uses
  });

  // runs once after all tests; closes the context we opened manually
  test.afterAll(async () => {
    await browserContext.close();
  });

  test('Agent password reseted with the emailed link', { tag: SUITES.smoke }, async ({ request }) => {
    test.setTimeout(240_000); // reset mail delay is random, so allow extra time
    const agent = JSON.parse(fs.readFileSync('data/agent.json', 'utf-8')); // agent saved by tests/01-register.spec.ts
    const loginPage = new LoginPage(page); // POM: forgot password link + login error
    const resetPasswordPage = new ResetPasswordPage(page); // POM: request link + set new password

    await loginPage.openForgotPassword();
    const requestedAt = Date.now(); // mails older than this are stale reset links
    await resetPasswordPage.requestResetLink(agent.phoneNumber);
    const resetLink = await new GmailClient(request).waitForResetLink(requestedAt); // utils/gmail.ts
    await resetPasswordPage.openResetLink(resetLink);
    await resetPasswordPage.setNewPassword(newPassword);
    await expect(resetPasswordPage.resetDoneMessage).toBeVisible(); // Agent password reset works -- validation 16
    fs.writeFileSync('data/agent.json', JSON.stringify({ ...agent, newPassword }, null, 2)); // keep the new password next to the old one for later tests
  });

  // Negative test 04 - Login with old password 
  test('Login with the old password fails', async () => {
    const agent = JSON.parse(fs.readFileSync('data/agent.json', 'utf-8')); // has the old password and the newPassword saved by the test above
    const loginPage = new LoginPage(page); // POM: submitCredentials() + login error

    await loginPage.submitCredentials(agent.phoneNumber, agent.password);
    await expect(loginPage.errorMessage).toBeVisible(); // login with the old password fails -- validation 17
  });

  test('Agent logs in with the new password', { tag: SUITES.smoke }, async ({ request }) => {
    test.setTimeout(240_000); // OTP mail delay is random, so allow extra time
    const agent = JSON.parse(fs.readFileSync('data/agent.json', 'utf-8')); // has newPassword saved by test 1
    const loginPage = new LoginPage(page); // POM: submitCredentials() / submitOtp()

    // Portal asks for the email OTP again
    const otpRequestedAt = Date.now();
    await loginPage.submitCredentials(agent.phoneNumber, agent.newPassword);
    const otp = await new GmailClient(request).waitForOtp(otpRequestedAt);
    await loginPage.submitOtp(otp);
    await expect(page).toHaveURL(/\/profile/); // login with the new password succeeds -- validation 18
    await expect(page.getByText('Agent Dashboard')).toBeVisible();
  });

  test('Save Self Statement as CSV', { tag: SUITES.smoke }, async () => {
    const agent = JSON.parse(fs.readFileSync('data/agent.json', 'utf-8')); // agent saved by tests/01-register.spec.ts
    const selfStatementPage = new SelfStatementPage(page); // POM: open Self Statement + read table

    await selfStatementPage.open();
    const table = await selfStatementPage.extractTable();
    const today = new Date().toLocaleDateString('en-CA'); // local date as YYYY-MM-DD
    const csvPath = `data/self_statement_${today}.csv`;
    saveCsv(csvPath, table); // utils/csv.ts

    // Self Statement contains the expected transaction data -- validation 19
    expect(table[0]).toEqual(['Transaction ID', 'Sender Account', 'Receiver Account', 'Type', 'Debit', 'Credit', 'Balance', 'Date']);
    const topUp = table.find((row) => row[3] === 'Top-up from SYSTEM'); // 2000 Tk from tests/03-systemDepositAgent.spec.ts
    expect(topUp).toBeDefined();
    expect(topUp!.slice(1, 3)).toEqual(['SYSTEM', agent.phoneNumber]);
    expect(topUp![5]).toBe('2000.00'); // Credit
    const customerDeposit = table.find((row) => row[2] === '01159981900'); // 500 Tk from tests/04-agentLoginBalance.spec.ts
    expect(customerDeposit).toBeDefined();
    expect(customerDeposit![1]).toBe(agent.phoneNumber);
    expect(customerDeposit![4]).toBe('500.00'); // Debit
    expect(customerDeposit![6]).toBe('1512.50'); // Balance after

    // data is saved into self_statement_<today>.csv -- validation 20
    expect(fs.existsSync(csvPath)).toBe(true);
    const csv = fs.readFileSync(csvPath, 'utf-8');
    expect(csv.split('\n')).toHaveLength(table.length); // header + one line per row
    expect(csv).toContain(topUp![0]);
    expect(csv).toContain(customerDeposit![0]);
  });
});
