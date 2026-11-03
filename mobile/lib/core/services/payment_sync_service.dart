/// Đồng bộ trạng thái thanh toán VNPay khi app quay lại từ trình duyệt.
///
/// ── Bối cảnh ──
///  • VNPay redirect người dùng về `VNPAY_RETURN_URL` (trang web của merchant)
///    TRONG TRÌNH DUYỆT — app mobile KHÔNG tự mở được màn hình kết quả.
///  • Vì vậy app phải TỰ tra trạng thái qua API:
///    `GET /payments/{id}` (đọc trạng thái backend đã cập nhật từ IPN/Return),
///    và nếu chưa rõ thì `POST /payments/{id}/query` (QueryDR) để xác minh trực tiếp.
///
/// ── Vì sao cần "pending payment" trong storage? ──
///  Khi người dùng ở trình duyệt, hệ điều có thể KILL app. Lúc quay lại app,
///  màn `PaymentScreen` có thể không còn trong bộ nhớ ⇒ không biết `paymentId`
///  để tra cứu. Vì vậy ta lưu `paymentId` ở `shared_preferences` ngay khi khởi tạo
///  giao dịch, và dọn đi khi đã có kết quả cuối.
///
/// ── Luật nghiệp vụ ──
///  • `PENDING` / `PROCESSING` là ĐANG XỬ LÝ — KHÔNG phải lỗi, tuyệt đối không
///    hiển thị như thất bại.
///  • Chỉ khi backend trả kết quả CUỐI mới dừng.
///  • `QUERY` (QueryDR) là hành động TẦN SUẤT CAO → cache kết quả trong 1 phút
///    để tránh spam VNPay (mỗi lần gọi là 1 HTTP request tới VNPay).
library;

import '../models/payment_model.dart';
import 'api_client.dart';
import 'payment_service.dart';
import 'token_storage.dart';

/// Kết quả đồng bộ trạng thái thanh toán.
class PaymentSyncResult {
  /// Giao dịch sau khi đồng bộ (null nếu không lấy được).
  final PaymentModel? payment;

  /// Đã xác minh thành công.
  final bool isSuccess;

  /// Đã có kết quả cuối (thành công / thất bại / đã hủy).
  final bool isFinal;

  /// Giao dịch trùng — booking đã được thanh toán bởi giao dịch khác.
  final bool isDuplicate;

  /// Thông điệp tiếng Việt để hiển thị cho người dùng.
  final String message;

  const PaymentSyncResult({
    this.payment,
    this.isSuccess = false,
    this.isFinal = false,
    this.isDuplicate = false,
    this.message = '',
  });

  /// Không xác minh được kết quả (mạng lỗi / VNPay chưa trả lời).
  ///
  /// KHÔNG đồng nghĩa với thất bại — khách vẫn có thể thanh toán lại.
  bool get isUnknown => !isFinal;
}

/// Service đồng bộ trạng thái thanh toán.
class PaymentSyncService {
  static final PaymentSyncService _instance = PaymentSyncService._internal();
  factory PaymentSyncService() => _instance;
  PaymentSyncService._internal();

  final PaymentService _paymentService = PaymentService();

  /// Khoá cache QueryDR: paymentId → thời điểm gọi gần nhất.
  static final Map<int, DateTime> _queryCache = {};

  /// Hạn cache QueryDR — 60 giây.
  static const Duration _queryCacheTtl = Duration(seconds: 60);

