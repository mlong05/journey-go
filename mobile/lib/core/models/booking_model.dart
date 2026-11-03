/// Model Booking (Ä‘áº·t tour) + cÃ¡c model Payment dÃ¹ng chung.
///
/// â”€â”€ Quy Æ°á»›c â”€â”€
///  â€¢ Tiá»n VND lÃ  sá»‘ nguyÃªn â€” backend tráº£ `BigDecimal` dáº¡ng JSON number.
///    TUYá»†T Äá»I khÃ´ng chia/nhÃ¢n 100 khi gá»i API.
///  â€¢ `experienceDate` lÃ  `LocalDate` â†’ chuá»—i `YYYY-MM-DD` (KHÃ”NG cÃ³ pháº§n giá»).
///  â€¢ `createdAt`, `paymentDeadline`, `paidAt`... lÃ  `Instant` ISO-8601 UTC.
library;

import '../utils/formatters.dart';
import 'gamification_model.dart' show formatThousands;

/// Các model Payment được định nghĩa trong `payment_model.dart` nhưng vẫn được
/// export lại từ đây để tương thích với code đang import từ `booking_model.dart`.
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

String formatMoney(num value) => '${formatThousands(value)} Ä‘';

String formatDateTime(DateTime? value) {
  if (value == null) return 'â€”';
  String two(int n) => n.toString().padLeft(2, '0');
  return '${two(value.hour)}:${two(value.minute)} ${two(value.day)}/${two(value.month)}/${value.year}';
}

String formatDay(DateTime? value) {
  if (value == null) return 'â€”';
  String two(int n) => n.toString().padLeft(2, '0');
  return '${two(value.day)}/${two(value.month)}/${value.year}';
}

/// Tráº¡ng thÃ¡i booking theo backend (BookingStatus).
class BookingStatus {
  static const pendingPayment = 'PENDING_PAYMENT';
  static const confirmed = 'CONFIRMED';
  static const completed = 'COMPLETED';
  static const expired = 'EXPIRED';
  static const cancelled = 'CANCELLED';

  static String label(String status) => switch (status) {
        pendingPayment => 'Chá» thanh toÃ¡n',
        confirmed => 'ÄÃ£ xÃ¡c nháº­n',
        completed => 'ÄÃ£ hoÃ n thÃ nh',
        expired => 'Háº¿t háº¡n thanh toÃ¡n',
        cancelled => 'ÄÃ£ há»§y',
        _ => status,
      };
}

/// Tráº¡ng thÃ¡i má»™t láº§n thanh toÃ¡n (PaymentStatus).
class PaymentStatus {
  static const pending = 'PENDING';
  static const processing = 'PROCESSING';
  static const success = 'SUCCESS';
  static const failed = 'FAILED';
  static const expired = 'EXPIRED';
  static const cancelled = 'CANCELLED';

  /// ÄÃ£ cÃ³ káº¿t quáº£ cuá»‘i. PENDING / PROCESSING nghÄ©a lÃ  CHÆ¯A rÃµ, khÃ´ng Ä‘Æ°á»£c coi lÃ  tháº¥t báº¡i.
  static bool isFinal(String status) =>
      status == success || status == failed || status == cancelled || status == expired;

