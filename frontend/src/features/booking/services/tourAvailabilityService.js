/**
 * Service tính "ngày còn chỗ" cho một tour — dùng cho màn chi tiết tour để chọn ngày trải nghiệm.
 *
 * ── Vì sao cần N+1 request? ──
 *  `TourResponse.destinations[]` chỉ có `destinationId`, KHÔNG có `experienceId`.
 *  Endpoint slot lại là **per-experience**: `GET /experiences/{experienceId}/slots?date=`.
 *  Backend chỉ có `GET /destinations/{destinationId}/experiences` để lấy danh sách experience
 *  của một điểm đến. Vì vậy bắt buộc phải đi:
 *      tour → destinations[] → GET /destinations/{id}/experiences → GET /experiences/{eid}/slots
 *
 * ── Quy tắc chọn ngày ──
 *  Một ngày chỉ hợp lệ khi **MỌI** experience của tour đều có slot còn chỗ cho ngày đó.
 *  Nếu chỉ một experience hết chỗ, `POST /bookings` sẽ ném `BOOKING_SLOT_FULL`.
 */
import { apiClient } from "@/services/apiClient";

/** Lấy danh sách experience (đã PUBLISHED) của một điểm đến. */
export async function getDestinationExperiences(destinationId) {
  const res = await apiClient.get(`/destinations/${destinationId}/experiences`);
  const data = res?.data ?? res;
  const list = Array.isArray(data)
    ? data
    : Array.isArray(data?.content)
      ? data.content
      : [];
  return list
    .filter((e) => (e?.status ? e.status === "PUBLISHED" : true))
    .map((e) => ({
      id: e.id,
      destinationId: e.destinationId,
      title: e.title,
      price: e.price,
      status: e.status,
    }));
}

/** Lấy slot của một experience (tuỳ chọn filter theo ngày). */
export async function getExperienceSlots(experienceId, date = null) {
  const query = date ? `?date=${encodeURIComponent(date)}` : "";
  const res = await apiClient.get(`/experiences/${experienceId}/slots${query}`);
  const data = res?.data ?? res;
  return Array.isArray(data) ? data : [];
}

/**
 * Thu thập danh sách experience của mọi điểm đến trong tour.
 * @returns {Promise<Array<{id, destinationId, title, price, status}>>}
 */
export async function getTourExperiences(tour) {
  const destinations = Array.isArray(tour?.destinations) ? tour.destinations : [];
  const perDestination = await Promise.all(
    destinations.map((d) => getDestinationExperiences(d.destinationId).catch(() => [])),
  );
  return perDestination.flat();
}

/**
 * Tính danh sách ngày còn chỗ cho tour.
 *
 * @param {object} tour TourResponse
 * @param {object} [options]
 * @param {number} [options.horizonDays] số ngày tối đa xem trước (mặc định 60)
 * @param {string} [options.fromDate] ngày bắt đầu `YYYY-MM-DD` (mặc định = hôm nay giờ VN)
 * @returns {Promise<Array<{date: string, remaining: number, total: number, available: boolean}>>}
 *          `remaining` = số chỗ còn nhỏ nhất giữa các experience (giới hạn thực tế),
 *          `total` = tổng số chỗ còn của tất cả experience.
 */
export async function getTourAvailableDates(tour, { horizonDays = 60, fromDate } = {}) {
  const experiences = await getTourExperiences(tour);
  if (experiences.length === 0) return [];

  // Gom slot của mọi experience theo ngày.
  const slotsByDate = new Map();
  const results = await Promise.all(
    experiences.map(async (exp) => {
      try {
        return { exp, slots: await getExperienceSlots(exp.id) };
      } catch {
        return { exp, slots: [] };
      }
    }),
  );

  for (const { exp, slots } of results) {
    for (const slot of slots) {
      const date = slot?.slotDate;
      if (!date) continue;
      if (!slotsByDate.has(date)) {
        slotsByDate.set(date, { remaining: [], total: 0 });
      }
      const bucket = slotsByDate.get(date);
      const remaining = Math.max(0, Number(slot.remaining ?? 0));
      bucket.remaining.push(remaining);
      bucket.total += remaining;
    }
  }

  const start = fromDate ? new Date(`${fromDate}T00:00:00Z`) : new Date();
  const horizon = new Date(start.getTime());
  horizon.setUTCDate(horizon.getUTCDate() + horizonDays);

  const todayStr = toUtcDateString(start);

  const dates = [];
  for (const [date, bucket] of slotsByDate.entries()) {
    if (date < todayStr) continue;
    const d = new Date(`${date}T00:00:00Z`);
    if (d > horizon) continue;
    const remaining = bucket.remaining.length ? Math.min(...bucket.remaining) : 0;
    dates.push({
      date,
      remaining,
      total: bucket.total,
      available: remaining > 0,
    });
  }

  dates.sort((a, b) => a.date.localeCompare(b.date));
  return dates;
}

/**
 * Kiểm tra một ngày cụ thể có đặt được không (mọi experience đều còn chỗ).
 * @returns {Promise<{available: boolean, remaining: number, reason?: string}>}
 */
export async function checkTourDateAvailability(tour, date) {
  const experiences = await getTourExperiences(tour);
  if (experiences.length === 0) {
    return { available: false, remaining: 0, reason: "Tour không có trải nghiệm nào khả dụng." };
  }

  let remaining = Infinity;
  for (const exp of experiences) {
    const slots = await getExperienceSlots(exp.id, date);
    const slot = slots.find((s) => s.slotDate === date);
    if (!slot) {
      return {
        available: false,
        remaining: 0,
        reason: `Trải nghiệm "${exp.title}" chưa mở bán ngày này.`,
      };
    }
    const left = Math.max(0, Number(slot.remaining ?? 0));
    if (left <= 0) {
      return {
        available: false,
        remaining: 0,
        reason: `Trải nghiệm "${exp.title}" đã hết chỗ ngày này.`,
      };
    }
    remaining = Math.min(remaining, left);
  }

  return { available: true, remaining: remaining === Infinity ? 0 : remaining };
}

/** Định dạng `Date` → `YYYY-MM-DD` theo UTC (dùng cho so sánh chuỗi ngày). */
function toUtcDateString(date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  )
    .toISOString()
    .slice(0, 10);
}
