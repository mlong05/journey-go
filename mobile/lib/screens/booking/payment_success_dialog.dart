/// Hộp thoại "Thanh toán thành công" — dùng chung cho MỌI nơi xử lý thanh toán.
///
/// ── Vì sao cần tách ra? ──
/// Trước đây có 3 bản gần như giống nhau (PaymentScreen, PendingPaymentHost,
/// BookingCheckoutScreen) ⇒ dễ lệch nhau và dễ hiện TRÙNG hộp thoại.
///
/// ⇒ Một widget duy nhất + cơ chế "claim" trong [PaymentResultService]
/// ⇒ mỗi booking chỉ hiện đúng MỘT hộp thoại thành công.
library;

import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';
import '../../core/utils/formatters.dart';

/// Hiện hộp thoại thành công.
///
/// [bookingCode] / [amount] là thông tin hiển thị (có thể null).
/// [onViewBooking] — hành động khi khách bấm "Xem đơn của tôi" (thường là
/// điều hướng tới `BookingDetailScreen`).
Future<void> showPaymentSuccessDialog(
  BuildContext context, {
  String? bookingCode,
  num? amount,
  VoidCallback? onViewBooking,
}) {
  return showDialog<void>(
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
          Text(
            _buildDetail(bookingCode, amount),
            textAlign: TextAlign.center,
            style: const TextStyle(
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
                onViewBooking?.call();
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

/// Dựng phần mô tả (mã đơn + số tiền) — bỏ trống phần không có.
String _buildDetail(String? bookingCode, num? amount) {
  final parts = <String>[];
  if (bookingCode != null && bookingCode.isNotEmpty) {
    parts.add('Mã đơn: $bookingCode');
  }
  if (amount != null && amount > 0) {
    parts.add('Số tiền: ${formatVndAmount(amount)}');
  }
  if (parts.isEmpty) {
    return 'Giao dịch của bạn đã được xác nhận thành công.';
  }
  return '${parts.join('\n')}\nGiao dịch của bạn đã được xác nhận thành công.';
}
