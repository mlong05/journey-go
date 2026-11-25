/**
 * Nhãn trục ngang (X-axis) cho các biểu đồ theo THÁNG khi khung "Tất cả" trải
 * qua nhiều năm (VD: 01/2024 → 11/2026 = 35 tháng).
 *
 * ── VÌ SAO CẦN FILE NÀY? ──────────────────────────────────────────────────
 * Recharts KHÔNG tự ẩn nhãn một cách "thông minh" cho trục phân loại:
 *   • `minTickGap={0}` + `interval={0}` KHÔNG đảm bảo vẽ đủ mọi nhãn — Recharts
 *     vẫn tự giảm số nhãn khi trục bị co (đo thực tế: 35 tháng chỉ còn 7 nhãn
 *     ở khung ~330px ⇒ mất "T10/2026", người đọc tưởng THIẾU dữ liệu tháng 10).
 *   • Nếu ép vẽ đủ 35 nhãn ⇒ mỗi nhãn chỉ có ~8px trục ngang, mà nhãn "T01/26"
 *     cần ~33px (ngang) ⇒ TẤT CẢ chồng lấn lên nhau.
 *
 * ⇒ Với khung "Tất cả", trục ngang chỉ hiện **NĂM** ("2024", "2025", "2026"):
 *   mỗi năm ~12 tháng ⇒ chỉ 3 nhãn, mỗi nhãn rộng ~30px ⇒ vừa khít, KHÔNG
 *   chồng lấn, KHÔNG cần xoay. Tháng cụ thể xem khi rê chuột (tooltip hiện đầy
 *   đủ "Th09/2025"), nên không mất thông tin nào.
 *
 * ── CÁCH DÙNG ──────────────────────────────────────────────────────────────
 *   <XAxis
 *     dataKey="label"
 *     tick={(props) => <YearAxisTick {...props} />}
 *     interval={0}
 *     minTickGap={0}
 *   />
 *
 * ⚠️ Recharts 3.x gọi `tick` MỘT LẦN cho MỖI nhãn và truyền `payload` là 1
 * OBJECT (không phải mảng) ⇒ không được `payload.map()`.
 */

import React from "react";

/**
 * Tick trục ngang hiển thị **NĂM** cho dữ liệu theo tháng.
 *
 * ⚠️ Nhãn năm được đặt tại THÁNG 6 (giữa năm) để nằm GIỮA khoảng thuộc năm đó
 *   trên trục (tháng 1 → tháng 12), thay vì lệch sang mép trái. Cách này trực quan
 *   hơn: đường cong vẽ lên nhãn "2025" là ở GIỮA năm 2025.
 *
 * @param {object}  props       Props do Recharts truyền cho `tick` (x, y, payload…).
 * @param {number}  fontSize    Cỡ chữ (px).
 * @param {string}  fill        Màu chữ.
 * @param {number}  centerMonth Tháng đặt nhãn năm (1 = tháng 1, 6 = giữa năm).
 */
export default function YearAxisTick({ x, y, payload, fontSize = 10, fill = "#64748b", centerMonth = 6 }) {
  const p = Array.isArray(payload) ? payload[0] : payload;
  const text = p && p.value != null ? String(p.value) : "";
  if (!text) return null;

  // `index` = vị trí điểm dữ liệu trong `data` (Recharts cấp sẵn).
  const index = p && typeof p.index === "number" ? p.index : -1;
  if (index < 0) return null;

  // Nhãn gốc dạng "T01/2026" (Admin) hoặc "Th01/2026" (Provider) → tháng & năm.
  const m = /^T?h?(\d{2})\/(\d{4})$/.exec(text);
  if (!m) return null;
  const month = Number(m[1]);
  const year = m[2];

  // Chỉ hiện nhãn tại tháng "giữa năm" ⇒ 1 nhãn cho mỗi năm.
  if (month !== centerMonth) return null;

  return (
    <text x={x} y={y} dy={12} textAnchor="middle" fontSize={fontSize} fill={fill} fontWeight={600}>
      {year}
    </text>
  );
}

/**
 * Tick trục ngang hiển thị **MỌI** nhãn (dùng cho các khung ngắn: Hôm nay, Tuần,
 * Tháng, Năm, Tùy chỉnh) — vẽ nằm ngang, không xoay.
 *
 * @param {object} props Props do Recharts truyền cho `tick`.
 */
export function PlainAxisTick({ x, y, payload, fontSize = 10, fill = "#64748b" }) {
  const p = Array.isArray(payload) ? payload[0] : payload;
  const text = p && p.value != null ? String(p.value) : "";
  if (!text) return null;
  return (
    <text x={x} y={y} dy={12} textAnchor="middle" fontSize={fontSize} fill={fill}>
      {text}
    </text>
  );
}
