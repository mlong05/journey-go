import { test, expect } from '@playwright/test';

/**
 * Shared stateful mock backend for 2-user E2E testing (Tourist + Provider).
 * Allows actions by User 1 in Context 1 to be observed by User 2 in Context 2.
 */
function createSharedBackendState() {
  const tomorrow = new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10);

  return {
    tours: [
      {
        id: 201,
        tourId: 201,
        title: 'Tour Đà Lạt Sương Mù',
        description: 'Trải nghiệm săn mây và vườn hoa Đà Lạt.',
        regionId: 3,
        regionName: 'Lâm Đồng',
        themeId: 1,
        themeName: 'Thiên nhiên',
        price: 1950000,
        durationDays: 2,
        maxGuests: 12,
        format: 'GROUP',
        status: 'PUBLISHED',
        nextDepartureDate: tomorrow,
      },
    ],
    posts: [
      {
        id: 1,
        title: 'Chia sẻ kinh nghiệm đi Đà Lạt mùa hoa',
        content: 'Thời tiết buổi sáng rất mát mẻ, nên mang áo khoác nhẹ.',
        authorName: 'Minh Anh',
        status: 'PUBLISHED',
        reactionCount: 3,
        commentCount: 1,
        createdAt: new Date().toISOString(),
      },
    ],
    commentsByPost: {
      1: [
        {
          id: 10,
          content: 'Bài viết rất hữu ích!',
          authorName: 'Hoàng Nam',
          createdAt: new Date().toISOString(),
        },
      ],
    },
    tomorrow,
  };
}

async function attachSharedApiMock(page, state) {
  await page.route('**/api/**', async (route) => {
    const req = route.request();
    const url = req.url();
    const method = req.method();

    // Auth login
    if (url.includes('/auth/login') && method === 'POST') {
      const body = req.postDataJSON() || {};
      const isProvider = String(body.email || '').includes('provider');
      const role = isProvider ? 'CONTENT_PROVIDER' : 'USER';
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            token: isProvider ? 'token-provider-2' : 'token-tourist-1',
            accessToken: isProvider ? 'token-provider-2' : 'token-tourist-1',
            user: {
              id: isProvider ? 2 : 1,
              fullName: isProvider ? 'Partner Đà Lạt' : 'Du Khách An',
              email: body.email,
              role,
            },
          },
        }),
      });
    }

    // Regions
    if (url.includes('/regions')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [{ id: 3, name: 'Lâm Đồng' }],
        }),
      });
    }

    // Published tours
    if (url.includes('/tours/published')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { content: state.tours, totalElements: state.tours.length },
        }),
      });
    }

    // Tour detail & availability
    if (url.includes('/tours/201/public-detail') || (url.includes('/tours/201') && !url.includes('availability'))) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: state.tours[0] }),
      });
    }
    if (url.includes('/availability')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            { id: 1, date: state.tomorrow, departureDate: state.tomorrow, availableSlots: 8, price: 1950000 },
          ],
        }),
      });
    }

    // Provider tours list
    if (url.includes('/provider/tours')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { content: state.tours, totalElements: state.tours.length },
        }),
      });
    }

    // Community post comments (GET & POST)
    if (url.includes('/community/posts/1/comments')) {
      if (method === 'POST') {
        const body = req.postDataJSON() || {};
        const newComment = {
          id: Date.now(),
          content: body.content || '',
          authorName: 'Du Khách An',
          createdAt: new Date().toISOString(),
        };
        state.commentsByPost[1].push(newComment);
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: newComment }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: state.commentsByPost[1] }),
      });
    }

    // Community post detail
    if (url.includes('/community/posts/1')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: state.posts[0] }),
      });
    }

    // Community feed
    if (url.includes('/community/posts')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { content: state.posts, totalElements: state.posts.length },
        }),
      });
    }

    // Default fallback for dashboard/stats/notifications
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [] }),
    });
  });
}

