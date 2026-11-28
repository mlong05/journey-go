import { test, expect } from '@playwright/test';

test.describe('Provider Tour Creation Workflow (Wizard)', () => {
  test('Create draft tour, step through wizard, validate and submit for review', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    const tomorrow = new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10);

    // Stateful draft tour object updated as the wizard saves/submits
    let draftTour = {
      id: 901,
      tourId: 901,
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
          name: 'Làng hương Quảng Phú Cầu',
          latitude: 20.83,
          longitude: 105.75,
          radiusMeters: 50,
          activities: ['Chụp ảnh', 'Trải nghiệm làm hương'],
          quizQuestions: [{ question: 'Làng nghề nổi tiếng với gì?', options: ['Hương', 'Gốm'], correctIndex: 0 }],
        },
      ],
      itinerary: [{ dayNumber: 1, title: 'Ngày 1', description: 'Khám phá làng nghề' }],
      schedules: [{ id: 1, departureDate: tomorrow, maxSlots: 10, availableSlots: 10 }],
      updatedAt: new Date().toISOString(),
    };

    const apiLog = [];

    await page.addInitScript(() => {
      localStorage.setItem(
        'journey_go_auth',
        JSON.stringify({
          token: 'provider-wizard-token',
          accessToken: 'provider-wizard-token',
          role: 'CONTENT_PROVIDER',
          user: {
            id: 2,
            fullName: 'Đối tác Làng Nghề',
            email: 'provider@journeygo.com',
            role: 'CONTENT_PROVIDER',
          },
        })
      );
    });

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

      // Create draft tour
      if (url.endsWith('/provider/tours') && method === 'POST') {
        apiLog.push('POST /provider/tours');
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: draftTour }),
        });
      }

      // List provider tours
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

      // Validate tour
      if (url.includes('/provider/tours/901/validate') && method === 'POST') {
        apiLog.push('POST /provider/tours/901/validate');
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: [] }),
        });
      }

      // Submit tour for review
      if (url.includes('/provider/tours/901/submit') && method === 'POST') {
        apiLog.push('POST /provider/tours/901/submit');
        draftTour = { ...draftTour, status: 'PENDING_REVIEW' };
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: draftTour }),
        });
      }

      // Save step endpoints (basic-info, pricing, stops, itinerary, schedule)
      if (url.includes('/provider/tours/901/') && method === 'PUT') {
        const body = req.postDataJSON() || {};
        draftTour = { ...draftTour, ...body, updatedAt: new Date().toISOString() };
        apiLog.push(`PUT ${new URL(url).pathname}`);
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: draftTour }),
        });
      }

      // Get single draft tour
      if (url.includes('/provider/tours/901') && method === 'GET') {
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

    // 1. Go to Provider Tours list and click "Tạo tour mới"
    await page.goto('/provider/tours');
    const createBtn = page.getByRole('button', { name: /Tạo tour mới/i }).first();
    await expect(createBtn).toBeVisible({ timeout: 15000 });
    await createBtn.click();

    await expect(page).toHaveURL(/\/provider\/tours\/901\/edit/);
    expect(apiLog).toContain('POST /provider/tours');

    // 2. Verify all 6 wizard steps are rendered
    for (const stepLabel of ['Thông tin cơ bản', 'Giá vé', 'Điểm đến', 'Lịch trình', 'Lịch khởi hành', 'Xem lại và gửi duyệt']) {
      await expect(page.getByText(stepLabel).first()).toBeVisible({ timeout: 15000 });
    }

    // 3. Fill Tour Title in Step 1 (Basic Info)
    const titleInput = page.locator('main input[type="text"], main input:not([type])').first();
    await expect(titleInput).toBeVisible();
    await titleInput.fill('Tour Làng Hương Quảng Phú Cầu');

    // 4. Step through the remaining wizard steps
    for (const stepLabel of ['Giá vé', 'Điểm đến', 'Lịch trình', 'Lịch khởi hành', 'Xem lại và gửi duyệt']) {
      await page.getByRole('button', { name: new RegExp(stepLabel, 'i') }).first().click();
      await page.waitForTimeout(300);
    }

    // 5. On Review step: check content rights checkbox if present and click submit
    const rightsCheckbox = page.locator('main input[type="checkbox"]').first();
    if (await rightsCheckbox.isVisible().catch(() => false)) {
      await rightsCheckbox.check();
    }

    const submitBtn = page.getByRole('button', { name: /Gửi duyệt|Gửi kiểm duyệt/i }).last();
    await expect(submitBtn).toBeVisible({ timeout: 10000 });
    await submitBtn.click();
    await expect(page.getByText(/Gửi tour thành công/i)).toBeVisible({ timeout: 10000 });
    expect(apiLog).toContain('POST /provider/tours/901/submit');

    expect(pageErrors).toEqual([]);
  });
});
