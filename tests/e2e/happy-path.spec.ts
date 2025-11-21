import { test, expect } from '@playwright/test';

async function ensureServerOrSkip(request: any, baseURL: string | undefined) {
  const res = await request.get(baseURL ?? 'http://localhost:3000');
  if (!res.ok()) {
    test.skip(true, 'Dev server not running at baseURL');
  }
}

const tripStart = '2024-01-01';
const tripEnd = '2024-01-04';

const gotoAndWait = async (page: any, path: string) => {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
};

test.describe('happy path (requires dev server)', () => {
  test.beforeAll(async ({ request, baseURL }) => {
    await ensureServerOrSkip(request, baseURL);
  });

  test('create trip → add traveler/expenses → mark usage → budget totals → export/import', async ({ page, context, baseURL }) => {
    // Home
    await gotoAndWait(page, '/');
    await page.getByRole('link', { name: /Set up your trip dates/i }).click();

    // Setup
    await page.getByLabel('Trip Start Date').fill(tripStart);
    await page.getByLabel('Trip End Date').fill(tripEnd);
    await page.getByRole('button', { name: /Save and Continue/i }).click();

    // Travelers
    await page.getByLabel('Name').fill('Alice');
    await page.getByLabel('Start Date').fill(tripStart);
    await page.getByLabel('End Date').fill(tripEnd);
    await page.getByRole('button', { name: /Add Traveler/i }).click();
    await expect(page.getByDisplayValue('Alice')).toBeVisible();
    await page.getByRole('button', { name: /Continue to Expenses/i }).click();

    // Expenses: daily shared hotel stayWeighted
    await page.getByLabel('Expense Name').fill('Hotel');
    await page.getByLabel('Total Cost').fill('300');
    await page.getByLabel('Start Date').fill(tripStart);
    await page.getByLabel('End Date').fill(tripEnd);
    await page.getByRole('radio', { name: /Even-day split/i }).check();
    await page.getByRole('button', { name: /Add Daily Shared Expense/i }).click();
    await expect(page.getByText(/Hotel/)).toBeVisible();

    // Usage
    await page.getByRole('link', { name: /Usage/i }).click();
    // Select Alice for hotel on day 1
    await page.getByRole('checkbox', { name: 'Alice' }).check();

    // Budget
    await page.getByRole('link', { name: /Budget/i }).click();
    await expect(page.getByText(/Grand Total/)).toBeVisible();
    await expect(page.getByText(/Hotel/)).toBeVisible();

    // Export JSON
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /Export JSON/i }).click(),
    ]);
    const exportPath = await download.path();
    expect(exportPath).toBeTruthy();

    // Import JSON (reload page to ensure fresh state)
    await page.reload();
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: /Import JSON/i }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(exportPath!);
    await expect(page.getByText(/Import successful/i)).toBeVisible();

    // Verify budget still shows hotel after import
    await expect(page.getByText(/Hotel/)).toBeVisible();
  });
});
