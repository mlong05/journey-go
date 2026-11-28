import { test, expect } from '@playwright/test';

function makeInitialDraft(tourId) {
  const tomorrow = new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10);
  return {
    id: tourId,
    tourId,
    title: '',
    description: '',
    status: 'DRAFT',
    regionId: 1,
    themeId: 1,
    format: 'GROUP',
    durationDays: 1,
    maxGuests: 10,
    highlights: ['Điểm nhấn 1', 'Điểm nhấn 2', 'Điểm nhấn 3'],
    coverImageUrl: '/image/quangphucau-incense.jpg',
    imageUrls: [
      '/image/quangphucau-incense.jpg',
      '/image/quangphucau-incense.jpg',
      '/image/quangphucau-incense.jpg',
      '/image/quangphucau-incense.jpg',
      '/image/quangphucau-incense.jpg',
    ],
    prices: [
      { guestType: 'ADULT', price: 1500000, countsTowardSlot: true },
      { guestType: 'CHILD', price: 1000000, countsTowardSlot: true },
      { guestType: 'TODDLER', price: 500000, countsTowardSlot: false },
      { guestType: 'INFANT', price: 0, countsTowardSlot: false },
    ],
    stops: [
      {
        id: 1,
        orderIndex: 0,
        name: 'Điểm check-in trung tâm',
        latitude: 20.83,
        longitude: 105.75,
        radiusMeters: 50,
        activities: ['Tham quan', 'Trải nghiệm'],
        quizQuestions: [{ question: 'Câu hỏi kiểm tra?', options: ['A', 'B'], correctIndex: 0 }],
      },
    ],
    itinerary: [{ dayNumber: 1, title: 'Ngày 1', description: 'Khám phá địa phương' }],
    schedules: [{ id: 1, departureDate: tomorrow, maxSlots: 10, availableSlots: 10 }],
    updatedAt: new Date().toISOString(),
  };
}

async function runSingleProviderFlow(browser, providerIndex) {
  const tourId = 910 + providerIndex;
  const tourTitle = `Tour Đồng Thời - Provider ${providerIndex}`;
  let draftTour = makeInitialDraft(tourId);
  const pageErrors = [];

  const context = await browser.newContext();
  const page = await context.newPage();
  page.on('pageerror', (err) => pageErrors.push(err.message));

  await page.addInitScript((idx) => {
    localStorage.setItem(
      'journey_go_auth',
      JSON.stringify({
        token: `provider-token-${idx}`,
        accessToken: `provider-token-${idx}`,
        role: 'CONTENT_PROVIDER',
        user: {
          id: 100 + idx,
          fullName: `Đối tác ${idx}`,
          email: `provider${idx}@journeygo.com`,
          role: 'CONTENT_PROVIDER',
        },
      })
    );
  }, providerIndex);

  await page.route('**/api/**', async (route) => {
    const req = route.request();
    const url = req.url();
    const method = req.method();

    if (url.includes('/regions')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [{ id: 1, name: 'Hà Nội' }] }),
      });
    }
    if (url.includes('/themes')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [{ id: 1, name: 'Văn hóa' }] }),
      });
    }
    if (url.includes('/guest-types')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            { guestType: 'ADULT', label: 'Người lớn', ageRange: '12 tuổi trở lên', sortOrder: 3 },
            { guestType: 'CHILD', label: 'Trẻ em', ageRange: '5 – 11 tuổi', sortOrder: 2 },
            { guestType: 'TODDLER', label: 'Trẻ nhỏ', ageRange: '2 – 4 tuổi', sortOrder: 1 },
            { guestType: 'INFANT', label: 'Em bé', ageRange: 'Dưới 2 tuổi', sortOrder: 0 },
          ],
        }),
      });
    }
    if (url.endsWith('/provider/tours') && method === 'POST') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: draftTour }),
      });
    }
    if (url.includes('/provider/tours?') || (url.endsWith('/provider/tours') && method === 'GET')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { content: [draftTour], totalElements: 1 },
        }),
      });
    }
    if (url.includes(`/provider/tours/${tourId}/validate`) && method === 'POST') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      });
    }
    if (url.includes(`/provider/tours/${tourId}/submit`) && method === 'POST') {
      draftTour = { ...draftTour, status: 'PENDING_REVIEW' };
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: draftTour }),
      });
    }
    if (url.includes(`/provider/tours/${tourId}/`) && method === 'PUT') {
      const body = req.postDataJSON() || {};
      draftTour = { ...draftTour, ...body, updatedAt: new Date().toISOString() };
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: draftTour }),
      });
    }
    if (url.includes(`/provider/tours/${tourId}`) && method === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: draftTour }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [] }),
    });
  });

  await page.goto('/provider/tours');
  const createBtn = page.getByRole('button', { name: /Tạo tour mới/i }).first();
  await expect(createBtn).toBeVisible({ timeout: 20000 });
  await createBtn.click();

  await expect(page).toHaveURL(new RegExp(`/provider/tours/${tourId}/edit`), { timeout: 20000 });

  const titleInput = page.locator('main input[type="text"], main input:not([type])').first();
  await expect(titleInput).toBeVisible({ timeout: 15000 });
  await titleInput.fill(tourTitle);

  for (const stepLabel of ['Giá vé', 'Điểm đến', 'Lịch trình', 'Lịch khởi hành', 'Xem lại và gửi duyệt']) {
    await page.getByRole('button', { name: new RegExp(stepLabel, 'i') }).first().click();
    await page.waitForTimeout(200);
  }

  const rightsCheckbox = page.locator('main input[type="checkbox"]').first();
  if (await rightsCheckbox.isVisible().catch(() => false)) {
    await rightsCheckbox.check();
  }

  const submitBtn = page.getByRole('button', { name: /Gửi duyệt|Gửi kiểm duyệt/i }).last();
  await expect(submitBtn).toBeVisible({ timeout: 15000 });
  await submitBtn.click();
  await expect(page.getByText(/Gửi tour thành công/i)).toBeVisible({ timeout: 15000 });

  await context.close();
  return { providerIndex, tourId, status: draftTour.status, pageErrors };
}

test.describe('Concurrent 5 Providers Tour Creation', () => {
  test('5 providers simultaneously create and submit tours without conflict or crash', async ({ browser }) => {
    test.setTimeout(90000);

    const results = await Promise.all([
      runSingleProviderFlow(browser, 1),
      runSingleProviderFlow(browser, 2),
      runSingleProviderFlow(browser, 3),
      runSingleProviderFlow(browser, 4),
      runSingleProviderFlow(browser, 5),
    ]);

    for (const r of results) {
      expect(r.status).toBe('PENDING_REVIEW');
      expect(r.pageErrors).toEqual([]);
    }
  });
});
