import 'dart:async';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/constants/api_constants.dart';
import '../../core/constants/app_colors.dart';
import '../../core/models/booking_model.dart';
import '../../core/services/api_client.dart';
import '../../core/services/booking_service.dart';
import '../../core/services/mock_payment_store.dart';
import '../../core/services/payment_result_service.dart';
import '../../core/services/payment_service.dart';
import '../../core/services/token_storage.dart';
import '../booking/booking_detail_screen.dart';
import '../booking/payment_success_dialog.dart';
import '../journey/journey_screen.dart';
import '../journey/journey_widgets.dart' show PrimaryButton;
import '../rewards/rewards_widgets.dart' show buildRewardsAppBar;

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
  bool _busy = false;
  String? _notice;
  String? _error;

  // Chỉ dùng khi ApiConstants.mockPayment bật: coi như đã thanh toán, server không đổi.
  bool _mockPaid = false;

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
      final mockPaid = ApiConstants.mockPayment && (await MockPaymentStore.paidIds()).contains(widget.bookingId);
      if (!mounted) return;
      setState(() {
        _mockPaid = mockPaid;
        _booking = booking;
        _methods = methods;
        _attempts = attempts;
        _loadError = null;
        _loading = false;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _loadError = e.message;
        _loading = false;
      });
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

  /// Thanh toán giả lập (chỉ khi bật cờ dev): chờ một chút rồi coi như thành công.
  Future<void> _mockPay() async {
    setState(() {
      _busy = true;
      _error = null;
      _notice = 'Đang xử lý thanh toán (giả lập)...';
    });
    await Future<void>.delayed(const Duration(milliseconds: 1600));
    await MockPaymentStore.markPaid(widget.bookingId);
    if (!mounted) return;
    setState(() {
      _mockPaid = true;
      _busy = false;
      _notice = null;
    });
  }

  void _startExperience() {
    final booking = _booking!;
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
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(
            builder: (_) => BookingDetailScreen(bookingId: widget.bookingId),
          ),
        );
      },
    );
  }

  Future<void> _pay() async {
    if (ApiConstants.mockPayment) return _mockPay();
    setState(() {
      _busy = true;
      _error = null;
      _notice = null;
    });
    try {
      final init = await _payments.init(widget.bookingId, bankCode: _bankCode);
      final paymentUrl = init.paymentUrl;
      if (paymentUrl == null || paymentUrl.isEmpty) {
        throw const ApiException('Máy chủ không trả về đường dẫn thanh toán.');
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
        setState(() => _error = 'Không mở được trang thanh toán. Vui lòng thử lại.');
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
    if (mounted) setState(() => _notice = 'Giao dịch trước đang được xác minh với VNPay...');
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
      setState(() => _notice = 'Đang chờ xác nhận thanh toán. Sau khi thanh toán xong, hãy quay lại ứng dụng.');
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
      setState(() => _notice =
          'Chưa nhận được kết quả từ VNPay. Tiền của bạn chưa bị mất, hãy kiểm tra lại mục "Đơn của tôi" sau ít phút.');
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
        title: const Text('Hủy đơn đặt?'),
        content: const Text('Chỗ đã giữ sẽ được trả lại.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Giữ lại')),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Hủy đơn')),
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppCultureColors.background,
      appBar: buildRewardsAppBar(context, 'Thanh toán'),
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
            Text(_loadError ?? 'Không tìm thấy đơn đặt.', textAlign: TextAlign.center),
            const SizedBox(height: 12),
            OutlinedButton(
              onPressed: () {
                setState(() => _loading = true);
                _load();
              },
              child: const Text('Thử lại'),
            ),
          ],
        ),
      ),
    );
  }

  List<Widget> _buildContent(BookingModel booking) {
    final paid = booking.isPaid || _mockPaid;
    final pending = booking.status == BookingStatus.pendingPayment && !_mockPaid;
    final expired = pending && _remaining == Duration.zero;
    final canPay = pending && !expired;

    return [
      _card(
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(booking.bookingCode,
                    style: const TextStyle(fontSize: 12, color: AppCultureColors.textMuted)),
                _badge(
                    BookingStatus.label(_mockPaid
                        ? BookingStatus.confirmed
                        : (expired ? BookingStatus.expired : booking.status)),
                    paid: paid),
              ],
            ),
            const SizedBox(height: 6),
            Text(booking.tourTitle,
                style: const TextStyle(
                    fontSize: 17, fontWeight: FontWeight.w700, color: AppCultureColors.textDark)),
            const SizedBox(height: 10),
            Text('Ngày trải nghiệm: ${formatDay(booking.experienceDate)}'),
            const SizedBox(height: 4),
            Text(formatMoney(booking.totalAmount),
                style: const TextStyle(
                    fontSize: 22, fontWeight: FontWeight.w700, color: AppCultureColors.jadeDark)),
            if (pending) ...[
              const SizedBox(height: 12),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                decoration: BoxDecoration(
                  color: expired ? AppCultureColors.surfaceSubtle : AppCultureColors.rewardBg,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  expired
                      ? 'Đã quá hạn thanh toán. Chỗ giữ sẽ được giải phóng.'
                      : 'Giữ chỗ còn $_countdownLabel',
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    color: expired ? AppCultureColors.textMuted : AppCultureColors.rewardText,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
      if (paid) _buildPaidCard(booking),
      if (booking.status == BookingStatus.cancelled)
        _message('Đơn đã được hủy.', AppCultureColors.surfaceSubtle, AppCultureColors.textMuted),
      if (_notice != null) _message(_notice!, AppCultureColors.oceanLight, AppCultureColors.oceanDark),
      if (_error != null) _message(_error!, const Color(0xFFFEE2E2), AppCultureColors.error),
      if (canPay) ...[
        _card(_buildMethods()),
        if (_latestOpenAttempt != null && !_awaiting)
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: OutlinedButton(
              onPressed: _busy ? null : _resolveUnclear,
              child: const Text('Kiểm tra kết quả giao dịch trước'),
            ),
          ),
        FilledButton(
          onPressed: _busy ? null : _pay,
          style: FilledButton.styleFrom(
            backgroundColor: AppCultureColors.heritageJade,
            minimumSize: const Size.fromHeight(52),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          ),
          child: Text(
            _busy
                ? 'Đang xử lý...'
                : 'Thanh toán ${formatMoney(booking.totalAmount)}${ApiConstants.mockPayment ? ' (giả lập)' : ''}',
            style: const TextStyle(fontWeight: FontWeight.w700),
          ),
        ),
        const SizedBox(height: 8),
        TextButton(onPressed: _busy ? null : _cancel, child: const Text('Hủy đơn đặt')),
      ],
      if (_attempts.isNotEmpty) ...[
        const SizedBox(height: 8),
        _card(Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Các lần thanh toán', style: TextStyle(fontWeight: FontWeight.w700)),
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
                            const Text('Giao dịch trùng với một giao dịch đã thanh toán',
                                style: TextStyle(fontSize: 11, color: AppCultureColors.amberDark)),
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
          const Text('Thanh toán thành công',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: AppCultureColors.textDark)),
          const SizedBox(height: 6),
          Text(
            _mockPaid
                ? 'Đơn được ghi nhận thanh toán giả lập để thử trải nghiệm.'
                : 'Đơn đặt của bạn đã được xác nhận. Chúc bạn có chuyến đi đầy cảm hứng!',
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 13, height: 1.45, color: AppCultureColors.textMuted),
          ),
          const SizedBox(height: 16),
          PrimaryButton(
            label: 'Bắt đầu trải nghiệm',
            icon: Icons.explore_rounded,
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

    final label = visible.isNotEmpty
        ? visible.first.label
        : 'Thẻ nội địa và tài khoản ngân hàng';
    final description = visible.isNotEmpty
        ? visible.first.description
        : 'Thanh toán bằng thẻ ATM nội địa hoặc tài khoản ngân hàng '
            '(Internet Banking, Mobile Banking của các ngân hàng Việt Nam).';

    // Material trong suốt: RadioListTile vẽ hiệu ứng chạm lên Material gần nhất,
    // nếu không sẽ bị nền trắng của thẻ che mất.
    return RadioGroup<String?>(
      groupValue: _bankCode,
      // `RadioGroup.onChanged` bắt buộc khác null ⇒ khi đang bận ta bỏ qua,
      // còn `RadioListTile.enabled = !_busy` đã lo việc khoá thao tác.
      onChanged: (v) {
        if (_busy) return;
        setState(() => _bankCode = v);
      },
      child: Material(
        type: MaterialType.transparency,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Phương thức thanh toán',
                style: TextStyle(fontWeight: FontWeight.w700)),
            const SizedBox(height: 2),
            const Text(
              'Thanh toán an toàn qua cổng VNPay.',
              style: TextStyle(fontSize: 12, color: AppCultureColors.textMuted),
            ),
            const SizedBox(height: 6),
            RadioListTile<String?>(
              value: domesticCardBankCode,
              enabled: !_busy,
              activeColor: AppCultureColors.heritageJade,
              contentPadding: EdgeInsets.zero,
              title: Text(
                label,
                style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
              ),
              subtitle: Text(
                description,
                style: const TextStyle(fontSize: 12),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _card(Widget child) => Container(
        width: double.infinity,
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppCultureColors.border),
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
