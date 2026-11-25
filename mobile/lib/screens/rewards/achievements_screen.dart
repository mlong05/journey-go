import 'dart:math' as math;

import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/models/gamification_model.dart';
import '../../core/services/gamification_service.dart';
import '../common/bright.dart';
import '../common/heritage_motion.dart';
import 'badges_screen.dart';
import 'rewards_widgets.dart';
import '../../l10n/locale_controller.dart';

class _AchievementCategoryMeta {
  final String key;
  final String label;
  final String shortLabel;
  final String description;
  final String unit;
  final IconData icon;

  const _AchievementCategoryMeta({
    required this.key,
    required this.label,
    required this.shortLabel,
    required this.description,
    required this.unit,
    required this.icon,
  });
}

List<_AchievementCategoryMeta> get _categories => [
  _AchievementCategoryMeta(
    key: 'TOUR',
    label: appL10n.achCatTour,
    shortLabel: appL10n.achCatTourShort,
    description: appL10n.achCatTourDesc,
    unit: appL10n.achUnitTour,
    icon: Icons.explore_rounded,
  ),
  _AchievementCategoryMeta(
    key: 'CHECKIN',
    label: appL10n.achCatCheckin,
    shortLabel: appL10n.achCatCheckinShort,
    description: appL10n.achCatCheckinDesc,
    unit: appL10n.achUnitDestination,
    icon: Icons.place_rounded,
  ),
  _AchievementCategoryMeta(
    key: 'CULTURE_QUIZ',
    label: appL10n.achCatCulture,
    shortLabel: appL10n.achCatCultureShort,
    description: appL10n.achCatCultureDesc,
    unit: appL10n.achUnitLesson,
    icon: Icons.menu_book_rounded,
  ),
  _AchievementCategoryMeta(
    key: 'EXPERIENCE',
    label: appL10n.achCatExperience,
    shortLabel: appL10n.achCatExperienceShort,
    description: appL10n.achCatExperienceDesc,
    unit: appL10n.achUnitMission,
    icon: Icons.auto_awesome_rounded,
  ),
  _AchievementCategoryMeta(
    key: 'STREAK_LOYALTY',
    label: appL10n.achCatStreak,
    shortLabel: appL10n.achCatStreakShort,
    description: appL10n.achCatStreakDesc,
    unit: appL10n.achUnitMilestone,
    icon: Icons.local_fire_department_rounded,
  ),
];

Map<String, _AchievementCategoryMeta> get _categoryMap => {
  for (final c in _categories) c.key: c,
};

class _TierStyle {
  final String label;
  final Color pillBg;
  final Color pillBorder;
  final Color pillText;
  final List<Color> ringGradient;
  final Color ringBorder;
  final Color iconColor;
  final bool isLegendary;

  const _TierStyle({
    required this.label,
    required this.pillBg,
    required this.pillBorder,
    required this.pillText,
    required this.ringGradient,
    required this.ringBorder,
    required this.iconColor,
    this.isLegendary = false,
  });
}

Map<String, _TierStyle> get _tierStyles => {
  'BRONZE': _TierStyle(
    label: appL10n.achTierBronze,
    pillBg: AppCultureColors.terra50,
    pillBorder: AppCultureColors.terra200,
    pillText: AppCultureColors.terra700,
    ringGradient: [AppCultureColors.terra50, AppCultureColors.terra200],
    ringBorder: AppCultureColors.terra300,
    iconColor: AppCultureColors.terra600,
  ),
  'SILVER': _TierStyle(
    label: appL10n.achTierSilver,
    pillBg: AppCultureColors.ink50,
    pillBorder: AppCultureColors.ink200,
    pillText: AppCultureColors.ink700,
    ringGradient: [AppCultureColors.ink50, AppCultureColors.ink100],
    ringBorder: AppCultureColors.ink200,
    iconColor: AppCultureColors.ink600,
  ),
  'GOLD': _TierStyle(
    label: appL10n.achTierGold,
    pillBg: AppCultureColors.brass50,
    pillBorder: AppCultureColors.brass300,
    pillText: AppCultureColors.brass800,
    ringGradient: [AppCultureColors.brass100, AppCultureColors.brass300],
    ringBorder: AppCultureColors.brass400,
    iconColor: AppCultureColors.brass800,
  ),
  'LEGENDARY': _TierStyle(
    label: appL10n.achTierLegendary,
    pillBg: AppCultureColors.indigo50,
    pillBorder: AppCultureColors.indigo200,
    pillText: AppCultureColors.indigo700,
    ringGradient: [AppCultureColors.indigo50, AppCultureColors.brass200],
    ringBorder: AppCultureColors.brass400,
    iconColor: AppCultureColors.indigo600,
    isLegendary: true,
  ),
};

const _statusWeight = {
  'CLAIMABLE': 0,
  'LOCKED': 1,
  'CLAIMED': 2,
};

String _progressUnitFor(
  TouristAchievementModel item,
  _AchievementCategoryMeta category,
) {
  if (item.code == 'TEN_THOUSAND_POINTS_EARNED') return 'JP';
  if (item.code.contains('STREAK')) return appL10n.achUnitDays;
  return category.unit;
}

List<TouristAchievementModel> _sortAchievements(
  List<TouristAchievementModel> items,
) {
  final copy = [...items];
  copy.sort((a, b) {
    final wa = _statusWeight[a.status] ?? 9;
    final wb = _statusWeight[b.status] ?? 9;
    if (wa != wb) return wa.compareTo(wb);
    if (a.isLocked && b.isLocked) {
      final cmp = b.progressRatio.compareTo(a.progressRatio);
      if (cmp != 0) return cmp;
    }
    return a.id.compareTo(b.id);
  });
  return copy;
}

class _CategoryStat {
  final int total;
  final int achieved;
  final int claimable;

