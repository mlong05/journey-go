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

/// Loại khách (GuestType) — nền tảng quy định, đối tác không sửa được.
class GuestType {
  static const adult = 'ADULT';
  static const child = 'CHILD';
  static const toddler = 'TODDLER';
  static const infant = 'INFANT';

  static String label(String type) => switch (type) {
        adult => 'Người lớn',
        child => 'Trẻ em',
        toddler => 'Trẻ nhỏ',
        infant => 'Em bé',
        _ => type,
      };

  /// Khoảng tuổi áp dụng.
  static String ageRange(String type) => switch (type) {
        adult => 'Từ 12 tuổi',
        child => '5 – 11 tuổi',
        toddler => '2 – 4 tuổi',
        infant => 'Dưới 2 tuổi',
        _ => '',
      };
}

/// Một hành khách trong nhóm đặt tour.
class BookingPassengerModel {
  final int id;
  final String fullName;
  final DateTime? birthDate;
  final String? gender;
  final String? email;
  final String guestType;

  /// Nhãn loại khách từ backend (VD: "Người lớn", "Trẻ em").
  final String guestTypeLabel;

  final num price;
  final bool countsTowardSlot;

  /// true = chính người đặt tour.
  final bool bookingCustomer;

  /// Đã liên kết với một tài khoản JourneyGo hay chưa.
  final bool hasAccount;
  final String status;

  /// Tuổi tại ngày trải nghiệm.
  final int? ageAtExperience;

  /// Thông tin cá nhân (ngày sinh / giới tính / email) có hiển thị hay không.
  ///
  /// `false` khi người đang xem là hành khách được mời — theo ma trận quyền,
  /// hành khách được mời không được xem PII của hành khách khác.
  final bool personalInfoVisible;

  /// Trạng thái lời mời gần nhất: PENDING | ACCEPTED | EXPIRED | REVOKED.
  final String? invitationStatus;

  /// Thời điểm hết hạn của lời mời (24h kể từ lúc gửi).
  final DateTime? invitationExpiresAt;

  const BookingPassengerModel({
    required this.id,
    required this.fullName,
    this.birthDate,
    this.gender,
    this.email,
    this.guestType = GuestType.adult,
    this.guestTypeLabel = '',
    this.price = 0,
    this.countsTowardSlot = true,
    this.bookingCustomer = false,
    this.hasAccount = false,
    this.status = 'ACTIVE',
    this.ageAtExperience,
    this.personalInfoVisible = true,
    this.invitationStatus,
    this.invitationExpiresAt,
  });

  factory BookingPassengerModel.fromJson(Map<String, dynamic> json) =>
      BookingPassengerModel(
        id: _asNum(json['id']).toInt(),
        fullName: json['fullName']?.toString() ?? '',
        birthDate: _asLocalDate(json['birthDate']),
        gender: json['gender']?.toString(),
        email: json['email']?.toString(),
        guestType: json['guestType']?.toString() ?? GuestType.adult,
        guestTypeLabel:
            json['guestTypeLabel']?.toString() ?? GuestType.label(json['guestType']?.toString() ?? GuestType.adult),
        price: _asNum(json['price']),
        countsTowardSlot: json['countsTowardSlot'] != false,
        bookingCustomer: json['bookingCustomer'] == true,
        hasAccount: json['hasAccount'] == true,
        status: json['status']?.toString() ?? 'ACTIVE',
        ageAtExperience:
            json['ageAtExperience'] == null ? null : _asNum(json['ageAtExperience']).toInt(),
        personalInfoVisible: json['personalInfoVisible'] != false,
        invitationStatus: json['invitationStatus']?.toString(),
        invitationExpiresAt: _asDate(json['invitationExpiresAt']),
      );

  bool get isActive => status == 'ACTIVE';
  bool get isReplaced => status == 'REPLACED';

  /// Người lớn bắt buộc có email (để đăng nhập nhận vé).
  bool get emailRequired => guestType == GuestType.adult;

  /// Có thể gửi lời mời cho hành khách này không.
  ///
  /// Điều kiện: là hành khách thường (không phải người đặt), còn hiệu lực,
  /// chưa có tài khoản, có email và chưa có lời mời đang chờ.
  bool get canBeInvited =>
      !bookingCustomer &&
      isActive &&
      !hasAccount &&
      (email?.isNotEmpty ?? false) &&
      invitationStatus != 'PENDING' &&
      invitationStatus != 'ACCEPTED';

