import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/models/gamification_model.dart';
import '../../core/services/gamification_service.dart';
import 'my_vouchers_screen.dart';
import 'rewards_widgets.dart';
import '../../l10n/locale_controller.dart';

/// Cửa hàng đổi thưởng: dùng điểm đổi lấy voucher giảm giá.
class VoucherShopScreen extends StatefulWidget {
  const VoucherShopScreen({super.key});

  @override
  State<VoucherShopScreen> createState() => _VoucherShopScreenState();
}

class _VoucherShopScreenState extends State<VoucherShopScreen> {
  final GamificationService _service = GamificationService();

  List<VoucherModel> _vouchers = [];
  int? _balance; // null khi chưa tải được số dư; server vẫn kiểm tra khi đổi
  bool _loading = true;
  String? _error;
  int? _redeemingId;

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
      final vouchers = await _service.getVouchers();
      int? balance;
      try {
        balance = (await _service.getMyPoints()).currentBalance;
      } on GamificationException {
        balance = null;
      }
      if (!mounted) return;
      setState(() {
        _vouchers = vouchers;
        _balance = balance;
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

  Future<void> _confirmRedeem(VoucherModel voucher) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
        title: Text(
          appL10n.vsConfirmTitle,
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
        ),
        content: Text(
          appL10n.vsConfirmMessage(formatThousands(voucher.pointsRequired), voucher.title),
          style: const TextStyle(fontSize: 13.5, height: 1.45),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: Text(appL10n.commonCancel),
          ),
          FilledButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: FilledButton.styleFrom(backgroundColor: AppCultureColors.heritageJade),
            child: Text(appL10n.vsRedeemNow),
          ),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    await _redeem(voucher);
  }

