# DMoney Portal – Playwright End-to-End Automation

End-to-end UI automation of the [DMoney Portal](https://dmoneyportal.roadtocareer.net) written with **Playwright + TypeScript**. One automated journey covers an Agent's whole life: sign-up, Admin activation, System deposit, Agent login with email OTP, cash-in to a Customer, password reset, and export of the Self Statement to a CSV file.

## Contents

- [What the automation does](#what-the-automation-does)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Setup](#setup)
- [How to run](#how-to-run)
- [Test files and what each one covers](#test-files-and-what-each-one-covers)
- [Validation coverage (20 required checks)](#validation-coverage-20-required-checks)
- [Negative test cases](#negative-test-cases)
- [Smoke suite vs regression suite](#smoke-suite-vs-regression-suite)
- [Test Report & Documentation](#Test-Report-&-Documentation)
- [Design notes](#design-notes)
- [Generated files](#generated-files)
- [Known limitations](#known-limitations)

## What the automation does

The tests run in order and pass data to each other through `data/agent.json`.

1. Open the portal, go to **Sign Up** and register a new user with the **Agent** role.
2. Log in as **Admin**, find the new Agent in the user list, **activate** it, log out.
3. Log in as **System**, **deposit 2000 Tk** to the Agent, log out.
4. Log in as the new **Agent** (password + email OTP read from Gmail), check the balance is **2000 Tk**.
5. **Cash-in 500 Tk** from the Agent to an existing Customer (`01159981900`), verify the transaction, log out.
6. **Reset the Agent password** through the emailed reset link, check the **old password fails**, log in with the **new password**.
7. Open **Self Statement**, extract the whole table and save it as `self_statement_<today>.csv`.

## Tech stack

| Tool | Use |
|---|---|
| [Playwright Test](https://playwright.dev/) `@playwright/test` | Test runner, browser automation, assertions |
| TypeScript | Language |
| [Faker](https://fakerjs.dev/) `@faker-js/faker` | Random Agent names |
| Gmail API | Reads the login OTP and password-reset link from the inbox |
| Node.js `fs` | Passes the new Agent between test files and writes the CSV |
| GitHub Actions | CI workflow (`.github/workflows/playwright.yml`) |

## Project structure

```
Playwright-Assignment/
├── .github/workflows/playwright.yml   # CI: runs the tests and uploads the HTML report
├── data/
│   ├── agent.json                     # Agent created by test 01 (read by tests 02-05); generated each run, git-ignored
│   └── self_statement_<date>.csv      # Exported Self Statement (output of test 05)
├── pages/                             # Page Object Models (one class per screen)
│   ├── RegisterPage.ts                # Sign Up form + RegisterModel interface
│   ├── LoginPage.ts                   # Login, OTP, forgot-password link, logout
│   ├── UserListPage.ts                # Admin user list: search by email, activate Agent
│   ├── CashInPage.ts                  # Cash In (deposit) form used by System and Agent
│   ├── DashboardPage.ts               # Header balance button
│   ├── ResetPasswordPage.ts           # Forgot Password + Set New Password
│   └── SelfStatementPage.ts           # Opens Self Statement and reads the table
├── tests/                             # Numbered so they run in this order
│   ├── 01-register.spec.ts
│   ├── 02-adminActivateAgentAccount.spec.ts
│   ├── 03-systemDepositAgent.spec.ts
│   ├── 04-agentLoginBalance.spec.ts
│   └── 05-resetAgentPassword.spec.ts
├── utils/
│   ├── gmail.ts                       # GmailClient: waits for OTP mail / reset-link mail
│   ├── csv.ts                         # saveCsv(): writes rows to a CSV file
│   ├── randomNumber.ts                # generateRandomNumber(min, max)
│   └── suits.ts                       # SUITES.smoke = "@smoke" tag
├── playwright.config.ts               # baseURL, 1 worker, headed, chromium/firefox/webkit projects
├── package.json
├── .env                               # GMAIL_ACCESS_TOKEN (git-ignored, you create it)
└── .gitignore                         # node_modules, reports, .env, data/agent.json
```

## Setup

**Requirements:** Node.js (LTS) and a Gmail account that receives the portal's emails.

```bash
# 1. install dependencies
npm install

# 2. install the Playwright browsers
npx playwright install
```

**3. Create a `.env` file** in the project root with a Gmail API access token:

```
GMAIL_ACCESS_TOKEN=<your token>
```

- The token needs permission to **read Gmail** (`gmail.readonly` scope).
- Gmail access tokens **expire after about 1 hour**. If tests 04 or 05 fail with `401 ... invalid authentication credentials`, paste a fresh token into `.env` and run again.
- `.env` is git-ignored, so the token is never committed.

**Why Gmail?** The portal emails a 4-digit OTP when an Agent logs in and a link when a password is reset. The Agent email is `mdroshungpt+agent<NN>@gmail.com`. Gmail delivers `+alias` addresses to the main inbox, so the tests can read those emails with the token.

## How to run

| Goal | Command |
|---|---|
| Full regression (all tests, headed) | `npx playwright test` |
| Smoke suite (positive tests only) | `npx playwright test --grep "@smoke"` |
| Chromium only | add `--project=chromium` |
| One file | `npx playwright test tests/03-systemDepositAgent.spec.ts` |
| List tests without running | `npx playwright test --list` |
| Open the last HTML report | `npx playwright show-report` |

> In PowerShell keep the quotes around `"@smoke"`, otherwise PowerShell treats `@smoke` as splatting.

Run the whole suite, not single later files, for a real check: tests 02–05 use the Agent that test 01 just registered. Running only `04` or `05` reuses the last Agent from `data/agent.json`, which has already been used (its balance and password have changed).

## Test files and what each one covers

| File | Tests (in order) |
|---|---|
| `01-register.spec.ts` | Register new Agent `@smoke` → Sign up with an already registered email is rejected |
| `02-adminActivateAgentAccount.spec.ts` | Admin login with a wrong password → Admin activates the new Agent and logs out `@smoke` |
| `03-systemDepositAgent.spec.ts` | System logs in `@smoke` → System deposit of a huge amount fails → System deposits 2000 Tk to the new Agent and logs out `@smoke` |
| `04-agentLoginBalance.spec.ts` | Agent logs in with OTP and balance is 2000 Tk `@smoke` → Agent cash-in 500 Tk to customer and logs out `@smoke` |
| `05-resetAgentPassword.spec.ts` | Agent password reseted with the emailed link `@smoke` → Login with the old password fails → Agent logs in with the new password `@smoke` → Save Self Statement as CSV `@smoke` |

## Validation coverage (20 required checks)

Each check is tagged in the code with a comment like `-- validation 11`.

| # | Validation | Test file |
|---|---|---|
| 1 | Agent registration is successful (HTTP 201, role `Agent`) | `01` |
| 2 | New Agent is initially inactive (status `pending`, row shows PENDING) | `01`, `02` |
| 3 | Admin login is successful | `02` |
| 4 | New Agent appears in the Admin user list | `02` |
| 5 | Admin can activate the Agent | `02` |
| 6 | Agent remains active after page reload | `02` |
| 7 | System login is successful | `03` |
| 8 | System can deposit 2000 Tk to the Agent | `03` |
| 9 | System deposit creates the correct transaction record (amount, balance, transaction ID on the receipt) | `03` |
| 10 | Agent can log in after activation | `04` |
| 11 | Agent balance is exactly 2000 Tk | `04` |
| 12 | Agent can deposit 500 Tk to an existing Customer | `04` |
| 13 | Agent balance is updated correctly (2000 − 500 + 12.50 commission = 1512.50) | `04` |
| 14 | Customer deposit appears in the Agent's Self Statement | `04` |
| 15 | Agent logout works | `04` |
| 16 | Agent password reset works | `05` |
| 17 | Login with the old password fails after reset | `05` |
| 18 | Login with the new password succeeds | `05` |
| 19 | Self Statement contains the expected transaction data | `05` |
| 20 | Self Statement data is saved into `self_statement_<date>.csv` | `05` |

## Negative test cases

Extra tests where the portal must **reject** the action. They are not tagged `@smoke`.

| Test | File | Expected result |
|---|---|---|
| Sign up with an already registered email | `01` | "An account with this email already exists", stays on Sign Up |
| Admin login with a wrong password | `02` | "Login failed" message, stays on Login |
| System deposit of a huge amount | `03` | "SYSTEM account has insufficient balance" |
| Login with the old password after reset | `05` | "Login failed" message |

## Smoke suite vs regression suite

- **Regression suite:** every test, `npx playwright test` → **13 tests** (9 positive + 4 negative).
- **Smoke suite:** only the **positive** tests, tagged `@smoke` through `SUITES.smoke` in `utils/suits.ts`, run with `npx playwright test --grep "@smoke"` → **9 tests**.

## Test Report & Documentation

### Full Automation Process 

https://github.com/user-attachments/assets/c00b6ff7-fbef-4e54-a656-e3761e19d898

### Regression Test Result
<img width="1315" height="820" alt="regression test 01" src="https://github.com/user-attachments/assets/20c2db16-1c07-4bb8-b6ac-c8dbafd32913" />
<img width="1290" height="607" alt="regression test 02" src="https://github.com/user-attachments/assets/9db10999-8e9d-4928-984e-38096b66c8af" />


### Smoke Test Result
<img width="1306" height="590" alt="smoke test 01" src="https://github.com/user-attachments/assets/877089f1-45a6-4e6b-822d-67d81a6c6924" />
<img width="1292" height="526" alt="smoke test 02" src="https://github.com/user-attachments/assets/16d24e71-78e6-4a59-b8d2-256cbd5a95b4" />


## Design notes

- **Page Object Model:** locators and actions live in `pages/`. Tests only call methods like `loginPage.login()` or `cashInPage.deposit()`, so a UI change is fixed in one place.
- **Shared browser window:** inside a test file, tests share one browser context and page (created in `beforeAll`, closed in `afterAll`). This is how the flow continues in the same window, for example a failed login followed by the valid login.
- **Serial mode:** `test.describe.configure({ mode: 'serial' })` runs the tests of a file in order and skips the rest if one fails.
- **File order:** Playwright runs files alphabetically, so the test files carry `01-` … `05-` prefixes. `workers: 1` in `playwright.config.ts` runs one file at a time.
- **Passing data between files:** test 01 saves the new Agent to `data/agent.json`; tests 02–05 read it at run time. Test 05 adds the `newPassword` to the same file.
- **Random test data:** Faker for names, `generateRandomNumber()` for the email number (`agent<N>`), phone number, NID and the new password.
- **Email OTP and reset link:** `utils/gmail.ts` polls the Gmail API, ignores older emails, and returns the OTP (from the mail snippet) or the reset link (from the mail body).
- **CSV export:** `utils/csv.ts` quotes every cell, because values like the date contain commas.

## Generated files

| File | Created by | Meaning |
|---|---|---|
| `data/agent.json` | test 01 (updated by test 05) | The Agent used in the run: name, email, phone, NID, old password, `newPassword`. **Git-ignored**, because it holds test passwords |
| `data/self_statement_<YYYY-MM-DD>.csv` | test 05 | Self Statement table: Transaction ID, Sender, Receiver, Type, Debit, Credit, Balance, Date |
| `playwright-report/`, `test-results/` | Playwright | HTML report and artifacts (git-ignored) |

## Known limitations

- Tests run against the **live portal**. Each full run registers a new Agent, deposits 2000 Tk to it, sends 500 Tk to the Customer `01159981900`, and sends OTP/reset emails to your inbox.
- The Gmail token expires in about an hour, so tests 04 and 05 need a fresh token for each session.
- The CI workflow runs the suite on push, but it has no `.env` token, so the Gmail-based tests (04, 05) cannot pass there unless a secret is added. `data/agent.json` is git-ignored, so it only exists after test 01 has run.
- The Self Statement is read from the visible table page only; it holds a handful of rows for a fresh Agent.
