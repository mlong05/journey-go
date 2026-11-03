/// Service cho module Payment (VNPay) — Mobile.
///
/// ── Contract ──
///  • POST /payments/bookings/{bookingId}/init?bankCode=   → 201 PaymentInitResponse
///  • GET  /payments/methods                              → PaymentMethodResponse
///  • GET  /payments/{paymentId}                          → PaymentResponse
///  • GET  /payments/my                                   → `PageResponse<PaymentResponse>`
///  • GET  /payments/bookings/{bookingId}                 → `PageResponse<PaymentResponse>`
///  • POST /payments/{paymentId}/query                    → { outcome, message }
///
/// ── Luật nghiệp vụ ──
///  • Mỗi lần gọi `init` tạo một `txnRef` riêng, KHÔNG gia hạn deadline 10 phút.
///  • Trạng thái: PENDING / PROCESSING / SUCCESS / FAILED / CANCELLED / EXPIRED.
///    `PROCESSING` KHÔNG phải thất bại — tuyệt đối không hiển thị như lỗi.
///  • Nếu lần thử trước chưa rõ kết quả, backend trả 409 `PAYMENT_NOT_RETRYABLE` →
///    phải gọi `POST /payments/{id}/query` (QueryDR) rồi mới cho phép thử lại.
library;

import '../models/payment_model.dart';
import 'api_client.dart';

class PaymentService {
  static final PaymentService _instance = PaymentService._internal();
  factory PaymentService() => _instance;
  PaymentService._internal();

  static const String _endpoint = '/payments';

  /// Danh sách 3 nhóm phương thức thanh toán + danh sách ngân hàng từ VNPay.
  Future<PaymentMethodsModel> getPaymentMethods() async {
    final data = await ApiClient.request('GET', '$_endpoint/methods');
    return PaymentMethodsModel.fromJson(data as Map<String, dynamic>);
  }

  /// Khởi tạo thanh toán (hoặc thử lại).
  ///
  /// [bankCode] là mã `vnp_BankCode`; null = khách tự chọn trên trang VNPay.
  ///
  /// [appRedirect] = true ⇒ backend gắn `app_redirect=1` vào Return URL ⇒ sau khi
  /// thanh toán, trình duyệt chuyển hướng về app (deep link `journeygo://payment/return`)
  /// ⇒ app mở lại và hiện màn kết quả thành công.
  Future<PaymentInitModel> initiatePayment(
    int bookingId, {
    String? bankCode,
    bool appRedirect = true,
  }) async {
    final params = <String, String>{
      if (bankCode != null && bankCode.isNotEmpty)
        'bankCode': bankCode,
      if (appRedirect) 'appRedirect': 'true',
    };
    final query = params.isEmpty
        ? ''
        : '?${params.entries.map((e) => '${e.key}=${Uri.encodeComponent(e.value)}').join('&')}';
    final data = await ApiClient.request(
      'POST',
      '$_endpoint/bookings/$bookingId/init$query',
    );
    return PaymentInitModel.fromJson(data as Map<String, dynamic>);
  }

  /// Chi tiết một giao dịch thanh toán.
  Future<PaymentModel> getPaymentById(int paymentId) async {
    final data = await ApiClient.request('GET', '$_endpoint/$paymentId');
    return PaymentModel.fromJson(data as Map<String, dynamic>);
  }

  /// Lịch sử thanh toán của tôi.
  Future<List<PaymentModel>> getMyPayments({int page = 0, int size = 20}) async {
    final data = await ApiClient.request('GET', '$_endpoint/my?page=$page&size=$size');
    return ApiClient.asList(data).map(PaymentModel.fromJson).toList();
  }

  /// Các lần thử thanh toán của một booking.
  Future<List<PaymentModel>> getPaymentsByBooking(int bookingId,
      {int page = 0, int size = 20}) async {
    final data = await ApiClient.request(
      'GET',
      '$_endpoint/bookings/$bookingId?page=$page&size=$size',
    );
    return ApiClient.asList(data).map(PaymentModel.fromJson).toList();
  }

  /// Truy vấn trực tiếp kết quả giao dịch với VNPay (QueryDR).
  ///
  /// Dùng khi kết quả chưa rõ: timeout, callback đến muộn, hoặc sau 409
  /// `PAYMENT_NOT_RETRYABLE`. Không tự kết luận thất bại khi không xác minh được kết quả.
  Future<PaymentQueryResult> queryPayment(int paymentId) async {
    final data = await ApiClient.request('POST', '$_endpoint/$paymentId/query');
    return PaymentQueryResult.fromJson(data as Map<String, dynamic>);
  }

  /// Gửi lại kết quả thanh toán ĐÃ KÝ (nhận được qua deep link) lên backend.
  ///
  /// ── Vì sao cần? ──
  /// Khi `vnp_ReturnUrl` là custom scheme, VNPay chuyển hướng trình duyệt thẳng về
  /// app kèm toàn bộ tham số kết quả đã ký (`vnp_ResponseCode`, `vnp_TransactionStatus`,
  /// `vnp_SecureHash`…). Gửi lại các tham số đó cho backend ⇒ backend kiểm tra chữ ký
  /// rồi áp dụng kết quả ⇒ khách thấy "thanh toán thành công" NGAY, không cần
  /// máy chủ trung gian (ngrok) còn sống, và không phụ thuộc lệnh `querydr`.
  ///
  /// [params] là toàn bộ query parameters của deep link.
  Future<PaymentReturnResult> submitReturnResult(Map<String, String> params) async {
    final query = params.entries
        .map((e) => '${Uri.encodeComponent(e.key)}=${Uri.encodeComponent(e.value)}')
        .join('&');
    final data = await ApiClient.request(
      'POST',
      '$_endpoint/return-result?$query',
      // Endpoint public (không JWT) — deep link có thể mở app khi chưa đăng nhập.
      auth: false,
    );
    return PaymentReturnResult.fromJson(data as Map<String, dynamic>);
  }
}
