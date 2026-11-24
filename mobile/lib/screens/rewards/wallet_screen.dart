import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/models/gamification_model.dart';
import '../../core/services/gamification_service.dart';
import '../common/bright.dart';
import '../common/heritage_motion.dart' show CountUpText;
import 'achievements_screen.dart';
import 'my_vouchers_screen.dart';
import 'rewards_widgets.dart';
import 'voucher_shop_screen.dart';
import '../../l10n/locale_controller.dart';

/// Ví điểm: số dư, tổng tích lũy / đã tiêu và lịch sử giao dịch điểm.
class WalletScreen extends StatefulWidget {
  const WalletScreen({super.key});

  @override
  State<WalletScreen> createState() => _WalletScreenState();
}

class _WalletScreenState extends State<WalletScreen> {
  static const int _pageSize = 20;

  final GamificationService _service = GamificationService();
  final ScrollController _scroll = ScrollController();

  UserPointModel? _points;
  final List<PointTransactionModel> _history = [];
  bool _loading = true;
  bool _loadingMore = false;
  bool _hasMore = true;
  String? _error;
  int _page = 0;

  @override
  void initState() {
    super.initState();
    _scroll.addListener(_onScroll);
    _load();
  }

  @override
  void dispose() {
    _scroll.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scroll.position.pixels >= _scroll.position.maxScrollExtent - 200) {
      _loadMore();
    }
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final results = await Future.wait([
        _service.getMyPoints(),
        _service.getPointHistory(page: 0, size: _pageSize),
      ]);
      if (!mounted) return;
      final firstPage = results[1] as List<PointTransactionModel>;
      setState(() {
        _points = results[0] as UserPointModel;
        _history
          ..clear()
          ..addAll(firstPage);
        _page = 0;
        _hasMore = firstPage.length >= _pageSize;
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

  Future<void> _loadMore() async {
    if (_loading || _loadingMore || !_hasMore) return;
    setState(() => _loadingMore = true);
    try {
      final next = await _service.getPointHistory(
        page: _page + 1,
        size: _pageSize,
      );
      if (!mounted) return;
      setState(() {
        _history.addAll(next);
        _page += 1;
        _hasMore = next.length >= _pageSize;
        _loadingMore = false;
      });
    } on GamificationException {
      if (!mounted) return;
      // Giữ danh sách hiện có, cho phép cuộn thử lại.
      setState(() => _loadingMore = false);
    }
  }

  Future<void> _openShop() async {
    await Navigator.of(
      context,
    ).push(MaterialPageRoute(builder: (_) => const VoucherShopScreen()));
    if (mounted) _load(); // số dư có thể đã thay đổi sau khi đổi voucher
  }

  void _openMyVouchers() {
    Navigator.of(
      context,
    ).push(MaterialPageRoute(builder: (_) => const MyVouchersScreen()));
  }

  Future<void> _openAchievements() async {
    await Navigator.of(
      context,
    ).push(MaterialPageRoute(builder: (_) => const AchievementsScreen()));
    if (mounted) _load(); // điểm có thể tăng sau khi nhận thưởng thành tựu
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppCultureColors.background,
      appBar: buildRewardsAppBar(context, appL10n.wTitle),
      body: RefreshIndicator(
        color: AppCultureColors.heritageJade,
        onRefresh: _load,
        child: _buildBody(),
      ),
    );
  }

  Widget _buildBody() {
    if (_loading) return const RewardsSkeletonList(count: 5);

    if (_error != null) {
      return ListView(
        children: [
          SizedBox(
            height: MediaQuery.of(context).size.height * 0.6,
            child: RewardsMessageView(
              icon: Icons.cloud_off_rounded,
              title: appL10n.wLoadFailed,
              message: _error,
              onRetry: _load,
            ),
          ),
        ],
      );
    }

    return ListView.builder(
      controller: _scroll,
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
      itemCount: _history.isEmpty ? 3 : _history.length + 3,
      itemBuilder: (context, index) {
        if (index == 0) return _buildBalanceCard();
        if (index == 1) return _buildActions();
        if (index == 2) return _buildHistoryHeader();
        if (_history.isEmpty) {
          return Padding(
            padding: EdgeInsets.only(top: 24),
            child: RewardsMessageView(
              icon: Icons.receipt_long_outlined,
              title: appL10n.wEmpty,
              message:
                  appL10n.wEmptyHint,
            ),
          );
        }
        final i = index - 3;
        if (i == _history.length) {
          return _loadingMore
              ? const Padding(
                  padding: EdgeInsets.symmetric(vertical: 16),
                  child: Center(
                    child: CircularProgressIndicator(strokeWidth: 2.4),
                  ),
                )
              : const SizedBox.shrink();
        }
        return PointTransactionTile(tx: _history[i]);
      },
    );
  }

  /// Thẻ số dư sáng (nhóm vàng = điểm): số lớn màu đồng thau đậm, hai ô tích lũy / đã tiêu.
  Widget _buildBalanceCard() {
    final p = _points;
    return BrightHeroCard(
      tone: AppTone.brass,
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            appL10n.wBalance,
            style: TextStyle(color: AppCultureColors.textMuted, fontSize: 13.5, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 8),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              const IconTile(icon: Icons.star_rounded, tone: AppTone.brass, size: 40),
              const SizedBox(width: 10),
              CountUpText(
                value: p?.currentBalance ?? 0,
                style: const TextStyle(
                  color: AppCultureColors.brass800,
                  fontSize: 38,
                  height: 1,
                  fontWeight: FontWeight.w800,
                  letterSpacing: -0.5,
                ),
              ),
              const SizedBox(width: 6),
              Padding(
                padding: EdgeInsets.only(bottom: 4),
                child: Text(
                  appL10n.wPointsUnit,
                  style: TextStyle(color: AppCultureColors.brass800, fontSize: 14, fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: StatTile(
                  icon: Icons.trending_up_rounded,
                  tone: AppTone.jade,
                  value: p?.lifetimeEarned ?? 0,
                  label: appL10n.pointsEarned,
                  compact: true,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: StatTile(
                  icon: Icons.shopping_bag_outlined,
                  tone: AppTone.coral,
                  value: p?.lifetimeSpent ?? 0,
                  label: appL10n.pointsSpent,
                  compact: true,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildActions() {
    Widget action(
      IconData icon,
      String label,
      VoidCallback onTap, {
      bool primary = false,
    }) {
      return Expanded(
        child: Material(
          color: primary ? AppCultureColors.heritageJade : Colors.white,
          borderRadius: BorderRadius.circular(16),
          child: InkWell(
            borderRadius: BorderRadius.circular(16),
            onTap: onTap,
            child: Container(
              padding: const EdgeInsets.symmetric(vertical: 14),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: primary
                      ? AppCultureColors.heritageJade
                      : AppCultureColors.border,
                ),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    icon,
                    size: 19,
                    color: primary
                        ? Colors.white
                        : AppCultureColors.heritageJade,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    label,
                    style: TextStyle(
                      fontSize: 13.5,
                      fontWeight: FontWeight.w700,
                      color: primary ? Colors.white : AppCultureColors.textDark,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.only(top: 14),
      child: Column(
        children: [
          Row(
            children: [
              action(
                Icons.confirmation_number_outlined,
                appL10n.wRedeem,
                _openShop,
                primary: true,
              ),
              const SizedBox(width: 10),
              action(
                Icons.local_activity_outlined,
                appL10n.mvTitle,
                _openMyVouchers,
              ),
            ],
          ),
          const SizedBox(height: 10),
          Material(
            color: AppCultureColors.rewardBg,
            borderRadius: BorderRadius.circular(16),
            child: InkWell(
              borderRadius: BorderRadius.circular(16),
              onTap: _openAchievements,
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 12,
                ),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppCultureColors.rewardBorder),
                ),
                child: Row(
                  children: [
                    Icon(
                      Icons.emoji_events_rounded,
                      size: 20,
                      color: AppCultureColors.amberDark,
                    ),
                    SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            appL10n.achTitle,
                            style: TextStyle(
                              fontSize: 13.5,
                              fontWeight: FontWeight.w700,
                              color: AppCultureColors.rewardText,
                            ),
                          ),
                          SizedBox(height: 2),
                          Text(
                            appL10n.wMilestoneHint,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 11.5,
                              color: AppCultureColors.textMuted,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Icon(
                      Icons.chevron_right_rounded,
                      size: 20,
                      color: AppCultureColors.amberDark,
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

  Widget _buildHistoryHeader() {
    return Padding(
      padding: EdgeInsets.only(top: 24, bottom: 10),
      child: Text(
        appL10n.wHistory,
        style: TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.2,
          color: AppCultureColors.textDark,
        ),
      ),
    );
  }
}
