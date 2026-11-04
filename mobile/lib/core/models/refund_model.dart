/// Model Refund (yêu cầu hoàn tiền).
///
/// ── Quy ước ──
///  • Tiền VND là số nguyên — KHÔNG nhân/chia 100.
///  • Số tiền do HỆ THỐNG tính (`proposedAmount`); `approvedAmount` / `refundedAmount` là
///    số tiền Admin duyệt / đã hoàn thực tế.
///  • Phương thức hoàn do ADMIN quyết ở bước review — Tourist không chọn.
library;

import '../utils/formatters.dart';

class RefundModel {
  final int id;
  final String refundCode;
  final int? paymentId;
  final String? txnRef;
  final int? bookingId;
  final String? bookingCode;
  final int? touristId;
  final String status;
  final String? declaredReason;
  final String? approvedReason;
  final String reasonDetail;
  final num proposedAmount;
  final num approvedAmount;
  final num refundedAmount;
  final String currency;
  final String? method;
  final int? reviewedBy;
  final DateTime? reviewedAt;
  final String rejectionReason;
  final String? vnpRequestId;
  final String? vnpTransactionNo;
  final String? vnpResponseCode;
  final String? vnpTransactionStatus;
  final String? vnpMessage;
  final DateTime? vnpRequestedAt;
  final DateTime? vnpResolvedAt;
  final String? bankAccountNumber;
  final String? bankAccountName;
  final String? bankName;
  final String? transferReference;
  final String? transferEvidence;
  final DateTime? transferredAt;
  final DateTime? createdAt;
  final List<RefundAuditLogModel> auditLogs;

  const RefundModel({
    required this.id,
    required this.refundCode,
    this.paymentId,
    this.txnRef,
    this.bookingId,
    this.bookingCode,
    this.touristId,
    required this.status,
    this.declaredReason,
    this.approvedReason,
    required this.reasonDetail,
    required this.proposedAmount,
    required this.approvedAmount,
    required this.refundedAmount,
    this.currency = 'VND',
    this.method,
    this.reviewedBy,
    this.reviewedAt,
    required this.rejectionReason,
    this.vnpRequestId,
    this.vnpTransactionNo,
    this.vnpResponseCode,
    this.vnpTransactionStatus,
    this.vnpMessage,
    this.vnpRequestedAt,
    this.vnpResolvedAt,
    this.bankAccountNumber,
    this.bankAccountName,
    this.bankName,
    this.transferReference,
    this.transferEvidence,
    this.transferredAt,
    this.createdAt,
    this.auditLogs = const [],
  });

  factory RefundModel.fromJson(Map<String, dynamic> json) {
    return RefundModel(
      id: _toInt(json['id']),
      refundCode: json['refundCode']?.toString() ?? '',
      paymentId: _toNullableInt(json['paymentId']),
      txnRef: json['txnRef']?.toString(),
      bookingId: _toNullableInt(json['bookingId']),
      bookingCode: json['bookingCode']?.toString(),
      touristId: _toNullableInt(json['touristId']),
      status: json['status']?.toString() ?? '',
      declaredReason: json['declaredReason']?.toString(),
      approvedReason: json['approvedReason']?.toString(),
      reasonDetail: json['reasonDetail']?.toString() ?? '',
      proposedAmount: _toNum(json['proposedAmount']),
      approvedAmount: _toNum(json['approvedAmount']),
      refundedAmount: _toNum(json['refundedAmount']),
      currency: json['currency']?.toString() ?? 'VND',
      method: json['method']?.toString(),
      reviewedBy: _toNullableInt(json['reviewedBy']),
      reviewedAt: _toDate(json['reviewedAt']),
      rejectionReason: json['rejectionReason']?.toString() ?? '',
      vnpRequestId: json['vnpRequestId']?.toString(),
      vnpTransactionNo: json['vnpTransactionNo']?.toString(),
      vnpResponseCode: json['vnpResponseCode']?.toString(),
      vnpTransactionStatus: json['vnpTransactionStatus']?.toString(),
      vnpMessage: json['vnpMessage']?.toString(),
      vnpRequestedAt: _toDate(json['vnpRequestedAt']),
      vnpResolvedAt: _toDate(json['vnpResolvedAt']),
      bankAccountNumber: json['bankAccountNumber']?.toString(),
      bankAccountName: json['bankAccountName']?.toString(),
      bankName: json['bankName']?.toString(),
      transferReference: json['transferReference']?.toString(),
      transferEvidence: json['transferEvidence']?.toString(),
      transferredAt: _toDate(json['transferredAt']),
      createdAt: _toDate(json['createdAt']),
      auditLogs: (json['auditLogs'] is List)
          ? (json['auditLogs'] as List)
              .whereType<Map<String, dynamic>>()
              .map(RefundAuditLogModel.fromJson)
              .toList()
          : const [],
    );
  }

