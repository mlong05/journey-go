/// Màn Yêu Cầu Hoàn Tiền (Refund Form) — Mobile.
///
/// ── Luật nghiệp vụ ──
///  • KHÁCH KHÔNG chọn nhóm lý do / mã lý do nữa — chỉ mô tả bằng VĂN BẢN:
///    1 dòng ngắn (lý do) + 1 mô tả chi tiết. Việc phân loại vào nhóm lý do và
///    mã lý do là quyết định của ADMIN khi duyệt (tab "Yêu cầu hoàn tiền").
///  • Số tiền do HỆ THỐNG tính theo nhóm lý do mà Admin xác định — Tourist
///    KHÔNG nhập số tiền, cũng không thấy số tiền dự kiến trước khi được duyệt.
///  • Một số mã lý do yêu cầu BẮT BUỘC đính kèm bằng chứng — quy tắc này do
///    ADMIN áp dụng khi duyệt (mã lý do chưa được xác định lúc khách gửi).
///  • Phương thức hoàn do ADMIN quyết. Vì vậy form luôn thu thập số TK / tên chủ TK /
///    ngân hàng để tránh lỗi `REFUND_BANK_INFO_REQUIRED` khi Admin chuyển khoản
///    thủ công.
///  • Chỉ gửi được 1 yêu cầu đang xử lý cho mỗi payment.
library;

import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../../core/constants/app_colors.dart';
import '../../core/constants/bank_list.dart';
import '../../core/models/booking_model.dart';
import '../../core/models/refund_model.dart';
import '../../core/services/api_client.dart';
import '../../core/services/refund_service.dart';
import '../../core/services/token_storage.dart';
import '../../core/utils/formatters.dart';

/// Bằng chứng đính kèm — ảnh hoặc video đã tải lên máy chủ.
class _EvidenceFile {
  final String localPath;
  final bool isVideo;
  String? remoteUrl;
  bool uploading = false;
  bool failed = false;

  _EvidenceFile({required this.localPath, required this.isVideo});
}

/// Màu hiển thị của tỷ lệ hoàn trong bảng chính sách.
enum _PolicyTone { success, danger, muted }

/// Một dòng điều kiện trong nhóm lý do (VD: "Hủy trước 3 ngày" → "Hoàn 50%").
class _PolicyLine {
  final String condition;
  final String rateLabel;
  final _PolicyTone tone;

  const _PolicyLine(this.condition, this.rateLabel, {required this.tone});
}

/// Một nhóm lý do trong bảng "Chính sách Hoàn Tiền".
class _PolicyGroup {
  final String title;
  final IconData icon;
  final List<_PolicyLine> lines;

  const _PolicyGroup({
    required this.title,
    required this.icon,
    required this.lines,
  });
}

class RefundFormScreen extends StatefulWidget {
  final int paymentId;
  final BookingModel? booking;
  final num amount;

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
  final ImagePicker _picker = ImagePicker();

  // ── 3. Lý do hoàn tiền ────────────────────────────────────────────────────
  final TextEditingController _summaryController = TextEditingController();
  final TextEditingController _detailController = TextEditingController();

  // ── 5. Tài khoản nhận tiền ────────────────────────────────────────────────
  final TextEditingController _accountController = TextEditingController();
  final TextEditingController _nameController = TextEditingController();
  String _bankName = '';

  // ── 6. Thông tin liên hệ & xác nhận ───────────────────────────────────────
  final TextEditingController _phoneController = TextEditingController();
  final TextEditingController _emailController = TextEditingController();
  bool _agreed = false;

  final List<_EvidenceFile> _files = [];

  bool _submitting = false;
  String _error = '';

  /// Tối đa 5 file bằng chứng cho một yêu cầu.
  static const int _maxFiles = 5;

  /// Giới hạn ký tự — khớp với `@Size` ở backend (`CreateRefundRequest`).
  static const int _summaryMax = 200;
  static const int _detailMax = 2000;

  @override
  void initState() {
    super.initState();
    _prefillFromAccount();
  }

  @override
  void dispose() {
    _summaryController.dispose();
    _detailController.dispose();
    _accountController.dispose();
    _nameController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    super.dispose();
  }

