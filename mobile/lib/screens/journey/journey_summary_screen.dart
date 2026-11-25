import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/models/tour_journey_model.dart';
import '../common/photo.dart';
import 'heritage_passport.dart';
import 'journey_map.dart';
import 'journey_share_card.dart';
import 'journey_widgets.dart';
import 'map_kit.dart' show MapAttributionText;
import 'navigation.dart' show formatDuration;
import '../../l10n/locale_controller.dart';

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

  ({String title, String subtitle, IconData icon, AppTone tone}) get _rank => switch (journey.completionRank) {
    CompletionRank.perfect => (
      title: appL10n.sumPerfectTitle,
      subtitle: appL10n.sumPerfectSubtitle,
      icon: Icons.emoji_events_rounded,
      tone: AppTone.brass,
    ),
    CompletionRank.partial => (
      title: appL10n.jsRankPartial,
      subtitle: appL10n.sumPartialSubtitle(journey.skippedCount),
      icon: Icons.flag_rounded,
      tone: AppTone.coral,
    ),
    _ => (
      title: appL10n.jsRankDone,
      subtitle: appL10n.sumDoneSubtitle,
      icon: Icons.workspace_premium_rounded,
      tone: AppTone.jade,
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
            expandedHeight: 420,
            backgroundColor: AppCultureColors.background,
            foregroundColor: AppCultureColors.textDark,
            surfaceTintColor: Colors.transparent,
            scrolledUnderElevation: 0.5,
            title: Text(appL10n.sumTitle, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 17)),
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
                    label: appL10n.sumPointsEarned,
                    tone: AppCultureColors.amberDark,
                    background: AppCultureColors.rewardBg,
                  ),
                  _StatTile(
                    icon: Icons.place_rounded,
                    value: '${journey.doneCount - journey.skippedCount}/${journey.totalDestinations}',
                    label: appL10n.sumDestinationsVisited,
                    tone: AppCultureColors.jadeDark,
                    background: AppCultureColors.jadeLight,
                  ),
                  _StatTile(
                    icon: Icons.task_alt_rounded,
                    value: '${journey.passedTaskCount}/${tasks.length}',
                    label: appL10n.sumPerfectChallenges,
                    tone: AppCultureColors.oceanDark,
                    background: AppCultureColors.oceanLight,
                  ),
                  _StatTile(
                    icon: Icons.schedule_rounded,
                    value: duration == null ? '—' : formatDuration(duration.inSeconds),
                    label: appL10n.sumDuration,
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
            _sectionTitle(appL10n.sumRoute),
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
          _sectionTitle(appL10n.jsHeritageStamps),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: HeritagePassport(journey: journey, stampSize: 88),
            ),
          ),
          _sectionTitle(appL10n.sumEachDestination),
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
                child: Column(
                  children: [
                    PrimaryButton(
                      label: appL10n.sumShare,
                      icon: Icons.ios_share_rounded,
                      onPressed: () => showJourneyShareSheet(context, journey: journey, coverImage: coverImage),
                    ),
                    const SizedBox(height: 10),
                    SizedBox(
                      width: double.infinity,
                      height: 50,
                      child: OutlinedButton.icon(
                        onPressed: () => Navigator.of(context).pop(),
                        icon: const Icon(Icons.map_rounded, size: 19),
                        label: Text(appL10n.sumReview, style: const TextStyle(fontWeight: FontWeight.w700)),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppCultureColors.textDark,
                          side: const BorderSide(color: AppCultureColors.border, width: 1.2),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                        ),
                      ),
                    ),
                  ],
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
                  ? appL10n.sumBonus('$bonus', journey.totalPoints)
                  : appL10n.sumNoBonus,
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

/// Hero sáng: ảnh tour bo góc phía trên, cúp "bật" ra đè mép ảnh, hạng + tên tour trên nền pastel theo hạng.
class _Hero extends StatelessWidget {
  final TourJourney journey;
  final ({String title, String subtitle, IconData icon, AppTone tone}) rank;
  final String? coverImage;

  const _Hero({required this.journey, required this.rank, this.coverImage});

  @override
  Widget build(BuildContext context) {
    final done = journey.completedAt;
    final tone = rank.tone;
    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [tone.tint, AppCultureColors.background],
        ),
      ),
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, kToolbarHeight + 4, 16, 16),
          child: Column(
            children: [
              // Ảnh tour + cúp đè mép dưới ảnh
              SizedBox(
                height: 176,
                child: Stack(
                  clipBehavior: Clip.none,
                  children: [
                    Positioned.fill(
                      bottom: 36,
                      child: Container(
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(22),
                          boxShadow: [
                            BoxShadow(color: tone.strong.withValues(alpha: 0.12), blurRadius: 18, offset: const Offset(0, 8)),
                          ],
                        ),
                        child: Photo(url: coverImage, width: 420, borderRadius: BorderRadius.circular(22)),
                      ),
                    ),
                    Align(
                      alignment: Alignment.bottomCenter,
                      child: TweenAnimationBuilder<double>(
                        tween: Tween(begin: 0.4, end: 1),
                        duration: const Duration(milliseconds: 700),
                        curve: Curves.elasticOut,
                        builder: (_, scale, child) => Transform.scale(scale: scale, child: child),
                        child: Container(
                          width: 80,
                          height: 80,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: AppCultureColors.surface,
                            border: Border.all(color: tone.soft, width: 3),
                            boxShadow: [BoxShadow(color: tone.strong.withValues(alpha: 0.25), blurRadius: 22, offset: const Offset(0, 6))],
                          ),
                          child: Icon(rank.icon, size: 42, color: tone.strong),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              Text(
                rank.title,
                textAlign: TextAlign.center,
                style: TextStyle(color: tone.strong, fontSize: 23, fontWeight: FontWeight.w800, letterSpacing: -0.3),
              ),
              const SizedBox(height: 4),
              Text(
                journey.tourName,
                textAlign: TextAlign.center,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: AppType.editorial(size: 17, height: 1.3),
              ),
              const SizedBox(height: 8),
              Text(
                rank.subtitle,
                textAlign: TextAlign.center,
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(color: AppCultureColors.textMuted, fontSize: 13, height: 1.45),
              ),
              if (done != null) ...[
                const SizedBox(height: 10),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: AppCultureColors.surface,
                    borderRadius: BorderRadius.circular(999),
                    border: Border.all(color: tone.soft),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.event_available_rounded, size: 14, color: tone.strong),
                      const SizedBox(width: 5),
                      Text(
                        _formatDate(done),
                        style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: AppCultureColors.textDark),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
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
                        appL10n.sumDestinationN(dest.orderIndex, dest.name),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14.5),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        skipped ? appL10n.jsSkippedStatus : appL10n.sumDestinationStats(dest.tasksCompleted, dest.totalTasks, points),
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
                        t.isFailed ? appL10n.sumNoAttempts : '+${t.pointsEarned}',
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
