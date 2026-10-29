// Yêu cầu hoàn tiền của du khách (khớp RefundResponse của /api/v1/refunds).

DateTime? _parseDate(dynamic value) {
  if (value == null) return null;
  return DateTime.tryParse(value.toString())?.toLocal();
}

double? _asDouble(dynamic value) {
  if (value == null) return null;
  if (value is num) return value.toDouble();
  return double.tryParse(value.toString());
}

class RefundModel {
  final int id;
  final String refundCode;
  final int? bookingId;
  final String status;
  final String reasonDetail;
  final double? proposedAmount;
  final double? approvedAmount;
  final double? refundedAmount;
  final String rejectionReason;
  final DateTime? createdAt;
  final DateTime? reviewedAt;

  const RefundModel({
    required this.id,
    required this.refundCode,
    required this.bookingId,
    required this.status,
    required this.reasonDetail,
    required this.proposedAmount,
    required this.approvedAmount,
    required this.refundedAmount,
    required this.rejectionReason,
    required this.createdAt,
    required this.reviewedAt,
  });

  factory RefundModel.fromJson(Map<String, dynamic> json) => RefundModel(
    id: (json['id'] as num?)?.toInt() ?? 0,
    refundCode: json['refundCode']?.toString() ?? '',
    bookingId: (json['bookingId'] as num?)?.toInt(),
    status: json['status']?.toString() ?? '',
    reasonDetail: json['reasonDetail']?.toString() ?? '',
    proposedAmount: _asDouble(json['proposedAmount']),
    approvedAmount: _asDouble(json['approvedAmount']),
    refundedAmount: _asDouble(json['refundedAmount']),
    rejectionReason: json['rejectionReason']?.toString() ?? '',
    createdAt: _parseDate(json['createdAt']),
    reviewedAt: _parseDate(json['reviewedAt']),
  );

  /// Đang chờ duyệt, đã duyệt chờ chuyển tiền hoặc đang hoàn qua VNPay.
  bool get isInProgress =>
      status == 'PENDING_REVIEW' ||
      status == 'APPROVED' ||
      status == 'REFUND_PROCESSING';

  /// Số tiền nên hiển thị theo giai đoạn: đã hoàn > đã duyệt > đề xuất.
  double? get displayAmount =>
      refundedAmount ?? approvedAmount ?? proposedAmount;

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
}