  static String label(String status) => switch (status) {
        pending => 'Chá» thanh toÃ¡n',
        processing => 'Äang xÃ¡c minh',
        success => 'ThÃ nh cÃ´ng',
        failed => 'Tháº¥t báº¡i',
        cancelled => 'KhÃ¡ch Ä‘Ã£ há»§y',
        expired => 'Háº¿t háº¡n',
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
    required this.experienceDate,
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

  /// CÃ²n cÃ³ thá»ƒ thanh toÃ¡n: Ä‘ang chá» vÃ  chÆ°a quÃ¡ háº¡n.
  bool get canPay {
    if (status != BookingStatus.pendingPayment) return false;
    final deadline = paymentDeadline;
    return deadline != null && deadline.isAfter(DateTime.now());
  }

  // â”€â”€ Tráº¡ng thÃ¡i â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  bool get isPendingPayment => status == BookingStatus.pendingPayment;
  bool get isConfirmed => status == BookingStatus.confirmed;
  bool get isCompleted => status == BookingStatus.completed;
  bool get isExpired => status == BookingStatus.expired;
  bool get isCancelled => status == BookingStatus.cancelled;

  /// CÃ²n trong thá»i gian thanh toÃ¡n (10 phÃºt) hay chÆ°a.
  bool get isPaymentWindowOpen {
    if (!isPendingPayment) return false;
    if (paymentDeadline == null) return true;
    return paymentDeadline!.isAfter(DateTime.now());
  }

  /// Sá»‘ giÃ¢y cÃ²n láº¡i Ä‘á»ƒ thanh toÃ¡n (0 náº¿u Ä‘Ã£ háº¿t háº¡n).
  int get remainingSeconds {
    if (paymentDeadline == null) return 0;
    final diff = paymentDeadline!.difference(DateTime.now()).inSeconds;
    return diff > 0 ? diff : 0;
  }

  /// Äáº¿m ngÆ°á»£c dáº¡ng mm:ss.
  String get countdownText {
    final total = remainingSeconds;
    final minutes = (total ~/ 60).toString().padLeft(2, '0');
    final seconds = (total % 60).toString().padLeft(2, '0');
    return '$minutes:$seconds';
  }

  // â”€â”€ NhÃ£n hiá»ƒn thá»‹ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  String get statusLabel => bookingStatusLabel(status);

  String get formattedTotal => formatVndAmount(totalAmount);

  String get formattedExperienceDate => formatDateVn(experienceDate);

  String get formattedCreatedAt => formatDateTimeVn(createdAt);

  String get formattedPaidAt => formatDateTimeVn(paidAt);

  /// Chá»‰ hiá»ƒn thá»‹ nÃºt há»§y khi chÆ°a thanh toÃ¡n.
  bool get canCancel => isPendingPayment;

  // â”€â”€ Tráº£i nghiá»‡m Ä‘Ã£ Ä‘áº·t (slot holds) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /// Sá»‘ tráº£i nghiá»‡m trong tour Ä‘Ã£ Ä‘Æ°á»£c giá»¯ chá»— cho Ä‘Æ¡n nÃ y.
  /// KHÃ”NG pháº£i sá»‘ vÃ© â€” má»—i tráº£i nghiá»‡m trong tour chiáº¿m 1 slot/ngÃ y.
  int get experienceCount => slotHolds.length;

  /// Tá»•ng giÃ¡ cá»§a cÃ¡c tráº£i nghiá»‡m Ä‘Ã£ Ä‘áº·t (tá»« chi tiáº¿t slot hold).
  /// TrÃ¹ng `totalAmount` khi backend Ä‘Ã£ tráº£ Ä‘á»§ giÃ¡ theo tá»«ng tráº£i nghiá»‡m.
  double get experiencesTotalAmount => slotHolds.fold<double>(
        0,
        (sum, h) => sum + h.experiencePrice,
      );

  /// Slot Ä‘ang thá»±c sá»± cÃ²n giá»¯ (chÆ°a giáº£i phÃ³ng).
  List<SlotHoldModel> get activeSlotHolds =>
      slotHolds.where((h) => !h.released).toList(growable: false);

  /// Slot Ä‘Ã£ Ä‘Æ°á»£c giáº£i phÃ³ng (Ä‘Æ¡n há»§y / háº¿t háº¡n).
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

/// Má»™t láº§n giá»¯ chá»— (slot) trong booking.
///
/// â”€â”€ Ã nghÄ©a â”€â”€
///  Má»—i Booking giá»¯ **má»™t slot cho Má»ŒI tráº£i nghiá»‡m** thuá»™c tour (má»—i tráº£i nghiá»‡m 1 slot/ngÃ y).
///  VÃ¬ váº­y sá»‘ lÆ°á»£ng `slotHolds` = sá»‘ tráº£i nghiá»‡m trong tour, KHÃ”NG pháº£i sá»‘ lÆ°á»£ng vÃ© cá»§a khÃ¡ch.
///  Do Ä‘Ã³ UI pháº£i hiá»ƒn thá»‹ theo danh sÃ¡ch "tráº£i nghiá»‡m Ä‘Ã£ Ä‘áº·t", khÃ´ng pháº£i "x chá»— Ä‘Ã£ giá»¯".
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
