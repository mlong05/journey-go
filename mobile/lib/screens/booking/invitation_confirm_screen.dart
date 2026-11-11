/// Màn Xác Nhận Lời Mời Tham Gia Tour — theo ID (không cần deep link).
///
/// ── Bối cảnh ──
///  Lời mời được gửi qua EMAIL kèm deep link `journeygo://...`. Ở môi trường
///  phát triển (hoặc khi deep link không được cấu hình) nút "Mở JourneyGo" trong
///  email không hoạt động ⇒ người được mời không xác nhận được.
///
///  ⇒ Khi người được mời đăng ký / đăng nhập bằng đúng email, backend đưa lời
///  mời vào TRUNG TÂM THÔNG BÁO của app. Bấm vào thông báo đó sẽ mở màn này để
///  xác nhận — hoàn toàn trong app, không cần deep link.
///
/// ── Luồng ──
///  1. Nạp danh sách lời mời đang chờ: `GET /bookings/my-invitations`.
///  2. Chọn đúng lời mời (theo `invitationId` truyền vào) để xem chi tiết.
///  3. Bấm "Xác nhận tham gia" → `POST /bookings/my-invitations/{id}/confirm`.
///     ⚠️ Email đang đăng nhập PHẢI trùng email được mời (backend kiểm tra).
library;

import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';
import '../../core/services/api_client.dart';
import '../../core/services/booking_service.dart';
import '../../core/utils/formatters.dart';
import '../bookings/my_bookings_screen.dart';

class InvitationConfirmScreen extends StatefulWidget {
  /// ID lời mời cần xác nhận (lấy từ thông báo trong app).
  final int? invitationId;

  const InvitationConfirmScreen({super.key, this.invitationId});

  @override
  State<InvitationConfirmScreen> createState() => _InvitationConfirmScreenState();
}

class _InvitationConfirmScreenState extends State<InvitationConfirmScreen> {
  final BookingService _bookingService = BookingService();

