import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/models/gamification_model.dart';
import '../../core/services/gamification_service.dart';
import '../../core/services/voucher_service.dart';
import '../../l10n/locale_controller.dart';

/// Kết quả trả về khi người dùng chọn voucher.
class VoucherSelectionResult {
  /// Mã voucher người dùng (userVoucherCode) — gửi lên backend khi tạo booking.
  final String userVoucherCode;

  /// Tiêu đề voucher để hiển thị.
  final String title;

  /// Nhãn giảm giá (VD: "-300.000đ", "-10%").
  final String discountLabel;

  /// Số tiền được giảm (đã tính toán theo giá tour).
  final num discountAmount;

  /// Giá sau giảm.
  final num finalPrice;

  const VoucherSelectionResult({
    required this.userVoucherCode,
    required this.title,
    required this.discountLabel,
    required this.discountAmount,
    required this.finalPrice,
  });
}

/// Hiện bottom sheet chọn voucher.
///
/// [tourPrice] giá tour gốc, dùng để validate + hiển thị.
/// [partnerId] ID đối tác tour (nếu có) — dùng validate voucher đối tác.
/// Trả về [VoucherSelectionResult] nếu chọn thành công, null nếu hủy.
Future<VoucherSelectionResult?> showVoucherSelectionSheet({
  required BuildContext context,
  required num tourPrice,
  int? partnerId,
}) {
  return showModalBottomSheet<VoucherSelectionResult>(
    context: context,
    isScrollControlled: true,
    backgroundColor: AppCultureColors.background,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
    ),
    builder: (_) => _VoucherSelectionSheet(
      tourPrice: tourPrice,
      partnerId: partnerId,
    ),
  );
}

class _VoucherSelectionSheet extends StatefulWidget {
  final num tourPrice;
  final int? partnerId;

  const _VoucherSelectionSheet({required this.tourPrice, this.partnerId});

  @override
  State<_VoucherSelectionSheet> createState() => _VoucherSelectionSheetState();
}

class _VoucherSelectionSheetState extends State<_VoucherSelectionSheet> {
  final GamificationService _gamification = GamificationService();
  final VoucherService _vouchers = VoucherService();

  List<UserVoucherModel>? _myVouchers;
  bool _loading = true;
  String? _error;

  // Đang validate voucher nào
  int? _validatingId;
  String? _validateError;

  @override
  void initState() {
    super.initState();
    _loadVouchers();
  }

