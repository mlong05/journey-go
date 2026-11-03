/// Service cho module Refund (Hoàn tiền) — Mobile.
///
/// ── Contract ──
///  • POST /refunds            body: CreateRefundRequest → 201 RefundResponse
///  • GET  /refunds/my         (phân trang) → `PageResponse<RefundResponse>`
///  • GET  /refunds/{id}       → RefundResponse (kèm nhật ký kiểm toán)
///  • GET  /refunds/payments/{paymentId} → `PageResponse<RefundResponse>`
///  • GET  /refunds/code/{refundCode}
///
/// ── Luật nghiệp vụ ──
///  • Chỉ hoàn được khi Payment đã SUCCESS (đã xác minh) và trong vòng 24h từ `paidAt`.
///  • Số tiền do HỆ THỐNG tự tính theo nguyên nhân (50% lỗi khách / 100% lỗi nền tảng) —
///    Tourist KHÔNG tự nhập số tiền.
///  • Phương thức hoàn (`VNPAY_API` / `MANUAL_BANK_TRANSFER`) do ADMIN quyết ở bước review.
///    Vì vậy form của Tourist luôn thu thập số TK / tên chủ TK / ngân hàng để tránh lỗi
///    `REFUND_BANK_INFO_REQUIRED` khi Admin chọn chuyển khoản thủ công.
///  • Mỗi Payment chỉ có tối đa một yêu cầu đang xử lý hoặc đã hoàn tất.
library;

import '../models/refund_model.dart';
import 'api_client.dart';

class RefundService {
  static final RefundService _instance = RefundService._internal();
  factory RefundService() => _instance;
  RefundService._internal();

  static const String _endpoint = '/refunds';

  /// Gửi yêu cầu hoàn tiền.
  ///
  /// [reason] là `TOURIST_FAULT` (lý do cá nhân) hoặc `PLATFORM_FAULT` (lỗi nền tảng) —
  /// quyết định tỷ lệ hoàn 50%/100% mà HỆ THỐNG tính.
  Future<RefundModel> createRefund({
    required int paymentId,
    required String reason,
    required String reasonDetail,
    String? evidence,
    String? bankAccountNumber,
    String? bankAccountName,
    String? bankName,
  }) async {
    final data = await ApiClient.request(
      'POST',
      _endpoint,
      body: {
        'paymentId': paymentId,
        'reason': reason,
        'reasonDetail': reasonDetail,
        if (evidence != null && evidence.isNotEmpty) 'evidence': evidence,
        if (bankAccountNumber != null && bankAccountNumber.isNotEmpty)
          'bankAccountNumber': bankAccountNumber,
        if (bankAccountName != null && bankAccountName.isNotEmpty)
          'bankAccountName': bankAccountName,
        if (bankName != null && bankName.isNotEmpty) 'bankName': bankName,
      },
    );
    return RefundModel.fromJson(data as Map<String, dynamic>);
  }

  /// Danh sách yêu cầu hoàn tiền của tôi.
  Future<List<RefundModel>> getMyRefunds({int page = 0, int size = 20}) async {
    final data = await ApiClient.request('GET', '$_endpoint/my?page=$page&size=$size');
    return ApiClient.asList(data).map(RefundModel.fromJson).toList();
  }

  /// Danh sách yêu cầu hoàn tiền của tôi (alias theo kiểu gọi của màn lịch sử).
  Future<List<RefundModel>> getMine({int page = 0, int size = 50}) =>
      getMyRefunds(page: page, size: size);

  /// Metadata phân trang của `getMyRefunds`.
  Future<Map<String, dynamic>> getMyRefundsPage({int page = 0, int size = 20}) async {
    final data = await ApiClient.request('GET', '$_endpoint/my?page=$page&size=$size');
    return ApiClient.asPageMeta(data);
  }

  /// Chi tiết một yêu cầu hoàn tiền (kèm nhật ký kiểm toán).
  Future<RefundModel> getRefundById(int refundId) async {
    final data = await ApiClient.request('GET', '$_endpoint/$refundId');
    return RefundModel.fromJson(data as Map<String, dynamic>);
  }

  /// Các yêu cầu hoàn tiền của một payment.
  Future<List<RefundModel>> getRefundsByPayment(int paymentId,
      {int page = 0, int size = 20}) async {
    final data = await ApiClient.request(
      'GET',
      '$_endpoint/payments/$paymentId?page=$page&size=$size',
    );
    return ApiClient.asList(data).map(RefundModel.fromJson).toList();
  }

  /// Tra cứu yêu cầu hoàn tiền theo mã.
  Future<RefundModel> getRefundByCode(String refundCode) async {
    final data = await ApiClient.request(
      'GET',
      '$_endpoint/code/${Uri.encodeComponent(refundCode)}',
    );
    return RefundModel.fromJson(data as Map<String, dynamic>);
  }
}
