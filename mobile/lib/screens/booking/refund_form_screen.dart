/// Màn Yêu Cầu Hoàn Tiền (Refund Form) — Mobile.
///
/// ── Luật nghiệp vụ ──
///  • Số tiền do HỆ THỐNG tính theo nguyên nhân: `TOURIST_FAULT` → 50%,
///    `PLATFORM_FAULT` → 100%. Tourist KHÔNG nhập số tiền.
///  • `reasonDetail` là BẮT BUỘC (1–2000 ký tự).
///  • Phương thức hoàn do ADMIN quyết. Vì vậy form luôn thu thập số TK / tên chủ TK /
///    ngân hàng để tránh lỗi `REFUND_BANK_INFO_REQUIRED` khi Admin chuyển khoản thủ công.
///  • Chỉ gửi được 1 yêu cầu đang xử lý cho mỗi payment.
library;

import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';
import '../../core/models/booking_model.dart';
import '../../core/models/refund_model.dart';
import '../../core/services/api_client.dart';
import '../../core/services/refund_service.dart';
import '../../core/utils/formatters.dart';

class RefundFormScreen extends StatefulWidget {
  final int paymentId;
  final BookingModel? booking;
  final double amount;

  const RefundFormScreen({
    super.key,
    required this.paymentId,
    this.booking,
    required this.amount,
  });

  @override
  State<RefundFormScreen> createState() => _RefundFormScreenState();
}

class _RefundFormScreenState extends State<RefundFormScreen> {
  final RefundService _service = RefundService();

  final TextEditingController _detailController = TextEditingController();
  final TextEditingController _evidenceController = TextEditingController();
  final TextEditingController _accountController = TextEditingController();
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _bankController = TextEditingController();

  String _reason = 'TOURIST_FAULT';
  bool _submitting = false;
  String _error = '';

  @override
  void initState() {
    super.initState();
    final booking = widget.booking;
    if (booking?.touristName != null && booking!.touristName!.isNotEmpty) {
      _nameController.text = booking.touristName!;
    }
  }

  @override
  void dispose() {
    _detailController.dispose();
    _evidenceController.dispose();
    _accountController.dispose();
    _nameController.dispose();
    _bankController.dispose();
    super.dispose();
  }

  /// Số tiền dự kiến hoàn — hệ thống tính, không phải người dùng.
  double get _estimatedRefund =>
      _reason == 'PLATFORM_FAULT' ? widget.amount : widget.amount * 0.5;

  bool get _canSubmit {
    return _detailController.text.trim().isNotEmpty &&
        _accountController.text.trim().isNotEmpty &&
        _nameController.text.trim().isNotEmpty &&
        _bankController.text.trim().isNotEmpty;
  }