  Future<void> _redeem(VoucherModel voucher) async {
    setState(() => _redeemingId = voucher.id);
    try {
      final result = await _service.redeemVoucher(voucher.id);
      if (!mounted) return;
      await _load();
      if (!mounted) return;
      await showCopyableCodeDialog(
        context,
        title: appL10n.vsSuccessTitle,
        subtitle: appL10n.vsSuccessSubtitle,
        code: result.userVoucherCode,
      );
    } on GamificationException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.message), behavior: SnackBarBehavior.floating),
      );
      // Số lượng hoặc số dư có thể đã đổi, đồng bộ lại danh sách.
      await _load();
    } finally {
      if (mounted) setState(() => _redeemingId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppCultureColors.background,
      appBar: buildRewardsAppBar(
        context,
        'Voucher',
        actions: [
          IconButton(
            tooltip: appL10n.mvTitle,
            icon: const Icon(Icons.local_activity_outlined, color: AppCultureColors.textDark),
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const MyVouchersScreen()),
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
    if (_loading) return const RewardsSkeletonList(count: 4, itemHeight: 150);

    if (_error != null) {
      return ListView(
        children: [
          SizedBox(
            height: MediaQuery.of(context).size.height * 0.6,
            child: RewardsMessageView(
              icon: Icons.cloud_off_rounded,
              title: appL10n.vsLoadFailed,
              message: _error,
              onRetry: _load,
            ),
          ),
        ],
      );
    }

    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 24),
      children: [
        _buildBalanceStrip(),
        const SizedBox(height: 16),
        if (_vouchers.isEmpty)
          Padding(
            padding: EdgeInsets.only(top: 40),
            child: RewardsMessageView(
              icon: Icons.card_giftcard_outlined,
              title: appL10n.vsEmpty,
              message: appL10n.vsEmptyHint,
            ),
          )
        else
          ..._vouchers.map(_buildVoucherCard),
      ],
    );
  }

  Widget _buildBalanceStrip() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: AppCultureColors.rewardBg,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppCultureColors.rewardBorder),
      ),
      child: Row(
        children: [
          const Icon(Icons.star_rounded, color: AppCultureColors.gold, size: 26),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              appL10n.vsYourPoints,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: AppCultureColors.rewardText,
              ),
            ),
          ),
          Text(
            _balance == null ? '—' : formatThousands(_balance!),
            style: const TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w700,
              color: AppCultureColors.amberDark,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildVoucherCard(VoucherModel v) {
    final blockedReason = v.unavailableReason;
    final notEnoughPoints = _balance != null && _balance! < v.pointsRequired;
    final enabled = blockedReason == null && !notEnoughPoints && _redeemingId == null;
    final isRedeeming = _redeemingId == v.id;
    final missing = notEnoughPoints ? v.pointsRequired - _balance! : 0;

    final conditions = <String>[
      if (v.minOrderAmount != null && v.minOrderAmount! > 0)
        appL10n.vsMinOrder(appL10n.priceVnd(formatThousands(v.minOrderAmount!))),
      if (v.maxDiscountAmount != null && v.maxDiscountAmount! > 0)
        appL10n.vsMaxDiscount(appL10n.priceVnd(formatThousands(v.maxDiscountAmount!))),
      appL10n.vsValidDays(v.validDays),
    ];

    return Opacity(
      opacity: blockedReason != null ? 0.6 : 1,
      child: Container(
        margin: const EdgeInsets.only(bottom: 14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppCultureColors.border),
        ),
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 74,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    decoration: BoxDecoration(
                      color: AppCultureColors.jadeLight,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Column(
                      children: [
                        const Icon(Icons.local_offer_rounded,
                            color: AppCultureColors.heritageJade, size: 20),
                        const SizedBox(height: 6),
                        Text(
                          v.discountLabel,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                            color: AppCultureColors.jadeDark,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          v.title,
                          style: const TextStyle(
                            fontSize: 14.5,
                            fontWeight: FontWeight.w700,
                            height: 1.3,
                            color: AppCultureColors.textDark,
                          ),
                        ),
                        if (v.description.isNotEmpty) ...[
                          const SizedBox(height: 4),
                          Text(
                            v.description,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 12,
                              height: 1.4,
                              color: AppCultureColors.textMuted,
                            ),
                          ),
                        ],
                        const SizedBox(height: 8),
                        Text(
                          conditions.join(' • '),
                          style: const TextStyle(
                            fontSize: 11.5,
                            color: AppCultureColors.textLight,
                          ),
                        ),
                        if (v.endDate != null) ...[
                          const SizedBox(height: 2),
                          Text(
                            appL10n.vsRedeemUntil(formatDate(v.endDate)),
                            style: const TextStyle(
                              fontSize: 11.5,
                              color: AppCultureColors.textLight,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const Divider(height: 1, color: AppCultureColors.borderLight),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 10, 12, 12),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.star_rounded,
                                color: AppCultureColors.gold, size: 18),
                            const SizedBox(width: 4),
                            Text(
                              appL10n.vsPoints(formatThousands(v.pointsRequired)),
                              style: const TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w700,
                                color: AppCultureColors.amberDark,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 2),
                        Text(
                          blockedReason ??
                              (notEnoughPoints
                                  ? appL10n.vsNeedMore(formatThousands(missing))
                                  : appL10n.vsRemaining(v.remainingQuantity)),
                          style: TextStyle(
                            fontSize: 11.5,
                            color: (blockedReason != null || notEnoughPoints)
                                ? AppCultureColors.error
                                : AppCultureColors.textMuted,
                          ),
                        ),
                      ],
                    ),
                  ),
                  FilledButton(
                    onPressed: enabled ? () => _confirmRedeem(v) : null,
                    style: FilledButton.styleFrom(
                      backgroundColor: AppCultureColors.heritageJade,
                      disabledBackgroundColor: AppCultureColors.surfaceSubtle,
                      minimumSize: const Size(96, 44),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    child: isRedeeming
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                              strokeWidth: 2.2,
                              color: Colors.white,
                            ),
                          )
                        : Text(appL10n.vsRedeem, style: const TextStyle(fontWeight: FontWeight.w700)),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
