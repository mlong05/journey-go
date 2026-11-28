import { test, expect } from '@playwright/test';

test.describe('Frontend smoke tests', () => {
  test('home page renders without uncaught runtime errors', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    const response = await page.goto('/');
    expect(response?.status()).toBeLessThan(400);
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('body')).not.toBeEmpty();
    expect(pageErrors).toEqual([]);
  });

  test('login page renders form controls', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    const response = await page.goto('/login');
    expect(response?.status()).toBeLessThan(400);
    await expect(page.locator('input').first()).toBeVisible({ timeout: 15000 });
    expect(pageErrors).toEqual([]);
  });
});
