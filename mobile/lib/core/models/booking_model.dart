/// Model Booking (đặt tour) + các model Payment dùng chung.
///
/// ── Quy ước ──
///  • Tiền VND là số nguyên — backend trả `BigDecimal` dạng JSON number.
///    TUYỆT ĐỐI không chia/nhân 100 khi gọi API.
///  • `experienceDate` là `LocalDate` chuỗi `YYYY-MM-DD` (KHÔNG có phần giờ).
///  • `createdAt`, `paymentDeadline`, `paidAt`... là `Instant` ISO-8601 UTC.
library;

import '../utils/formatters.dart';
import 'gamification_model.dart' show formatThousands;

// Các model Payment được định nghĩa trong `payment_model.dart` nhưng vẫn được
// export lại từ đây để tương thích với code đang import từ `booking_model.dart`.
export 'payment_model.dart'
    show
        PaymentModel,
        PaymentInitModel,
        PaymentMethodModel,
        PaymentMethodOption,
        PaymentMethodsModel,
        PaymentBankGroup,
        PaymentBank,
        PaymentQueryResult,
        PaymentReturnResult;

num _asNum(dynamic value) {
  if (value is num) return value;
  return num.tryParse(value?.toString() ?? '') ?? 0;
}

DateTime? _asDate(dynamic value) {
  if (value == null) return null;
  return DateTime.tryParse(value.toString())?.toLocal();
}

/// Parse `LocalDate` (`YYYY-MM-DD`) — KHÔNG áp dụng múi giờ để không lệch ngày.
DateTime? _asLocalDate(dynamic value) {
  if (value == null) return null;
  final raw = value.toString();
  if (raw.isEmpty) return null;
  final parsed = DateTime.tryParse(raw);
  if (parsed == null) return null;
  return DateTime(parsed.year, parsed.month, parsed.day);
}

String formatMoney(num value) => '${formatThousands(value)} đ';

String formatDateTime(DateTime? value) {
  if (value == null) return '—';
  String two(int n) => n.toString().padLeft(2, '0');
  return '${two(value.hour)}:${two(value.minute)} ${two(value.day)}/${two(value.month)}/${value.year}';
}

String formatDay(DateTime? value) {
  if (value == null) return '—';
  String two(int n) => n.toString().padLeft(2, '0');
  return '${two(value.day)}/${two(value.month)}/${value.year}';
}

/// Trạng thái booking theo backend (BookingStatus).
class BookingStatus {
  static const pendingPayment = 'PENDING_PAYMENT';
  static const confirmed = 'CONFIRMED';
  static const completed = 'COMPLETED';
  static const expired = 'EXPIRED';
  static const cancelled = 'CANCELLED';

  static String label(String status) => switch (status) {
    pendingPayment => 'Chờ thanh toán',
    confirmed => 'Đã xác nhận',
    completed => 'Đã hoàn thành',
    expired => 'Hết hạn thanh toán',
    cancelled => 'Đã hủy',
    _ => status,
  };
}

/// Trạng thái một lần thanh toán (PaymentStatus).
class PaymentStatus {
  static const pending = 'PENDING';
  static const processing = 'PROCESSING';
  static const success = 'SUCCESS';
  static const failed = 'FAILED';
  static const expired = 'EXPIRED';
  static const cancelled = 'CANCELLED';

  /// Đã có kết quả cuối. PENDING / PROCESSING nghĩa là CHƯA rõ, KHÔNG được coi là thất bại.
  static bool isFinal(String status) =>
      status == success || status == failed || status == cancelled || status == expired;

  static String label(String status) => switch (status) {
    pending => 'Chờ thanh toán',
    processing => 'Đang xác minh',
    success => 'Thành công',
    failed => 'Thất bại',
    cancelled => 'Khách đã hủy',
    expired => 'Hết hạn',
    _ => status,
  };
}

class BookingModel {
  final int id;
  final String bookingCode;
  final int? touristId;
  final String? touristName;
  final int tourId;
  final String tourTitle;

