/// Tiện ích định dạng dùng chung cho Mobile.
///
/// ── Quy ước bắt buộc ──
///  • Tiền VND là số nguyên. Backend trả `BigDecimal` dạng JSON number (1500000).
///    TUYỆT ĐỐI không nhân/chia 100 khi gọi API.
///  • Timestamp từ backend là ISO-8601 UTC (`Instant`) → hiển thị theo giờ Việt Nam.
///  • `experienceDate` là `LocalDate` (`YYYY-MM-DD`) — không có phần giờ.
library;

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
  return '$sign${buffer.toString()} đ';
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

/// Nhãn tiếng Việt cho trạng thái booking.
String bookingStatusLabel(String? status) {
  switch (status) {
    case 'PENDING_PAYMENT':
      return 'Chờ thanh toán';
    case 'CONFIRMED':
      return 'Đã xác nhận';
    case 'COMPLETED':
      return 'Đã hoàn thành';
    case 'EXPIRED':
      return 'Đã hết hạn';
    case 'CANCELLED':
      return 'Đã hủy';
    default:
      return status ?? 'Không rõ';
  }
}

/// Nhãn tiếng Việt cho trạng thái thanh toán.
/// `PROCESSING` là đang xử lý — KHÔNG phải lỗi.
String paymentStatusLabel(String? status) {
  switch (status) {
    case 'PENDING':
      return 'Đang chờ';
    case 'PROCESSING':
      return 'Đang xử lý';
    case 'SUCCESS':
      return 'Thành công';
    case 'FAILED':
      return 'Thất bại';
    case 'CANCELLED':
      return 'Đã hủy';
    case 'EXPIRED':
      return 'Đã hết hạn';
    default:
      return status ?? 'Không rõ';
  }
}

/// Nhãn tiếng Việt cho trạng thái refund.
///
/// Lưu ý: backend dùng `PENDING_REVIEW` (không phải `PENDING`) cho yêu cầu
/// đang chờ duyệt — xem `RefundStatus` trong backend.
String refundStatusLabel(String? status) {
  switch (status) {
    case 'PENDING_REVIEW':
      return 'Chờ duyệt';
    case 'APPROVED':
      return 'Đã duyệt';
    case 'REFUND_PROCESSING':
      return 'Đang hoàn tiền';
    case 'REFUNDED':
      return 'Đã hoàn tiền';
    case 'REJECTED':
      return 'Đã từ chối';
    case 'FAILED':
      return 'Thất bại';
    case 'CANCELLED':
      return 'Đã hủy';
    default:
      return status ?? 'Không rõ';
  }
}

/// Nhãn tiếng Việt cho nguyên nhân hoàn tiền.
String refundReasonLabel(String? reason) {
  switch (reason) {
    case 'TOURIST_FAULT':
      return 'Lỗi khách du lịch (hoàn 50%)';
    case 'PLATFORM_FAULT':
      return 'Lỗi nền tảng (hoàn 100%)';
    default:
      return reason ?? 'Không rõ';
  }
}

/// Nhãn tiếng Việt cho phương thức hoàn tiền.
String refundMethodLabel(String? method) {
  switch (method) {
    case 'VNPAY_API':
      return 'Hoàn qua VNPay';
    case 'MANUAL_BANK_TRANSFER':
      return 'Chuyển khoản thủ công';
    default:
      return method ?? 'Chưa xác định';
  }
}
