import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/models/booking_model.dart';
import '../../core/models/tour_journey_model.dart';
import '../../core/models/tour_model.dart';
import '../../core/services/api_client.dart';
import '../../core/services/progress_service.dart';
import '../../core/services/tour_service.dart';
import '../common/heritage_motion.dart';
import '../journey/journey_screen.dart';
import '../rewards/rewards_widgets.dart' show RewardsMessageView, RewardsSkeletonList;
import 'tour_detail_screen.dart';
import 'tour_detail_opener.dart';
import 'tour_style.dart';

enum _Stage { active, ready, done }

/// Một tour du khách đã mua (vé) hoặc đã đi, kèm hành trình nếu đã bắt đầu.
class _MyTour {
  final BookingModel? booking;
  final TourJourney? journey;
  final TourModel? tour;
  final _Stage stage;

  const _MyTour({required this.booking, required this.journey, required this.tour, required this.stage});

  int get tourId => booking?.tourId ?? journey!.tourId;
  String get title => tour?.title ?? booking?.tourTitle ?? journey?.tourName ?? 'Tour';

  int get total => journey?.totalDestinations ?? tour?.destinationCount ?? 0;
  int get done {
    final j = journey;
    if (j == null) return 0;
    return j.destinations.isNotEmpty ? j.doneCount : (j.currentOrder - 1).clamp(0, j.totalDestinations);
  }
}

