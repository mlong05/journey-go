import 'dart:math' as math;

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

  double get progress => total == 0 ? 0 : (done / total).clamp(0, 1);
  int get points => journey?.pointsEarned ?? 0;
  int get badges => journey?.destinations.where((d) => d.badgeAwarded).length ?? 0;
  JourneyDestination? get next => journey?.currentDestination;
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

  /// Bộ lọc theo trạng thái; null = tất cả.
  _Stage? _filter;

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
    var order = 2;
    final groups = [(_Stage.active, active), (_Stage.ready, ready), (_Stage.done, done)]
        .where((g) => _filter == null || g.$1 == _filter)
        .toList();
    final shown = groups.fold<int>(0, (s, g) => s + g.$2.length);

    return Stack(
      children: [
        const Positioned.fill(child: _HeritageBackdrop()),
        RefreshIndicator(
          color: AppCultureColors.heritageJade,
          onRefresh: _load,
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            // Chừa chỗ cho thanh điều hướng và nút CHECK-IN nổi
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 110),
            children: [
              Reveal(order: 0, child: _buildHeader(active, ready.length, done)),
              if (_items.isEmpty)
                Reveal(order: 1, child: _buildEmpty())
              else ...[
                Reveal(order: 1, child: _buildFilters(active.length, ready.length, done.length)),
                if (shown == 0)
                  _buildFilterEmpty()
                else
                  for (final (stage, list) in groups)
                    if (list.isNotEmpty) ...[
                      Reveal(order: order++, child: _sectionTitle(stage, list.length)),
                      for (final item in list)
                        Reveal(
                          order: order < 7 ? order++ : order,
                          child: _TicketCard(
                            item: item,
                            // Vé đã xong nhưng không còn hành trình thì không mở lại (tránh tạo hành trình mới)
                            onJourney:
                                item.stage == _Stage.done && item.journey == null ? null : () => _openJourney(item),
                            onRebook: item.tour == null ? null : () => _openTour(item.tour!),
                          ),
                        ),
                    ],
              ],
            ],
          ),
        ),
      ],
    );
  }

  /// Hàng chip lọc: Tất cả / Đang đi / Chờ khởi hành / Hoàn thành, kèm số lượng.
  Widget _buildFilters(int active, int ready, int done) {
    Widget chip(_Stage? stage, String label, int count, IconData icon, Color color) {
      final selected = _filter == stage;
      return Padding(
        padding: const EdgeInsets.only(right: 8),
        child: Pressable(
          onTap: () => setState(() => _filter = stage),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 220),
            curve: Curves.easeOutCubic,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: selected ? color : Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: selected ? color : AppCultureColors.border),
              boxShadow: selected
                  ? [BoxShadow(color: color.withValues(alpha: 0.3), blurRadius: 10, offset: const Offset(0, 4))]
                  : null,
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(icon, size: 16, color: selected ? Colors.white : color),
                const SizedBox(width: 6),
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: selected ? Colors.white : AppCultureColors.textDark,
                  ),
                ),
                const SizedBox(width: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                  decoration: BoxDecoration(
                    color: selected ? Colors.white.withValues(alpha: 0.25) : color.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    '$count',
                    style: TextStyle(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w700,
                      color: selected ? Colors.white : color,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return SizedBox(
      height: 54,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(vertical: 8),
        clipBehavior: Clip.none,
        children: [
          chip(null, 'Tất cả', active + ready + done, Icons.apps_rounded, AppCultureColors.jadeDark),
          chip(_Stage.active, 'Đang đi', active, Icons.explore_rounded, AppCultureColors.oceanBlue),
          chip(_Stage.ready, 'Chờ khởi hành', ready, Icons.confirmation_number_rounded, AppCultureColors.heritageJade),
          chip(_Stage.done, 'Hoàn thành', done, Icons.workspace_premium_rounded, AppCultureColors.amberDark),
        ],
      ),
    );
  }

  Widget _buildFilterEmpty() {
    final text = switch (_filter) {
      _Stage.active => 'Chưa có hành trình nào đang đi.',
      _Stage.ready => 'Không có vé nào đang chờ khởi hành.',
      _Stage.done => 'Bạn chưa hoàn thành hành trình nào. Đi trọn một tour để nhận thưởng nhé!',
      null => '',
    };
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 40, horizontal: 24),
      child: Column(
        children: [
          SlowSpin(child: DrumMotif(size: 72, color: AppCultureColors.amberDark.withValues(alpha: 0.3))),
          const SizedBox(height: 14),
          Text(text,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 13.5, height: 1.45, color: AppCultureColors.textMuted)),
        ],
      ),
    );
  }

  /// Băng đầu trang: "Hành trang di sản" chữ ánh vàng, hoa văn trống đồng, ba con số tóm tắt
  /// và thanh "chinh phục" gộp tiến độ mọi hành trình.
  Widget _buildHeader(List<_MyTour> activeList, int ready, List<_MyTour> doneList) {
    final active = activeList.length;
    final done = doneList.length;
    final journeys = [...activeList, ...doneList];
    final totalStops = journeys.fold<int>(0, (s, i) => s + i.total);
    final doneStops = journeys.fold<int>(0, (s, i) => s + i.done);
    final points = journeys.fold<int>(0, (s, i) => s + i.points);

    Widget stat(int value, String label, _Stage stage) => Expanded(
          child: GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: () => setState(() => _filter = _filter == stage ? null : stage),
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
                const SizedBox(height: 4),
                AnimatedContainer(
                  duration: const Duration(milliseconds: 220),
                  width: _filter == stage ? 22 : 0,
                  height: 3,
                  decoration: BoxDecoration(color: const Color(0xFFFDE68A), borderRadius: BorderRadius.circular(2)),
                ),
              ],
            ),
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
                      stat(active, 'Đang đi', _Stage.active),
                      stat(ready, 'Chờ khởi hành', _Stage.ready),
                      stat(done, 'Đã hoàn thành', _Stage.done),
                    ],
                  ),
                ),
                if (totalStops > 0) ...[
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      const Icon(Icons.flag_circle_rounded, size: 18, color: Color(0xFFFDE68A)),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          'Đã chinh phục $doneStops/$totalStops điểm đến',
                          style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: Colors.white),
                        ),
                      ),
                      if (points > 0)
                        Text('$points điểm',
                            style: const TextStyle(
                                fontSize: 12.5, fontWeight: FontWeight.w700, color: Color(0xFFFDE68A))),
                    ],
                  ),
                  const SizedBox(height: 8),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(6),
                    child: TweenAnimationBuilder<double>(
                      tween: Tween(begin: 0, end: doneStops / totalStops),
                      duration: const Duration(milliseconds: 1100),
                      curve: Curves.easeOutCubic,
                      builder: (_, v, _) => LinearProgressIndicator(
                        value: v,
                        minHeight: 8,
                        backgroundColor: Colors.white.withValues(alpha: 0.2),
                        valueColor: const AlwaysStoppedAnimation(Color(0xFFFDE68A)),
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
                  if (item.stage == _Stage.active && item.total > 0)
                    Align(alignment: Alignment.topRight, child: _CoverProgress(value: item.progress)),
                  if (item.stage == _Stage.done)
                    const Align(alignment: Alignment.topRight, child: _DoneStamp()),
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
                      if (item.stage == _Stage.done && item.points > 0)
                        _Meta(icon: Icons.stars_rounded, text: '+${item.points} điểm'),
                      if (item.stage == _Stage.done && item.badges > 0)
                        _Meta(icon: Icons.workspace_premium_rounded, text: '${item.badges} huy hiệu'),
                    ],
                  ),
                  if (item.stage == _Stage.active) ...[
                    if (item.next != null) ...[
                      const SizedBox(height: 10),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                        decoration: BoxDecoration(
                          color: AppCultureColors.oceanLight,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.near_me_rounded, size: 16, color: AppCultureColors.oceanBlue),
                            const SizedBox(width: 6),
                            Expanded(
                              child: Text(
                                'Tiếp theo · Điểm ${item.next!.orderIndex}: ${item.next!.name}',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                    fontSize: 12.5, fontWeight: FontWeight.w600, color: AppCultureColors.oceanDark),
                              ),
                            ),
                            if (item.points > 0)
                              Text('${item.points} điểm',
                                  style: const TextStyle(
                                      fontSize: 12, fontWeight: FontWeight.w700, color: AppCultureColors.rewardText)),
                          ],
                        ),
                      ),
                    ],
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
                        Text('${item.done}/${item.total} điểm đến · ${(item.progress * 100).round()}%',
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
        return SizedBox(
          width: double.infinity,
          height: 48,
          child: FilledButton.icon(
            onPressed: onJourney,
            icon: const Icon(Icons.explore_rounded, size: 19),
            label: const Text('Bắt đầu trải nghiệm', style: TextStyle(fontWeight: FontWeight.w600)),
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
    final today = DateUtils.dateOnly(DateTime.now());
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

/// Nền trang trí phía sau danh sách: quầng màu ấm, hoa văn trống đồng xoay chậm và đốm sáng vàng trôi lên,
/// tạo cảm giác "hành trang di sản" thay vì một danh sách trắng. Đứng yên khi máy bật giảm chuyển động.
class _HeritageBackdrop extends StatefulWidget {
  const _HeritageBackdrop();

  @override
  State<_HeritageBackdrop> createState() => _HeritageBackdropState();
}

class _HeritageBackdropState extends State<_HeritageBackdrop> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: const Duration(seconds: 14));

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (reduceMotion(context)) {
      _c.stop();
    } else if (!_c.isAnimating) {
      _c.repeat();
    }
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: Stack(
        children: [
          // Quầng màu ấm ở góc trên và xanh ngọc ở góc dưới
          Positioned(
            top: 180,
            right: -120,
            child: _glow(const Color(0xFFFDE68A), 300),
          ),
          Positioned(
            bottom: 40,
            left: -140,
            child: _glow(AppCultureColors.heritageJade, 320),
          ),
          Positioned(
            top: 420,
            left: -70,
            child: SlowSpin(
              period: const Duration(seconds: 90),
              child: DrumMotif(size: 220, color: AppCultureColors.amberDark.withValues(alpha: 0.06)),
            ),
          ),
          Positioned(
            bottom: -90,
            right: -80,
            child: SlowSpin(
              period: const Duration(seconds: 120),
              child: DrumMotif(size: 280, color: AppCultureColors.heritageJade.withValues(alpha: 0.06)),
            ),
          ),
          Positioned.fill(
            child: AnimatedBuilder(
              animation: _c,
              builder: (_, _) => CustomPaint(painter: _MotesPainter(_c.value)),
            ),
          ),
        ],
      ),
    );
  }

  static Widget _glow(Color color, double size) => Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: RadialGradient(colors: [color.withValues(alpha: 0.18), color.withValues(alpha: 0)]),
        ),
      );
}