test.describe('2-User End-to-End System Tests (Tourist + Provider)', () => {
  test('2 users log in with distinct roles and access their respective portals', async ({ browser }) => {
    const state = createSharedBackendState();
    const touristCtx = await browser.newContext();
    const providerCtx = await browser.newContext();

    const touristPage = await touristCtx.newPage();
    const providerPage = await providerCtx.newPage();

    await attachSharedApiMock(touristPage, state);
    await attachSharedApiMock(providerPage, state);

    // User 1 (Tourist) logs in
    await touristPage.goto('/login');
    await touristPage.locator('input[placeholder="email@journeygo.com"]').fill('tourist@journeygo.com');
    await touristPage.locator('input[type="password"]').first().fill('Tourist123!');
    await touristPage.locator('form button[type="submit"]').first().click();

    await expect
      .poll(async () => touristPage.evaluate(() => localStorage.getItem('journey_go_auth')))
      .toContain('token-tourist-1');

    // User 2 (Provider) logs in
    await providerPage.goto('/login');
    await providerPage.locator('input[placeholder="email@journeygo.com"]').fill('provider@journeygo.com');
    await providerPage.locator('input[type="password"]').first().fill('Provider123!');
    await providerPage.locator('form button[type="submit"]').first().click();

    await expect
      .poll(async () => providerPage.evaluate(() => localStorage.getItem('journey_go_auth')))
      .toContain('token-provider-2');

    // User 2 opens Provider Tours portal
    await providerPage.goto('/provider/tours');
    await expect(providerPage.locator('body')).toContainText('Tour Đà Lạt Sương Mù', { timeout: 15000 });

    // User 1 browses Home, filters Lâm Đồng, and opens Tour Detail
    await touristPage.goto('/');
    await expect(touristPage.getByText('Tour Đà Lạt Sương Mù').first()).toBeVisible({ timeout: 15000 });
    await touristPage.getByRole('checkbox', { name: /Lâm Đồng/i }).first().check();
    await touristPage.getByRole('link', { name: /Tour Đà Lạt Sương Mù/i }).first().click();
    await expect(touristPage).toHaveURL(/\/tours\/201/);
    await expect(touristPage.getByRole('heading', { name: /Tour Đà Lạt Sương Mù/i })).toBeVisible({ timeout: 15000 });

    await touristCtx.close();
    await providerCtx.close();
  });

  test('2 users interact on Community post: User 1 comments and User 2 sees it', async ({ browser }) => {
    const state = createSharedBackendState();
    const user1Ctx = await browser.newContext();
    const user2Ctx = await browser.newContext();

    const user1Page = await user1Ctx.newPage();
    const user2Page = await user2Ctx.newPage();

    for (const [page, id, name] of [
      [user1Page, 1, 'Du Khách An'],
      [user2Page, 2, 'Du Khách Bình'],
    ]) {
      await page.addInitScript(
        ({ userId, fullName }) => {
          localStorage.setItem(
            'journey_go_auth',
            JSON.stringify({
              token: `token-user-${userId}`,
              accessToken: `token-user-${userId}`,
              role: 'TOURIST',
              user: { id: userId, fullName, email: `user${userId}@journeygo.com`, role: 'TOURIST' },
            })
          );
        },
        { userId: id, fullName: name }
      );
      await attachSharedApiMock(page, state);
    }

    // User 1 opens community post #1 and adds a comment
    await user1Page.goto('/community/1');
    await expect(user1Page.getByText('Chia sẻ kinh nghiệm đi Đà Lạt mùa hoa').first()).toBeVisible({ timeout: 15000 });

    const commentBox = user1Page.locator('#comment-input');
    await expect(commentBox).toBeVisible();
    await commentBox.fill('Cảm ơn bạn, mình sẽ đi tuần tới!');
    await user1Page.locator('form button[type="submit"]').last().click();

    await expect(user1Page.getByText('Cảm ơn bạn, mình sẽ đi tuần tới!')).toBeVisible({ timeout: 10000 });

    // User 2 opens the same community post #1 and sees User 1's comment
    await user2Page.goto('/community/1');
    await expect(user2Page.getByText('Cảm ơn bạn, mình sẽ đi tuần tới!')).toBeVisible({ timeout: 15000 });

    await user1Ctx.close();
    await user2Ctx.close();
  });

  test('User 1 (Tourist) & User 2 (Provider) navigate all core account and provider modules', async ({ browser }) => {
    const state = createSharedBackendState();
    const touristCtx = await browser.newContext();
    const providerCtx = await browser.newContext();

    const touristPage = await touristCtx.newPage();
    const providerPage = await providerCtx.newPage();

    await touristPage.addInitScript(() => {
      localStorage.setItem(
        'journey_go_auth',
        JSON.stringify({
          token: 'token-tourist-1',
          accessToken: 'token-tourist-1',
          role: 'USER',
          user: { id: 1, fullName: 'Du Khách An', email: 'tourist@journeygo.com', role: 'USER' },
        })
      );
    });
    await providerPage.addInitScript(() => {
      localStorage.setItem(
        'journey_go_auth',
        JSON.stringify({
          token: 'token-provider-2',
          accessToken: 'token-provider-2',
          role: 'CONTENT_PROVIDER',
          user: { id: 2, fullName: 'Partner Đà Lạt', email: 'provider@journeygo.com', role: 'CONTENT_PROVIDER' },
        })
      );
    });

    await attachSharedApiMock(touristPage, state);
    await attachSharedApiMock(providerPage, state);

    const touristErrors = [];
    const providerErrors = [];
    touristPage.on('pageerror', (e) => touristErrors.push(e.message));
    providerPage.on('pageerror', (e) => providerErrors.push(e.message));

    for (const route of ['/trips', '/account', '/account/requests', '/account/refunds', '/account/rewards', '/account/achievements', '/account/notifications']) {
      await touristPage.goto(route, { waitUntil: 'domcontentloaded' });
      await expect.poll(async () => (await touristPage.locator('body').innerText()).trim().length, { timeout: 15000 }).toBeGreaterThan(0);
    }

    for (const route of ['/provider', '/provider/tours', '/provider/bookings', '/provider/finance', '/provider/finance/wallet', '/provider/tour-merges', '/provider/requests', '/provider/partner-info']) {
      await providerPage.goto(route, { waitUntil: 'domcontentloaded' });
      await expect.poll(async () => (await providerPage.locator('body').innerText()).trim().length, { timeout: 15000 }).toBeGreaterThan(0);
    }

    expect(touristErrors).toEqual([]);
    expect(providerErrors).toEqual([]);

    await touristCtx.close();
    await providerCtx.close();
  });
});
