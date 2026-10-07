import { test, expect, BrowserContext, Page } from '@playwright/test';
import { SUITES } from '../utils/suits';
import * as fs from 'fs';
import { LoginPage } from '../pages/LoginPage';
import { UserListPage } from '../pages/UserListPage';

// Both tests share one context + one page, so the valid login continues in the same window after the failed one
let browserContext: BrowserContext;
let page: Page;

test.describe('Admin session', () => {
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

  // Negative test 02 - Admin login with wrong password
  test('Admin login with a wrong password', async () => {
    const loginPage = new LoginPage(page); // POM: submitCredentials() + login error

    await loginPage.submitCredentials('admin@dmoney.com', 'wrongpass');

    await expect(loginPage.errorMessage).toBeVisible();
    await expect(page).toHaveURL(/\/login/); // not logged in; page stays open for the next test
  });

  test('Admin activates the new Agent and logs out', { tag: SUITES.smoke }, async () => {
    const agent = JSON.parse(fs.readFileSync('data/agent.json', 'utf-8')); // agent saved by tests/01-register.spec.ts, read at run time so it is the latest one
    const loginPage = new LoginPage(page); // POM: login() / logout()
    const userListPage = new UserListPage(page); // POM: search + activate

    await loginPage.login('admin@dmoney.com', '1234');
    await expect(page).toHaveURL(/\/profile/); //Admin login is successful -- validation 03
    await expect(page.getByText('Admin Dashboard')).toBeVisible();

    await userListPage.openUserList();
    await userListPage.searchByEmail(agent.email);
    await expect(userListPage.firstRow).toContainText(agent.email); //  new Agent appears in the Admin user list - validation 04
    await expect(userListPage.firstRow).toContainText(/pending/i); // Validation 2 (UI): Agent is not active yet

    await userListPage.activateFirstResult();
    await expect(userListPage.updateSuccessMessage).toBeVisible(); // Admin can activate the Agent -- validation 05
    await expect(userListPage.accountStatus).toContainText(/active/i);

    await page.reload();
    await expect(userListPage.accountStatus).toContainText(/active/i); //Agent stays active after page reload -- validation 06

    await loginPage.logout();
  });
});