  /// Tự điền thông tin liên hệ từ tài khoản đang đăng nhập (nếu có).
  Future<void> _prefillFromAccount() async {
    final user = await TokenStorage.getUser();
    if (!mounted || user == null) return;
    final phone = user.phone?.trim() ?? '';
    final email = user.email.trim();
    setState(() {
      if (phone.isNotEmpty) _phoneController.text = phone;
      if (email.isNotEmpty) _emailController.text = email;
      final fullName = user.fullName.trim();
      if (fullName.isNotEmpty) _nameController.text = fullName;
    });
  }

  // ── Chính sách hoàn tiền ──────────────────────────────────────────────────

  /// Ngày trải nghiệm của booking — mốc để áp cửa sổ no-show 48h.
  DateTime? get _experienceDate => widget.booking?.experienceDate;

  /// Cửa sổ no-show: khách gửi trong vòng N giờ trước ngày trải nghiệm
  /// (hoặc không xuất hiện) → nhóm cá nhân không hoàn tiền.
  bool _isInNoShowWindow(DateTime? date, int hours) {
    if (date == null || hours <= 0) return false;
    final startOfExperience = DateTime(date.year, date.month, date.day);
    final deadline = startOfExperience.subtract(Duration(hours: hours));
    return DateTime.now().isAfter(deadline);
  }

  /// Số giờ cửa sổ no-show — lấy từ cấu hình backend (mặc định 48).
  static const int _noShowWindowHours = 48;

  /// Số giờ "hủy trước N ngày khởi hành" (chính sách: hủy trước 3 ngày).
  static const int _earlyCancelDays = 3;

  /// Một nhóm trong bảng "Chính sách Hoàn Tiền" + các dòng điều kiện bên dưới.
  List<_PolicyGroup> get _policyGroups {
    final personalZeroed = _isInNoShowWindow(
      _experienceDate,
      _noShowWindowHours,
    );
    return [
      _PolicyGroup(
        title: 'Lỗi từ khách hàng (Hủy tour)',
        icon: Icons.person_outline_rounded,
        lines: [
          _PolicyLine(
            'Hủy trước $_earlyCancelDays ngày',
            'Hoàn 50%',
            tone: _PolicyTone.success,
          ),
          _PolicyLine(
            'Hủy trong vòng $_noShowWindowHours giờ / Không đến (theo lịch trình)',
            'Hoàn 0%',
            tone: personalZeroed ? _PolicyTone.danger : _PolicyTone.muted,
          ),
        ],
      ),
      _PolicyGroup(
        title: 'Lỗi hệ thống / Đối tác',
        icon: Icons.storefront_outlined,
        lines: [
          _PolicyLine(
            'Lỗi không mở khóa được trải nghiệm, đối tác không tổ chức...',
            'Hoàn 100%',
            tone: _PolicyTone.success,
          ),
        ],
      ),
      _PolicyGroup(
        title: 'Bất khả kháng',
        icon: Icons.thunderstorm_outlined,
        lines: [
          _PolicyLine(
            'Thiên tai, dịch bệnh,...',
            'Hoàn 0%',
            tone: _PolicyTone.muted,
          ),
        ],
      ),
    ];
  }

  // ── Validate ──────────────────────────────────────────────────────────────

  bool get _canSubmit {
    if (_summaryController.text.trim().isEmpty) return false;
    if (_detailController.text.trim().isEmpty) return false;
    if (_accountController.text.trim().isEmpty) return false;
    if (_nameController.text.trim().isEmpty) return false;
    if (_bankName.isEmpty) return false;
    if (_phoneController.text.trim().isEmpty) return false;
    if (_emailController.text.trim().isEmpty) return false;
    if (!_hasReceiptImage) return false;
    if (!_agreed) return false;
    return true;
  }

  /// Đã đính kèm ít nhất MỘT ẢNH biên lai giao dịch thành công hay chưa.
  ///
  /// ⚠️ Bắt buộc: khách phải tải lên ảnh chụp biên lai giao dịch thành công
  /// (không tính video) để quản trị viên đối chiếu được số tiền.
  bool get _hasReceiptImage =>
      _files.any((f) => !f.isVideo && !f.failed);

  // ── Bằng chứng ─────────────────────────────────────────────────────────────