  /// Tra trạng thái giao dịch; nếu chưa rõ thì gọi QueryDR một lần.
  ///
  /// [allowQuery] = false ⇒ chỉ đọc trạng thái backend (không gọi VNPay).
  Future<PaymentSyncResult> sync(int paymentId, {bool allowQuery = true}) async {
    PaymentModel? payment;
    try {
      payment = await _paymentService.getPaymentById(paymentId);
    } on ApiException catch (e) {
      return PaymentSyncResult(message: e.message);
    } catch (_) {
      return const PaymentSyncResult(
        message: 'Không thể kiểm tra trạng thái thanh toán. Vui lòng thử lại.',
      );
    }

    if (payment.isSuccess) {
      return PaymentSyncResult(
        payment: payment,
        isSuccess: true,
        isFinal: true,
        message: 'Thanh toán thành công!',
      );
    }

    if (payment.isFailed || payment.isCancelled) {
      return PaymentSyncResult(
        payment: payment,
        isFinal: true,
        message: payment.vnpMessage?.isNotEmpty == true
            ? payment.vnpMessage!
            : 'Thanh toán không thành công. Bạn có thể thử lại.',
      );
    }

    // Vẫn đang xử lý (PENDING / PROCESSING) → hỏi trực tiếp VNPay (QueryDR).
    if (!allowQuery) {
      return PaymentSyncResult(
        payment: payment,
        message: 'Đang chờ kết quả thanh toán...',
      );
    }

    return _query(payment);
  }

  /// Gọi QueryDR để xác minh giao dịch với VNPay.
  Future<PaymentSyncResult> _query(PaymentModel payment) async {
    final paymentId = payment.id;
    final cachedAt = _queryCache[paymentId];
    final now = DateTime.now();
    if (cachedAt != null && now.difference(cachedAt) < _queryCacheTtl) {
      return PaymentSyncResult(
        payment: payment,
        message: 'Đang chờ kết quả thanh toán...',
      );
    }
    _queryCache[paymentId] = now;

    PaymentQueryResult result;
    try {
      result = await _paymentService.queryPayment(paymentId);
    } on ApiException catch (e) {
      return PaymentSyncResult(payment: payment, message: e.message);
    } catch (_) {
      return PaymentSyncResult(
        payment: payment,
        message: 'Đang chờ kết quả thanh toán...',
      );
    }

    switch (result.outcome) {
      case 'SUCCESS':
        // QueryDR đã xác minh thành công → đọc lại để lấy paidAt / bookingCode.
        try {
          final fresh = await _paymentService.getPaymentById(paymentId);
          return PaymentSyncResult(
            payment: fresh,
            isSuccess: true,
            isFinal: true,
            message: 'Thanh toán thành công!',
          );
        } catch (_) {
          return PaymentSyncResult(
            payment: payment,
            isSuccess: true,
            isFinal: true,
            message: 'Thanh toán thành công!',
          );
        }
      case 'FAILED':
        return PaymentSyncResult(
          payment: payment,
          isFinal: true,
          message: result.message.isNotEmpty
              ? result.message
              : 'Thanh toán không thành công. Bạn có thể thử lại.',
        );
      case 'CANCELLED':
        return PaymentSyncResult(
          payment: payment,
          isFinal: true,
          message: result.message.isNotEmpty
              ? result.message
              : 'Bạn đã hủy giao dịch thanh toán.',
        );
      case 'DUPLICATE':
        return PaymentSyncResult(
          payment: payment,
          isFinal: true,
          isDuplicate: true,
          message: result.message.isNotEmpty
              ? result.message
              : 'Giao dịch này đã được xử lý trước đó.',
        );
      default:
        // UNKNOWN — chưa xác minh được ⇒ KHÔNG kết luận thất bại.
        return PaymentSyncResult(
          payment: payment,
          message: 'Đang chờ kết quả thanh toán...',
        );
    }
  }

  /// Đồng bộ giao dịch đang chờ của một booking (dùng khi app vừa mở lại).
  ///
  /// Trả về `null` nếu booking không có giao dịch đang chờ nào được nhớ.
  Future<PaymentSyncResult?> syncPendingForBooking(int bookingId) async {
    final pending = await TokenStorage.getPendingPayment(bookingId);
    if (pending == null) return null;
    final paymentId = pending['paymentId'];
    if (paymentId is! int) return null;

    final result = await sync(paymentId);
    if (result.isFinal) {
      await TokenStorage.clearPendingPayment(bookingId);
    }
    return result;
  }
}
