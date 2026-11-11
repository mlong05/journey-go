import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/models/booking_model.dart';
import '../../core/services/api_client.dart';
import '../../core/services/booking_service.dart';
import '../../core/services/payment_service.dart';
import '../journey/journey_screen.dart';
import '../chat/provider_chat_list_screen.dart';
import '../tours/tour_detail_opener.dart';
import 'booking_checkout_screen.dart';

/// Đơn đặt tour của tôi: vé (đã thanh toán), đơn chờ thanh toán và lịch sử giao dịch.
class MyBookingsScreen extends StatefulWidget {
  const MyBookingsScreen({super.key});

  @override
  State<MyBookingsScreen> createState() => _MyBookingsScreenState();
}

class _MyBookingsScreenState extends State<MyBookingsScreen> {
  final BookingService _bookingService = BookingService();
  final PaymentService _paymentService = PaymentService();

  List<BookingModel> _bookings = const [];
  List<PaymentModel> _payments = const [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final results = await Future.wait([
        // Gồm cả booking mình được mời tham gia (hành khách được mời) — không
        // chỉ booking do chính mình đặt.
        _bookingService.getAccessibleBookings(),
        _paymentService.getMine(),
      ]);
      if (!mounted) return;
      setState(() {
        _bookings = results[0] as List<BookingModel>;
        _payments = results[1] as List<PaymentModel>;
        _error = null;
        _loading = false;
      });
    } on ApiException catch (e) {
      // Lỗi mạng: giữ dữ liệu đang có, chỉ báo lỗi.
      if (!mounted) return;
      setState(() {
        _error = e.message;
        _loading = false;
      });
    }
  }

  Future<void> _openCheckout(BookingModel booking) async {
    await Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => BookingCheckoutScreen(bookingId: booking.id)),
    );
    if (mounted) _load(); // trạng thái có thể đã đổi trong lúc thanh toán
  }

  bool _isTicket(BookingModel b) => b.isPaid;

  /// Mở hành trình — nhưng nếu ngày trải nghiệm còn ở tương lai thì mở màn CHI TIẾT
  /// TOUR (không vào hành trình vì backend đang khoá tour tới ngày đó).
  void _startExperience(BookingModel b) {
    if (b.isTourLocked) {
      openTourDetailScreen(context, tourId: b.tourId, bookedBooking: b);
      return;
    }
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => JourneyScreen(tourId: b.tourId, bookingId: b.id)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final tickets = _bookings.where(_isTicket).toList();
    final pending = _bookings.where((b) => b.canPay).toList();

    return DefaultTabController(
      length: 4,
      child: Scaffold(
        backgroundColor: AppCultureColors.background,
        appBar: AppBar(
          backgroundColor: Colors.white,
          elevation: 0,
          centerTitle: true,
          title: const Text('Đơn đặt tour',
              style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: AppCultureColors.textDark)),
          iconTheme: const IconThemeData(color: AppCultureColors.textDark),
          bottom: TabBar(
            labelColor: AppCultureColors.jadeDark,
            indicatorColor: AppCultureColors.heritageJade,
            unselectedLabelColor: AppCultureColors.textMuted,
            isScrollable: true,
            tabAlignment: TabAlignment.start,
            tabs: [
              Tab(text: 'Vé (${tickets.length})'),
              Tab(text: 'Chờ thanh toán (${pending.length})'),
              const Tab(text: 'Giao dịch'),
              const Tab(text: 'Hỗ trợ từ nhà tour'),
            ],
          ),
        ),
        body: _loading
            ? const Center(child: CircularProgressIndicator(color: AppCultureColors.heritageJade))
            : Column(
                children: [
                  if (_error != null)
                    Container(
                      width: double.infinity,
                      color: const Color(0xFFFEE2E2),
                      padding: const EdgeInsets.all(10),
                      child: Text(_error!, style: const TextStyle(color: AppCultureColors.error, fontSize: 12)),
                    ),
                  Expanded(
                    child: TabBarView(
                      children: [
                        _list(tickets, 'Chưa có vé nào. Vé xuất hiện sau khi bạn thanh toán thành công.', _ticketTile),
                        _list(pending, 'Không có đơn nào đang chờ thanh toán.', _pendingTile),
                        _list(_payments, 'Chưa có giao dịch nào.', _paymentTile),
                        // Hỗ trợ từ nhà tour: nhúng danh sách hội thoại để khách
                        // không phải rời màn "Đơn đặt tour".
                        const ProviderChatListScreen(embedded: true),
                      ],
                    ),
                  ),
                ],
              ),
      ),
    );
  }

  Widget _list<T>(List<T> items, String emptyText, Widget Function(T) builder) {
    return RefreshIndicator(
      color: AppCultureColors.heritageJade,
      onRefresh: _load,
      child: items.isEmpty
          ? ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              children: [
                Padding(
                  padding: const EdgeInsets.all(32),
                  child: Text(emptyText,
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: AppCultureColors.textMuted)),
                ),
              ],
            )
          : ListView.separated(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              itemCount: items.length,
              separatorBuilder: (_, _) => const SizedBox(height: 10),
              itemBuilder: (_, i) => builder(items[i]),
            ),
    );
  }

  Widget _tile({required Widget child}) => Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: AppCultureColors.border),
        ),
        child: child,
      );

  Widget _ticketTile(BookingModel b) => _tile(
        child: InkWell(
          onTap: () => _startExperience(b),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(b.bookingCode,
                      style: const TextStyle(fontSize: 11, color: AppCultureColors.textMuted)),
                  Text(BookingStatus.label(b.status),
                      style: const TextStyle(
                          fontSize: 11, fontWeight: FontWeight.w700, color: AppCultureColors.jadeDark)),
                ],
              ),
              const SizedBox(height: 4),
              Text(b.tourTitle, style: const TextStyle(fontWeight: FontWeight.w700)),
              const SizedBox(height: 4),
              Text('Ngày ${formatDay(b.experienceDate)} · ${formatMoney(b.totalAmount)}',
                  style: const TextStyle(fontSize: 12, color: AppCultureColors.textMuted)),
              const SizedBox(height: 10),
              FilledButton.icon(
                onPressed: () => _startExperience(b),
                icon: Icon(b.isTourLocked ? Icons.schedule_rounded : Icons.explore_rounded, size: 18),
                label: Text(
                  b.isTourLocked ? '${b.daysUntilStart} ngày nữa lên đường!' : 'Vào trải nghiệm',
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
                style: FilledButton.styleFrom(
                  backgroundColor: AppCultureColors.heritageJade,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
              ),
            ],
          ),
        ),
      );

  Widget _pendingTile(BookingModel b) => _tile(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(b.tourTitle, style: const TextStyle(fontWeight: FontWeight.w700)),
            const SizedBox(height: 4),
            Text('${formatDay(b.experienceDate)} · ${formatMoney(b.totalAmount)}',
                style: const TextStyle(fontSize: 12, color: AppCultureColors.textMuted)),
            Text('Hạn thanh toán: ${formatDateTime(b.paymentDeadline)}',
                style: const TextStyle(fontSize: 12, color: AppCultureColors.amberDark)),
            const SizedBox(height: 8),
            FilledButton(
              onPressed: () => _openCheckout(b),
              style: FilledButton.styleFrom(backgroundColor: AppCultureColors.heritageJade),
              child: const Text('Thanh toán tiếp'),
            ),
          ],
        ),
      );

  Widget _paymentTile(PaymentModel p) => _tile(
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
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
            Text(PaymentStatus.label(p.status),
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: p.status == PaymentStatus.success
                      ? AppCultureColors.jadeDark
                      : AppCultureColors.textMuted,
                )),
          ],
        ),
      );
}
