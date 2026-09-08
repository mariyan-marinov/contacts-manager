import { Locator, Page } from '@playwright/test';

/** The read-only page a contact opens on, before anything can be changed. */
export class ContactViewPage {
  constructor(private readonly page: Page) {}

  heading(): Locator {
    return this.page.getByRole('heading', { level: 2 });
  }

  /** The value shown under one of the labels in the details list. */
  valueFor(label: string): Locator {
    return this.page.locator('.view__field').filter({ hasText: label }).locator('dd');
  }

  /**
   * Scoped to this page's own header. Matching "Edit" across the whole page would also find the
   * twelve "Edit {name}" buttons in the list, and an exact match would miss this one — the icon
   * inside the button contributes a leading space to its accessible name.
   */
  async edit(): Promise<void> {
    await this.page.locator('.view__head').getByRole('button', { name: 'Edit' }).click();
  }

  async back(): Promise<void> {
    await this.page.getByRole('button', { name: 'Back to contacts' }).click();
  }

  /** Nothing on this page should be typeable. */
  inputs(): Locator {
    return this.page.locator('main input, main select, main textarea');
  }
}
