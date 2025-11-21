import { test, expect } from '@playwright/test';

async function ensureServerOrSkip(request: any, baseURL: string | undefined) {
  const res = await request.get(baseURL ?? 'http://localhost:3000');
  if (!res.ok()) {
    test.skip(true, 'Dev server not running at baseURL');
  }
}

test.describe('happy path (requires dev server)', () => {
  test.beforeAll(async ({ request, baseURL }) => {
    await ensureServerOrSkip(request, baseURL);
  });

  test('loads home and navigation links', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Trip Budget Planner/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Set up your trip dates/i })).toBeVisible();
  });
});
