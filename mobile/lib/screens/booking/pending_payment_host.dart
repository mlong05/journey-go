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

import '../../core/constants/app_colors.dart';
import '../../core/services/payment_deep_link_service.dart';
import '../../core/services/payment_service.dart';
import '../../core/services/pending_payment_guard.dart';
import '../../core/services/token_storage.dart';
import '../booking/booking_detail_screen.dart';

class PendingPaymentHost extends StatefulWidget {
  final Widget child;

  const PendingPaymentHost({super.key, required this.child});

  @override
  State<PendingPaymentHost> createState() => _PendingPaymentHostState();
}

class _PendingPaymentHostState extends State<PendingPaymentHost> {
  /// Đã hiện thông báo cho giao dịch nào — tránh bật lặp.
  final Set<int> _notified = <int>{};

  final PaymentDeepLinkService _deepLinks = PaymentDeepLinkService();
  StreamSubscription<PaymentDeepLink>? _deepLinkSub;

  @override
  void initState() {
    super.initState();
    _initDeepLinks();
  }

  @override
  void dispose() {
    _deepLinkSub?.cancel();
    super.dispose();
  }

  /// Lắng nghe deep link `journeygo://payment/return` — app được mở lại từ
  /// trình duyệt sau khi VNPay trả kết quả.
  Future<void> _initDeepLinks() async {
    await _deepLinks.init();
    _deepLinkSub = _deepLinks.links.listen(_handleDeepLink);
  }

  /// Xử lý deep link thanh toán: áp dụng kết quả đã ký rồi báo cho người dùng.
  ///
  /// ── Luồng ──
  /// Khi `vnp_ReturnUrl` là custom scheme, VNPay gửi kèm TOÀN BỘ tham số kết quả
  /// ĐÃ KÝ. Ta gửi lại backend (`POST /payments/return-result`) ⇒ backend kiểm tra
  /// chữ ký rồi áp dụng ⇒ không cần máy chủ trung gian (ngrok) còn sống.
  ///
  /// Nếu deep link KHÔNG có chữ ký (VD fallback qua trang web) ⇒ fallback sang
  /// đường polling + QueryDR (xem `PendingPaymentGuard`).
  Future<void> _handleDeepLink(PaymentDeepLink link) async {
    if (!mounted) return;

    if (link.hasSignature) {
      final handled = await _submitSignedResult(link);
      if (handled) return;
    }

    // Deep link có thể đến TRƯỚC khi `PendingPaymentGuard` kịp mount (app vừa được
    // mở lại bởi deep link) ⇒ ép kiểm tra ở frame kế tiếp.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      _pendingGuardKey.currentState?.recheck();
    });

    // Kèm theo: `PendingPaymentGuard` tự tra khi app resume / khởi động.
    // Ở đây chỉ cần kích hoạt lại vòng kiểm tra khi có deep link.
    _triggerRecheck();
  }

  /// Gửi kết quả đã ký lên backend và xử lý kết quả trả về.
  ///
  /// Trả về `true` nếu backend đã áp dụng kết quả (thành công hoặc thất bại rõ ràng).
  /// Trả về `false` nếu backend chưa xác minh được ⇒ fallback sang polling.
  Future<bool> _submitSignedResult(PaymentDeepLink link) async {
    try {
      final result = await PaymentService().submitReturnResult(link.params);
      if (!mounted) return false;

      if (result.isSuccess && result.bookingId != null) {
        await TokenStorage.clearPendingPayment(result.bookingId!);
        if (!mounted) return true;
        await _handleCompleted(result.bookingId!);
        return true;
      }

      if (result.isFinal && result.bookingId != null) {
        await TokenStorage.clearPendingPayment(result.bookingId!);
        if (!mounted) return true;
        _handleFailed(result.bookingId!, result.message);
        return true;
      }
      return false;
    } catch (_) {
      // Gửi lên backend thất bại ⇒ fallback sang polling + QueryDR.
      return false;
    }
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

    await showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        contentPadding: const EdgeInsets.all(24),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 68,
              height: 68,
              decoration: const BoxDecoration(
                color: AppCultureColors.jadeLight,
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.check_circle_rounded,
                color: AppCultureColors.heritageJade,
                size: 42,
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'Thanh toán thành công',
              style: TextStyle(
                fontSize: 19,
                fontWeight: FontWeight.w800,
                color: AppCultureColors.textDark,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Giao dịch của bạn đã được xác nhận thành công.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 13,
                color: AppCultureColors.textMuted,
                height: 1.4,
              ),
            ),
            const SizedBox(height: 22),
            SizedBox(
              width: double.infinity,
              height: 46,
              child: ElevatedButton(
                onPressed: () {
                  Navigator.of(ctx).pop();
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => BookingDetailScreen(bookingId: bookingId),
                    ),
                  );
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppCultureColors.heritageJade,
                  foregroundColor: Colors.white,
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
                child: const Text(
                  'Xem đơn của tôi',
                  style: TextStyle(fontWeight: FontWeight.w700),
                ),
              ),
            ),
          ],
        ),
      ),
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
