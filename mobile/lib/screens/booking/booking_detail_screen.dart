/// Màn Chi Tiết Đơn (Booking Detail) — Mobile.
///
/// Hiển thị đầy đủ thông tin đơn + lịch sử thanh toán + yêu cầu hoàn tiền.
///
/// ── Luật nghiệp vụ hiển thị ──
///  • Nút "Thanh toán" chỉ hiện khi booking còn `PENDING_PAYMENT` **và** còn trong hạn 10 phút.
///  • Thẻ "Hủy chuyến & hoàn tiền" (cuối trang, không nằm ở thanh đáy) chỉ hiện
///    khi booking đã `CONFIRMED`, có payment `SUCCESS`, chưa tới ngày khởi hành và
///    chưa có yêu cầu hoàn tiền nào.
///  • Nút "Hủy đơn" chỉ hiện khi `PENDING_PAYMENT` (giải phóng slot đã giữ).
library;

import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';
import '../common/bright.dart';
import '../../core/models/booking_model.dart';
import '../../core/models/refund_model.dart';
import '../../core/services/api_client.dart';
import '../../core/services/booking_service.dart';
import '../../core/services/payment_service.dart';
import '../../core/services/payment_sync_service.dart';
import '../../core/services/refund_service.dart';
import '../../core/services/token_storage.dart';
import '../../core/utils/formatters.dart';
import '../../core/utils/navigation.dart';
import 'payment_screen.dart';
import 'refund_form_screen.dart';

class BookingDetailScreen extends StatefulWidget {
  final int bookingId;
  final BookingModel? booking;

  /// Bấm nút quay lại (góc trái) ⇒ quay thẳng về TRANG CHỦ thay vì màn trước đó.
  ///
  /// ⚠️ Dùng sau khi thanh toán xong: stack lúc đó là
  /// [Trang chủ → Chi tiết tour → Đặt tour → Checkout → Chi tiết đơn]
  /// ⇒ bấm quay lại sẽ quay về màn checkout/đặt tour — không mong muốn.
  final bool popToHomeOnBack;

  const BookingDetailScreen({
    super.key,
    required this.bookingId,
    this.booking,
    this.popToHomeOnBack = false,
  });

  @override
  State<BookingDetailScreen> createState() => _BookingDetailScreenState();
}

class _BookingDetailScreenState extends State<BookingDetailScreen> {
  final BookingService _bookingService = BookingService();
  final PaymentService _paymentService = PaymentService();
  final RefundService _refundService = RefundService();
  final PaymentSyncService _syncService = PaymentSyncService();

  BookingModel? _booking;
  List<PaymentModel> _payments = [];
  List<RefundModel> _refunds = [];

  /// Id người đang đăng nhập — dùng để biết mình có phải người đặt tour không.
  int? _myUserId;

  bool _loading = true;
  bool _busy = false;
  String _error = '';

  /// Đang kiểm tra lại giao dịch nào (paymentId) — để disable nút tương ứng.
  final Set<int> _checking = <int>{};

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
      final myUser = await TokenStorage.getUser();
      if (!mounted) return;
      _myUserId = myUser?.id;

      // ⚠️ LUÔN đọc booking từ server — KHÔNG dùng `widget.booking` (bản cache
      // truyền vào).
      //
      // ── Vì sao? ──
      // `widget.booking` là ẢNH CHỤP tại thời điểm màn được mở. Sau khi khách
      // thanh toán (hoặc admin duyệt hoàn tiền), trạng thái đã thay đổi trên
      // server nhưng bản cache vẫn là `PENDING_PAYMENT` ⇒ màn chi tiết hiện
      // "Chờ thanh toán" cho một đơn ĐÃ thanh toán thành công.
      //
      // ⇒ Luôn gọi API ⇒ trạng thái luôn khớp với server.
      final booking = await _bookingService.getBookingById(widget.bookingId);
      final payments = await _paymentService.getPaymentsByBooking(widget.bookingId);

