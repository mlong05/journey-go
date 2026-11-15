/// Service lấy cấu hình lý do hoàn tiền (Mobile).
///
/// ── Contract ──
///  • GET /refund-reason-groups → danh sách nhóm lý do + mã lý do chi tiết (đang bật)
///
/// ── Luật nghiệp vụ ──
///  • Danh sách lý do do Admin cấu hình trong Admin Dashboard — KHÔNG hardcode.
///  • Màn hình gửi yêu cầu hoàn tiền hiển thị theo nhóm, mỗi nhóm có các mã lý do.
library;

import '../models/refund_reason_model.dart';
import 'api_client.dart';

class RefundReasonConfigService {
  static final RefundReasonConfigService _instance =
      RefundReasonConfigService._internal();
  factory RefundReasonConfigService() => _instance;
  RefundReasonConfigService._internal();

  static const String _endpoint = '/refund-reason-groups';

  /// Danh sách nhóm lý do + mã lý do chi tiết đang bật.
  Future<List<RefundReasonGroupModel>> getActiveGroups() async {
    final data = await ApiClient.request('GET', _endpoint);
    if (data is! List) return const [];
    return data
        .whereType<Map<String, dynamic>>()
        .map(RefundReasonGroupModel.fromJson)
        .toList();
  }
}
