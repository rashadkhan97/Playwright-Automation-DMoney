import { test, expect, BrowserContext, Page } from '@playwright/test';
import { SUITES } from '../utils/suits';
import { faker } from '@faker-js/faker';
import * as fs from 'fs';
import { RegisterPage, RegisterModel } from '../pages/RegisterPage';
import { generateRandomNumber } from '../utils/randomNumber';

// Both tests share one context + one page, so the duplicate sign-up continues in the same window after the valid one
let browserContext: BrowserContext;
let page: Page;

test.describe('Agent sign up', () => {
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

  test('Register new Agent', { tag: SUITES.smoke }, async () => {
    const registerPage = new RegisterPage(page); // POM: Sign Up form locators + register()

    const randId = String(generateRandomNumber(1, 999));

    // Test data typed with RegisterModel (pages/RegisterPage.ts); random values keep each run unique
    const agent: RegisterModel = {
      fullName: faker.person.fullName(),
      email: `mdroshungpt+agent${randId}@gmail.com`, // gmail +alias lands in your inbox
      password: '1234',
      phoneNumber: `01${generateRandomNumber(100000000, 999999999)}`,
      nid: `${generateRandomNumber(1000000000, 9999999999)}`,
      role: 'Agent',
    };

    await registerPage.open();

    // Capture the register API response: proves backend created an Agent in pending state
    const registerResponse = page.waitForResponse('**/user/register');
    await registerPage.register(agent);
    const response = await registerResponse;
    expect(response.status()).toBe(201); // Agent registration is successful -- validation 01
    const body = await response.json();
    expect(body.message).toContain('Registration successful');
    expect(body.user.role).toBe('Agent');
    expect(body.user.status).toBe('pending'); // new Agent is initially inactive (pending approval) -- validation 02

    await expect(page).toHaveURL(/\/login/); // portal redirects to login after sign up

    fs.writeFileSync('data/agent.json', JSON.stringify(agent, null, 2)); // read by tests/02 and tests/03 to find this agent
  });

  // Negative test 01 - register with already registered email; page stays open from the test above
  test('Sign up with an already registered email is rejected', async () => {
    const agent = JSON.parse(fs.readFileSync('data/agent.json', 'utf-8')); // agent registered by the test above
    const registerPage = new RegisterPage(page); // POM: Sign Up form

    await registerPage.open();
    await registerPage.register({
      fullName: 'Negative Test',
      email: agent.email, // already registered, so the portal must reject it
      password: '1234',
      phoneNumber: '01322222222',
      nid: '1234567891',
      role: 'Agent',
    });

    await expect(page.getByText('An account with this email already exists')).toBeVisible();
    await expect(page).toHaveURL(/\/register/); // no second account created, stays on Sign Up
  });
});
