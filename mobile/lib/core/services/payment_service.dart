import '../models/booking_model.dart';
import 'api_client.dart';

/// Gọi API thanh toán VNPay: /payments. Không gọi /payments/ipn (webhook của VNPay).
class PaymentService {
  static final PaymentService _instance = PaymentService._internal();
  factory PaymentService() => _instance;
  PaymentService._internal();

  /// GET /payments/methods
  Future<List<PaymentMethodModel>> getMethods() async {
    final data = await ApiClient.request('GET', '/payments/methods');
    final raw = data is Map ? data['methods'] : null;
    final list = raw is List ? raw.whereType<Map<String, dynamic>>() : const <Map<String, dynamic>>[];
    return list.map(PaymentMethodModel.fromJson).toList()
      ..sort((a, b) => a.displayOrder.compareTo(b.displayOrder));
  }

  /// POST /payments/bookings/{id}/init. Trả về URL đã ký, mở nguyên vẹn không chỉnh sửa.
  /// Nếu lần thử trước chưa rõ kết quả, backend trả 409: người gọi nên [query] chứ không báo lỗi.
  Future<PaymentInitModel> init(int bookingId, {String? bankCode}) async {
    final query = (bankCode == null || bankCode.isEmpty)
        ? ''
        : '?bankCode=${Uri.encodeQueryComponent(bankCode)}';
    final data = await ApiClient.request('POST', '/payments/bookings/$bookingId/init$query');
    if (data is! Map<String, dynamic>) {
      throw const ApiException('Máy chủ trả về dữ liệu thanh toán không hợp lệ.');
    }
    return PaymentInitModel.fromJson(data);
  }

  /// GET /payments/bookings/{bookingId}
  Future<List<PaymentModel>> getByBooking(int bookingId, {int size = 20}) async {
    final data = await ApiClient.request('GET', '/payments/bookings/$bookingId?page=0&size=$size');
    return ApiClient.asList(data).map(PaymentModel.fromJson).toList();
  }

  /// GET /payments/my
  Future<List<PaymentModel>> getMine({int page = 0, int size = 50}) async {
    final data = await ApiClient.request('GET', '/payments/my?page=$page&size=$size');
    return ApiClient.asList(data).map(PaymentModel.fromJson).toList();
  }

  /// POST /payments/{id}/query (QueryDR). Trả về outcome:
  /// SUCCESS / FAILED / CANCELLED / DUPLICATE / UNKNOWN. UNKNOWN là "chưa rõ", không phải thất bại.
  Future<String> query(int paymentId) async {
    final data = await ApiClient.request('POST', '/payments/$paymentId/query');
    return data is Map ? (data['outcome']?.toString() ?? 'UNKNOWN') : 'UNKNOWN';
  }
}