/// Các đốm sáng nhỏ trôi chậm từ dưới lên, mờ dần, như bụi vàng trên đèn lồng.
class _MotesPainter extends CustomPainter {
  final double t;

  _MotesPainter(this.t);

  // (vị trí ngang 0..1, độ lệch pha, bán kính)
  static const _motes = [
    (0.08, 0.00, 2.2), (0.22, 0.35, 1.6), (0.37, 0.70, 2.6), (0.52, 0.15, 1.8),
    (0.66, 0.55, 2.4), (0.81, 0.85, 1.7), (0.93, 0.25, 2.1), (0.45, 0.92, 1.5),
  ];

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint();
    for (final (x, phase, r) in _motes) {
      final p = (t + phase) % 1.0;
      final dx = x * size.width + 12 * math.sin(p * 2 * math.pi + phase * 6);
      final dy = size.height * (1 - p);
      final fade = p < 0.15 ? p / 0.15 : (p > 0.8 ? (1 - p) / 0.2 : 1.0);
      paint.color = const Color(0xFFF59E0B).withValues(alpha: 0.35 * fade);
      canvas.drawCircle(Offset(dx, dy), r, paint);
    }
  }

  @override
  bool shouldRepaint(covariant _MotesPainter old) => old.t != t;
}

/// Vòng tiến độ nhỏ đặt trên ảnh bìa của hành trình đang đi.
class _CoverProgress extends StatelessWidget {
  final double value;

