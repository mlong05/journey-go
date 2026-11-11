/// Màn "Đơn Của Tôi" (Bookings) — Mobile.
///
/// Liệt kê booking của người dùng từ `GET /bookings/my`, có bộ lọc theo trạng thái:
///  • Tất cả / Chờ thanh toán / Đã xác nhận / Đã hoàn thành / Đã hủy
///
/// Mỗi thẻ đơn cho phép:
///  • Thanh toán tiếp (nếu còn trong hạn 10 phút) → mở `PaymentScreen`.
///  • Xem chi tiết → `BookingDetailScreen`.
library;

import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';
import '../../core/models/booking_model.dart';
import '../../core/services/api_client.dart';
import '../../core/services/booking_service.dart';
import 'booking_detail_screen.dart';
import 'payment_screen.dart';

class BookingsScreen extends StatefulWidget {
  const BookingsScreen({super.key});

  @override
  State<BookingsScreen> createState() => _BookingsScreenState();
}

class _BookingsScreenState extends State<BookingsScreen> {
  final BookingService _service = BookingService();

  List<BookingModel> _bookings = [];
  bool _loading = true;
  String _error = '';
  String _filter = 'ALL';

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
      // Gồm cả booking mà user được mời tham gia (hành khách được mời).
      final list = await _service.getAccessibleBookings();
      if (!mounted) return;
      setState(() {
        _bookings = list;
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

  List<BookingModel> get _filtered {
    if (_filter == 'ALL') return _bookings;
    return _bookings.where((b) => b.status == _filter).toList();
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
          'Đơn Của Tôi',
          style: TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.w800,
            color: AppCultureColors.textDark,
          ),
        ),
        actions: [
          IconButton(
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
                      : _bookings.where((b) => b.status == f).length;
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
    final badge = _statusBadge(booking.status);

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
                        booking.statusLabel,
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
                if (booking.isPendingPayment && booking.isPaymentWindowOpen) ...[
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
                Text(
                  'Tạo lúc ${booking.formattedCreatedAt}',
                  style: const TextStyle(
                      fontSize: 11.5, color: AppCultureColors.textLight),
                ),
                Row(
                  children: [
                    if (booking.isPendingPayment && booking.isPaymentWindowOpen)
                      Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: _buildActionButton(
                          label: 'Thanh toán',
                          primary: true,
                          onTap: () => _openPayment(booking),
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

  Future<void> _openPayment(BookingModel booking) async {
    final result = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => PaymentScreen(bookingId: booking.id, booking: booking),
      ),
    );
    if (result == true) _load();
  }

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
