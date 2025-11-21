import { test, expect } from '@playwright/test';

const tripStart = '2024-01-01';
const tripEnd = '2024-01-04';

test('create trip, add traveler and expense, mark usage, export/import budget', async ({ page }) => {
  await page.goto('/setup');

  // Setup dates
  await page.getByLabel(/^Start Date$/i).fill(tripStart);
  await page.getByLabel(/^End Date$/i).fill(tripEnd);
  await page.getByRole('button', { name: /Continue to Travelers/i }).click();

  // Travelers: add Alice
  await page.getByLabel(/^Name$/i).fill('Alice');
  await page.getByLabel(/^Start Date$/i).fill(tripStart);
  await page.getByLabel(/^End Date$/i).fill(tripEnd);
  await page.getByRole('button', { name: /Add Traveler/i }).click();
  await expect(page.locator('input[value="Alice"]')).toBeVisible();
  await page.getByRole('button', { name: /Continue to Expenses/i }).click();

  // Expenses: add daily shared Hotel (defaults to trip date range)
  await page.waitForURL('**/expenses');
  await expect(page.getByRole('heading', { name: 'Expenses', level: 1 })).toBeVisible();
  await page.getByRole('tab', { name: /Daily Shared/i }).click();
  await page.getByLabel(/^Expense Name$/i).fill('Hotel');
  await page.getByLabel(/Total Cost/i).fill('300');
  await page.getByRole('radio', { name: /Even-day split/i }).check();
  await page.getByRole('button', { name: /Add Daily Shared Expense/i }).click();

  // Usage: mark Alice present if shown
  await page.getByRole('link', { name: /Usage/i }).click();
  const aliceCheckbox = page.getByRole('checkbox', { name: 'Alice' });
  if (await aliceCheckbox.count()) {
    await aliceCheckbox.first().check();
  }

  // Budget: verify shows totals
  await page.getByRole('link', { name: 'Budget', exact: true }).click();
  await expect(page.getByText(/Grand Total/)).toBeVisible();

  // Export JSON
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /Export JSON/i }).click(),
  ]);
  const exportPath = await download.path();
  expect(exportPath).toBeTruthy();

  // Clear and re-import
  await page.evaluate(() => localStorage.removeItem('tripState'));
  await page.reload();
  await page.goto('/budget');

  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: /Import JSON/i }).click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(exportPath!);
  await expect(page.getByText(/Import successful/i)).toBeVisible({ timeout: 10000 });
  await expect(page.getByText(/Grand Total/)).toBeVisible();
});
