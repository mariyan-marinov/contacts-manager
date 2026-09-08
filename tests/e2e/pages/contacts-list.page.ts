import { Locator, Page, expect } from "@playwright/test";

/** Everything the specs know about the list screen. Locators live here, not in the specs. */
export class ContactsListPage {
  constructor(private readonly page: Page) {}

  async goto(query = ""): Promise<void> {
    await this.page.goto(`/contacts${query}`);
    await this.waitForRows();
  }

  async waitForRows(): Promise<void> {
    await expect(this.rows().first()).toBeVisible();
  }

  /** Data rows only: the header row has column headers rather than cells. */
  rows(): Locator {
    return this.page
      .getByRole("row")
      .filter({ has: this.page.getByRole("cell") });
  }

  rowFor(surname: string): Locator {
    return this.rows().filter({ hasText: surname });
  }

  async surnames(): Promise<string[]> {
    const rows = await this.rows().all();

    return Promise.all(
      rows.map(async (row) =>
        (await row.locator("td").first().innerText()).trim(),
      ),
    );
  }

  /**
   * Columns are read by position, so they are named here rather than counted at each call site:
   * surname, first name, date of birth, city, phone, IBAN, actions.
   */
  private static readonly column = {
    surname: 0,
    firstName: 1,
    dateOfBirth: 2,
    city: 3,
    phone: 4,
    iban: 5,
  } as const;

  async cellFor(surname: string, column: keyof typeof ContactsListPage.column): Promise<string> {
    const index = ContactsListPage.column[column];

    return (
      await this.rowFor(surname).locator("td").nth(index).innerText()
    ).trim();
  }

  async maskedIbanFor(surname: string): Promise<string> {
    return this.cellFor(surname, "iban");
  }

  async dateOfBirthFor(surname: string): Promise<string> {
    return this.cellFor(surname, "dateOfBirth");
  }

  /** Opening a contact reads it; the link in the first cell is the accessible way in. */
  async open(surname: string): Promise<void> {
    await this.rowFor(surname).getByRole("link", { name: surname }).click();
    // The click starts a navigation rather than completing one, so whatever comes next would
    // otherwise run against the list it just left.
    await this.page.waitForURL(/\/contacts\/[0-9a-f-]+$/);
  }

  async sortByDateOfBirth(): Promise<void> {
    await this.page
      .getByRole("columnheader", { name: "Date of birth" })
      .click();
  }

  /** What the table says when it has nothing to show. */
  emptyState(): Locator {
    return this.page.locator(".contacts__empty");
  }

  async search(term: string): Promise<void> {
    await this.page.getByLabel("Search contacts").fill(term);
  }

  async sortBySurname(): Promise<void> {
    await this.page.getByRole("columnheader", { name: "Surname" }).click();
  }

  async goToNextPage(): Promise<void> {
    await this.page.getByRole("button", { name: "Next Page" }).click();
  }

  /**
   * The paginator's own report — "6–10 of 12". Waiting on this is what makes a paging assertion
   * about the page that arrived rather than the one still on screen.
   */
  pageReport(): Locator {
    return this.page.locator(".p-paginator-current");
  }

  /** What the paginator's rows-per-page control currently shows. */
  rowsPerPage(): Locator {
    return this.page.locator(".p-paginator .p-select-label");
  }

  async startNewContact(): Promise<void> {
    await this.page.getByRole("button", { name: "New contact" }).click();
  }

  async edit(fullName: string): Promise<void> {
    await this.page.getByRole("button", { name: `Edit ${fullName}` }).click();
  }

  async delete(fullName: string): Promise<void> {
    await this.page.getByRole("button", { name: `Delete ${fullName}` }).click();
  }

  /** Named, because PrimeNG nests two elements carrying the alertdialog role. */
  confirmationDialog(name = "Delete this contact?"): Locator {
    return this.page.getByRole("alertdialog", { name });
  }

  async confirmDeletion(): Promise<void> {
    await this.confirmationDialog()
      .getByRole("button", { name: "Delete" })
      .click();
  }

  async cancelDeletion(): Promise<void> {
    await this.confirmationDialog()
      .getByRole("button", { name: "Cancel" })
      .click();
  }

  toast(): Locator {
    return this.page.getByRole("alert");
  }
}