  Future<void> _submit() async {
    if (!_canSubmit) {
      setState(() {
        _error = 'Vui lòng điền đầy đủ lý do và thông tin tài khoản nhận tiền.';
      });
      return;
    }

    setState(() {
      _submitting = true;
      _error = '';
    });

    try {
      final refund = await _service.createRefund(
        paymentId: widget.paymentId,
        reason: _reason,
        reasonDetail: _detailController.text.trim(),
        evidence: _evidenceController.text.trim(),
        bankAccountNumber: _accountController.text.trim(),
        bankAccountName: _nameController.text.trim(),
        bankName: _bankController.text.trim(),
      );

      if (!mounted) return;
      _showSuccessDialog(refund);
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.message;
        _submitting = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _error = 'Không thể gửi yêu cầu hoàn tiền. Vui lòng thử lại.';
        _submitting = false;
      });
    }
  }

  void _showSuccessDialog(RefundModel refund) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        contentPadding: const EdgeInsets.all(24),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 68,
              height: 68,
              decoration: const BoxDecoration(
                color: AppCultureColors.oceanLight,
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.assignment_turned_in_rounded,
                color: AppCultureColors.oceanBlue,
                size: 40,
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'Đã Gửi Yêu Cầu Hoàn Tiền',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w800,
                color: AppCultureColors.textDark,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Mã yêu cầu: ${refund.refundCode ?? '#${refund.id}'}\n'
              'Số tiền dự kiến: ${formatVndAmount(refund.proposedAmount)}\n'
              'Trạng thái: ${refund.statusLabel}',
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 13,
                color: AppCultureColors.textMuted,
                height: 1.45,
              ),
            ),
            const SizedBox(height: 22),
            SizedBox(
              width: double.infinity,
              height: 46,
              child: ElevatedButton(
                onPressed: () {
                  Navigator.of(ctx).pop();
                  Navigator.of(context).pop(true);
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppCultureColors.heritageJade,
                  foregroundColor: Colors.white,
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
                child: const Text(
                  'Đã hiểu',
                  style: TextStyle(fontWeight: FontWeight.w700),
                ),
              ),
            ),
          ],
        ),
      ),
    );
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
          'Yêu Cầu Hoàn Tiền',
          style: TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.w800,
            color: AppCultureColors.textDark,
          ),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
        children: [
          // ── Tóm tắt đơn ──
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: AppCultureColors.border),
            ),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Đơn hàng',
                      style: TextStyle(
                        fontSize: 12.5,
                        color: AppCultureColors.textMuted,
                      ),
                    ),
                    Text(
                      widget.booking?.bookingCode ?? 'Đơn đã thanh toán',
                      style: const TextStyle(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w800,
                        color: AppCultureColors.heritageJade,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Số tiền đã thanh toán',
                      style: TextStyle(
                        fontSize: 12.5,
                        color: AppCultureColors.textMuted,
                      ),
                    ),
                    Text(
                      formatVndAmount(widget.amount),
                      style: const TextStyle(
                        fontSize: 13.5,
                        fontWeight: FontWeight.w900,
                        color: AppCultureColors.textDark,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          const SizedBox(height: 18),

          // ── Nguyên nhân ──
          const Text(
            'Nguyên nhân yêu cầu hoàn tiền',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w800,
              color: AppCultureColors.textDark,
            ),
          ),
          const SizedBox(height: 10),

          RadioGroup<String>(
            groupValue: _reason,
            onChanged: (v) => setState(() => _reason = v ?? _reason),
            child: Column(
              children: [
                _buildReasonTile(
                  value: 'TOURIST_FAULT',
                  title: 'Lý do cá nhân',
                  subtitle: 'Hoàn 50% số tiền đã thanh toán',
                  icon: Icons.person_outline_rounded,
                ),
                const SizedBox(height: 10),
                _buildReasonTile(
                  value: 'PLATFORM_FAULT',
                  title: 'Lỗi nền tảng',
                  subtitle: 'Hoàn 100% số tiền đã thanh toán',
                  icon: Icons.support_agent_rounded,
                ),
              ],
            ),
          ),

          const SizedBox(height: 14),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppCultureColors.jadeLight,
              borderRadius: BorderRadius.circular(14),
            ),
            child: Row(
              children: [
                const Icon(Icons.info_outline_rounded,
                    size: 16, color: AppCultureColors.jadeDark),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Số tiền hoàn dự kiến: ${formatVndAmount(_estimatedRefund)}',
                    style: const TextStyle(
                      fontSize: 12.5,
                      fontWeight: FontWeight.w800,
                      color: AppCultureColors.jadeDark,
                    ),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 18),

          // ── Chi tiết lý do ──
          const Text(
            'Mô tả chi tiết lý do *',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w800,
              color: AppCultureColors.textDark,
            ),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _detailController,
            maxLines: 4,
            maxLength: 2000,
            onChanged: (_) => setState(() {}),
            decoration: const InputDecoration(
              hintText:
                  'Mô tả cụ thể tình huống (VD: hủy chuyến đi vì thời tiết xấu...)',
              border: OutlineInputBorder(),
              counterText: '',
            ),
          ),

          const SizedBox(height: 14),
          const Text(
            'Thông tin bổ sung (không bắt buộc)',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w800,
              color: AppCultureColors.textDark,
            ),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _evidenceController,
            maxLines: 3,
            maxLength: 5000,
            decoration: const InputDecoration(
              hintText: 'Ảnh/video đã gửi, mã đặt vé, thông tin liên hệ...',
              border: OutlineInputBorder(),
              counterText: '',
            ),
          ),

          const SizedBox(height: 14),
          const Text(
            'Tài khoản nhận tiền *',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w800,
              color: AppCultureColors.textDark,
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            'Điền sẵn để hỗ trợ hoàn tiền bằng chuyển khoản thủ công nếu cần.',
            style: TextStyle(fontSize: 11.5, color: AppCultureColors.textMuted),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: _accountController,
            keyboardType: TextInputType.number,
            onChanged: (_) => setState(() {}),
            decoration: const InputDecoration(
              hintText: 'Số tài khoản',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: _nameController,
            onChanged: (_) => setState(() {}),
            decoration: const InputDecoration(
              hintText: 'Tên chủ tài khoản',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: _bankController,
            onChanged: (_) => setState(() {}),
            decoration: const InputDecoration(
              hintText: 'Ngân hàng (VD: Vietcombank)',
              border: OutlineInputBorder(),
            ),
          ),

          if (_error.isNotEmpty) ...[
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFFFEF2F2),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFFECACA)),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.error_outline_rounded,
                      size: 16, color: AppCultureColors.error),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      _error,
                      style: const TextStyle(
                        fontSize: 12.5,
                        color: Color(0xFF991B1B),
                        height: 1.35,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],

          const SizedBox(height: 22),
          SizedBox(
            width: double.infinity,
            height: 52,
            child: ElevatedButton.icon(
              onPressed: _submitting ? null : _submit,
              icon: _submitting
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Icon(Icons.send_rounded, size: 19),
              label: Text(
                _submitting ? 'Đang gửi...' : 'Gửi yêu cầu hoàn tiền',
                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppCultureColors.heritageJade,
                foregroundColor: Colors.white,
                disabledBackgroundColor: AppCultureColors.border,
                disabledForegroundColor: AppCultureColors.textMuted,
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
            ),
          ),
          const SizedBox(height: 12),
          const Text(
            'Yêu cầu sẽ được quản trị viên xem xét. Số tiền thực nhận và phương thức hoàn '
            'sẽ được thông báo sau khi phê duyệt.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 11.5, color: AppCultureColors.textLight),
          ),
        ],
      ),
    );
  }

  Widget _buildReasonTile({
    required String value,
    required String title,
    required String subtitle,
    required IconData icon,
  }) {
    final isSelected = _reason == value;
    return InkWell(
      onTap: () => setState(() => _reason = value),
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: isSelected ? AppCultureColors.jadeLight : Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isSelected
                ? AppCultureColors.heritageJade
                : AppCultureColors.border,
            width: isSelected ? 1.8 : 1,
          ),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(9),
              decoration: BoxDecoration(
                color: isSelected
                    ? AppCultureColors.heritageJade
                    : AppCultureColors.surfaceSubtle,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                icon,
                size: 20,
                color: isSelected ? Colors.white : AppCultureColors.textMuted,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 13.5,
                      fontWeight: FontWeight.w800,
                      color: AppCultureColors.textDark,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: const TextStyle(
                      fontSize: 11.5,
                      color: AppCultureColors.textMuted,
                    ),
                  ),
                ],
              ),
            ),
            Radio<String>(
              value: value,
              activeColor: AppCultureColors.heritageJade,
            ),
          ],
        ),
      ),
    );
  }
}
