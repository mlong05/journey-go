import 'dart:async';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/constants/app_colors.dart';
import '../../l10n/locale_controller.dart';
import '../../core/models/booking_model.dart';
import '../../core/services/api_client.dart';
import '../../core/services/booking_service.dart';
import '../../core/services/payment_result_service.dart';
import '../../core/services/payment_service.dart';
import '../../core/services/token_storage.dart';
import '../../core/services/tour_service.dart';
import '../booking/booking_detail_screen.dart';
import '../booking/payment_success_dialog.dart';
import '../journey/journey_screen.dart';
import '../journey/journey_widgets.dart' show PrimaryButton;
import '../rewards/rewards_widgets.dart' show buildRewardsAppBar;
import '../tours/tour_detail_opener.dart';

/// Thanh toán một booking qua VNPay.
///
/// VNPay chặn WebView nên trang thanh toán mở bằng trình duyệt ngoài.
///
/// ── Kết quả thanh toán đến app theo 2 đường ──
///  1. **Deep link** (`journeygo://payment/return`) — VNPay chuyển thẳng trình duyệt
///     về app kèm tham số kết quả ĐÃ KÝ ⇒ `PaymentResultService` gửi lại backend
///     xác minh ⇒ hiện hộp thoại "Thanh toán thành công" NGAY.
///  2. **Polling + QueryDR** (dự phòng) — app tự tra trạng thái booking trên server
///     (IPN / QueryDR) khi đang chờ và mỗi lần quay lại foreground.
///
/// ⇒ Cả hai đường đều dẫn tới cùng một hộp thoại thành công (không hiện trùng).
class BookingCheckoutScreen extends StatefulWidget {
  final int bookingId;

  const BookingCheckoutScreen({super.key, required this.bookingId});

  @override
  State<BookingCheckoutScreen> createState() => _BookingCheckoutScreenState();
}