  Future<void> _loadVouchers() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final vouchers = await _gamification.getMyVouchers(status: 'AVAILABLE');
      if (!mounted) return;
      setState(() {
        _myVouchers = vouchers.where((v) => v.isUsable).toList();
        _loading = false;
      });
    } on GamificationException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.message;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = context.l10n.voucherLoadFailed;
        _loading = false;
      });
    }
  }

  Future<void> _selectVoucher(UserVoucherModel voucher) async {
    setState(() {
      _validatingId = voucher.id;
      _validateError = null;
    });

    try {
      final result = await _vouchers.validateUserVoucher(
        userVoucherCode: voucher.userVoucherCode,
        tourPrice: widget.tourPrice,
        partnerId: widget.partnerId,
      );

      if (!mounted) return;

      if (!result.valid) {
        setState(() {
          _validatingId = null;
          _validateError = result.errorMessage ?? context.l10n.voucherNotApplicable;
        });
        return;
      }

      Navigator.of(context).pop(VoucherSelectionResult(
        userVoucherCode: voucher.userVoucherCode,
        title: result.title ?? voucher.voucherTitle,
        discountLabel: '-${context.l10n.priceVnd(formatThousands(result.discountAmount))}',
        discountAmount: result.discountAmount,
        finalPrice: result.finalPrice,
      ));
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _validatingId = null;
        _validateError = context.l10n.voucherValidateFailed;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.6,
      maxChildSize: 0.85,
      minChildSize: 0.3,
      expand: false,
      builder: (context, scrollController) => Column(
        children: [
          // Handle bar
          Container(
            margin: const EdgeInsets.only(top: 12, bottom: 8),
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: AppCultureColors.border,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          // Title
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                const Icon(Icons.confirmation_number_outlined,
                    color: AppCultureColors.heritageJade, size: 22),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    context.l10n.voucherSheetTitle,
                    style: const TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.w700,
                      color: AppCultureColors.textDark,
                    ),
                  ),
                ),
                TextButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: Text(context.l10n.voucherSkip,
                      style: const TextStyle(color: AppCultureColors.textMuted)),
                ),
              ],
            ),
          ),
          if (_validateError != null)
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: AppCultureColors.lacquer100,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(
                children: [
                  const Icon(Icons.error_outline, size: 16, color: AppCultureColors.error),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(_validateError!,
                        style: const TextStyle(fontSize: 12, color: AppCultureColors.error)),
                  ),
                ],
              ),
            ),
          const Divider(height: 1, color: AppCultureColors.border),
          // Content
          Expanded(
            child: _loading
                ? const Center(
                    child: CircularProgressIndicator(color: AppCultureColors.heritageJade))
                : _error != null
                    ? _buildError()
                    : _myVouchers == null || _myVouchers!.isEmpty
                        ? _buildEmpty()
                        : ListView.separated(
                            controller: scrollController,
                            padding: const EdgeInsets.all(16),
                            itemCount: _myVouchers!.length,
                            separatorBuilder: (context, index) => const SizedBox(height: 10),
                            itemBuilder: (_, i) => _buildVoucherCard(_myVouchers![i]),
                          ),
          ),
        ],
      ),
    );
  }

  Widget _buildError() => Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(_error!, textAlign: TextAlign.center,
                  style: const TextStyle(color: AppCultureColors.textMuted)),
              const SizedBox(height: 12),
              OutlinedButton(onPressed: _loadVouchers, child: Text(context.l10n.commonRetry)),
            ],
          ),
        ),
      );

  Widget _buildEmpty() => Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.confirmation_number_outlined,
                  size: 48, color: AppCultureColors.textLight),
              const SizedBox(height: 12),
              Text(
                context.l10n.voucherEmpty,
                textAlign: TextAlign.center,
                style: const TextStyle(color: AppCultureColors.textMuted, height: 1.5),
              ),
            ],
          ),
        ),
      );

  Widget _buildVoucherCard(UserVoucherModel voucher) {
    final isValidating = _validatingId == voucher.id;

    return GestureDetector(
      onTap: isValidating ? null : () => _selectVoucher(voucher),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppCultureColors.border),
        ),
        child: Row(
          children: [
            // Left tag
            Container(
              width: 72,
              decoration: const BoxDecoration(
                color: AppCultureColors.heritageJade,
                borderRadius: BorderRadius.only(
                  topLeft: Radius.circular(15),
                  bottomLeft: Radius.circular(15),
                ),
              ),
              padding: const EdgeInsets.symmetric(vertical: 16),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.local_offer_rounded, color: Colors.white, size: 22),
                  const SizedBox(height: 4),
                  Text(
                    context.l10n.voucherOffTag,
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.9),
                      fontSize: 9,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 1,
                    ),
                  ),
                ],
              ),
            ),
            // Content
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      voucher.voucherTitle,
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 14,
                        color: AppCultureColors.textDark,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      context.l10n.voucherCode(voucher.userVoucherCode),
                      style: const TextStyle(fontSize: 11, color: AppCultureColors.textMuted),
                    ),
                    if (voucher.expiryDate != null) ...[
                      const SizedBox(height: 2),
                      Text(
                        context.l10n.voucherExpiry(_fmtDate(voucher.expiryDate!)),
                        style: const TextStyle(fontSize: 11, color: AppCultureColors.textMuted),
                      ),
                    ],
                  ],
                ),
              ),
            ),
            // Action
            Padding(
              padding: const EdgeInsets.only(right: 12),
              child: isValidating
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: AppCultureColors.heritageJade,
                      ),
                    )
                  : const Icon(Icons.chevron_right_rounded,
                      color: AppCultureColors.heritageJade),
            ),
          ],
        ),
      ),
    );
  }

  String _fmtDate(DateTime d) {
    String two(int n) => n.toString().padLeft(2, '0');
    return '${two(d.day)}/${two(d.month)}/${d.year}';
  }
}
