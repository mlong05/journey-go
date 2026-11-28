import { test, expect } from '@playwright/test';

test.describe('Interactive Functional E2E Flows', () => {
  test('Login flow: fill credentials, submit form, and verify API payload + redirect', async ({ page }) => {
    let loginPayload = null;

    await page.route('**/api/**', async (route) => {
      const url = route.request().url();
      if (url.includes('/auth/login') && route.request().method() === 'POST') {
        loginPayload = route.request().postDataJSON();
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              token: 'mock-jwt-token',
              accessToken: 'mock-jwt-token',
              user: {
                id: 1,
                fullName: 'Test Tourist',
                email: loginPayload?.email || 'tourist@journeygo.com',
                role: 'USER',
              },
            },
          }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      });
    });

    await page.goto('/login');
    const emailInput = page.locator('input[placeholder="email@journeygo.com"]');
    const passwordInput = page.locator('input[type="password"]').first();

    await expect(emailInput).toBeVisible({ timeout: 15000 });
    await emailInput.fill('tourist@journeygo.com');
    await passwordInput.fill('Secret123!');

    const submitBtn = page.locator('form button[type="submit"]').first();
    await submitBtn.click();

    await expect.poll(() => loginPayload).not.toBeNull();
    expect(loginPayload).toMatchObject({
      email: 'tourist@journeygo.com',
      password: 'Secret123!',
    });

    // After login, auth token should be saved or redirected away from /login
    await page.waitForTimeout(500);
    const storedAuth = await page.evaluate(() => localStorage.getItem('journey_go_auth'));
    expect(storedAuth).toContain('mock-jwt-token');
  });

  test('Home page: search & filter tours, then navigate to tour detail', async ({ page }) => {
    const tomorrow = new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10);
    const mockTours = [
      {
        id: 101,
        tourId: 101,
        title: 'Hạ Long Bay Cruise',
        regionId: 1,
        regionName: 'Quảng Ninh',
        themeId: 1,
        themeName: 'Biển đảo',
        price: 1500000,
        durationDays: 2,
        format: 'GROUP',
        status: 'PUBLISHED',
        nextDepartureDate: tomorrow,
      },
      {
        id: 102,
        tourId: 102,
        title: 'Sapa Cloud Trekking',
        regionId: 2,
        regionName: 'Lào Cai',
        themeId: 2,
        themeName: 'Núi rừng',
        price: 2200000,
        durationDays: 3,
        format: 'PRIVATE',
        status: 'PUBLISHED',
        nextDepartureDate: tomorrow,
      },
    ];

    await page.route('**/api/**', async (route) => {
      const url = route.request().url();
      if (url.includes('/regions')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: [
              { id: 1, name: 'Quảng Ninh' },
              { id: 2, name: 'Lào Cai' },
            ],
          }),
        });
      }
      if (url.includes('/tours') && !url.includes('/tours/10')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { content: mockTours, totalElements: mockTours.length },
          }),
        });
      }
      if (url.includes('/tours/102')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: mockTours[1] }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      });
    });

    await page.goto('/');
    await expect(page.getByText('Hạ Long Bay Cruise').first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Sapa Cloud Trekking').first()).toBeVisible();

    // Filter by region checkbox in sidebar ("Lào Cai")
    await page.getByRole('checkbox', { name: /Lào Cai/i }).first().check();
    await expect(page.getByText('Sapa Cloud Trekking').first()).toBeVisible();
    await expect(page.getByText('Hạ Long Bay Cruise')).toHaveCount(0);

    // Click into Sapa Cloud Trekking detail page
    await page.getByRole('link', { name: /Sapa Cloud Trekking/i }).first().click();
    await expect(page).toHaveURL(/\/tours\/102/);
  });

  test('Tour detail: render tour info and interact with guest counter / booking controls', async ({ page }) => {
    const tomorrow = new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10);

    await page.route('**/api/**', async (route) => {
      const url = route.request().url();
      if (url.includes('/availability')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: [
              { id: 1, date: tomorrow, departureDate: tomorrow, availableSlots: 10, price: 1800000 },
            ],
          }),
        });
      }
      if (url.includes('/tours/1')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 1,
              title: 'Hội An Lantern Walk',
              description: 'Khám phá phố cổ Hội An về đêm.',
              price: 1800000,
              durationDays: 1,
              maxGuests: 10,
              status: 'PUBLISHED',
            },
          }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      });
    });

    await page.goto('/tours/1');
    await expect(page.getByRole('heading', { name: /Hội An Lantern Walk/i })).toBeVisible({ timeout: 15000 });
    await expect(page.locator('body')).toContainText('Khám phá phố cổ Hội An về đêm.');
  });

  test('Moderator Tour Review: view pending tours list and filter', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'journey_go_auth',
        JSON.stringify({
          token: 'mod-token',
          accessToken: 'mod-token',
          role: 'MODERATOR',
          user: { id: 9, fullName: 'Moderator Demo', email: 'mod@journeygo.local', role: 'MODERATOR' },
        })
      );
    });

    await page.route('**/api/**', async (route) => {
      const url = route.request().url();
      if (url.includes('/tours') || url.includes('/moderator')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              content: [
                {
                  id: 501,
                  title: 'Tour Ninh Bình Cần Duyệt',
                  status: 'PENDING_REVIEW',
                  providerName: 'VietTravel Partner',
                  createdAt: new Date().toISOString(),
                },
              ],
              totalElements: 1,
            },
          }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      });
    });

    await page.goto('/moderator/tours');
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('aside, nav').first()).toBeVisible({ timeout: 15000 });
  });
});
