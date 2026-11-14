/// Màn Xác Nhận Lời Mời Tham Gia Tour — Mobile.
///
/// ── Bối cảnh ──
///  Lời mời được gửi qua EMAIL với deep link:
///      journeygo://booking/invitations/accept?token=TOKEN
///
///  ⇒ Mở link ⇒ app mở thẳng màn này (web KHÔNG có trang này vì web chỉ dành
///  cho admin / đối tác / moderator).
///
/// ── Luồng ──
///  1. Nạp thông tin lời mời: `GET /bookings/invitations/{token}`.
///  2. Người dùng xem thông tin (họ tên, email được mời, thời hạn).
///  3. Bấm "Xác nhận tham gia" → `POST /bookings/invitations/{token}/accept`.
///     ⚠️ Email đang đăng nhập PHẢI trùng email được mời (backend kiểm tra).
library;

import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';
import '../../core/services/api_client.dart';
import '../../core/services/booking_service.dart';
import '../../core/services/token_storage.dart';
import '../../core/utils/formatters.dart';
import '../bookings/my_bookings_screen.dart';

class InvitationAcceptScreen extends StatefulWidget {
  /// Token lời mời (từ deep link).
  final String token;

  const InvitationAcceptScreen({super.key, required this.token});

  @override
  State<InvitationAcceptScreen> createState() => _InvitationAcceptScreenState();
}

class _InvitationAcceptScreenState extends State<InvitationAcceptScreen> {
  final BookingService _bookingService = BookingService();

  Map<String, dynamic>? _invitation;
  bool _loading = true;
  bool _submitting = false;
  String _error = '';

  /// Đã đăng nhập hay chưa (ảnh hướng dẫn nút hành động).
  bool _loggedIn = false;

  /// Đã xác nhận thành công.
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

    final loggedIn = await TokenStorage.hasValidSession();

