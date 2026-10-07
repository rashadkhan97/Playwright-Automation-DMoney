import { Page, Locator } from '@playwright/test';

// Agent Self Statement page object; used by tests/05-resetAgentPassword.spec.ts
export class SelfStatementPage {
  private readonly selfStatementMenu: Locator;
  private readonly headerCells: Locator;
  private readonly rows: Locator;

  constructor(private readonly page: Page) {
    this.selfStatementMenu = page.getByRole('link', { name: 'Self Statement' }).first();
    this.headerCells = page.locator('thead th');
    this.rows = page.locator('tbody tr');
  }

  async open() {
    await this.selfStatementMenu.click();
    await this.page.waitForURL('**/agent/self-statement');
  }

  // Whole table as rows of text: header row first, then every data row
  async extractTable(): Promise<string[][]> {
    await this.rows.first().waitFor(); // rows load after the page opens
    const table: string[][] = [await this.headerCells.allInnerTexts()];
    for (const row of await this.rows.all()) {
      table.push(await row.locator('td').allInnerTexts());
    }
    return table;
  }
}
