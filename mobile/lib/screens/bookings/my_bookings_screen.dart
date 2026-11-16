import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/models/booking_model.dart';
import '../../core/models/refund_model.dart';
import '../../core/models/tour_journey_model.dart';
import '../../core/services/api_client.dart';
import '../../core/services/booking_service.dart';
import '../../core/services/journey_service.dart';
import '../../core/services/payment_service.dart';
import '../../core/services/refund_service.dart';
import '../booking/booking_detail_screen.dart';
import '../journey/journey_screen.dart';
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
  final RefundService _refundService = RefundService();

  List<BookingModel> _bookings = const [];

  /// Chỉ mục trạng thái hoàn tiền theo booking — dùng để thay nhãn đếm ngược
  /// ".. ngày nữa lên đường" và bật nút "Đặt lại tour".
  RefundStateIndex _refundIndex = const RefundStateIndex({});

  /// Tập booking ĐÃ có giao dịch thanh toán thành công.
  ///
  /// ⚠️ Vì sao cần? ── Đơn `EXPIRED` / `CANCELLED` vẫn CÓ thể đã từng thanh toán
  /// thành công (VD: thanh toán đến muộn ⇒ đơn hết hạn nhưng tiền đã vào, hoặc
  /// đơn bị hủy sau khi đã trả tiền rồi hoàn tiền). Backend giữ booking ở
  /// trạng thái terminal ⇒ `isPaid` = false ⇒ nếu chỉ dựa vào `isPaid` thì app
  /// hiểu nhầm là "chưa thanh toán" ⇒ hiện sai "Thanh toán thành công" hoặc
  /// cho truy cập trải nghiệm.
  ///
  /// ⇒ Chỉ hiện "Thanh toán thành công" khi booking có giao dịch SUCCESS thật.
  Set<int> _paidBookingIds = const {};

  /// Booking có hành trình đang đi (`IN_PROGRESS`) ⇒ thuộc tab "Đang trải nghiệm".
  Set<int> _activeJourneyBookingIds = const {};

  bool _loading = true;
  String? _error;

  /// Theo dõi vòng đời app — tải lại danh sách khi quay lại từ trình duyệt
  /// VNPay (hoặc từ bất kỳ màn nào khác) để trạng thái đơn luôn mới.
  late final WidgetsBindingObserver _lifecycleWatcher;

  @override
  void initState() {
    super.initState();
    _lifecycleWatcher = _BookingListWatcher(onResumed: _onResumed);
    WidgetsBinding.instance.addObserver(_lifecycleWatcher);
    _load();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(_lifecycleWatcher);
    super.dispose();
  }

  /// Khách quay lại app sau khi thanh toán ⇒ tải lại đơn ⇒ trạng thái cập nhật.
  void _onResumed() {
    if (!mounted) return;
    if (_loading) return;
    _load();
  }

  Future<void> _load() async {
    try {
      final results = await Future.wait([
        // Gồm cả booking mình được mời tham gia (hành khách được mời) — không
        // chỉ booking do chính mình đặt.
        _bookingService.getAccessibleBookings(),
        _paymentService.getMine(),
        // Yêu cầu hoàn tiền của tôi — gom theo booking để biết đơn nào đang
        // hoàn tiền / đã hoàn xong.
        _refundService.getMyRefunds(page: 0, size: 100),
        // Hành trình của tôi — đơn nào đang đi tour (IN_PROGRESS). Lỗi thì bỏ qua,
        // vẫn xếp theo ngày đi tour.
        JourneyService().getMine().catchError((_) => <TourJourney>[]),
      ]);
      if (!mounted) return;
      final payments = results[1] as List<PaymentModel>;
      final journeys = results[3] as List<TourJourney>;
      setState(() {
        _activeJourneyBookingIds = {
          for (final j in journeys)
            if (j.status == ProgressStatus.inProgress && j.bookingId != null) j.bookingId!,
        };
        _bookings = results[0] as List<BookingModel>;
        _refundIndex = RefundStateIndex.fromRefunds(results[2] as List<RefundModel>);
        // ⚠️ Đơn nào THỰC SỰ đã thanh toán thành công (không phụ thuộc status
        // của booking — đơn hết hạn/hủy vẫn có thể đã trả tiền).
        _paidBookingIds = {
          for (final p in payments)
            if (p.isSuccess && p.bookingId != null) p.bookingId!,
        };
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

  /// Chi tiết đơn: mã QR trải nghiệm, thông tin thanh toán, yêu cầu hoàn tiền.
  Future<void> _openDetail(BookingModel booking) async {
    final changed = await Navigator.of(context).push<bool>(
      MaterialPageRoute(builder: (_) => BookingDetailScreen(bookingId: booking.id, booking: booking)),
    );
    if (changed == true && mounted) _load();
  }

  // ── Phân loại đơn theo trạng thái ──────────────────────────────────────────
  //
  // ⚠️ Thứ tự ưu tiên RẤT quan trọng — mỗi đơn chỉ thuộc MỘT nhóm:
  //   1. Đang hoàn tiền (tiền đang bay) — ưu tiên cao nhất.
  //   2. Đã hoàn tiền (đã có kết quả).
  //   3. Đã mua (đã thanh toán, không dính hoàn tiền).
  //   4. Chờ thanh toán (còn trong hạn 10 phút).
  //   5. Còn lại ⇒ đã hủy / hết hạn.

  /// Đơn đang trong quá trình hoàn tiền (chờ duyệt / chờ VNPay / chờ chuyển khoản).
  bool _isRefunding(BookingModel b) =>
      _refundIndex.stateFor(b.id) == RefundSummaryState.processing;

  /// Đơn đã xử lý xong hoàn tiền (đã hoàn / bị từ chối / lỗi).
  bool _isRefunded(BookingModel b) =>
      _refundIndex.stateFor(b.id) == RefundSummaryState.resolved;

  /// Hôm nay (giờ Việt Nam, giống backend) có phải đúng ngày đi tour không.
  bool _isExperienceDay(BookingModel b) {
    final date = b.experienceDate;
    if (date == null) return false;
    final now = DateTime.now().toUtc().add(const Duration(hours: 7));
    return date.year == now.year && date.month == now.month && date.day == now.day;
  }

  /// Đơn đang trải nghiệm: đã thanh toán, không dính hoàn tiền, chưa xong, và
  /// đã bắt đầu hành trình (IN_PROGRESS) hoặc hôm nay là ngày đi tour.
  bool _isExperiencing(BookingModel b) =>
      b.isConfirmed &&
      !_refundIndex.hasRefund(b.id) &&
      (_activeJourneyBookingIds.contains(b.id) || _isExperienceDay(b));

  /// Đơn đã thanh toán và KHÔNG dính hoàn tiền, CHƯA đi, chưa đang trải nghiệm.
  bool _isPurchased(BookingModel b) =>
      b.isPaid && !b.isCompleted && !_refundIndex.hasRefund(b.id) && !_isExperiencing(b);

  /// Đơn đã đi xong (trải nghiệm đã hoàn thành).
  bool _isCompleted(BookingModel b) => b.isCompleted;

  /// Đơn còn trong hạn thanh toán (10 phút) — khách có thể thanh toán tiếp.
  ///
  /// ⚠️ Chỉ những đơn CHƯA thanh toán mới vào nhóm này. Đơn đã thanh toán phải
  /// rơi vào "Đã mua" — nếu không, đơn đã trả tiền vẫn hiện "Chờ thanh toán".
  bool _isPendingPayment(BookingModel b) =>
      b.isPendingPayment && b.isPaymentWindowOpen;

  /// Đơn đã hủy hoặc hết hạn thanh toán — KHÔNG còn hiệu lực trải nghiệm.
  ///
  /// ⚠️ Gồm 2 trường hợp:
  ///   • Trạng thái TERMINAL (`CANCELLED` / `EXPIRED`) — chỗ đã được giải phóng.
  ///   • `PENDING_PAYMENT` đã quá hạn 10 phút — chỗ đã/như sẽ được trả lại.
  ///
  /// Cả hai đều KHÔNG được hiển thị như "đã thanh toán thành công" và KHÔNG
  /// được cho truy cập trải nghiệm.
  bool _isClosed(BookingModel b) =>
      b.isCancelled ||
      b.isExpired ||
      (b.isPendingPayment && !b.isPaymentWindowOpen);

  /// Đơn này ĐÃ từng thanh toán thành công (có giao dịch `SUCCESS`).
  ///
  /// ⚠️ KHÔNG dựa vào `booking.isPaid` — đơn hết hạn/hủy sau khi đã trả tiền
  /// vẫn `isPaid` = false. Đây là nguồn sự thật về "đã trả tiền hay chưa".
  bool _hasSuccessfulPayment(BookingModel b) => _paidBookingIds.contains(b.id);

  /// Đơn đã hủy/hết hạn NHƯNG vẫn có giao dịch thành công ⇒ tiền đã thu nhưng
  /// chỗ đã được trả lại ⇒ cần đưa vào quy trình hoàn tiền.
  ///
  /// ⚠️ Đây là trường hợp "đơn chết" mà app phải hiển thị ĐÚNG, không phải
  /// "Thanh toán thành công" (không có chỗ để trải nghiệm).
  bool _isClosedButPaid(BookingModel b) =>
      _isClosed(b) && _hasSuccessfulPayment(b);

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
    // ── Phân loại đơn theo trạng thái ──────────────────────────────────────
    //
    // ⚠️ Mỗi đơn thuộc ĐÚNG MỘT nhóm để không hiện trùng ở nhiều tab:
    //   • Đang hoàn tiền  — ưu tiên cao nhất (đơn đang bay tiền).
    //   • Đã hoàn tiền    — đã có kết quả hoàn tiền (đã hoàn / bị từ chối / lỗi).
    //   • Đã hoàn thành   — tour đã đi xong.
    //   • Đã mua          — đã thanh toán và KHÔNG dính hoàn tiền, còn hiệu lực đi.
    //   • Chờ thanh toán  — còn trong hạn 10 phút.
    //   • Đã hủy/Hết hạn — phần còn lại.
    final all = _bookings;
    final refunding = all.where((b) => _isRefunding(b)).toList();
    final refunded = all.where((b) => _isRefunded(b)).toList();
    final completed = all.where((b) => _isCompleted(b)).toList();
    final experiencing = all.where((b) => _isExperiencing(b)).toList();
    final purchased = all.where((b) => _isPurchased(b)).toList();
    final pending = all.where((b) => _isPendingPayment(b)).toList();
    // ⚠️ "Đã hủy/Hết hạn" = đơn ở trạng thái TERMINAL (CANCELLED / EXPIRED).
    // Trước đây nhóm này là "phần còn lại" ⇒ lẫn cả đơn `PENDING_PAYMENT` quá
    // hạn ⇒ hiển thị sai (như "đã thanh toán" / cho truy cập trải nghiệm).
    final closed = all.where((b) => _isClosed(b)).toList();

    return DefaultTabController(
      length: 8,
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
              Tab(text: 'Tất cả (${all.length})'),
              Tab(text: 'Đã mua (${purchased.length})'),
              Tab(text: 'Chờ thanh toán (${pending.length})'),
              Tab(text: 'Đang trải nghiệm (${experiencing.length})'),
              Tab(text: 'Đã hoàn thành (${completed.length})'),
              Tab(text: 'Đang hoàn tiền (${refunding.length})'),
              Tab(text: 'Đã hoàn tiền (${refunded.length})'),
              Tab(text: 'Đã hủy/Hết hạn (${closed.length})'),
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
                        _list(all, 'Chưa có đơn nào.', _ticketTile),
                        _list(purchased, 'Chưa có đơn nào đã thanh toán.', _ticketTile),
                        _list(pending, 'Không có đơn nào đang chờ thanh toán.', _pendingTile),
                        _list(experiencing, 'Không có chuyến nào đang diễn ra.', _ticketTile),
                        _list(completed, 'Chưa có đơn nào đã hoàn thành.', _ticketTile),
                        _list(refunding, 'Không có đơn nào đang hoàn tiền.', _ticketTile),
                        _list(refunded, 'Chưa có đơn nào đã hoàn tiền xong.', _ticketTile),
                        _list(closed, 'Không có đơn nào đã hủy hoặc hết hạn.', _closedTile),
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

  Widget _ticketTile(BookingModel b) {
    final refundState = _refundIndex.stateFor(b.id);
    final refunding = refundState == RefundSummaryState.processing;
    final resolved = refundState == RefundSummaryState.resolved;

    // ⚠️ Đơn đã hủy / hết hạn KHÔNG có chỗ để trải nghiệm ⇒ không mở hành
    // trình (backend trả lỗi "Booking đã bị hủy hoặc hết hạn"), chỉ xem chi tiết.
    final closed = _isClosed(b);
    final canStartExperience = !closed && !refunding && !resolved;

    void openDetail() => _openDetail(b);
    void startExperience() => _startExperience(b);

    return _tile(
      child: InkWell(
        // ⚠️ Đơn đang/có hoàn tiền ⇒ bấm vào mở CHI TIẾT ĐƠN (có lịch sử xử
        // lý + trạng thái hoàn tiền), KHÔNG mở màn trải nghiệm.
        onTap: canStartExperience ? startExperience : openDetail,
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
            Row(
              children: [
                Expanded(
                  child: FilledButton.icon(
                    // ⚠️ Đơn đang/có hoàn tiền ⇒ bấm vào XEM CHI TIẾT ĐƠN (nơi có
                    // lịch sử + trạng thái hoàn tiền), KHÔNG mở màn trải nghiệm.
                    // Đơn đã hủy/hết hạn ⇒ cũng chỉ xem chi tiết (không có chỗ).
                    onPressed: canStartExperience ? startExperience : openDetail,
                    icon: Icon(
                      refunding
                          ? Icons.pending_actions_rounded
                          : resolved
                              ? Icons.verified_rounded
                              : closed
                                  ? Icons.event_busy_rounded
                                  : b.isTourLocked
                                      ? Icons.schedule_rounded
                                      : Icons.explore_rounded,
                      size: 18,
                    ),
                    label: Text(
                      _actionLabel(b, refunding, resolved),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                    style: FilledButton.styleFrom(
                      backgroundColor: refunding
                          ? AppCultureColors.rewardText
                          : resolved
                              ? AppCultureColors.oceanBlue
                              : closed
                                  ? AppCultureColors.textMuted
                                  : AppCultureColors.heritageJade,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                // Chi tiết đơn: mã QR trải nghiệm, hành khách, yêu cầu hoàn tiền
                OutlinedButton(
                  onPressed: () => _openDetail(b),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppCultureColors.jadeDark,
                    side: const BorderSide(color: AppCultureColors.border),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  child: const Text('Chi tiết', style: TextStyle(fontWeight: FontWeight.w700)),
                ),
              ],
            ),
            // ⚠️ KHÔNG hiện badge trạng thái hoàn tiền ở đây — nhãn đã nằm trên
            // nút hành động ngay phía trên ("Đang trong quá trình hoàn tiền" /
            // "Đã xử lý hoàn tiền"). Hiện cả hai ⇒ hiển thị TRÙNG LẶP.
            //
            // ⚠️ "Đặt lại tour" chỉ hiện khi đơn ĐÃ xử lý xong hoàn tiền.
            // Đang trong quá trình hoàn tiền thì chưa chốt được kết quả ⇒
            // chưa nên đặt lại (tránh mua trùng khi hoàn tiền còn bay).
            if (resolved) ...[
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: () => _rebook(b),
                  icon: const Icon(Icons.replay_rounded, size: 17),
                  label: const Text(
                    'Đặt lại tour',
                    style: TextStyle(fontWeight: FontWeight.w700),
                  ),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppCultureColors.heritageJade,
                    side: const BorderSide(color: AppCultureColors.heritageJade),
                    minimumSize: const Size.fromHeight(44),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  /// Nhãn nút hành động — thay ".. ngày nữa lên đường" khi đơn đang/có hoàn tiền.
  String _actionLabel(BookingModel b, bool refunding, bool resolved) {
    if (refunding) return 'Đang trong quá trình hoàn tiền';
    if (resolved) return 'Đã xử lý hoàn tiền';
    // ⚠️ Đơn đã hủy/hết hạn ⇒ KHÔNG mở được hành trình ⇒ nhãn phải nói đúng
    // sự thật, không hiện "Vào trải nghiệm" (gây hiểu nhầm đã mua thành công).
    if (_isClosed(b)) return b.isCancelled ? 'Đơn đã hủy' : 'Đơn đã hết hạn';
    return b.isTourLocked ? '${b.daysUntilStart} ngày nữa lên đường!' : 'Vào trải nghiệm';
  }

  /// Tile cho đơn ĐÃ HỦY / HẾT HẠN.
  ///
  /// ⚠️ Vì sao cần tile riêng? ── Trước đây dùng chung `_ticketTile` ⇒ đơn hủy/hết
  /// hạn hiện nút "Vào trải nghiệm" (mở được hành trình ⇒ backend chặn với lỗi
  /// khó hiểu) và nhãn trạng thái màu "đã xác nhận" ⇒ gây hiểu nhầm là đã mua
  /// thành công.
  ///
  /// ⇒ Ở đây: KHÔNG có nút trải nghiệm, chỉ có "Chi tiết" để xem thông tin và
  /// (nếu đã trả tiền) hướng dẫn yêu cầu hoàn tiền.
  Widget _closedTile(BookingModel b) {
    final cancelled = b.isCancelled;
    final paidButClosed = _isClosedButPaid(b);
    final reason = (b.cancellationReason ?? '').trim();

    return _tile(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(b.bookingCode,
                  style: const TextStyle(fontSize: 11, color: AppCultureColors.textMuted)),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: cancelled ? const Color(0xFFFEE2E2) : AppCultureColors.surfaceSubtle,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  cancelled ? 'Đã hủy' : 'Hết hạn thanh toán',
                  style: TextStyle(
                    fontSize: 10.5,
                    fontWeight: FontWeight.w700,
                    color: cancelled ? AppCultureColors.error : AppCultureColors.textMuted,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            b.tourTitle,
            style: const TextStyle(
              fontWeight: FontWeight.w700,
              color: AppCultureColors.textMuted,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Ngày ${formatDay(b.experienceDate)} · ${formatMoney(b.totalAmount)}',
            style: const TextStyle(fontSize: 12, color: AppCultureColors.textMuted),
          ),
          if (reason.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              'Lý do: $reason',
              style: const TextStyle(fontSize: 11.5, color: AppCultureColors.textMuted),
            ),
          ],
          const SizedBox(height: 10),
          // ⚠️ Đơn đã hủy/hết hạn KHÔNG có chỗ để trải nghiệm ⇒ không hiện nút
          // mở hành trình (backend sẽ từ chối với lỗi khó hiểu).
          if (paidButClosed) ...[
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: AppCultureColors.rewardBg,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.info_outline_rounded,
                      size: 16, color: AppCultureColors.rewardText),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Khoản tiền đã được ghi nhận nhưng chỗ đã được trả lại. '
                      'Vui lòng liên hệ hỗ trợ để được hoàn tiền.',
                      style: const TextStyle(
                        fontSize: 11.5,
                        height: 1.35,
                        color: AppCultureColors.rewardText,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),
          ],
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: () => _openDetail(b),
              icon: const Icon(Icons.receipt_long_rounded, size: 17),
              label: const Text(
                'Xem chi tiết đơn',
                style: TextStyle(fontWeight: FontWeight.w700),
              ),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppCultureColors.jadeDark,
                side: const BorderSide(color: AppCultureColors.border),
                minimumSize: const Size.fromHeight(44),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// Mở màn chi tiết tour để đặt lại (nếu tour còn tồn tại và đặt được).
  Future<void> _rebook(BookingModel b) async {
    await openTourDetailScreen(context, tourId: b.tourId);
  }

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
}

/// Giám sát vòng đời app cho màn "Đơn đặt tour".
///
/// ── Vì sao cần? ──
/// Khách thanh toán xong ⇒ quay lại app từ trình duyệt VNPay ⇒ trạng thái đơn
/// trên server đã đổi (`PENDING_PAYMENT` → `CONFIRMED`) nhưng danh sách đang
/// hiển thị vẫn là bản cũ ⇒ đơn đã trả tiền vẫn nằm ở tab "Chờ thanh toán".
///
/// ⇒ Gọi `onResumed` mỗi lần app quay lại foreground để tải lại danh sách.
///
/// ⚠️ `WidgetsBindingObserver` là abstract class ⇒ phải subclass, không
/// instantiate trực tiếp.
class _BookingListWatcher extends WidgetsBindingObserver {
  /// Được gọi khi app chuyển sang `AppLifecycleState.resumed`.
  final void Function() onResumed;

  _BookingListWatcher({required this.onResumed});

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    super.didChangeAppLifecycleState(state);
    if (state == AppLifecycleState.resumed) {
      onResumed();
    }
  }
}
