import 'dart:math' as math;

import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/models/gamification_model.dart';
import '../../core/services/gamification_service.dart';
import '../common/heritage_motion.dart';
import 'badges_screen.dart';
import 'rewards_widgets.dart';

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

const List<_AchievementCategoryMeta> _categories = [
  _AchievementCategoryMeta(
    key: 'TOUR',
    label: 'Hành trình khám phá',
    shortLabel: 'Hành trình',
    description: 'Chinh phục các chuyến đi & vùng đất mới',
    unit: 'tour',
    icon: Icons.explore_rounded,
  ),
  _AchievementCategoryMeta(
    key: 'CHECKIN',
    label: 'Dấu chân điểm đến',
    shortLabel: 'Check-in',
    description: 'Check-in GPS tại các tọa độ di sản',
    unit: 'điểm đến',
    icon: Icons.place_rounded,
  ),
  _AchievementCategoryMeta(
    key: 'CULTURE_QUIZ',
    label: 'Văn hóa & Tri thức',
    shortLabel: 'Văn hóa',
    description: 'Khám phá câu chuyện di sản & giải đố',
    unit: 'bài',
    icon: Icons.menu_book_rounded,
  ),
  _AchievementCategoryMeta(
    key: 'EXPERIENCE',
    label: 'Thử thách trải nghiệm',
    shortLabel: 'Trải nghiệm',
    description: 'Vượt qua nhiệm vụ thực tế tại điểm dừng',
    unit: 'nhiệm vụ',
    icon: Icons.auto_awesome_rounded,
  ),
  _AchievementCategoryMeta(
    key: 'STREAK_LOYALTY',
    label: 'Kiên định & Gắn bó',
    shortLabel: 'Gắn bó',
    description: 'Duy trì ngọn lửa đam mê cùng JourneyGo',
    unit: 'mốc',
    icon: Icons.local_fire_department_rounded,
  ),
];

