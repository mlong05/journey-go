/// Màn Chi Tiết Đơn (Booking Detail) — Mobile.
///
/// Hiển thị đầy đủ thông tin đơn + lịch sử thanh toán + yêu cầu hoàn tiền.
///
/// ── Luật nghiệp vụ hiển thị ──
///  • Nút "Thanh toán" chỉ hiện khi booking còn `PENDING_PAYMENT` **và** còn trong hạn 10 phút.
///  • Nút "Yêu cầu hoàn tiền" chỉ hiện khi booking đã `CONFIRMED`/`COMPLETED`,
///    đã có ít nhất một payment `SUCCESS`, và còn trong 24h từ `paidAt`.
///  • Nút "Hủy đơn" chỉ hiện khi `PENDING_PAYMENT` (giải phóng slot đã giữ).
library;

import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';
import '../../core/models/booking_model.dart';
import '../../core/models/payment_model.dart';
import '../../core/models/refund_model.dart';
import '../../core/services/api_client.dart';
import '../../core/services/booking_service.dart';
import '../../core/services/payment_service.dart';
import '../../core/services/refund_service.dart';
import '../../core/utils/formatters.dart';
import 'payment_screen.dart';
import 'refund_form_screen.dart';

class BookingDetailScreen extends StatefulWidget {
  final int bookingId;
  final BookingModel? booking;

  const BookingDetailScreen({super.key, required this.bookingId, this.booking});

  @override
  State<BookingDetailScreen> createState() => _BookingDetailScreenState();
}

class _BookingDetailScreenState extends State<BookingDetailScreen> {
  final BookingService _bookingService = BookingService();
  final PaymentService _paymentService = PaymentService();
  final RefundService _refundService = RefundService();

  BookingModel? _booking;
  List<PaymentModel> _payments = [];
  List<RefundModel> _refunds = [];

