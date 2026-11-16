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
///  • Chỉ hoàn được khi Payment đã SUCCESS (đã xác minh) và yêu cầu gửi TRƯỚC
///    ngày khởi hành (booking.experienceDate) — không có cửa sổ 24h từ `paidAt`.
///  • KHÁCH KHÔNG chọn nhóm lý do / mã lý do — chỉ mô tả bằng văn bản
///    (`reasonSummary` + `reasonDetail`). Việc phân loại nguyên nhân và tính số
///    tiền là quyết định của ADMIN khi duyệt (PERSONAL 50% trừ khi hủy trong
///    48h, PLATFORM_FAULT / PROVIDER_FAULT 100%, FORCE_MAJEURE 0%).
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
  /// Khách KHÔNG chọn nhóm lý do / mã lý do — chỉ mô tả bằng văn bản:
  ///  • [reasonSummary] — lý do ngắn gọn (VD: "Bị ốm đột xuất")
  ///  • [reasonDetail]  — mô tả chi tiết tình huống
  ///
  /// Việc phân loại vào nhóm lý do và mã lý do là quyết định của ADMIN khi duyệt.
  /// Số tiền do HỆ THỐNG tính theo nhóm lý do mà Admin xác định — khách KHÔNG
  /// nhập số tiền.
  Future<RefundModel> createRefund({
    required int paymentId,
    required String reasonSummary,
    required String reasonDetail,
    List<String> evidenceAttachments = const [],
    String? bankAccountNumber,
    String? bankAccountName,
    String? bankName,
    String? contactPhone,
    String? contactEmail,
  }) async {
    final data = await ApiClient.request(
      'POST',
      _endpoint,
      body: {
        'paymentId': paymentId,
        'reasonSummary': reasonSummary,
        'reasonDetail': reasonDetail,
        if (evidenceAttachments.isNotEmpty)
          'evidenceAttachments': evidenceAttachments,
        if (bankAccountNumber != null && bankAccountNumber.isNotEmpty)
          'bankAccountNumber': bankAccountNumber,
        if (bankAccountName != null && bankAccountName.isNotEmpty)
          'bankAccountName': bankAccountName,
        if (bankName != null && bankName.isNotEmpty) 'bankName': bankName,
        if (contactPhone != null && contactPhone.isNotEmpty)
          'contactPhone': contactPhone,
        if (contactEmail != null && contactEmail.isNotEmpty)
          'contactEmail': contactEmail,
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

  /// Tất cả yêu cầu hoàn tiền của một đơn đặt tour (gộp mọi payment của đơn).
  ///
  /// Kèm nhật ký kiểm toán đầy đủ, sắp xếp theo thời gian tăng dần (cũ nhất ở trên).
  Future<List<RefundModel>> getRefundsByBooking(int bookingId) async {
    final data = await ApiClient.request('GET', '$_endpoint/bookings/$bookingId');
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
