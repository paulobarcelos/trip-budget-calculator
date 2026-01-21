import { test, expect } from '@playwright/test';

test('create trip, add traveler and expense, mark usage, export/import budget', async ({ page }) => {
  // 1. Start at landing page
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Trip Budget Calculator/i })).toBeVisible();

  // 2. Navigate to Expenses
  await page.getByRole('button', { name: /Let's get started/i }).click();
  await page.waitForURL('**/expenses');

  // 3. Add Expense
  // Wait for the page to be ready
  await expect(page.getByRole('heading', { name: 'Expenses', level: 1 })).toBeVisible();
  // Open unified creator
  await page.getByRole('button', { name: 'Add Expense' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  // Step 1: name
  await dialog.getByRole('textbox').fill('Dinner');
  await dialog.getByRole('button', { name: 'Next' }).click();

  // Step 2: choose One-off to avoid date picker
  await dialog.getByRole('button', { name: 'One-off' }).click();
  await dialog.getByRole('button', { name: 'Next' }).click();

  // Step 3: amount
  await dialog.getByPlaceholder('0.00').fill('150');
  await dialog.getByRole('button', { name: 'Next' }).click();

  // Step 4: keep Shared default, save
  await dialog.getByRole('button', { name: 'Save Expense' }).click();

  // Switch to One-off Expenses tab to view the new item
  await page.getByRole('tab', { name: 'One-off Expenses' }).click();
  await expect(page.getByText('Dinner')).toBeVisible();

  // 4. Navigate to Travelers
  await page.getByRole('link', { name: 'Travelers' }).click();
  await page.waitForURL('**/travelers');

  // 5. Add Traveler
  await page.getByRole('button', { name: /Add Traveler/i }).click();
  await page.getByLabel(/^Name$/i).fill('Alice');
  await page.getByRole('button', { name: /Add Traveler/i }).last().click(); // The dialog submit button

  await expect(page.getByText('Alice')).toBeVisible();

  // 6. Navigate to Usage
  await page.getByRole('link', { name: 'Usage' }).click();
  await page.waitForURL('**/usage');

  // 7. Mark Usage
  // The usage page likely has checkboxes for days/expenses.
  // "Alice" should be there.
  const aliceCheckbox = page.getByRole('checkbox', { name: 'Alice' });
  if (await aliceCheckbox.count()) {
    await aliceCheckbox.first().check();
  }

  // 8. Verify Totals on Travelers page
  await page.getByRole('link', { name: 'Travelers' }).click();
  await page.waitForURL('**/travelers');
  await expect(page.getByText(/Grand Total/i)).toBeVisible();

  // 9. Export JSON
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /Data Settings/i }).click(),
    page.getByText(/Save to file/i).click(),
  ]);
  const exportPath = await download.path();
  expect(exportPath).toBeTruthy();

  // 10. Clear and re-import
  await page.evaluate(() => localStorage.removeItem('tripState'));
  await page.reload();

  // We should see empty state
  await expect(page.getByText('Alice')).not.toBeVisible();

  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: /Data Settings/i }).click();
  await page.getByText(/Open file/i).click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(exportPath!);

  await expect(page.getByText(/Import successful/i)).toBeVisible({ timeout: 10000 });
  await expect(page.getByText('Alice')).toBeVisible();
  await expect(page.getByText(/Grand Total/i)).toBeVisible();
});
