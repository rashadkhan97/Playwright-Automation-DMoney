// Test tags; attached with test(name, { tag }, fn) and run with: npx playwright test --grep "@smoke"
export const SUITES = {
  smoke: '@smoke', // positive (happy path) tests only
};
