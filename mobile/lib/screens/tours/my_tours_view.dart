import 'package:flutter/material.dart';
import 'package:flutter/services.dart' show Clipboard, ClipboardData;
import '../../core/models/booking_model.dart';
import '../../core/models/refund_model.dart';
import '../../core/models/tour_journey_model.dart';
import '../../core/models/tour_model.dart';
import '../../core/services/api_client.dart';
import '../../core/services/progress_service.dart';
import '../../core/services/refund_service.dart';
import '../../core/services/tour_service.dart';
import '../booking/booking_detail_screen.dart';
import '../common/heritage_motion.dart';
import '../journey/journey_screen.dart';
import '../rewards/rewards_widgets.dart' show RewardsMessageView, RewardsSkeletonList;
import 'tour_detail_screen.dart';
import 'tour_detail_opener.dart';
import 'tour_style.dart';

/// Bảng màu hiện đại của màn "Chuyến đi": nền xám lạnh, chữ xanh than, nhấn xanh ngọc tươi,
/// cam cho việc cần làm ngay (đếm ngược), vàng cho điểm thưởng.
abstract final class TripsPalette {
  static const background = Color(0xFFF3F5F8);
  static const ink = Color(0xFF0F172A);
  static const muted = Color(0xFF64748B);
  static const line = Color(0xFFE2E8F0);
  static const track = Color(0xFFE8ECF1);
  static const chipIdle = Color(0xFFD5DCE4);
  static const surfaceSoft = Color(0xFFF1F5F9);
  static const accent = Color(0xFF047857);
  static const accentBright = Color(0xFF34D399);
  static const accentInk = Color(0xFF052E1C);
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
  final TourService _tourService = TourService();
  final RefundService _refundService = RefundService();