  bool _loading = true;
  bool _busy = false;
  String _error = '';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = '';
    });

    try {
      final booking =
          widget.booking ?? await _bookingService.getBookingById(widget.bookingId);
      final payments = await _paymentService.getPaymentsByBooking(widget.bookingId);

      // Chỉ tra yêu cầu hoàn tiền theo các payment thực sự đã thanh toán.
      final refunds = <RefundModel>[];
      for (final payment in payments.where((p) => p.isSuccess)) {
        try {
          refunds.addAll(
            await _refundService.getRefundsByPayment(payment.id),
          );
        } on ApiException {
          // Bỏ qua lỗi từng payment — không chặn việc hiển thị đơn.
        }
      }

      if (!mounted) return;
      setState(() {
        _booking = booking;
        _payments = payments;
        _refunds = refunds.where((r) => r.bookingId == widget.bookingId).toList();
        _loading = false;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.message;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _error = 'Không thể tải chi tiết đơn.';
        _loading = false;
      });
    }
  }

  // ── Điều kiện hiển thị ────────────────────────────────────────────────────
  PaymentModel? get _successfulPayment {
    for (final p in _payments) {
      if (p.isSuccess) return p;
    }
    return null;
  }

  /// Còn trong 24h kể từ `paidAt` — điều kiện tối thiểu để gửi yêu cầu hoàn tiền.
  bool get _withinRefundWindow {
    final payment = _successfulPayment;
    if (payment?.paidAt == null) return false;
    return DateTime.now()
        .difference(payment!.paidAt!)
        .inHours < 24;
  }

  bool get _hasOpenRefund {
    return _refunds.any((r) =>
        r.isPending || r.isApproved || r.isProcessing || r.isManualTransferPending);
  }

  bool get _canRequestRefund {
    final booking = _booking;
    if (booking == null) return false;
    if (!booking.isConfirmed && !booking.isCompleted) return false;
    if (_successfulPayment == null) return false;
    if (!_withinRefundWindow) return false;
    if (_hasOpenRefund) return false;
    return true;
  }

  // ── Hành động ────────────────────────────────────────────────────────────
  Future<void> _openPayment() async {
    final booking = _booking;
    if (booking == null) return;
    final result = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => PaymentScreen(bookingId: booking.id, booking: booking),
      ),
    );
    if (result == true) {
      _load();
    }
  }

  Future<void> _openRefundForm() async {
    final payment = _successfulPayment;
    if (payment == null) return;
    final created = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => RefundFormScreen(
          paymentId: payment.id,
          booking: _booking,
          amount: payment.amount,
        ),
      ),
    );
    if (created == true) {
      _load();
    }
  }

  Future<void> _cancelBooking() async {
    final booking = _booking;
    if (booking == null) return;

    final reason = await showDialog<String>(
      context: context,
      builder: (ctx) {
        final controller = TextEditingController();
        return AlertDialog(
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
          title: const Text(
            'Hủy đơn đặt tour',
            style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800),
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                'Sau khi hủy, chỗ đã giữ sẽ được trả lại cho khách khác. '
                'Bạn không thể hoàn tác thao tác này.',
                style: TextStyle(fontSize: 13, height: 1.4),
              ),
              const SizedBox(height: 14),
              TextField(
                controller: controller,
                maxLines: 3,
                decoration: const InputDecoration(
                  hintText: 'Lý do hủy (không bắt buộc)',
                  border: OutlineInputBorder(),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('Giữ đơn'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(ctx).pop(controller.text.trim()),
              style: FilledButton.styleFrom(
                backgroundColor: AppCultureColors.error,
              ),
              child: const Text('Hủy đơn'),
            ),
          ],
        );
      },
    );

    if (reason == null) return;

    setState(() => _busy = true);
    try {
      await _bookingService.cancelBooking(booking.id, reason: reason.isEmpty ? null : reason);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Đã hủy đơn. Chỗ đã giữ được giải phóng.'),
          behavior: SnackBarBehavior.floating,
        ),
      );
      await _load();
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e.message),
          behavior: SnackBarBehavior.floating,
          backgroundColor: AppCultureColors.error,
        ),
      );
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Không thể hủy đơn. Vui lòng thử lại.'),
          behavior: SnackBarBehavior.floating,
        ),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppCultureColors.background,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded,
              size: 18, color: AppCultureColors.textDark),
          onPressed: () => Navigator.of(context).pop(true),
        ),
        title: const Text(
          'Chi Tiết Đơn',
          style: TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.w800,
            color: AppCultureColors.textDark,
          ),
        ),
      ),
      body: _loading
          ? const Center(
              child: CircularProgressIndicator(
                  color: AppCultureColors.heritageJade),
            )
          : _error.isNotEmpty && _booking == null
              ? _buildErrorState()
              : _buildContent(),
      bottomNavigationBar: _buildBottomBar(),
    );
  }

  Widget _buildErrorState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline_rounded,
                size: 46, color: AppCultureColors.error),
            const SizedBox(height: 12),
            Text(
              _error,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 13, color: AppCultureColors.textMuted),
            ),
            const SizedBox(height: 18),
            ElevatedButton.icon(
              onPressed: _load,
              icon: const Icon(Icons.refresh_rounded, size: 18),
              label: const Text('Thử lại'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppCultureColors.heritageJade,
                foregroundColor: Colors.white,
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget? _buildBottomBar() {
    final booking = _booking;
    if (booking == null || _loading) return null;

    final canPay = booking.isPendingPayment && booking.isPaymentWindowOpen;
    final canCancel = booking.isPendingPayment;

    if (!canPay && !canCancel && !_canRequestRefund) return null;

    return SafeArea(
      child: Container(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
        decoration: const BoxDecoration(
          color: Colors.white,
          border: Border(top: BorderSide(color: AppCultureColors.border)),
        ),
        child: Row(
          children: [
            if (canCancel)
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _busy ? null : _cancelBooking,
                  icon: const Icon(Icons.close_rounded, size: 18),
                  label: const Text('Hủy đơn'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppCultureColors.error,
                    side: const BorderSide(color: AppCultureColors.error),
                    minimumSize: const Size(0, 48),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                ),
              ),
            if (canCancel && (canPay || _canRequestRefund)) const SizedBox(width: 10),
            if (canPay)
              Expanded(
                flex: 2,
                child: FilledButton.icon(
                  onPressed: _openPayment,
                  icon: const Icon(Icons.account_balance_wallet_rounded, size: 19),
                  label: Text(
                    'Thanh toán ${booking.formattedTotal}',
                    style: const TextStyle(fontWeight: FontWeight.w800),
                  ),
                  style: FilledButton.styleFrom(
                    backgroundColor: AppCultureColors.heritageJade,
                    minimumSize: const Size(0, 48),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                ),
              )
            else if (_canRequestRefund)
              Expanded(
                flex: 2,
                child: FilledButton.icon(
                  onPressed: _openRefundForm,
                  icon: const Icon(Icons.assignment_return_outlined, size: 19),
                  label: const Text(
                    'Yêu cầu hoàn tiền',
                    style: TextStyle(fontWeight: FontWeight.w800),
                  ),
                  style: FilledButton.styleFrom(
                    backgroundColor: AppCultureColors.oceanBlue,
                    minimumSize: const Size(0, 48),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildContent() {
    final booking = _booking!;

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
      children: [
        _buildHeroHeader(booking),
        const SizedBox(height: 14),
        _buildStatusTimeline(booking),
        const SizedBox(height: 14),
        _buildExperiencesCard(booking),
        const SizedBox(height: 14),
        _buildOrderInfoCard(booking),
        const SizedBox(height: 14),
        _buildPaymentCard(),
        if (_refunds.isNotEmpty) ...[
          const SizedBox(height: 14),
          _buildRefundCard(),
        ],
        if (_successfulPayment != null && !_withinRefundWindow) ...[
          const SizedBox(height: 14),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppCultureColors.rewardBg,
              borderRadius: BorderRadius.circular(14),
            ),
            child: const Row(
              children: [
                Icon(Icons.info_outline_rounded,
                    size: 16, color: AppCultureColors.rewardText),
                SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Đã quá 24 giờ kể từ thời điểm thanh toán nên không thể gửi yêu cầu hoàn tiền.',
                    style: TextStyle(
                      fontSize: 12,
                      height: 1.35,
                      color: AppCultureColors.rewardText,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }

  // ── Hero: mã đơn + trạng thái + tổng tiền ────────────────────────────────
  Widget _buildHeroHeader(BookingModel booking) {
    final tone = _statusTone(booking.status);

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [AppCultureColors.jadeGradientStart, AppCultureColors.jadeGradientEnd],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(22),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'MÃ ĐƠN',
                      style: TextStyle(
                        fontSize: 10.5,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 1.2,
                        color: Colors.white.withValues(alpha: 0.75),
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      booking.bookingCode ?? '#${booking.id}',
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 0.4,
                        color: Colors.white,
                      ),
                    ),
                  ],
                ),
              ),
              _buildStatusBadge(booking),
            ],
          ),
          const SizedBox(height: 14),
          Text(
            booking.tourTitle ?? 'Tour trải nghiệm',
            style: const TextStyle(
              fontSize: 17,
              height: 1.3,
              fontWeight: FontWeight.w800,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.16),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Row(
              children: [
                const Icon(Icons.event_available_rounded,
                    size: 16, color: Colors.white),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    booking.formattedExperienceDate.isEmpty
                        ? 'Chưa có ngày trải nghiệm'
                        : 'Ngày trải nghiệm: ${booking.formattedExperienceDate}',
                    style: const TextStyle(
                      fontSize: 12.5,
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'TỔNG TIỀN',
                      style: TextStyle(
                        fontSize: 10.5,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 1.2,
                        color: Colors.white.withValues(alpha: 0.75),
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      booking.formattedTotal,
                      style: const TextStyle(
                        fontSize: 21,
                        fontWeight: FontWeight.w900,
                        color: Colors.white,
                      ),
                    ),
                  ],
                ),
              ),
              if (booking.experienceCount > 0)
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.16),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    '${booking.experienceCount} trải nghiệm',
                    style: const TextStyle(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                    ),
                  ),
                ),
            ],
          ),
          if (tone.statusHint.isNotEmpty) ...[
            const SizedBox(height: 12),
            Row(
              children: [
                Icon(tone.icon, size: 15, color: Colors.white),
                const SizedBox(width: 7),
                Expanded(
                  child: Text(
                    tone.statusHint,
                    style: TextStyle(
                      fontSize: 12,
                      height: 1.35,
                      fontWeight: FontWeight.w600,
                      color: Colors.white.withValues(alpha: 0.95),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  // ── Timeline trạng thái ──────────────────────────────────────────────────
  Widget _buildStatusTimeline(BookingModel booking) {
    final steps = <_StatusStep>[
      _StatusStep(
        'Đặt tour',
        booking.formattedCreatedAt.isEmpty
            ? 'Đã tạo đơn'
            : booking.formattedCreatedAt,
        done: true,
      ),
      _StatusStep(
        'Thanh toán',
        booking.paidAt != null ? booking.formattedPaidAt : 'Chưa thanh toán',
        done: booking.paidAt != null,
        active: booking.paidAt == null && booking.isPendingPayment,
      ),
      _StatusStep(
        'Xác nhận',
        booking.confirmedAt != null
            ? formatDateTimeVn(booking.confirmedAt)
            : 'Chờ thanh toán',
        done: booking.confirmedAt != null,
        active: booking.paidAt != null && booking.confirmedAt == null,
      ),
      _StatusStep(
        'Hoàn thành',
        booking.completedAt != null
            ? formatDateTimeVn(booking.completedAt)
            : 'Chưa trải nghiệm',
        done: booking.completedAt != null,
        active: booking.isConfirmed,
      ),
    ];

    return _card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _CardTitle(icon: Icons.timeline_rounded, text: 'Tiến trình đơn'),
          const SizedBox(height: 14),
          ...steps.asMap().entries.map((e) {
            final isLast = e.key == steps.length - 1;
            return _buildStatusStep(e.value, isLast);
          }),
          if (booking.isPendingPayment && booking.isPaymentWindowOpen) ...[
            const SizedBox(height: 4),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppCultureColors.rewardBg,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  const Icon(Icons.timer_outlined,
                      size: 16, color: AppCultureColors.rewardText),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Còn ${booking.countdownText} để thanh toán. '
                      'Quá hạn, chỗ đã giữ sẽ được trả lại cho khách khác.',
                      style: const TextStyle(
                        fontSize: 12,
                        height: 1.35,
                        color: AppCultureColors.rewardText,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildStatusStep(_StatusStep step, bool isLast) {
    Color circleColor;
    if (step.done) {
      circleColor = AppCultureColors.heritageJade;
    } else if (step.active) {
      circleColor = AppCultureColors.warning;
    } else {
      circleColor = AppCultureColors.surfaceSubtle;
    }

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 26,
            child: Column(
              children: [
                Container(
                  width: 20,
                  height: 20,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: circleColor,
                    shape: BoxShape.circle,
                  ),
                  child: step.done
                      ? const Icon(Icons.check_rounded, size: 12, color: Colors.white)
                      : step.active
                          ? const SizedBox(
                              width: 8,
                              height: 8,
                              child: DecoratedBox(
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  shape: BoxShape.circle,
                                ),
                              ),
                            )
                          : null,
                ),
                if (!isLast)
                  Expanded(
                    child: Container(
                      width: 2,
                      margin: const EdgeInsets.symmetric(vertical: 3),
                      color: step.done
                          ? AppCultureColors.jadeLight
                          : AppCultureColors.border,
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Padding(
              padding: EdgeInsets.only(bottom: isLast ? 0 : 14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    step.title,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w800,
                      color: step.done || step.active
                          ? AppCultureColors.textDark
                          : AppCultureColors.textMuted,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    step.subtitle,
                    style: const TextStyle(
                      fontSize: 11.5,
                      color: AppCultureColors.textMuted,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ── Trải nghiệm đã đặt ──────────────────────────────────────────────────
  Widget _buildExperiencesCard(BookingModel booking) {
    final holds = booking.slotHolds;

    return _card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Expanded(
                child: _CardTitle(
                    icon: Icons.map_outlined, text: 'Trải nghiệm trong đơn'),
              ),
              if (holds.isNotEmpty)
                Text(
                  '${holds.length} mục',
                  style: const TextStyle(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w700,
                    color: AppCultureColors.textMuted,
                  ),
                ),
            ],
          ),
          const SizedBox(height: 4),
          const Text(
            'Mỗi trải nghiệm trong tour chiếm 1 chỗ trong ngày bạn chọn.',
            style: TextStyle(fontSize: 11.5, color: AppCultureColors.textMuted),
          ),
          const SizedBox(height: 12),
          if (holds.isEmpty)
            const Text(
              'Đơn này không ghi nhận trải nghiệm nào.',
              style: TextStyle(fontSize: 12.5, color: AppCultureColors.textMuted),
            )
          else
            ...holds.map((h) => _buildExperienceRow(booking, h)),
          if (holds.isNotEmpty) ...[
            const SizedBox(height: 4),
            const Divider(height: 16, color: AppCultureColors.borderLight),
            _buildInfoRow(
              'Tổng giá trải nghiệm',
              booking.formattedTotal,
              bold: true,
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildExperienceRow(BookingModel booking, SlotHoldModel hold) {
    final tone = _holdTone(booking, hold);

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        children: [
          Container(
            width: 34,
            height: 34,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: tone.bg,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(tone.icon, size: 17, color: tone.fg),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  hold.experienceTitle ?? 'Trải nghiệm #${hold.experienceId ?? '-'}',
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: AppCultureColors.textDark,
                  ),
                ),
                const SizedBox(height: 3),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 7, vertical: 2),
                      decoration: BoxDecoration(
                        color: tone.bg,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        tone.label,
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                          color: tone.fg,
                        ),
                      ),
                    ),
                    if (hold.experiencePrice > 0) ...[
                      const SizedBox(width: 6),
                      Text(
                        formatVndAmount(hold.experiencePrice),
                        style: const TextStyle(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w700,
                          color: AppCultureColors.textMuted,
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ── Thông tin đơn ───────────────────────────────────────────────────────
  Widget _buildOrderInfoCard(BookingModel booking) {
    return _card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _CardTitle(icon: Icons.receipt_long_rounded, text: 'Thông tin đơn'),
          const SizedBox(height: 12),
          _buildInfoRow('Mã đơn', booking.bookingCode ?? '#${booking.id}'),
          _buildInfoRow('Tour', booking.tourTitle ?? '—'),
          _buildInfoRow('Ngày trải nghiệm',
              booking.formattedExperienceDate.isEmpty
                  ? '—'
                  : booking.formattedExperienceDate),
          _buildInfoRow('Số trải nghiệm',
              '${booking.experienceCount} trải nghiệm'),
          _buildInfoRow('Tạo lúc', booking.formattedCreatedAt),
          if (booking.paymentDeadline != null)
            _buildInfoRow('Hạn thanh toán',
                formatDateTimeVn(booking.paymentDeadline)),
          if (booking.paidAt != null)
            _buildInfoRow('Đã thanh toán', booking.formattedPaidAt),
          if (booking.confirmedAt != null)
            _buildInfoRow('Xác nhận', formatDateTimeVn(booking.confirmedAt)),
          if (booking.completedAt != null)
            _buildInfoRow(
                'Hoàn thành', formatDateTimeVn(booking.completedAt)),
          if (booking.cancellationReason != null &&
              booking.cancellationReason!.isNotEmpty)
            _buildInfoRow('Lý do hủy', booking.cancellationReason!),
          const SizedBox(height: 4),
          const Divider(height: 16, color: AppCultureColors.borderLight),
          _buildInfoRow('Tổng thanh toán', booking.formattedTotal, bold: true),
        ],
      ),
    );
  }

  // ── Lịch sử thanh toán ──────────────────────────────────────────────────
  Widget _buildPaymentCard() {
    return _card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _CardTitle(
              icon: Icons.account_balance_wallet_rounded, text: 'Lịch sử thanh toán'),
          const SizedBox(height: 12),
          if (_payments.isEmpty)
            const Text(
              'Chưa có giao dịch thanh toán nào.',
              style: TextStyle(fontSize: 12.5, color: AppCultureColors.textMuted),
            )
          else
            ..._payments.map(_buildPaymentRow),
        ],
      ),
    );
  }

  // ── Yêu cầu hoàn tiền ───────────────────────────────────────────────────
  Widget _buildRefundCard() {
    return _card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _CardTitle(
              icon: Icons.assignment_return_outlined, text: 'Yêu cầu hoàn tiền'),
          const SizedBox(height: 12),
          ..._refunds.map(_buildRefundRow),
        ],
      ),
    );
  }

  // ── Helpers ─────────────────────────────────────────────────────────────
  Widget _card({required Widget child}) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppCultureColors.border),
      ),
      child: child,
    );
  }

  /// Trạng thái của một slot hold — phụ thuộc BOTH trạng thái đơn và cờ `released`.
  _HoldTone _holdTone(BookingModel booking, SlotHoldModel hold) {
    if (hold.released) {
      return const _HoldTone(
        'Đã trả lại',
        Icons.event_busy_rounded,
        AppCultureColors.textLight,
        AppCultureColors.surfaceSubtle,
      );
    }
    if (booking.isConfirmed || booking.isCompleted) {
      return const _HoldTone(
        'Đã xác nhận',
        Icons.verified_rounded,
        AppCultureColors.jadeDark,
        AppCultureColors.jadeLight,
      );
    }
    if (booking.isCancelled || booking.isExpired) {
      return const _HoldTone(
        'Đã giải phóng',
        Icons.event_busy_rounded,
        AppCultureColors.error,
        Color(0xFFFEF2F2),
      );
    }
    return const _HoldTone(
      'Đang giữ chỗ',
      Icons.lock_clock_rounded,
      AppCultureColors.rewardText,
      AppCultureColors.rewardBg,
    );
  }

  /// Màu/nhãn/hint của trạng thái đơn.
  _StatusTone _statusTone(String status) {
    switch (status) {
      case 'CONFIRMED':
        return const _StatusTone(
          'Đã xác nhận',
          Icons.check_circle_rounded,
          AppCultureColors.jadeDark,
          AppCultureColors.jadeLight,
          'Thanh toán thành công — chỗ của bạn đã được xác nhận.',
        );
      case 'COMPLETED':
        return const _StatusTone(
          'Đã hoàn thành',
          Icons.workspace_premium_rounded,
          AppCultureColors.oceanDark,
          AppCultureColors.oceanLight,
          'Bạn đã hoàn thành trải nghiệm. Cảm ơn bạn đã đồng hành!',
        );
      case 'PENDING_PAYMENT':
        return const _StatusTone(
          'Chờ thanh toán',
          Icons.schedule_rounded,
          AppCultureColors.rewardText,
          AppCultureColors.rewardBg,
          'Đơn đang chờ thanh toán — hãy hoàn tất trong hạn 10 phút.',
        );
      case 'CANCELLED':
        return const _StatusTone(
          'Đã hủy',
          Icons.cancel_rounded,
          AppCultureColors.error,
          Color(0xFFFEF2F2),
          'Đơn đã được hủy và chỗ đã được trả lại.',
        );
      case 'EXPIRED':
        return const _StatusTone(
          'Đã hết hạn',
          Icons.timer_off_rounded,
          AppCultureColors.textMuted,
          AppCultureColors.surfaceSubtle,
          'Đơn quá hạn thanh toán — chỗ đã được giải phóng.',
        );
      default:
        return const _StatusTone(
          'Không rõ',
          Icons.help_outline_rounded,
          AppCultureColors.textMuted,
          AppCultureColors.surfaceSubtle,
          '',
        );
    }
  }

  Widget _buildStatusBadge(BookingModel booking) {
    final tone = _statusTone(booking.status);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.94),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(tone.icon, size: 13, color: tone.fg),
          const SizedBox(width: 5),
          Text(
            tone.label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w800,
              color: tone.fg,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoRow(String label, String value, {bool bold = false}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(fontSize: 12.5, color: AppCultureColors.textMuted),
          ),
          const SizedBox(width: 12),
          Flexible(
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: TextStyle(
                fontSize: bold ? 14 : 12.5,
                fontWeight: bold ? FontWeight.w900 : FontWeight.w700,
                color: bold ? AppCultureColors.jadeDark : AppCultureColors.textDark,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPaymentRow(PaymentModel payment) {
    final isSuccess = payment.isSuccess;
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        children: [
          Icon(
            isSuccess
                ? Icons.check_circle_rounded
                : payment.isFailed || payment.isCancelled
                    ? Icons.cancel_rounded
                    : Icons.schedule_rounded,
            size: 17,
            color: isSuccess
                ? AppCultureColors.heritageJade
                : payment.isFailed || payment.isCancelled
                    ? AppCultureColors.error
                    : AppCultureColors.warning,
          ),
          const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Giao dịch ${formatDateTimeVn(payment.createdAt)}',
                      style: const TextStyle(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w700,
                        color: AppCultureColors.textDark,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      payment.statusLabel,
                      style: const TextStyle(
                          fontSize: 11, color: AppCultureColors.textMuted),
                    ),
                  ],
                ),
              ),
          Text(
            payment.formattedAmount,
            style: const TextStyle(
              fontSize: 12.5,
              fontWeight: FontWeight.w800,
              color: AppCultureColors.textDark,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRefundRow(RefundModel refund) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        children: [
          Icon(
            refund.isRefunded
                ? Icons.assignment_turned_in_rounded
                : refund.isRejected
                    ? Icons.do_not_disturb_rounded
                    : Icons.pending_actions_rounded,
            size: 17,
            color: refund.isRefunded
                ? AppCultureColors.heritageJade
                : refund.isRejected
                    ? AppCultureColors.error
                    : AppCultureColors.warning,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  refund.refundCode ?? 'Yêu cầu #${refund.id}',
                  style: const TextStyle(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w700,
                    color: AppCultureColors.textDark,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  '${refund.statusLabel} • ${refund.declaredReasonLabel}',
                  style: const TextStyle(
                      fontSize: 11, color: AppCultureColors.textMuted),
                ),
              ],
            ),
          ),
          Text(
            refund.formattedProposedAmount,
            style: const TextStyle(
              fontSize: 12.5,
              fontWeight: FontWeight.w800,
              color: AppCultureColors.textDark,
            ),
          ),
        ],
      ),
    );
  }
}

// ── DTO nội bộ ─────────────────────────────────────────────────────────────

class _StatusStep {
  final String title;
  final String subtitle;
  final bool done;
  final bool active;

  const _StatusStep(this.title, this.subtitle, {this.done = false, this.active = false});
}

class _StatusTone {
  final String label;
  final IconData icon;
  final Color fg;
  final Color bg;
  final String statusHint;

  const _StatusTone(this.label, this.icon, this.fg, this.bg, this.statusHint);
}

class _HoldTone {
  final String label;
  final IconData icon;
  final Color fg;
  final Color bg;

  const _HoldTone(this.label, this.icon, this.fg, this.bg);
}

/// Tiêu đề card dùng chung.
class _CardTitle extends StatelessWidget {
  final IconData icon;
  final String text;

  const _CardTitle({required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 16, color: AppCultureColors.heritageJade),
        const SizedBox(width: 8),
        Text(
          text,
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w800,
            color: AppCultureColors.textDark,
          ),
        ),
      ],
    );
  }
}