  // ── Trạng thái ─────────────────────────────────────────────────────────────

  bool get isPending => status == 'PENDING_REVIEW';
  bool get isApproved => status == 'APPROVED';
  bool get isRejected => status == 'REJECTED';
  bool get isRefunded => status == 'REFUNDED';
  bool get isProcessing => status == 'REFUND_PROCESSING';
  bool get isManualTransferPending => status == 'MANUAL_TRANSFER_PENDING';
  bool get isFailed => status == 'FAILED';

  /// Đang chờ duyệt, đã duyệt chờ chuyển tiền hoặc đang hoàn qua VNPay.
  bool get isInProgress =>
      status == 'PENDING_REVIEW' ||
      status == 'APPROVED' ||
      status == 'REFUND_PROCESSING';

  /// Yêu cầu đã có kết quả cuối (không còn chờ xử lý).
  bool get isFinal =>
      isRefunded || isRejected || isFailed || isManualTransferPending || isApproved;

  String get statusLabel {
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
        return 'Bị từ chối';
      case 'FAILED':
        return 'Hoàn tiền lỗi';
      case 'CANCELLED':
        return 'Đã hủy';
      default:
        return status;
    }
  }

  // ── Số tiền ───────────────────────────────────────────────────────────────

  /// Số tiền nên hiển thị theo giai đoạn: đã hoàn > đã duyệt > đề xuất.
  num? get displayAmount {
    if (refundedAmount > 0) return refundedAmount;
    if (approvedAmount > 0) return approvedAmount;
    return proposedAmount;
  }

  String get declaredReasonLabel => refundReasonLabel(declaredReason);

  String get approvedReasonLabel => refundReasonLabel(approvedReason);

  String get methodLabel => refundMethodLabel(method);

  String get formattedProposedAmount => formatVndAmount(proposedAmount);

  String get formattedApprovedAmount => formatVndAmount(approvedAmount);

  String get formattedRefundedAmount => formatVndAmount(refundedAmount);

  /// Số tiền thực nhận được (đã hoàn xong; nếu chưa thì lấy số tiền được duyệt).
  num get effectiveAmount {
    if (refundedAmount > 0) return refundedAmount;
    if (approvedAmount > 0) return approvedAmount;
    return proposedAmount;
  }

  String get formattedEffectiveAmount => formatVndAmount(effectiveAmount);

  String get formattedCreatedAt => formatDateTimeVn(createdAt);

  /// Tỷ lệ hoàn theo nguyên nhân đã được Admin xác định (0.5 / 1.0).
  double get refundRate {
    if (approvedReason == 'PLATFORM_FAULT') return 1;
    if (approvedReason == 'TOURIST_FAULT') return 0.5;
    if (declaredReason == 'PLATFORM_FAULT') return 1;
    if (declaredReason == 'TOURIST_FAULT') return 0.5;
    return 0;
  }
}

/// Nhật ký kiểm toán của yêu cầu hoàn tiền.
class RefundAuditLogModel {
  final int id;
  final String? action;
  final String? fromStatus;
  final String? toStatus;
  final num amount;
  final String? reference;
  final String? detail;
  final DateTime? createdAt;

  const RefundAuditLogModel({
    required this.id,
    this.action,
    this.fromStatus,
    this.toStatus,
    this.amount = 0,
    this.reference,
    this.detail,
    this.createdAt,
  });

  factory RefundAuditLogModel.fromJson(Map<String, dynamic> json) {
    return RefundAuditLogModel(
      id: _toInt(json['id']),
      action: json['action']?.toString(),
      fromStatus: json['fromStatus']?.toString(),
      toStatus: json['toStatus']?.toString(),
      amount: _toNum(json['amount']),
      reference: json['reference']?.toString(),
      detail: json['detail']?.toString(),
      createdAt: _toDate(json['createdAt']),
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

num _toNum(dynamic v) {
  if (v is num) return v;
  return num.tryParse(v?.toString() ?? '') ?? 0;
}

DateTime? _toDate(dynamic v) {
  if (v == null) return null;
  final raw = v.toString();
  if (raw.isEmpty) return null;
  return DateTime.tryParse(raw)?.toLocal();
}