  /// Ngày trải nghiệm — backend trả `LocalDate` (`YYYY-MM-DD`).
  /// Parse thành `DateTime` (không có phần giờ) để các màn hình hiển thị nhất quán.
  final DateTime? experienceDate;
  final num totalAmount;
  final String currency;
  final String status;
  final DateTime? createdAt;
  final DateTime? paymentDeadline;
  final DateTime? paidAt;
  final DateTime? confirmedAt;
  final DateTime? completedAt;
  final String? cancellationReason;
  final List<SlotHoldModel> slotHolds;

  const BookingModel({
    required this.id,
    required this.bookingCode,
    this.touristId,
    this.touristName,
    required this.tourId,
    required this.tourTitle,
    this.experienceDate,
    required this.totalAmount,
    this.currency = 'VND',
    required this.status,
    required this.createdAt,
    required this.paymentDeadline,
    required this.paidAt,
    this.confirmedAt,
    this.completedAt,
    required this.cancellationReason,
    this.slotHolds = const [],
  });

  factory BookingModel.fromJson(Map<String, dynamic> json) => BookingModel(
        id: _asNum(json['id']).toInt(),
        bookingCode: json['bookingCode']?.toString() ?? '',
        touristId: json['touristId'] == null ? null : _asNum(json['touristId']).toInt(),
        touristName: json['touristName']?.toString(),
        tourId: _asNum(json['tourId']).toInt(),
        tourTitle: json['tourTitle']?.toString() ?? '',
        experienceDate: _asLocalDate(json['experienceDate']),
        totalAmount: _asNum(json['totalAmount']),
        currency: json['currency']?.toString() ?? 'VND',
        status: json['status']?.toString() ?? '',
        createdAt: _asDate(json['createdAt']),
        paymentDeadline: _asDate(json['paymentDeadline']),
        paidAt: _asDate(json['paidAt']),
        confirmedAt: _asDate(json['confirmedAt']),
        completedAt: _asDate(json['completedAt']),
        cancellationReason: json['cancellationReason']?.toString(),
        slotHolds: (json['slotHolds'] is List)
            ? (json['slotHolds'] as List)
                .whereType<Map<String, dynamic>>()
                .map(SlotHoldModel.fromJson)
                .toList()
            : const [],
      );

  bool get isPaid => status == BookingStatus.confirmed || status == BookingStatus.completed;

  /// Còn có thể thanh toán: đang chờ và chưa quá hạn.
  bool get canPay {
    if (status != BookingStatus.pendingPayment) return false;
    final deadline = paymentDeadline;
    return deadline != null && deadline.isAfter(DateTime.now());
  }

  // ── Trạng thái ────────────────────────────────────────────────────────────

  bool get isPendingPayment => status == BookingStatus.pendingPayment;
  bool get isConfirmed => status == BookingStatus.confirmed;
  bool get isCompleted => status == BookingStatus.completed;
  bool get isExpired => status == BookingStatus.expired;
  bool get isCancelled => status == BookingStatus.cancelled;

  /// Còn trong thời gian thanh toán (10 phút) hay chưa.
  bool get isPaymentWindowOpen {
    if (!isPendingPayment) return false;
    if (paymentDeadline == null) return true;
    return paymentDeadline!.isAfter(DateTime.now());
  }

  /// Số giây còn lại để thanh toán (0 nếu đã hết hạn).
  int get remainingSeconds {
    if (paymentDeadline == null) return 0;
    final diff = paymentDeadline!.difference(DateTime.now()).inSeconds;
    return diff > 0 ? diff : 0;
  }

  /// Đồng hồ đếm ngược dạng mm:ss.
  String get countdownText {
    final total = remainingSeconds;
    final minutes = (total ~/ 60).toString().padLeft(2, '0');
    final seconds = (total % 60).toString().padLeft(2, '0');
    return '$minutes:$seconds';
  }

  // ── Nhãn hiển thị ─────────────────────────────────────────────────────────

  String get statusLabel => bookingStatusLabel(status);

