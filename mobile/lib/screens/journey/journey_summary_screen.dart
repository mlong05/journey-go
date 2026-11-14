import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/models/tour_journey_model.dart';
import '../common/ink.dart';
import '../common/photo.dart';
import 'journey_map.dart';
import 'journey_widgets.dart';
import 'map_kit.dart' show MapAttributionText;
import 'navigation.dart' show formatDuration;

/// Tổng kết sau khi đi hết hành trình: mức hoàn thành, điểm, nhiệm vụ đạt, thời gian và lộ trình đã đi.
class JourneySummaryScreen extends StatelessWidget {
  final TourJourney journey;

  /// Điểm đến có tọa độ (để vẽ lộ trình); rỗng thì bỏ phần bản đồ.
  final List<JourneyStop> stops;

  /// Ảnh của từng điểm đến theo destinationId (tour 5 bước).
  final Map<int, String> images;

  /// Ảnh bìa làm nền phần đầu (ảnh chụp thật); null thì nền tối trơn.
  final String? coverImage;

  const JourneySummaryScreen({
    super.key,
    required this.journey,
    this.stops = const [],
    this.images = const {},
    this.coverImage,
  });

  static Future<void> open(
    BuildContext context, {
    required TourJourney journey,
    List<JourneyStop> stops = const [],
    Map<int, String> images = const {},
    String? coverImage,
  }) {
    return Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => JourneySummaryScreen(journey: journey, stops: stops, images: images, coverImage: coverImage),
      ),
    );
  }

  ({String title, String subtitle, IconData icon, Color accent}) get _rank => switch (journey.completionRank) {
    CompletionRank.perfect => (
      title: 'Hoàn thành trọn vẹn',
      subtitle: 'Bạn đã chinh phục mọi điểm đến và trả lời đúng mọi thử thách.',
      icon: Icons.emoji_events_rounded,
      accent: AppCultureColors.gold,
    ),
    CompletionRank.partial => (
      title: 'Đã đi hết hành trình',
      subtitle: 'Bạn đã bỏ qua ${journey.skippedCount} điểm đến. Lần sau hãy thử đi đủ để nhận thưởng hoàn thành.',
      icon: Icons.flag_rounded,
      accent: Colors.white,
    ),
    _ => (
      title: 'Hoàn thành hành trình',
      subtitle: 'Bạn đã đi đủ mọi điểm đến. Vài thử thách còn chưa trọn điểm, thử lại ở chuyến sau nhé!',
      icon: Icons.workspace_premium_rounded,
      accent: AppCultureColors.rewardBorder,
    ),
  };

  @override
  Widget build(BuildContext context) {
    final rank = _rank;
    final tasks = journey.allTasks;
    final duration = journey.duration;

    return Scaffold(
      backgroundColor: AppCultureColors.background,
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            pinned: true,
            expandedHeight: 330,
            backgroundColor: AppInk.ink,
            foregroundColor: Colors.white,
            title: const Text('Tổng kết hành trình', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 17)),
            flexibleSpace: FlexibleSpaceBar(
              collapseMode: CollapseMode.pin,
              background: _Hero(journey: journey, rank: rank, coverImage: coverImage),
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
            sliver: SliverToBoxAdapter(
              child: GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                mainAxisSpacing: 10,
                crossAxisSpacing: 10,
                childAspectRatio: 1.75,
                children: [
                  _StatTile(
                    icon: Icons.stars_rounded,
                    value: '${journey.totalPoints}',
                    label: 'điểm nhận được',
                    tone: AppCultureColors.amberDark,
                    background: AppCultureColors.rewardBg,
                  ),
                  _StatTile(
                    icon: Icons.place_rounded,
                    value: '${journey.doneCount - journey.skippedCount}/${journey.totalDestinations}',
                    label: 'điểm đến đã ghé',
                    tone: AppCultureColors.jadeDark,
                    background: AppCultureColors.jadeLight,
                  ),
                  _StatTile(
                    icon: Icons.task_alt_rounded,
                    value: '${journey.passedTaskCount}/${tasks.length}',
                    label: 'thử thách đạt trọn',
                    tone: AppCultureColors.oceanDark,
                    background: AppCultureColors.oceanLight,
                  ),
                  _StatTile(
                    icon: Icons.schedule_rounded,
                    value: duration == null ? '—' : formatDuration(duration.inSeconds),
                    label: 'thời gian trải nghiệm',
                    tone: AppCultureColors.textDark,
                    background: AppCultureColors.surfaceSubtle,
                  ),
                ],
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(padding: const EdgeInsets.fromLTRB(16, 4, 16, 0), child: _bonusCard()),
          ),
          if (stops.isNotEmpty) ...[
            _sectionTitle('Lộ trình đã đi'),
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(20),
                  child: SizedBox(
                    height: 210,
                    child: IgnorePointer(
                      child: JourneyMap(
                        stops: stops,
                        user: null,
                        heading: null,
                        satellite: false,
                        fitPadding: const EdgeInsets.all(48),
                      ),
                    ),
                  ),
                ),
              ),
            ),
            const SliverToBoxAdapter(
              child: Padding(padding: EdgeInsets.only(top: 6), child: MapAttributionText(satellite: false)),
            ),
          ],
          _sectionTitle('Từng điểm đến'),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            sliver: SliverList.list(
              children: [
                for (final d in journey.destinations) _DestinationRecap(dest: d, imageUrl: images[d.destinationId]),
              ],
            ),
          ),
          SliverToBoxAdapter(
            child: SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 4, 16, 20),
                child: PrimaryButton(
                  label: 'Xem lại hành trình',
                  icon: Icons.map_rounded,
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _bonusCard() {
    final bonus = journey.completionBonusPoints;
    final earned = bonus > 0;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: earned ? AppCultureColors.rewardBg : AppCultureColors.surfaceSubtle,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: earned ? AppCultureColors.rewardBorder : AppCultureColors.border),
      ),
      child: Row(
        children: [
          Icon(
            earned ? Icons.card_giftcard_rounded : Icons.info_outline_rounded,
            color: earned ? AppCultureColors.amberDark : AppCultureColors.textMuted,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              earned
                  ? 'Thưởng hoàn thành: +$bonus điểm (đã gồm trong tổng ${journey.totalPoints} điểm)'
                  : 'Không có thưởng hoàn thành vì có điểm đến bị bỏ qua.',
              style: TextStyle(
                fontSize: 13,
                height: 1.4,
                fontWeight: FontWeight.w600,
                color: earned ? AppCultureColors.rewardText : AppCultureColors.textMuted,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _sectionTitle(String text) => SliverToBoxAdapter(
    child: Padding(
      padding: const EdgeInsets.fromLTRB(20, 22, 20, 10),
      child: Text(
        text,
        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppCultureColors.textDark),
      ),
    ),
  );
}

class _Hero extends StatelessWidget {
  final TourJourney journey;
  final ({String title, String subtitle, IconData icon, Color accent}) rank;
  final String? coverImage;

  const _Hero({required this.journey, required this.rank, this.coverImage});

  @override
  Widget build(BuildContext context) {
    final done = journey.completedAt;
    // Nền là ảnh chụp thật của tour phủ lớp tối phẳng (không gradient, không hình trang trí)
    return ColoredBox(
      color: AppInk.ink,
      child: Stack(
        fit: StackFit.expand,
        children: [
          if (coverImage != null) ...[Photo(url: coverImage, width: 420), const ColoredBox(color: Color(0xA6000000))],
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(24, 60, 24, 20),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  // Cúp "bật" ra khi mở màn hình
                  TweenAnimationBuilder<double>(
                    tween: Tween(begin: 0.4, end: 1),
                    duration: const Duration(milliseconds: 700),
                    curve: Curves.elasticOut,
                    builder: (_, scale, child) => Transform.scale(scale: scale, child: child),
                    child: Container(
                      width: 92,
                      height: 92,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: Colors.white.withValues(alpha: 0.16),
                        border: Border.all(color: Colors.white.withValues(alpha: 0.5), width: 2),
                        boxShadow: [BoxShadow(color: rank.accent.withValues(alpha: 0.45), blurRadius: 28)],
                      ),
                      child: Icon(rank.icon, size: 50, color: rank.accent),
                    ),
                  ),
                  const SizedBox(height: 14),
                  Text(
                    rank.title,
                    textAlign: TextAlign.center,
                    style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    journey.tourName,
                    textAlign: TextAlign.center,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    rank.subtitle,
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Colors.white.withValues(alpha: 0.85), fontSize: 12.5, height: 1.4),
                  ),
                  if (done != null) ...[
                    const SizedBox(height: 10),
                    InfoChip.onGradient(icon: Icons.event_available_rounded, text: _formatDate(done)),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  static String _formatDate(DateTime d) {
    String two(int v) => v.toString().padLeft(2, '0');
    return '${two(d.hour)}:${two(d.minute)} · ${two(d.day)}/${two(d.month)}/${d.year}';
  }
}

class _StatTile extends StatelessWidget {
  final IconData icon;
  final String value;
  final String label;
  final Color tone;
  final Color background;

  const _StatTile({
    required this.icon,
    required this.value,
    required this.label,
    required this.tone,
    required this.background,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: background, borderRadius: BorderRadius.circular(18)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Icon(icon, size: 20, color: tone),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(
              value,
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: tone),
            ),
          ),
          Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontSize: 12, color: AppCultureColors.textMuted),
          ),
        ],
      ),
    );
  }
}

