import 'package:flutter/material.dart';
import '../core/constants/app_colors.dart';
import '../core/models/gamification_model.dart'
    show formatDateTime, formatThousands;
import '../core/models/refund_model.dart';
import '../core/models/refund_reason_model.dart';
import '../core/services/api_client.dart';
import '../core/services/refund_reason_config_service.dart';
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
  final RefundReasonConfigService _configService = RefundReasonConfigService();

  List<RefundModel> _refunds = [];
  bool _loading = true;
  String? _error;

  /// Nhóm lý do do Admin cấu hình — dùng tra tên tiếng Việt.
  Map<String, String> _codeNames = {};
  Map<String, RefundReasonGroupModel> _groupsByCode = {};

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
      final groups = await _configService.getActiveGroups();
      if (!mounted) return;
      setState(() {
        _refunds = list;
        _groupsByCode = {for (final g in groups) g.code: g};
        _codeNames = {
          for (final g in groups)
            for (final c in g.reasonCodes) c.code: c.name,
        };
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

  /// Tên nhóm lý do (tiếng Việt) — ưu tiên tên backend trả về.
  ///
  /// ⚠️ Khách KHÔNG chọn nhóm lý do nữa ⇒ `declaredReason` có thể null khi
  /// Admin chưa duyệt ⇒ fallback sang lý do ngắn gọn khách nhập.
  String _groupName(RefundModel r) {
    final backendName = r.approvedReasonName ?? r.declaredReasonName;
    if (backendName != null && backendName.isNotEmpty) return backendName;
    final code = r.approvedReason ?? r.declaredReason;
    final group = code == null ? null : _groupsByCode[code];
    if (group != null) return group.name;
    if (r.reasonSummary.isNotEmpty) return r.reasonSummary;
    return 'Chờ quản trị viên phân loại';
  }

  /// Tên lý do cụ thể (tiếng Việt) — KHÔNG lộ mã kỹ thuật ra UI.
  String? _codeName(RefundModel r) {
    final backendName =
        r.approvedReasonCodeName ?? r.declaredReasonCodeName;
    if (backendName != null && backendName.isNotEmpty) return backendName;
    final code = r.approvedReasonCode ?? r.declaredReasonCode;
    if (code == null || code.isEmpty) return null;
    return _codeNames[code];
  }

  /// Thumbnail bằng chứng đính kèm.
  Widget _buildEvidenceThumb(String url) {
    final isVideo = url.contains('.mp4') ||
        url.contains('.mov') ||
        url.contains('.webm') ||
        url.contains('.m3u8');
    return Container(
      width: 56,
      height: 56,
      decoration: BoxDecoration(
        color: AppCultureColors.surfaceSubtle,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppCultureColors.border),
      ),
      clipBehavior: Clip.antiAlias,
      child: isVideo
          ? const Icon(
              Icons.play_circle_outline_rounded,
              size: 22,
              color: AppCultureColors.textMuted,
            )
          : Image.network(
              url,
              fit: BoxFit.cover,
              errorBuilder: (_, _, _) => const Icon(
                Icons.broken_image_outlined,
                size: 18,
                color: AppCultureColors.textLight,
              ),
            ),
    );
  }

  ({Color bg, Color fg}) _statusColors(RefundModel r) {
    if (r.status == 'REFUNDED') {
      return (bg: AppCultureColors.jadeLight, fg: AppCultureColors.jadeDark);
    }
    if (r.isInProgress) {
      return (bg: AppCultureColors.rewardBg, fg: AppCultureColors.rewardText);
    }
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
                    fontWeight: FontWeight.w700,
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
                    fontWeight: FontWeight.w700,
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
          const SizedBox(height: 8),
          Text(
            _groupName(r),
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w800,
              color: AppCultureColors.textDark,
            ),
          ),
          if (_codeName(r) != null) ...[
            const SizedBox(height: 2),
            Text(
              _codeName(r)!,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: AppCultureColors.textMuted,
              ),
            ),
          ],
          if (r.evidenceAttachments.isNotEmpty) ...[
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final url in r.evidenceAttachments.take(5))
                  _buildEvidenceThumb(url),
              ],
            ),
          ],
          if (r.reasonSummary.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              r.reasonSummary,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: 12.5,
                fontWeight: FontWeight.w700,
                color: AppCultureColors.textDark,
                height: 1.35,
              ),
            ),
          ],
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
          if (amount != null && amount > 0) ...[
            const Divider(height: 20),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  r.refundedAmount > 0
                      ? 'Đã hoàn'
                      : r.approvedAmount > 0
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
                    fontWeight: FontWeight.w700,
                    color: AppCultureColors.textDark,
                  ),
                ),
              ],
            ),
          ],
          if (amount != null && amount <= 0) ...[
            const Divider(height: 20),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Số tiền',
                  style: TextStyle(
                    fontSize: 12,
                    color: AppCultureColors.textMuted,
                  ),
                ),
                Text(
                  // ⚠️ Khách KHÔNG chọn nhóm lý do ⇒ chưa có tỷ lệ ⇒ chưa có
                  // số tiền đề xuất ⇒ hiển thị "Chờ quản trị viên phân loại".
                  r.isPending
                      ? 'Chờ quản trị viên phân loại'
                      : 'Không được hoàn',
                  style: TextStyle(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w700,
                    color: r.isPending
                        ? AppCultureColors.textMuted
                        : AppCultureColors.error,
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