  const _CategoryStat({
    this.total = 0,
    this.achieved = 0,
    this.claimable = 0,
  });

  int get pct => total > 0 ? ((achieved / total) * 100).round() : 0;
  double get ratio => total > 0 ? (achieved / total).clamp(0.0, 1.0) : 0.0;
}

enum _AchievementFilter { all, unlocked, claimable }

/// Màn hình Thành tựu & Huy hiệu lấy cảm hứng từ Genshin Impact × Di sản Việt Nam.
class AchievementsScreen extends StatefulWidget {
  const AchievementsScreen({super.key});

  @override
  State<AchievementsScreen> createState() => _AchievementsScreenState();
}

class _AchievementsScreenState extends State<AchievementsScreen> {
  final GamificationService _service = GamificationService();

  List<TouristAchievementModel> _achievements = const [];
  AchievementSummaryModel? _summary;
  bool _loading = true;
  String? _error;
  String? _claimError;
  String _selectedCategory = _categories.first.key;
  bool _initialCategoryPicked = false;
  _AchievementFilter _statusFilter = _AchievementFilter.all;
  int? _claimingId;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final itemsFuture = _service.getAchievements(page: 0, size: 100);
      final summaryFuture = _service.getAchievementSummary().then<AchievementSummaryModel?>(
        (s) => s,
        onError: (_) => null,
      );

      final items = await itemsFuture;
      final sum = await summaryFuture;
      if (!mounted) return;

      var nextCategory = _selectedCategory;
      if (!_initialCategoryPicked) {
        final hasClaimableInDefault = items.any(
          (a) => a.category == _categories.first.key && a.isClaimable,
        );
        if (!hasClaimableInDefault) {
          final firstClaimable = items.where((a) => a.isClaimable).firstOrNull;
          if (firstClaimable != null &&
              _categoryMap.containsKey(firstClaimable.category)) {
            nextCategory = firstClaimable.category;
          }
        }
        _initialCategoryPicked = true;
      }