    try {
      final data = await _bookingService.previewInvitation(widget.token);
      if (!mounted) return;
      setState(() {
        _invitation = data;
        _loggedIn = loggedIn;
        _loading = false;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.message;
        _loggedIn = loggedIn;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'Không thể tải thông tin lời mời. Vui lòng thử lại.';
        _loggedIn = loggedIn;
        _loading = false;
      });
    }
  }

  Future<void> _accept() async {
    // Chưa đăng nhập → không thể xác nhận (backend yêu cầu token + email khớp).
    if (!await TokenStorage.hasValidSession()) {
      if (!mounted) return;
      setState(() {
        _error =
            'Vui lòng đăng nhập bằng email $_invitedEmail để xác nhận lời mời.';
        _submitting = false;
      });
      return;
    }

    setState(() {
      _submitting = true;
      _error = '';
    });

    try {
      final data = await _bookingService.acceptInvitation(widget.token);
      if (!mounted) return;

      // Xoá token chờ (nếu có) — lời mời đã dùng xong.
      await TokenStorage.clearPendingInvitationToken();

      setState(() {
        _invitation = data;
        _accepted = true;
        _submitting = false;
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
        _error = 'Không thể xác nhận lời mời. Vui lòng thử lại.';
        _submitting = false;
      });
    }
  }

  // ── Dữ liệu hiển thị ──────────────────────────────────────────────────────

  String get _passengerName => _invitation?['passengerName']?.toString() ?? '';

  String get _invitedEmail => _invitation?['invitedEmail']?.toString() ?? '';

  String get _status => _invitation?['status']?.toString() ?? '';

  DateTime? get _expiresAt {
    final raw = _invitation?['expiresAt']?.toString();
    if (raw == null || raw.isEmpty) return null;
    return DateTime.tryParse(raw);
  }

  bool get _usable => _invitation?['usable'] == true;

  bool get _expired => _status == 'EXPIRED' || _status == 'REVOKED';

  String get _statusLabel => switch (_status) {
        'PENDING' => 'Chờ xác nhận',
        'ACCEPTED' => 'Đã xác nhận',
        'EXPIRED' => 'Đã hết hạn',
        'REVOKED' => 'Đã bị thu hồi',
        _ => 'Chờ xác nhận',
      };

  Color get _statusColor => switch (_status) {
        'ACCEPTED' => AppCultureColors.success,
        'EXPIRED' || 'REVOKED' => AppCultureColors.error,
        _ => AppCultureColors.warning,
      };

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

    if (_error.isNotEmpty && _invitation == null) {
      return _buildErrorState();
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
    final title = _accepted
        ? 'Bạn đã tham gia tour!'
        : (_expired ? 'Lời mời không còn hiệu lực' : 'Bạn được mời tham gia tour');

    final subtitle = _accepted
        ? 'Hành khách đã được liên kết với đơn đặt tour.'
        : (_expired
            ? 'Lời mời đã hết hạn hoặc bị thu hồi. Vui lòng liên hệ người đặt tour để được gửi lại.'
            : 'Xác nhận lời mời để được cấp quyền tham gia tour cùng nhóm.');

    final icon = _accepted
        ? Icons.check_circle_rounded
        : (_expired ? Icons.error_outline_rounded : Icons.mail_outline_rounded);

    final iconColor = _accepted
        ? AppCultureColors.success
        : (_expired ? AppCultureColors.error : AppCultureColors.heritageJade);

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
              color: iconColor.withValues(alpha: 0.12),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, size: 34, color: iconColor),
          ),
          const SizedBox(height: 14),
          Text(
            title,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w800,
              color: AppCultureColors.textDark,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            subtitle,
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
          _infoRow(
            Icons.schedule_rounded,
            'Hiệu lực đến',
            _expiresAt == null ? '—' : formatDateTimeVn(_expiresAt),
          ),
          _infoRow(
            Icons.info_outline_rounded,
            'Trạng thái',
            _statusLabel,
            valueColor: _statusColor,
          ),
        ],
      ),
    );
  }

  Widget _infoRow(IconData icon, String label, String value, {Color? valueColor}) {
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
              style: TextStyle(
                fontSize: 13.5,
                fontWeight: FontWeight.w700,
                color: valueColor ?? AppCultureColors.textDark,
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
    if (_accepted) {
      return Column(
        children: [
          ElevatedButton.icon(
            onPressed: _openMyBookings,
            icon: const Icon(Icons.confirmation_number_outlined),
            label: const Text('Xem đơn của tôi'),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppCultureColors.heritageJade,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 15),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            ),
          ),
          const SizedBox(height: 10),
          TextButton(
            onPressed: () => Navigator.of(context).maybePop(),
            child: const Text('Đóng'),
          ),
        ],
      );
    }

    final enabled = _usable && !_submitting;

    return Column(
      children: [
        ElevatedButton.icon(
          onPressed: enabled ? _accept : null,
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
        if (!_loggedIn && _usable) ...[
          const SizedBox(height: 10),
          TextButton.icon(
            onPressed: _goToLogin,
            icon: const Icon(Icons.login_rounded, size: 18),
            label: const Text('Đăng nhập để xác nhận'),
            style: TextButton.styleFrom(foregroundColor: AppCultureColors.heritageJade),
          ),
        ],
      ],
    );
  }

  /// Mở màn đăng nhập (pop về màn gốc đang là màn đăng nhập).
  void _goToLogin() {
    Navigator.of(context).popUntil((route) => route.isFirst);
  }

  /// Mở danh sách đơn của tôi.
  void _openMyBookings() {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const MyBookingsScreen()),
    );
  }

  Widget _buildErrorState() {
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
                color: AppCultureColors.error.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.link_off_rounded,
                size: 34,
                color: AppCultureColors.error,
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'Không tìm thấy lời mời',
              style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 8),
            Text(
              _error.isEmpty
                  ? 'Lời mời không tồn tại hoặc đã hết hạn.'
                  : _error,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 13.5, color: AppCultureColors.textMuted),
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
}
