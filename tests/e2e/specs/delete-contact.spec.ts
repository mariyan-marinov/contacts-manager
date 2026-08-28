import { expect, test } from '../fixtures';

test('deleting asks first, then removes the row', async ({ contactsList }) => {
  await contactsList.goto();
  await expect(contactsList.rowFor('Cavendish')).toBeVisible();

  await contactsList.delete('Eleanor Cavendish');
  await expect(contactsList.confirmationDialog()).toBeVisible();

  // Backing out leaves the contact alone.
  await contactsList.cancelDeletion();
  await expect(contactsList.rowFor('Cavendish')).toBeVisible();

  await contactsList.delete('Eleanor Cavendish');
  await contactsList.confirmDeletion();

  await expect(contactsList.rowFor('Cavendish')).toHaveCount(0);
  await expect(contactsList.rows()).toHaveCount(11);
});
