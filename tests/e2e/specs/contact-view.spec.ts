import { expect, test } from '../fixtures';

test('opening a contact reads it without putting it at risk', async ({
  contactsList,
  contactView,
  page,
}) => {
  await contactsList.goto();

  await contactsList.open('Bakker');

  await expect(page).toHaveURL(/\/contacts\/[0-9a-f-]+$/);
  await expect(contactView.heading()).toHaveText('Sanne Bakker');
  // The point of the page: there is nothing here to type into by accident.
  await expect(contactView.inputs()).toHaveCount(0);
});

test('the full IBAN is on the contact, and only the mask is in the list', async ({
  contactsList,
  contactView,
}) => {
  await contactsList.goto();

  expect(await contactsList.maskedIbanFor('Bakker')).toBe('NL91****4300');

  await contactsList.open('Bakker');

  await expect(contactView.valueFor('IBAN')).toHaveText('NL91ABNA0417164300');
});

test('the address reads as an address rather than as five fields', async ({
  contactsList,
  contactView,
}) => {
  await contactsList.goto();
  await contactsList.open('Bakker');

  const address = contactView.valueFor('Address');

  await expect(address).toContainText('Keizersgracht 241');
  await expect(address).toContainText('1016 EA Amsterdam');
  // The name, not the code the API stores.
  await expect(address).toContainText('Netherlands');
});

test('editing is a deliberate step from reading', async ({
  contactsList,
  contactView,
  contactForm,
  page,
}) => {
  await contactsList.goto();
  await contactsList.open('Bakker');

  await contactView.edit();

  await expect(page).toHaveURL(/\/contacts\/[0-9a-f-]+\/edit$/);
  await expect(contactForm.heading()).toHaveText('Edit contact');
  await expect(contactForm.ibanValue()).toHaveValue('NL91ABNA0417164300');
});

test('the pencil in the list still goes straight to the form', async ({
  contactsList,
  contactForm,
  page,
}) => {
  await contactsList.goto();

  await contactsList.edit('Sanne Bakker');

  await expect(page).toHaveURL(/\/contacts\/[0-9a-f-]+\/edit$/);
  await expect(contactForm.heading()).toHaveText('Edit contact');
});

test('a date of birth is shown, and sorts, without a trip through the form', async ({
  contactsList,
  page,
}) => {
  await contactsList.goto();

  expect(await contactsList.dateOfBirthFor('Bakker')).toBe('1988-04-12');

  const sorted = page.waitForRequest((request) => request.url().includes('sort=dateOfBirth'));
  await contactsList.sortByDateOfBirth();
  await sorted;

  // Oldest first: Kowalczyk, born 1965, is the earliest of the twelve. Asserted on the row rather
  // than on a snapshot of the surnames, so this waits for the sorted page instead of reading
  // whichever one is still on screen.
  await expect(contactsList.rows().first()).toContainText('Kowalczyk');
});

/**
 * The date of birth used to arrive as midnight UTC and be read back with local getters, so west of
 * Greenwich a contact lost a day every time it was saved. This is that round trip, through the real
 * browser and the real API.
 */
test('a date of birth survives being saved untouched', async ({
  contactsList,
  contactView,
  contactForm,
}) => {
  await contactsList.goto();

  expect(await contactsList.dateOfBirthFor('Bakker')).toBe('1988-04-12');

  await contactsList.edit('Sanne Bakker');
  await contactForm.save();
  await contactsList.waitForRows();

  expect(await contactsList.dateOfBirthFor('Bakker')).toBe('1988-04-12');

  await contactsList.open('Bakker');
  await expect(contactView.valueFor('Date of birth')).toHaveText('1988-04-12');
});
