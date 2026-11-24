/**
 * Khung so sánh của Trang Tổng quan vận hành (Admin).
 *
 * Trang hiển thị 01 khung tại một thời điểm — người dùng chuyển qua tab.
 * Mỗi khung gồm: kỳ hiện tại + mốc so sánh (baseline) của CHÍNH kỳ đó.
 */

/** Danh sách khung so sánh — thứ tự là thứ tự hiển thị trên tab. */
export const COMPARE_MODES = [
  {
    key: "weekly",
    label: "Tuần",
    hint: "7 ngày gần nhất, so với 7 ngày liền trước. Hai kỳ dài bằng nhau nên so sánh luôn công bằng.",
  },
  {
    key: "monthly",
    label: "Tháng",
    hint: "Tháng này (01–hết tháng) so với tháng trước (01–hết tháng) đầy đủ. Cho phép so sánh công bằng giữa các tháng có độ dài khác nhau.",
  },
  {
    key: "yearly",
    label: "Năm",
    hint: "Năm nay so với năm trước. Biểu đồ chia theo tháng.",
  },
  {
    key: "custom",
    label: "Tùy chỉnh",
    hint: "Tự chọn khoảng thời gian (dd/mm/yyyy). Mốc so sánh là khoảng liền trước cùng độ dài.",
  },
];

/** Tra cấu hình của 1 khung theo key. */
export function compareMode(key) {
  return COMPARE_MODES.find((m) => m.key === key) || COMPARE_MODES[0];
}