  const _CoverProgress({required this.value});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 50,
      height: 50,
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.35),
        shape: BoxShape.circle,
      ),
      child: TweenAnimationBuilder<double>(
        tween: Tween(begin: 0, end: value),
        duration: const Duration(milliseconds: 900),
        curve: Curves.easeOutCubic,
        builder: (_, v, _) => Stack(
          alignment: Alignment.center,
          children: [
            SizedBox.expand(
              child: CircularProgressIndicator(
                value: v,
                strokeWidth: 4,
                strokeCap: StrokeCap.round,
                backgroundColor: Colors.white.withValues(alpha: 0.25),
                valueColor: const AlwaysStoppedAnimation(Colors.white),
              ),
            ),
            Text(
              '${(v * 100).round()}%',
              style: const TextStyle(color: Colors.white, fontSize: 11.5, fontWeight: FontWeight.w700),
            ),
          ],
        ),
      ),
    );
  }
}

/// Con dấu "HOÀN THÀNH" màu son nghiêng trên ảnh bìa; đóng xuống (phóng to rồi thu lại) khi thẻ hiện.
class _DoneStamp extends StatelessWidget {
  const _DoneStamp();

  @override
  Widget build(BuildContext context) {
    final stamp = Transform.rotate(
      angle: -0.2,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: const Color(0xFFFDE68A), width: 2),
        ),
        child: const Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.workspace_premium_rounded, size: 15, color: Color(0xFFFDE68A)),
            SizedBox(width: 4),
            Text(
              'HOÀN THÀNH',
              style: TextStyle(
                color: Color(0xFFFDE68A),
                fontSize: 11.5,
                letterSpacing: 1.2,
                fontWeight: FontWeight.w800,
              ),
            ),
          ],
        ),
      ),
    );
    if (reduceMotion(context)) return stamp;
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 1.8, end: 1),
      duration: const Duration(milliseconds: 650),
      curve: Curves.elasticOut,
      builder: (_, s, child) => Transform.scale(scale: s, child: child),
      child: stamp,
    );
  }
}
