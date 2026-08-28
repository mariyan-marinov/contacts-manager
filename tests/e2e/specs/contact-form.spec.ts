import { exampleContact } from '../pages/contact-form.page';
import { expect, test } from '../fixtures';

test('creating a contact lands it in the list', async ({ contactsList, contactForm }) => {
  await contactsList.goto();
  await contactsList.startNewContact();
  await contactForm.fill(exampleContact);
  await contactForm.save();

  await contactsList.waitForRows();

  await expect(contactsList.rowFor('Zwart')).toBeVisible();
  await expect(contactsList.rowFor('Zwart')).toContainText('NL91****4300');
});

test('an IBAN that fails the checksum is refused and named', async ({
  contactsList,
  contactForm,
  page,
}) => {
  await contactsList.goto();
  await contactsList.startNewContact();
  // Right length and shape, wrong check digits — only the server can tell.
  await contactForm.fill({ ...exampleContact, iban: 'NL92ABNA0417164300' });
  await contactForm.save();

  await expect(contactForm.errorsFor('IBAN')).toContainText('checksum');
  await expect(page).toHaveURL(/\/contacts\/new/);
  await expect(contactForm.errorsFor('First name')).toHaveCount(0);
});

test('an edit survives a reload', async ({ contactsList, contactForm, page }) => {
  await contactsList.goto();
  await contactsList.edit('Sanne Bakker');
  await contactForm.set('Surname', 'Bakker-Vermeer');
  await contactForm.save();

  await contactsList.waitForRows();
  await expect(contactsList.rowFor('Bakker-Vermeer')).toBeVisible();

  await page.reload();
  await contactsList.waitForRows();

  await expect(contactsList.rowFor('Bakker-Vermeer')).toBeVisible();
});
