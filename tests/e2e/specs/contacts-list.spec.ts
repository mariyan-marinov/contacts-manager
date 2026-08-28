import { expect, test } from '../fixtures';

test('shows the seeded contacts, sorted by surname', async ({ contactsList }) => {
  await contactsList.goto();

  const surnames = await contactsList.surnames();

  expect(surnames).toEqual([...surnames].sort((left, right) => left.localeCompare(right)));
  expect(surnames).toContain('Bakker');
  expect(surnames).toContain('Steiner');
  expect(surnames).toHaveLength(12);
});

test('searching, sorting and paging each ask the server for the new view', async ({
  contactsList,
  page,
}) => {
  await contactsList.goto('?size=5');

  const searched = page.waitForRequest((request) => request.url().includes('search=ber'));
  await contactsList.search('ber');
  expect(new URL((await searched).url()).searchParams.get('page')).toBe('1');

  const sorted = page.waitForRequest((request) => request.url().includes('direction=desc'));
  await contactsList.sortBySurname();
  await sorted;

  await contactsList.search('');
  await expect(contactsList.rows()).toHaveCount(5);

  const paged = page.waitForRequest((request) => request.url().includes('page=2'));
  await contactsList.goToNextPage();
  await paged;

  // The address bar follows the store, so this view survives a reload.
  await expect(page).toHaveURL(/page=2/);
  const beforeReload = await contactsList.surnames();
  await page.reload();
  await contactsList.waitForRows();

  expect(await contactsList.surnames()).toEqual(beforeReload);
});

test('masks the IBAN in the list and shows it in full only on the contact', async ({
  contactsList,
  contactForm,
}) => {
  await contactsList.goto();

  expect(await contactsList.maskedIbanFor('Bakker')).toBe('NL91****4300');

  await contactsList.edit('Sanne Bakker');

  await expect(contactForm.ibanValue()).toHaveValue('NL91ABNA0417164300');
});
