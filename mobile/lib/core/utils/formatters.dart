/// Tiện ích định dạng dùng chung cho Mobile.
///
/// ── Quy ước bắt buộc ──
///  • Tiền VND là số nguyên. Backend trả `BigDecimal` dạng JSON number (1500000).
///    TUYỆT ĐỐI không nhân/chia 100 khi gọi API.
///  • Timestamp từ backend là ISO-8601 UTC (`Instant`) → hiển thị theo giờ Việt Nam.
///  • `experienceDate` là `LocalDate` (`YYYY-MM-DD`) — không có phần giờ.
library;

import '../../l10n/locale_controller.dart';

/// Định dạng số tiền VND kèm ký hiệu đồng. 1500000 → "1.500.000 đ"
String formatVndAmount(dynamic value) {
  final amount = toAmount(value);
  final buffer = StringBuffer();
  final digits = amount.round().abs().toString();
  for (var i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 == 0) buffer.write('.');
    buffer.write(digits[i]);
  }
  final sign = amount < 0 ? '-' : '';
  return '$sign${appL10n.priceVnd(buffer.toString())}';
}

/// Định dạng số tiền VND không ký hiệu. 1500000 → "1.500.000"
String formatVndNumber(dynamic value) {
  final amount = toAmount(value);
  final buffer = StringBuffer();
  final digits = amount.round().abs().toString();
  for (var i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 == 0) buffer.write('.');
    buffer.write(digits[i]);
  }
  return '${amount < 0 ? '-' : ''}${buffer.toString()}';
}

/// Chuyển giá trị tiền tệ về number an toàn (backend có thể trả string).
double toAmount(dynamic value) {
  if (value == null) return 0;
  if (value is num) return value.toDouble();
  final cleaned = value.toString().replaceAll(RegExp(r'[^\d.\-]'), '');
  return double.tryParse(cleaned) ?? 0;
}

/// Định dạng ngày giờ (ISO-8601 UTC) theo giờ Việt Nam.
/// 2026-11-20T03:04:05Z → "20/11/2026 10:04"
String formatDateTimeVn(DateTime? value) {
  if (value == null) return '';
  final local = value.toLocal();
  final dd = local.day.toString().padLeft(2, '0');
  final mm = local.month.toString().padLeft(2, '0');
  final hh = local.hour.toString().padLeft(2, '0');
  final mi = local.minute.toString().padLeft(2, '0');
  return '$dd/$mm/${local.year} $hh:$mi';
}

/// Định dạng ngày (không giờ).
String formatDateVn(DateTime? value) {
  if (value == null) return '';
  final local = value.toLocal();
  final dd = local.day.toString().padLeft(2, '0');
  final mm = local.month.toString().padLeft(2, '0');
  return '$dd/$mm/${local.year}';
}

/// Định dạng `LocalDate` (`YYYY-MM-DD`) mà không bị lệch ngày do múi giờ.
/// 2026-11-20 → "20/11/2026"
String formatLocalDateString(String? value) {
  if (value == null || value.isEmpty) return '';
  final raw = value.substring(0, 10);
  final parts = raw.split('-');
  if (parts.length != 3) return raw;
  return '${parts[2]}/${parts[1]}/${parts[0]}';
}

/// Định dạng kỳ doanh thu `YYYY-MM` → "Tháng 09/2026".
String formatPeriodLabel(String? value) {
  if (value == null || value.isEmpty) return '';
  final parts = value.substring(0, 7).split('-');
  if (parts.length != 2) return value;
  return 'Tháng ${parts[1]}/${parts[0]}';
}

/// Ngày hôm nay theo giờ Việt Nam dạng `YYYY-MM-DD`.
String todayLocalDate() {
  final now = DateTime.now().toLocal();
  final dd = now.day.toString().padLeft(2, '0');
  final mm = now.month.toString().padLeft(2, '0');
  return '${now.year}-$mm-$dd';
}

