import 'package:flutter/material.dart';
import '../../core/models/booking_model.dart';
import '../../core/models/refund_model.dart';
import '../../core/models/tour_journey_model.dart';
import '../../core/models/tour_model.dart';
import '../../core/services/api_client.dart';
import '../../core/services/booking_service.dart';
import '../../core/services/progress_service.dart';
import '../../core/services/refund_service.dart';
import '../../core/services/tour_service.dart';
import '../booking/booking_detail_screen.dart';
import '../bookings/pending_booking_prompt.dart' show PendingBookingBanner, openPendingBooking;
import '../common/heritage_motion.dart';
import '../journey/journey_screen.dart';
import '../rewards/rewards_widgets.dart' show RewardsMessageView, RewardsSkeletonList;
import 'tour_detail_screen.dart';
import 'tour_detail_opener.dart';
import 'tour_style.dart';
import '../../l10n/locale_controller.dart';

/// Bảng màu hiện đại của màn "Chuyến đi": nền xám lạnh, chữ xanh than, nhấn xanh ngọc tươi,
/// cam cho việc cần làm ngay (đếm ngược), vàng cho điểm thưởng.
abstract final class TripsPalette {
  static const background = Color(0xFFF6F8FB);
  static const ink = Color(0xFF0F172A);
  static const muted = Color(0xFF64748B);
  static const line = Color(0xFFE2E8F0);
  static const track = Color(0xFFE8ECF1);
  static const chipIdle = Color(0xFFD5DCE4);
  static const surfaceSoft = Color(0xFFF1F5F9);
  static const accent = Color(0xFF0B7F7E);
  static const accentBright = Color(0xFF2DD4BF);
  static const accentInk = Color(0xFF042F2E);
  static const accentSoft = Color(0xFFE0F2F1);
  static const night = Color(0xFF0F172A);
  static const nightRaised = Color(0xFF1E293B);
  static const nightTrack = Color(0xFF334155);
  static const nightMuted = Color(0xFF94A3B8);
  static const orange = Color(0xFFEA580C);
  static const orangeSoft = Color(0xFFFFF1E6);
  static const orangeInk = Color(0xFFC2410C);
  static const gold = Color(0xFFFACC15);
  static const goldSoft = Color(0xFFFEF9C3);
  static const goldInk = Color(0xFF854D0E);
  static const success = Color(0xFF16A34A);
  static const successSoft = Color(0xFFDCFCE7);
  static const successInk = Color(0xFF166534);
  static const slate = Color(0xFF475569);
}

enum _Stage { active, ready, done }

/// Bộ lọc ở đầu danh sách (thay cho ba ô thống kê): số đếm nằm ngay trên tab.
enum _Filter { all, active, ready, done }

/// Một tour du khách đã mua (vé) hoặc đã đi, kèm hành trình nếu đã bắt đầu.
class _MyTour {
  final BookingModel? booking;
  final TourJourney? journey;
  final TourModel? tour;
  final _Stage stage;

  /// Trạng thái hoàn tiền của đơn (null = không có booking / không có yêu cầu).
  final RefundSummaryState? refundState;

  const _MyTour({
    required this.booking,
    required this.journey,
    required this.tour,
    required this.stage,
    this.refundState,
  });

  int get tourId => booking?.tourId ?? journey!.tourId;
  String get title => tour?.title ?? booking?.tourTitle ?? journey?.tourName ?? 'Tour';

  int get total => journey?.totalDestinations ?? tour?.destinationCount ?? 0;
  int get done {
    final j = journey;
    if (j == null) return 0;
    return j.destinations.isNotEmpty ? j.doneCount : (j.currentOrder - 1).clamp(0, j.totalDestinations);
  }

  /// Trạm đang mở mà du khách đã check-in (đang đứng tại trạm, chưa xong) — null nếu không có.
  JourneyDestination? get checkedInStop =>
      journey?.destinations.where((d) => d.isCurrent && d.checkedIn).firstOrNull;

  int get points => journey?.totalPoints ?? 0;

  int get guests {
    final b = booking;
    if (b == null) return 0;
    return b.passengers.isNotEmpty ? b.passengers.length : b.slotCount;
  }

  /// Đang trong quá trình hoàn tiền.
  bool get isRefunding => refundState == RefundSummaryState.processing;

  /// Đã xử lý hoàn tiền xong.
  bool get isRefundResolved => refundState == RefundSummaryState.resolved;

  /// Đơn đã hoàn thành trải nghiệm (không còn hành trình đang chạy).
  bool get isExperienceDone => stage == _Stage.done;

  /// Ngày của chuyến: ngày đi tour trên vé, không có vé thì ngày bắt đầu hành trình.
  DateTime? get tripDate => booking?.experienceDate ?? journey?.startedAt;

  /// Đã tới ngày đi (trong thời gian tour) nhưng chưa bấm "Bắt đầu" ⇒ nằm ở "Đang diễn ra", thẻ vé có nút Bắt đầu.
  bool get awaitingStart => stage == _Stage.active && journey == null;