      // Lấy yêu cầu hoàn tiền theo BOOKING (gộp mọi payment) — kèm nhật ký kiểm
      // toán đầy đủ để hiển thị lịch sử xử lý theo thứ tự thời gian.
      List<RefundModel> refunds = const [];
      try {
        refunds = await _refundService.getRefundsByBooking(widget.bookingId);
      } on ApiException {
        // Bỏ qua lỗi — không chặn việc hiển thị đơn.
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

  /// Yêu cầu hoàn tiền chỉ được gửi TRƯỚC ngày khởi hành (tour chưa bắt đầu).
  ///
  /// ── Vì sao không dùng mốc 24h kể từ `paidAt`? ──
  /// Chính sách mới bỏ hoàn toàn cửa sổ 24h sau thanh toán. Điều kiện duy nhất là
  /// booking đã thanh toán thành công và ngày trải nghiệm còn ở tương lai.
  bool get _withinRefundWindow {
    final booking = _booking;
    if (booking?.experienceDate == null) return false;
    final today = DateTime.now();
    final start = DateTime(
      booking!.experienceDate!.year,
      booking.experienceDate!.month,
      booking.experienceDate!.day,
    );
    return start.isAfter(today);
  }

  /// Đã có yêu cầu hoàn tiền nào cho đơn này chưa.
  ///
  /// ⚠️ Mỗi giao dịch chỉ có tối đa MỘT yêu cầu hoàn tiền đang xử lý hoặc đã hoàn
  /// tất (backend cũng chặn) ⇒ sau khi gửi, KHÔNG hiển thị lại nút "Yêu cầu hoàn
  /// tiền" cho đơn đó.
  bool get _hasOpenRefund => _refunds.isNotEmpty;

  bool get _canRequestRefund {
    final booking = _booking;
    if (booking == null) return false;
    if (!booking.isConfirmed && !booking.isCompleted) return false;
    if (booking.isCompleted) return false;
    if (_successfulPayment == null) return false;
    if (!_withinRefundWindow) return false;
    if (_hasOpenRefund) return false;
    return true;
  }

  // ── Hành động ────────────────────────────────────────────────────────────

  /// Kiểm tra lại kết quả một giao dịch đang "kẹt" (PENDING / PROCESSING).
  ///
  /// ── Vì sao cần? ──
  /// Giao dịch có thể kẹt ở PROCESSING dù khách ĐÃ thanh toán thành công, khi:
  /// IPN không tới (tunnel chết), app bị kill nên deep link không mở được, hoặc
  /// request gửi lên backend bị từ chối. Khi đó nút "Thanh toán" vẫn hiện và bấm
  /// vào sẽ báo "chưa xác minh được kết quả giao dịch trước".
  ///
  /// ⇒ Cho khách một nút "Kiểm tra lại" để tự đồng bộ lại trạng thái ngay tại chỗ,
  /// thay vì phải chờ tác vụ nền hoặc liên hệ hỗ trợ.
  Future<void> _recheckPayment(PaymentModel payment) async {
    if (_checking.contains(payment.id)) return;
    setState(() => _checking.add(payment.id));

    try {
      final result = await _syncService.sync(payment.id);
      if (!mounted) return;

      if (result.isSuccess) {
        await _load();
        if (!mounted) return;
        _showToast(
          'Đã xác nhận thanh toán thành công!',
          icon: Icons.check_circle_rounded,
          color: AppCultureColors.heritageJade,
        );
        return;
      }

      // isFinal = đã có kết quả cuối nhưng KHÔNG thành công (thất bại / khách hủy).
      if (result.isFinal) {
        await _load();
        if (!mounted) return;
        // Giao dịch bị THAY THẾ ⇒ không phải lỗi — đơn đã được thanh toán bởi
        // giao dịch khác ⇒ hiện thông báo trung tính (không đỏ báo lỗi).
        final superseded = result.payment?.isSuperseded == true;
        _showToast(
          result.message.isNotEmpty
              ? result.message
              : superseded
                  ? 'Giao dịch này đã bị thay thế — đơn hàng đã được thanh toán '
                      'bởi một giao dịch khác.'
                  : 'Giao dịch đã được xác nhận không thành công.',
          icon: superseded
              ? Icons.swap_horiz_rounded
              : Icons.cancel_rounded,
          color: superseded
              ? AppCultureColors.textMuted
              : AppCultureColors.error,
        );
        return;
      }

      // Chưa xác minh được ⇒ vẫn còn thời gian thanh toán thì cho thử lại.
      _showToast(
        result.message.isNotEmpty
            ? result.message
            : 'Chưa xác minh được kết quả. Nếu bạn đã thanh toán, vui lòng thử lại sau ít phút.',
        icon: Icons.info_rounded,
        color: AppCultureColors.warning,
      );
    } catch (_) {
      if (!mounted) return;
      _showToast(
        'Không kiểm tra được trạng thái thanh toán. Vui lòng thử lại.',
        icon: Icons.info_rounded,
        color: AppCultureColors.warning,
      );
    } finally {
      if (mounted) setState(() => _checking.remove(payment.id));
    }
  }

  /// Hiện thông báo nhỏ ở đáy màn hình.
  void _showToast(String message, {required IconData icon, required Color color}) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          behavior: SnackBarBehavior.floating,
          duration: const Duration(seconds: 4),
          backgroundColor: color,
          content: Row(
            children: [
              Icon(icon, size: 18, color: Colors.white),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  message,
                  style: const TextStyle(
                      color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),
        ),
      );
  }

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
          onPressed: () {
            if (widget.popToHomeOnBack) {
              // Sau khi thanh toán ⇒ quay thẳng về Trang chủ (không quay lại
              // màn đặt tour / checkout đã hoàn tất).
              returnToHome(context);
              return;
            }
            Navigator.of(context).pop(true);
          },
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

