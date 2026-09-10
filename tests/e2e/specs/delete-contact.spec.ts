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
  // The page refills from the fifty-five behind it, so what shrinks is the total rather than the
  // number of rows on screen.
  await expect(contactsList.pageReport()).toHaveText('1–20 of 54');
});