  /// Lời mời đã hết hạn ⇒ người đặt có thể gửi lại.
  bool get invitationExpired => invitationStatus == 'EXPIRED';

  /// Lời mời đang chờ xác nhận.
  bool get invitationPending => invitationStatus == 'PENDING';

  /// Người được mời đã xác nhận tham gia.
  bool get invitationAccepted => invitationStatus == 'ACCEPTED';

  /// Nhãn trạng thái hiển thị cho UI.
  String get invitationLabel => switch (invitationStatus) {
        'PENDING' => 'Đã gửi lời mời',
        'ACCEPTED' => 'Đã tham gia',
        'EXPIRED' => 'Lời mời đã hết hạn',
        'REVOKED' => 'Lời mời đã hủy',
        _ => '',
      };
}

/// Một lần thanh toán (PaymentStatus).
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

  /// Danh sách hành khách trong nhóm (người đặt là hành khách đầu tiên).
  final List<BookingPassengerModel> passengers;

  /// Số chỗ đã giữ (bằng số hành khách có `countsTowardSlot`).
  final int slotCount;

  /// Ngày trải nghiệm đã tới chưa (tour đã mở).
  final bool experienceStarted;

  /// Số ngày còn lại tới ngày trải nghiệm (0 nếu đã qua).
  final int daysUntilExperience;

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
    this.passengers = const [],
    this.slotCount = 0,
    this.experienceStarted = false,
    this.daysUntilExperience = 0,
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
        passengers: (json['passengers'] is List)
            ? (json['passengers'] as List)
                .whereType<Map<String, dynamic>>()
                .map(BookingPassengerModel.fromJson)
                .toList()
            : const [],
        slotCount: _asNum(json['slotCount']).toInt(),
        experienceStarted: json['experienceStarted'] == true,
        daysUntilExperience: _asNum(json['daysUntilExperience']).toInt(),
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

  // ── Hành khách trong nhóm ────────────────────────────────────────────────

  /// Hành khách còn hiệu lực (chưa bị thay thế / thu hồi).
  List<BookingPassengerModel> get activePassengers =>
      passengers.where((p) => p.isActive).toList(growable: false);

  /// Hành khách chưa có tài khoản ⇒ có thể gửi lời mời tham gia tour.
  List<BookingPassengerModel> get unlinkedPassengers => activePassengers
      .where((p) => !p.hasAccount && !p.bookingCustomer)
      .toList(growable: false);

  /// Tour bị khoá cho tới ngày trải nghiệm.
  ///
  /// Khớp đúng với quy tắc của backend (`LocalDate.now(Asia/Ho_Chi_Minh)`) để
  /// app KHÔNG mở màn hành trình khi server đang khoá tour.
  bool get isTourLocked => daysUntilStart > 0;

  /// Ngày trải nghiệm còn bao nhiêu ngày nữa (0 = hôm nay hoặc đã qua).
  ///
  /// Tính theo giờ Việt Nam (UTC+7) — giống hệt cách backend đếm ngày — nên
  /// nhãn đếm ngược khớp với thông báo "còn N ngày nữa" của server.
  int get daysUntilStart {
    final date = experienceDate;
    if (date != null) {
      final now = DateTime.now().toUtc().add(const Duration(hours: 7));
      final today = DateTime(now.year, now.month, now.day);
      final target = DateTime(date.year, date.month, date.day);
      final diff = target.difference(today).inDays;
      return diff < 0 ? 0 : diff;
    }
    // Không có ngày trải nghiệm ⇒ fallback về số ngày backend tính sẵn.
    return daysUntilExperience < 0 ? 0 : daysUntilExperience;
  }

  /// Nhãn nút hành động khi mở tour đã mua:
  /// "12 ngày nữa lên đường!" khi còn ngày, "Bắt đầu trải nghiệm" khi đã tới ngày.
  String get startJourneyLabel =>
      isTourLocked ? '$daysUntilStart ngày nữa lên đường!' : 'Bắt đầu trải nghiệm';

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
