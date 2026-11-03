/// Model Payment (giao dịch VNPay).
///
/// ── Quy ước ──
///  • Tiền VND là số nguyên — KHÔNG nhân/chia 100.
///  • `createdAt`, `expiresAt`, `paidAt` là `Instant` ISO-8601 UTC.
///  • Trạng thái: PENDING / PROCESSING / SUCCESS / FAILED / CANCELLED / EXPIRED.
///    `PROCESSING` là đang xử lý — KHÔNG phải thất bại, tuyệt đối không hiển thị như lỗi.
library;

import '../utils/formatters.dart';

class PaymentModel {
  final int id;
  final int? bookingId;
  final String? bookingCode;
  final String? txnRef;
  final String? vnpTransactionNo;
  final String? method;
  final String? bankCode;
  final String? cardType;
  final String status;
  final double amount;
  final String currency;
  final DateTime? createdAt;
  final DateTime? expiresAt;
  final DateTime? paidAt;
  final String? paymentUrl;
  final bool duplicatePayment;
  final int ipnCount;
  final String? vnpResponseCode;
  final String? vnpTransactionStatus;
  final String? vnpMessage;
  final String? note;

  const PaymentModel({
    required this.id,
    this.bookingId,
    this.bookingCode,
    this.txnRef,
    this.vnpTransactionNo,
    this.method,
    this.bankCode,
    this.cardType,
    this.status = 'PENDING',
    this.amount = 0,
    this.currency = 'VND',
    this.createdAt,
    this.expiresAt,
    this.paidAt,
    this.paymentUrl,
    this.duplicatePayment = false,
    this.ipnCount = 0,
    this.vnpResponseCode,
    this.vnpTransactionStatus,
    this.vnpMessage,
    this.note,
  });

  bool get isSuccess => status == 'SUCCESS';
  bool get isFailed => status == 'FAILED';
  bool get isCancelled => status == 'CANCELLED';
  bool get isExpired => status == 'EXPIRED';

  /// Đang xử lý (chưa có kết quả cuối) — cần poll tiếp, KHÔNG coi là lỗi.
  bool get isProcessing => status == 'PENDING' || status == 'PROCESSING';

  /// Giao dịch đã có kết quả cuối (thành công / thất bại / đã hủy).
  bool get isFinal => isSuccess || isFailed || isCancelled;

  /// Được phép thử lại thanh toán (booking còn trong hạn 10 phút).
  bool get isRetryable => isFailed || isCancelled || isExpired;

  String get statusLabel => paymentStatusLabel(status);

  String get formattedAmount => formatVndAmount(amount);

  factory PaymentModel.fromJson(Map<String, dynamic> json) {
    return PaymentModel(
      id: _toInt(json['id']),
      bookingId: _toNullableInt(json['bookingId']),
      bookingCode: json['bookingCode']?.toString(),
      txnRef: json['txnRef']?.toString(),
      vnpTransactionNo: json['vnpTransactionNo']?.toString(),
      method: json['method']?.toString(),
      bankCode: json['bankCode']?.toString(),
      cardType: json['cardType']?.toString(),
      status: json['status']?.toString() ?? 'PENDING',
      amount: _toDouble(json['amount']),
      currency: json['currency']?.toString() ?? 'VND',
      createdAt: _toDate(json['createdAt']),
      expiresAt: _toDate(json['expiresAt']),
      paidAt: _toDate(json['paidAt']),
      paymentUrl: json['paymentUrl']?.toString(),
      duplicatePayment: json['duplicatePayment'] == true,
      ipnCount: _toInt(json['ipnCount']),
      vnpResponseCode: json['vnpResponseCode']?.toString(),
      vnpTransactionStatus: json['vnpTransactionStatus']?.toString(),
      vnpMessage: json['vnpMessage']?.toString(),
      note: json['note']?.toString(),
    );
  }
}

/// Kết quả khởi tạo thanh toán (POST /payments/bookings/{id}/init).
class PaymentInitModel {
  final int paymentId;
  final int? bookingId;
  final String? bookingCode;
  final String? txnRef;
  final double amount;
  final String currency;
  final String? paymentUrl;
  final DateTime? expiresAt;
  final String? selectedBankCode;
  final List<PaymentMethodOption> availableMethods;
  final String? message;

  const PaymentInitModel({
    required this.paymentId,
    this.bookingId,
    this.bookingCode,
    this.txnRef,
    this.amount = 0,
    this.currency = 'VND',
    this.paymentUrl,
    this.expiresAt,
    this.selectedBankCode,
    this.availableMethods = const [],
    this.message,
  });

  String get formattedAmount => formatVndAmount(amount);

  factory PaymentInitModel.fromJson(Map<String, dynamic> json) {
    return PaymentInitModel(
      paymentId: _toInt(json['paymentId']),
      bookingId: _toNullableInt(json['bookingId']),
      bookingCode: json['bookingCode']?.toString(),
      txnRef: json['txnRef']?.toString(),
      amount: _toDouble(json['amount']),
      currency: json['currency']?.toString() ?? 'VND',
      paymentUrl: json['paymentUrl']?.toString(),
      expiresAt: _toDate(json['expiresAt']),
      selectedBankCode: json['selectedBankCode']?.toString(),
      availableMethods: (json['availableMethods'] is List)
          ? (json['availableMethods'] as List)
              .whereType<Map<String, dynamic>>()
              .map(PaymentMethodOption.fromJson)
              .toList()
          : const [],
      message: json['message']?.toString(),
    );
  }
}

