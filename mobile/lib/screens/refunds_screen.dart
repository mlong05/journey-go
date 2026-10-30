import 'package:flutter/material.dart';
import '../core/constants/app_colors.dart';
import '../core/models/gamification_model.dart'
    show formatDateTime, formatThousands;
import '../core/models/refund_model.dart';
import '../core/services/api_client.dart';
import '../core/services/refund_service.dart';
import 'rewards/rewards_widgets.dart';

/// Danh sách yêu cầu hoàn tiền của du khách và trạng thái xử lý.
class RefundsScreen extends StatefulWidget {
  const RefundsScreen({super.key});

  @override
  State<RefundsScreen> createState() => _RefundsScreenState();
}

class _RefundsScreenState extends State<RefundsScreen> {
  final RefundService _service = RefundService();

  List<RefundModel> _refunds = [];
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
      final list = await _service.getMine();
      if (!mounted) return;
      setState(() {
        _refunds = list;
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppCultureColors.background,
      appBar: buildRewardsAppBar(context, 'Hỗ trợ & Hoàn tiền'),
      body: RefreshIndicator(
        color: AppCultureColors.heritageJade,
        onRefresh: _load,
        child: _buildBody(),
      ),
    );
  }

  Widget _buildBody() {
    if (_loading) return const RewardsSkeletonList(count: 4);

    if (_error != null || _refunds.isEmpty) {
      return ListView(
        children: [
          SizedBox(
            height: MediaQuery.of(context).size.height * 0.6,
            child: _error != null
                ? RewardsMessageView(
                    icon: Icons.cloud_off_rounded,
                    title: 'Không tải được yêu cầu hoàn tiền',
                    message: _error,
                    onRetry: _load,
                  )
                : const RewardsMessageView(
                    icon: Icons.receipt_long_outlined,
                    title: 'Chưa có yêu cầu hoàn tiền',
                    message:
                        'Các yêu cầu hoàn tiền vé của bạn và tiến độ xử lý sẽ hiển thị tại đây.',
                  ),
          ),
        ],
      );
    }

    return ListView.builder(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
      itemCount: _refunds.length,
      itemBuilder: (_, i) => _buildRefundCard(_refunds[i]),
    );
  }

  ({Color bg, Color fg}) _statusColors(RefundModel r) {
    if (r.status == 'REFUNDED')
      return (bg: AppCultureColors.jadeLight, fg: AppCultureColors.jadeDark);
    if (r.isInProgress)
      return (bg: AppCultureColors.rewardBg, fg: AppCultureColors.rewardText);
    if (r.status == 'REJECTED' || r.status == 'FAILED') {
      return (bg: const Color(0xFFFEE2E2), fg: AppCultureColors.error);
    }
    return (bg: AppCultureColors.surfaceSubtle, fg: AppCultureColors.textMuted);
  }

  Widget _buildRefundCard(RefundModel r) {
    final colors = _statusColors(r);
    final amount = r.displayAmount;
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppCultureColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  r.refundCode,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                    color: AppCultureColors.textDark,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: colors.bg,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  r.statusLabel,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    color: colors.fg,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            [
              if (r.bookingId != null) 'Đơn #${r.bookingId}',
              if (r.createdAt != null) 'Gửi lúc ${formatDateTime(r.createdAt)}',
            ].join(' • '),
            style: const TextStyle(
              fontSize: 11.5,
              color: AppCultureColors.textMuted,
            ),
          ),
          if (r.reasonDetail.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              r.reasonDetail,
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: 12.5,
                color: AppCultureColors.textDark,
                height: 1.35,
              ),
            ),
          ],
          if (r.status == 'REJECTED' && r.rejectionReason.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              'Lý do từ chối: ${r.rejectionReason}',
              style: const TextStyle(
                fontSize: 12,
                color: AppCultureColors.error,
              ),
            ),
          ],
          if (amount != null) ...[
            const Divider(height: 20),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  r.refundedAmount != null
                      ? 'Đã hoàn'
                      : r.approvedAmount != null
                      ? 'Số tiền được duyệt'
                      : 'Số tiền đề xuất',
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppCultureColors.textMuted,
                  ),
                ),
                Text(
                  '${formatThousands(amount)} ₫',
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w900,
                    color: AppCultureColors.textDark,
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}