  Future<void> _pickImages() async {
    if (_files.length >= _maxFiles) {
      _showSnack('Mỗi yêu cầu chỉ đính kèm tối đa $_maxFiles tệp.');
      return;
    }
    try {
      final picked = await _picker.pickMultiImage(limit: _maxFiles);
      if (picked.isEmpty) return;
      final room = _maxFiles - _files.length;
      for (final x in picked.take(room)) {
        _files.add(_EvidenceFile(localPath: x.path, isVideo: false));
      }
      setState(() {});
    } catch (_) {
      _showSnack('Không thể mở thư viện ảnh.');
    }
  }

  Future<void> _pickVideo() async {
    if (_files.length >= _maxFiles) {
      _showSnack('Mỗi yêu cầu chỉ đính kèm tối đa $_maxFiles tệp.');
      return;
    }
    try {
      final picked = await _picker.pickVideo(
        source: ImageSource.gallery,
        maxDuration: const Duration(minutes: 3),
      );
      if (picked == null) return;
      _files.add(_EvidenceFile(localPath: picked.path, isVideo: true));
      setState(() {});
    } catch (_) {
      _showSnack('Không thể chọn video.');
    }
  }

  void _removeFile(int index) {
    setState(() => _files.removeAt(index));
  }

  /// Tải bằng chứng lên Cloudinary trước khi gửi yêu cầu.
  Future<List<String>> _uploadFiles() async {
    final urls = <String>[];
    for (var i = 0; i < _files.length; i++) {
      final file = _files[i];
      setState(() => file.uploading = true);
      try {
        final url = file.isVideo
            ? await ApiClient.uploadVideo(file.localPath)
            : await ApiClient.uploadImage(
                file.localPath,
                folder: 'journeygo/refund-evidence',
              );
        file.remoteUrl = url;
        file.failed = false;
        urls.add(url);
      } catch (_) {
        file.failed = true;
      } finally {
        setState(() => file.uploading = false);
      }
    }
    return urls;
  }

  void _showSnack(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  // ── Gửi yêu cầu ────────────────────────────────────────────────────────────

  Future<void> _submit() async {
    if (!_canSubmit) {
      setState(() {
        _error = _validationMessage();
      });
      return;
    }

    setState(() {
      _submitting = true;
      _error = '';
    });

    try {
      // Tải bằng chứng lên trước — nếu tải lỗi thì báo để khách thử lại.
      final urls = await _uploadFiles();
      if (urls.length != _files.length) {
        if (!mounted) return;
        setState(() {
          _submitting = false;
          _error =
              'Không tải được toàn bộ bằng chứng lên máy chủ. Vui lòng thử lại.';
        });
        return;
      }

      final refund = await _service.createRefund(
        paymentId: widget.paymentId,
        reasonSummary: _summaryController.text.trim(),
        reasonDetail: _detailController.text.trim(),
        evidenceAttachments: urls,
        bankAccountNumber: _accountController.text.trim(),
        bankAccountName: _nameController.text.trim(),
        bankName: _bankName,
        contactPhone: _phoneController.text.trim(),
        contactEmail: _emailController.text.trim(),
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

  String _validationMessage() {
    if (_summaryController.text.trim().isEmpty) {
      return 'Vui lòng nhập lý do ngắn gọn.';
    }
    if (_detailController.text.trim().isEmpty) {
      return 'Vui lòng tường thuật chi tiết sự cố hoặc lý do không thể tham gia.';
    }
    if (_accountController.text.trim().isEmpty ||
        _nameController.text.trim().isEmpty ||
        _bankName.isEmpty) {
      return 'Vui lòng điền đầy đủ thông tin tài khoản nhận tiền.';
    }
    if (_phoneController.text.trim().isEmpty ||
        _emailController.text.trim().isEmpty) {
      return 'Vui lòng điền đầy đủ thông tin liên hệ.';
    }
    if (!_hasReceiptImage) {
      return 'Vui lòng tải lên ảnh chụp biên lai giao dịch thành công '
          '(bắt buộc để quản trị viên đối chiếu).';
    }
    if (!_agreed) {
      return 'Vui lòng xác nhận cam đoan thông tin và bằng chứng.';
    }
    return 'Vui lòng kiểm tra lại thông tin đã nhập.';
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
              'Mã yêu cầu: '
              '${refund.refundCode.isEmpty ? '#${refund.id}' : refund.refundCode}\n'
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

  // ── UI ─────────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppCultureColors.background,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(
            Icons.arrow_back_ios_new_rounded,
            size: 18,
            color: AppCultureColors.textDark,
          ),
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
          // ── 1. Đơn hàng ────────────────────────────────────────────────────
          _buildOrderSummary(),
          const SizedBox(height: 18),

          // ── 2. Chính sách hoàn tiền ────────────────────────────────────────
          _buildPolicySection(),
          const SizedBox(height: 18),

          // ── 3. Lý do hoàn tiền ────────────────────────────────────────────
          _buildReasonSection(),
          const SizedBox(height: 18),

          // ── 4. Đính kèm bằng chứng ────────────────────────────────────────
          _buildEvidenceSection(),
          const SizedBox(height: 18),

          // ── 5. Tài khoản nhận tiền ────────────────────────────────────────
          _buildBankSection(),
          const SizedBox(height: 18),

          // ── 6. Thông tin liên hệ & xác nhận ───────────────────────────────
          _buildContactSection(),

          if (_error.isNotEmpty) ...[
            const SizedBox(height: 16),
            _buildErrorBox(),
          ],
          const SizedBox(height: 22),
          _buildSubmitButton(),
          const SizedBox(height: 12),
          const Text(
            'Yêu cầu sẽ được quản trị viên xem xét và đối chiếu bằng chứng. '
            'Số tiền thực nhận, tỷ lệ hoàn và phương thức hoàn sẽ được thông báo '
            'sau khi phê duyệt.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 11.5, color: AppCultureColors.textLight),
          ),
        ],
      ),
    );
  }

