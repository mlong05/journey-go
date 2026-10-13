import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../core/models/auth_models.dart';
import '../core/services/auth_service.dart';
import '../core/services/token_storage.dart';
import '../tourist_auth_screen.dart';

class TouristHomeScreen extends StatefulWidget {
  final UserModel initialUser;

  const TouristHomeScreen({
    super.key,
    required this.initialUser,
  });

  @override
  State<TouristHomeScreen> createState() => _TouristHomeScreenState();
}

class _TouristHomeScreenState extends State<TouristHomeScreen> {
  final AuthService _authService = AuthService();

  late UserModel _currentUser;
  String? _accessToken;
  String? _refreshToken;
  DateTime? _issuedAt;
  String _currentBaseUrl = '';

  bool _isRefreshing = false;
  bool _isVerifying = false;
  bool _isLoggingOut = false;

  @override
  void initState() {
    super.initState();
    _currentUser = widget.initialUser;
    _loadSessionData();
  }

  Future<void> _loadSessionData() async {
    final aToken = await TokenStorage.getAccessToken();
    final rToken = await TokenStorage.getRefreshToken();
    final time = await TokenStorage.getTokenIssuedAt();
    final url = await TokenStorage.getBaseUrl();

    if (mounted) {
      setState(() {
        _accessToken = aToken;
        _refreshToken = rToken;
        _issuedAt = time;
        _currentBaseUrl = url;
      });
    }
  }

  // Thao tác: Gọi API Refresh Token
  Future<void> _handleRefreshToken() async {
    setState(() {
      _isRefreshing = true;
    });

    try {
      await _authService.refreshToken();
      await _loadSessionData();

      if (!mounted) return;
      _showFeedback(
        title: 'Cấp mới token thành công!',
        message:
            'Access Token mới đã được cấp và lưu an toàn qua /api/v1/auth/refresh.',
        isSuccess: true,
      );
    } catch (e) {
      if (!mounted) return;
      _showFeedback(
        title: 'Làm mới token thất bại',
        message: e.toString().replaceAll('Exception: ', ''),
        isSuccess: false,
      );
    } finally {
      if (mounted) {
        setState(() {
          _isRefreshing = false;
        });
      }
    }
  }

  // Thao tác: Kiểm tra hồ sơ cá nhân qua Bearer Token
  Future<void> _handleVerifyMe() async {
    setState(() {
      _isVerifying = true;
    });

    try {
      final updatedUser = await _authService.getCurrentUser();
      if (!mounted) return;

      setState(() {
        _currentUser = updatedUser;
      });

      _showFeedback(
        title: 'Xác thực thành công (/api/v1/auth/me)',
        message:
            'Bearer Token hợp lệ. Dữ liệu tài khoản của du khách đã được đồng bộ mới nhất.',
        isSuccess: true,
      );
    } catch (e) {
      if (!mounted) return;
      _showFeedback(
        title: 'Xác thực không thành công',
        message: e.toString().replaceAll('Exception: ', ''),
        isSuccess: false,
      );
    } finally {
      if (mounted) {
        setState(() {
          _isVerifying = false;
        });
      }
    }
  }