  List<Map<String, dynamic>> _invitations = const [];
  bool _loading = true;
  bool _submitting = false;
  String _error = '';
  bool _accepted = false;

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
      final list = await _bookingService.getMyPendingInvitations();
      if (!mounted) return;
      setState(() {
        _invitations = list;
        _loading = false;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.message;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'Không tải được danh sách lời mời. Vui lòng thử lại.';
        _loading = false;
      });
    }
  }

  /// Lời mời đang được xem (theo id truyền vào, nếu có).
  Map<String, dynamic>? get _current {
    if (_invitations.isEmpty) return null;
    final id = widget.invitationId;
    if (id == null) return _invitations.first;
    for (final inv in _invitations) {
      if ((inv['id'] as num?)?.toInt() == id) return inv;
    }
    return null;
  }

  Future<void> _confirm() async {
    final inv = _current;
    if (inv == null || _submitting) return;
    final id = (inv['id'] as num?)?.toInt();
    if (id == null) return;

    setState(() {
      _submitting = true;
      _error = '';
    });
    try {
      await _bookingService.confirmInvitation(id);
      if (!mounted) return;
      setState(() {
        _accepted = true;
        _submitting = false;
        _invitations = _invitations.where((e) => (e['id'] as num?)?.toInt() != id).toList();
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.message;
        _submitting = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'Không xác nhận được lời mời. Vui lòng thử lại.';
        _submitting = false;
      });
    }
  }

  // ── Dữ liệu hiển thị ──────────────────────────────────────────────────────

  String get _passengerName => _current?['passengerName']?.toString() ?? '';

  String get _invitedEmail => _current?['invitedEmail']?.toString() ?? '';

  String get _inviterName {
    final raw = _current?['inviterName']?.toString();
    if (raw == null || raw.isEmpty) return 'Người đặt tour';
    return raw;
  }

  String get _tourTitle {
    final raw = _current?['tourTitle']?.toString();
    if (raw == null || raw.isEmpty) return 'Tour';
    return raw;
  }

  String get _experienceDate {
    final raw = _current?['experienceDate']?.toString();
    if (raw == null || raw.isEmpty) return '—';
    final parsed = DateTime.tryParse(raw);
    if (parsed == null) return raw;
    return '${parsed.day.toString().padLeft(2, '0')}/${parsed.month.toString().padLeft(2, '0')}/${parsed.year}';
  }

  DateTime? get _expiresAt {
    final raw = _current?['expiresAt']?.toString();
    if (raw == null || raw.isEmpty) return null;
    return DateTime.tryParse(raw);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppCultureColors.background,
      appBar: AppBar(
        title: const Text(
          'Lời mời tham gia tour',
          style: TextStyle(fontWeight: FontWeight.w700),
        ),
        backgroundColor: AppCultureColors.heritageJade,
        foregroundColor: Colors.white,
        elevation: 0,
        centerTitle: true,
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_accepted) {
      return _buildAcceptedState();
    }

    if (_invitations.isEmpty) {
      return _buildEmptyState();
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _buildHeroCard(),
          const SizedBox(height: 16),
          _buildInfoCard(),
          const SizedBox(height: 16),
          if (_error.isNotEmpty) ...[
            _buildInlineError(),
            const SizedBox(height: 16),
          ],
          _buildActionButton(),
        ],
      ),
    );
  }

  Widget _buildHeroCard() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppCultureColors.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppCultureColors.border),
        boxShadow: [
          BoxShadow(
            color: AppCultureColors.heritageJade.withValues(alpha: 0.08),
            blurRadius: 18,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        children: [
          Container(
            width: 68,
            height: 68,
            decoration: BoxDecoration(
              color: AppCultureColors.heritageJade.withValues(alpha: 0.12),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.mail_outline_rounded, size: 34, color: AppCultureColors.heritageJade),
          ),
          const SizedBox(height: 14),
          Text(
            'Bạn được mời tham gia tour',
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w800,
              color: AppCultureColors.textDark,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            '$_inviterName đã mời bạn vào tour $_tourTitle. Xác nhận lời mời để được cấp quyền tham gia tour cùng nhóm.',
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 13.5,
              height: 1.5,
              color: AppCultureColors.textMuted,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoCard() {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppCultureColors.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppCultureColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'THÔNG TIN LỜI MỜI',
            style: TextStyle(
              fontSize: 11.5,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.8,
              color: AppCultureColors.textMuted,
            ),
          ),
          const SizedBox(height: 14),
          _infoRow(Icons.person_outline_rounded, 'Hành khách', _passengerName),
          _infoRow(Icons.alternate_email_rounded, 'Email được mời', _invitedEmail),
          _infoRow(Icons.map_outlined, 'Tour', _tourTitle),
          _infoRow(Icons.event_outlined, 'Ngày trải nghiệm', _experienceDate),
          _infoRow(
            Icons.schedule_rounded,
            'Hiệu lực đến',
            _expiresAt == null ? '—' : formatDateTimeVn(_expiresAt),
          ),
        ],
      ),
    );
  }

  Widget _infoRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 18, color: AppCultureColors.textLight),
          const SizedBox(width: 10),
          SizedBox(
            width: 116,
            child: Text(
              label,
              style: const TextStyle(fontSize: 13, color: AppCultureColors.textMuted),
            ),
          ),
          Expanded(
            child: Text(
              value.isEmpty ? '—' : value,
              style: const TextStyle(
                fontSize: 13.5,
                fontWeight: FontWeight.w700,
                color: AppCultureColors.textDark,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInlineError() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppCultureColors.error.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppCultureColors.error.withValues(alpha: 0.25)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.error_outline_rounded, size: 20, color: AppCultureColors.error),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              _error,
              style: const TextStyle(fontSize: 13, color: AppCultureColors.textDark),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionButton() {
    return Column(
      children: [
        ElevatedButton.icon(
          onPressed: _submitting ? null : _confirm,
          icon: _submitting
              ? const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                )
              : const Icon(Icons.how_to_reg_rounded),
          label: Text(_submitting ? 'Đang xác nhận...' : 'Xác nhận tham gia'),
          style: ElevatedButton.styleFrom(
            backgroundColor: AppCultureColors.heritageJade,
            foregroundColor: Colors.white,
            disabledBackgroundColor: AppCultureColors.border,
            disabledForegroundColor: AppCultureColors.textLight,
            padding: const EdgeInsets.symmetric(vertical: 15),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          ),
        ),
      ],
    );
  }

  Widget _buildAcceptedState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                color: AppCultureColors.success.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.check_circle_rounded, size: 34, color: AppCultureColors.success),
            ),
            const SizedBox(height: 16),
            const Text(
              'Bạn đã tham gia tour!',
              style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 8),
            const Text(
              'Hành khách đã được liên kết với đơn đặt tour. Bạn có thể xem chi tiết booking và truy cập tour.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 13.5, height: 1.45, color: AppCultureColors.textMuted),
            ),
            const SizedBox(height: 22),
            ElevatedButton.icon(
              onPressed: _openMyBookings,
              icon: const Icon(Icons.confirmation_number_outlined),
              label: const Text('Xem đơn của tôi'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppCultureColors.heritageJade,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 13),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
            ),
            const SizedBox(height: 10),
            TextButton(
              onPressed: () => Navigator.of(context).maybePop(),
              child: const Text('Đóng'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                color: AppCultureColors.textLight.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.mail_outline_rounded, size: 34, color: AppCultureColors.textLight),
            ),
            const SizedBox(height: 16),
            const Text(
              'Không còn lời mời nào',
              style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 8),
            Text(
              _error.isEmpty
                  ? 'Bạn không có lời mời tham gia tour nào đang chờ xác nhận.'
                  : _error,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 13.5, height: 1.45, color: AppCultureColors.textMuted),
            ),
            const SizedBox(height: 22),
            OutlinedButton.icon(
              onPressed: _load,
              icon: const Icon(Icons.refresh_rounded),
              label: const Text('Thử lại'),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppCultureColors.heritageJade,
                side: const BorderSide(color: AppCultureColors.heritageJade),
                padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 12),
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Mở danh sách đơn của tôi (gồm cả booking được mời).
  void _openMyBookings() {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const MyBookingsScreen()),
    );
  }
}