  // ── 1. Đơn hàng ───────────────────────────────────────────────────────────

  Widget _buildOrderSummary() {
    final booking = widget.booking;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppCultureColors.border),
      ),
      child: Column(
        children: [
          _buildSummaryRow(
            'Đơn hàng',
            booking?.bookingCode ?? 'Đơn đã thanh toán',
            valueColor: AppCultureColors.heritageJade,
          ),
          const SizedBox(height: 8),
          _buildSummaryRow(
            'Số tiền đã thanh toán',
            formatVndAmount(widget.amount),
            valueColor: AppCultureColors.textDark,
            bold: true,
          ),
          const SizedBox(height: 8),
          _buildSummaryRow(
            'Ngày thanh toán',
            booking?.paidAt != null
                ? formatDateTimeVn(booking!.paidAt)
                : '—',
            valueColor: AppCultureColors.textDark,
            bold: true,
          ),
          const SizedBox(height: 8),
          _buildSummaryRow(
            'Ngày trải nghiệm',
            booking?.experienceDate != null
                ? formatDateVn(booking!.experienceDate)
                : '—',
            valueColor: AppCultureColors.textDark,
            bold: true,
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryRow(
    String label,
    String value, {
    Color valueColor = AppCultureColors.textDark,
    bool bold = false,
  }) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 12.5,
            color: AppCultureColors.textMuted,
          ),
        ),
        Text(
          value,
          style: TextStyle(
            fontSize: bold ? 13 : 12.5,
            fontWeight: bold ? FontWeight.w800 : FontWeight.w700,
            color: valueColor,
          ),
        ),
      ],
    );
  }

  // ── 2. Chính sách hoàn tiền ───────────────────────────────────────────────

  /// Màu của nhãn tỷ lệ hoàn theo tone.
  Color _policyToneColor(_PolicyTone tone) {
    switch (tone) {
      case _PolicyTone.success:
        return AppCultureColors.heritageJade;
      case _PolicyTone.danger:
        return const Color(0xFFB91C1C);
      case _PolicyTone.muted:
        return AppCultureColors.textMuted;
    }
  }

  Widget _buildPolicySection() {
    return Container(
      padding: const EdgeInsets.all(16),
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
              const Icon(
                Icons.policy_outlined,
                size: 16,
                color: AppCultureColors.heritageJade,
              ),
              const SizedBox(width: 8),
              const Text(
                'Chính sách Hoàn Tiền',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                  color: AppCultureColors.textDark,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          for (final group in _policyGroups)
            Padding(
              padding: const EdgeInsets.only(bottom: 14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Tên nhóm lý do
                  Row(
                    children: [
                      Icon(
                        group.icon,
                        size: 14,
                        color: AppCultureColors.heritageJade,
                      ),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          group.title,
                          style: const TextStyle(
                            fontSize: 12.5,
                            fontWeight: FontWeight.w800,
                            color: AppCultureColors.textDark,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 5),
                  // Các dòng điều kiện + tỷ lệ hoàn
                  for (final line in group.lines)
                    Padding(
                      padding: const EdgeInsets.only(left: 10, bottom: 3),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            width: 4,
                            height: 4,
                            margin: const EdgeInsets.only(top: 6, right: 7),
                            decoration: BoxDecoration(
                              color: AppCultureColors.textLight,
                              shape: BoxShape.circle,
                            ),
                          ),
                          Expanded(
                            child: Text(
                              line.condition,
                              style: const TextStyle(
                                fontSize: 11.5,
                                height: 1.4,
                                color: AppCultureColors.textMuted,
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            line.rateLabel,
                            style: TextStyle(
                              fontSize: 11.5,
                              fontWeight: FontWeight.w800,
                              color: _policyToneColor(line.tone),
                            ),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  // ── 3. Lý do hoàn tiền ────────────────────────────────────────────────────

  Widget _buildReasonSection() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppCultureColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Lý do hoàn tiền',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w800,
              color: AppCultureColors.textDark,
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            'Quản trị viên sẽ đọc nội dung này để đối chiếu và quyết định mức hoàn.',
            style: TextStyle(fontSize: 11.5, color: AppCultureColors.textMuted),
          ),
          const SizedBox(height: 12),

          // Ô 1 — lý do ngắn gọn
          TextField(
            controller: _summaryController,
            maxLength: _summaryMax,
            onChanged: (_) => setState(() {}),
            style: const TextStyle(fontSize: 13.5),
            decoration: InputDecoration(
              hintText: 'Nhập lý do ngắn gọn (VD: Bị ốm đột xuất,....)',
              hintStyle: const TextStyle(
                fontSize: 13,
                color: AppCultureColors.textLight,
              ),
              counterText: '',
              filled: true,
              fillColor: AppCultureColors.surface,
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 12,
                vertical: 12,
              ),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: AppCultureColors.border),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: AppCultureColors.border),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(
                  color: AppCultureColors.heritageJade,
                  width: 1.6,
                ),
              ),
            ),
          ),
          const SizedBox(height: 4),
          Align(
            alignment: Alignment.centerRight,
            child: Text(
              '${_summaryController.text.length}/$_summaryMax',
              style: TextStyle(
                fontSize: 10.5,
                color: _summaryController.text.length >= _summaryMax * 0.9
                    ? const Color(0xFFC98A1B)
                    : AppCultureColors.textLight,
              ),
            ),
          ),
          const SizedBox(height: 8),

          // Ô 2 — mô tả chi tiết
          TextField(
            controller: _detailController,
            maxLines: 5,
            maxLength: _detailMax,
            onChanged: (_) => setState(() {}),
            style: const TextStyle(fontSize: 13.5, height: 1.45),
            decoration: InputDecoration(
              hintText:
                  'Vui lòng tường thuật chi tiết sự cố bạn gặp phải hoặc lý do không thể tham gia để admin hỗ trợ tốt nhất',
              hintStyle: const TextStyle(
                fontSize: 12.5,
                height: 1.45,
                color: AppCultureColors.textLight,
              ),
              counterText: '',
              filled: true,
              fillColor: AppCultureColors.surface,
              contentPadding: const EdgeInsets.all(12),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: AppCultureColors.border),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: AppCultureColors.border),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(
                  color: AppCultureColors.heritageJade,
                  width: 1.6,
                ),
              ),
            ),
          ),
          const SizedBox(height: 4),
          Align(
            alignment: Alignment.centerRight,
            child: Text(
              '${_detailController.text.length}/$_detailMax',
              style: TextStyle(
                fontSize: 10.5,
                color: _detailController.text.length >= _detailMax * 0.9
                    ? const Color(0xFFC98A1B)
                    : AppCultureColors.textLight,
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ── 4. Đính kèm bằng chứng ───────────────────────────────────────────────

  Widget _buildEvidenceSection() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFFECACA)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Text(
                'Đính kèm bằng chứng',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                  color: AppCultureColors.textDark,
                ),
              ),
              const SizedBox(width: 6),
              const Text(
                '(Ảnh/Video/Giấy tờ)',
                style: TextStyle(
                  fontSize: 11.5,
                  fontWeight: FontWeight.w600,
                  color: AppCultureColors.textMuted,
                ),
              ),
              const Spacer(),
              Text(
                '${_files.length}/$_maxFiles',
                style: const TextStyle(
                  fontSize: 11.5,
                  color: AppCultureColors.textMuted,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          const Text(
            'Giấy khám bệnh, hình ảnh sự cố, ảnh chụp màn hình lỗi ứng dụng, v.v.',
            style: TextStyle(
              fontSize: 11,
              height: 1.4,
              color: AppCultureColors.textLight,
            ),
          ),
          const SizedBox(height: 10),
          // ⚠️ BẮT BUỘC: ảnh chụp biên lai giao dịch thành công.
          //
          // ⚠️ Chỉ hiển thị LƯU Ý cố định — KHÔNG đổi nội dung/nhấn mạu theo
          // trạng thái đã tải ảnh hay chưa. Việc "đã đủ ảnh biên lai hay chưa"
          // đã được chặn ở nút gửi + kiểm tra phía server, không cần nhắc lại.
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFFFEF2F2),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFFECACA)),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(
                  Icons.receipt_long_rounded,
                  size: 18,
                  color: Color(0xFF991B1B),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Bắt buộc: ảnh chụp biên lai giao dịch thành công',
                        style: TextStyle(
                          fontSize: 12.5,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF991B1B),
                        ),
                      ),
                      const SizedBox(height: 3),
                      const Text(
                        'Hãy chụp màn hình biên lai VNPay hiển thị "Giao dịch thành công" '
                        'rồi bấm "Thêm ảnh" bên dưới. Không có ảnh, yêu cầu sẽ không được gửi.',
                        style: TextStyle(
                          fontSize: 11,
                          height: 1.4,
                          color: Color(0xFF991B1B),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _files.length >= _maxFiles ? null : _pickImages,
                  icon: const Icon(Icons.add_photo_alternate_outlined, size: 18),
                  label: const Text('Thêm ảnh'),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _files.length >= _maxFiles ? null : _pickVideo,
                  icon: const Icon(Icons.videocam_outlined, size: 18),
                  label: const Text('Thêm video'),
                ),
              ),
            ],
          ),
          if (_files.isNotEmpty) ...[
            const SizedBox(height: 12),
            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: [
                for (var i = 0; i < _files.length; i++)
                  _buildFileChip(_files[i], i),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildFileChip(_EvidenceFile file, int index) {
    return Stack(
      children: [
        Container(
          width: 84,
          height: 84,
          decoration: BoxDecoration(
            color: AppCultureColors.surfaceSubtle,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: file.failed
                  ? const Color(0xFFFECACA)
                  : AppCultureColors.border,
            ),
          ),
          clipBehavior: Clip.antiAlias,
          child: file.isVideo
              ? const Icon(
                  Icons.play_circle_outline_rounded,
                  size: 30,
                  color: AppCultureColors.textMuted,
                )
              : Image.file(
                  File(file.localPath),
                  fit: BoxFit.cover,
                  errorBuilder: (_, _, _) => const Icon(
                    Icons.broken_image_outlined,
                    size: 26,
                    color: AppCultureColors.textLight,
                  ),
                ),
        ),
        if (file.uploading)
          Container(
            width: 84,
            height: 84,
            decoration: BoxDecoration(
              color: Colors.black.withValues(alpha: 0.45),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Center(
              child: SizedBox(
                width: 22,
                height: 22,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: Colors.white,
                ),
              ),
            ),
          ),
        if (file.failed)
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: Container(
              padding: const EdgeInsets.symmetric(vertical: 2),
              decoration: BoxDecoration(
                color: const Color(0xFFDC2626),
                borderRadius: const BorderRadius.vertical(
                  bottom: Radius.circular(11),
                ),
              ),
              child: const Text(
                'Lỗi tải lên',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 9,
                  fontWeight: FontWeight.w700,
                  color: Colors.white,
                ),
              ),
            ),
          ),
        Positioned(
          top: -6,
          right: -6,
          child: GestureDetector(
            onTap: () => _removeFile(index),
            child: Container(
              width: 22,
              height: 22,
              decoration: const BoxDecoration(
                color: Color(0xFFDC2626),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.close_rounded,
                size: 14,
                color: Colors.white,
              ),
            ),
          ),
        ),
      ],
    );
  }

  // ── 5. Tài khoản nhận tiền ────────────────────────────────────────────────

  Widget _buildBankSection() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppCultureColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Tài khoản nhận tiền',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w800,
              color: AppCultureColors.textDark,
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            'Cung cấp để hỗ trợ hoàn tiền bằng phương thức thủ công nếu cần.',
            style: TextStyle(fontSize: 11.5, color: AppCultureColors.textMuted),
          ),
          const SizedBox(height: 12),
          _buildInput(
            controller: _accountController,
            hint: 'Số tài khoản',
            keyboardType: TextInputType.number,
          ),
          const SizedBox(height: 10),
          _buildInput(
            controller: _nameController,
            hint: 'Tên chủ tài khoản',
          ),
          const SizedBox(height: 10),
          DropdownButtonFormField<String>(
            initialValue: _bankName.isEmpty ? null : _bankName,
            isExpanded: true,
            hint: const Text(
              'Ngân hàng',
              style: TextStyle(
                fontSize: 13,
                color: AppCultureColors.textLight,
              ),
            ),
            style: const TextStyle(
              fontSize: 13.5,
              color: AppCultureColors.textDark,
            ),
            dropdownColor: Colors.white,
            onChanged: (v) => setState(() => _bankName = v ?? ''),
            items: [
              for (final b in kBankDropdownOptions)
                DropdownMenuItem(
                  value: b.value,
                  child: Text(
                    b.name,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 13.5,
                      color: AppCultureColors.textDark,
                    ),
                  ),
                ),
            ],
            decoration: InputDecoration(
              filled: true,
              fillColor: AppCultureColors.surface,
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 12,
                vertical: 12,
              ),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: AppCultureColors.border),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: AppCultureColors.border),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(
                  color: AppCultureColors.heritageJade,
                  width: 1.6,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ── 6. Thông tin liên hệ & xác nhận ───────────────────────────────────────

  Widget _buildContactSection() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppCultureColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Thông tin liên hệ',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w800,
              color: AppCultureColors.textDark,
            ),
          ),
          const SizedBox(height: 12),
          _buildInput(
            controller: _phoneController,
            hint: 'Số điện thoại',
            keyboardType: TextInputType.phone,
          ),
          const SizedBox(height: 10),
          _buildInput(
            controller: _emailController,
            hint: 'Email dự phòng',
            keyboardType: TextInputType.emailAddress,
          ),
          const SizedBox(height: 14),
          _buildAgreementCheckbox(),
        ],
      ),
    );
  }

  Widget _buildAgreementCheckbox() {
    return InkWell(
      onTap: () => setState(() => _agreed = !_agreed),
      borderRadius: BorderRadius.circular(10),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(
              width: 22,
              height: 22,
              child: Checkbox(
                value: _agreed,
                onChanged: (v) => setState(() => _agreed = v ?? false),
                activeColor: AppCultureColors.heritageJade,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(6),
                ),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.only(top: 2),
                child: Text(
                  'Tôi cam đoan các thông tin và bằng chứng cung cấp là sự thật, '
                  'đồng thời đã đọc và hiểu rõ chính sách hoàn tiền.',
                  style: const TextStyle(
                    fontSize: 12,
                    height: 1.4,
                    color: AppCultureColors.textDark,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── Widgets dùng chung ────────────────────────────────────────────────────

  /// Ô nhập có hint "in chìm" — khi người dùng nhập thì chỉ hiển thị nội dung
  /// họ nhập (hint tự động biến mất theo mặc định của Flutter).
  Widget _buildInput({
    required TextEditingController controller,
    required String hint,
    TextInputType? keyboardType,
  }) {
    return TextField(
      controller: controller,
      keyboardType: keyboardType,
      onChanged: (_) => setState(() {}),
      style: const TextStyle(fontSize: 13.5),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: const TextStyle(
          fontSize: 13,
          color: AppCultureColors.textLight,
        ),
        filled: true,
        fillColor: AppCultureColors.surface,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 12,
          vertical: 12,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppCultureColors.border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppCultureColors.border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(
            color: AppCultureColors.heritageJade,
            width: 1.6,
          ),
        ),
      ),
    );
  }

  Widget _buildErrorBox() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFFEF2F2),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFFECACA)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(
            Icons.error_outline_rounded,
            size: 16,
            color: AppCultureColors.error,
          ),
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
    );
  }

  Widget _buildSubmitButton() {
    return SizedBox(
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
    );
  }
}