class _BookingCheckoutScreenState extends State<BookingCheckoutScreen>
    with WidgetsBindingObserver {
  static const _pollInterval = Duration(seconds: 3);
  static const _queryAfter = Duration(seconds: 9);
  static const _giveUpAfter = Duration(minutes: 3);

  /// Mã `vnp_BankCode` của phương thức DUY NHẤT được hỗ trợ:
  /// "Thẻ nội địa và tài khoản ngân hàng".
  static const String domesticCardBankCode = 'VNBANK';

  final BookingService _bookings = BookingService();
  final PaymentService _payments = PaymentService();

  /// Trung tâm xử lý kết quả thanh toán (chủ sở hữu DUY NHẤT của luồng deep link).
  final PaymentResultService _results = PaymentResultService();

  StreamSubscription<PaymentResultEvent>? _resultSub;

  BookingModel? _booking;
  List<PaymentMethodModel> _methods = const [];
  List<PaymentModel> _attempts = const [];

  /// Mã `vnp_BankCode` của phương thức thanh toán được chọn.
  ///
  /// Mặc định `VNBANK` — "Thẻ nội địa và tài khoản ngân hàng" (phương thức DUY NHẤT
  /// dự án hỗ trợ). KHÔNG để null: nếu không gửi `vnp_BankCode`, trang VNPay sẽ mở
  /// trang "chọn phương thức" (có cả QR + thẻ quốc tế) — trái với quy ước đã chốt.
  String? _bankCode = domesticCardBankCode;

  bool _loading = true;
  String? _loadError;

  /// Ảnh bìa tour (tải riêng sau khi có đơn).
  String? _tourCover;
  bool _busy = false;
  String? _notice;
  String? _error;

  bool _awaiting = false; // đã mở VNPay, đang chờ kết quả
  DateTime _awaitStart = DateTime.now();
  bool _queried = false;
  Timer? _clock;
  Timer? _pollTimer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    // Đồng hồ đếm ngược chỉ để hiển thị; hết hạn thật do backend quyết định.
    _clock = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted && _booking?.status == BookingStatus.pendingPayment) setState(() {});
    });
    // Báo cho trung tâm biết màn này đang mở ⇒ màn này (giàu thông tin hơn) được
    // ưu tiên hiện hộp thoại thành công so với `PendingPaymentHost` (generic).
    _results.registerHandler(widget.bookingId);
    _listenResults();
    _load();
  }

  /// Lắng nghe kết quả thanh toán do [PaymentResultService] xác minh.
  ///
  /// Deep link `journeygo://payment/return` từ VNPay ⇒ backend kiểm tra chữ ký ⇒
  /// app hiện hộp thoại "Thanh toán thành công" NGAY (không cần chờ poll).
  void _listenResults() {
    _resultSub = _results.results.listen(_onResult);
  }

  @override
  void dispose() {
    _resultSub?.cancel();
    _results.unregisterHandler(widget.bookingId);
    WidgetsBinding.instance.removeObserver(this);
    _clock?.cancel();
    _pollTimer?.cancel();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // Khách quay lại từ trình duyệt: luôn hỏi lại server, không dựa vào việc bấm Back.
    if (state == AppLifecycleState.resumed && _booking != null) {
      if (_awaiting) {
        _startWaiting();
      } else {
        _refresh();
      }
    }
  }

  Future<void> _load() async {
    try {
      final booking = await _bookings.getById(widget.bookingId);
      final methods = await _payments.getMethods().catchError((_) => <PaymentMethodModel>[]);
      final attempts = await _payments.getByBooking(widget.bookingId).catchError((_) => <PaymentModel>[]);
      if (!mounted) return;
      setState(() {
        _booking = booking;
        _methods = methods;
        _attempts = attempts;
        _loadError = null;
        _loading = false;
      });
      _loadTourCover(booking.tourId);
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _loadError = e.message;
        _loading = false;
      });
    }
  }

  /// Ảnh bìa tour cho thẻ tóm tắt (đơn đặt không kèm ảnh); lỗi thì để ô giữ chỗ.
  Future<void> _loadTourCover(int tourId) async {
    if (_tourCover != null) return;
    try {
      final detail = await TourService().getPublicDetail(tourId);
      if (mounted && detail.coverImageUrl != null) setState(() => _tourCover = detail.coverImageUrl);
    } catch (_) {
      // Không có ảnh vẫn thanh toán bình thường.
    }
  }

  /// Đọc lại booking và các lần thanh toán; lỗi mạng chỉ bỏ qua, không đổi trạng thái.
  Future<BookingModel?> _refresh() async {
    try {
      final booking = await _bookings.getById(widget.bookingId);
      final attempts = await _payments.getByBooking(widget.bookingId).catchError((_) => _attempts);
      if (!mounted) return null;
      setState(() {
        _booking = booking;
        _attempts = attempts;
      });
      return booking;
    } on ApiException {
      return null;
    }
  }

  PaymentModel? get _latestOpenAttempt {
    for (final p in _attempts) {
      if (!PaymentStatus.isFinal(p.status)) return p;
    }
    return null;
  }

  /// Mở hành trình — nhưng nếu ngày trải nghiệm còn ở tương lai thì mở màn CHI TIẾT
  /// TOUR (không vào hành trình vì backend đang khoá tour tới ngày đó).
  void _startExperience() {
    final booking = _booking!;
    if (booking.isTourLocked) {
      openTourDetailScreen(
        context,
        tourId: booking.tourId,
        bookedBooking: booking,
      );
      return;
    }
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => JourneyScreen(tourId: booking.tourId, bookingId: booking.id),
      ),
    );
  }

  /// Xử lý kết quả thanh toán do [PaymentResultService] xác minh.
  ///
  /// ⚠️ Chỉ xử lý khi kết quả thuộc đúng booking của màn hình này — tránh bắt
  /// nhầm kết quả của một giao dịch khác (app có thể đang mở nhiều luồng).
  Future<void> _onResult(PaymentResultEvent event) async {
    if (!mounted) return;
    if (event.bookingId != null && event.bookingId != widget.bookingId) return;

    if (event.needsSync) {
      // Deep link không có chữ ký ⇒ tự tra cứu (polling + QueryDR).
      if (_awaiting) _startWaiting();
      return;
    }

    if (!event.isFinal) return;

    if (event.isSuccess) {
      await _handlePaymentSuccess();
      return;
    }

    // Thất bại / đã hủy ⇒ dừng chờ và báo lỗi (không hiện hộp thoại thành công).
    _stopWaiting();
    if (event.message.isNotEmpty && mounted) {
      setState(() => _error = event.message);
    }
  }

  /// Hiện hộp thoại "Thanh toán thành công" + đánh dấu đã xử lý.
  ///
  /// ⚠️ Dùng chung cho CẢ HAI đường (deep link và polling) ⇒ [claimDialog] bảo đảm
  /// chỉ MỘT hộp thoại cho mỗi booking, dù hai đường cùng kích hoạt.
  Future<void> _handlePaymentSuccess() async {
    _stopWaiting();
    await TokenStorage.clearPendingPayment(widget.bookingId);
    await _refresh();
    if (!mounted) return;

    // Không có quyền ⇒ nơi khác đã hiện hộp thoại ⇒ im lặng, không hiện trùng.
    if (!_results.claimDialog(widget.bookingId)) return;

    await showPaymentSuccessDialog(
      context,
      bookingCode: _booking?.bookingCode,
      amount: _booking?.totalAmount,
      onViewBooking: () {
        if (!mounted) return;
        // ⚠️ `popToHomeOnBack: true` ⇒ bấm nút quay lại ở chi tiết đơn sẽ quay
        // thẳng về Trang chủ, KHÔNG quay lại màn đặt tour / checkout đã xong.
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(
            builder: (_) => BookingDetailScreen(
              bookingId: widget.bookingId,
              popToHomeOnBack: true,
            ),
          ),
        );
      },
    );
  }

  Future<void> _pay() async {
    setState(() {
      _busy = true;
      _error = null;
      _notice = null;
    });
    try {
      final init = await _payments.init(widget.bookingId, bankCode: _bankCode);
      final paymentUrl = init.paymentUrl;
      if (paymentUrl == null || paymentUrl.isEmpty) {
        throw ApiException(appL10n.coNoPaymentUrl);
      }

      // Nhớ giao dịch đang chờ ⇒ nếu hệ điều KILL app trong lúc khách ở trình
      // duyệt, mở lại app vẫn tra được kết quả (PendingPaymentGuard).
      await TokenStorage.savePendingPayment(
        bookingId: widget.bookingId,
        paymentId: init.paymentId,
        paymentUrl: init.paymentUrl,
      );

      final opened = await launchUrl(
        Uri.parse(paymentUrl), // URL đã ký: không sửa tham số
        mode: LaunchMode.externalApplication,
      );
      if (!mounted) return;
      if (!opened) {
        setState(() => _error = context.l10n.coOpenPaymentFailed);
        return;
      }
      _startWaiting();
    } on ApiException catch (e) {
      if (e.statusCode == 409) {
        // Lần thử trước chưa rõ kết quả: xác minh thay vì báo lỗi.
        await _resolveUnclear();
      } else if (mounted) {
        setState(() => _error = e.message);
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _resolveUnclear() async {
    if (mounted) setState(() => _notice = context.l10n.coVerifyingPrevious);
    await _queryLatest();
    await _refresh();
    if (!mounted) return;
    if (_booking?.status == BookingStatus.pendingPayment) {
      _startWaiting();
    } else {
      setState(() => _notice = null);
    }
  }

  Future<void> _queryLatest() async {
    try {
      final attempts = await _payments.getByBooking(widget.bookingId, size: 1);
      final latest = attempts.isEmpty ? null : attempts.first;
      if (latest != null && !PaymentStatus.isFinal(latest.status)) {
        await _payments.query(latest.id); // UNKNOWN thì tiếp tục chờ
      }
    } on ApiException {
      // lỗi mạng: tiếp tục poll
    }
  }

  void _startWaiting() {
    _pollTimer?.cancel();
    _awaiting = true;
    _awaitStart = DateTime.now();
    _queried = false;
    if (mounted) {
      setState(() => _notice = context.l10n.coAwaitingConfirmation);
    }
    _poll();
  }

  Future<void> _poll() async {
    final booking = await _refresh();
    if (!mounted || !_awaiting) return;

    if (booking != null && booking.status != BookingStatus.pendingPayment) {
      _stopWaiting();
      // Backend đã xác nhận (qua IPN / QueryDR) ⇒ hiện hộp thoại thành công.
      if (booking.isPaid) await _handlePaymentSuccess();
      return;
    }
    final elapsed = DateTime.now().difference(_awaitStart);
    if (elapsed >= _giveUpAfter) {
      _awaiting = false;
      setState(() => _notice = context.l10n.coNoResultYet);
      return;
    }
    if (!_queried && elapsed >= _queryAfter) {
      _queried = true;
      await _queryLatest();
      if (!mounted || !_awaiting) return;
    }
    _pollTimer = Timer(_pollInterval, _poll);
  }

  void _stopWaiting() {
    _pollTimer?.cancel();
    _awaiting = false;
    if (mounted) setState(() => _notice = null);
  }

  Future<void> _cancel() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(ctx.l10n.coCancelTitle),
        content: Text(ctx.l10n.coCancelMessage),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(ctx.l10n.coKeep)),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: Text(ctx.l10n.coCancelBooking)),
        ],
      ),
    );
    if (confirmed != true) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final booking = await _bookings.cancel(widget.bookingId, reason: 'Khách chủ động hủy trước khi thanh toán');
      if (!mounted) return;
      _stopWaiting();
      setState(() => _booking = booking);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Duration get _remaining {
    final deadline = _booking?.paymentDeadline;
    if (deadline == null) return Duration.zero;
    final left = deadline.difference(DateTime.now());
    return left.isNegative ? Duration.zero : left;
  }

  String get _countdownLabel {
    final s = _remaining.inSeconds;
    String two(int n) => n.toString().padLeft(2, '0');
    return '${two(s ~/ 60)}:${two(s % 60)}';
  }

  /// Đơn còn đang giữ chỗ (chưa thanh toán, còn hạn) ⇒ thoát cần hỏi lại.
  bool get _holdingSlot {
    final b = _booking;
    return b != null && b.isPendingPayment && b.isPaymentWindowOpen;
  }

  /// Bấm quay lại khi đang giữ chỗ: thoát KHÔNG hủy đơn — nói rõ chỗ được giữ đến khi nào
  /// và quay lại thanh toán ở đâu, kèm lựa chọn hủy đơn ngay.
  Future<void> _confirmLeave() async {
    final deadline = _booking?.paymentDeadline?.toLocal();
    String two(int n) => n.toString().padLeft(2, '0');
    final l10n = context.l10n;
    final until = deadline == null ? l10n.coHoldEnd : '${two(deadline.hour)}:${two(deadline.minute)}';
    final choice = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(l10n.coLeaveTitle),
        content: Text(
          l10n.coLeaveMessage(until, _countdownLabel),
          style: const TextStyle(height: 1.45),
        ),
        actionsOverflowDirection: VerticalDirection.up,
        actionsOverflowButtonSpacing: 4,
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, 'cancel'),
            style: TextButton.styleFrom(foregroundColor: AppCultureColors.lacquer),
            child: Text(l10n.coCancelBooking),
          ),
          TextButton(onPressed: () => Navigator.pop(ctx, 'leave'), child: Text(l10n.coLeaveKeep)),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, 'stay'),
            style: FilledButton.styleFrom(backgroundColor: AppCultureColors.heritageJade),
            child: Text(l10n.coStay),
          ),
        ],
      ),
    );
    if (!mounted || choice == null || choice == 'stay') return;
    if (choice == 'cancel') {
      setState(() {
        _busy = true;
        _error = null;
      });
      try {
        await _bookings.cancel(widget.bookingId, reason: 'Khách chủ động hủy trước khi thanh toán');
      } on ApiException catch (e) {
        if (mounted) {
          setState(() {
            _busy = false;
            _error = e.message;
          });
        }
        return;
      }
      _stopWaiting();
    }
    if (mounted) Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: !_holdingSlot,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _confirmLeave();
      },
      child: _buildScaffold(context),
    );
  }

  /// Đơn đang chờ thanh toán và còn hạn giữ chỗ.
  bool _canPay(BookingModel booking) =>
      booking.status == BookingStatus.pendingPayment && _remaining != Duration.zero;

  Widget _buildScaffold(BuildContext context) {
    final booking = _booking;
    final showPayBar = !_loading && _loadError == null && booking != null && _canPay(booking);
    return Scaffold(
      backgroundColor: AppCultureColors.background,
      appBar: buildRewardsAppBar(context, context.l10n.coTitle),
      bottomNavigationBar: showPayBar ? _buildPayBar(booking) : null,
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppCultureColors.heritageJade))
          : _loadError != null || _booking == null
              ? _buildLoadError()
              : RefreshIndicator(
                  color: AppCultureColors.heritageJade,
                  onRefresh: _refresh,
                  child: ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.all(16),
                    children: _buildContent(_booking!),
                  ),
                ),
    );
  }

  Widget _buildLoadError() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(_loadError ?? context.l10n.coNotFound, textAlign: TextAlign.center),
            const SizedBox(height: 12),
            OutlinedButton(
              onPressed: () {
                setState(() => _loading = true);
                _load();
              },
              child: Text(context.l10n.commonRetry),
            ),
          ],
        ),
      ),
    );
  }

  List<Widget> _buildContent(BookingModel booking) {
    final paid = booking.isPaid;
    final pending = booking.status == BookingStatus.pendingPayment;
    final expired = pending && _remaining == Duration.zero;
    final canPay = pending && !expired;

    final guests = booking.passengers.isNotEmpty ? booking.passengers.length : booking.slotCount;
    final l10n = context.l10n;
    return [
      // ── Tóm tắt: ảnh tour, tên, ngày, số khách, mã đơn + trạng thái ──
      _card(
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(14),
              child: SizedBox(
                width: 84,
                height: 84,
                child: _tourCover == null
                    ? const DecoratedBox(
                        decoration: BoxDecoration(gradient: LinearGradient(colors: AppCultureColors.brandGradient)),
                        child: Icon(Icons.landscape_rounded, color: Colors.white70, size: 34),
                      )
                    : Image.network(
                        _tourCover!,
                        fit: BoxFit.cover,
                        errorBuilder: (_, _, _) => const ColoredBox(color: AppCultureColors.surfaceSubtle),
                      ),
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    booking.tourTitle,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        fontSize: 16, height: 1.3, fontWeight: FontWeight.w800, color: AppCultureColors.textDark),
                  ),
                  const SizedBox(height: 6),
                  _infoLine(Icons.event_rounded, formatDay(booking.experienceDate)),
                  if (guests > 0) ...[
                    const SizedBox(height: 3),
                    _infoLine(Icons.group_rounded, l10n.coGuestCount(guests)),
                  ],
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 4,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      _badge(BookingStatus.label(expired ? BookingStatus.expired : booking.status), paid: paid),
                      Text(booking.bookingCode,
                          style: const TextStyle(fontSize: 11.5, color: AppCultureColors.textLight)),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
      if (pending) _buildHoldBar(expired),
      // ── Chi tiết thanh toán ──
      _card(
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _cardTitle(l10n.coPaymentDetails),
            const SizedBox(height: 12),
            _amountRow(
              guests > 0 ? l10n.coTourPriceGuests(guests) : l10n.coTourPrice,
              formatMoney(booking.hasVoucher ? booking.originalAmount : booking.totalAmount),
            ),
            if (booking.hasVoucher) ...[
              const SizedBox(height: 8),
              _amountRow(
                l10n.coDiscount(booking.appliedVoucherCode ?? ''),
                '-${formatMoney(booking.discountAmount)}',
                valueColor: AppCultureColors.price,
              ),
            ],
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 12),
              child: Divider(height: 1, color: AppCultureColors.borderLight),
            ),
            Row(
              children: [
                Expanded(
                  child: Text(l10n.tdTotalPayment,
                      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: AppCultureColors.textDark)),
                ),
                Text(
                  formatMoney(booking.totalAmount),
                  style: const TextStyle(fontSize: 21, fontWeight: FontWeight.w800, color: AppCultureColors.price),
                ),
              ],
            ),
          ],
        ),
      ),
      if (paid) _buildPaidCard(booking),
      if (booking.status == BookingStatus.cancelled)
        _message(l10n.coCancelled, AppCultureColors.surfaceSubtle, AppCultureColors.textMuted),
      if (_notice != null) _message(_notice!, AppCultureColors.oceanLight, AppCultureColors.oceanDark),
      if (_error != null) _message(_error!, AppCultureColors.lacquer100, AppCultureColors.error),
      if (canPay) ...[
        _card(_buildMethods()),
        Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.lock_rounded, size: 14, color: AppCultureColors.textLight),
              const SizedBox(width: 6),
              Flexible(
                child: Text(
                  l10n.coSecureNote,
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 12, color: AppCultureColors.textLight),
                ),
              ),
            ],
          ),
        ),
        if (_latestOpenAttempt != null && !_awaiting)
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: OutlinedButton(
              onPressed: _busy ? null : _resolveUnclear,
              style: OutlinedButton.styleFrom(shape: const StadiumBorder()),
              child: Text(l10n.coCheckPrevious),
            ),
          ),
        TextButton(
          onPressed: _busy ? null : _cancel,
          style: TextButton.styleFrom(foregroundColor: AppCultureColors.textMuted),
          child: Text(l10n.coCancelBookingLong),
        ),
      ],
      if (_attempts.isNotEmpty) ...[
        const SizedBox(height: 8),
        _card(Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(l10n.coAttempts, style: const TextStyle(fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            for (final p in _attempts)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(p.txnRef ?? '—',
                              style: const TextStyle(fontSize: 11, color: AppCultureColors.textMuted)),
                          Text(formatDateTime(p.createdAt), style: const TextStyle(fontSize: 12)),
                          if (p.duplicatePayment)
                            Text(l10n.coDuplicateAttempt,
                                style: const TextStyle(fontSize: 11, color: AppCultureColors.amberDark)),
                        ],
                      ),
                    ),
                    _badge(PaymentStatus.label(p.status), paid: p.status == PaymentStatus.success),
                  ],
                ),
              ),
          ],
        )),
      ],
    ];
  }

  /// Đơn đã thanh toán: nút vào thẳng hành trình trải nghiệm.
  Widget _buildPaidCard(BookingModel booking) {
    return _card(
      Column(
        children: [
          Container(
            width: 72,
            height: 72,
            decoration: const BoxDecoration(shape: BoxShape.circle, color: AppCultureColors.jadeLight),
            child: const Icon(Icons.check_rounded, size: 42, color: AppCultureColors.heritageJade),
          ),
          const SizedBox(height: 12),
          Text(context.l10n.paySuccessTitle,
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: AppCultureColors.textDark)),
          const SizedBox(height: 6),
          Text(
            context.l10n.coPaidMessage,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 13, height: 1.45, color: AppCultureColors.textMuted),
          ),
          const SizedBox(height: 16),
          PrimaryButton(
            // Ngày trải nghiệm còn ở tương lai ⇒ đếm ngược thay cho "Bắt đầu trải nghiệm".
            label: booking.isTourLocked
                ? context.l10n.tripCountdown(booking.daysUntilStart)
                : context.l10n.tdStartExperience,
            icon: booking.isTourLocked ? Icons.schedule_rounded : Icons.explore_rounded,
            onPressed: _startExperience,
          ),
        ],
      ),
    );
  }

  Widget _buildMethods() {
    // Chỉ hiển thị phương thức DUY NHẤT được hỗ trợ:
    // "Thẻ nội địa và tài khoản ngân hàng" (DOMESTIC_CARD / VNBANK).
    final visible = _methods
        .where((m) => m.bankCode == domesticCardBankCode)
        .toList(growable: false);

    // Nhãn phương thức từ backend là tiếng Việt ⇒ chỉ dùng khi app đang để tiếng Việt.
    final l10n = context.l10n;
    final useServerText = visible.isNotEmpty && l10n.localeName == 'vi';
    final label = useServerText ? visible.first.label : l10n.coMethodDomestic;
    final description = useServerText ? visible.first.description : l10n.coMethodDomesticDesc;

    final selected = _bankCode == domesticCardBankCode;
    return RadioGroup<String?>(
      groupValue: _bankCode,
      // `RadioGroup.onChanged` bắt buộc khác null ⇒ khi đang bận ta bỏ qua.
      onChanged: (v) {
        if (_busy) return;
        setState(() => _bankCode = v);
      },
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _cardTitle(l10n.coChooseMethod),
          const SizedBox(height: 12),
          // Thẻ phương thức: viền xanh ngọc khi đang chọn (chỉ có 1 phương thức được hỗ trợ)
          Material(
            color: selected ? AppCultureColors.jadeLight.withValues(alpha: 0.6) : Colors.white,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
              side: BorderSide(
                color: selected ? AppCultureColors.brand : AppCultureColors.border,
                width: selected ? 1.6 : 1,
              ),
            ),
            child: InkWell(
              borderRadius: BorderRadius.circular(16),
              onTap: _busy ? null : () => setState(() => _bankCode = domesticCardBankCode),
              child: Padding(
                padding: const EdgeInsets.fromLTRB(4, 12, 14, 12),
                child: Row(
                  children: [
                    Radio<String?>(
                      value: domesticCardBankCode,
                      enabled: !_busy,
                      activeColor: AppCultureColors.heritageJade,
                    ),
                    Container(
                      width: 42,
                      height: 42,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppCultureColors.border),
                      ),
                      child: const Icon(Icons.account_balance_rounded, color: AppCultureColors.heritageJade, size: 22),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(label,
                              style: const TextStyle(
                                  fontWeight: FontWeight.w800, fontSize: 14, color: AppCultureColors.textDark)),
                          const SizedBox(height: 2),
                          Text(description,
                              style: const TextStyle(fontSize: 12, height: 1.35, color: AppCultureColors.textMuted)),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// Thanh dưới cùng: nút thanh toán rộng hết bề ngang, ghi rõ số tiền.
  Widget _buildPayBar(BookingModel booking) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(22)),
        boxShadow: [BoxShadow(color: Color(0x140F172A), blurRadius: 20, offset: Offset(0, -6))],
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
          child: FilledButton(
            onPressed: _busy ? null : _pay,
            style: FilledButton.styleFrom(
              backgroundColor: AppCultureColors.heritageJade,
              minimumSize: const Size.fromHeight(54),
              shape: const StadiumBorder(),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                if (_busy)
                  const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2.2, color: Colors.white),
                  )
                else
                  const Icon(Icons.lock_rounded, size: 18),
                const SizedBox(width: 8),
                Flexible(
                  child: Text(
                    _busy ? context.l10n.coProcessing : context.l10n.coPayAmount(formatMoney(booking.totalAmount)),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  /// Thanh đếm ngược giữ chỗ (hết hạn thì xám).
  Widget _buildHoldBar(bool expired) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
      decoration: BoxDecoration(
        color: expired ? AppCultureColors.surfaceSubtle : AppCultureColors.coralTint,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        children: [
          Icon(expired ? Icons.timer_off_rounded : Icons.timer_rounded,
              size: 18, color: expired ? AppCultureColors.textMuted : AppCultureColors.coralDark),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              expired ? context.l10n.coExpired : context.l10n.coHoldCountdown(_countdownLabel),
              style: TextStyle(
                fontWeight: FontWeight.w700,
                color: expired ? AppCultureColors.textMuted : AppCultureColors.coralDark,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _cardTitle(String text) => Text(
        text,
        style: const TextStyle(fontSize: 15.5, fontWeight: FontWeight.w800, color: AppCultureColors.textDark),
      );

  Widget _infoLine(IconData icon, String text) => Row(
        children: [
          Icon(icon, size: 14, color: AppCultureColors.textLight),
          const SizedBox(width: 5),
          Expanded(
            child: Text(text,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 13, color: AppCultureColors.textMuted)),
          ),
        ],
      );

  Widget _amountRow(String label, String value, {Color valueColor = AppCultureColors.textDark}) => Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Text(label, style: const TextStyle(fontSize: 14, color: AppCultureColors.textMuted)),
          ),
          const SizedBox(width: 12),
          Text(value, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: valueColor)),
        ],
      );

  Widget _card(Widget child) => Container(
        width: double.infinity,
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          boxShadow: AppCultureColors.softShadow,
        ),
        child: child,
      );

  Widget _message(String text, Color background, Color foreground) => Container(
        width: double.infinity,
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: background, borderRadius: BorderRadius.circular(14)),
        child: Text(text, style: TextStyle(color: foreground, fontSize: 13, height: 1.4)),
      );

  Widget _badge(String text, {bool paid = false}) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: paid ? AppCultureColors.jadeLight : AppCultureColors.surfaceSubtle,
          borderRadius: BorderRadius.circular(10),
        ),
        child: Text(
          text,
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            color: paid ? AppCultureColors.jadeDark : AppCultureColors.textMuted,
          ),
        ),
      );
}