      setState(() {
        _achievements = items;
        _summary = sum;
        _selectedCategory = nextCategory;
        _loading = false;
      });
    } on GamificationException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.message;
        _loading = false;
      });
    }
  }

  Future<void> _handleClaim(TouristAchievementModel item) async {
    if (_claimingId != null) return;
    setState(() {
      _claimingId = item.id;
      _claimError = null;
    });

    try {
      final res = await _service.claimAchievement(item.id);
      if (!mounted) return;

      final awarded =
          res.pointsAwarded > 0 ? res.pointsAwarded : item.pointsReward;
      final claimedAt = res.claimedAt ?? DateTime.now();

      setState(() {
        _achievements = [
          for (final a in _achievements)
            if (a.id == item.id)
              a.copyWith(status: 'CLAIMED', claimedAt: claimedAt)
            else
              a,
        ];
        if (_summary != null) {
          _summary = _summary!.copyWith(
            unclaimedCount: math.max(0, _summary!.unclaimedCount - 1),
            totalClaimed: _summary!.totalClaimed + 1,
            totalPointsEarned: _summary!.totalPointsEarned + awarded,
          );
        }
        _claimingId = null;
      });

      await showClaimRewardDialog(
        context,
        result: res,
        achievement: item,
      );
    } on GamificationException catch (e) {
      if (!mounted) return;
      setState(() {
        _claimError = e.message;
        _claimingId = null;
      });
    }
  }

  void _openBadges() async {
    await Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const BadgesScreen()),
    );
  }

  ({
    Map<String, _CategoryStat> byCategory,
    int totalCount,
    int totalAchieved,
    int unclaimedCount,
    int totalClaimed,
    int totalPointsEarned,
    int overallPct,
    double overallRatio,
  }) _computeStats() {
    final totalByCat = {for (final c in _categories) c.key: 0};
    final achievedByCat = {for (final c in _categories) c.key: 0};
    final claimableByCat = {for (final c in _categories) c.key: 0};

    var totalAchievedCalc = 0;
    var totalClaimableCalc = 0;
    var totalClaimedCalc = 0;
    var totalPointsCalc = 0;

    for (final item in _achievements) {
      if (item.isAchieved) totalAchievedCalc += 1;
      if (item.isClaimable) totalClaimableCalc += 1;
      if (item.isClaimed) {
        totalClaimedCalc += 1;
        totalPointsCalc += item.pointsReward;
      }
      if (totalByCat.containsKey(item.category)) {
        totalByCat[item.category] = totalByCat[item.category]! + 1;
        if (item.isAchieved) {
          achievedByCat[item.category] = achievedByCat[item.category]! + 1;
        }
        if (item.isClaimable) {
          claimableByCat[item.category] = claimableByCat[item.category]! + 1;
        }
      }
    }

    final byCategory = {
      for (final c in _categories)
        c.key: _CategoryStat(
          total: totalByCat[c.key]!,
          achieved: achievedByCat[c.key]!,
          claimable: claimableByCat[c.key]!,
        ),
    };

    final totalCount = _achievements.length;
    final totalAchieved = _summary?.totalAchieved ?? totalAchievedCalc;
    final unclaimedCount = _summary?.unclaimedCount ?? totalClaimableCalc;
    final totalClaimed = _summary?.totalClaimed ?? totalClaimedCalc;
    final totalPointsEarned = _summary?.totalPointsEarned ?? totalPointsCalc;
    final overallRatio =
        totalCount > 0 ? (totalAchieved / totalCount).clamp(0.0, 1.0) : 0.0;
    final overallPct = (overallRatio * 100).round();

    return (
      byCategory: byCategory,
      totalCount: totalCount,
      totalAchieved: totalAchieved,
      unclaimedCount: unclaimedCount,
      totalClaimed: totalClaimed,
      totalPointsEarned: totalPointsEarned,
      overallPct: overallPct,
      overallRatio: overallRatio,
    );
  }

  List<TouristAchievementModel> _visibleAchievements() {
    final filtered = _achievements.where((item) {
      if (item.category != _selectedCategory) return false;
      switch (_statusFilter) {
        case _AchievementFilter.all:
          return true;
        case _AchievementFilter.unlocked:
          return item.isAchieved;
        case _AchievementFilter.claimable:
          return item.isClaimable;
      }
    }).toList();
    return _sortAchievements(filtered);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppCultureColors.background,
      appBar: buildRewardsAppBar(
        context,
        appL10n.achTitle,
        actions: [
          IconButton(
            onPressed: _openBadges,
            tooltip: appL10n.achBadgeCollection,
            icon: const Icon(
              Icons.military_tech_outlined,
              color: AppCultureColors.heritageJade,
            ),
          ),
        ],
      ),
      body: RefreshIndicator(
        color: AppCultureColors.heritageJade,
        onRefresh: _load,
        child: _buildBody(),
      ),
    );
  }

  Widget _buildBody() {
    if (_loading) return const RewardsSkeletonList(count: 5, itemHeight: 110);

    if (_error != null) {
      return ListView(
        children: [
          SizedBox(
            height: MediaQuery.of(context).size.height * 0.65,
            child: RewardsMessageView(
              icon: Icons.cloud_off_rounded,
              title: appL10n.achLoadFailed,
              message: _error,
              onRetry: _load,
            ),
          ),
        ],
      );
    }

    final stats = _computeStats();
    final activeCat = _categoryMap[_selectedCategory] ?? _categories.first;
    final activeCatStat = stats.byCategory[activeCat.key] ?? const _CategoryStat();
    final visible = _visibleAchievements();

    return LayoutBuilder(
      builder: (context, constraints) {
        final wide = constraints.maxWidth >= 720;
        return ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
          children: [
            _buildSummaryHeader(stats, wide: wide),
            if (_claimError != null) ...[
              const SizedBox(height: 12),
              _buildClaimErrorBanner(_claimError!),
            ],
            const SizedBox(height: 16),
            if (wide)
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SizedBox(
                    width: 260,
                    child: _buildDesktopCategoryRail(stats.byCategory),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: _buildDetailColumn(
                      activeCat,
                      activeCatStat,
                      visible,
                    ),
                  ),
                ],
              )
            else ...[
              _buildMobileCategoryStrip(stats.byCategory),
              const SizedBox(height: 14),
              _buildDetailColumn(activeCat, activeCatStat, visible),
            ],
          ],
        );
      },
    );
  }

  Widget _buildSummaryHeader(
    ({
      Map<String, _CategoryStat> byCategory,
      int totalCount,
      int totalAchieved,
      int unclaimedCount,
      int totalClaimed,
      int totalPointsEarned,
      int overallPct,
      double overallRatio,
    }) stats, {
    required bool wide,
  }) {
    final filterPills = [
      (
        filter: _AchievementFilter.all,
        label: appL10n.listAll,
        count: stats.totalCount,
        dot: false,
      ),
      (
        filter: _AchievementFilter.unlocked,
        label: appL10n.achFilterUnlocked,
        count: stats.totalAchieved,
        dot: false,
      ),
      (
        filter: _AchievementFilter.claimable,
        label: appL10n.achFilterClaimable,
        count: stats.unclaimedCount,
        dot: stats.unclaimedCount > 0,
      ),
    ];

    // Ô thống kê sáng theo nhóm màu: ngọc = tiến độ, vàng = điểm, san hô = chờ nhận thưởng
    Widget statBox({required AppTone tone, required Widget child}) => Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: AppCultureColors.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: tone.soft),
          ),
          child: child,
        );

    Widget boxLabel(IconData icon, String text, AppTone tone, {Widget? trailing}) => Row(
          children: [
            IconTile(icon: icon, tone: tone, size: 26),
            const SizedBox(width: 7),
            Expanded(
              child: Text(
                text,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: AppCultureColors.textMuted),
              ),
            ),
            ?trailing,
          ],
        );

    const bigNum = TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: AppCultureColors.textDark, height: 1.1);

    Widget progressCard = statBox(
      tone: AppTone.jade,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          boxLabel(
            Icons.emoji_events_rounded,
            appL10n.achAchieved,
            AppTone.jade,
            trailing: Text(
              '${stats.overallPct}%',
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: AppCultureColors.jadeDark),
            ),
          ),
          const SizedBox(height: 8),
          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              CountUpText(value: stats.totalAchieved, style: bigNum.copyWith(fontSize: 24)),
              Text(
                '/${stats.totalCount}',
                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppCultureColors.textMuted),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(6),
            child: TweenAnimationBuilder<double>(
              tween: Tween(begin: 0, end: stats.overallRatio),
              duration: const Duration(milliseconds: 650),
              curve: Curves.easeOutCubic,
              builder: (_, val, _) => LinearProgressIndicator(
                value: val,
                minHeight: 7,
                backgroundColor: AppCultureColors.jadeTint,
                valueColor: const AlwaysStoppedAnimation(AppCultureColors.heritageJade),
              ),
            ),
          ),
        ],
      ),
    );

    Widget pointsCard = statBox(
      tone: AppTone.brass,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          boxLabel(Icons.auto_awesome_rounded, appL10n.achPoints, AppTone.brass),
          const SizedBox(height: 8),
          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              const Text('+', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: AppCultureColors.brass700)),
              CountUpText(
                value: stats.totalPointsEarned,
                style: bigNum.copyWith(fontSize: 21, color: AppCultureColors.brass700),
              ),
              const Text(
                ' JP',
                style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: AppCultureColors.brass800),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            appL10n.achBadgesClaimed(stats.totalClaimed),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontSize: 12, color: AppCultureColors.textMuted),
          ),
        ],
      ),
    );

    final hasClaimable = stats.unclaimedCount > 0;
    Widget claimableCard = statBox(
      tone: hasClaimable ? AppTone.coral : AppTone.jade,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          boxLabel(Icons.card_giftcard_rounded, appL10n.achFilterClaimable, hasClaimable ? AppTone.coral : AppTone.jade),
          const SizedBox(height: 8),
          Row(
            children: [
              CountUpText(
                value: stats.unclaimedCount,
                style: bigNum.copyWith(fontSize: 21, color: hasClaimable ? AppCultureColors.coralDark : AppCultureColors.textDark),
              ),
              const SizedBox(width: 6),
              if (hasClaimable)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(color: AppCultureColors.coral, borderRadius: BorderRadius.circular(20)),
                  child: Text(
                    appL10n.achPending,
                    style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: Colors.white),
                  ),
                )
              else
                Flexible(
                  child: Text(
                    appL10n.achAllClaimed,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppCultureColors.jadeDark),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            appL10n.achCompleteToUnlock,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(fontSize: 12, color: AppCultureColors.textMuted),
          ),
        ],
      ),
    );

    return BrightHeroCard(
      tone: AppTone.jade,
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (wide)
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(child: progressCard),
                const SizedBox(width: 10),
                Expanded(child: pointsCard),
                const SizedBox(width: 10),
                Expanded(child: claimableCard),
              ],
            )
          else ...[
            progressCard,
            const SizedBox(height: 10),
            IntrinsicHeight(
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Expanded(child: pointsCard),
                  const SizedBox(width: 10),
                  Expanded(child: claimableCard),
                ],
              ),
            ),
          ],
          const SizedBox(height: 14),
          // Bộ lọc tự xuống hàng — không viên nào bị cắt ở mép màn hình
          Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final pill in filterPills)
                  _buildFilterPill(
                    label: pill.label,
                    count: pill.count,
                    dot: pill.dot,
                    selected: _statusFilter == pill.filter,
                    onTap: () => setState(() => _statusFilter = pill.filter),
                  ),
              ],
          ),
        ],
      ),
    );
  }

  /// Viên thuốc lọc: đang chọn nền xanh ngọc chữ trắng; chưa chọn nền trắng viền nhạt chữ màu mực.
  Widget _buildFilterPill({
    required String label,
    required int count,
    required bool dot,
    required bool selected,
    required VoidCallback onTap,
  }) {
    return Material(
      color: selected ? AppCultureColors.heritageJade : AppCultureColors.surface,
      shape: StadiumBorder(
        side: BorderSide(color: selected ? AppCultureColors.heritageJade : AppCultureColors.border),
      ),
      child: InkWell(
        onTap: onTap,
        customBorder: const StadiumBorder(),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (dot) ...[
                Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: AppCultureColors.coral,
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 1.2),
                  ),
                ),
                const SizedBox(width: 6),
              ],
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
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 1),
                decoration: BoxDecoration(
                  color: selected ? Colors.white.withValues(alpha: 0.22) : AppCultureColors.surfaceSubtle,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  '$count',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                    color: selected ? Colors.white : AppCultureColors.textMuted,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildClaimErrorBanner(String message) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: AppCultureColors.lacquer50,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppCultureColors.lacquer200),
      ),
      child: Row(
        children: [
          const Icon(
            Icons.error_outline_rounded,
            size: 18,
            color: AppCultureColors.error,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              message,
              style: const TextStyle(
                fontSize: 12.5,
                fontWeight: FontWeight.w600,
                color: AppCultureColors.lacquer700,
              ),
            ),
          ),
          TextButton(
            onPressed: () => setState(() => _claimError = null),
            style: TextButton.styleFrom(
              foregroundColor: AppCultureColors.error,
              minimumSize: const Size(0, 32),
              padding: const EdgeInsets.symmetric(horizontal: 8),
            ),
            child: Text(
              appL10n.commonClose,
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );
  }

  /// Danh mục dạng chip tự xuống hàng (thay dải thẻ cuộn ngang bị cắt ở mép):
  /// icon + tên ngắn + "đạt/tổng" + chấm số thưởng chờ nhận; đang chọn nền ngọc nhạt viền ngọc.
  Widget _buildMobileCategoryStrip(Map<String, _CategoryStat> byCategory) {
    return SizedBox(
      width: double.infinity,
      child: Wrap(
        spacing: 8,
        runSpacing: 8,
        children: [
          for (final cat in _categories) _categoryChip(cat, byCategory[cat.key] ?? const _CategoryStat()),
        ],
      ),
    );
  }

  Widget _categoryChip(_AchievementCategoryMeta cat, _CategoryStat st) {
    final active = _selectedCategory == cat.key;
    return Semantics(
      button: true,
      selected: active,
      child: Material(
        color: active ? AppCultureColors.jadeTint : AppCultureColors.surface,
        shape: StadiumBorder(
          side: BorderSide(
            color: active ? AppCultureColors.heritageJade : AppCultureColors.border,
            width: active ? 1.5 : 1,
          ),
        ),
        child: InkWell(
          onTap: () => setState(() => _selectedCategory = cat.key),
          customBorder: const StadiumBorder(),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(cat.icon, size: 16, color: active ? AppCultureColors.jadeDark : AppCultureColors.heritageJade),
                const SizedBox(width: 6),
                Text(
                  cat.shortLabel,
                  maxLines: 1,
                  softWrap: false,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: active ? AppCultureColors.jadeDark : AppCultureColors.textDark,
                  ),
                ),
                const SizedBox(width: 6),
                Text(
                  '${st.achieved}/${st.total}',
                  maxLines: 1,
                  softWrap: false,
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppCultureColors.textMuted),
                ),
                if (st.claimable > 0) ...[
                  const SizedBox(width: 6),
                  Container(
                    constraints: const BoxConstraints(minWidth: 18),
                    padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                    decoration: BoxDecoration(color: AppCultureColors.coral, borderRadius: BorderRadius.circular(9)),
                    child: Text(
                      '${st.claimable}',
                      textAlign: TextAlign.center,
                      maxLines: 1,
                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Colors.white),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildDesktopCategoryRail(Map<String, _CategoryStat> byCategory) {
    return Column(
      children: [
        for (final (i, cat) in _categories.indexed) ...[
          if (i > 0) const SizedBox(height: 10),
          _buildDesktopCategoryTile(
            cat,
            byCategory[cat.key] ?? const _CategoryStat(),
          ),
        ],
      ],
    );
  }

  Widget _buildDesktopCategoryTile(
    _AchievementCategoryMeta cat,
    _CategoryStat st,
  ) {
    final active = _selectedCategory == cat.key;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () => setState(() => _selectedCategory = cat.key),
        borderRadius: BorderRadius.circular(18),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            
            color: active ? AppCultureColors.jadeTint : AppCultureColors.surface,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(
              color: active
                  ? AppCultureColors.heritageJade
                        : AppCultureColors.border,
            ),
          ),
          child: Column(
            children: [
              Row(
                children: [
                  Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      color: active ? AppCultureColors.surface : AppCultureColors.jadeLight,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      cat.icon,
                      size: 19,
                      color: active ? AppCultureColors.jadeDark : AppCultureColors.heritageJade,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          cat.label,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 13.5,
                            fontWeight: FontWeight.w800,
                            color: active ? AppCultureColors.jadeDark : AppCultureColors.textDark,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          appL10n.achCategoryProgress(st.achieved, st.total, st.pct),
                          style: TextStyle(
                            fontSize: 11.5,
                            color: active ? AppCultureColors.jadeDark : AppCultureColors.textMuted,
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (st.claimable > 0)
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 7,
                        vertical: 2,
                      ),
                      decoration: BoxDecoration(
                        color: AppCultureColors.coral,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        '${st.claimable}',
                        style: const TextStyle(
                          fontSize: 10.5,
                          fontWeight: FontWeight.w800,
                          color: Colors.white,
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(6),
                      child: LinearProgressIndicator(
                        value: st.ratio,
                        minHeight: 5,
                        backgroundColor: active ? AppCultureColors.surface : AppCultureColors.surfaceSubtle,
                        valueColor: AlwaysStoppedAnimation(
                          AppCultureColors.heritageJade,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Icon(
                    Icons.chevron_right_rounded,
                    size: 16,
                    color: active ? AppCultureColors.jadeDark : AppCultureColors.textLight,
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDetailColumn(
    _AchievementCategoryMeta activeCat,
    _CategoryStat activeCatStat,
    List<TouristAchievementModel> visible,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Header của danh mục đang chọn
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: AppCultureColors.border),
          ),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: AppCultureColors.jadeLight,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  activeCat.icon,
                  size: 20,
                  color: AppCultureColors.heritageJade,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      activeCat.label,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                        color: AppCultureColors.textDark,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      activeCat.description,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppCultureColors.textMuted,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 5,
                ),
                decoration: BoxDecoration(
                  color: AppCultureColors.surfaceSubtle,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  '${activeCatStat.achieved}/${activeCatStat.total} (${activeCatStat.pct}%)',
                  style: const TextStyle(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w800,
                    color: AppCultureColors.textDark,
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        if (visible.isEmpty)
          _buildEmptyCategoryState()
        else
          AnimatedSwitcher(
            duration: reduceMotion(context)
                ? Duration.zero
                : const Duration(milliseconds: 220),
            child: Column(
              key: ValueKey('${activeCat.key}-${_statusFilter.name}'),
              children: [
                for (final (i, item) in visible.indexed) ...[
                  if (i > 0) const SizedBox(height: 12),
                  _AchievementCard(
                    item: item,
                    category: activeCat,
                    claiming: _claimingId == item.id,
                    busy: _claimingId != null,
                    onClaim: () => _handleClaim(item),
                  ),
                ],
              ],
            ),
          ),
      ],
    );
  }

  Widget _buildEmptyCategoryState() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 28),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppCultureColors.border),
      ),
      child: Column(
        children: [
          const Icon(
            Icons.emoji_events_outlined,
            size: 38,
            color: AppCultureColors.textLight,
          ),
          const SizedBox(height: 10),
          Text(
            appL10n.achNoMatch,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: AppCultureColors.textDark,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            appL10n.achNoMatchHint,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 12,
              color: AppCultureColors.textMuted,
              height: 1.4,
            ),
          ),
          if (_statusFilter != _AchievementFilter.all) ...[
            const SizedBox(height: 14),
            FilledButton(
              onPressed: () =>
                  setState(() => _statusFilter = _AchievementFilter.all),
              style: FilledButton.styleFrom(
                backgroundColor: AppCultureColors.heritageJade,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: Text(
                appL10n.achSeeAllInCategory,
                style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _AchievementCard extends StatelessWidget {
  final TouristAchievementModel item;
  final _AchievementCategoryMeta category;
  final bool claiming;
  final bool busy;
  final VoidCallback onClaim;

  const _AchievementCard({
    required this.item,
    required this.category,
    required this.claiming,
    required this.busy,
    required this.onClaim,
  });

  @override
  Widget build(BuildContext context) {
    final tier = _tierStyles[item.tier] ?? _tierStyles['BRONZE']!;
    final unit = _progressUnitFor(item, category);
    final isClaimable = item.isClaimable;
    final isClaimed = item.isClaimed;

    final borderColor = isClaimable
        ? AppCultureColors.brass300
        : isClaimed
            ? AppCultureColors.jade200
            : AppCultureColors.border;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        gradient: isClaimable
            ? const LinearGradient(
                colors: [AppCultureColors.brass50, Colors.white],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              )
            : null,
        color: isClaimable ? null : Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: borderColor, width: isClaimable ? 1.5 : 1),
        boxShadow: isClaimable
            ? [
                BoxShadow(
                  color: AppCultureColors.brass500.withValues(alpha: 0.16),
                  blurRadius: 16,
                  offset: const Offset(0, 6),
                ),
              ]
            : null,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _AchievementBadgeThumb(item: item, tier: tier),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Text(
                            item.name,
                            style: const TextStyle(
                              fontSize: 14.5,
                              fontWeight: FontWeight.w800,
                              color: AppCultureColors.textDark,
                              height: 1.25,
                            ),
                          ),
                        ),
                        if (isClaimable) ...[
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 7,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: AppCultureColors.brass100,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Text(
                              appL10n.achReady,
                              style: TextStyle(
                                fontSize: 10.5,
                                fontWeight: FontWeight.w800,
                                color: AppCultureColors.brass800,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                    if (item.description.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(
                        item.description,
                        style: const TextStyle(
                          fontSize: 12.5,
                          height: 1.4,
                          color: AppCultureColors.textMuted,
                        ),
                      ),
                    ],
                    const SizedBox(height: 10),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Flexible(
                          child: Text(
                            appL10n.achProgress(formatThousands(item.displayProgress), formatThousands(item.safeTarget), unit),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 11.5,
                              fontWeight: FontWeight.w700,
                              color: isClaimable
                                  ? AppCultureColors.brass800
                                  : isClaimed
                                      ? AppCultureColors.success
                                      : AppCultureColors.textMuted,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          '${item.progressPercent}%',
                          style: const TextStyle(
                            fontSize: 11.5,
                            fontWeight: FontWeight.w700,
                            color: AppCultureColors.textMuted,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 5),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(6),
                      child: LinearProgressIndicator(
                        value: item.progressRatio,
                        minHeight: 7,
                        backgroundColor: AppCultureColors.surfaceSubtle,
                        valueColor: AlwaysStoppedAnimation(
                          isClaimable
                              ? AppCultureColors.brass500
                              : isClaimed
                                  ? AppCultureColors.success
                                  : AppCultureColors.heritageJade,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          const Divider(height: 1, color: AppCultureColors.borderLight),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: AppCultureColors.brass50,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: AppCultureColors.brass200),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(
                            Icons.auto_awesome_rounded,
                            size: 13,
                            color: AppCultureColors.brass600,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            '+${formatThousands(item.pointsReward)} JP',
                            style: const TextStyle(
                              fontSize: 12.5,
                              fontWeight: FontWeight.w900,
                              color: AppCultureColors.brass700,
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (item.badgeName != null) ...[
                      const SizedBox(height: 5),
                      Row(
                        children: [
                          const Icon(
                            Icons.military_tech_outlined,
                            size: 13,
                            color: AppCultureColors.heritageJade,
                          ),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              item.badgeName!,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontSize: 11.5,
                                fontWeight: FontWeight.w600,
                                color: AppCultureColors.textMuted,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: 10),
              _buildActionControl(isClaimable, isClaimed),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildActionControl(bool isClaimable, bool isClaimed) {
    if (isClaimable) {
      return Pressable(
        onTap: busy ? null : onClaim,
        child: Container(
          // Nút chính màu xanh ngọc đặc: chữ trắng 5.3:1 (gradient vàng→cam cũ chỉ 2.7:1)
          decoration: BoxDecoration(
            color: AppCultureColors.heritageJade,
            borderRadius: BorderRadius.circular(14),
            boxShadow: [
              BoxShadow(
                color: AppCultureColors.heritageJade.withValues(alpha: 0.30),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: busy ? null : onClaim,
              borderRadius: BorderRadius.circular(14),
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 9,
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (claiming) ...[
                      const SizedBox(
                        width: 14,
                        height: 14,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        appL10n.achClaiming,
                        style: TextStyle(
                          fontSize: 12.5,
                          fontWeight: FontWeight.w800,
                          color: Colors.white,
                        ),
                      ),
                    ] else ...[
                      const Icon(
                        Icons.card_giftcard_rounded,
                        size: 16,
                        color: Colors.white,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        appL10n.achClaim,
                        style: TextStyle(
                          fontSize: 12.5,
                          fontWeight: FontWeight.w800,
                          color: Colors.white,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
        ),
      );
    }

    if (isClaimed) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 6),
            decoration: BoxDecoration(
              color: AppCultureColors.jade50,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppCultureColors.jade200),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  Icons.check_circle_rounded,
                  size: 15,
                  color: AppCultureColors.success,
                ),
                SizedBox(width: 5),
                Text(
                  appL10n.achClaimed,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                    color: AppCultureColors.success,
                  ),
                ),
              ],
            ),
          ),
          if (item.claimedAt != null) ...[
            const SizedBox(height: 3),
            Text(
              formatDate(item.claimedAt),
              style: const TextStyle(
                fontSize: 10.5,
                color: AppCultureColors.textLight,
              ),
            ),
          ],
        ],
      );
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 7),
      decoration: BoxDecoration(
        color: AppCultureColors.surfaceSubtle,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppCultureColors.border),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(
            Icons.lock_rounded,
            size: 13,
            color: AppCultureColors.textMuted,
          ),
          const SizedBox(width: 5),
          Text(
            '${formatThousands(item.displayProgress)}/${formatThousands(item.safeTarget)}',
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: AppCultureColors.textMuted,
            ),
          ),
        ],
      ),
    );
  }
}

class _AchievementBadgeThumb extends StatelessWidget {
  final TouristAchievementModel item;
  final _TierStyle tier;

  const _AchievementBadgeThumb({required this.item, required this.tier});

  static const _greyscale = ColorFilter.matrix([
    0.2126, 0.7152, 0.0722, 0, 0,
    0.2126, 0.7152, 0.0722, 0, 0,
    0.2126, 0.7152, 0.0722, 0, 0,
    0, 0, 0, 0.6, 0,
  ]);

  @override
  Widget build(BuildContext context) {
    final locked = item.isLocked;
    final src = item.badgeIcon;
    final hasImage = src != null && src.startsWith('http');
    final fallbackIcon = Icon(
      tier.isLegendary
          ? Icons.workspace_premium_rounded
          : Icons.emoji_events_rounded,
      size: 28,
      color: locked ? AppCultureColors.textLight : tier.iconColor,
    );

    Widget content = hasImage
        ? Image.network(
            src,
            fit: BoxFit.cover,
            errorBuilder: (_, _, _) => Center(child: fallbackIcon),
          )
        : Center(child: fallbackIcon);

    if (locked && hasImage) {
      content = ColorFiltered(colorFilter: _greyscale, child: content);
    }

    return Column(
      children: [
        SizedBox(
          width: 64,
          height: 64,
          child: Stack(
            children: [
              Container(
                width: 64,
                height: 64,
                padding: const EdgeInsets.all(2),
                decoration: BoxDecoration(
                  gradient: locked
                      ? null
                      : LinearGradient(
                          colors: tier.ringGradient,
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                  color: locked ? AppCultureColors.surfaceSubtle : null,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: locked ? AppCultureColors.border : tier.ringBorder,
                    width: 1.5,
                  ),
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(13),
                  child: content,
                ),
              ),
              if (locked)
                Positioned(
                  right: 3,
                  bottom: 3,
                  child: Container(
                    width: 20,
                    height: 20,
                    decoration: BoxDecoration(
                      color: AppCultureColors.ink900.withValues(alpha: 0.85),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.lock_rounded,
                      size: 11,
                      color: Colors.white,
                    ),
                  ),
                ),
            ],
          ),
        ),
        const SizedBox(height: 5),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
          decoration: BoxDecoration(
            color: tier.pillBg,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: tier.pillBorder),
          ),
          child: Text(
            tier.label.toUpperCase(),
            style: TextStyle(
              fontSize: 9.5,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.4,
              color: tier.pillText,
            ),
          ),
        ),
      ],
    );
  }
}

/// Popup chúc mừng nhận thưởng thành tựu phong cách Genshin Impact × Di sản Việt Nam.
Future<void> showClaimRewardDialog(
  BuildContext context, {
  required ClaimAchievementResultModel result,
  required TouristAchievementModel achievement,
}) {
  return showGeneralDialog<void>(
    context: context,
    barrierDismissible: true,
    barrierLabel: appL10n.achClaimBarrier,
    barrierColor: AppCultureColors.textDark.withValues(alpha: 0.45),
    transitionDuration: const Duration(milliseconds: 260),
    transitionBuilder: (ctx, anim, _, child) {
      final curved = CurvedAnimation(parent: anim, curve: Curves.easeOutBack);
      return FadeTransition(
        opacity: anim,
        child: ScaleTransition(
          scale: Tween<double>(begin: 0.88, end: 1.0).animate(curved),
          child: child,
        ),
      );
    },
    pageBuilder: (ctx, _, _) => _ClaimRewardDialog(
      result: result,
      achievement: achievement,
    ),
  );
}

class _ClaimRewardDialog extends StatelessWidget {
  final ClaimAchievementResultModel result;
  final TouristAchievementModel achievement;

  const _ClaimRewardDialog({
    required this.result,
    required this.achievement,
  });

  @override
  Widget build(BuildContext context) {
    final title = result.achievementName.isNotEmpty
        ? result.achievementName
        : achievement.name;
    final badgeName = result.badgeName ?? achievement.badgeName;
    final badgeIcon = result.badgeIcon ?? achievement.badgeIcon;
    final pointsAwarded =
        result.pointsAwarded > 0 ? result.pointsAwarded : achievement.pointsReward;
    final hasImage = badgeIcon != null && badgeIcon.startsWith('http');

    const fallbackIcon = Icon(Icons.emoji_events_rounded, size: 42, color: AppCultureColors.brass800);

    // Bản sáng: nền trắng, dải vàng nhạt phía trên + hào quang đồng thau, chữ màu mực
    return SafeArea(
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 400),
            child: Material(
              color: Colors.transparent,
              child: Container(
                clipBehavior: Clip.antiAlias,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [AppCultureColors.brassTint, AppCultureColors.surface],
                    begin: Alignment.topCenter,
                    end: Alignment.center,
                  ),
                  borderRadius: BorderRadius.circular(28),
                  border: Border.all(color: AppTone.brass.soft, width: 1.5),
                  boxShadow: [
                    BoxShadow(
                      color: AppCultureColors.brass500.withValues(alpha: 0.25),
                      blurRadius: 40,
                      offset: const Offset(0, 14),
                    ),
                  ],
                ),
                child: Stack(
                  children: [
                    // Vầng hào quang trên đỉnh
                    Positioned(
                      top: -70,
                      left: 0,
                      right: 0,
                      child: Center(
                        child: Container(
                          width: 240,
                          height: 160,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: AppCultureColors.brass300.withValues(alpha: 0.25),
                          ),
                        ),
                      ),
                    ),
                    // Nút đóng góc phải
                    Positioned(
                      right: 14,
                      top: 14,
                      child: Material(
                        color: AppCultureColors.surface,
                        shape: const CircleBorder(side: BorderSide(color: AppCultureColors.border)),
                        child: InkWell(
                          customBorder: const CircleBorder(),
                          onTap: () => Navigator.of(context).pop(),
                          child: const Padding(
                            padding: EdgeInsets.all(8),
                            child: Icon(Icons.close_rounded, size: 18, color: AppCultureColors.textDark),
                          ),
                        ),
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.fromLTRB(24, 28, 24, 24),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          // Khung huy hiệu & mặt trống đồng xoay chậm
                          SizedBox(
                            width: 176,
                            height: 176,
                            child: Stack(
                              alignment: Alignment.center,
                              children: [
                                SlowSpin(
                                  period: const Duration(seconds: 28),
                                  child: DrumMotif(
                                    size: 176,
                                    color: AppCultureColors.brass500.withValues(alpha: 0.22),
                                  ),
                                ),
                                Container(
                                  width: 112,
                                  height: 112,
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    boxShadow: [
                                      BoxShadow(
                                        color: AppCultureColors.brass400.withValues(alpha: 0.45),
                                        blurRadius: 28,
                                        spreadRadius: 4,
                                      ),
                                    ],
                                  ),
                                ),
                                Container(
                                  width: 96,
                                  height: 96,
                                  padding: const EdgeInsets.all(3),
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    gradient: const LinearGradient(
                                      colors: [AppCultureColors.brass100, AppCultureColors.brass400],
                                      begin: Alignment.topLeft,
                                      end: Alignment.bottomRight,
                                    ),
                                    border: Border.all(color: AppCultureColors.surface, width: 3),
                                  ),
                                  child: ClipOval(
                                    child: hasImage
                                        ? Image.network(
                                            badgeIcon,
                                            fit: BoxFit.cover,
                                            errorBuilder: (_, _, _) => fallbackIcon,
                                          )
                                        : fallbackIcon,
                                  ),
                                ),
                                const Positioned(
                                  left: 20,
                                  top: 22,
                                  child: Icon(Icons.star_rounded, size: 18, color: AppCultureColors.brass500),
                                ),
                                const Positioned(
                                  right: 20,
                                  bottom: 24,
                                  child: Icon(Icons.auto_awesome_rounded, size: 20, color: AppCultureColors.coral),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 4),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Container(width: 22, height: 1.2, color: AppTone.brass.soft),
                              Padding(
                                padding: EdgeInsets.symmetric(horizontal: 8),
                                child: Text(
                                  appL10n.achUnlockedEyebrow,
                                  style: TextStyle(
                                    fontSize: 11.5,
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: 1.6,
                                    color: AppCultureColors.brass800,
                                  ),
                                ),
                              ),
                              Container(width: 22, height: 1.2, color: AppTone.brass.soft),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text(
                            title,
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                              fontSize: 21,
                              fontWeight: FontWeight.w800,
                              color: AppCultureColors.textDark,
                              height: 1.25,
                              letterSpacing: -0.2,
                            ),
                          ),
                          if (badgeName != null) ...[
                            const SizedBox(height: 10),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                              decoration: BoxDecoration(
                                color: AppCultureColors.coralTint,
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(color: AppTone.coral.soft),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(Icons.military_tech_rounded, size: 15, color: AppCultureColors.coralDark),
                                  const SizedBox(width: 5),
                                  Flexible(
                                    child: Text(
                                      appL10n.achBadgeName(badgeName),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(
                                        fontSize: 12.5,
                                        fontWeight: FontWeight.w700,
                                        color: AppCultureColors.coralDark,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                          const SizedBox(height: 18),
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: AppCultureColors.brassTint,
                              borderRadius: BorderRadius.circular(18),
                              border: Border.all(color: AppTone.brass.soft),
                            ),
                            child: Column(
                              children: [
                                Text(
                                  appL10n.achRewardEyebrow,
                                  style: TextStyle(
                                    fontSize: 11.5,
                                    fontWeight: FontWeight.w700,
                                    letterSpacing: 1.0,
                                    color: AppCultureColors.textMuted,
                                  ),
                                ),
                                const SizedBox(height: 6),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  crossAxisAlignment: CrossAxisAlignment.baseline,
                                  textBaseline: TextBaseline.alphabetic,
                                  children: [
                                    const Text(
                                      '+',
                                      style: TextStyle(fontSize: 26, fontWeight: FontWeight.w900, color: AppCultureColors.brass700),
                                    ),
                                    CountUpText(
                                      value: pointsAwarded,
                                      style: const TextStyle(
                                        fontSize: 28,
                                        fontWeight: FontWeight.w900,
                                        color: AppCultureColors.brass700,
                                      ),
                                    ),
                                    const SizedBox(width: 6),
                                    const Text(
                                      'Journey Points',
                                      style: TextStyle(
                                        fontSize: 13.5,
                                        fontWeight: FontWeight.w700,
                                        color: AppCultureColors.brass800,
                                      ),
                                    ),
                                  ],
                                ),
                                if (result.newPointBalance > 0) ...[
                                  const SizedBox(height: 6),
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      const Icon(Icons.check_circle_rounded, size: 15, color: AppCultureColors.success),
                                      const SizedBox(width: 5),
                                      Text(
                                        appL10n.achNewBalance(formatThousands(result.newPointBalance)),
                                        style: const TextStyle(
                                          fontSize: 12.5,
                                          fontWeight: FontWeight.w600,
                                          color: AppCultureColors.textMuted,
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ],
                            ),
                          ),
                          const SizedBox(height: 18),
                          SizedBox(
                            width: double.infinity,
                            child: FilledButton(
                              onPressed: () => Navigator.of(context).pop(),
                              style: FilledButton.styleFrom(
                                minimumSize: const Size.fromHeight(50),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                              ),
                              child: Text(
                                appL10n.achKeepExploring,
                                style: TextStyle(fontSize: 14.5, fontWeight: FontWeight.w800),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