  /// Vé quá thời gian tour mà không đi ⇒ nằm ở "Đã kết thúc" với nhãn "Đã quá ngày trải nghiệm".
  bool get missed =>
      stage == _Stage.done && journey == null && (booking?.isExperienceExpired ?? false);

  /// Hành trình còn IN_PROGRESS nhưng ngày đi tour đã qua ⇒ "Chưa hoàn tất", không phải "Trực tiếp".
  bool get isStale {
    final d = tripDate;
    if (stage != _Stage.active || journey == null || d == null) return false;
    return DateTime(d.year, d.month, d.day).isBefore(_vnToday());
  }
}

/// Hôm nay theo giờ Việt Nam (giống backend), chỉ phần ngày.
DateTime _vnToday() {
  final now = DateTime.now().toUtc().add(const Duration(hours: 7));
  return DateTime(now.year, now.month, now.day);
}

/// "Chuyến đi của tôi": các tour đã mua, chia theo đang trải nghiệm / sắp khởi hành / đã hoàn thành.
class MyToursView extends StatefulWidget {
  /// Chuyển sang trang Khám phá tour (khi chưa có tour nào).
  final VoidCallback onExplore;

  /// Đổi giá trị để tải lại (khi du khách quay lại tab).
  final int refreshToken;

  const MyToursView({super.key, required this.onExplore, this.refreshToken = 0});

  @override
  State<MyToursView> createState() => _MyToursViewState();
}

class _MyToursViewState extends State<MyToursView> {
  final ProgressService _progress = ProgressService();
  final BookingService _bookingService = BookingService();
  final TourService _tourService = TourService();
  final RefundService _refundService = RefundService();

  List<_MyTour> _items = const [];