/// "Tour của tôi": các tour đã mua, chia theo đang trải nghiệm / sẵn sàng khởi hành / đã hoàn thành.
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

  List<_MyTour> _items = const [];
  bool _loading = true;
  String? _error;

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
      ]);
      if (!mounted) return;
      setState(() {
        _items = _combine(
          results[0] as List<BookingModel>,
          results[1] as List<TourJourney>,
          results[2] as List<TourModel>,
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
  static List<_MyTour> _combine(List<BookingModel> tickets, List<TourJourney> journeys, List<TourModel> tours) {
    final tourById = {for (final t in tours) t.id: t};
    final items = <_MyTour>[];
    final usedJourneys = <int>{};

    for (final b in tickets) {
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
      items.add(_MyTour(booking: b, journey: journey, tour: tourById[b.tourId], stage: stage));
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

  @override
  Widget build(BuildContext context) {
    if (_loading) return const RewardsSkeletonList(count: 3, itemHeight: 220);
    if (_error != null && _items.isEmpty) {
      return RewardsMessageView(
        icon: Icons.cloud_off_rounded,
        title: 'Không tải được tour của bạn',
        message: _error,
        onRetry: _load,
      );
    }

    final active = _of(_Stage.active);
    final ready = _of(_Stage.ready);
    final done = _of(_Stage.done);
    var order = 1;

    return RefreshIndicator(
      color: AppCultureColors.heritageJade,
      onRefresh: _load,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        // Chừa chỗ cho thanh điều hướng và nút CHECK-IN nổi
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 40),
        children: [
          Reveal(order: 0, child: _buildHeader(active.length, ready.length, done.length)),
          if (_items.isEmpty)
            Reveal(order: 1, child: _buildEmpty())
          else ...[
            for (final (stage, list) in [(_Stage.active, active), (_Stage.ready, ready), (_Stage.done, done)])
              if (list.isNotEmpty) ...[
                Reveal(order: order++, child: _sectionTitle(stage, list.length)),
                for (final item in list)
                  Reveal(
                    order: order < 6 ? order++ : order,
                    child: _TicketCard(
                      item: item,
                      // Vé đã xong nhưng không còn hành trình thì không mở lại (tránh tạo hành trình mới)
                      onJourney: item.stage == _Stage.done && item.journey == null ? null : () => _openJourney(item),
                      onRebook: item.tour == null ? null : () => _openTour(item.tour!),
                    ),
                  ),
              ],
          ],
        ],
      ),
    );
  }

  /// Băng đầu trang: "Hành trang di sản" chữ ánh vàng, hoa văn trống đồng, ba con số tóm tắt.
  Widget _buildHeader(int active, int ready, int done) {
    Widget stat(int value, String label) => Expanded(
          child: Column(
            children: [
              CountUpText(
                value: value,
                style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: Colors.white),
              ),
              const SizedBox(height: 2),
              Text(label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(fontSize: 11.5, color: Colors.white.withValues(alpha: 0.85))),
            ],
          ),
        );

    return Container(
      margin: const EdgeInsets.only(top: 6, bottom: 8),
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        gradient: const LinearGradient(
          colors: [Color(0xFF7C2D12), Color(0xFFB45309)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        boxShadow: [
          BoxShadow(color: const Color(0xFFB45309).withValues(alpha: 0.3), blurRadius: 18, offset: const Offset(0, 8)),
        ],
      ),
      child: Stack(
        children: [
          Positioned(
            right: -60,
            top: -60,
            child: SlowSpin(child: DrumMotif(size: 200, color: const Color(0xFFFDE68A).withValues(alpha: 0.18))),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(18, 16, 18, 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ShimmerText(
                  'Hành trang di sản',
                  style: const TextStyle(fontSize: 21, fontWeight: FontWeight.w700, color: Colors.white),
                ),
                const SizedBox(height: 3),
                Text(
                  'Những tour bạn đã mua, sẵn sàng để trải nghiệm',
                  style: TextStyle(fontSize: 12.5, color: Colors.white.withValues(alpha: 0.85)),
                ),
                const SizedBox(height: 14),
                Container(
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.14),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Row(
                    children: [
                      stat(active, 'Đang đi'),
                      stat(ready, 'Chờ khởi hành'),
                      stat(done, 'Đã hoàn thành'),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _sectionTitle(_Stage stage, int count) {
    final (icon, label, color) = switch (stage) {
      _Stage.active => (Icons.explore_rounded, 'Đang trải nghiệm', AppCultureColors.oceanBlue),
      _Stage.ready => (Icons.confirmation_number_rounded, 'Sẵn sàng khởi hành', AppCultureColors.heritageJade),
      _Stage.done => (Icons.workspace_premium_rounded, 'Đã hoàn thành', AppCultureColors.amberDark),
    };
    return Padding(
      padding: const EdgeInsets.fromLTRB(2, 18, 2, 10),
      child: Row(
        children: [
          Icon(icon, size: 19, color: color),
          const SizedBox(width: 8),
          Text(label,
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppCultureColors.textDark)),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(10)),
            child: Text('$count', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: color)),
          ),
        ],
      ),
    );
  }

  Widget _buildEmpty() {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 36, horizontal: 12),
      child: Column(
        children: [
          SlowSpin(child: DrumMotif(size: 96, color: AppCultureColors.amberDark.withValues(alpha: 0.35))),
          const SizedBox(height: 18),
          const Text('Bạn chưa có tour nào',
              style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: AppCultureColors.textDark)),
          const SizedBox(height: 6),
          const Text(
            'Mua một tour ở trang Khám phá, vé sẽ nằm tại đây để bạn bắt đầu hành trình khi đến nơi.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 13, height: 1.45, color: AppCultureColors.textMuted),
          ),
          const SizedBox(height: 18),
          FilledButton.icon(
            onPressed: widget.onExplore,
            icon: const Icon(Icons.travel_explore_rounded, size: 19),
            label: const Text('Khám phá tour', style: TextStyle(fontWeight: FontWeight.w600)),
            style: FilledButton.styleFrom(
              backgroundColor: AppCultureColors.heritageJade,
              minimumSize: const Size(0, 48),
              padding: const EdgeInsets.symmetric(horizontal: 22),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            ),
          ),
        ],
      ),
    );
  }
}

/// Thẻ kiểu vé tham quan: ảnh bìa, đường răng cưa xé vé có hai khuyết tròn, thông tin và nút hành động.
class _TicketCard extends StatelessWidget {
  final _MyTour item;
  final VoidCallback? onJourney;
  final VoidCallback? onRebook;

  const _TicketCard({required this.item, required this.onJourney, required this.onRebook});

  @override
  Widget build(BuildContext context) {
    final tour = item.tour;
    final style = TourStyle.of(tour?.tourType ?? '');
    final booking = item.booking;

    final (stageLabel, stageIcon) = switch (item.stage) {
      _Stage.active => ('Đang trải nghiệm', Icons.explore_rounded),
      _Stage.ready => ('Vé sẵn sàng', Icons.confirmation_number_rounded),
      _Stage.done => ('Đã hoàn thành', Icons.check_circle_rounded),
    };

    return Pressable(
      onTap: onJourney,
      child: Container(
        margin: const EdgeInsets.only(bottom: 16),
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(22),
          border: Border.all(color: AppCultureColors.border),
          boxShadow: [
            BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 14, offset: const Offset(0, 6)),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            TourCover(
              height: 128,
              imageUrl: tour?.coverImageUrl,
              colors: style.colors,
              child: Stack(
                children: [
                  if (tour?.coverImageUrl == null)
                    Positioned(
                      right: -6,
                      bottom: -14,
                      child: Icon(style.icon, size: 84, color: Colors.white.withValues(alpha: 0.16)),
                    ),
                  Align(
                    alignment: Alignment.topLeft,
                    child: TourChip(icon: stageIcon, label: stageLabel, dark: true),
                  ),
                  Align(
                    alignment: Alignment.bottomLeft,
                    child: Text(
                      item.title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        height: 1.2,
                        fontWeight: FontWeight.w700,
                        shadows: [Shadow(color: Colors.black45, blurRadius: 8)],
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const _TicketPerforation(),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Wrap(
                    spacing: 14,
                    runSpacing: 6,
                    children: [
                      if (booking?.experienceDate != null)
                        _Meta(icon: Icons.event_rounded, text: _dateLine(booking!.experienceDate!)),
                      if (booking != null && booking.bookingCode.isNotEmpty)
                        _Meta(icon: Icons.qr_code_2_rounded, text: booking.bookingCode),
                      if (item.stage == _Stage.done && item.journey?.completedAt != null)
                        _Meta(icon: Icons.flag_rounded, text: 'Xong ngày ${_date(item.journey!.completedAt!)}'),
                      if (item.total > 0 && item.stage != _Stage.active)
                        _Meta(icon: Icons.place_rounded, text: '${item.total} điểm đến'),
                    ],
                  ),
                  if (item.stage == _Stage.active) ...[
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(4),
                            child: TweenAnimationBuilder<double>(
                              tween: Tween(begin: 0, end: item.total == 0 ? 0 : item.done / item.total),
                              duration: const Duration(milliseconds: 800),
                              curve: Curves.easeOutCubic,
                              builder: (_, v, _) => LinearProgressIndicator(
                                value: v,
                                minHeight: 6,
                                backgroundColor: AppCultureColors.oceanLight,
                                valueColor: const AlwaysStoppedAnimation(AppCultureColors.oceanBlue),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Text('${item.done}/${item.total} điểm',
                            style: const TextStyle(
                                fontSize: 12.5, fontWeight: FontWeight.w600, color: AppCultureColors.oceanDark)),
                      ],
                    ),
                  ],
                  const SizedBox(height: 14),
                  _buildActions(),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActions() {
    final shape = RoundedRectangleBorder(borderRadius: BorderRadius.circular(14));
    switch (item.stage) {
      case _Stage.active:
        return SizedBox(
          width: double.infinity,
          height: 48,
          child: FilledButton.icon(
            onPressed: onJourney,
            icon: const Icon(Icons.navigation_rounded, size: 19),
            label: const Text('Tiếp tục hành trình', style: TextStyle(fontWeight: FontWeight.w600)),
            style: FilledButton.styleFrom(backgroundColor: AppCultureColors.oceanBlue, shape: shape),
          ),
        );
      case _Stage.ready:
        // Tour chưa tới ngày trải nghiệm ⇒ đếm ngược thay cho "Bắt đầu trải nghiệm".
        final booking = item.booking;
        final locked = booking?.isTourLocked ?? false;
        return SizedBox(
          width: double.infinity,
          height: 48,
          child: FilledButton.icon(
            onPressed: onJourney,
            icon: Icon(locked ? Icons.schedule_rounded : Icons.explore_rounded, size: 19),
            label: Text(
              locked ? '${booking!.daysUntilStart} ngày nữa lên đường!' : 'Bắt đầu trải nghiệm',
              style: const TextStyle(fontWeight: FontWeight.w600),
            ),
            style: FilledButton.styleFrom(backgroundColor: AppCultureColors.heritageJade, shape: shape),
          ),
        );
      case _Stage.done:
        return Row(
          children: [
            if (onJourney != null)
            Expanded(
              child: OutlinedButton.icon(
                onPressed: onJourney,
                icon: const Icon(Icons.auto_stories_rounded, size: 18),
                label: const Text('Xem lại', style: TextStyle(fontWeight: FontWeight.w600)),
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size.fromHeight(46),
                  foregroundColor: AppCultureColors.amberDark,
                  side: const BorderSide(color: AppCultureColors.rewardBorder),
                  shape: shape,
                ),
              ),
            ),
            if (onRebook != null) ...[
              if (onJourney != null) const SizedBox(width: 10),
              Expanded(
                child: FilledButton.icon(
                  onPressed: onRebook,
                  icon: const Icon(Icons.replay_rounded, size: 18),
                  label: const Text('Đặt lại', style: TextStyle(fontWeight: FontWeight.w600)),
                  style: FilledButton.styleFrom(
                    minimumSize: const Size.fromHeight(46),
                    backgroundColor: AppCultureColors.heritageJade,
                    shape: shape,
                  ),
                ),
              ),
            ],
          ],
        );
    }
  }

  static String _date(DateTime d) =>
      '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}/${d.year}';

  /// "05/11/2026 · còn 5 ngày" / "Hôm nay" cho vé chưa đi.
  String _dateLine(DateTime d) {
    if (item.stage != _Stage.ready) return _date(d);
    // Đếm ngày theo giờ Việt Nam — khớp với cách backend tính "còn N ngày".
    final now = DateTime.now().toUtc().add(const Duration(hours: 7));
    final today = DateUtils.dateOnly(now);
    final days = DateUtils.dateOnly(d).difference(today).inDays;
    if (days == 0) return '${_date(d)} · hôm nay';
    if (days > 0) return '${_date(d)} · còn $days ngày';
    return _date(d);
  }
}

/// Đường xé vé: hai khuyết tròn ở mép và hàng gạch đứt ở giữa.
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
            padding: const EdgeInsets.symmetric(horizontal: 18),
            child: LayoutBuilder(
              builder: (_, box) {
                final count = (box.maxWidth / 10).floor();
                return Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    for (var i = 0; i < count; i++)
                      Container(width: 5, height: 1.5, color: AppCultureColors.border),
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
                  decoration: const BoxDecoration(color: AppCultureColors.background, shape: BoxShape.circle),
                ),
              ),
            ),
        ],
      ),
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
        Icon(icon, size: 15, color: AppCultureColors.textLight),
        const SizedBox(width: 5),
        Flexible(
          child: Text(
            text,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontSize: 12.5, color: AppCultureColors.textMuted),
          ),
        ),
      ],
    );
  }
}
