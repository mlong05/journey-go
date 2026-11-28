import { test, expect } from '@playwright/test';

const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/register',
  '/auth',
  '/activate',
  '/community',
  '/community/1',
  '/tours/1',
  '/trips',
  '/trips/1',
  '/partner-program',
  '/partner-register',
  '/partner-register/success',
  '/payment/result',
  '/invitations/test-token',
  '/checkout/1',
];

const ACCOUNT_ROUTES = [
  '/account',
  '/account/achievements',
  '/account/ai-guide',
  '/account/invitations',
  '/account/messages',
  '/account/notifications',
  '/account/posts',
  '/account/refunds',
  '/account/requests',
  '/account/requests/new',
  '/account/requests/1',
  '/account/rewards',
];

const ADMIN_ROUTES = [
  '/admin',
  '/admin/ai-guide',
  '/admin/audit-logs',
  '/admin/badge-config',
  '/admin/commission-policies',
  '/admin/experience-rewards',
  '/admin/finance',
  '/admin/guest-types',
  '/admin/partner-profile-updates',
  '/admin/partners',
  '/admin/refund-reasons',
  '/admin/refunds',
  '/admin/regions',
  '/admin/settlements',
  '/admin/themes',
  '/admin/users',
  '/admin/vouchers',
];

const MODERATOR_ROUTES = [
  '/moderator',
  '/moderator/community',
  '/moderator/history',
  '/moderator/tour-merges',
  '/moderator/tours',
  '/moderator/tours/1',
];

const PARTNER_PROVIDER_ROUTES = [
  '/partner',
  '/partner/revenues',
  '/partner/settlements',
  '/partner/wallet',
  '/provider',
  '/provider/bookings',
  '/provider/finance',
  '/provider/finance/revenues',
  '/provider/finance/settlements',
  '/provider/finance/wallet',
  '/provider/partner-info',
  '/provider/requests',
  '/provider/support',
  '/provider/tour-merges',
  '/provider/tours',
  '/provider/tours/1/edit',
];

async function setupApiMockAndAuth(page, role) {
  // Mock backend API calls when testing frontend standalone so pages render without ECONNREFUSED
  await page.route('**/api/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [],
        content: [],
        items: [],
        total: 0,
        totalElements: 0,
      }),
    });
  });

  if (role) {
    await page.addInitScript((userRole) => {
      localStorage.setItem(
        'journey_go_auth',
        JSON.stringify({
          token: 'playwright-mock-token',
          accessToken: 'playwright-mock-token',
          role: userRole,
          user: {
            id: 1,
            fullName: `Playwright ${userRole}`,
            email: `${userRole.toLowerCase()}@journeygo.local`,
            role: userRole,
          },
        })
      );
    }, role);
  }
}

async function auditRoute(page, routePath) {
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  const response = await page.goto(routePath, { waitUntil: 'domcontentloaded', timeout: 30000 });

  const status = response?.status() ?? 0;
  expect(status, `HTTP status for ${routePath}`).toBeLessThan(500);
  await expect(page.locator('body')).toBeVisible();

  // Wait for client hydration / dynamic imports / legacy /partner* redirects to render content
  await expect
    .poll(
      async () => ((await page.locator('body').innerText()).trim().length),
      {
        message: `Empty body on ${routePath}`,
        timeout: 15000,
      }
    )
    .toBeGreaterThan(0);

  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));

  if (overflow.scrollWidth > overflow.innerWidth + 2) {
    console.log(`[OVERFLOW] ${routePath}: scrollWidth=${overflow.scrollWidth} > innerWidth=${overflow.innerWidth}`);
  }
  if (consoleErrors.length > 0) {
    console.log(`[CONSOLE_ERR] ${routePath}: ${consoleErrors.slice(0, 2).join(' | ')}`);
  }

  expect(pageErrors, `Uncaught pageerror on ${routePath}: ${pageErrors.join('; ')}`).toEqual([]);
}

test.describe('Full Frontend UI Audit', () => {
  test.describe('Public & Auth routes', () => {
    for (const route of PUBLIC_ROUTES) {
      test(`desktop ${route}`, async ({ page }) => {
        await setupApiMockAndAuth(page, null);
        await auditRoute(page, route);
      });
    }
  });

  test.describe('Account routes (USER)', () => {
    for (const route of ACCOUNT_ROUTES) {
      test(`desktop ${route}`, async ({ page }) => {
        await setupApiMockAndAuth(page, 'USER');
        await auditRoute(page, route);
      });
    }
  });

  test.describe('Admin routes (ADMIN)', () => {
    for (const route of ADMIN_ROUTES) {
      test(`desktop ${route}`, async ({ page }) => {
        await setupApiMockAndAuth(page, 'ADMIN');
        await auditRoute(page, route);
      });
    }
  });

  test.describe('Moderator routes (MODERATOR)', () => {
    for (const route of MODERATOR_ROUTES) {
      test(`desktop ${route}`, async ({ page }) => {
        await setupApiMockAndAuth(page, 'MODERATOR');
        await auditRoute(page, route);
      });
    }
  });

  test.describe('Partner & Provider routes (PROVIDER)', () => {
    for (const route of PARTNER_PROVIDER_ROUTES) {
      test(`desktop ${route}`, async ({ page }) => {
        await setupApiMockAndAuth(page, 'PROVIDER');
        await auditRoute(page, route);
      });
    }
  });

  test.describe('Mobile viewport (390x844) key routes', () => {
    test.use({ viewport: { width: 390, height: 844 } });
    for (const route of ['/', '/login', '/community', '/trips', '/admin', '/moderator', '/provider']) {
      test(`mobile ${route}`, async ({ page }) => {
        const role = route.startsWith('/admin')
          ? 'ADMIN'
          : route.startsWith('/moderator')
            ? 'MODERATOR'
            : route.startsWith('/provider')
              ? 'PROVIDER'
              : null;
        await setupApiMockAndAuth(page, role);
        await auditRoute(page, route);
      });
    }
  });
});
