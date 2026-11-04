/// Model Payment (giao dịch VNPay).
///
/// ── Quy ước ──
///  • Tiền VND là số nguyên — KHÔNG nhân/chia 100.
///  • `createdAt`, `expiresAt`, `paidAt` là `Instant` ISO-8601 UTC.
///  • Trạng thái: PENDING / PROCESSING / SUCCESS / FAILED / CANCELLED / EXPIRED.
///    `PROCESSING` là đang xử lý — KHÔNG phải thất bại, tuyệt đối không hiển thị như lỗi.
library;

import '../utils/formatters.dart';

num _asNum(dynamic value) {
  if (value is num) return value;
  return num.tryParse(value?.toString() ?? '') ?? 0;
}

DateTime? _asDate(dynamic value) {
  if (value == null) return null;
  return DateTime.tryParse(value.toString())?.toLocal();
}

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
  final num amount;
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
    required this.status,
    required this.amount,
    this.currency = 'VND',
    required this.createdAt,
    required this.paidAt,
    this.expiresAt,
    this.paymentUrl,
    this.duplicatePayment = false,
    this.ipnCount = 0,
    this.vnpResponseCode,
    this.vnpTransactionStatus,
    this.vnpMessage,
    this.note,
  });

  factory PaymentModel.fromJson(Map<String, dynamic> json) => PaymentModel(
        id: _asNum(json['id']).toInt(),
        bookingId: json['bookingId'] == null ? null : _asNum(json['bookingId']).toInt(),
        bookingCode: json['bookingCode']?.toString(),
        txnRef: json['txnRef']?.toString(),
        vnpTransactionNo: json['vnpTransactionNo']?.toString(),
        method: json['method']?.toString(),
        bankCode: json['bankCode']?.toString(),
        cardType: json['cardType']?.toString(),
        status: json['status']?.toString() ?? '',
        amount: _asNum(json['amount']),
        currency: json['currency']?.toString() ?? 'VND',
        createdAt: _asDate(json['createdAt']),
        paidAt: _asDate(json['paidAt']),
        expiresAt: _asDate(json['expiresAt']),
        paymentUrl: json['paymentUrl']?.toString(),
        duplicatePayment: json['duplicatePayment'] == true,
        ipnCount: _asNum(json['ipnCount']).toInt(),
        vnpResponseCode: json['vnpResponseCode']?.toString(),
        vnpTransactionStatus: json['vnpTransactionStatus']?.toString(),
        vnpMessage: json['vnpMessage']?.toString(),
        note: json['note']?.toString(),
      );

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
}

/// Kết quả khởi tạo thanh toán (POST /payments/bookings/{id}/init).
class PaymentInitModel {
  final int paymentId;
  final int? bookingId;
  final String? bookingCode;
  final String? txnRef;
  final num amount;
  final String currency;
  final String? paymentUrl;
  final DateTime? expiresAt;
  final String? selectedBankCode;

  const PaymentInitModel({
    required this.paymentId,
    this.bookingId,
    this.bookingCode,
    this.txnRef,
    required this.amount,
    this.currency = 'VND',
    required this.paymentUrl,
    required this.expiresAt,
    this.selectedBankCode,
  });

  factory PaymentInitModel.fromJson(Map<String, dynamic> json) => PaymentInitModel(
        paymentId: _asNum(json['paymentId']).toInt(),
        bookingId: json['bookingId'] == null ? null : _asNum(json['bookingId']).toInt(),
        bookingCode: json['bookingCode']?.toString(),
        txnRef: json['txnRef']?.toString(),
        amount: _asNum(json['amount']),
        currency: json['currency']?.toString() ?? 'VND',
        paymentUrl: json['paymentUrl']?.toString() ?? '',
        expiresAt: _asDate(json['expiresAt']),
        selectedBankCode: json['selectedBankCode']?.toString(),
      );

  String get formattedAmount => formatVndAmount(amount);
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
      displayOrder: _asNum(json['displayOrder']).toInt(),
    );
  }
}

/// Dạng rút gọn của một phương thức thanh toán — dùng bởi luồng checkout
/// (chỉ cần bankCode + nhãn để hiển thị và gửi lên khi init).
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
      paymentId: json['paymentId'] == null ? null : _asNum(json['paymentId']).toInt(),
      bookingId: json['bookingId'] == null ? null : _asNum(json['bookingId']).toInt(),
      bookingCode: json['bookingCode']?.toString(),
      txnRef: json['txnRef']?.toString(),
      status: json['status']?.toString() ?? 'UNKNOWN',
      message: json['message']?.toString() ?? '',
    );
  }
}