/// Nhãn trạng thái booking theo ngôn ngữ đang chọn.
String bookingStatusLabel(String? status) {
  final l10n = appL10n;
  switch (status) {
    case 'PENDING_PAYMENT':
      return l10n.statusPendingPayment;
    case 'CONFIRMED':
      return l10n.statusConfirmed;
    case 'COMPLETED':
      return l10n.statusCompleted;
    case 'EXPIRED':
      return l10n.statusExpired;
    case 'CANCELLED':
      return l10n.statusCancelled;
    default:
      return status ?? l10n.statusUnknown;
  }
}

/// Nhãn trạng thái thanh toán theo ngôn ngữ đang chọn.
/// `PROCESSING` là đang xử lý — KHÔNG phải lỗi.
String paymentStatusLabel(String? status) {
  final l10n = appL10n;
  switch (status) {
    case 'PENDING':
      return l10n.payStatusPending;
    case 'PROCESSING':
      return l10n.payStatusProcessing;
    case 'SUCCESS':
      return l10n.payStatusSuccess;
    case 'FAILED':
      return l10n.payStatusFailed;
    case 'CANCELLED':
      return l10n.statusCancelled;
    case 'EXPIRED':
      return l10n.statusExpired;
    // Giao dịch bị thay thế — khách đã tạo giao dịch mới và đơn đã được thanh toán.
    case 'SUPERSEDED':
      return l10n.payStatusSuperseded;
    default:
      return status ?? l10n.statusUnknown;
  }
}

/// Nhãn tiếng Việt cho trạng thái refund.
///
/// Lưu ý: backend dùng `PENDING_REVIEW` (không phải `PENDING`) cho yêu cầu
/// đang chờ duyệt — xem `RefundStatus` trong backend.
String refundStatusLabel(String? status) {
  switch (status) {
    case 'PENDING_REVIEW':
      return appL10n.refundStatusPendingReview;
    case 'APPROVED':
      return appL10n.refundStatusApproved;
    case 'REFUND_PROCESSING':
      return appL10n.refundStatusProcessing;
    case 'REFUNDED':
      return appL10n.refundToneRefunded;
    case 'REJECTED':
      return appL10n.refundStatusRejected2;
    case 'FAILED':
      return appL10n.payStatusFailed;
    case 'CANCELLED':
      return appL10n.statusCancelled;
    default:
      return status ?? appL10n.statusUnknown;
  }
}

/// Nhãn tiếng Việt cho nhóm lý do hoàn tiền.
///
/// Nhãn chuẩn đến từ cấu hình của Admin (bảng `refund_reason_groups`) — hàm này
/// chỉ là FALLBACK khi backend chưa có cấu hình.
///
/// ⚠️ KHÔNG BAO GIỜ trả về mã kỹ thuật thô (VD: `PERSONAL_7`) cho người dùng.
/// Mã nhóm là chi tiết nội bộ của DB; người dùng chỉ thấy tên tiếng Việt.
String refundReasonLabel(String? reason) {
  switch (reason) {
    case 'PERSONAL':
      return appL10n.refundReasonCustomer;
    case 'PLATFORM_FAULT':
      return appL10n.refundReasonPlatform;
    case 'PROVIDER_FAULT':
      return appL10n.refundReasonProvider;
    case 'FORCE_MAJEURE':
      return appL10n.refundReasonForceMajeure;
    case 'TOURIST_FAULT':
      return appL10n.refundReasonCustomer;
    case null:
    case '':
      return appL10n.statusUnknown;
    default:
      // Mã lạ (VD: `PERSONAL_7` do Admin tự sinh, hoặc enum đã đổi) ⇒ KHÔNG lộ
      // mã kỹ thuật ra UI, chỉ hiển thị nhãn chung.
      return appL10n.refundReasonOther;
  }
}

/// Nhãn tiếng Việt cho phương thức hoàn tiền.
String refundMethodLabel(String? method) {
  switch (method) {
    case 'VNPAY_API':
      return appL10n.refundMethodVnpay;
    case 'MANUAL_BANK_TRANSFER':
      return appL10n.refundMethodManual;
    default:
      return method ?? appL10n.refundMethodUnknown;
  }
}
