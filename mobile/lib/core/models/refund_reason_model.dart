/// Model cấu hình lý do hoàn tiền.
///
/// ── Quy ước ──
///  • Danh sách nhóm lý do + mã lý do do Admin cấu hình trong Admin Dashboard
///    (tab "Cấu hình lý do hoàn tiền") — KHÔNG hardcode trong app.
///  • `name` là tên tiếng Việt hiển thị cho khách; `code` là mã kỹ thuật.
library;

/// Nhóm lý do hoàn tiền (Lỗi khách hàng / Lỗi nền tảng / Lỗi đối tác /
/// Lỗi bất khả kháng).
class RefundReasonGroupModel {
  final int id;
  final String code;
  final String name;
  final double refundRate;
  final String description;
  final bool forceMajeure;
  final bool active;
  final List<RefundReasonCodeModel> reasonCodes;

  /// Số giờ trước ngày trải nghiệm mà nhóm này bị đưa xuống mức hoàn 0%.
  ///
  /// null = nhóm này không có mức hoàn 0% riêng (chỉ nhóm cá nhân có).
  final int? noShowWindowHours;

  /// Tỷ lệ hoàn trong cửa sổ no-show (thường 0 = 0%).
  final double? noShowRefundRate;

  const RefundReasonGroupModel({
    required this.id,
    required this.code,
    required this.name,
    required this.refundRate,
    required this.description,
    required this.forceMajeure,
    required this.active,
    required this.reasonCodes,
    this.noShowWindowHours,
    this.noShowRefundRate,
  });

  factory RefundReasonGroupModel.fromJson(Map<String, dynamic> json) {
    return RefundReasonGroupModel(
      id: _toInt(json['id']),
      code: json['code']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      refundRate: (json['refundRate'] as num?)?.toDouble() ?? 0,
      description: json['description']?.toString() ?? '',
      forceMajeure: json['forceMajeure'] == true,
      active: json['active'] != false,
      noShowWindowHours: json['noShowWindowHours'] == null
          ? null
          : _toInt(json['noShowWindowHours']),
      noShowRefundRate: (json['noShowRefundRate'] as num?)?.toDouble(),
      reasonCodes: (json['reasonCodes'] is List)
          ? (json['reasonCodes'] as List)
              .whereType<Map<String, dynamic>>()
              .map(RefundReasonCodeModel.fromJson)
              .toList()
          : const [],
    );
  }

  /// Tỷ lệ hoàn hiển thị dạng phần trăm (VD: 50).
  int get refundRatePercent => (refundRate * 100).round();

  /// Nhóm này có mức hoàn 0% riêng (hủy quá muộn / không xuất hiện) hay không.
  bool get hasNoShowTier => noShowWindowHours != null;

  /// Tỷ lệ hoàn trong cửa sổ no-show dạng phần trăm (thường 0).
  int get noShowRefundRatePercent =>
      ((noShowRefundRate ?? 0) * 100).round();

  /// Danh sách mã lý do đang bật — khách chỉ chọn được các mã này.
  List<RefundReasonCodeModel> get activeCodes =>
      reasonCodes.where((c) => c.active).toList();

  /// Nhóm này không hoàn tiền (bất khả kháng) hay không.
  bool get isZeroRefund => refundRate <= 0;
}

/// Mã lý do hoàn tiền chi tiết (VD: Bị bệnh hoặc gặp vấn đề sức khỏe).
class RefundReasonCodeModel {
  final int id;
  final String code;
  final String name;
  final String conditions;
  final bool requireEvidence;
  final bool active;
  final int displayOrder;

  const RefundReasonCodeModel({
    required this.id,
    required this.code,
    required this.name,
    required this.conditions,
    required this.requireEvidence,
    required this.active,
    required this.displayOrder,
  });

  factory RefundReasonCodeModel.fromJson(Map<String, dynamic> json) {
    return RefundReasonCodeModel(
      id: _toInt(json['id']),
      code: json['code']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      conditions: json['conditions']?.toString() ?? '',
      requireEvidence: json['requireEvidence'] == true,
      active: json['active'] != false,
      displayOrder: (json['displayOrder'] as num?)?.toInt() ?? 0,
    );
  }
}

int _toInt(dynamic v) {
  if (v is int) return v;
  if (v is num) return v.toInt();
  return int.tryParse(v?.toString() ?? '') ?? 0;
}
