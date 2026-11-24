/// Đơn đang giữ chỗ (chờ thanh toán, còn hạn): thanh nhắc có đồng hồ đếm ngược + hộp thoại
/// "Tiếp tục thanh toán / Hủy đơn cũ và đặt lại".
///
/// Vì sao: thoát màn thanh toán KHÔNG hủy đơn — đơn vẫn giữ chỗ tới hết 10 phút. Trước đây bấm
/// "Đặt tour" lại tạo đơn thứ hai (đồng hồ như bị reset, giữ chỗ gấp đôi). Giờ backend chặn đơn
/// trùng cho cùng tour; app dùng các widget này để đưa khách về đúng đơn cũ.
library;

import 'dart:async';

import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';
import '../../core/models/booking_model.dart';
import 'booking_checkout_screen.dart';

/// Lựa chọn của khách khi bấm "Đặt tour" mà đang có đơn giữ chỗ cho tour đó.
enum PendingBookingChoice { resume, cancelAndRebook }

/// Mở màn thanh toán của đơn đang giữ chỗ (đồng hồ chạy tiếp theo hạn của server).
Future<void> openPendingBooking(BuildContext context, BookingModel booking) =>
    Navigator.of(context).push(MaterialPageRoute(builder: (_) => BookingCheckoutScreen(bookingId: booking.id)));

/// Hỏi khách muốn tiếp tục đơn cũ hay hủy đơn cũ để đặt lại. null = đóng hộp thoại.
Future<PendingBookingChoice?> showPendingBookingDialog(BuildContext context, BookingModel booking) {
  return showDialog<PendingBookingChoice>(
    context: context,
    builder: (ctx) => AlertDialog(
      title: const Text('Bạn đang có đơn giữ chỗ'),
      content: _LiveCountdown(
        booking: booking,
        builder: (countdown) => Text(
          'Đơn ${booking.bookingCode} cho ngày ${booking.formattedExperienceDate} '
          '(${booking.formattedTotal}) đang giữ chỗ, còn $countdown để thanh toán.\n\n'
          'Muốn đổi ngày hoặc số khách, hãy hủy đơn cũ rồi đặt lại.',
          style: const TextStyle(height: 1.45),
        ),
      ),
      actionsOverflowDirection: VerticalDirection.up,
      actionsOverflowButtonSpacing: 4,
      actions: [
        TextButton(
          onPressed: () => Navigator.of(ctx).pop(PendingBookingChoice.cancelAndRebook),
          style: TextButton.styleFrom(foregroundColor: AppCultureColors.lacquer),
          child: const Text('Hủy đơn cũ và đặt lại'),
        ),
        FilledButton(
          onPressed: () => Navigator.of(ctx).pop(PendingBookingChoice.resume),
          style: FilledButton.styleFrom(backgroundColor: AppCultureColors.heritageJade),
          child: const Text('Tiếp tục thanh toán'),
        ),
      ],
    ),
  );
}

/// Thanh nhắc "Bạn đang giữ chỗ · còn mm:ss". Tự gọi [onExpired] khi hết hạn (để màn cha ẩn đi).
/// [showTourTitle] = true ở Trang chủ (khách không đứng trong trang tour).
class PendingBookingBanner extends StatelessWidget {
  final BookingModel booking;
  final VoidCallback onTap;
  final VoidCallback? onExpired;
  final bool showTourTitle;

  const PendingBookingBanner({
    super.key,
    required this.booking,
    required this.onTap,
    this.onExpired,
    this.showTourTitle = false,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppCultureColors.warningLight,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.fromLTRB(14, 12, 10, 12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppCultureColors.goldBright.withValues(alpha: 0.55)),
          ),
          child: Row(
            children: [
              const Icon(Icons.timer_outlined, color: AppCultureColors.warning, size: 22),
              const SizedBox(width: 10),
              Expanded(
                child: _LiveCountdown(
                  booking: booking,
                  onExpired: onExpired,
                  builder: (countdown) => Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        showTourTitle ? 'Bạn có đơn chờ thanh toán · còn $countdown' : 'Bạn đang giữ chỗ · còn $countdown',
                        style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w800, color: AppCultureColors.amberDark),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        showTourTitle
                            ? '${booking.tourTitle} · ${booking.formattedExperienceDate}'
                            : 'Ngày ${booking.formattedExperienceDate} · ${booking.formattedTotal}',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 12, color: AppCultureColors.textMuted),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 6),
              const Text(
                'Thanh toán',
                style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: AppCultureColors.heritageJade),
              ),
              const Icon(Icons.chevron_right_rounded, color: AppCultureColors.heritageJade),
            ],
          ),
        ),
      ),
    );
  }
}

/// Dựng lại mỗi giây với đồng hồ mm:ss theo hạn thanh toán của server.
class _LiveCountdown extends StatefulWidget {
  final BookingModel booking;
  final Widget Function(String countdown) builder;
  final VoidCallback? onExpired;

  const _LiveCountdown({required this.booking, required this.builder, this.onExpired});

  @override
  State<_LiveCountdown> createState() => _LiveCountdownState();
}

class _LiveCountdownState extends State<_LiveCountdown> {
  Timer? _timer;
  bool _expiredNotified = false;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      if (!widget.booking.isPaymentWindowOpen && !_expiredNotified) {
        _expiredNotified = true;
        _timer?.cancel();
        widget.onExpired?.call();
      }
      setState(() {});
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => widget.builder(widget.booking.countdownText);
}
