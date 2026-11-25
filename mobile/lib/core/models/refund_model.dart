/// Model Refund (yêu cầu hoàn tiền).
///
/// ── Quy ước ──
///  • Tiền VND là số nguyên — KHÔNG nhân/chia 100.
///  • Số tiền do HỆ THỐNG tính (`proposedAmount`); `approvedAmount` / `refundedAmount` là
///    số tiền Admin duyệt / đã hoàn thực tế.
///  • Phương thức hoàn do ADMIN quyết ở bước review — Tourist không chọn.
library;

import '../utils/formatters.dart';
import '../../l10n/locale_controller.dart';

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

  /// Mã lý do cụ thể do khách chọn (VD: HEALTH_ISSUE).
  final String? declaredReasonCode;

  /// Mã lý do cụ thể do quản trị viên xác định.
  final String? approvedReasonCode;

  /// Tên tiếng Việt của nhóm lý do khai báo (VD: "Lỗi khách hàng").
  ///
  /// Backend trả sẵn để mobile KHÔNG phải tự map mã kỹ thuật → nhãn.
  final String? declaredReasonName;

  /// Tên tiếng Việt của nhóm lý do do quản trị viên xác định.
  final String? approvedReasonName;

  /// Tên tiếng Việt của lý do cụ thể do khách chọn.
  final String? declaredReasonCodeName;

  /// Tên tiếng Việt của lý do cụ thể do quản trị viên xác định.
  final String? approvedReasonCodeName;

  /// Danh sách URL bằng chứng đính kèm (ảnh / video).
  final List<String> evidenceAttachments;

  /// Lý do NGẮN GỌN do khách nhập (VD: "Bị ốm đột xuất").
  final String reasonSummary;

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
  final String? contactPhone;
  final String? contactEmail;
  final String? transferReference;
  final String? transferEvidence;

  /// Ghi chú của nền tảng khi quản trị viên ghi nhận chuyển khoản thủ công.
  final String? transferNote;

  /// Ghi chú của nền tảng khi quản trị viên xử lý yêu cầu (duyệt / từ chối).
  final String? adminNote;

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
    this.declaredReasonCode,
    this.approvedReasonCode,
    this.declaredReasonName,
    this.approvedReasonName,
    this.declaredReasonCodeName,
    this.approvedReasonCodeName,
    this.evidenceAttachments = const [],
    required this.reasonSummary,
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
    this.contactPhone,
    this.contactEmail,
    this.transferReference,
    this.transferEvidence,
    this.transferNote,
    this.adminNote,
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
      declaredReasonCode: json['declaredReasonCode']?.toString(),
      approvedReasonCode: json['approvedReasonCode']?.toString(),
      declaredReasonName: json['declaredReasonName']?.toString(),
      approvedReasonName: json['approvedReasonName']?.toString(),
      declaredReasonCodeName: json['declaredReasonCodeName']?.toString(),
      approvedReasonCodeName: json['approvedReasonCodeName']?.toString(),
      evidenceAttachments: (json['evidenceAttachments'] is List)
          ? (json['evidenceAttachments'] as List)
              .map((e) => e.toString())
              .where((e) => e.isNotEmpty)
              .toList()
          : const [],
      reasonSummary: json['reasonSummary']?.toString() ?? '',
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
      contactPhone: json['contactPhone']?.toString(),
      contactEmail: json['contactEmail']?.toString(),
      transferReference: json['transferReference']?.toString(),
      transferEvidence: json['transferEvidence']?.toString(),
      transferNote: json['transferNote']?.toString(),
      adminNote: json['adminNote']?.toString(),
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
  bool get isProcessing =>
      status == 'REFUND_PROCESSING' || status == 'VNPAY_PROCESSING';
  bool get isManualTransferPending => status == 'MANUAL_TRANSFER_PENDING';
  bool get isFailed => status == 'FAILED';

  /// Đã gửi yêu cầu tới VNPay — đang chờ VNPay xác nhận kết quả hoàn tiền.
  bool get isVnPayProcessing => status == 'VNPAY_PROCESSING';

  /// Đang chờ quản trị viên chuyển khoản thủ công.
  bool get isAwaitingManualTransfer => status == 'MANUAL_TRANSFER_PENDING';

  /// Yêu cầu đang được xử lý (chưa có kết luận cuối cùng).
  ///
  /// ⚠️ Mỗi thời điểm chỉ có MỘT phương thức hoàn ⇒ trạng thái "đang xử lý" được
  /// tách theo phương thức: `VNPAY_PROCESSING` (chờ VNPay) và
  /// `MANUAL_TRANSFER_PENDING` (chờ quản trị viên chuyển khoản).
  bool get isInProgress =>
      status == 'PENDING_REVIEW' ||
      status == 'APPROVED' ||
      status == 'VNPAY_PROCESSING' ||
      status == 'MANUAL_TRANSFER_PENDING' ||
      status == 'REFUND_PROCESSING';

  /// Yêu cầu đã có kết quả cuối (không còn chờ xử lý).
  bool get isFinal =>
      isRefunded || isRejected || isFailed || status == 'CANCELLED';

  /// Yêu cầu đã được xử lý XONG về mặt tiền (đã hoàn hoặc bị từ chối).
  ///
  /// ⇒ Dùng để hiển thị nhãn "Đã xử lý hoàn tiền" trên danh sách đơn / chuyến đi.
  bool get isResolved => isRefunded || isRejected || isFailed || status == 'CANCELLED';

  String get statusLabel {
    switch (status) {
      case 'PENDING_REVIEW':
        return appL10n.refundStatusPendingReview;
      case 'APPROVED':
        return appL10n.refundStatusApproved;
      case 'VNPAY_PROCESSING':
        return appL10n.refundStatusVnpay;
      case 'REFUND_PROCESSING':
        return appL10n.refundStatusProcessing;
      case 'MANUAL_TRANSFER_PENDING':
        return appL10n.refundStatusManual;
      case 'REFUNDED':
        return appL10n.refundToneRefunded;
      case 'REJECTED':
        return appL10n.refundStatusRejected;
      case 'FAILED':
        return appL10n.refundStatusFailed;
      case 'CANCELLED':
        return appL10n.statusCancelled;
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

  /// Nhãn nhóm lý do khai báo — ưu tiên tên từ backend, không lộ mã kỹ thuật.
  String get declaredReasonLabel =>
      declaredReasonName ?? refundReasonLabel(declaredReason);

  /// Nhãn nhóm lý do do Admin xác định.
  String get approvedReasonLabel =>
      approvedReasonName ?? refundReasonLabel(approvedReason);

  /// Nhãn lý do cụ thể (tên tiếng Việt) do khách chọn.
  String? get declaredReasonCodeLabel => declaredReasonCodeName;

  /// Nhãn lý do cụ thể (tên tiếng Việt) do Admin xác định.
  String? get approvedReasonCodeLabel => approvedReasonCodeName;

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

  /// Tỷ lệ hoàn theo nhóm lý do đã được Admin xác định (0.5 / 1.0 / 0).
  double get refundRate {
    const rates = {
      'PERSONAL': 0.5,
      'PLATFORM_FAULT': 1.0,
      'PROVIDER_FAULT': 1.0,
      'FORCE_MAJEURE': 0.0,
      'TOURIST_FAULT': 0.5,
    };
    final reason = approvedReason ?? declaredReason;
    if (reason == null) return 0;
    return rates[reason] ?? 0;
  }

  /// Tỷ lệ hoàn hiển thị dạng phần trăm (VD: 50).
  int get refundRatePercent => (refundRate * 100).round();
}

/// Tóm tắt trạng thái hoàn tiền của một đơn (từ nhiều yêu cầu).
///
/// ── Vì sao cần lớp này? ──
/// Một đơn đặt tour có thể có nhiều giao dịch thanh toán ⇒ nhiều yêu cầu hoàn
/// tiền. App cần MỘT nhãn duy nhất để hiển thị trên danh sách đơn / chuyến đi:
///  • `processing` — đang trong quá trình hoàn tiền
///  • `resolved`  — đã xử lý xong (đã hoàn / bị từ chối / lỗi)
///  • `none`      — chưa có yêu cầu hoàn tiền nào
enum RefundSummaryState { none, processing, resolved }

/// Gộp nhiều yêu cầu hoàn tiền của một đơn thành MỘT trạng thái hiển thị.
///
/// ⚠️ Ưu tiên "đang xử lý" hơn "đã xử lý" — nếu còn yêu cầu nào đang bay thì đơn
/// vẫn đang trong quá trình hoàn tiền.
RefundSummaryState summarizeRefundState(List<RefundModel> refunds) {
  if (refunds.isEmpty) return RefundSummaryState.none;
  if (refunds.any((r) => r.isInProgress)) return RefundSummaryState.processing;
  if (refunds.any((r) => r.isResolved)) return RefundSummaryState.resolved;
  return RefundSummaryState.none;
}

/// Chỉ mục tra cứu trạng thái hoàn tiền theo `bookingId`.
///
/// ── Vì sao cần? ──
/// Màn "Đơn đặt tour" và màn "Chuyến đi" đều cần biết mỗi đơn đang/có hoàn
/// tiền hay không. Gọi 1 endpoint `GET /refunds/my` rồi gom theo `bookingId`
/// ⇒ không N+1 request.
class RefundStateIndex {
  final Map<int, List<RefundModel>> _byBooking;

  const RefundStateIndex(this._byBooking);

  /// Gom danh sách yêu cầu hoàn tiền thành chỉ mục theo booking.
  factory RefundStateIndex.fromRefunds(List<RefundModel> refunds) {
    final map = <int, List<RefundModel>>{};
    for (final r in refunds) {
      final bookingId = r.bookingId;
      if (bookingId == null) continue;
      map.putIfAbsent(bookingId, () => <RefundModel>[]).add(r);
    }
    return RefundStateIndex(map);
  }

  /// Danh sách yêu cầu hoàn tiền của một đơn (rỗng nếu không có).
  List<RefundModel> forBooking(int? bookingId) {
    if (bookingId == null) return const [];
    return _byBooking[bookingId] ?? const [];
  }

  /// Trạng thái hiển thị của một đơn.
  RefundSummaryState stateFor(int? bookingId) =>
      summarizeRefundState(forBooking(bookingId));

  /// Đơn đang trong quá trình hoàn tiền.
  bool isRefunding(int? bookingId) =>
      stateFor(bookingId) == RefundSummaryState.processing;

  /// Đơn đã xử lý hoàn tiền xong.
  bool isRefundResolved(int? bookingId) =>
      stateFor(bookingId) == RefundSummaryState.resolved;

  /// Đơn CÓ dính vào hoàn tiền (đang xử lý HOẶC đã xử lý xong).
  ///
  /// ⚠️ Dùng cho các màn chỉ hiển thị tour "còn hiệu lực" (đã thanh toán và có
  /// thể trải nghiệm) — đơn đang hoàn tiền hoặc đã hoàn xong thì không được
  /// coi là còn trải nghiệm được.
  bool hasRefund(int? bookingId) =>
      stateFor(bookingId) != RefundSummaryState.none;
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