  List<_MyTour> _items = const [];
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
        _progress.getTickets(),
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
      setState(() {
        _items = _combine(
          results[0] as List<BookingModel>,
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
      final stage = journey?.status == ProgressStatus.inProgress
          ? _Stage.active
          : (journey?.isCompleted ?? false) || b.status == BookingStatus.completed
              ? _Stage.done
              : _Stage.ready;
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
        break;
    }
    return list;
  }

  Future<void> _openJourney(_MyTour item) async {
    final journey = item.journey;
    final booking = item.booking;

    // Tour đã mua nhưng ngày trải nghiệm còn ở tương lai ⇒ mở màn CHI TIẾT TOUR
    // (giống hệt lúc chưa mua) thay vì màn hành trình (backend sẽ khoá tour).
    if (journey == null && booking != null && booking.isTourLocked) {
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
        title: 'Không tải được chuyến đi của bạn',
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
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 48),
                child: Text(
                  'Chưa có chuyến đi nào ở mục này.',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 14, color: TripsPalette.muted),
                ),
              ),
            for (final (stage, list) in visible) ...[
              Reveal(order: order++, child: _sectionTitle(stage, list.length)),
              for (final item in list)
                Reveal(
                  order: order < 6 ? order++ : order,
                  child: switch (stage) {
                    _Stage.active => _ActiveCard(item: item, onJourney: () => _openJourney(item)),
                    _Stage.ready => _ReadyCard(
                        item: item,
                        onJourney: () => _openJourney(item),
                        onDetail: item.booking == null ? null : () => _openBooking(item.booking!),
                        onRebook: item.tour == null ? null : () => _openTour(item.tour!),
                      ),
                    _Stage.done => _DoneCard(
                        item: item,
                        // Vé đã xong nhưng không còn hành trình thì không mở lại (tránh tạo hành trình mới)
                        onJourney: item.journey == null ? null : () => _openJourney(item),
                        onRebook: item.tour == null ? null : () => _openTour(item.tour!),
                      ),
                  },
                ),
            ],
          ],
        ],
      ),
    );
  }

  Widget _sectionTitle(_Stage stage, int count) {
    final label = switch (stage) {
      _Stage.active => 'Đang diễn ra',
      _Stage.ready => 'Sắp khởi hành',
      _Stage.done => 'Đã hoàn thành',
    };
    return Padding(
      padding: const EdgeInsets.fromLTRB(2, 22, 2, 12),
      child: Row(
        children: [
          Text(label,
              style: const TextStyle(
                  fontSize: 18, fontWeight: FontWeight.w800, letterSpacing: -0.2, color: TripsPalette.ink)),
          const SizedBox(width: 8),
          if (stage == _Stage.active)
            const _Pill(
              background: TripsPalette.successSoft,
              foreground: TripsPalette.successInk,
              leading: _LiveDot(color: TripsPalette.success),
              label: 'Trực tiếp',
            )
          else
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
          const Text('Bạn chưa có chuyến đi nào',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: TripsPalette.ink)),
          const SizedBox(height: 6),
          const Text(
            'Đặt một tour ở trang Khám phá, vé sẽ nằm tại đây để bạn bắt đầu hành trình khi đến nơi.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 13.5, height: 1.45, color: TripsPalette.muted),
          ),
          const SizedBox(height: 20),
          FilledButton.icon(
            onPressed: widget.onExplore,
            icon: const Icon(Icons.travel_explore_rounded, size: 19),
            label: const Text('Khám phá tour', style: TextStyle(fontWeight: FontWeight.w700)),
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

  static const _labels = {
    _Filter.all: 'Tất cả',
    _Filter.active: 'Đang đi',
    _Filter.ready: 'Sắp tới',
    _Filter.done: 'Đã xong',
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
                            _labels[f]!,
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

// ── Thẻ "Đang diễn ra": nền tối, ảnh lồng bo góc, tiến độ chia theo trạm ─────────

class _ActiveCard extends StatelessWidget {
  final _MyTour item;
  final VoidCallback onJourney;

  const _ActiveCard({required this.item, required this.onJourney});

  @override
  Widget build(BuildContext context) {
    final tour = item.tour;
    final style = TourStyle.of(tour?.tourType ?? '');
    final booking = item.booking;
    final total = item.total;
    final current = total == 0 ? 0 : (item.done + 1).clamp(1, total);
    final meta = [
      if (booking?.experienceDate != null) _date(booking!.experienceDate!),
      if (item.guests > 0) '${item.guests} khách',
      if (total > 0) '$total trạm',
    ].join(' · ');

    return Pressable(
      onTap: onJourney,
      child: Container(
        margin: const EdgeInsets.only(bottom: 16),
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
          color: TripsPalette.night,
          borderRadius: BorderRadius.circular(28),
          boxShadow: [
            BoxShadow(color: TripsPalette.night.withValues(alpha: 0.28), blurRadius: 30, offset: const Offset(0, 14)),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.all(10),
              child: TourCover(
                height: 172,
                imageUrl: tour?.coverImageUrl,
                colors: style.colors,
                borderRadius: BorderRadius.circular(20),
                padding: const EdgeInsets.all(12),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const _Pill(
                      background: Color(0x990F172A),
                      foreground: Colors.white,
                      leading: _LiveDot(color: TripsPalette.accentBright),
                      label: 'Đang trải nghiệm',
                      height: 30,
                    ),
                    if (total > 0)
                      _Pill(
                        background: Colors.white.withValues(alpha: 0.94),
                        foreground: TripsPalette.ink,
                        label: 'Trạm $current/$total',
                        height: 30,
                      ),
                  ],
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(18, 6, 18, 18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 19,
                      height: 1.3,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -0.2,
                    ),
                  ),
                  if (meta.isNotEmpty) ...[
                    const SizedBox(height: 6),
                    Text(meta, style: const TextStyle(fontSize: 12.5, color: TripsPalette.nightMuted)),
                  ],
                  if (total > 0) ...[
                    const SizedBox(height: 16),
                    _StationProgress(done: item.done, total: total),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: Text.rich(
                            TextSpan(children: [
                              TextSpan(
                                text: '${item.done}/$total',
                                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800),
                              ),
                              const TextSpan(text: ' trạm đã check-in'),
                            ]),
                            style: const TextStyle(fontSize: 12.5, color: TripsPalette.nightMuted),
                          ),
                        ),
                        Text(
                          '+${item.points} điểm',
                          style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: TripsPalette.gold),
                        ),
                      ],
                    ),
                  ],
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    height: 52,
                    child: FilledButton.icon(
                      onPressed: onJourney,
                      icon: const Icon(Icons.navigation_rounded, size: 19),
                      label: const Text('Tiếp tục hành trình', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                      style: FilledButton.styleFrom(
                        backgroundColor: TripsPalette.accentBright,
                        foregroundColor: TripsPalette.accentInk,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Thanh tiến độ chia đoạn theo trạm (quá nhiều trạm thì gộp thành một thanh liền).
class _StationProgress extends StatelessWidget {
  final int done;
  final int total;

  const _StationProgress({required this.done, required this.total});

  @override
  Widget build(BuildContext context) {
    if (total > 8) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(999),
        child: LinearProgressIndicator(
          value: done / total,
          minHeight: 6,
          backgroundColor: TripsPalette.nightTrack,
          valueColor: const AlwaysStoppedAnimation(TripsPalette.accentBright),
        ),
      );
    }
    return Row(
      children: [
        for (var i = 0; i < total; i++) ...[
          if (i > 0) const SizedBox(width: 6),
          Expanded(
            child: TweenAnimationBuilder<double>(
              tween: Tween(begin: 0, end: i < done ? 1 : 0),
              duration: Duration(milliseconds: 400 + 120 * i),
              curve: Curves.easeOutCubic,
              builder: (_, v, _) => Container(
                height: 6,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(999),
                  color: Color.lerp(TripsPalette.nightTrack, TripsPalette.accentBright, v),
                ),
              ),
            ),
          ),
        ],
      ],
    );
  }
}

// ── Thẻ "Sắp khởi hành": kiểu vé, mã vé hiện đầy đủ, chạm để sao chép ─────────

class _ReadyCard extends StatelessWidget {
  final _MyTour item;
  final VoidCallback onJourney;
  final VoidCallback? onDetail;
  final VoidCallback? onRebook;

  const _ReadyCard({required this.item, required this.onJourney, required this.onDetail, required this.onRebook});

  @override
  Widget build(BuildContext context) {
    final tour = item.tour;
    final style = TourStyle.of(tour?.tourType ?? '');
    final booking = item.booking;
    final date = booking?.experienceDate;
    final countdown = _countdownLabel(date);

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(color: TripsPalette.ink.withValues(alpha: 0.07), blurRadius: 30, offset: const Offset(0, 10)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Pressable(
            onTap: onJourney,
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SizedBox(
                    width: 100,
                    height: 116,
                    child: TourCover(
                      imageUrl: tour?.coverImageUrl,
                      colors: style.colors,
                      height: 116,
                      borderRadius: BorderRadius.circular(18),
                      padding: EdgeInsets.zero,
                      child: tour?.coverImageUrl == null
                          ? Center(child: Icon(style.icon, size: 40, color: Colors.white.withValues(alpha: 0.5)))
                          : const SizedBox.shrink(),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Wrap(
                          spacing: 6,
                          runSpacing: 6,
                          children: [
                            if (date != null)
                              _Pill(background: TripsPalette.ink, foreground: Colors.white, label: _weekdayDate(date), radius: 8),
                            if (countdown != null)
                              _Pill(
                                background: TripsPalette.orangeSoft,
                                foreground: TripsPalette.orangeInk,
                                label: countdown,
                                radius: 8,
                              ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(
                          item.title,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 15.5,
                            height: 1.35,
                            fontWeight: FontWeight.w800,
                            color: TripsPalette.ink,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Wrap(
                          spacing: 12,
                          runSpacing: 4,
                          children: [
                            if (item.guests > 0) _Meta(icon: Icons.group_outlined, text: '${item.guests} khách'),
                            if (item.total > 0) _Meta(icon: Icons.place_outlined, text: '${item.total} điểm đến'),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          const _TicketPerforation(),
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 12, 14, 14),
            child: Column(
              children: [
                if (booking != null && booking.bookingCode.isNotEmpty) ...[
                  _CodeBox(code: booking.bookingCode),
                  const SizedBox(height: 10),
                ],
                Row(
                  children: [
                    Expanded(child: _primaryButton()),
                    if (onDetail != null) ...[
                      const SizedBox(width: 10),
                      Expanded(
                        child: SizedBox(
                          height: 46,
                          child: TextButton(
                            onPressed: onDetail,
                            style: TextButton.styleFrom(
                              backgroundColor: TripsPalette.surfaceSoft,
                              foregroundColor: TripsPalette.ink,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                            ),
                            child: const Text('Chi tiết vé', style: TextStyle(fontWeight: FontWeight.w700)),
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
                // ⚠️ "Đặt lại tour" KHÔNG hiện khi đơn ĐANG trong quá trình hoàn
                // tiền (chưa chốt được kết quả ⇒ chưa nên đặt lại). Chỉ hiện khi
                // đã xử lý xong (đã hoàn / bị từ chối / lỗi).
                if (onRebook != null && item.isRefundResolved) ...[
                  const SizedBox(height: 10),
                  SizedBox(
                    width: double.infinity,
                    height: 46,
                    child: OutlinedButton.icon(
                      onPressed: onRebook,
                      icon: const Icon(Icons.replay_rounded, size: 18),
                      label: const Text('Đặt lại tour', style: TextStyle(fontWeight: FontWeight.w700)),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: TripsPalette.accent,
                        side: const BorderSide(color: TripsPalette.accent),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  /// Nút chính: chưa tới ngày ⇒ xem lịch trình tour (đếm ngược nằm ở chip phía trên); tới ngày ⇒ bắt đầu.
  ///
  /// ⚠️ Màn "Chuyến đi" CHỈ hiển thị tour đã thanh toán và còn trải nghiệm được (không dính
  /// vào hoàn tiền) ⇒ các nhánh "đang/có hoàn tiền" chỉ là lưới an toàn (đơn vừa gửi yêu cầu
  /// hoàn tiền nhưng danh sách chưa kịp tải lại).
  Widget _primaryButton() {
    final locked = item.booking?.isTourLocked ?? false;
    final refunding = item.isRefunding;
    final resolved = item.isRefundResolved;
    final (IconData icon, String label, Color color) = refunding
        ? (Icons.pending_actions_rounded, 'Đang hoàn tiền', TripsPalette.orangeInk)
        : resolved
            ? (Icons.verified_rounded, 'Đã hoàn tiền', TripsPalette.slate)
            : locked
                ? (Icons.map_outlined, 'Xem lịch trình', TripsPalette.accent)
                : (Icons.explore_rounded, 'Bắt đầu', TripsPalette.accent);
    return SizedBox(
      height: 46,
      child: FilledButton.icon(
        onPressed: onJourney,
        icon: Icon(icon, size: 18),
        label: Text(label, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w800)),
        style: FilledButton.styleFrom(
          backgroundColor: color,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        ),
      ),
    );
  }

  /// "Hôm nay" / "Ngày mai" / "Còn N ngày" (theo giờ Việt Nam — khớp cách backend tính).
  /// Đơn đang/có hoàn tiền ⇒ không đếm ngược.
  String? _countdownLabel(DateTime? d) {
    if (d == null || item.isRefunding || item.isRefundResolved) return null;
    final now = DateTime.now().toUtc().add(const Duration(hours: 7));
    final days = DateUtils.dateOnly(d).difference(DateUtils.dateOnly(now)).inDays;
    if (days < 0) return null;
    if (days == 0) return 'Hôm nay';
    if (days == 1) return 'Ngày mai';
    return 'Còn $days ngày';
  }
}

/// Mã vé hiện đầy đủ (chữ đơn cách, tự xuống dòng nếu màn hẹp); chạm để sao chép.
class _CodeBox extends StatelessWidget {
  final String code;
  const _CodeBox({required this.code});

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: 'Mã vé $code, chạm để sao chép',
      excludeSemantics: true,
      child: Material(
        color: const Color(0xFFF8FAFC),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
          side: const BorderSide(color: Color(0xFFCBD5E1)),
        ),
        child: InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: () {
            Clipboard.setData(ClipboardData(text: code));
            ScaffoldMessenger.of(context)
              ..hideCurrentSnackBar()
              ..showSnackBar(SnackBar(content: Text('Đã sao chép mã vé $code'), behavior: SnackBarBehavior.floating));
          },
          child: Padding(
            padding: const EdgeInsets.fromLTRB(12, 8, 10, 8),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Mã vé',
                          style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: TripsPalette.muted)),
                      const SizedBox(height: 1),
                      Text(
                        code,
                        style: const TextStyle(
                          fontFamily: 'monospace',
                          fontSize: 14.5,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.8,
                          color: TripsPalette.ink,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                const Icon(Icons.copy_rounded, size: 18, color: TripsPalette.slate),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// ── Thẻ "Đã hoàn thành": gọn một dòng ────────────────────────────────────────

class _DoneCard extends StatelessWidget {
  final _MyTour item;
  final VoidCallback? onJourney;
  final VoidCallback? onRebook;

  const _DoneCard({required this.item, required this.onJourney, required this.onRebook});

  @override
  Widget build(BuildContext context) {
    final tour = item.tour;
    final style = TourStyle.of(tour?.tourType ?? '');
    final finished = item.journey?.completedAt ?? item.booking?.experienceDate;

    return Pressable(
      onTap: onJourney,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(22),
          boxShadow: [
            BoxShadow(color: TripsPalette.ink.withValues(alpha: 0.05), blurRadius: 20, offset: const Offset(0, 6)),
          ],
        ),
        child: Row(
          children: [
            SizedBox(
              width: 70,
              height: 70,
              child: Stack(
                clipBehavior: Clip.none,
                children: [
                  Positioned.fill(
                    child: TourCover(
                      imageUrl: tour?.coverImageUrl,
                      colors: style.colors,
                      height: 70,
                      borderRadius: BorderRadius.circular(16),
                      padding: EdgeInsets.zero,
                      child: tour?.coverImageUrl == null
                          ? Center(child: Icon(style.icon, size: 28, color: Colors.white.withValues(alpha: 0.55)))
                          : const SizedBox.shrink(),
                    ),
                  ),
                  Positioned(
                    right: 4,
                    bottom: 4,
                    child: Container(
                      width: 22,
                      height: 22,
                      decoration: BoxDecoration(
                        color: TripsPalette.success,
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white, width: 2),
                      ),
                      child: const Icon(Icons.check_rounded, size: 13, color: Colors.white),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 14.5,
                      height: 1.3,
                      fontWeight: FontWeight.w800,
                      color: TripsPalette.ink,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Wrap(
                    spacing: 6,
                    runSpacing: 4,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      if (finished != null)
                        Text(_date(finished), style: const TextStyle(fontSize: 12, color: TripsPalette.muted)),
                      if (item.points > 0)
                        _Pill(
                          background: TripsPalette.goldSoft,
                          foreground: TripsPalette.goldInk,
                          label: '+${item.points} điểm',
                          height: 22,
                          radius: 6,
                        ),
                      if (item.total > 0)
                        _Pill(
                          background: TripsPalette.successSoft,
                          foreground: TripsPalette.successInk,
                          label: '${item.done}/${item.total} trạm',
                          height: 22,
                          radius: 6,
                        ),
                    ],
                  ),
                ],
              ),
            ),
            if (onRebook != null) ...[
              const SizedBox(width: 8),
              Tooltip(
                message: 'Đặt lại tour',
                child: Material(
                  color: TripsPalette.surfaceSoft,
                  borderRadius: BorderRadius.circular(14),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(14),
                    onTap: onRebook,
                    child: const SizedBox(
                      width: 44,
                      height: 44,
                      child: Icon(Icons.replay_rounded, size: 20, color: TripsPalette.ink),
                    ),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

// ── Thành phần dùng chung ────────────────────────────────────────────────────

/// Đường xé vé: hai khuyết tròn (màu nền trang) ở mép và hàng gạch đứt ở giữa.
class _TicketPerforation extends StatelessWidget {
  const _TicketPerforation();

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 22,
      child: Stack(
        alignment: Alignment.center,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: LayoutBuilder(
              builder: (_, box) {
                final count = (box.maxWidth / 10).floor();
                return Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    for (var i = 0; i < count; i++)
                      Container(width: 5, height: 2, color: TripsPalette.line),
                  ],
                );
              },
            ),
          ),
          for (final side in [Alignment.centerLeft, Alignment.centerRight])
            Align(
              alignment: side,
              child: FractionalTranslation(
                translation: Offset(side == Alignment.centerLeft ? -0.5 : 0.5, 0),
                child: Container(
                  width: 22,
                  height: 22,
                  decoration: const BoxDecoration(color: TripsPalette.background, shape: BoxShape.circle),
                ),
              ),
            ),
        ],
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

class _Meta extends StatelessWidget {
  final IconData icon;
  final String text;

  const _Meta({required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 15, color: TripsPalette.muted),
        const SizedBox(width: 5),
        Flexible(
          child: Text(
            text,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontSize: 12.5, color: TripsPalette.muted),
          ),
        ),
      ],
    );
  }
}

String _date(DateTime d) =>
    '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}/${d.year}';

/// "T4 · 25/11", "CN · 30/11".
String _weekdayDate(DateTime d) {
  const days = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  return '${days[d.weekday - 1]} · ${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}';
}
