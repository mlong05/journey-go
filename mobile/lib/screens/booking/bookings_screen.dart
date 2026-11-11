/// Màn "Đơn đặt tour" — màn DUY NHẤT cho đơn đặt tour & vé trên mobile
/// (Tài khoản → Đơn đặt tour / Ví vé, và khi chạm thông báo về đơn đặt).
///
/// Liệt kê booking của người dùng từ `GET /bookings/my`, có bộ lọc theo trạng thái:
///  • Tất cả / Chờ thanh toán / Đã xác nhận / Đã hoàn thành / Đã hủy
///
/// Mỗi thẻ đơn cho phép:
///  • Thanh toán tiếp (nếu còn trong hạn 10 phút) → `BookingCheckoutScreen` (cùng luồng với lúc đặt tour).
///  • Vào trải nghiệm (vé đã thanh toán) → `JourneyScreen`.
///  • Xem chi tiết (mã QR, hoàn tiền) → `BookingDetailScreen`.
/// Nút "Lịch sử giao dịch" trên thanh tiêu đề liệt kê các lần thanh toán.
library;

import 'package:flutter/material.dart';

import '../../core/constants/api_constants.dart';
import '../../core/constants/app_colors.dart';
import '../../core/models/booking_model.dart';
import '../../core/services/api_client.dart';
import '../../core/services/booking_service.dart';
import '../../core/services/mock_payment_store.dart';
import '../../core/services/payment_service.dart';
import '../bookings/booking_checkout_screen.dart';
import '../journey/journey_screen.dart';
import 'booking_detail_screen.dart';

class BookingsScreen extends StatefulWidget {
  /// Bộ lọc mở sẵn, vd 'CONFIRMED' khi vào từ "Ví vé".
  final String initialFilter;

  const BookingsScreen({super.key, this.initialFilter = 'ALL'});

  @override
  State<BookingsScreen> createState() => _BookingsScreenState();
}

class _BookingsScreenState extends State<BookingsScreen> {
  final BookingService _service = BookingService();

  List<BookingModel> _bookings = [];
  bool _loading = true;
  String _error = '';
  late String _filter = widget.initialFilter;

  /// Đơn đã "thanh toán giả lập" (chỉ khi bật MOCK_PAYMENT khi dev): coi như vé đã thanh toán.
  Set<int> _mockPaid = const {};