class _DestinationRecap extends StatelessWidget {
  final JourneyDestination dest;
  final String? imageUrl;

  const _DestinationRecap({required this.dest, this.imageUrl});

  @override
  Widget build(BuildContext context) {
    final skipped = dest.status == ProgressStatus.skipped;
    final points = dest.tasks.fold(0, (s, t) => s + t.pointsEarned);
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: SoftCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                SizedBox(
                  width: 52,
                  height: 52,
                  child: Photo(url: imageUrl, width: 52, borderRadius: BorderRadius.circular(12)),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Điểm ${dest.orderIndex} · ${dest.name}',
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14.5),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        skipped ? 'Đã bỏ qua' : '${dest.tasksCompleted}/${dest.totalTasks} nhiệm vụ · +$points điểm',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: skipped ? AppCultureColors.textMuted : AppCultureColors.jadeDark,
                        ),
                      ),
                    ],
                  ),
                ),
                if (dest.badgeAwarded) const Icon(Icons.workspace_premium_rounded, color: AppCultureColors.gold),
              ],
            ),
            if (!skipped && dest.tasks.isNotEmpty) ...[
              const SizedBox(height: 10),
              for (final t in dest.tasks)
                Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: Row(
                    children: [
                      Icon(
                        t.isPassed
                            ? Icons.check_circle_rounded
                            : t.isCompleted
                            ? Icons.remove_circle_rounded
                            : Icons.cancel_rounded,
                        size: 18,
                        color: t.isPassed
                            ? AppCultureColors.heritageJade
                            : t.isCompleted
                            ? AppCultureColors.warning
                            : AppCultureColors.error,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          t.name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontSize: 13, color: AppCultureColors.textDark),
                        ),
                      ),
                      Text(
                        t.isFailed ? 'Hết lượt' : '+${t.pointsEarned}',
                        style: const TextStyle(
                          fontSize: 12.5,
                          fontWeight: FontWeight.w700,
                          color: AppCultureColors.textMuted,
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ],
        ),
      ),
    );
  }
}
