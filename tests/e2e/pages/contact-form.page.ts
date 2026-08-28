import { Locator, Page } from '@playwright/test';

export interface ContactFields {
  readonly firstName: string;
  readonly surname: string;
  readonly dateOfBirth: string;
  readonly street: string;
  readonly houseNumber: string;
  readonly postalCode: string;
  readonly city: string;
  readonly country: string;
  readonly phoneNumber: string;
  readonly iban: string;
}

export const exampleContact: ContactFields = {
  firstName: 'Wilhelmina',
  surname: 'Zwart',
  dateOfBirth: '1991-02-17',
  street: 'Prinsengracht',
  houseNumber: '12',
  postalCode: '1015 DV',
  city: 'Amsterdam',
  country: 'Netherlands',
  phoneNumber: '+31 6 5544 3322',
  iban: 'NL91ABNA0417164300',
};

export class ContactFormPage {
  constructor(private readonly page: Page) {}

  async fill(contact: ContactFields): Promise<void> {
    await this.page.getByLabel('First name').fill(contact.firstName);
    await this.page.getByLabel('Surname').fill(contact.surname);

    await this.setDateOfBirth(contact.dateOfBirth);

    await this.page.getByLabel('Street').fill(contact.street);
    await this.page.getByLabel('House number').fill(contact.houseNumber);
    await this.page.getByLabel('Postal code').fill(contact.postalCode);
    await this.page.getByLabel('City').fill(contact.city);
    await this.chooseCountry(contact.country);

    await this.page.getByLabel('Phone number').fill(contact.phoneNumber);
    await this.page.getByLabel('IBAN').fill(contact.iban);
  }

  /**
   * The date picker parses what it sees typed; a programmatic fill sets the value without it
   * noticing, so the control stays empty. Blurring afterwards is what commits the parse.
   */
  async setDateOfBirth(value: string): Promise<void> {
    const input = this.page.getByLabel('Date of birth');
    await input.click();
    await input.pressSequentially(value);
    await this.page.keyboard.press('Escape');
    await input.blur();
  }

  /** Scoped to its own field: the date picker also reports the combobox role. */
  async chooseCountry(name: string): Promise<void> {
    await this.page.locator('.field').filter({ hasText: 'Country' }).getByRole('combobox').click();
    await this.page.getByRole('option', { name, exact: true }).click();
  }

  async set(label: string, value: string): Promise<void> {
    await this.page.getByLabel(label).fill(value);
  }

  async save(): Promise<void> {
    await this.page.getByRole('button', { name: 'Save' }).click();
  }

  async cancel(): Promise<void> {
    await this.page.getByRole('button', { name: 'Cancel' }).click();
  }

  /** The messages rendered beneath one field, found by the label sitting above them. */
  errorsFor(label: string): Locator {
    return this.page.locator('.field').filter({ hasText: label }).locator('p-message');
  }

  ibanValue(): Locator {
    return this.page.getByLabel('IBAN');
  }

  heading(): Locator {
    return this.page.getByRole('heading', { level: 2 });
  }
}