  // Thao tác: Đăng xuất với POST /api/v1/auth/logout
  Future<void> _handleLogout() async {
    final bool? confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Row(
          children: [
            Icon(Icons.logout_rounded, color: AppCultureColors.error),
            SizedBox(width: 10),
            Text(
              'Xác nhận đăng xuất',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: AppCultureColors.textDark,
              ),
            ),
          ],
        ),
        content: const Text(
          'Phiên làm việc hiện tại sẽ bị hủy trên máy chủ (POST /api/v1/auth/logout) và toàn bộ token trên thiết bị sẽ được xóa an toàn.',
          style: TextStyle(fontSize: 14, color: AppCultureColors.textMuted),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Hủy', style: TextStyle(color: AppCultureColors.textMuted)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppCultureColors.error,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            child: const Text('Đăng xuất ngay'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    setState(() {
      _isLoggingOut = true;
    });

    try {
      await _authService.logout();
    } catch (_) {
      // Dọn sạch cục bộ dù mạng có trục trặc
    }

    if (!mounted) return;

    // Điều hướng về màn hình đăng nhập
    Navigator.pushAndRemoveUntil(
      context,
      MaterialPageRoute(builder: (_) => const TouristAuthScreen()),
      (route) => false,
    );
  }

  void _showFeedback({
    required String title,
    required String message,
    required bool isSuccess,
  }) {
    ScaffoldMessenger.of(context).clearSnackBars();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        behavior: SnackBarBehavior.floating,
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        content: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          decoration: BoxDecoration(
            color: isSuccess ? AppCultureColors.heritageJade : AppCultureColors.error,
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: (isSuccess ? AppCultureColors.heritageJade : AppCultureColors.error)
                    .withValues(alpha: 0.35),
                blurRadius: 18,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: Row(
            children: [
              Icon(
                isSuccess ? Icons.check_circle_rounded : Icons.error_outline_rounded,
                color: Colors.white,
                size: 24,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                        fontSize: 14,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      message,
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w400,
                        fontSize: 12.5,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _copyToClipboard(String text, String label) {
    Clipboard.setData(ClipboardData(text: text));
    _showFeedback(
      title: 'Đã sao chép $label',
      message: 'Nội dung token đã được lưu vào bộ nhớ tạm.',
      isSuccess: true,
    );
  }

  String _maskToken(String? token) {
    if (token == null || token.isEmpty) return 'Chưa có token';
    if (token.length <= 24) return token;
    return '${token.substring(0, 14)}...${token.substring(token.length - 10)}';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppCultureColors.surface,
      appBar: AppBar(
        backgroundColor: AppCultureColors.heritageJade,
        elevation: 0,
        centerTitle: false,
        title: const Row(
          children: [
            Icon(Icons.temple_buddhist_rounded, color: Colors.white, size: 24),
            SizedBox(width: 10),
            Text(
              'Journey Go Tourist',
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w800,
                fontSize: 18,
                letterSpacing: 0.3,
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'Đăng xuất',
            onPressed: _isLoggingOut ? null : _handleLogout,
            icon: _isLoggingOut
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      color: Colors.white,
                      strokeWidth: 2,
                    ),
                  )
                : const Icon(Icons.logout_rounded, color: Colors.white),
          ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 1. Thẻ Chào mừng & Thông tin người dùng
              _buildUserProfileCard(),
              const SizedBox(height: 18),

              // 2. Thẻ Thông tin Token & Bảo mật JWT
              _buildTokenSecurityCard(),
              const SizedBox(height: 18),

              // 3. Thẻ Các thao tác API Xác thực
              _buildApiActionsCard(),
              const SizedBox(height: 18),

              // 4. Server Endpoint Info
              _buildServerConfigCard(),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  // WIDGET 1: USER PROFILE CARD
  Widget _buildUserProfileCard() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppCultureColors.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          Row(
            children: [
              // Avatar
              Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [
                      AppCultureColors.heritageJade,
                      AppCultureColors.oceanBlue,
                    ],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: AppCultureColors.heritageJade.withValues(alpha: 0.3),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Center(
                  child: Text(
                    _currentUser.fullName.isNotEmpty
                        ? _currentUser.fullName[0].toUpperCase()
                        : 'U',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 26,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            _currentUser.fullName,
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w800,
                              color: AppCultureColors.textDark,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 3,
                          ),
                          decoration: BoxDecoration(
                            color: AppCultureColors.jadeLight,
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: const Text(
                            'Đang hoạt động',
                            style: TextStyle(
                              color: AppCultureColors.heritageJade,
                              fontSize: 10.5,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      _currentUser.email,
                      style: const TextStyle(
                        fontSize: 13,
                        color: AppCultureColors.textMuted,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 8),
                    // Role Badge
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: AppCultureColors.heritageJade.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: AppCultureColors.heritageJade.withValues(alpha: 0.3),
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(
                            Icons.verified_user_rounded,
                            size: 14,
                            color: AppCultureColors.heritageJade,
                          ),
                          const SizedBox(width: 6),
                          Text(
                            'Vai trò: ${_currentUser.role} (Khách du lịch)',
                            style: const TextStyle(
                              color: AppCultureColors.heritageJade,
                              fontWeight: FontWeight.w700,
                              fontSize: 11.5,
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
          if (_currentUser.phone != null && _currentUser.phone!.isNotEmpty) ...[
            const Divider(height: 28, color: AppCultureColors.border),
            Row(
              children: [
                const Icon(
                  Icons.phone_iphone_rounded,
                  size: 16,
                  color: AppCultureColors.textMuted,
                ),
                const SizedBox(width: 8),
                Text(
                  'Số điện thoại: ${_currentUser.phone}',
                  style: const TextStyle(
                    fontSize: 13,
                    color: AppCultureColors.textDark,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  // WIDGET 2: TOKEN & JWT SECURITY CARD
  Widget _buildTokenSecurityCard() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppCultureColors.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(
                Icons.shield_rounded,
                color: AppCultureColors.oceanBlue,
                size: 22,
              ),
              SizedBox(width: 10),
              Text(
                'Bảo mật & Phiên làm việc (JWT)',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: AppCultureColors.textDark,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // Access Token Box
          _buildTokenRow(
            label: 'Access Token (Thời hạn 15 phút)',
            token: _accessToken,
            isAccess: true,
          ),
          const SizedBox(height: 12),

          // Refresh Token Box
          _buildTokenRow(
            label: 'Refresh Token (Thời hạn 7 ngày)',
            token: _refreshToken,
            isAccess: false,
          ),
          const SizedBox(height: 12),

          if (_issuedAt != null)
            Row(
              children: [
                const Icon(
                  Icons.access_time_rounded,
                  size: 14,
                  color: AppCultureColors.textMuted,
                ),
                const SizedBox(width: 6),
                Text(
                  'Cấp lần cuối: ${_issuedAt!.hour.toString().padLeft(2, '0')}:${_issuedAt!.minute.toString().padLeft(2, '0')}:${_issuedAt!.second.toString().padLeft(2, '0')} ngày ${_issuedAt!.day}/${_issuedAt!.month}/${_issuedAt!.year}',
                  style: const TextStyle(
                    fontSize: 11.5,
                    color: AppCultureColors.textMuted,
                  ),
                ),
              ],
            ),
        ],
      ),
    );
  }

  Widget _buildTokenRow({
    required String label,
    required String? token,
    required bool isAccess,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: AppCultureColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppCultureColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                label,
                style: const TextStyle(
                  fontSize: 11.5,
                  fontWeight: FontWeight.w600,
                  color: AppCultureColors.textMuted,
                ),
              ),
              if (token != null && token.isNotEmpty)
                InkWell(
                  onTap: () => _copyToClipboard(token, label),
                  borderRadius: BorderRadius.circular(6),
                  child: const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.copy_rounded,
                          size: 13,
                          color: AppCultureColors.oceanBlue,
                        ),
                        SizedBox(width: 4),
                        Text(
                          'Sao chép',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: AppCultureColors.oceanBlue,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 4),
          SelectableText(
            _maskToken(token),
            style: const TextStyle(
              fontSize: 12.5,
              fontWeight: FontWeight.w600,
              fontFamily: 'monospace',
              color: AppCultureColors.textDark,
            ),
          ),
        ],
      ),
    );
  }

  // WIDGET 3: API ACTIONS CARD
  Widget _buildApiActionsCard() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppCultureColors.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(
                Icons.api_rounded,
                color: AppCultureColors.heritageJade,
                size: 22,
              ),
              SizedBox(width: 10),
              Text(
                'Thao tác API Xác thực',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: AppCultureColors.textDark,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // Action 1: Refresh Token Button
          SizedBox(
            width: double.infinity,
            height: 48,
            child: ElevatedButton.icon(
              onPressed: _isRefreshing ? null : _handleRefreshToken,
              icon: _isRefreshing
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Icon(Icons.refresh_rounded, size: 20),
              label: Text(
                _isRefreshing
                    ? 'Đang làm mới token...'
                    : 'Làm mới Access Token (/api/v1/auth/refresh)',
                style: const TextStyle(
                  fontWeight: FontWeight.w700,
                  fontSize: 13,
                ),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppCultureColors.heritageJade,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                elevation: 0,
              ),
            ),
          ),
          const SizedBox(height: 12),

          // Action 2: Verify Bearer Token (/api/v1/auth/me)
          SizedBox(
            width: double.infinity,
            height: 48,
            child: OutlinedButton.icon(
              onPressed: _isVerifying ? null : _handleVerifyMe,
              icon: _isVerifying
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: AppCultureColors.oceanBlue,
                      ),
                    )
                  : const Icon(Icons.verified_user_outlined, size: 20),
              label: Text(
                _isVerifying
                    ? 'Đang kiểm tra...'
                    : 'Kiểm tra hồ sơ cá nhân (/api/v1/auth/me)',
                style: const TextStyle(
                  fontWeight: FontWeight.w700,
                  fontSize: 13,
                ),
              ),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppCultureColors.oceanBlue,
                side: const BorderSide(color: AppCultureColors.oceanBlue, width: 1.5),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ),
          const SizedBox(height: 12),

          // Action 3: Logout Button
          SizedBox(
            width: double.infinity,
            height: 48,
            child: OutlinedButton.icon(
              onPressed: _isLoggingOut ? null : _handleLogout,
              icon: _isLoggingOut
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: AppCultureColors.error,
                      ),
                    )
                  : const Icon(Icons.logout_rounded, size: 20),
              label: Text(
                _isLoggingOut
                    ? 'Đang đăng xuất...'
                    : 'Đăng xuất khỏi hệ thống (/api/v1/auth/logout)',
                style: const TextStyle(
                  fontWeight: FontWeight.w700,
                  fontSize: 13,
                ),
              ),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppCultureColors.error,
                side: const BorderSide(color: AppCultureColors.error, width: 1.5),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // WIDGET 4: SERVER CONFIG CARD
  Widget _buildServerConfigCard() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppCultureColors.border),
      ),
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppCultureColors.surfaceSubtle,
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(
              Icons.dns_rounded,
              size: 20,
              color: AppCultureColors.textMuted,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Máy chủ Backend:',
                  style: TextStyle(
                    fontSize: 11,
                    color: AppCultureColors.textMuted,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                Text(
                  _currentBaseUrl.isNotEmpty ? _currentBaseUrl : 'Đang tải...',
                  style: const TextStyle(
                    fontSize: 12.5,
                    color: AppCultureColors.textDark,
                    fontWeight: FontWeight.w700,
                    fontFamily: 'monospace',
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
