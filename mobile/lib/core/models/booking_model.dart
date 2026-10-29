import 'gamification_model.dart' show formatThousands;

num _asNum(dynamic value) {
  if (value is num) return value;
  return num.tryParse(value?.toString() ?? '') ?? 0;
}

DateTime? _asDate(dynamic value) {
  if (value == null) return null;
  return DateTime.tryParse(value.toString())?.toLocal();
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

  /// Đã có kết quả cuối. PENDING / PROCESSING nghĩa là CHƯA rõ, không được coi là thất bại.
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
  final int tourId;
  final String tourTitle;
  final DateTime? experienceDate;
  final num totalAmount;
  final String status;
  final DateTime? createdAt;
  final DateTime? paymentDeadline;
  final DateTime? paidAt;
  final String? cancellationReason;

  const BookingModel({
    required this.id,
    required this.bookingCode,
    required this.tourId,
    required this.tourTitle,
    required this.experienceDate,
    required this.totalAmount,
    required this.status,
    required this.createdAt,
    required this.paymentDeadline,
    required this.paidAt,
    required this.cancellationReason,
  });

  factory BookingModel.fromJson(Map<String, dynamic> json) => BookingModel(
        id: _asNum(json['id']).toInt(),
        bookingCode: json['bookingCode']?.toString() ?? '',
        tourId: _asNum(json['tourId']).toInt(),
        tourTitle: json['tourTitle']?.toString() ?? '',
        experienceDate: _asDate(json['experienceDate']),
        totalAmount: _asNum(json['totalAmount']),
        status: json['status']?.toString() ?? '',
        createdAt: _asDate(json['createdAt']),
        paymentDeadline: _asDate(json['paymentDeadline']),
        paidAt: _asDate(json['paidAt']),
        cancellationReason: json['cancellationReason']?.toString(),
      );

  bool get isPaid => status == BookingStatus.confirmed || status == BookingStatus.completed;

  /// Còn có thể thanh toán: đang chờ và chưa quá hạn.
  bool get canPay {
    if (status != BookingStatus.pendingPayment) return false;
    final deadline = paymentDeadline;
    return deadline != null && deadline.isAfter(DateTime.now());
  }
}

class PaymentModel {
  final int id;
  final int bookingId;
  final String bookingCode;
  final String txnRef;
  final String status;
  final num amount;
  final DateTime? createdAt;
  final DateTime? paidAt;
  final bool duplicatePayment;
  final String? bankCode;

  const PaymentModel({
    required this.id,
    required this.bookingId,
    required this.bookingCode,
    required this.txnRef,
    required this.status,
    required this.amount,
    required this.createdAt,
    required this.paidAt,
    required this.duplicatePayment,
    required this.bankCode,
  });

  factory PaymentModel.fromJson(Map<String, dynamic> json) => PaymentModel(
        id: _asNum(json['id']).toInt(),
        bookingId: _asNum(json['bookingId']).toInt(),
        bookingCode: json['bookingCode']?.toString() ?? '',
        txnRef: json['txnRef']?.toString() ?? '',
        status: json['status']?.toString() ?? '',
        amount: _asNum(json['amount']),
        createdAt: _asDate(json['createdAt']),
        paidAt: _asDate(json['paidAt']),
        duplicatePayment: json['duplicatePayment'] == true,
        bankCode: json['bankCode']?.toString(),
      );
}

/// Kết quả khởi tạo thanh toán. `paymentUrl` đã được backend ký, phải mở nguyên vẹn.
class PaymentInitModel {
  final int paymentId;
  final String paymentUrl;
  final DateTime? expiresAt;

  const PaymentInitModel({
    required this.paymentId,
    required this.paymentUrl,
    required this.expiresAt,
  });

  factory PaymentInitModel.fromJson(Map<String, dynamic> json) => PaymentInitModel(
        paymentId: _asNum(json['paymentId']).toInt(),
        paymentUrl: json['paymentUrl']?.toString() ?? '',
        expiresAt: _asDate(json['expiresAt']),
      );
}

class PaymentMethodModel {
  /// vnp_BankCode gửi lên khi init; null nghĩa là để khách tự chọn trên trang VNPay.
  final String? bankCode;
  final String label;
  final String description;
  final int displayOrder;

  const PaymentMethodModel({
    required this.bankCode,
    required this.label,
    required this.description,
    required this.displayOrder,
  });

  factory PaymentMethodModel.fromJson(Map<String, dynamic> json) => PaymentMethodModel(
        bankCode: json['bankCode']?.toString(),
        label: json['label']?.toString() ?? '',
        description: json['description']?.toString() ?? '',
        displayOrder: _asNum(json['displayOrder']).toInt(),
      );
}
