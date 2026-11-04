/// Vỏ bọc toàn app — giám sát giao dịch thanh toán đang chờ.
///
/// ── Vì sao cần? ──
///  Khi khách chuyển sang trình duyệt VNPay để thanh toán, hệ điều hành có thể
///  KILL app. Lúc quay lại app, màn `PaymentScreen` đã mất khỏi bộ nhớ ⇒ app
///  không biết giao dịch nào cần tra cứu.
///
///  ⇒ `TokenStorage` nhớ lại giao dịch đang chờ, và `PendingPaymentGuard` tra
///    lại mỗi khi app quay lại foreground / vừa khởi động. Nếu giao dịch đã
///    thành công → hiện thông báo và đưa khách tới chi tiết đơn.
///
/// ── Quy tắc ──
///  • Giao dịch chưa có kết quả (PENDING/PROCESSING) → im lặng, KHÔNG báo lỗi.
///  • Giao dịch thất bại/hủy → thông báo nhẹ, KHÔNG chặn app.
library;

import 'dart:async';

import 'package:flutter/material.dart';

import '../../core/services/payment_result_service.dart';
import '../../core/services/pending_payment_guard.dart';
import '../../core/services/token_storage.dart';
import '../booking/booking_detail_screen.dart';
import 'payment_success_dialog.dart';

class PendingPaymentHost extends StatefulWidget {
  final Widget child;

  const PendingPaymentHost({super.key, required this.child});

  @override
  State<PendingPaymentHost> createState() => _PendingPaymentHostState();
}

class _PendingPaymentHostState extends State<PendingPaymentHost> {
  /// Đã hiện thông báo cho giao dịch nào — tránh bật lặp.
  final Set<int> _notified = <int>{};

  /// Trung tâm xử lý kết quả thanh toán (chủ sở hữu DUY NHẤT của luồng deep link).
  final PaymentResultService _results = PaymentResultService();
  StreamSubscription<PaymentResultEvent>? _resultSub;

  @override
  void initState() {
    super.initState();
    _initResults();
  }

  @override
  void dispose() {
    _resultSub?.cancel();
    super.dispose();
  }

  /// Lắng nghe kết quả thanh toán đã được [PaymentResultService] xác minh.
  ///
  /// ⚠️ KHÔNG tự lắng nghe `PaymentDeepLinkService` ở đây — deep link sẽ bị xử lý
  /// 2 lần (màn này + `PaymentScreen`) ⇒ 2 request trùng lặp và 2 hộp thoại.
  Future<void> _initResults() async {
    await _results.init();
    _resultSub = _results.results.listen(_handleResult);
  }

  /// Xử lý kết quả thanh toán đã xác minh.
  Future<void> _handleResult(PaymentResultEvent event) async {
    if (!mounted) return;

    if (event.needsSync) {
      // Deep link không có chữ ký (hoặc gửi lên backend lỗi) ⇒ để
      // `PendingPaymentGuard` tra cứu (polling + QueryDR).
      _triggerRecheck();
      return;
    }

    if (!event.isFinal || event.bookingId == null) return;

    await TokenStorage.clearPendingPayment(event.bookingId!);
    if (!mounted) return;

    if (event.isSuccess) {
      await _handleCompleted(event.bookingId!);
      return;
    }
    _handleFailed(event.bookingId!, event.message);
  }

  /// Kích hoạt lại vòng kiểm tra giao dịch đang chờ.
  void _triggerRecheck() {
    // `PendingPaymentGuard` tự tra khi app resume; deep link chỉ cần ép 1 lần.
    final state = _pendingGuardKey.currentState;
    if (state == null) {
      // Guard chưa sẵn sàng ⇒ thử lại ở frame sau.
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        _pendingGuardKey.currentState?.recheck();
      });
      return;
    }
    state.recheck();
  }

  final GlobalKey<PendingPaymentGuardState> _pendingGuardKey =
      GlobalKey<PendingPaymentGuardState>();

  @override
  Widget build(BuildContext context) {
    return PendingPaymentGuard(
      key: _pendingGuardKey,
      onPaymentCompleted: _handleCompleted,
      onPaymentFailed: _handleFailed,
      child: widget.child,
    );
  }

  /// Giao dịch đã thành công (thường là do app vừa mở lại).
  Future<void> _handleCompleted(int bookingId) async {
    if (!mounted || !_notified.add(bookingId)) return;

    // ⚠️ Nếu có màn hình trong-app đang mở (VD `PaymentScreen`) ⇒ màn đó hiện hộp
    // thoại (giàu thông tin hơn: mã đơn, số tiền) ⇒ host NHƯỜNG, không hiện trùng.
    if (_results.hasActiveHandler(bookingId)) return;

    // Chỉ MỘT nơi được quyền hiện hộp thoại cho booking này (tránh trùng khi
    // deep link VÀ polling cùng phát hiện thành công).
    if (!_results.claimDialog(bookingId)) return;

    await showPaymentSuccessDialog(
      context,
      onViewBooking: () {
        if (!mounted) return;
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => BookingDetailScreen(bookingId: bookingId),
          ),
        );
      },
    );
  }

  /// Giao dịch thất bại / bị hủy — chỉ thông báo nhẹ, không chặn app.
  void _handleFailed(int bookingId, String message) {
    if (!mounted || !_notified.add(bookingId)) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message.isEmpty ? 'Thanh toán chưa thành công.' : message),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }
}
