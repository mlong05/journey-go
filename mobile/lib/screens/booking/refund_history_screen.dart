/// Màn Lịch Sử Hoàn Tiền (Refund History) — Mobile.
///
/// Nguồn dữ liệu: `GET /refunds/my` — danh sách yêu cầu hoàn tiền của người dùng.
///
/// Hiển thị vòng đời đầy đủ của mỗi yêu cầu:
///   PENDING → APPROVED → REFUND_PROCESSING → REFUNDED
///           ↘ REJECTED / MANUAL_TRANSFER_PENDING / FAILED
library;

import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';
import '../../core/models/refund_model.dart';
import '../../core/services/api_client.dart';
import '../../core/services/refund_service.dart';

class RefundHistoryScreen extends StatefulWidget {
  const RefundHistoryScreen({super.key});

  @override
  State<RefundHistoryScreen> createState() => _RefundHistoryScreenState();
}

class _RefundHistoryScreenState extends State<RefundHistoryScreen> {
  final RefundService _service = RefundService();

  List<RefundModel> _refunds = [];
  bool _loading = true;
  String _error = '';
  String _filter = 'ALL';

  static const List<String> _filters = [
    'ALL',
    'PENDING_REVIEW',
    'APPROVED',
    'REFUNDED',
    'REJECTED',
  ];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = '';
    });

    try {
      final list = await _service.getMyRefunds(page: 0, size: 50);
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
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _error = 'Không thể tải lịch sử hoàn tiền.';
        _loading = false;
      });
    }
  }

  List<RefundModel> get _filtered {
    if (_filter == 'ALL') return _refunds;
    if (_filter == 'APPROVED') {
      return _refunds
          .where((r) => r.isApproved || r.isProcessing || r.isManualTransferPending)
          .toList();
    }
    return _refunds.where((r) => r.status == _filter).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppCultureColors.background,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded,
              size: 18, color: AppCultureColors.textDark),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: const Text(
          'Lịch Sử Hoàn Tiền',
          style: TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.w800,
            color: AppCultureColors.textDark,
          ),
        ),
        actions: [
          IconButton(
            onPressed: _load,
            icon: const Icon(Icons.refresh_rounded,
                size: 20, color: AppCultureColors.textDark),
          ),
        ],
      ),
      body: Column(
        children: [
          Container(
            color: Colors.white,
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: _filters.map((f) {
                  final isSelected = _filter == f;
                  final count = f == 'ALL'
                      ? _refunds.length
                      : _refunds.where((r) => r.status == f).length;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: GestureDetector(
                      onTap: () => setState(() => _filter = f),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 8),
                        decoration: BoxDecoration(
                          color: isSelected
                              ? AppCultureColors.heritageJade
                              : AppCultureColors.surfaceSubtle,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: isSelected
                                ? AppCultureColors.heritageJade
                                : AppCultureColors.border,
                          ),
                        ),
                        child: Text(
                          '${_filterLabel(f)} ($count)',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: isSelected ? Colors.white : AppCultureColors.textDark,
                          ),
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
          ),
          Expanded(
            child: _loading
                ? const Center(
                    child: CircularProgressIndicator(
                        color: AppCultureColors.heritageJade),
                  )
                : _error.isNotEmpty
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(28),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.error_outline_rounded,
                                  size: 46, color: AppCultureColors.error),
                              const SizedBox(height: 12),
                              Text(
                                _error,
                                textAlign: TextAlign.center,
                                style: const TextStyle(
                                    fontSize: 13, color: AppCultureColors.textMuted),
                              ),
                              const SizedBox(height: 18),
                              ElevatedButton.icon(
                                onPressed: _load,
                                icon: const Icon(Icons.refresh_rounded, size: 18),
                                label: const Text('Thử lại'),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppCultureColors.heritageJade,
                                  foregroundColor: Colors.white,
                                  elevation: 0,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(14),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: _load,
                        color: AppCultureColors.heritageJade,
                        child: _filtered.isEmpty
                            ? ListView(
                                physics: const AlwaysScrollableScrollPhysics(),
                                children: const [
                                  SizedBox(height: 70),
                                  Icon(Icons.assignment_turned_in_outlined,
                                      size: 52, color: AppCultureColors.textLight),
                                  SizedBox(height: 12),
                                  Center(
                                    child: Text(
                                      'Chưa có yêu cầu hoàn tiền nào',
                                      style: TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w700,
                                        color: AppCultureColors.textDark,
                                      ),
                                    ),
                                  ),
                                ],
                              )
                            : ListView.builder(
                                padding:
                                    const EdgeInsets.fromLTRB(16, 16, 16, 24),
                                itemCount: _filtered.length,
                                itemBuilder: (ctx, i) => _buildRefundCard(_filtered[i]),
                              ),
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildRefundCard(RefundModel refund) {
    final badge = _statusBadge(refund.status);

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppCultureColors.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                refund.refundCode ?? 'Yêu cầu #${refund.id}',
                style: const TextStyle(
                  fontSize: 12.5,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 1,
                  color: AppCultureColors.heritageJade,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: badge.bg,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  refund.statusLabel,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: badge.fg,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      refund.declaredReasonLabel,
                      style: const TextStyle(
                        fontSize: 13.5,
                        fontWeight: FontWeight.w800,
                        color: AppCultureColors.textDark,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${refund.bookingCode ?? 'Đơn của tôi'} • '
                      '${refund.formattedCreatedAt}',
                      style: const TextStyle(
                          fontSize: 11.5, color: AppCultureColors.textMuted),
                    ),
                  ],
                ),
              ),
              Text(
                refund.formattedEffectiveAmount,
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w900,
                  color: AppCultureColors.jadeDark,
                ),
              ),
            ],
          ),
          if (refund.reasonDetail != null &&
              refund.reasonDetail!.isNotEmpty) ...[
            const SizedBox(height: 10),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: AppCultureColors.surfaceSubtle,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                refund.reasonDetail!,
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 11.5,
                  height: 1.4,
                  color: AppCultureColors.textMuted,
                ),
              ),
            ),
          ],
          if (refund.rejectionReason != null &&
              refund.rejectionReason!.isNotEmpty) ...[
            const SizedBox(height: 10),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.info_outline_rounded,
                    size: 15, color: AppCultureColors.error),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Lý do từ chối: ${refund.rejectionReason}',
                    style: const TextStyle(
                      fontSize: 11.5,
                      height: 1.35,
                      color: Color(0xFF991B1B),
                    ),
                  ),
                ),
              ],
            ),
          ],
          if (refund.method != null) ...[
            const SizedBox(height: 8),
            Row(
              children: [
                const Icon(Icons.payments_outlined,
                    size: 14, color: AppCultureColors.textMuted),
                const SizedBox(width: 6),
                Text(
                  'Phương thức: ${refund.methodLabel}',
                  style: const TextStyle(
                      fontSize: 11.5, color: AppCultureColors.textMuted),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  static String _filterLabel(String status) {
    switch (status) {
      case 'ALL':
        return 'Tất cả';
      case 'PENDING_REVIEW':
        return 'Chờ xử lý';
      case 'APPROVED':
        return 'Đang xử lý';
      case 'REFUNDED':
        return 'Đã hoàn';
      case 'REJECTED':
        return 'Từ chối';
      default:
        return status;
    }
  }

  static ({Color bg, Color fg}) _statusBadge(String status) {
    switch (status) {
      case 'REFUNDED':
        return (bg: AppCultureColors.jadeLight, fg: AppCultureColors.jadeDark);
      case 'REJECTED':
      case 'FAILED':
        return (bg: const Color(0xFFFEF2F2), fg: const Color(0xFF991B1B));
      case 'PENDING_REVIEW':
        return (bg: AppCultureColors.rewardBg, fg: AppCultureColors.rewardText);
      default:
        return (bg: AppCultureColors.oceanLight, fg: AppCultureColors.oceanDark);
    }
  }
}
