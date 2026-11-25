/// Chính sách hoàn tiền — nguồn sự thật cho GIAO DIỆN khách hàng (mobile).
///
/// ── Luật nghiệp vụ ──
///  • Nhóm "Lỗi khách hàng (huỷ tour)" có 3 BẬC theo thời điểm hủy:
///      - Từ 7 ngày trở lên                  → Hoàn 80%
///      - Từ 3 đến 6 ngày (72 giờ – 6 ngày) → Hoàn 50%
///      - Dưới 72 giờ (3 ngày)               → Hoàn 0%
///  • Nhóm "Bất khả kháng" (thiên tai, dịch bệnh, quy hoạch) → Hoàn 0%.
///
/// ⚠️ Tỷ lệ ở đây phải KHỚP với backend `PersonalRefundPolicy` (Java) và
///    với `frontend/src/features/tourist/refundPolicy.js` (web).
///    Mốc thời gian tính từ 00:00 giờ Việt Nam của ngày trải nghiệm.
library;

import '../../l10n/locale_controller.dart';

/// Một bậc tỷ lệ hoàn trong bảng chính sách.
class RefundTierInfo {
  /// Điều kiện hiển thị cho khách.
  final String condition;

  /// Nhãn tỷ lệ hoàn (VD: "Hoàn 80%").
  final String label;

  /// Tỷ lệ hoàn (0.8 = 80%).
  final double rate;

  const RefundTierInfo({
    required this.condition,
    required this.label,
    required this.rate,
  });
}

/// Định dạng tỷ lệ hoàn (0.8 → "80%").
String formatRefundRate(double? rate) {
  if (rate == null) return '—';
  final pct = rate * 100;
  final text = pct == pct.roundToDouble()
      ? pct.round().toString()
      : pct.toStringAsFixed(2);
  return '$text%';
}

/// Các bậc tỷ lệ hoàn cho nhóm "Lỗi khách hàng (huỷ tour)" — theo thứ tự
/// từ cao xuống thấp.
///
/// ⚠️ Nhãn "Hoàn X%" được SINH từ `rate` (không hardcode) ⇒ không thể lệch với
///    tỷ lệ thực tế. Dùng getter để luôn cập nhật theo ngôn ngữ hiện tại.
List<RefundTierInfo> get kPersonalRefundTiers => [
  RefundTierInfo(
    condition: appL10n.rfTier7DaysPlus,
    label: appL10n.rfRefundRate(formatRefundRate(0.8)),
    rate: 0.8,
  ),
  RefundTierInfo(
    condition: appL10n.rfTier3To6Days,
    label: appL10n.rfRefundRate(formatRefundRate(0.5)),
    rate: 0.5,
  ),
  RefundTierInfo(
    condition: appL10n.rfTierUnder72Hours,
    label: appL10n.rfRefundRate(formatRefundRate(0)),
    rate: 0,
  ),
];