  String get formattedTotal => formatVndAmount(totalAmount);

  String get formattedExperienceDate => formatDateVn(experienceDate);

  String get formattedCreatedAt => formatDateTimeVn(createdAt);

  String get formattedPaidAt => formatDateTimeVn(paidAt);

  /// Chỉ hiện thị nút hủy khi chưa thanh toán.
  bool get canCancel => isPendingPayment;

  // ── Trải nghiệm đã đặt (slot holds) ───────────────────────────────────────

  /// Số trải nghiệm trong tour đã được giữ chỗ cho đơn này.
  /// KHÔNG phải số vé — mỗi trải nghiệm trong tour chiếm 1 slot/ngày.
  int get experienceCount => slotHolds.length;

  /// Tổng giá của các trải nghiệm đã đặt (từ chi tiết slot hold).
  /// Trùng `totalAmount` khi backend đã trả đúng giá theo từng trải nghiệm.
  double get experiencesTotalAmount => slotHolds.fold<double>(
        0,
        (sum, h) => sum + h.experiencePrice,
      );

  /// Slot thực sự còn giữ (chưa giải phóng).
  List<SlotHoldModel> get activeSlotHolds =>
      slotHolds.where((h) => !h.released).toList(growable: false);

  /// Slot đã được giải phóng (đơn hủy / hết hạn).
  List<SlotHoldModel> get releasedSlotHolds =>
      slotHolds.where((h) => h.released).toList(growable: false);

  Map<String, dynamic> toJson() => {
        'id': id,
        'bookingCode': bookingCode,
        'touristId': touristId,
        'touristName': touristName,
        'tourId': tourId,
        'tourTitle': tourTitle,
        'experienceDate': experienceDate == null
            ? null
            : formatLocalDateString(experienceDate!.toIso8601String()),
        'totalAmount': totalAmount,
        'currency': currency,
        'status': status,
        'createdAt': createdAt?.toIso8601String(),
        'paymentDeadline': paymentDeadline?.toIso8601String(),
        'paidAt': paidAt?.toIso8601String(),
        'confirmedAt': confirmedAt?.toIso8601String(),
        'completedAt': completedAt?.toIso8601String(),
        'cancellationReason': cancellationReason,
      };
}

/// Một lần giữ chỗ (slot) trong booking.
///
/// ── Ý nghĩa ──
///  Mỗi Booking giữ **một slot cho MỌI trải nghiệm** thuộc tour (mỗi trải nghiệm 1 slot/ngày).
///  Vì vậy số lượng `slotHolds` = số trải nghiệm trong tour, KHÔNG phải số lượng vé của khách.
///  Do đó UI phải hiển thị theo danh sách "trải nghiệm đã đặt", không phải "x chỗ đã giữ".
class SlotHoldModel {
  final int id;
  final int? experienceSlotId;
  final int? experienceId;
  final String? experienceTitle;
  final double experiencePrice;
  final String? slotDate;
  final bool released;
  final DateTime? heldAt;
  final DateTime? releasedAt;

  const SlotHoldModel({
    required this.id,
    this.experienceSlotId,
    this.experienceId,
    this.experienceTitle,
    this.experiencePrice = 0,
    this.slotDate,
    this.released = false,
    this.heldAt,
    this.releasedAt,
  });

  factory SlotHoldModel.fromJson(Map<String, dynamic> json) => SlotHoldModel(
        id: _asNum(json['id']).toInt(),
        experienceSlotId:
            json['experienceSlotId'] == null ? null : _asNum(json['experienceSlotId']).toInt(),
        experienceId:
            json['experienceId'] == null ? null : _asNum(json['experienceId']).toInt(),
        experienceTitle: json['experienceTitle']?.toString(),
        experiencePrice: _asNum(json['experiencePrice']).toDouble(),
        slotDate: json['slotDate']?.toString(),
        released: json['released'] == true,
        heldAt: _asDate(json['heldAt']),
        releasedAt: _asDate(json['releasedAt']),
      );
}
