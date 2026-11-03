/**
 * Thanh toán giả lập để thử luồng trải nghiệm khi backend chưa chạy VNPay.
 *
 * Chỉ bật khi NEXT_PUBLIC_MOCK_PAYMENT=true (dev). Booking trên server KHÔNG đổi trạng thái,
 * trình duyệt chỉ ghi nhớ đơn nào đã "thanh toán" để mở được luồng trải nghiệm.
 */
export const MOCK_PAYMENT = process.env.NEXT_PUBLIC_MOCK_PAYMENT === "true";

const KEY = "jg_mock_paid_bookings";

export function getMockPaidIds() {
  if (!MOCK_PAYMENT) return [];
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(raw) ? raw.map(Number) : [];
  } catch {
    return [];
  }
}

export function isMockPaid(bookingId) {
  return getMockPaidIds().includes(Number(bookingId));
}

export function markMockPaid(bookingId) {
  try {
    const ids = new Set(getMockPaidIds());
    ids.add(Number(bookingId));
    localStorage.setItem(KEY, JSON.stringify([...ids]));
  } catch {
    /* trình duyệt chặn storage: giả lập chỉ giữ trong phiên hiện tại */
  }
}