final Map<String, _AchievementCategoryMeta> _categoryMap = {
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

const Map<String, _TierStyle> _tierStyles = {
  'BRONZE': _TierStyle(
    label: 'Đồng',
    pillBg: Color(0xFFFFF7ED),
    pillBorder: Color(0xFFFED7AA),
    pillText: Color(0xFF9A3412),
    ringGradient: [Color(0xFFFFF7ED), Color(0xFFFED7AA)],
    ringBorder: Color(0xFFFDBA74),
    iconColor: Color(0xFFC2410C),
  ),
  'SILVER': _TierStyle(
    label: 'Bạc',
    pillBg: Color(0xFFF1F5F9),
    pillBorder: Color(0xFFCBD5E1),
    pillText: Color(0xFF334155),
    ringGradient: [Color(0xFFF8FAFC), Color(0xFFE2E8F0)],
    ringBorder: Color(0xFFCBD5E1),
    iconColor: Color(0xFF475569),
  ),
  'GOLD': _TierStyle(
    label: 'Vàng',
    pillBg: Color(0xFFFFFBEB),
    pillBorder: Color(0xFFFCD34D),
    pillText: Color(0xFF92400E),
    ringGradient: [Color(0xFFFEF9C3), Color(0xFFFCD34D)],
    ringBorder: Color(0xFFFBBF24),
    iconColor: Color(0xFF78350F),
  ),
  'LEGENDARY': _TierStyle(
    label: 'Huyền thoại',
    pillBg: Color(0xFFFAF5FF),
    pillBorder: Color(0xFFD8B4FE),
    pillText: Color(0xFF581C87),
    ringGradient: [Color(0xFFF3E8FF), Color(0xFFFDE68A)],
    ringBorder: Color(0xFFFBBF24),
    iconColor: Color(0xFF6B21A8),
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
  if (item.code.contains('STREAK')) return 'ngày';
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
        'Thành tựu & Huy hiệu',
        actions: [
          IconButton(
            onPressed: _openBadges,
            tooltip: 'Bộ sưu tập huy hiệu',
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
              title: 'Không tải được thành tựu',
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
        label: 'Tất cả',
        count: stats.totalCount,
        dot: false,
      ),
      (
        filter: _AchievementFilter.unlocked,
        label: 'Đã mở khóa',
        count: stats.totalAchieved,
        dot: false,
      ),
      (
        filter: _AchievementFilter.claimable,
        label: 'Chờ nhận thưởng',
        count: stats.unclaimedCount,
        dot: stats.unclaimedCount > 0,
      ),
    ];

    Widget progressCard = _headerStatBox(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(
                Icons.emoji_events_rounded,
                size: 15,
                color: Color(0xFFFCD34D),
              ),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  'Thành tựu đã đạt',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: Colors.teal.shade50.withValues(alpha: 0.9),
                  ),
                ),
              ),
              Text(
                '${stats.overallPct}%',
                style: const TextStyle(
                  fontSize: 12.5,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFFFDE68A),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Text(
                '${stats.totalAchieved}',
                style: const TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w900,
                  color: Colors.white,
                  height: 1.05,
                ),
              ),
              Text(
                '/${stats.totalCount}',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: Colors.white.withValues(alpha: 0.72),
                ),
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
                minHeight: 6,
                backgroundColor: Colors.black.withValues(alpha: 0.28),
                valueColor: const AlwaysStoppedAnimation(Color(0xFFFBBF24)),
              ),
            ),
          ),
        ],
      ),
    );

    Widget pointsCard = _headerStatBox(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(
                Icons.auto_awesome_rounded,
                size: 15,
                color: Color(0xFFFCD34D),
              ),
              const SizedBox(width: 5),
              Expanded(
                child: Text(
                  'Điểm thành tựu',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w600,
                    color: Colors.teal.shade50.withValues(alpha: 0.9),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          RichText(
            text: TextSpan(
              children: [
                TextSpan(
                  text: '+${formatThousands(stats.totalPointsEarned)}',
                  style: const TextStyle(
                    fontSize: 21,
                    fontWeight: FontWeight.w900,
                    color: Color(0xFFFCD34D),
                    height: 1.1,
                  ),
                ),
                const TextSpan(
                  text: ' JP',
                  style: TextStyle(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFFFDE68A),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Đã nhận ${stats.totalClaimed} huy hiệu',
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 11,
              color: Colors.white.withValues(alpha: 0.72),
            ),
          ),
        ],
      ),
    );

    Widget claimableCard = _headerStatBox(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(
                Icons.card_giftcard_rounded,
                size: 15,
                color: Color(0xFFFCD34D),
              ),
              const SizedBox(width: 5),
              Expanded(
                child: Text(
                  'Chờ nhận thưởng',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w600,
                    color: Colors.teal.shade50.withValues(alpha: 0.9),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              Text(
                '${stats.unclaimedCount}',
                style: const TextStyle(
                  fontSize: 21,
                  fontWeight: FontWeight.w900,
                  color: Colors.white,
                  height: 1.1,
                ),
              ),
              const SizedBox(width: 6),
              if (stats.unclaimedCount > 0)
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 7,
                    vertical: 2,
                  ),
                  decoration: BoxDecoration(
                    color: const Color(0xFFE11D48),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: const Text(
                    'Chờ nhận',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                    ),
                  ),
                )
              else
                Flexible(
                  child: Text(
                    'Đã nhận hết',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: Colors.white.withValues(alpha: 0.75),
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            'Hoàn thành để mở khóa',
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 11,
              color: Colors.white.withValues(alpha: 0.72),
            ),
          ),
        ],
      ),
    );

    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF093B37), Color(0xFF0D5C55), Color(0xFF134E4A)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: const Color(0xFF115E59).withValues(alpha: 0.7),
        ),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF093B37).withValues(alpha: 0.25),
            blurRadius: 18,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Stack(
        children: [
          Positioned(
            right: -52,
            top: -54,
            child: IgnorePointer(
              child: SlowSpin(
                child: DrumMotif(
                  size: 195,
                  color: const Color(0xFFFCD34D).withValues(alpha: 0.11),
                ),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (wide)
                  Row(
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
                  Row(
                    children: [
                      Expanded(child: pointsCard),
                      const SizedBox(width: 10),
                      Expanded(child: claimableCard),
                    ],
                  ),
                ],
                const SizedBox(height: 14),
                Divider(
                  height: 1,
                  color: Colors.white.withValues(alpha: 0.14),
                ),
                const SizedBox(height: 12),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      for (final (i, pill) in filterPills.indexed) ...[
                        if (i > 0) const SizedBox(width: 8),
                        _buildFilterPill(
                          label: pill.label,
                          count: pill.count,
                          dot: pill.dot,
                          selected: _statusFilter == pill.filter,
                          onTap: () =>
                              setState(() => _statusFilter = pill.filter),
                        ),
                      ],
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

  Widget _headerStatBox({required Widget child}) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.11),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withValues(alpha: 0.16)),
      ),
      child: child,
    );
  }

  Widget _buildFilterPill({
    required String label,
    required int count,
    required bool dot,
    required bool selected,
    required VoidCallback onTap,
  }) {
    return Material(
      color: selected
          ? const Color(0xFFFBBF24)
          : Colors.white.withValues(alpha: 0.12),
      borderRadius: BorderRadius.circular(24),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(24),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (dot) ...[
                Container(
                  width: 7,
                  height: 7,
                  decoration: BoxDecoration(
                    color: const Color(0xFFE11D48),
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 1),
                  ),
                ),
                const SizedBox(width: 6),
              ],
              Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: selected ? const Color(0xFF0F172A) : Colors.white,
                ),
              ),
              const SizedBox(width: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                decoration: BoxDecoration(
                  color: selected
                      ? Colors.black.withValues(alpha: 0.14)
                      : Colors.black.withValues(alpha: 0.25),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  '$count',
                  style: TextStyle(
                    fontSize: 10.5,
                    fontWeight: FontWeight.w800,
                    color: selected
                        ? const Color(0xFF0F172A)
                        : const Color(0xFFCCFBF1),
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
        color: const Color(0xFFFFF1F2),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFFECDD3)),
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
                color: Color(0xFF881337),
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
            child: const Text(
              'Đóng',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMobileCategoryStrip(Map<String, _CategoryStat> byCategory) {
    return SizedBox(
      height: 76,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: _categories.length,
        separatorBuilder: (_, _) => const SizedBox(width: 8),
        itemBuilder: (_, index) {
          final cat = _categories[index];
          final st = byCategory[cat.key] ?? const _CategoryStat();
          final active = _selectedCategory == cat.key;
          return Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: () => setState(() => _selectedCategory = cat.key),
              borderRadius: BorderRadius.circular(18),
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 10,
                ),
                decoration: BoxDecoration(
                  gradient: active
                      ? const LinearGradient(
                          colors: [Color(0xFF0B5D56), Color(0xFF0F766E)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        )
                      : null,
                  color: active ? null : Colors.white,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(
                    color: active
                        ? const Color(0xFFFBBF24)
                        : AppCultureColors.border,
                    width: active ? 1.5 : 1,
                  ),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          cat.icon,
                          size: 16,
                          color: active
                              ? const Color(0xFFFCD34D)
                              : AppCultureColors.heritageJade,
                        ),
                        const SizedBox(width: 6),
                        Text(
                          cat.shortLabel,
                          style: TextStyle(
                            fontSize: 12.5,
                            fontWeight: FontWeight.w800,
                            color: active
                                ? Colors.white
                                : AppCultureColors.textDark,
                          ),
                        ),
                        if (st.claimable > 0) ...[
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 6,
                              vertical: 1,
                            ),
                            decoration: BoxDecoration(
                              color: const Color(0xFFE11D48),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Text(
                              '${st.claimable}',
                              style: const TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w800,
                                color: Colors.white,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${st.achieved}/${st.total} (${st.pct}%)',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: active
                                ? const Color(0xFFCCFBF1)
                                : AppCultureColors.textMuted,
                          ),
                        ),
                        const SizedBox(height: 4),
                        SizedBox(
                          width: 96,
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(4),
                            child: LinearProgressIndicator(
                              value: st.ratio,
                              minHeight: 3.5,
                              backgroundColor: active
                                  ? Colors.black.withValues(alpha: 0.25)
                                  : AppCultureColors.surfaceSubtle,
                              valueColor: AlwaysStoppedAnimation(
                                active
                                    ? const Color(0xFFFBBF24)
                                    : AppCultureColors.heritageJade,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          );
        },
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
            gradient: active
                ? const LinearGradient(
                    colors: [Color(0xFF0B5D56), Color(0xFF0F766E)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  )
                : null,
            color: active ? null : Colors.white,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(
              color: active
                  ? const Color(0xFFFBBF24)
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
                      color: active
                          ? Colors.white.withValues(alpha: 0.15)
                          : AppCultureColors.jadeLight,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      cat.icon,
                      size: 19,
                      color: active
                          ? const Color(0xFFFCD34D)
                          : AppCultureColors.heritageJade,
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
                            color: active
                                ? Colors.white
                                : AppCultureColors.textDark,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '${st.achieved}/${st.total} thành tựu • ${st.pct}%',
                          style: TextStyle(
                            fontSize: 11.5,
                            color: active
                                ? const Color(0xFFCCFBF1)
                                : AppCultureColors.textMuted,
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
                        color: const Color(0xFFE11D48),
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
                        backgroundColor: active
                            ? Colors.black.withValues(alpha: 0.25)
                            : AppCultureColors.surfaceSubtle,
                        valueColor: AlwaysStoppedAnimation(
                          active
                              ? const Color(0xFFFBBF24)
                              : AppCultureColors.heritageJade,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Icon(
                    Icons.chevron_right_rounded,
                    size: 16,
                    color: active
                        ? const Color(0xFFFCD34D)
                        : AppCultureColors.textLight,
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
          const Text(
            'Không có thành tựu nào khớp bộ lọc trong danh mục này',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: AppCultureColors.textDark,
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            'Thử chuyển sang bộ lọc "Tất cả" hoặc chọn danh mục khác để tiếp tục theo dõi tiến độ.',
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
              child: const Text(
                'Xem tất cả trong mục này',
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
        ? const Color(0xFFFCD34D)
        : isClaimed
            ? const Color(0xFFA7F3D0)
            : AppCultureColors.border;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        gradient: isClaimable
            ? const LinearGradient(
                colors: [Color(0xFFFFFBEB), Colors.white],
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
                  color: const Color(0xFFF59E0B).withValues(alpha: 0.16),
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
                              color: const Color(0xFFFEF3C7),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const Text(
                              'Sẵn sàng nhận',
                              style: TextStyle(
                                fontSize: 10.5,
                                fontWeight: FontWeight.w800,
                                color: Color(0xFF92400E),
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
                            'Tiến độ: ${formatThousands(item.displayProgress)}/${formatThousands(item.safeTarget)} $unit',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 11.5,
                              fontWeight: FontWeight.w700,
                              color: isClaimable
                                  ? const Color(0xFF92400E)
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
                              ? const Color(0xFFF59E0B)
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
                        color: const Color(0xFFFFFBEB),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: const Color(0xFFFDE68A)),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(
                            Icons.auto_awesome_rounded,
                            size: 13,
                            color: Color(0xFFD97706),
                          ),
                          const SizedBox(width: 4),
                          Text(
                            '+${formatThousands(item.pointsReward)} JP',
                            style: const TextStyle(
                              fontSize: 12.5,
                              fontWeight: FontWeight.w900,
                              color: Color(0xFFB45309),
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
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFFF59E0B), Color(0xFFEA580C)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(14),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFFF59E0B).withValues(alpha: 0.35),
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
                      const Text(
                        'Đang nhận...',
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
                      const Text(
                        'Nhận thưởng',
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
              color: const Color(0xFFECFDF5),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFA7F3D0)),
            ),
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  Icons.check_circle_rounded,
                  size: 15,
                  color: AppCultureColors.success,
                ),
                SizedBox(width: 5),
                Text(
                  'Đã nhận',
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
                      color: const Color(0xFF1E293B).withValues(alpha: 0.85),
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
    barrierLabel: 'Nhận thưởng thành tựu',
    barrierColor: const Color(0xCC020617),
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
                    colors: [
                      Color(0xFF093B37),
                      Color(0xFF0F524C),
                      Color(0xFF132A2E),
                    ],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(28),
                  border: Border.all(
                    color: const Color(0xFFFCD34D).withValues(alpha: 0.65),
                    width: 1.5,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFFFBBF24).withValues(alpha: 0.38),
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
                          width: 220,
                          height: 150,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: const Color(0xFFFCD34D).withValues(alpha: 0.2),
                          ),
                        ),
                      ),
                    ),
                    // Nút đóng góc phải
                    Positioned(
                      right: 14,
                      top: 14,
                      child: Material(
                        color: Colors.white.withValues(alpha: 0.12),
                        shape: const CircleBorder(),
                        child: InkWell(
                          customBorder: const CircleBorder(),
                          onTap: () => Navigator.of(context).pop(),
                          child: const Padding(
                            padding: EdgeInsets.all(8),
                            child: Icon(
                              Icons.close_rounded,
                              size: 18,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.fromLTRB(24, 28, 24, 24),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          // Khung huy hiệu & Mặt trống đồng xoay chậm
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
                                    color: const Color(0xFFFCD34D)
                                        .withValues(alpha: 0.28),
                                  ),
                                ),
                                Container(
                                  width: 112,
                                  height: 112,
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    boxShadow: [
                                      BoxShadow(
                                        color: const Color(0xFFFBBF24)
                                            .withValues(alpha: 0.55),
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
                                      colors: [
                                        Color(0xFFFEF3C7),
                                        Color(0xFFF59E0B),
                                      ],
                                      begin: Alignment.topLeft,
                                      end: Alignment.bottomRight,
                                    ),
                                    border: Border.all(
                                      color: const Color(0xFFFDE68A),
                                      width: 2.5,
                                    ),
                                  ),
                                  child: ClipOval(
                                    child: hasImage
                                        ? Image.network(
                                            badgeIcon,
                                            fit: BoxFit.cover,
                                            errorBuilder: (_, _, _) =>
                                                const Icon(
                                              Icons.emoji_events_rounded,
                                              size: 42,
                                              color: Color(0xFF451A03),
                                            ),
                                          )
                                        : const Icon(
                                            Icons.emoji_events_rounded,
                                            size: 42,
                                            color: Color(0xFF451A03),
                                          ),
                                  ),
                                ),
                                const Positioned(
                                  left: 20,
                                  top: 22,
                                  child: Icon(
                                    Icons.star_rounded,
                                    size: 16,
                                    color: Color(0xFFFDE68A),
                                  ),
                                ),
                                const Positioned(
                                  right: 20,
                                  bottom: 24,
                                  child: Icon(
                                    Icons.auto_awesome_rounded,
                                    size: 18,
                                    color: Color(0xFFFDE68A),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 4),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Container(
                                width: 22,
                                height: 1,
                                color: const Color(0xFFFCD34D)
                                    .withValues(alpha: 0.55),
                              ),
                              const Padding(
                                padding: EdgeInsets.symmetric(horizontal: 8),
                                child: Text(
                                  'THÀNH TỰU ĐẠT ĐƯỢC',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: 1.8,
                                    color: Color(0xFFFCD34D),
                                  ),
                                ),
                              ),
                              Container(
                                width: 22,
                                height: 1,
                                color: const Color(0xFFFCD34D)
                                    .withValues(alpha: 0.55),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text(
                            title,
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                              fontSize: 21,
                              fontWeight: FontWeight.w800,
                              color: Colors.white,
                              height: 1.25,
                            ),
                          ),
                          if (badgeName != null) ...[
                            const SizedBox(height: 10),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 12,
                                vertical: 5,
                              ),
                              decoration: BoxDecoration(
                                color: const Color(0xFFFBBF24)
                                    .withValues(alpha: 0.16),
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(
                                  color: const Color(0xFFFCD34D)
                                      .withValues(alpha: 0.45),
                                ),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(
                                    Icons.military_tech_rounded,
                                    size: 15,
                                    color: Color(0xFFFCD34D),
                                  ),
                                  const SizedBox(width: 5),
                                  Flexible(
                                    child: Text(
                                      'Huy hiệu: $badgeName',
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w700,
                                        color: Color(0xFFFEF3C7),
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
                              color: Colors.white.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(18),
                              border: Border.all(
                                color: Colors.white.withValues(alpha: 0.16),
                              ),
                            ),
                            child: Column(
                              children: [
                                Text(
                                  'PHẦN THƯỞNG VỪA NHẬN',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w700,
                                    letterSpacing: 1.0,
                                    color: Colors.teal.shade50
                                        .withValues(alpha: 0.8),
                                  ),
                                ),
                                const SizedBox(height: 6),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  crossAxisAlignment:
                                      CrossAxisAlignment.baseline,
                                  textBaseline: TextBaseline.alphabetic,
                                  children: [
                                    Text(
                                      '+${formatThousands(pointsAwarded)}',
                                      style: const TextStyle(
                                        fontSize: 28,
                                        fontWeight: FontWeight.w900,
                                        color: Color(0xFFFCD34D),
                                      ),
                                    ),
                                    const SizedBox(width: 6),
                                    const Text(
                                      'Journey Points',
                                      style: TextStyle(
                                        fontSize: 13.5,
                                        fontWeight: FontWeight.w700,
                                        color: Color(0xFFFDE68A),
                                      ),
                                    ),
                                  ],
                                ),
                                if (result.newPointBalance > 0) ...[
                                  const SizedBox(height: 6),
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      const Icon(
                                        Icons.check_circle_rounded,
                                        size: 14,
                                        color: Color(0xFF6EE7B7),
                                      ),
                                      const SizedBox(width: 5),
                                      Text(
                                        'Số dư hiện tại: ${formatThousands(result.newPointBalance)} JP',
                                        style: TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w600,
                                          color: Colors.white
                                              .withValues(alpha: 0.9),
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
                            child: Container(
                              decoration: BoxDecoration(
                                gradient: const LinearGradient(
                                  colors: [
                                    Color(0xFFFCD34D),
                                    Color(0xFFF59E0B),
                                  ],
                                ),
                                borderRadius: BorderRadius.circular(16),
                                boxShadow: [
                                  BoxShadow(
                                    color: const Color(0xFFF59E0B)
                                        .withValues(alpha: 0.3),
                                    blurRadius: 12,
                                    offset: const Offset(0, 4),
                                  ),
                                ],
                              ),
                              child: Material(
                                color: Colors.transparent,
                                child: InkWell(
                                  onTap: () => Navigator.of(context).pop(),
                                  borderRadius: BorderRadius.circular(16),
                                  child: const Padding(
                                    padding: EdgeInsets.symmetric(vertical: 14),
                                    child: Text(
                                      'Tuyệt vời! Tiếp tục khám phá',
                                      textAlign: TextAlign.center,
                                      style: TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w800,
                                        color: Color(0xFF0F172A),
                                      ),
                                    ),
                                  ),
                                ),
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
