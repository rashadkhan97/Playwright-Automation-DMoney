import { Page, Locator } from '@playwright/test';

// Admin User List page object; used by tests/02-adminActivateAgentAccount.spec.ts to find and activate the new Agent
export class UserListPage {
  private readonly userListMenu: Locator;
  private readonly searchTypeSelect: Locator;
  private readonly searchInput: Locator;
  private readonly searchButton: Locator;
  private readonly viewButton: Locator;
  private readonly editUserButton: Locator;
  private readonly statusSelect: Locator;
  private readonly saveButton: Locator;
  readonly firstRow: Locator; // first search result row
  readonly updateSuccessMessage: Locator;
  readonly accountStatus: Locator; // status badge block on the user detail page

  constructor(private readonly page: Page) {
    this.userListMenu = page.getByRole('link', { name: 'User List' });
    this.searchTypeSelect = page.getByRole('combobox').first();
    this.searchInput = page.getByRole('textbox').first(); // appears after a search type is chosen
    this.searchButton = page.getByRole('button', { name: 'Search' });
    this.viewButton = page.getByRole('button', { name: 'View' });
    this.editUserButton = page.getByRole('button', { name: 'Edit User' });
    this.statusSelect = page.getByRole('combobox').nth(1); // 2nd dropdown on the edit form (1st is Role)
    this.saveButton = page.getByRole('button', { name: 'Save Changes' });
    this.firstRow = page.locator('tbody tr').first();
    this.updateSuccessMessage = page.getByText('User updated successfully');
    this.accountStatus = page.getByText(/^account status$/i).first().locator('..');
  }

  async openUserList() {
    await this.userListMenu.click();
    await this.page.waitForURL('**/admin/users');
  }

  async searchByEmail(email: string) {
    await this.searchTypeSelect.click();
    await this.page.getByRole('option', { name: 'Search by Email' }).click();
    await this.searchInput.fill(email);
    await this.searchButton.click();
  }

  // Opens the first (only) search result, edits it and sets status to Active
  async activateFirstResult() {
    await this.viewButton.first().click();
    await this.editUserButton.click();
    await this.statusSelect.click();
    await this.page.getByRole('option', { name: 'Active' }).click();
    await this.saveButton.click();
  }
}
