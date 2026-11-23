/**
 * Chính sách hoàn tiền — nguồn sự thật cho GIAO DIỆN khách hàng (web).
 *
 * ── Luật nghiệp vụ ──
 *  • Nhóm "Lỗi khách hàng (huỷ tour)" có 3 BẬC theo thời điểm hủy:
 *      - Từ 7 ngày trở lên                  → Hoàn 80%
 *      - Từ 3 đến 6 ngày (72 giờ – 6 ngày) → Hoàn 50%
 *      - Dưới 72 giờ (3 ngày)                → Hoàn 0%
 *  • Nhóm "Bất khả kháng" (thiên tai, dịch bệnh, quy hoạch) → Hoàn 0%.
 *
 * ⚠️ Tỷ lệ ở đây phải KHỚP với backend `PersonalRefundPolicy` (Java).
 *    Mốc thời gian tính từ 00:00 giờ Việt Nam của ngày trải nghiệm.
 */

/**
 * Định dạng tỷ lệ hoàn (0.8 → "80%").
 *
 * @param {number|null|undefined} rate tỷ lệ 0..1
 * @returns {string} chuỗi phần trăm
 */
export function formatRefundRate(rate) {
  if (rate === null || rate === undefined) return "—";
  const n = Number(rate);
  if (Number.isNaN(n)) return "—";
  return `${(n * 100).toFixed(2).replace(/\.00$/, "")}%`;
}

/**
 * Bảng chính sách hoàn tiền cho nhóm "Lỗi khách hàng (huỷ tour)".
 *
 * ⚠️ Nhãn "Hoàn X%" được SINH từ `rate` (không hardcode) ⇒ không thể lệch với
 *    tỷ lệ thực tế.
 *
 * @type {ReadonlyArray<{ id: string, condition: string, rate: number, label: string }>}
 */
export const PERSONAL_REFUND_TIERS = Object.freeze([
  {
    id: "EARLY",
    condition: "Từ 7 ngày trở lên",
    rate: 0.8,
    label: `Hoàn ${formatRefundRate(0.8)}`,
  },
  {
    id: "MID",
    condition: "Từ 3 đến 6 ngày (72 giờ – 6 ngày)",
    rate: 0.5,
    label: `Hoàn ${formatRefundRate(0.5)}`,
  },
  {
    id: "LATE",
    condition: "Dưới 72 giờ (3 ngày)",
    rate: 0,
    label: `Hoàn ${formatRefundRate(0)}`,
  },
]);
