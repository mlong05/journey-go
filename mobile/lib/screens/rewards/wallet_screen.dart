import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/models/gamification_model.dart';
import '../../core/services/gamification_service.dart';
import 'my_vouchers_screen.dart';
import 'rewards_widgets.dart';
import 'voucher_shop_screen.dart';

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
      final next = await _service.getPointHistory(page: _page + 1, size: _pageSize);
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
    await Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const VoucherShopScreen()),
    );
    if (mounted) _load(); // số dư có thể đã thay đổi sau khi đổi voucher
  }

  void _openMyVouchers() {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const MyVouchersScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppCultureColors.background,
      appBar: buildRewardsAppBar(context, 'Ví điểm'),
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
              title: 'Không tải được ví điểm',
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
          return const Padding(
            padding: EdgeInsets.only(top: 24),
            child: RewardsMessageView(
              icon: Icons.receipt_long_outlined,
              title: 'Chưa có giao dịch điểm',
              message: 'Check-in điểm đến và hoàn thành nhiệm vụ để bắt đầu tích điểm.',
            ),
          );
        }
        final i = index - 3;
        if (i == _history.length) {
          return _loadingMore
              ? const Padding(
                  padding: EdgeInsets.symmetric(vertical: 16),
                  child: Center(child: CircularProgressIndicator(strokeWidth: 2.4)),
                )
              : const SizedBox.shrink();
        }
        return _buildTransactionTile(_history[i]);
      },
    );
  }

  Widget _buildBalanceCard() {
    final p = _points;
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [AppCultureColors.jadeGradientStart, AppCultureColors.jadeGradientEnd],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: AppCultureColors.heritageJade.withValues(alpha: 0.28),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Số dư hiện tại',
            style: TextStyle(color: Colors.white70, fontSize: 13, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 6),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              const Icon(Icons.star_rounded, color: Colors.amberAccent, size: 30),
              const SizedBox(width: 6),
              Text(
                formatThousands(p?.currentBalance ?? 0),
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 38,
                  height: 1,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(width: 6),
              const Padding(
                padding: EdgeInsets.only(bottom: 4),
                child: Text('điểm', style: TextStyle(color: Colors.white70, fontSize: 14)),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.18),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Row(
              children: [
                Expanded(child: _statCell('Đã tích lũy', p?.lifetimeEarned ?? 0)),
                Container(width: 1, height: 28, color: Colors.white24),
                Expanded(child: _statCell('Đã tiêu', p?.lifetimeSpent ?? 0)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _statCell(String label, int value) {
    return Column(
      children: [
        Text(
          formatThousands(value),
          style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 2),
        Text(label, style: const TextStyle(color: Colors.white70, fontSize: 11.5)),
      ],
    );
  }

  Widget _buildActions() {
    Widget action(IconData icon, String label, VoidCallback onTap, {bool primary = false}) {
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
                  color: primary ? AppCultureColors.heritageJade : AppCultureColors.border,
                ),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(icon, size: 19, color: primary ? Colors.white : AppCultureColors.heritageJade),
                  const SizedBox(width: 8),
                  Text(
                    label,
                    style: TextStyle(
                      fontSize: 13.5,
                      fontWeight: FontWeight.w800,
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
      child: Row(
        children: [
          action(Icons.card_giftcard_rounded, 'Đổi thưởng', _openShop, primary: true),
          const SizedBox(width: 10),
          action(Icons.local_activity_outlined, 'Voucher của tôi', _openMyVouchers),
        ],
      ),
    );
  }

  Widget _buildHistoryHeader() {
    return const Padding(
      padding: EdgeInsets.only(top: 24, bottom: 10),
      child: Text(
        'LỊCH SỬ ĐIỂM',
        style: TextStyle(
          fontSize: 13,
          fontWeight: FontWeight.w800,
          letterSpacing: 0.8,
          color: AppCultureColors.textDark,
        ),
      ),
    );
  }

  Widget _buildTransactionTile(PointTransactionModel tx) {
    final earning = tx.isEarning;
    final color = earning ? AppCultureColors.success : AppCultureColors.error;
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
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
              color: color.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              earning ? Icons.add_rounded : Icons.remove_rounded,
              color: color,
              size: 22,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  tx.description.isNotEmpty ? tx.description : tx.typeLabel,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 13.5,
                    fontWeight: FontWeight.w700,
                    color: AppCultureColors.textDark,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  '${tx.typeLabel} • ${formatDateTime(tx.createdAt)}',
                  style: const TextStyle(fontSize: 11.5, color: AppCultureColors.textMuted),
                ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '${earning ? '+' : '-'}${formatThousands(tx.amount.abs())}',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: color),
              ),
              const SizedBox(height: 2),
              Text(
                'Còn ${formatThousands(tx.balanceAfter)}',
                style: const TextStyle(fontSize: 11, color: AppCultureColors.textLight),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
