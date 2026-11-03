/// Điều phối luồng thanh toán VNPay trên Mobile.
///
/// ── Vì sao phải mở trình duyệt NGOÀI? ──
///  VNPay chặn iframe, nên Mobile KHÔNG thể hiển thị trang thanh toán trong app.
///  Ta dùng `url_launcher` với `LaunchMode.externalApplication` để mở trình duyệt hệ thống,
///  sau đó poll trạng thái giao dịch trong nền cho tới khi có kết quả cuối.
///
/// ── Vì sao app quay lại được trạng thái thanh toán? ──
///  VNPay redirect về `vnp_ReturnUrl` (trang web merchant) TRONG TRÌNH DUYỆT — app KHÔNG
///  nhận được redirect đó. Ba lớp phục hồi:
///   1. Poll `GET /payments/{id}` mỗi 2.5s (khi màn Payment còn trong bộ nhớ).
///   2. `AppLifecycleState.resumed` → gọi `POST /payments/{id}/query` (QueryDR) để xác minh.
///   3. `TokenStorage` nhớ `paymentId` → app bị hệ điều kill vẫn tra được khi mở lại
///      (xem `PendingPaymentGuard`).
///
/// ── Vì sao polling thay vì deep link? ──
///  Deep link (app_links) đòi hỏi cấu hình domain + file `assetlinks.json`/`apple-app-site-association`
///  chưa có trong dự án. Polling ổn định hơn cho MVP: VNPay IPN vẫn cập nhật server,
///  mobile poll `GET /payments/{id}` sẽ thấy `SUCCESS`.
///
/// ── Nhịp poll ──
///  2.5 giây / lần. Dừng khi: trạng thái cuối (SUCCESS/FAILED/CANCELLED), hết hạn
///  thanh toán, hoặc người dùng hủy. Ngoài ra poll lại ngay khi app quay lại foreground
///  (`AppLifecycleState.resumed`) vì app có thể bị hệ thống kill khi người dùng ở trình duyệt.
library;

import 'dart:async';

import 'package:flutter/widgets.dart';
import 'package:url_launcher/url_launcher.dart';

import '../models/payment_model.dart';
import 'payment_service.dart';

/// Kết quả theo dõi thanh toán.
class PaymentWatchResult {
  /// Trạng thái cuối của giao dịch (nếu đã có kết quả).
  final PaymentModel? payment;

  /// Đã xác minh thành công.
  final bool isSuccess;

  /// Đã có kết quả cuối (thành công / thất bại / đã hủy) — dừng poll.
  final bool isFinal;

  /// Đã hết thời hạn thanh toán của booking.
  final bool isDeadlineExceeded;

  /// Thông điệp (tiếng Việt từ backend nếu có).
  final String? message;

  const PaymentWatchResult({
    this.payment,
    this.isSuccess = false,
    this.isFinal = false,
    this.isDeadlineExceeded = false,
    this.message,
  });
}

/// Bộ theo dõi trạng thái thanh toán bằng polling.
class PaymentLauncher {
  static final PaymentLauncher _instance = PaymentLauncher._internal();
  factory PaymentLauncher() => _instance;
  PaymentLauncher._internal();

  static const Duration pollInterval = Duration(milliseconds: 2500);

  /// Mở trang thanh toán VNPay bằng trình duyệt ngoài.
  ///
  /// Trả về `false` nếu không mở được (không có trình duyệt, URL không hợp lệ…).
  Future<bool> openPaymentUrl(String? paymentUrl) async {
    if (paymentUrl == null || paymentUrl.trim().isEmpty) return false;
    final uri = Uri.tryParse(paymentUrl.trim());
    if (uri == null || !uri.hasScheme) return false;

    try {
      return await launchUrl(
        uri,
        mode: LaunchMode.externalApplication,
      );
    } catch (_) {
      return false;
    }
  }

  /// Poll trạng thái giao dịch cho tới khi có kết quả cuối.
  ///
  /// [onTick] được gọi sau mỗi lần poll (dùng để cập nhật UI đếm ngược).
  /// [deadline] là mốc hết hạn thanh toán của booking (ISO-8601). Khi vượt mốc này thì
  /// dừng poll và báo `isDeadlineExceeded`.
  Future<PaymentWatchResult> watchPaymentStatus(
    int paymentId, {
    String? deadline,
    void Function(PaymentModel? payment)? onTick,
  }) async {
    final service = PaymentService();
    final deadlineAt = deadline == null ? null : DateTime.tryParse(deadline)?.toLocal();

    while (true) {
      // Kiểm tra hạn thanh toán TRƯỚC khi gọi API.
      if (deadlineAt != null && DateTime.now().isAfter(deadlineAt)) {
        return PaymentWatchResult(
          isDeadlineExceeded: true,
          message: 'Đã hết thời hạn thanh toán.',
        );
      }

      PaymentModel? payment;
      try {
        payment = await service.getPaymentById(paymentId);
      } catch (_) {
        // Lỗi mạng tạm thời: chờ rồi thử lại, không kết luận thất bại.
        onTick?.call(null);
        await Future.delayed(pollInterval);
        continue;
      }

      onTick?.call(payment);

      if (payment.isSuccess) {
        return PaymentWatchResult(
          payment: payment,
          isSuccess: true,
          isFinal: true,
          message: payment.vnpMessage,
        );
      }

      if (payment.isFailed || payment.isCancelled) {
        return PaymentWatchResult(
          payment: payment,
          isFinal: true,
          message: payment.vnpMessage,
        );
      }

      // PENDING / PROCESSING → đang xử lý, KHÔNG phải lỗi. Tiếp tục poll.
      await Future.delayed(pollInterval);
    }
  }

  /// Truy vấn trực tiếp kết quả giao dịch với VNPay (QueryDR).
  ///
  /// Dùng khi backend trả 409 `PAYMENT_NOT_RETRYABLE` — lần thử trước chưa rõ kết quả,
  /// phải xác minh trước khi cho phép thử lại.
  Future<PaymentQueryResult> queryPayment(int paymentId) async {
    return PaymentService().queryPayment(paymentId);
  }
}

/// Giám sát vòng đời app — gọi callback khi app quay lại foreground.
///
/// Lý do: khi người dùng đang ở trình duyệt VNPay, hệ thống có thể kill app.
/// Khi app được mở lại, ta cần gọi lại API để lấy trạng thái giao dịch mới nhất.
///
/// `WidgetsBindingObserver` là abstract class ⇒ phải subclass, không instantiate trực tiếp.
class PaymentLifecycleWatcher extends WidgetsBindingObserver {
  /// Được gọi khi app chuyển sang `AppLifecycleState.resumed`.
  final void Function() onResumed;

  PaymentLifecycleWatcher({required this.onResumed});

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    super.didChangeAppLifecycleState(state);
    if (state == AppLifecycleState.resumed) {
      onResumed();
    }
  }
}