    // Thanh đáy chỉ dành cho đơn đang chờ thanh toán. "Yêu cầu hoàn tiền" nằm ở
    // thẻ cuối trang (_buildRefundEntryCard) — không nhắc hoàn tiền ngay sau khi
    // khách vừa thanh toán xong.
    if (!canPay && !canCancel) return null;

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
            if (canCancel && canPay) const SizedBox(width: 10),
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
        _buildPassengersCard(booking),
        const SizedBox(height: 14),
        _buildExperiencesCard(booking),
        const SizedBox(height: 14),
        _buildOrderInfoCard(booking),
        const SizedBox(height: 14),
        _buildPaymentCard(),
        if (_canRequestRefund) ...[
          const SizedBox(height: 14),
          _buildRefundEntryCard(booking),
        ],
        if (_refunds.isNotEmpty) ...[
          const SizedBox(height: 14),
          _buildRefundStatusBanner(),
          const SizedBox(height: 14),
          _buildRefundCard(),
          const SizedBox(height: 14),
          _buildAuditHistoryCard(),
        ],
        if (_successfulPayment != null && !_withinRefundWindow) ...[
          const SizedBox(height: 14),
          Container(
            padding: const EdgeInsets.all(14),            decoration: BoxDecoration(
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
                    'Yêu cầu hoàn tiền chỉ được gửi trước ngày khởi hành của tour. '
                    'Bạn đã trải nghiệm hoặc tour đã hoàn thành nên không thể gửi yêu cầu.',
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
  /// Thẻ hero sáng: nền trắng → ngọc nhạt, chữ màu mực, tổng tiền màu xanh ngọc đậm.
  Widget _buildHeroHeader(BookingModel booking) {
    final tone = _statusTone(booking.status);
    const eyebrow = TextStyle(
      fontSize: 11.5,
      fontWeight: FontWeight.w700,
      letterSpacing: 1.0,
      color: AppCultureColors.textMuted,
    );

    return BrightHeroCard(
      tone: AppTone.jade,
      radius: 22,
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('MÃ ĐƠN', style: eyebrow),
                    const SizedBox(height: 3),
                    Text(
                      booking.bookingCode.isEmpty ? '#${booking.id}' : booking.bookingCode,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.4,
                        color: AppCultureColors.textDark,
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
            booking.tourTitle.isEmpty ? 'Tour trải nghiệm' : booking.tourTitle,
            style: const TextStyle(
              fontSize: 17,
              height: 1.3,
              fontWeight: FontWeight.w800,
              color: AppCultureColors.textDark,
            ),
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: AppCultureColors.surface,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppTone.jade.soft),
            ),
            child: Row(
              children: [
                const IconTile(icon: Icons.event_available_rounded, tone: AppTone.jade, size: 28),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    booking.formattedExperienceDate.isEmpty
                        ? 'Chưa có ngày trải nghiệm'
                        : 'Ngày trải nghiệm: ${booking.formattedExperienceDate}',
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: AppCultureColors.textDark,
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
                    const Text('TỔNG TIỀN', style: eyebrow),
                    const SizedBox(height: 3),
                    Text(
                      booking.formattedTotal,
                      style: const TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                        color: AppCultureColors.jadeDark,
                        letterSpacing: -0.3,
                      ),
                    ),
                  ],
                ),
              ),
              if (booking.experienceCount > 0)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: AppCultureColors.brassTint,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: AppTone.brass.soft),
                  ),
                  child: Text(
                    '${booking.experienceCount} trải nghiệm',
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: AppCultureColors.brass800,
                    ),
                  ),
                ),
            ],
          ),
          if (tone.statusHint.isNotEmpty) ...[
            const SizedBox(height: 12),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(tone.icon, size: 16, color: tone.fg),
                const SizedBox(width: 7),
                Expanded(
                  child: Text(
                    tone.statusHint,
                    style: const TextStyle(
                      fontSize: 12.5,
                      height: 1.4,
                      fontWeight: FontWeight.w500,
                      color: AppCultureColors.textMuted,
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
    // ⚠️ Đơn đã hủy / hết hạn ⇒ các bước sau KHÔNG còn là "chờ" nữa mà là
    // "không thực hiện" (chỗ đã được trả lại) ⇒ hiện đúng sự thật.
    final closed = booking.isCancelled || booking.isExpired;
    final cancelled = booking.isCancelled;

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
            : closed
                // Đơn chưa từng được xác nhận ⇒ chỗ đã được trả lại.
                ? (cancelled ? 'Đơn đã hủy' : 'Đơn đã hết hạn')
                : 'Chờ thanh toán',
        done: booking.confirmedAt != null,
        active: !closed && booking.paidAt != null && booking.confirmedAt == null,
      ),
      _StatusStep(
        'Hoàn thành',
        booking.completedAt != null
            ? formatDateTimeVn(booking.completedAt)
            : closed
                ? 'Không thực hiện'
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
          _buildInfoRow(
            'Mã đơn',
            booking.bookingCode.isEmpty ? '#${booking.id}' : booking.bookingCode,
          ),
          _buildInfoRow('Tour', booking.tourTitle.isEmpty ? '—' : booking.tourTitle),
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

  // ── Hành khách trong nhóm + Mời tham gia ─────────────────────────────────

  /// Người đang xem có phải NGƯỜI ĐẶT TOUR (Booking Customer) không.
  ///
  /// ⚠️ Hành khách được mời KHÔNG được quyền gửi lời mời / quản lý nhóm.
  bool get _isBookingCustomer {
    final booking = _booking;
    if (booking == null) return false;
    final myId = _myUserId;
    if (myId != null && booking.touristId != null) return myId == booking.touristId;
    // Dự phòng: booking không có touristId ⇒ coi như người đặt khi chính họ đặt.
    return booking.passengers.any((p) => p.bookingCustomer);
  }

  /// Card "Hành khách trong nhóm" — hiển thị số người tham gia + nút "Mời tham gia".
  Widget _buildPassengersCard(BookingModel booking) {
    final passengers = booking.passengers;
    if (passengers.isEmpty) return const SizedBox.shrink();

    return _card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const _CardTitle(
                  icon: Icons.groups_rounded, text: 'Hành khách trong nhóm'),
              const Spacer(),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                decoration: BoxDecoration(
                  color: AppCultureColors.oceanLight,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  '${passengers.length} người',
                  style: const TextStyle(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w700,
                    color: AppCultureColors.oceanDark,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            'Số người tham gia đã nhập khi đặt tour.',
            style: const TextStyle(
                fontSize: 11.5, color: AppCultureColors.textMuted),
          ),
          const SizedBox(height: 12),
          for (var i = 0; i < passengers.length; i++) ...[
            _buildPassengerRow(booking, passengers[i]),
            if (i < passengers.length - 1)
              const Divider(height: 18, color: AppCultureColors.borderLight),
          ],
          if (_isBookingCustomer && passengers.any((p) => p.canBeInvited || p.invitationExpired))
            Padding(
              padding: const EdgeInsets.only(top: 10),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppCultureColors.jadeLight.withValues(alpha: 0.55),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(Icons.mark_email_read_outlined,
                        size: 16, color: AppCultureColors.jadeDark),
                    SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Gửi lời mời để hành khách tạo tài khoản JourneyGo và xem tour cùng nhóm. '
                        'Lời mời hết hạn sau 24 giờ.',
                        style: TextStyle(
                          fontSize: 11.5,
                          height: 1.4,
                          color: AppCultureColors.jadeDark,
                        ),
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

  Widget _buildPassengerRow(BookingModel booking, BookingPassengerModel p) {
    final masked = !p.personalInfoVisible;
    final canInvite = _isBookingCustomer && (p.canBeInvited || p.invitationExpired);

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 34,
          height: 34,
          decoration: BoxDecoration(
            color: p.bookingCustomer
                ? AppCultureColors.jadeLight
                : AppCultureColors.surfaceSubtle,
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(
            p.hasAccount
                ? Icons.verified_user_rounded
                : Icons.person_outline_rounded,
            size: 17,
            color: p.bookingCustomer
                ? AppCultureColors.jadeDark
                : AppCultureColors.textMuted,
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Flexible(
                    child: Text(
                      p.fullName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 13.5,
                        fontWeight: FontWeight.w700,
                        color: AppCultureColors.textDark,
                      ),
                    ),
                  ),
                  if (p.bookingCustomer) ...[
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: AppCultureColors.jadeLight,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: const Text(
                        'Người đặt',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          color: AppCultureColors.jadeDark,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
              const SizedBox(height: 3),
              Text(
                _passengerSubtitle(p, masked),
                style: const TextStyle(
                    fontSize: 11.5, color: AppCultureColors.textMuted),
              ),
              if (p.invitationLabel.isNotEmpty) ...[
                const SizedBox(height: 5),
                _invitationTag(p),
              ],
              if (canInvite) ...[
                const SizedBox(height: 8),
                OutlinedButton.icon(
                  onPressed: _busy ? null : () => _invitePassenger(booking, p),
                  icon: const Icon(Icons.mail_outline_rounded, size: 15),
                  label: Text(p.invitationExpired ? 'Gửi lại lời mời' : 'Mời tham gia'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppCultureColors.heritageJade,
                    side: const BorderSide(color: AppCultureColors.heritageJade),
                    minimumSize: const Size(0, 34),
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    textStyle: const TextStyle(
                        fontSize: 12, fontWeight: FontWeight.w700),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }

  String _passengerSubtitle(BookingPassengerModel p, bool masked) {
    final parts = <String>[
      if (p.guestTypeLabel.isNotEmpty) p.guestTypeLabel,
      if (p.ageAtExperience != null) '${p.ageAtExperience} tuổi',
    ];
    if (masked) {
      parts.add('Thông tin cá nhân được ẩn');
    } else if (p.email != null && p.email!.isNotEmpty) {
      parts.add(p.email!);
    } else if (p.emailRequired) {
      parts.add('Chưa có email');
    }
    return parts.join(' · ');
  }

  Widget _invitationTag(BookingPassengerModel p) {
    final (color, bg, icon) = switch (p.invitationStatus) {
      'ACCEPTED' => (
          AppCultureColors.jadeDark,
          AppCultureColors.jadeLight,
          Icons.check_circle_rounded
        ),
      'PENDING' => (
          AppCultureColors.oceanDark,
          AppCultureColors.oceanLight,
          Icons.schedule_rounded
        ),
      'EXPIRED' => (
          AppCultureColors.amberDark,
          AppCultureColors.rewardBg,
          Icons.timer_off_rounded
        ),
      _ => (
          AppCultureColors.textMuted,
          AppCultureColors.surfaceSubtle,
          Icons.block_rounded
        ),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: color),
          const SizedBox(width: 4),
          Text(
            p.invitationLabel,
            style: TextStyle(
                fontSize: 10.5, fontWeight: FontWeight.w700, color: color),
          ),
        ],
      ),
    );
  }

  /// Gửi lời mời tham gia tour cho một hành khách.
  Future<void> _invitePassenger(
      BookingModel booking, BookingPassengerModel passenger) async {
    var email = passenger.email ?? '';
    if (email.isEmpty) {
      final entered = await _askEmail();
      if (entered == null || entered.trim().isEmpty) return;
      email = entered.trim();
    }

    setState(() => _busy = true);
    try {
      await _bookingService.invitePassenger(
        booking.id,
        passenger.id,
        email: email,
      );
      if (!mounted) return;
      _load();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Đã gửi lời mời tới $email'),
          behavior: SnackBarBehavior.floating,
        ),
      );
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e.message),
          behavior: SnackBarBehavior.floating,
          backgroundColor: AppCultureColors.error,
        ),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  /// Hộp thoại nhập email cho hành khách chưa có email trong đơn.
  Future<String?> _askEmail() {
    final controller = TextEditingController();
    return showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Nhập email người được mời'),
        content: TextField(
          controller: controller,
          autofocus: true,
          keyboardType: TextInputType.emailAddress,
          decoration: const InputDecoration(
            labelText: 'Email',
            hintText: 'vidu@gmail.com',
          ),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx), child: const Text('Hủy')),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, controller.text),
            child: const Text('Gửi lời mời'),
          ),
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

  // ── Lối vào "Hủy chuyến & hoàn tiền" ────────────────────────────────────
  /// Thẻ nhỏ cuối trang, thay cho nút to ở thanh đáy: khách cần thì cuộn xuống
  /// tìm, không bị nhắc hoàn tiền ngay sau khi vừa thanh toán.
  Widget _buildRefundEntryCard(BookingModel booking) {
    final date = booking.formattedExperienceDate;
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(18),
      child: InkWell(
        onTap: _busy ? null : _openRefundForm,
        borderRadius: BorderRadius.circular(18),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: AppCultureColors.border),
          ),
          child: Row(
            children: [
              const Icon(Icons.assignment_return_outlined,
                  size: 20, color: AppCultureColors.textMuted),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Hủy chuyến & hoàn tiền',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: AppCultureColors.textDark,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      date.isEmpty
                          ? 'Gửi yêu cầu trước ngày khởi hành'
                          : 'Gửi yêu cầu trước ngày $date',
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppCultureColors.textMuted,
                      ),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right_rounded,
                  size: 22, color: AppCultureColors.textMuted),
            ],
          ),
        ),
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

  // ── Lịch sử xử lý hoàn tiền ─────────────────────────────────────────────

  /// Banner trạng thái hoàn tiền của đơn.
  ///
  /// Hiển thị ngay dưới tiến trình đơn để khách biết:
  ///  • đang trong quá trình hoàn tiền (chờ quản trị viên / VNPay / chuyển khoản)
  ///  • đã xử lý hoàn tiền xong
  Widget _buildRefundStatusBanner() {
    final state = summarizeRefundState(_refunds);
    if (state == RefundSummaryState.none) return const SizedBox.shrink();

    final processing = state == RefundSummaryState.processing;
    final latest = _refunds.first;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: processing ? AppCultureColors.rewardBg : AppCultureColors.jadeLight,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: processing
              ? AppCultureColors.rewardBorder
              : AppCultureColors.jadeDark.withValues(alpha: 0.25),
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            processing ? Icons.pending_actions_rounded : Icons.verified_rounded,
            size: 18,
            color: processing ? AppCultureColors.rewardText : AppCultureColors.jadeDark,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  processing
                      ? 'Đang trong quá trình hoàn tiền'
                      : 'Đã xử lý hoàn tiền',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                    color: processing
                        ? AppCultureColors.rewardText
                        : AppCultureColors.jadeDark,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  processing
                      ? 'Yêu cầu ${latest.refundCode.isEmpty ? '#${latest.id}' : latest.refundCode} đang được xử lý. '
                          'Bạn có thể theo dõi từng bước trong "Lịch sử xử lý hoàn tiền" bên dưới.'
                      : 'Yêu cầu ${latest.refundCode.isEmpty ? '#${latest.id}' : latest.refundCode} đã được xử lý: '
                          '${latest.statusLabel}.',
                  style: TextStyle(
                    fontSize: 11.5,
                    height: 1.35,
                    color: processing
                        ? AppCultureColors.rewardText
                        : AppCultureColors.jadeDark,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  /// Card "Lịch sử xử lý" — hiển thị ĐẦY ĐỦ mọi bước xử lý của yêu cầu hoàn tiền.
  ///
  /// ⚠️ Thứ tự: CŨ NHẤT Ở TRÊN, MỚI NHẤT Ở DƯỚI (sắp xếp tăng dần theo thời
  /// gian). Mỗi bước admin thực hiện đều được GHI LẠI, không ghi đè bước cũ.
  Widget _buildAuditHistoryCard() {
    // Gom tất cả dòng nhật ký của mọi yêu cầu của đơn, sắp xếp tăng dần.
    final entries = <_AuditEntry>[];
    for (final refund in _refunds) {
      for (final log in refund.auditLogs) {
        entries.add(_AuditEntry(refund: refund, log: log));
      }
    }
    entries.sort((a, b) {
      final ta = a.log.createdAt;
      final tb = b.log.createdAt;
      if (ta == null && tb == null) return a.log.id.compareTo(b.log.id);
      if (ta == null) return 1;
      if (tb == null) return -1;
      final byTime = ta.compareTo(tb);
      return byTime != 0 ? byTime : a.log.id.compareTo(b.log.id);
    });

    if (entries.isEmpty) return const SizedBox.shrink();

    return _card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _CardTitle(
              icon: Icons.history_rounded, text: 'Lịch sử xử lý hoàn tiền'),
          const SizedBox(height: 4),
          const Text(
            'Các bước xử lý được ghi nhận theo thứ tự thời gian — cũ nhất ở trên, mới nhất ở dưới.',
            style: TextStyle(fontSize: 11.5, color: AppCultureColors.textMuted),
          ),
          const SizedBox(height: 14),
          ...entries.asMap().entries.map((e) {
            final isLast = e.key == entries.length - 1;
            return _buildAuditRow(e.value, isLast);
          }),
        ],
      ),
    );
  }

  Widget _buildAuditRow(_AuditEntry entry, bool isLast) {
    final log = entry.log;
    final tone = _auditTone(log.action);

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
                    color: tone.bg,
                    shape: BoxShape.circle,
                  ),
                  child: Icon(tone.icon, size: 11, color: tone.fg),
                ),
                if (!isLast)
                  Expanded(
                    child: Container(
                      width: 2,
                      margin: const EdgeInsets.symmetric(vertical: 3),
                      color: AppCultureColors.border,
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
                    tone.label,
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w800,
                      color: AppCultureColors.textDark,
                    ),
                  ),
                  if (log.detail != null && log.detail!.isNotEmpty) ...[
                    const SizedBox(height: 3),
                    Text(
                      log.detail!,
                      style: const TextStyle(
                        fontSize: 11.5,
                        height: 1.35,
                        color: AppCultureColors.textMuted,
                      ),
                    ),
                  ],
                  if (log.amount > 0) ...[
                    const SizedBox(height: 3),
                    Text(
                      formatVndAmount(log.amount),
                      style: const TextStyle(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w800,
                        color: AppCultureColors.jadeDark,
                      ),
                    ),
                  ],
                  const SizedBox(height: 3),
                  Text(
                    '${entry.refund.refundCode.isEmpty ? 'Yêu cầu #${entry.refund.id}' : entry.refund.refundCode}'
                    '${log.createdAt != null ? ' • ${formatDateTimeVn(log.createdAt)}' : ''}',
                    style: const TextStyle(
                      fontSize: 10.5,
                      color: AppCultureColors.textLight,
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

  /// Nhãn + màu cho một hành động trong nhật ký kiểm toán.
  _AuditTone _auditTone(String? action) {
    switch (action) {
      case 'CREATED':
        return const _AuditTone(
          'Đã gửi yêu cầu hoàn tiền',
          Icons.send_rounded,
          AppCultureColors.oceanDark,
          AppCultureColors.oceanLight,
        );
      case 'APPROVED':
        return const _AuditTone(
          'Quản trị viên đã duyệt yêu cầu',
          Icons.verified_rounded,
          AppCultureColors.jadeDark,
          AppCultureColors.jadeLight,
        );
      case 'REJECTED':
        return const _AuditTone(
          'Yêu cầu bị từ chối',
          Icons.do_not_disturb_rounded,
          AppCultureColors.error,
          AppCultureColors.lacquer50,
        );
      case 'CANCELLED':
        return const _AuditTone(
          'Yêu cầu đã được hủy',
          Icons.cancel_rounded,
          AppCultureColors.error,
          AppCultureColors.lacquer50,
        );
      case 'VNPAY_REQUEST_SENT':
        return const _AuditTone(
          'Đã gửi yêu cầu hoàn tiền tới VNPay',
          Icons.cloud_upload_rounded,
          AppCultureColors.rewardText,
          AppCultureColors.rewardBg,
        );
      case 'VNPAY_RESPONSE':
      case 'VNPAY_STATUS_UPDATED':
        return const _AuditTone(
          'VNPay phản hồi kết quả hoàn tiền',
          Icons.cloud_sync_rounded,
          AppCultureColors.oceanDark,
          AppCultureColors.oceanLight,
        );
      case 'MANUAL_TRANSFER_RECORDED':
        return const _AuditTone(
          'Đã ghi nhận chuyển khoản thủ công',
          Icons.payments_rounded,
          AppCultureColors.jadeDark,
          AppCultureColors.jadeLight,
        );
      case 'MANUAL_TRANSFER_CONFIRMED':
        return const _AuditTone(
          'Đã xác nhận chuyển khoản — hoàn tiền thành công',
          Icons.check_circle_rounded,
          AppCultureColors.jadeDark,
          AppCultureColors.jadeLight,
        );
      case 'STATUS_UPDATED':
        return const _AuditTone(
          'Cập nhật trạng thái yêu cầu',
          Icons.sync_rounded,
          AppCultureColors.textMuted,
          AppCultureColors.surfaceSubtle,
        );
      default:
        return const _AuditTone(
          'Cập nhật yêu cầu hoàn tiền',
          Icons.info_rounded,
          AppCultureColors.textMuted,
          AppCultureColors.surfaceSubtle,
        );
    }
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
        AppCultureColors.lacquer50,
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
          AppCultureColors.lacquer50,
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
        color: AppCultureColors.surface,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: tone.fg.withValues(alpha: 0.35)),
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
    final isStuck = payment.isProcessing;
    final isSuperseded = payment.isSuperseded;
    final isChecking = _checking.contains(payment.id);

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                isSuccess
                    ? Icons.check_circle_rounded
                    : payment.isFailed || payment.isCancelled
                        ? Icons.cancel_rounded
                        : isSuperseded
                            ? Icons.swap_horiz_rounded
                            : Icons.schedule_rounded,
                size: 17,
                color: isSuccess
                    ? AppCultureColors.heritageJade
                    : payment.isFailed || payment.isCancelled
                        ? AppCultureColors.error
                        : isSuperseded
                            ? AppCultureColors.textMuted
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
                    if (isSuperseded) ...[
                      const SizedBox(height: 2),
                      Text(
                        'Giao dịch này đã bị thay thế — đơn hàng đã được thanh toán '
                        'bởi một giao dịch khác.',
                        style: const TextStyle(
                            fontSize: 10.5,
                            color: AppCultureColors.textMuted,
                            height: 1.35),
                      ),
                    ],
                    if (isStuck) ...[
                      const SizedBox(height: 2),
                      Text(
                        'Chưa nhận được xác nhận từ VNPay. Nếu bạn đã thanh toán, hãy kiểm tra lại.',
                        style: const TextStyle(
                            fontSize: 10.5,
                            color: AppCultureColors.textMuted,
                            height: 1.35),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    payment.formattedAmount,
                    style: const TextStyle(
                      fontSize: 12.5,
                      fontWeight: FontWeight.w800,
                      color: AppCultureColors.textDark,
                    ),
                  ),
                  if (isStuck)
                    Padding(
                      padding: const EdgeInsets.only(top: 6),
                      child: _buildRecheckButton(payment, isChecking),
                    ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }

  /// Nút "Kiểm tra lại" cho giao dịch đang kẹt — đồng bộ lại trạng thái từ backend.
  Widget _buildRecheckButton(PaymentModel payment, bool isChecking) {
    return InkWell(
      onTap: isChecking ? null : () => _recheckPayment(payment),
      borderRadius: BorderRadius.circular(9),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: AppCultureColors.heritageJade.withValues(alpha: 0.10),
          borderRadius: BorderRadius.circular(9),
          border: Border.all(
            color: AppCultureColors.heritageJade.withValues(alpha: 0.35),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (isChecking)
              const SizedBox(
                width: 12,
                height: 12,
                child: CircularProgressIndicator(
                  strokeWidth: 1.8,
                  color: AppCultureColors.heritageJade,
                ),
              )
            else
              const Icon(
                Icons.refresh_rounded,
                size: 13,
                color: AppCultureColors.heritageJade,
              ),
            const SizedBox(width: 5),
            Text(
              isChecking ? 'Đang kiểm tra' : 'Kiểm tra lại',
              style: const TextStyle(
                fontSize: 10.5,
                fontWeight: FontWeight.w800,
                color: AppCultureColors.heritageJade,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRefundRow(RefundModel refund) {
    final tone = _refundTone(refund);

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
                  refund.refundCode.isEmpty
                      ? 'Yêu cầu #${refund.id}'
                      : refund.refundCode,
                  style: const TextStyle(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w700,
                    color: AppCultureColors.textDark,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  // ⚠️ Khách KHÔNG chọn nhóm lý do nữa ⇒ `declaredReason` có thể
                  // null khi Admin chưa duyệt ⇒ fallback sang lý do ngắn gọn.
                  refund.approvedReasonName != null
                      ? '${refund.statusLabel} • ${refund.approvedReasonName}'
                      : refund.reasonSummary.isNotEmpty
                          ? '${refund.statusLabel} • ${refund.reasonSummary}'
                          : '${refund.statusLabel} • Chờ quản trị viên phân loại',
                  style: const TextStyle(
                      fontSize: 11, color: AppCultureColors.textMuted),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          Text(
            // ⚠️ Khách KHÔNG chọn nhóm lý do ⇒ chưa có tỷ lệ ⇒ chưa có số tiền
            // đề xuất ⇒ hiển thị "Chờ phân loại" thay vì "0 đ".
            refund.displayAmount != null && refund.displayAmount! > 0
                ? refund.formattedEffectiveAmount
                : 'Chờ phân loại',
            style: TextStyle(
              fontSize: 12.5,
              fontWeight: FontWeight.w800,
              color: refund.displayAmount != null && refund.displayAmount! > 0
                  ? AppCultureColors.textDark
                  : AppCultureColors.textMuted,
            ),
          ),
        ],
      ),
    );
  }

  /// Màu/nhãn/icon của trạng thái một yêu cầu hoàn tiền.
  _AuditTone _refundTone(RefundModel refund) {
    if (refund.isRefunded) {
      return const _AuditTone(
        'Đã hoàn tiền',
        Icons.assignment_turned_in_rounded,
        AppCultureColors.heritageJade,
        AppCultureColors.jadeLight,
      );
    }
    if (refund.isRejected || refund.isFailed) {
      return const _AuditTone(
        'Từ chối',
        Icons.do_not_disturb_rounded,
        AppCultureColors.error,
        AppCultureColors.lacquer50,
      );
    }
    return const _AuditTone(
        'Đang xử lý',
        Icons.pending_actions_rounded,
        AppCultureColors.warning,
        AppCultureColors.rewardBg,
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

/// Một dòng nhật ký kiểm toán kèm yêu cầu hoàn tiền tương ứng.
class _AuditEntry {
  final RefundModel refund;
  final RefundAuditLogModel log;

  const _AuditEntry({required this.refund, required this.log});
}

/// Nhãn + màu của một bước trong lịch sử xử lý.
class _AuditTone {
  final String label;
  final IconData icon;
  final Color fg;
  final Color bg;

  const _AuditTone(this.label, this.icon, this.fg, this.bg);
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