/// Một phương thức thanh toán (3 nhóm VNPay).
class PaymentMethodOption {
  final String? bankCode;
  final String code;
  final String label;
  final String? description;
  final String? cardType;
  final int displayOrder;

  const PaymentMethodOption({
    this.bankCode,
    required this.code,
    required this.label,
    this.description,
    this.cardType,
    this.displayOrder = 0,
  });

  factory PaymentMethodOption.fromJson(Map<String, dynamic> json) {
    return PaymentMethodOption(
      bankCode: json['bankCode']?.toString(),
      code: json['code']?.toString() ?? '',
      label: json['label']?.toString() ?? '',
      description: json['description']?.toString(),
      cardType: json['cardType']?.toString(),
      displayOrder: _toInt(json['displayOrder']),
    );
  }
}

/// Danh sách phương thức thanh toán (GET /payments/methods).
class PaymentMethodsModel {
  final List<PaymentMethodOption> methods;
  final List<PaymentBankGroup> bankGroups;
  final bool bankCodeSent;

  const PaymentMethodsModel({
    this.methods = const [],
    this.bankGroups = const [],
    this.bankCodeSent = false,
  });

  factory PaymentMethodsModel.fromJson(Map<String, dynamic> json) {
    return PaymentMethodsModel(
      methods: (json['methods'] is List)
          ? (json['methods'] as List)
              .whereType<Map<String, dynamic>>()
              .map(PaymentMethodOption.fromJson)
              .toList()
          : const [],
      bankGroups: (json['bankGroups'] is List)
          ? (json['bankGroups'] as List)
              .whereType<Map<String, dynamic>>()
              .map(PaymentBankGroup.fromJson)
              .toList()
          : const [],
      bankCodeSent: json['bankCodeSent'] == true,
    );
  }
}

/// Nhóm ngân hàng theo phương thức.
class PaymentBankGroup {
  final String methodCode;
  final String label;
  final List<PaymentBank> banks;

  const PaymentBankGroup({
    required this.methodCode,
    required this.label,
    this.banks = const [],
  });

  factory PaymentBankGroup.fromJson(Map<String, dynamic> json) {
    return PaymentBankGroup(
      methodCode: json['methodCode']?.toString() ?? '',
      label: json['label']?.toString() ?? '',
      banks: (json['banks'] is List)
          ? (json['banks'] as List)
              .whereType<Map<String, dynamic>>()
              .map(PaymentBank.fromJson)
              .toList()
          : const [],
    );
  }
}

/// Một ngân hàng / ví cụ thể.
class PaymentBank {
  final String bankCode;
  final String bankName;
  final String? bankLogoUrl;
  final String? bankType;

  const PaymentBank({
    required this.bankCode,
    required this.bankName,
    this.bankLogoUrl,
    this.bankType,
  });

  factory PaymentBank.fromJson(Map<String, dynamic> json) {
    return PaymentBank(
      bankCode: json['bankCode']?.toString() ?? '',
      bankName: json['bankName']?.toString() ?? '',
      bankLogoUrl: json['bankLogoUrl']?.toString(),
      bankType: json['bankType']?.toString(),
    );
  }
}

/// Kết quả QueryDR: `POST /payments/{id}/query` → { outcome, message }.
/// outcome ∈ SUCCESS | FAILED | CANCELLED | DUPLICATE | UNKNOWN
class PaymentQueryResult {
  final String outcome;
  final String message;

  const PaymentQueryResult({required this.outcome, required this.message});

  bool get isSuccess => outcome == 'SUCCESS';
  bool get isFailed => outcome == 'FAILED';
  bool get isCancelled => outcome == 'CANCELLED';
  bool get isUnknown => outcome == 'UNKNOWN';

  /// Đã rõ kết quả (không còn "chờ").
  bool get isResolved => !isUnknown;

  factory PaymentQueryResult.fromJson(Map<String, dynamic> json) {
    return PaymentQueryResult(
      outcome: json['outcome']?.toString() ?? 'UNKNOWN',
      message: json['message']?.toString() ?? '',
    );
  }
}

/// Kết quả áp dụng từ Return URL: `POST /payments/return-result`.
///
/// Trả về cùng cấu trúc với `PaymentVerificationResponse` của backend.
class PaymentReturnResult {
  /// Id giao dịch trong hệ thống.
  final int? paymentId;

  /// Id booking.
  final int? bookingId;

  /// Mã đơn.
  final String? bookingCode;

  /// Trạng thái giao dịch: SUCCESS | FAILED | CANCELLED | PENDING | PROCESSING | EXPIRED.
  final String status;

  /// Mã tham chiếu giao dịch.
  final String? txnRef;

  /// Thông điệp hiển thị cho người dùng.
  final String message;

  const PaymentReturnResult({
    this.paymentId,
    this.bookingId,
    this.bookingCode,
    this.txnRef,
    required this.status,
    required this.message,
  });

  bool get isSuccess => status == 'SUCCESS';

  bool get isFailed => status == 'FAILED';

  bool get isCancelled => status == 'CANCELLED';

  /// Đã có kết quả cuối (không còn "chờ").
  bool get isFinal => isSuccess || isFailed || isCancelled;

  factory PaymentReturnResult.fromJson(Map<String, dynamic> json) {
    return PaymentReturnResult(
      paymentId: json['paymentId'] == null ? null : _toNullableInt(json['paymentId']),
      bookingId: json['bookingId'] == null ? null : _toNullableInt(json['bookingId']),
      bookingCode: json['bookingCode']?.toString(),
      txnRef: json['txnRef']?.toString(),
      status: json['status']?.toString() ?? 'UNKNOWN',
      message: json['message']?.toString() ?? '',
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
