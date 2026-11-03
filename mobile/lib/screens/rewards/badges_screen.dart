import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/models/gamification_model.dart';
import '../../core/services/gamification_service.dart';
import 'rewards_widgets.dart';

/// Bộ sưu tập huy hiệu: mọi huy hiệu đang mở trong hệ thống, đánh dấu cái đã đạt kèm ngày nhận.
class BadgesScreen extends StatefulWidget {
  const BadgesScreen({super.key});

  @override
  State<BadgesScreen> createState() => _BadgesScreenState();
}

typedef _BadgeEntry = ({BadgeModel badge, DateTime? earnedAt, bool earned});

class _BadgesScreenState extends State<BadgesScreen> {
  final GamificationService _service = GamificationService();

  List<_BadgeEntry> _entries = [];
  bool _loading = true;
  String? _error;

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
      final results = await Future.wait([
        _service.getAllBadges(),
        _service.getMyBadges(),
      ]);
      if (!mounted) return;
      final catalog = results[0] as List<BadgeModel>;
      final mine = results[1] as List<UserBadgeModel>;
      final earnedById = {for (final b in mine) b.id: b};

      final entries = <_BadgeEntry>[
        for (final b in catalog)
          (
            badge: b,
            earnedAt: earnedById[b.id]?.earnedAt,
            earned: earnedById.containsKey(b.id),
          ),
        // Huy hiệu đã nhận nhưng nay không còn trong danh mục (bị tắt) vẫn thuộc về người dùng
        for (final m in mine.where((m) => !catalog.any((b) => b.id == m.id)))
          (
            badge: BadgeModel(
              id: m.id,
              name: m.name,
              description: m.description,
              iconUrl: m.iconUrl,
              badgeType: m.badgeType,
              bonusPoints: 0,
            ),
            earnedAt: m.earnedAt,
            earned: true,
          ),
      ];
      // Đã đạt lên trước (mới nhất trước), chưa đạt xếp sau
      entries.sort((a, b) {
        if (a.earned != b.earned) return a.earned ? -1 : 1;
        if (a.earned) {
          return (b.earnedAt ?? DateTime(0)).compareTo(
            a.earnedAt ?? DateTime(0),
          );
        }
        return a.badge.name.compareTo(b.badge.name);
      });

      setState(() {
        _entries = entries;
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppCultureColors.background,
      appBar: buildRewardsAppBar(context, 'Bộ sưu tập huy hiệu'),
      body: RefreshIndicator(
        color: AppCultureColors.heritageJade,
        onRefresh: _load,
        child: _buildBody(),
      ),
    );
  }

  Widget _buildBody() {
    if (_loading) return const RewardsSkeletonList(count: 4);

    if (_error != null || _entries.isEmpty) {
      return ListView(
        children: [
          SizedBox(
            height: MediaQuery.of(context).size.height * 0.6,
            child: _error != null
                ? RewardsMessageView(
                    icon: Icons.cloud_off_rounded,
                    title: 'Không tải được huy hiệu',
                    message: _error,
                    onRetry: _load,
                  )
                : const RewardsMessageView(
                    icon: Icons.workspace_premium_outlined,
                    title: 'Chưa có huy hiệu nào',
                    message:
                        'Check-in tại các điểm di sản để mở khóa huy hiệu đầu tiên.',
                  ),
          ),
        ],
      );
    }

    final earnedCount = _entries.where((e) => e.earned).length;
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
      children: [
        _buildSummary(earnedCount),
        const SizedBox(height: 16),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: _entries.length,
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 3,
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: 0.72,
          ),
          itemBuilder: (_, i) => _buildBadgeCell(_entries[i]),
        ),
      ],
    );
  }

  Widget _buildSummary(int earnedCount) {
    final total = _entries.length;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppCultureColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Đã mở khóa',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: AppCultureColors.textMuted,
                ),
              ),
              Text(
                '$earnedCount / $total huy hiệu',
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: AppCultureColors.textDark,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: LinearProgressIndicator(
              value: total == 0 ? 0 : earnedCount / total,
              minHeight: 8,
              backgroundColor: AppCultureColors.surfaceSubtle,
              color: AppCultureColors.gold,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBadgeCell(_BadgeEntry entry) {
    final badge = entry.badge;
    return InkWell(
      onTap: () => _showDetail(entry),
      borderRadius: BorderRadius.circular(18),
      child: Container(
        padding: const EdgeInsets.fromLTRB(8, 12, 8, 8),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: entry.earned
                ? AppCultureColors.rewardBorder
                : AppCultureColors.border,
          ),
        ),
        child: Column(
          children: [
            BadgeIcon(iconUrl: badge.iconUrl, earned: entry.earned, size: 56),
            const SizedBox(height: 8),
            Text(
              badge.name,
              textAlign: TextAlign.center,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 11.5,
                fontWeight: FontWeight.w700,
                color: entry.earned
                    ? AppCultureColors.textDark
                    : AppCultureColors.textMuted,
              ),
            ),
            const Spacer(),
            Text(
              entry.earned ? formatDate(entry.earnedAt) : 'Chưa mở khóa',
              style: TextStyle(
                fontSize: 10.5,
                fontWeight: FontWeight.w600,
                color: entry.earned
                    ? AppCultureColors.jadeDark
                    : AppCultureColors.textLight,
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showDetail(_BadgeEntry entry) {
    final badge = entry.badge;
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 24, 24, 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              BadgeIcon(iconUrl: badge.iconUrl, earned: entry.earned, size: 84),
              const SizedBox(height: 14),
              Text(
                badge.name,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w700,
                  color: AppCultureColors.textDark,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                badgeTypeLabel(badge.badgeType),
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: AppCultureColors.textMuted,
                ),
              ),
              if (badge.description.isNotEmpty) ...[
                const SizedBox(height: 12),
                Text(
                  badge.description,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 13,
                    color: AppCultureColors.textDark,
                    height: 1.4,
                  ),
                ),
              ],
              const SizedBox(height: 16),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                alignment: WrapAlignment.center,
                children: [
                  _chip(
                    entry.earned
                        ? 'Nhận ngày ${formatDate(entry.earnedAt)}'
                        : 'Chưa mở khóa',
                    entry.earned
                        ? AppCultureColors.jadeLight
                        : AppCultureColors.surfaceSubtle,
                    entry.earned
                        ? AppCultureColors.jadeDark
                        : AppCultureColors.textMuted,
                  ),
                  if (badge.bonusPoints > 0)
                    _chip(
                      '+${formatThousands(badge.bonusPoints)} điểm thưởng',
                      AppCultureColors.rewardBg,
                      AppCultureColors.rewardText,
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _chip(String text, Color bg, Color fg) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
    decoration: BoxDecoration(
      color: bg,
      borderRadius: BorderRadius.circular(10),
    ),
    child: Text(
      text,
      style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: fg),
    ),
  );
}
