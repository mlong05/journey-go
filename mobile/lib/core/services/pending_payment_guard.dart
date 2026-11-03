/// Bảo vệ giao dịch thanh toán đang chờ — tự phát hiện kết quả khi app mở lại.
///
/// ── Vì sao cần? ──
///  Khi khách chuyển sang trình duyệt VNPay, hệ điều có thể KILL app.
///  Lúc đó màn `PaymentScreen` không còn trong bộ nhớ. Nếu chỉ dựa vào polling
///  trong màn hình ⇒ mở lại app sẽ không thấy trạng thái thanh toán.
///
///  ⇒ Ta nhớ `paymentId` vào `shared_preferences` khi khởi tạo giao dịch
///    (`TokenStorage.savePendingPayment`), và widget này kiểm tra lại mỗi khi
///    app quay lại foreground / vừa khởi động.
///
/// ── Hành vi ──
///  • Giao dịch đã `SUCCESS` → xoá khỏi storage + báo cho người dùng qua
///    `onPaymentCompleted` (điều hướng tới chi tiết đơn).
///  • Giao dịch thất bại / đã hủy → xoá khỏi storage + báo `onPaymentFailed`.
///  • Vẫn đang xử lý → GIỮ nguyên trong storage, im lặng (không báo lỗi).
library;

import 'dart:async';

import 'package:flutter/material.dart';

import 'payment_sync_service.dart';
import 'token_storage.dart';

class PendingPaymentGuard extends StatefulWidget {
  final Widget child;

  /// Gọi khi phát hiện giao dịch ĐÃ THÀNH CÔNG.
  final void Function(int bookingId)? onPaymentCompleted;

  /// Gọi khi phát hiện giao dịch thất bại / đã hủy.
  final void Function(int bookingId, String message)? onPaymentFailed;

  const PendingPaymentGuard({
    super.key,
    required this.child,
    this.onPaymentCompleted,
    this.onPaymentFailed,
  });

  @override
  State<PendingPaymentGuard> createState() => PendingPaymentGuardState();
}

class PendingPaymentGuardState extends State<PendingPaymentGuard>
    with WidgetsBindingObserver {
  final PaymentSyncService _syncService = PaymentSyncService();

  bool _checking = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    // Kiểm tra lần đầu khi app vừa khởi động (sau khi app bị kill).
    WidgetsBinding.instance.addPostFrameCallback((_) => _checkPending());
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    super.didChangeAppLifecycleState(state);
    if (state == AppLifecycleState.resumed) {
      _checkPending();
    }
  }

  /// Ép kiểm tra lại giao dịch đang chờ (dùng khi nhận deep link).
  void recheck() => _checkPending();

  /// Tra cứu mọi giao dịch đang chờ đã lưu.
  Future<void> _checkPending() async {
    if (_checking) return;
    _checking = true;
    try {
      final bookings = await TokenStorage.getPendingPaymentBookings();
      for (final bookingId in bookings) {
        if (!mounted) return;
        final result = await _syncService.syncPendingForBooking(bookingId);
        if (result == null) continue;
        if (!mounted) return;

        if (result.isSuccess) {
          widget.onPaymentCompleted?.call(bookingId);
        } else if (result.isFinal) {
          widget.onPaymentFailed?.call(bookingId, result.message);
        }
      }
    } catch (_) {
      // Không xác minh được ⇒ im lặng, KHÔNG báo lỗi cho người dùng.
    } finally {
      _checking = false;
    }
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
