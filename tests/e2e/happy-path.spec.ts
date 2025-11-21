import { test, expect } from '@playwright/test';

const tripStart = '2024-01-01';
const tripEnd = '2024-01-04';

const seededState = {
  version: 1,
  startDate: tripStart,
  endDate: tripEnd,
  displayCurrency: 'USD',
  travelers: [
    { id: 't1', name: 'Alice', startDate: tripStart, endDate: tripEnd },
    { id: 't2', name: 'Bob', startDate: tripStart, endDate: tripEnd },
  ],
  dailySharedExpenses: [
    {
      id: 'hotel',
      name: 'Hotel',
      currency: 'USD',
      totalCost: 300,
      startDate: tripStart,
      endDate: tripEnd,
      splitMode: 'stayWeighted',
    },
  ],
  dailyPersonalExpenses: [],
  oneTimeSharedExpenses: [],
  oneTimePersonalExpenses: [],
  days: [
    { id: '2024-01-01', date: '2024-01-01' },
    { id: '2024-01-02', date: '2024-01-02' },
    { id: '2024-01-03', date: '2024-01-03' },
  ],
  usageCosts: {
    oneTimeShared: {},
    oneTimePersonal: {},
    days: {
      '2024-01-01': { dailyShared: { hotel: ['t1', 't2'] }, dailyPersonal: {} },
      '2024-01-02': { dailyShared: { hotel: ['t1', 't2'] }, dailyPersonal: {} },
      '2024-01-03': { dailyShared: { hotel: ['t1', 't2'] }, dailyPersonal: {} },
    },
  },
};

test('budget view, export, import (seeded state)', async ({ page }) => {
  await page.goto('/');
  await page.evaluate((state) => {
    localStorage.setItem('tripState', JSON.stringify(state));
  }, seededState);
  await page.reload();

  await page.goto('/budget');
  await expect(page.getByText(/Grand Total/)).toBeVisible();
  await expect(page.getByText(/Alice/)).toBeVisible();

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
  await expect(page.getByText(/Alice/)).toBeVisible();
});
