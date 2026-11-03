/// Model Booking (đặt tour).
///
/// ── Quy ước ──
///  • Tiền VND là số nguyên — backend trả `BigDecimal` dạng JSON number.
///    TUYỆT ĐỐI không chia/nhân 100 khi gọi API.
///  • `experienceDate` là `LocalDate` → chuỗi `YYYY-MM-DD` (KHÔNG có phần giờ).
///  • `createdAt`, `paymentDeadline`, `paidAt`... là `Instant` ISO-8601 UTC.
library;

import '../utils/formatters.dart';

class BookingModel {
  final int id;
  final String? bookingCode;
  final int? touristId;
  final String? touristName;
  final int? tourId;
  final String? tourTitle;
  final String? experienceDate;
  final double totalAmount;
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
    this.bookingCode,
    this.touristId,
    this.touristName,
    this.tourId,
    this.tourTitle,
    this.experienceDate,
    this.totalAmount = 0,
    this.currency = 'VND',
    this.status = 'PENDING_PAYMENT',
    this.createdAt,
    this.paymentDeadline,
    this.paidAt,
    this.confirmedAt,
    this.completedAt,
    this.cancellationReason,
    this.slotHolds = const [],
  });

  // ── Trạng thái ─────────────────────────────────────────────────────────────

  bool get isPendingPayment => status == 'PENDING_PAYMENT';
  bool get isConfirmed => status == 'CONFIRMED';
  bool get isCompleted => status == 'COMPLETED';
  bool get isExpired => status == 'EXPIRED';
  bool get isCancelled => status == 'CANCELLED';

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

  /// Đếm ngược dạng mm:ss.
  String get countdownText {
    final total = remainingSeconds;
    final minutes = (total ~/ 60).toString().padLeft(2, '0');
    final seconds = (total % 60).toString().padLeft(2, '0');
    return '$minutes:$seconds';
  }

  // ── Nhãn hiển thị ──────────────────────────────────────────────────────────

  String get statusLabel => bookingStatusLabel(status);

  String get formattedTotal => formatVndAmount(totalAmount);

  String get formattedExperienceDate => formatLocalDateString(experienceDate);

  String get formattedCreatedAt => formatDateTimeVn(createdAt);

  String get formattedPaidAt => formatDateTimeVn(paidAt);

  /// Chỉ hiển thị nút hủy khi chưa thanh toán.
  bool get canCancel => isPendingPayment;

  // ── Trải nghiệm đã đặt (slot holds) ───────────────────────────────────────

  /// Số trải nghiệm trong tour đã được giữ chỗ cho đơn này.
  /// KHÔNG phải số vé — mỗi trải nghiệm trong tour chiếm 1 slot/ngày.
  int get experienceCount => slotHolds.length;

  /// Tổng giá của các trải nghiệm đã đặt (từ chi tiết slot hold).
  /// Trùng `totalAmount` khi backend đã trả đủ giá theo từng trải nghiệm.
  double get experiencesTotalAmount => slotHolds.fold<double>(
        0,
        (sum, h) => sum + h.experiencePrice,
      );

  /// Slot đang thực sự còn giữ (chưa giải phóng).
  List<SlotHoldModel> get activeSlotHolds =>
      slotHolds.where((h) => !h.released).toList(growable: false);

  /// Slot đã được giải phóng (đơn hủy / hết hạn).
  List<SlotHoldModel> get releasedSlotHolds =>
      slotHolds.where((h) => h.released).toList(growable: false);

  factory BookingModel.fromJson(Map<String, dynamic> json) {
    return BookingModel(
      id: _toInt(json['id']),
      bookingCode: json['bookingCode']?.toString(),
      touristId: _toNullableInt(json['touristId']),
      touristName: json['touristName']?.toString(),
      tourId: _toNullableInt(json['tourId']),
      tourTitle: json['tourTitle']?.toString(),
      experienceDate: json['experienceDate']?.toString(),
      totalAmount: _toDouble(json['totalAmount']),
      currency: json['currency']?.toString() ?? 'VND',
      status: json['status']?.toString() ?? 'PENDING_PAYMENT',
      createdAt: _toDate(json['createdAt']),
      paymentDeadline: _toDate(json['paymentDeadline']),
      paidAt: _toDate(json['paidAt']),
      confirmedAt: _toDate(json['confirmedAt']),
      completedAt: _toDate(json['completedAt']),
      cancellationReason: json['cancellationReason']?.toString(),
      slotHolds: (json['slotHolds'] is List)
          ? (json['slotHolds'] as List)
              .whereType<Map<String, dynamic>>()
              .map(SlotHoldModel.fromJson)
              .toList()
          : const [],
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'bookingCode': bookingCode,
        'touristId': touristId,
        'touristName': touristName,
        'tourId': tourId,
        'tourTitle': tourTitle,
        'experienceDate': experienceDate,
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

  factory SlotHoldModel.fromJson(Map<String, dynamic> json) {
    return SlotHoldModel(
      id: _toInt(json['id']),
      experienceSlotId: _toNullableInt(json['experienceSlotId']),
      experienceId: _toNullableInt(json['experienceId']),
      experienceTitle: json['experienceTitle']?.toString(),
      experiencePrice: _toDouble(json['experiencePrice']),
      slotDate: json['slotDate']?.toString(),
      released: json['released'] == true,
      heldAt: _toDate(json['heldAt']),
      releasedAt: _toDate(json['releasedAt']),
    );
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

int _toInt(dynamic v) {
  if (v is num) return v.toInt();
  return int.tryParse(v?.toString() ?? '') ?? 0;
}

int? _toNullableInt(dynamic v) {
  if (v is num) return v.toInt();
  return int.tryParse(v?.toString() ?? '');
}

double _toDouble(dynamic v) {
  if (v is num) return v.toDouble();
  return double.tryParse(v?.toString() ?? '') ?? 0;
}

DateTime? _toDate(dynamic v) {
  if (v == null) return null;
  final raw = v.toString();
  if (raw.isEmpty) return null;
  return DateTime.tryParse(raw)?.toLocal();
}