  static const List<String> _filters = [
    'ALL',
    'PENDING_PAYMENT',
    'CONFIRMED',
    'COMPLETED',
    'CANCELLED',
  ];

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
      final list = await _service.getMyBookings(page: 0, size: 50);
      final mockPaid = ApiConstants.mockPayment ? await MockPaymentStore.paidIds() : <int>{};
      if (!mounted) return;
      setState(() {
        _bookings = list;
        _mockPaid = mockPaid;
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
        _error = 'Không thể tải danh sách đơn.';
        _loading = false;
      });
    }
  }

  /// Đơn thanh toán giả lập vẫn "Chờ thanh toán" ở server nhưng hiển thị như đã xác nhận.
  String _statusOf(BookingModel b) =>
      b.isPendingPayment && _mockPaid.contains(b.id) ? BookingStatus.confirmed : b.status;

  /// Vé dùng được: đã thanh toán (thật hoặc giả lập khi dev) → vào trải nghiệm được.
  bool _isTicket(BookingModel b) => b.isPaid || _mockPaid.contains(b.id);

  List<BookingModel> get _filtered {
    if (_filter == 'ALL') return _bookings;
    return _bookings.where((b) => _statusOf(b) == _filter).toList();
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
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: const Text(
          'Đơn đặt tour',
          style: TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.w800,
            color: AppCultureColors.textDark,
          ),
        ),
        actions: [
          IconButton(
            tooltip: 'Lịch sử giao dịch',
            onPressed: _showPayments,
            icon: const Icon(Icons.receipt_long_rounded, size: 20, color: AppCultureColors.textDark),
          ),
          IconButton(
            tooltip: 'Làm mới',
            onPressed: _load,
            icon: const Icon(Icons.refresh_rounded,
                size: 20, color: AppCultureColors.textDark),
          ),
        ],
      ),
      body: Column(
        children: [
          // ── Bộ lọc ──
          Container(
            color: Colors.white,
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: _filters.map((f) {
                  final isSelected = _filter == f;
                  final count = f == 'ALL'
                      ? _bookings.length
                      : _bookings.where((b) => _statusOf(b) == f).length;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: GestureDetector(
                      onTap: () => setState(() => _filter = f),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 8),
                        decoration: BoxDecoration(
                          color: isSelected
                              ? AppCultureColors.heritageJade
                              : AppCultureColors.surfaceSubtle,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: isSelected
                                ? AppCultureColors.heritageJade
                                : AppCultureColors.border,
                          ),
                        ),
                        child: Text(
                          '${_filterLabel(f)} ($count)',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: isSelected ? Colors.white : AppCultureColors.textDark,
                          ),
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
          ),

          Expanded(
            child: _loading
                ? const Center(
                    child: CircularProgressIndicator(
                        color: AppCultureColors.heritageJade),
                  )
                : _error.isNotEmpty
                    ? _buildErrorState()
                    : RefreshIndicator(
                        onRefresh: _load,
                        color: AppCultureColors.heritageJade,
                        child: _filtered.isEmpty
                            ? _buildEmptyState()
                            : ListView.builder(
                                padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
                                itemCount: _filtered.length,
                                itemBuilder: (ctx, i) =>
                                    _buildBookingCard(_filtered[i]),
                              ),
                      ),
          ),
        ],
      ),
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

  Widget _buildEmptyState() {
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      children: [
        const SizedBox(height: 70),
        const Icon(Icons.luggage_outlined, size: 52, color: AppCultureColors.textLight),
        const SizedBox(height: 12),
        const Center(
          child: Text(
            'Bạn chưa có đơn đặt tour nào',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: AppCultureColors.textDark,
            ),
          ),
        ),
        const SizedBox(height: 6),
        const Center(
          child: Text(
            'Hãy khám phá các tour di sản văn hóa để bắt đầu hành trình.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 12.5, color: AppCultureColors.textMuted),
          ),
        ),
      ],
    );
  }

  Widget _buildBookingCard(BookingModel booking) {
    final status = _statusOf(booking);
    final badge = _statusBadge(status);
    final mockPaid = status != booking.status;

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppCultureColors.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      booking.bookingCode ?? 'Đơn #${booking.id}',
                      style: const TextStyle(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 1,
                        color: AppCultureColors.heritageJade,
                      ),
                    ),
                    Container(
                      padding:
                          const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: badge.bg,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        mockPaid ? 'Đã thanh toán (giả lập)' : booking.statusLabel,
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: badge.fg,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Text(
                  booking.tourTitle ?? 'Tour trải nghiệm',
                  style: const TextStyle(
                    fontSize: 15.5,
                    fontWeight: FontWeight.w800,
                    color: AppCultureColors.textDark,
                  ),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    const Icon(Icons.calendar_today_rounded,
                        size: 14, color: AppCultureColors.textMuted),
                    const SizedBox(width: 6),
                    Text(
                      booking.formattedExperienceDate.isEmpty
                          ? 'Chưa chọn ngày'
                          : booking.formattedExperienceDate,
                      style: const TextStyle(
                          fontSize: 12.5, color: AppCultureColors.textMuted),
                    ),
                    const Spacer(),
                    Text(
                      booking.formattedTotal,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w900,
                        color: AppCultureColors.jadeDark,
                      ),
                    ),
                  ],
                ),
                if (!mockPaid && booking.isPendingPayment && booking.isPaymentWindowOpen) ...[
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      const Icon(Icons.timer_outlined,
                          size: 14, color: AppCultureColors.warning),
                      const SizedBox(width: 6),
                      Text(
                        'Còn ${booking.countdownText} để thanh toán',
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: AppCultureColors.warning,
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
          Container(height: 1, color: AppCultureColors.border),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Flexible(
                  child: Text(
                    'Tạo lúc ${booking.formattedCreatedAt}',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 11.5, color: AppCultureColors.textLight),
                  ),
                ),
                const SizedBox(width: 8),
                Row(
                  children: [
                    if (!mockPaid && booking.isPendingPayment && booking.isPaymentWindowOpen)
                      Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: _buildActionButton(
                          label: 'Thanh toán',
                          primary: true,
                          onTap: () => _openPayment(booking),
                        ),
                      ),
                    if (_isTicket(booking) && booking.status != BookingStatus.completed)
                      Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: _buildActionButton(
                          label: 'Vào trải nghiệm',
                          primary: true,
                          onTap: () => _startExperience(booking),
                        ),
                      ),
                    _buildActionButton(
                      label: 'Chi tiết',
                      primary: false,
                      onTap: () => _openDetail(booking),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionButton({
    required String label,
    required bool primary,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
        decoration: BoxDecoration(
          color: primary ? AppCultureColors.heritageJade : AppCultureColors.surfaceSubtle,
          borderRadius: BorderRadius.circular(10),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w700,
            color: primary ? Colors.white : AppCultureColors.textDark,
          ),
        ),
      ),
    );
  }

  /// Thanh toán tiếp bằng đúng màn thanh toán dùng lúc đặt tour (VNPay; giả lập khi bật cờ dev).
  Future<void> _openPayment(BookingModel booking) async {
    await Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => BookingCheckoutScreen(bookingId: booking.id)),
    );
    if (mounted) _load(); // trạng thái có thể đã đổi trong lúc thanh toán
  }

  void _startExperience(BookingModel booking) {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => JourneyScreen(tourId: booking.tourId, bookingId: booking.id)),
    );
  }

  /// Lịch sử giao dịch thanh toán (thành công, thất bại, đang xử lý).
  void _showPayments() {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      backgroundColor: AppCultureColors.surface,
      builder: (ctx) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.6,
        maxChildSize: 0.92,
        builder: (_, controller) => FutureBuilder<List<PaymentModel>>(
          future: PaymentService().getMine(),
          builder: (context, snap) {
            final header = const Padding(
              padding: EdgeInsets.fromLTRB(20, 0, 20, 12),
              child: Text(
                'Lịch sử giao dịch',
                style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: AppCultureColors.textDark),
              ),
            );
            if (snap.connectionState != ConnectionState.done) {
              return ListView(controller: controller, children: [
                header,
                const Padding(
                  padding: EdgeInsets.all(32),
                  child: Center(child: CircularProgressIndicator(color: AppCultureColors.heritageJade)),
                ),
              ]);
            }
            final items = snap.data ?? const <PaymentModel>[];
            return ListView(
              controller: controller,
              padding: const EdgeInsets.only(bottom: 24),
              children: [
                header,
                if (snap.hasError)
                  const Padding(
                    padding: EdgeInsets.all(24),
                    child: Text('Không tải được lịch sử giao dịch.',
                        textAlign: TextAlign.center, style: TextStyle(color: AppCultureColors.textMuted)),
                  )
                else if (items.isEmpty)
                  const Padding(
                    padding: EdgeInsets.all(24),
                    child: Text('Chưa có giao dịch nào.',
                        textAlign: TextAlign.center, style: TextStyle(color: AppCultureColors.textMuted)),
                  )
                else
                  for (final p in items) _paymentTile(p),
              ],
            );
          },
        ),
      ),
    );
  }

  Widget _paymentTile(PaymentModel p) => Container(
        margin: const EdgeInsets.fromLTRB(16, 0, 16, 10),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppCultureColors.border),
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(formatMoney(p.amount), style: const TextStyle(fontWeight: FontWeight.w700)),
                  Text('Đơn ${p.bookingCode} · ${formatDateTime(p.createdAt)}',
                      style: const TextStyle(fontSize: 12, color: AppCultureColors.textMuted)),
                  if (p.duplicatePayment)
                    const Text('Giao dịch trùng với một giao dịch đã thanh toán',
                        style: TextStyle(fontSize: 11, color: AppCultureColors.amberDark)),
                ],
              ),
            ),
            Text(
              PaymentStatus.label(p.status),
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: p.status == PaymentStatus.success ? AppCultureColors.jadeDark : AppCultureColors.textMuted,
              ),
            ),
          ],
        ),
      );

  Future<void> _openDetail(BookingModel booking) async {
    final changed = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => BookingDetailScreen(bookingId: booking.id, booking: booking),
      ),
    );
    if (changed == true) _load();
  }

  static String _filterLabel(String status) {
    switch (status) {
      case 'ALL':
        return 'Tất cả';
      case 'PENDING_PAYMENT':
        return 'Chờ thanh toán';
      case 'CONFIRMED':
        return 'Đã xác nhận';
      case 'COMPLETED':
        return 'Hoàn thành';
      case 'CANCELLED':
        return 'Đã hủy';
      default:
        return status;
    }
  }

  static ({Color bg, Color fg}) _statusBadge(String status) {
    switch (status) {
      case 'CONFIRMED':
        return (bg: AppCultureColors.jadeLight, fg: AppCultureColors.jadeDark);
      case 'COMPLETED':
        return (bg: AppCultureColors.oceanLight, fg: AppCultureColors.oceanDark);
      case 'PENDING_PAYMENT':
        return (bg: AppCultureColors.rewardBg, fg: AppCultureColors.rewardText);
      case 'CANCELLED':
      case 'EXPIRED':
        return (bg: AppCultureColors.surfaceSubtle, fg: AppCultureColors.textMuted);
      default:
        return (bg: AppCultureColors.surfaceSubtle, fg: AppCultureColors.textDark);
    }
  }
}
