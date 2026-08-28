import { Locator, Page, expect } from '@playwright/test';

/** Everything the specs know about the list screen. Locators live here, not in the specs. */
export class ContactsListPage {
  constructor(private readonly page: Page) {}

  async goto(query = ''): Promise<void> {
    await this.page.goto(`/contacts${query}`);
    await this.waitForRows();
  }

  async waitForRows(): Promise<void> {
    await expect(this.rows().first()).toBeVisible();
  }

  /** Data rows only: the header row has column headers rather than cells. */
  rows(): Locator {
    return this.page.getByRole('row').filter({ has: this.page.getByRole('cell') });
  }

  rowFor(surname: string): Locator {
    return this.rows().filter({ hasText: surname });
  }

  async surnames(): Promise<string[]> {
    const rows = await this.rows().all();

    return Promise.all(
      rows.map(async (row) => (await row.locator('td').first().innerText()).trim()),
    );
  }

  async maskedIbanFor(surname: string): Promise<string> {
    return (await this.rowFor(surname).locator('td').nth(4).innerText()).trim();
  }

  async search(term: string): Promise<void> {
    await this.page.getByLabel('Search contacts').fill(term);
  }

  async sortBySurname(): Promise<void> {
    await this.page.getByRole('columnheader', { name: 'Surname' }).click();
  }

  async goToNextPage(): Promise<void> {
    await this.page.getByRole('button', { name: 'Next Page' }).click();
  }

  async startNewContact(): Promise<void> {
    await this.page.getByRole('button', { name: 'New contact' }).click();
  }

  async edit(fullName: string): Promise<void> {
    await this.page.getByRole('button', { name: `Edit ${fullName}` }).click();
  }

  async delete(fullName: string): Promise<void> {
    await this.page.getByRole('button', { name: `Delete ${fullName}` }).click();
  }

  /** Named, because PrimeNG nests two elements carrying the alertdialog role. */
  confirmationDialog(name = 'Delete this contact?'): Locator {
    return this.page.getByRole('alertdialog', { name });
  }

  async confirmDeletion(): Promise<void> {
    await this.confirmationDialog().getByRole('button', { name: 'Delete' }).click();
  }

  async cancelDeletion(): Promise<void> {
    await this.confirmationDialog().getByRole('button', { name: 'Cancel' }).click();
  }

  toast(): Locator {
    return this.page.getByRole('alert');
  }
}
