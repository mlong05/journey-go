import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/constants/app_colors.dart';
import '../../core/models/gamification_model.dart';
import '../../core/services/gamification_service.dart';
import 'rewards_widgets.dart';

/// Kho voucher của tôi, chia 3 tab: còn dùng, đã dùng, hết hạn.
class MyVouchersScreen extends StatefulWidget {
  const MyVouchersScreen({super.key});

  @override
  State<MyVouchersScreen> createState() => _MyVouchersScreenState();
}

class _MyVouchersScreenState extends State<MyVouchersScreen> {
  final GamificationService _service = GamificationService();

  List<UserVoucherModel> _all = [];
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
      final list = await _service.getMyVouchers();
      if (!mounted) return;
      setState(() {
        _all = list;
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

  Future<void> _copy(String code) async {
    await Clipboard.setData(ClipboardData(text: code));
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Đã sao chép mã voucher'),
        behavior: SnackBarBehavior.floating,
        duration: Duration(seconds: 2),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final usable = _all.where((v) => v.isUsable).toList();
    final used = _all.where((v) => v.isUsed).toList();
    final expired = _all.where((v) => !v.isUsable && !v.isUsed).toList();

    return DefaultTabController(
      length: 3,
      child: Scaffold(
        backgroundColor: AppCultureColors.background,
        appBar: AppBar(
          backgroundColor: Colors.white,
          elevation: 0,
          centerTitle: true,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_ios_new_rounded,
                size: 18, color: AppCultureColors.textDark),
            onPressed: () => Navigator.of(context).maybePop(),
            tooltip: 'Quay lại',
          ),
          title: const Text(
            'Voucher của tôi',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w800,
              color: AppCultureColors.textDark,
            ),
          ),
          bottom: TabBar(
            labelColor: AppCultureColors.heritageJade,
            unselectedLabelColor: AppCultureColors.textMuted,
            indicatorColor: AppCultureColors.heritageJade,
            labelStyle: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13),
            tabs: [
              Tab(text: 'Còn dùng (${usable.length})'),
              Tab(text: 'Đã dùng (${used.length})'),
              Tab(text: 'Hết hạn (${expired.length})'),
            ],
          ),
        ),
        body: _loading
            ? const RewardsSkeletonList(count: 4, itemHeight: 110)
            : _error != null
                ? RewardsMessageView(
                    icon: Icons.cloud_off_rounded,
                    title: 'Không tải được kho voucher',
                    message: _error,
                    onRetry: _load,
                  )
                : TabBarView(
                    children: [
                      _buildList(
                        usable,
                        emptyTitle: 'Chưa có voucher nào',
                        emptyMessage: 'Dùng điểm tích lũy để đổi voucher tại mục Đổi thưởng.',
                      ),
                      _buildList(
                        used,
                        emptyTitle: 'Chưa dùng voucher nào',
                        emptyMessage: 'Voucher bạn đã dùng sẽ hiển thị tại đây.',
                      ),
                      _buildList(
                        expired,
                        emptyTitle: 'Không có voucher hết hạn',
                        emptyMessage: 'Hãy dùng voucher trước ngày hết hạn nhé.',
                      ),
                    ],
                  ),
      ),
    );
  }

  Widget _buildList(
    List<UserVoucherModel> items, {
    required String emptyTitle,
    required String emptyMessage,
  }) {
    return RefreshIndicator(
      color: AppCultureColors.heritageJade,
      onRefresh: _load,
      child: items.isEmpty
          ? ListView(
              children: [
                SizedBox(
                  height: MediaQuery.of(context).size.height * 0.5,
                  child: RewardsMessageView(
                    icon: Icons.local_activity_outlined,
                    title: emptyTitle,
                    message: emptyMessage,
                  ),
                ),
              ],
            )
          : ListView.builder(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              itemCount: items.length,
              itemBuilder: (_, i) => _buildCard(items[i]),
            ),
    );
  }

  Widget _buildCard(UserVoucherModel v) {
    final usable = v.isUsable;
    final Color accent = usable
        ? AppCultureColors.heritageJade
        : (v.isUsed ? AppCultureColors.info : AppCultureColors.textLight);
    final String statusText = usable ? 'Còn dùng' : (v.isUsed ? 'Đã dùng' : 'Hết hạn');

    final String dateLine = v.isUsed
        ? 'Đã dùng ${formatDate(v.usedAt)}'
        : (v.expiryDate != null
            ? '${v.isExpired ? 'Hết hạn' : 'Hạn dùng đến'} ${formatDate(v.expiryDate)}'
            : '');

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
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
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(
                  v.voucherTitle,
                  style: TextStyle(
                    fontSize: 14.5,
                    fontWeight: FontWeight.w800,
                    height: 1.3,
                    color: usable ? AppCultureColors.textDark : AppCultureColors.textMuted,
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                decoration: BoxDecoration(
                  color: accent.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  statusText,
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: accent),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.fromLTRB(14, 6, 6, 6),
            decoration: BoxDecoration(
              color: usable ? AppCultureColors.jadeLight : AppCultureColors.surfaceSubtle,
              borderRadius: BorderRadius.circular(14),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    v.userVoucherCode,
                    style: TextStyle(
                      fontFamily: 'monospace',
                      fontSize: 14,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.5,
                      color: usable ? AppCultureColors.jadeDark : AppCultureColors.textMuted,
                      decoration: usable ? null : TextDecoration.lineThrough,
                    ),
                  ),
                ),
                IconButton(
                  tooltip: 'Sao chép mã',
                  onPressed: usable ? () => _copy(v.userVoucherCode) : null,
                  icon: const Icon(Icons.copy_rounded, size: 18),
                  color: AppCultureColors.heritageJade,
                  constraints: const BoxConstraints(minWidth: 44, minHeight: 44),
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: Text(
                  dateLine,
                  style: const TextStyle(fontSize: 12, color: AppCultureColors.textMuted),
                ),
              ),
              Text(
                'Đã đổi ${formatThousands(v.pointsSpent)} điểm',
                style: const TextStyle(fontSize: 12, color: AppCultureColors.textLight),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
