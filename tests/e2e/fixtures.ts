import { test as base, expect } from '@playwright/test';
import { ContactFormPage } from './pages/contact-form.page';
import { ContactViewPage } from './pages/contact-view.page';
import { ContactsListPage } from './pages/contacts-list.page';

interface Fixtures {
  readonly contactsList: ContactsListPage;
  readonly contactForm: ContactFormPage;
  readonly contactView: ContactViewPage;
}

export const test = base.extend<Fixtures & { seededDatabase: void }>({
  /**
   * Every spec starts from the same twelve contacts. The endpoint exists only under the Test
   * environment, which is what the API is started with.
   */
  seededDatabase: [
    async ({ request }, use) => {
      const response = await request.post('/api/test/reset');
      expect(response.ok(), 'the database should reseed before each spec').toBeTruthy();
      await use();
    },
    { auto: true },
  ],

  contactsList: async ({ page }, use) => {
    await use(new ContactsListPage(page));
  },

  contactForm: async ({ page }, use) => {
    await use(new ContactFormPage(page));
  },

  contactView: async ({ page }, use) => {
    await use(new ContactViewPage(page));
  },
});

export { expect };