  /// Khối "Cần bạn xử lý": đơn đang giữ chỗ (còn hạn) và đơn đã trả tiền nhưng bị hủy/hết hạn
  /// mà chưa gửi yêu cầu hoàn tiền. Các đơn này không nằm trong danh sách vé bên dưới.
  List<BookingModel> _pending = const [];
  List<BookingModel> _refundNeeded = const [];
  bool _loading = true;
  String? _error;
  _Filter _filter = _Filter.all;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void didUpdateWidget(covariant MyToursView oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.refreshToken != widget.refreshToken) _load();
  }

  Future<void> _load() async {
    // Hành trình và thông tin tour chỉ để làm giàu thẻ; lỗi thì vẫn hiện vé
    Future<T> safe<T>(Future<T> Function() load, T fallback) async {
      try {
        return await load();
      } catch (_) {
        return fallback;
      }
    }

    try {
      final results = await Future.wait<Object>([
        // Tất cả đơn của tôi: vé (đã thanh toán) + đơn cần xử lý (giữ chỗ / cần hoàn tiền).
        _bookingService.getMine(),
        safe<List<TourJourney>>(_progress.getJourneys, const []),
        safe<List<TourModel>>(_tourService.getPublishedTours, const []),
        // Yêu cầu hoàn tiền của tôi — dùng để thay nhãn đếm ngược và bật nút
        // "Đặt lại tour" cho tour đang hoàn tiền / đã hoàn xong.
        safe<List<RefundModel>>(
          () => _refundService.getMyRefunds(page: 0, size: 100),
          const [],
        ),
      ]);
      if (!mounted) return;
      final refundIndex =
          RefundStateIndex.fromRefunds(results[3] as List<RefundModel>);
      final bookings = results[0] as List<BookingModel>;
      setState(() {
        _pending = bookings.where((b) => b.isPendingPayment && b.isPaymentWindowOpen).toList();
        _refundNeeded = bookings
            .where((b) => (b.isCancelled || b.isExpired) && b.paidAt != null && !refundIndex.hasRefund(b.id))
            .toList();
        _items = _combine(
          bookings.where((b) => b.isPaid).toList(),
          results[1] as List<TourJourney>,
          results[2] as List<TourModel>,
          refundIndex,
        );
        _error = null;
        _loading = false;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.message;
        _loading = false;
      });
    }
  }

  /// Ghép vé với hành trình cùng booking; hành trình không gắn vé (tour miễn phí) cũng được liệt kê.
  static List<_MyTour> _combine(
    List<BookingModel> tickets,
    List<TourJourney> journeys,
    List<TourModel> tours,
    RefundStateIndex refundIndex,
  ) {
    final tourById = {for (final t in tours) t.id: t};
    final items = <_MyTour>[];
    final usedJourneys = <int>{};

    for (final b in tickets) {
      // ⚠️ "Chuyến đi" chỉ hiển thị tour ĐÃ THANH TOÁN và CÒN TRẢI NGHIỆM ĐƯỢC.
      // Đơn đang hoàn tiền hoặc đã hoàn xong ⇒ không còn hiệu lực trải nghiệm
      // ⇒ loại khỏi danh sách này (khách xem ở màn "Đơn đặt tour của tôi").
      if (refundIndex.hasRefund(b.id)) continue;

      final mine = journeys.where((j) => j.bookingId == b.id).toList()
        ..sort((a, c) => c.id.compareTo(a.id));
      final journey = mine.where((j) => j.status == ProgressStatus.inProgress).firstOrNull ??
          mine.where((j) => j.isCompleted).firstOrNull;
      if (journey != null) usedJourneys.add(journey.id);
      // Chưa có hành trình ⇒ xếp theo ngày (giờ VN): chưa tới ngày ⇒ Sắp khởi hành;
      // trong thời gian tour ⇒ Đang diễn ra (chờ bấm "Bắt đầu"); quá ngày cuối ⇒ Đã kết thúc.
      final stage = journey?.status == ProgressStatus.inProgress
          ? _Stage.active
          : (journey?.isCompleted ?? false) || b.status == BookingStatus.completed || b.isExperienceExpired
              ? _Stage.done
              : b.isTourLocked
                  ? _Stage.ready
                  : _Stage.active;
      items.add(_MyTour(
        booking: b,
        journey: journey,
        tour: tourById[b.tourId],
        stage: stage,
        refundState: refundIndex.stateFor(b.id),
      ));
    }

    for (final j in journeys) {
      if (usedJourneys.contains(j.id) || (j.bookingId != null && tickets.any((b) => b.id == j.bookingId))) continue;
      final active = j.status == ProgressStatus.inProgress;
      if (!active && !j.isCompleted) continue;
      items.add(_MyTour(
        booking: null,
        journey: j,
        tour: tourById[j.tourId],
        stage: active ? _Stage.active : _Stage.done,
      ));
    }
    return items;
  }

  List<_MyTour> _of(_Stage stage) {
    final list = _items.where((i) => i.stage == stage).toList();
    switch (stage) {
      case _Stage.ready:
        // Ngày đi gần nhất lên trước
        list.sort((a, b) => (a.booking?.experienceDate ?? DateTime(9999))
            .compareTo(b.booking?.experienceDate ?? DateTime(9999)));
      case _Stage.done:
        list.sort((a, b) => (b.journey?.completedAt ?? DateTime(0)).compareTo(a.journey?.completedAt ?? DateTime(0)));
      case _Stage.active:
        // Việc của hôm nay (đang đi / tới ngày chờ bắt đầu) lên trước; hành trình cũ chưa xong xuống sau
        list.sort((a, b) => (a.isStale ? 1 : 0).compareTo(b.isStale ? 1 : 0));
    }
    return list;
  }

  Future<void> _openJourney(_MyTour item) async {
    final journey = item.journey;
    final booking = item.booking;

    // Tour đã mua nhưng ngày trải nghiệm còn ở tương lai ⇒ mở màn CHI TIẾT TOUR
    // (giống hệt lúc chưa mua) thay vì màn hành trình (backend sẽ khoá tour).
    // Đã qua thời gian tour mà chưa bắt đầu ⇒ cũng mở chi tiết tour (thanh dưới báo "Đã quá ngày trải nghiệm").
    if (journey == null && booking != null && (booking.isTourLocked || booking.isExperienceExpired)) {
      await openTourDetailScreen(
        context,
        tourId: item.tourId,
        tour: item.tour,
        bookedBooking: booking,
      );
      if (mounted) _load();
      return;
    }

    await Navigator.of(context).push(MaterialPageRoute(
      builder: (_) => journey != null && item.stage != _Stage.ready
          ? JourneyScreen(journeyId: journey.id)
          : JourneyScreen(tourId: item.tourId, bookingId: booking?.id),
    ));
    if (mounted) _load();
  }

  Future<void> _openTour(TourModel tour) async {
    await Navigator.of(context).push(MaterialPageRoute(builder: (_) => TourDetailScreen(tour: tour)));
    if (mounted) _load();
  }

  Future<void> _openBooking(BookingModel booking) async {
    await Navigator.of(context).push(MaterialPageRoute(
      builder: (_) => BookingDetailScreen(bookingId: booking.id, booking: booking),
    ));
    if (mounted) _load();
  }

  bool _shows(_Stage stage) => switch (_filter) {
        _Filter.all => true,
        _Filter.active => stage == _Stage.active,
        _Filter.ready => stage == _Stage.ready,
        _Filter.done => stage == _Stage.done,
      };

  @override
  Widget build(BuildContext context) {
    if (_loading) return const RewardsSkeletonList(count: 3, itemHeight: 220);
    if (_error != null && _items.isEmpty) {
      return RewardsMessageView(
        icon: Icons.cloud_off_rounded,
        title: context.l10n.tripsLoadFailed,
        message: _error,
        onRetry: _load,
      );
    }

    final active = _of(_Stage.active);
    final ready = _of(_Stage.ready);
    final done = _of(_Stage.done);
    final groups = [(_Stage.active, active), (_Stage.ready, ready), (_Stage.done, done)];
    final visible = groups.where((g) => _shows(g.$1) && g.$2.isNotEmpty).toList();
    var order = 1;

    return RefreshIndicator(
      color: TripsPalette.accent,
      onRefresh: _load,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        // Chừa chỗ cho thanh điều hướng và nút CHECK-IN nổi
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 40),
        children: [
          if (_pending.isNotEmpty || _refundNeeded.isNotEmpty)
            Reveal(order: 0, child: _buildActionCenter()),
          if (_items.isEmpty)
            Reveal(order: 1, child: _buildEmpty())
          else ...[
            Reveal(
              order: 0,
              child: _FilterBar(
                selected: _filter,
                counts: {
                  _Filter.all: _items.length,
                  _Filter.active: active.length,
                  _Filter.ready: ready.length,
                  _Filter.done: done.length,
                },
                onSelect: (f) => setState(() => _filter = f),
              ),
            ),
            if (visible.isEmpty)
              Padding(
                padding: EdgeInsets.symmetric(vertical: 48),
                child: Text(
                  context.l10n.tripsEmptySection,
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 14, color: TripsPalette.muted),
                ),
              ),
            for (final (stage, list) in visible) ...[
              Reveal(
                order: order++,
                child: _sectionTitle(stage, list.length),
              ),
              for (final item in list)
                Reveal(
                  order: order < 6 ? order++ : order,
                  child: _TripCard(
                    item: item,
                    // Vé đã kết thúc mà không còn hành trình thì không mở lại (tránh tạo hành trình mới)
                    onJourney: stage == _Stage.done && item.journey == null ? null : () => _openJourney(item),
                    onDetail: item.booking == null ? null : () => _openBooking(item.booking!),
                    onRebook: item.tour == null ? null : () => _openTour(item.tour!),
                  ),
                ),
            ],
          ],
        ],
      ),
    );
  }

  /// Khối "Cần bạn xử lý": giữ chỗ (đếm ngược, chạm để thanh toán) và đơn cần gửi hoàn tiền.
  Widget _buildActionCenter() {
    return Padding(
      padding: const EdgeInsets.only(top: 8, bottom: 4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(2, 0, 2, 8),
            child: Row(
              children: [
                const Icon(Icons.error_outline_rounded, size: 17, color: TripsPalette.orangeInk),
                const SizedBox(width: 6),
                Text(
                  context.l10n.tripsActionTitle,
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: TripsPalette.orangeInk),
                ),
              ],
            ),
          ),
          for (final b in _pending)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: PendingBookingBanner(
                booking: b,
                showTourTitle: true,
                onTap: () async {
                  await openPendingBooking(context, b);
                  if (mounted) _load();
                },
                onExpired: _load,
              ),
            ),
          for (final b in _refundNeeded)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: _RefundNeededTile(booking: b, onTap: () => _openBooking(b)),
            ),
        ],
      ),
    );
  }

  Widget _sectionTitle(_Stage stage, int count) {
    final label = switch (stage) {
      _Stage.active => context.l10n.tripsStageActive,
      _Stage.ready => context.l10n.tripsStageReady,
      _Stage.done => context.l10n.tripsStageEnded,
    };
    return Padding(
      padding: const EdgeInsets.fromLTRB(2, 22, 2, 12),
      child: Row(
        children: [
          // Mỗi nhóm một biểu tượng + màu; "Đang diễn ra" nổi bật nhất (ô xanh ngọc đặc, chữ to, màu nhấn)
          if (stage == _Stage.active)
            Container(
              width: 30,
              height: 30,
              margin: const EdgeInsets.only(right: 10),
              decoration: BoxDecoration(color: TripsPalette.accent, borderRadius: BorderRadius.circular(10)),
              // Người đang đi bộ (không dùng la bàn — dễ lẫn với biểu tượng AI)
              child: const Icon(Icons.directions_walk_rounded, size: 19, color: Colors.white),
            )
          else
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: Icon(
                stage == _Stage.ready ? Icons.event_rounded : Icons.flag_rounded,
                size: 20,
                color: TripsPalette.muted,
              ),
            ),
          Text(
            label,
            style: TextStyle(
              fontSize: stage == _Stage.active ? 20 : 17,
              fontWeight: FontWeight.w800,
              letterSpacing: -0.2,
              color: stage == _Stage.active ? TripsPalette.accent : TripsPalette.ink,
            ),
          ),
          const SizedBox(width: 8),
          // Bỏ nhãn "Trực tiếp" cạnh "Đang diễn ra" (trùng ý) — mọi nhóm chỉ hiện số chuyến
          _Pill(background: TripsPalette.track, foreground: TripsPalette.slate, label: '$count'),
        ],
      ),
    );
  }

  Widget _buildEmpty() {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 44, horizontal: 12),
      child: Column(
        children: [
          Container(
            width: 92,
            height: 92,
            decoration: const BoxDecoration(color: TripsPalette.successSoft, shape: BoxShape.circle),
            child: const Icon(Icons.confirmation_number_outlined, size: 42, color: TripsPalette.accent),
          ),
          const SizedBox(height: 18),
          Text(context.l10n.tripsEmptyTitle,
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: TripsPalette.ink)),
          const SizedBox(height: 6),
          Text(
            context.l10n.tripsEmptyMessage,
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 13.5, height: 1.45, color: TripsPalette.muted),
          ),
          const SizedBox(height: 20),
          FilledButton.icon(
            onPressed: widget.onExplore,
            icon: const Icon(Icons.travel_explore_rounded, size: 19),
            label: Text(context.l10n.tripsExplore, style: const TextStyle(fontWeight: FontWeight.w700)),
            style: FilledButton.styleFrom(
              backgroundColor: TripsPalette.accent,
              minimumSize: const Size(0, 50),
              padding: const EdgeInsets.symmetric(horizontal: 24),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Bộ lọc dạng segmented control ─────────────────────────────────────────────

class _FilterBar extends StatelessWidget {
  final _Filter selected;
  final Map<_Filter, int> counts;
  final ValueChanged<_Filter> onSelect;

  const _FilterBar({required this.selected, required this.counts, required this.onSelect});

  static String _label(_Filter f) => switch (f) {
        _Filter.all => appL10n.listAll,
        _Filter.active => appL10n.tripsFilterActive,
        _Filter.ready => appL10n.tripsFilterReady,
        _Filter.done => appL10n.tripsFilterDone,
      };

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(top: 8),
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(color: TripsPalette.track, borderRadius: BorderRadius.circular(16)),
      child: Row(
        children: [
          for (final f in _Filter.values) ...[
            if (f != _Filter.all) const SizedBox(width: 4),
            Expanded(
              child: Semantics(
                button: true,
                selected: f == selected,
                child: GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTap: () => onSelect(f),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    curve: Curves.easeOutCubic,
                    height: 40,
                    decoration: BoxDecoration(
                      color: f == selected ? Colors.white : Colors.transparent,
                      borderRadius: BorderRadius.circular(12),
                      boxShadow: f == selected
                          ? [BoxShadow(color: TripsPalette.ink.withValues(alpha: 0.10), blurRadius: 8, offset: const Offset(0, 2))]
                          : null,
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Flexible(
                          child: Text(
                            _label(f),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 12.5,
                              fontWeight: FontWeight.w700,
                              color: f == selected ? TripsPalette.ink : TripsPalette.slate,
                            ),
                          ),
                        ),
                        const SizedBox(width: 4),
                        Container(
                          constraints: const BoxConstraints(minWidth: 18),
                          height: 18,
                          padding: const EdgeInsets.symmetric(horizontal: 5),
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            color: f == selected ? TripsPalette.accent : TripsPalette.chipIdle,
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Text(
                            '${counts[f] ?? 0}',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w800,
                              color: f == selected ? Colors.white : const Color(0xFF334155),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

// ── Thẻ chuyến đi: MỘT khung gọn dùng chung cho mọi nhóm (cùng chiều cao) ─────────
//
// ┌──────────────────────────────────────┐
// │ [ảnh 92]  [nhãn] [nhãn]              │
// │           Tên tour (luôn giữ 2 dòng) │
// │           N điểm đến                 │
// │ dòng trạng thái (tiến độ / đếm ngược)│
// │ [ nút chính                ] [ 🎫 ]  │
// └──────────────────────────────────────┘
// Hành trình đang đi dở ⇒ nền tối để nổi bật; còn lại nền trắng. Không hiện mã vé
// (xem trong "Chi tiết vé" — nút 🎫).

class _TripCard extends StatelessWidget {
  final _MyTour item;

  /// Mở hành trình / chi tiết tour (nút chính + chạm thẻ). Null ⇒ không mở hành trình được.
  final VoidCallback? onJourney;

  /// Mở chi tiết vé (nút 🎫). Null khi không có vé (hành trình tour miễn phí).
  final VoidCallback? onDetail;

  /// Đặt lại tour (vé bỏ lỡ / đã hoàn tiền).
  final VoidCallback? onRebook;

  const _TripCard({required this.item, this.onJourney, this.onDetail, this.onRebook});

  static const double _cover = 92;
  static const double _titleSize = 15;
  static const double _titleLineHeight = 1.3;

  /// Hành trình đã bấm Bắt đầu và chưa xong.
  bool get _inProgress => item.stage == _Stage.active && item.journey != null;

  /// Mỗi loại thẻ một tông nền RẤT nhạt + viền cùng tông (nền, viền, độ đậm viền).
  /// Việc của HÔM NAY (tới ngày chờ bắt đầu / đang đi) viền đậm hơn; hành trình cũ chưa xong
  /// ("Đi tiếp nhé") không được nổi hơn tour cần làm hôm nay.
  (Color, Color, double) get _tone {
    if (_inProgress) {
      return item.isStale
          ? (const Color(0xFFFFF8EC), const Color(0xFFF6D9A8), 1) // Đi tiếp nhé — vàng hổ phách
          : (const Color(0xFFF0FBF4), const Color(0xFF86D9A5), 1.5); // Đang trải nghiệm — xanh lá
    }
    return switch (item.stage) {
      _Stage.active => (const Color(0xFFEFF9F8), const Color(0xFF7CC7C3), 1.5), // Hôm nay — xanh ngọc
      _Stage.ready => (const Color(0xFFF3F7FF), const Color(0xFFD3E0FB), 1), // Sắp khởi hành — xanh dương
      _Stage.done => item.missed
          ? (const Color(0xFFF4F5F7), const Color(0xFFE2E5EA), 1) // Bỏ lỡ — xám
          : (const Color(0xFFF6F4FE), const Color(0xFFDDD6FA), 1), // Đã hoàn thành — tím nhạt
    };
  }

  @override
  Widget build(BuildContext context) {
    final tour = item.tour;
    final style = TourStyle.of(tour?.tourType ?? '');
    const titleColor = TripsPalette.ink;
    const mutedColor = TripsPalette.muted;
    final meta = item.total > 0 ? context.l10n.tripsDestinations(item.total) : '';
    // Tên tour luôn chiếm chỗ đúng 2 dòng ⇒ mọi thẻ cao bằng nhau (kể cả khi phóng to chữ)
    final titleBox = MediaQuery.textScalerOf(context).scale(_titleSize) * _titleLineHeight * 2 + 1;
    final primary = _primary(context);
    final (tint, borderColor, borderWidth) = _tone;

    return Pressable(
      onTap: onJourney ?? onDetail,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: tint,
          borderRadius: BorderRadius.circular(22),
          border: Border.all(color: borderColor, width: borderWidth),
          boxShadow: [
            BoxShadow(color: TripsPalette.ink.withValues(alpha: 0.06), blurRadius: 22, offset: const Offset(0, 8)),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SizedBox(
                  width: _cover,
                  height: _cover,
                  child: TourCover(
                    imageUrl: tour?.coverImageUrl,
                    colors: style.colors,
                    height: _cover,
                    borderRadius: BorderRadius.circular(16),
                    padding: EdgeInsets.zero,
                    child: tour?.coverImageUrl == null
                        ? Center(child: Icon(style.icon, size: 34, color: Colors.white.withValues(alpha: 0.55)))
                        : const SizedBox.shrink(),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      SizedBox(
                        height: 24,
                        child: ListView(
                          scrollDirection: Axis.horizontal,
                          physics: const NeverScrollableScrollPhysics(),
                          padding: EdgeInsets.zero,
                          children: [
                            for (final (i, chip) in _chips(context).indexed) ...[
                              if (i > 0) const SizedBox(width: 6),
                              chip,
                            ],
                          ],
                        ),
                      ),
                      const SizedBox(height: 6),
                      SizedBox(
                        height: titleBox,
                        child: Text(
                          item.title,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: _titleSize,
                            height: _titleLineHeight,
                            fontWeight: FontWeight.w800,
                            color: titleColor,
                          ),
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        meta,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 12.5, color: mutedColor),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            SizedBox(height: 20, child: _statusRow(context, mutedColor)),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: SizedBox(
                    height: 44,
                    child: FilledButton.icon(
                      onPressed: primary.onPressed,
                      icon: Icon(primary.icon, size: 18),
                      label: Text(
                        primary.label,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontWeight: FontWeight.w800),
                      ),
                      style: FilledButton.styleFrom(
                        backgroundColor: primary.background,
                        foregroundColor: primary.foreground,
                        disabledBackgroundColor: Colors.white,
                        disabledForegroundColor: mutedColor,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                    ),
                  ),
                ),
                if (onDetail != null) ...[
                  const SizedBox(width: 8),
                  Tooltip(
                    message: context.l10n.tripsTicketDetails,
                    child: Material(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(14),
                      child: InkWell(
                        borderRadius: BorderRadius.circular(14),
                        onTap: onDetail,
                        child: const SizedBox(
                          width: 44,
                          height: 44,
                          child: Icon(Icons.confirmation_number_outlined, size: 20, color: TripsPalette.ink),
                        ),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }

  /// Nhãn trên cùng: trạng thái + ngày.
  List<Widget> _chips(BuildContext context) {
    final date = item.tripDate;
    final l10n = context.l10n;
    // Ngày: đậm cho chuyến sắp tới / hôm nay; xám nhạt khi đã qua (đi dở hoặc đã kết thúc)
    final pastDate = item.stage == _Stage.done || item.isStale;
    final dateChip = date == null
        ? null
        : _Pill(
            background: pastDate ? TripsPalette.track : TripsPalette.ink,
            foreground: pastDate ? TripsPalette.slate : Colors.white,
            label: _weekdayDate(date),
            radius: 8,
            height: 24,
          );
    if (_inProgress) {
      return [
        // Nhãn màu NHẠT (cùng tông với các thẻ khác) — không tô đậm cả thẻ
        item.isStale
            ? _Pill(
                background: TripsPalette.goldSoft,
                foreground: TripsPalette.goldInk,
                leading: const Icon(Icons.play_arrow_rounded, size: 14, color: TripsPalette.goldInk),
                label: l10n.tripsUnfinished,
                radius: 8,
                height: 24,
              )
            : _Pill(
                background: TripsPalette.successSoft,
                foreground: TripsPalette.successInk,
                leading: _LiveDot(color: TripsPalette.success),
                label: l10n.tripsExperiencing,
                radius: 8,
                height: 24,
              ),
        ?dateChip,
      ];
    }
    if (item.stage == _Stage.done) {
      return [
        ?dateChip,
        item.missed
            ? _Pill(
                background: TripsPalette.track,
                foreground: TripsPalette.slate,
                label: l10n.tdExperienceExpired,
                radius: 8,
                height: 24,
              )
            : _Pill(
                background: TripsPalette.successSoft,
                foreground: TripsPalette.successInk,
                leading: const Icon(Icons.check_rounded, size: 13, color: TripsPalette.successInk),
                label: l10n.statusCompleted,
                radius: 8,
                height: 24,
              ),
      ];
    }
    final countdown = _countdownLabel(item.booking?.experienceDate);
    return [
      ?dateChip,
      if (countdown != null)
        _Pill(
          // "Hôm nay" (tới ngày) ⇒ xanh ngọc như nút Bắt đầu; "Ngày mai / Còn N ngày" ⇒ xanh dương như thẻ sắp khởi hành
          background: item.stage == _Stage.active ? TripsPalette.accentSoft : const Color(0xFFDCE7FD),
          foreground: item.stage == _Stage.active ? TripsPalette.accent : const Color(0xFF1D4ED8),
          label: countdown,
          radius: 8,
          height: 24,
        ),
    ];
  }

  /// Dòng trạng thái (luôn có, cao cố định): tiến độ trạm, đếm ngược, hoặc lời nhắn.
  Widget _statusRow(BuildContext context, Color mutedColor) {
    final l10n = context.l10n;
    final total = item.total;

    Widget note(IconData icon, String text) => Row(
          children: [
            Icon(icon, size: 15, color: mutedColor),
            const SizedBox(width: 6),
            Expanded(
              child: Text(
                text,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: mutedColor),
              ),
            ),
          ],
        );

    // Chưa tới ngày ⇒ đếm ngược
    if (item.stage == _Stage.ready) {
      return note(Icons.schedule_rounded, _countdownLabel(item.booking?.experienceDate) ?? l10n.tripsStageReady);
    }
    // Vé bỏ lỡ
    if (item.missed) return note(Icons.event_busy_rounded, l10n.tripsNotJoined);
    // Vé đã xong nhưng không còn hành trình (không có số liệu trạm)
    if (item.stage == _Stage.done && item.journey == null) {
      return note(Icons.check_circle_outline_rounded, l10n.statusCompleted);
    }
    if (total == 0) return note(Icons.flag_outlined, l10n.rewardPlusPoints('${item.points}'));

    // Có hành trình (hoặc tới ngày chờ bắt đầu) ⇒ thanh trạm + "x/y · +điểm"
    return Row(
      children: [
        Expanded(child: _StationProgress(done: item.done, total: total)),
        const SizedBox(width: 10),
        Text.rich(
          TextSpan(children: [
            TextSpan(
              text: '${item.done}/$total',
              style: const TextStyle(fontWeight: FontWeight.w800, color: TripsPalette.ink),
            ),
            const TextSpan(text: ' · '),
            TextSpan(
              text: l10n.rewardPlusPoints('${item.points}'),
              style: const TextStyle(fontWeight: FontWeight.w800, color: TripsPalette.goldInk),
            ),
          ]),
          style: TextStyle(fontSize: 12.5, color: mutedColor),
        ),
      ],
    );
  }

  /// Nút chính theo trạng thái thẻ.
  ///
  /// ⚠️ Màn "Chuyến đi" chỉ hiển thị tour đã thanh toán và còn trải nghiệm được (không dính
  /// hoàn tiền) ⇒ các nhánh "đang/có hoàn tiền" chỉ là lưới an toàn (đơn vừa gửi yêu cầu
  /// hoàn tiền nhưng danh sách chưa kịp tải lại).
  ({IconData icon, String label, VoidCallback? onPressed, Color background, Color foreground}) _primary(
    BuildContext context,
  ) {
    final l10n = context.l10n;
    const white = Colors.white;
    if (item.isRefunding) {
      return (
        icon: Icons.pending_actions_rounded,
        label: l10n.refundStatusProcessing,
        onPressed: onDetail,
        background: TripsPalette.orangeInk,
        foreground: white,
      );
    }
    if (item.isRefundResolved) {
      return (
        icon: Icons.replay_rounded,
        label: l10n.mbRebook,
        onPressed: onRebook,
        background: TripsPalette.accent,
        foreground: white,
      );
    }
    if (_inProgress) {
      // Đang đi trong thời gian tour ⇒ nút đặc (hành động chính);
      // hành trình cũ chưa xong ⇒ nút nhạt, nhường ưu tiên cho việc hôm nay.
      return (
        icon: Icons.navigation_rounded,
        label: l10n.tdContinueJourney,
        onPressed: onJourney,
        background: item.isStale ? TripsPalette.accentSoft : TripsPalette.accent,
        foreground: item.isStale ? TripsPalette.accent : white,
      );
    }
    switch (item.stage) {
      case _Stage.ready:
        return (
          icon: Icons.map_outlined,
          label: l10n.tripsViewItinerary,
          onPressed: onJourney,
          background: TripsPalette.accent,
          foreground: white,
        );
      case _Stage.active:
        return (
          icon: Icons.play_arrow_rounded,
          label: l10n.tripsStart,
          onPressed: onJourney,
          background: TripsPalette.accent,
          foreground: white,
        );
      case _Stage.done:
        if (item.journey != null) {
          return (
            icon: Icons.history_rounded,
            label: l10n.sumReview,
            onPressed: onJourney,
            background: Colors.white,
            foreground: TripsPalette.ink,
          );
        }
        return (
          icon: Icons.replay_rounded,
          label: l10n.mbRebook,
          onPressed: onRebook,
          background: TripsPalette.accent,
          foreground: white,
        );
    }
  }

  /// "Hôm nay" / "Ngày mai" / "Còn N ngày" (theo giờ Việt Nam — khớp cách backend tính).
  /// Đơn đang/có hoàn tiền ⇒ không đếm ngược.
  String? _countdownLabel(DateTime? d) {
    if (d == null || item.isRefunding || item.isRefundResolved) return null;
    final days = DateUtils.dateOnly(d).difference(_vnToday()).inDays;
    if (days < 0) return null;
    if (days == 0) return appL10n.tripsToday;
    if (days == 1) return appL10n.tripsTomorrow;
    return appL10n.tripsDaysLeft(days);
  }
}

/// Thanh tiến độ chia đoạn theo trạm (quá nhiều trạm thì gộp thành một thanh liền).
class _StationProgress extends StatelessWidget {
  final int done;
  final int total;

  const _StationProgress({required this.done, required this.total});

  @override
  Widget build(BuildContext context) {
    const track = TripsPalette.track;
    const fill = TripsPalette.accent;
    if (total > 8) {
      return Center(
        child: ClipRRect(
          borderRadius: BorderRadius.circular(999),
          child: LinearProgressIndicator(
            value: done / total,
            minHeight: 6,
            backgroundColor: track,
            valueColor: AlwaysStoppedAnimation(fill),
          ),
        ),
      );
    }
    return Row(
      children: [
        for (var i = 0; i < total; i++) ...[
          if (i > 0) const SizedBox(width: 4),
          Expanded(
            child: TweenAnimationBuilder<double>(
              tween: Tween(begin: 0, end: i < done ? 1 : 0),
              duration: Duration(milliseconds: 400 + 120 * i),
              curve: Curves.easeOutCubic,
              builder: (_, v, _) => Container(
                height: 6,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(999),
                  color: Color.lerp(track, fill, v),
                ),
              ),
            ),
          ),
        ],
      ],
    );
  }
}

// ── Thành phần dùng chung ────────────────────────────────────────────────────

/// Đơn đã trả tiền nhưng bị hủy/hết hạn, chưa gửi hoàn tiền ⇒ chạm để mở chi tiết đơn và gửi yêu cầu.
class _RefundNeededTile extends StatelessWidget {
  final BookingModel booking;
  final VoidCallback onTap;

  const _RefundNeededTile({required this.booking, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: TripsPalette.orangeSoft,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.fromLTRB(14, 12, 10, 12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: TripsPalette.orange.withValues(alpha: 0.35)),
          ),
          child: Row(
            children: [
              const Icon(Icons.undo_rounded, color: TripsPalette.orange, size: 22),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      context.l10n.tripsRefundNeededTitle,
                      style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w800, color: TripsPalette.orangeInk),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${booking.tourTitle} · ${booking.formattedTotal}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 12, color: TripsPalette.muted),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right_rounded, color: TripsPalette.orangeInk),
            ],
          ),
        ),
      ),
    );
  }
}

class _Pill extends StatelessWidget {
  final Color background;
  final Color foreground;
  final String label;
  final Widget? leading;
  final double height;
  final double radius;

  const _Pill({
    required this.background,
    required this.foreground,
    required this.label,
    this.leading,
    this.height = 26,
    this.radius = 999,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: height,
      padding: const EdgeInsets.symmetric(horizontal: 10),
      decoration: BoxDecoration(color: background, borderRadius: BorderRadius.circular(radius)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (leading != null) ...[leading!, const SizedBox(width: 6)],
          Text(label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: foreground)),
        ],
      ),
    );
  }
}

/// Chấm "trực tiếp" nhấp nháy.
class _LiveDot extends StatefulWidget {
  final Color color;
  const _LiveDot({required this.color});

  @override
  State<_LiveDot> createState() => _LiveDotState();
}

class _LiveDotState extends State<_LiveDot> with SingleTickerProviderStateMixin {
  late final AnimationController _anim =
      AnimationController(vsync: this, duration: const Duration(milliseconds: 800))..repeat(reverse: true);

  @override
  void dispose() {
    _anim.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: Tween<double>(begin: 1, end: 0.35).animate(_anim),
      child: Container(width: 7, height: 7, decoration: BoxDecoration(color: widget.color, shape: BoxShape.circle)),
    );
  }
}

/// "T4 · 25/11", "CN · 30/11".
String _weekdayDate(DateTime d) {
  return '${formatWeekdayShort(d)} · ${formatDayMonth(d)}';
}
