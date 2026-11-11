/// Vỏ bọc xử lý deep link lời mời tham gia tour.
///
/// ── Vì sao cần? ──
///  Lời mời được gửi qua email với link `journeygo://booking/invitations/accept?token=...`.
///  Khi khách bấm link trên điện thoại ⇒ hệ điều mở app JourneyGo.
///
/// ── Luồng ──
///  • Đã đăng nhập  → mở màn [InvitationAcceptScreen] ngay.
///  • Chưa đăng nhập → nhớ token vào [TokenStorage], bảo khách đăng nhập;
///    sau khi đăng nhập xong, màn HOME sẽ tự mở màn xác nhận lời mời.
///
/// ── Vì sao đặt ở `MaterialApp.builder` mà không phải `home`? ──
///  `home` là ROUTE GỐC. Khi khách đăng nhập xong, màn đăng nhập gọi
///  `Navigator.pushReplacement` ⇒ route gốc bị THAY ⇒ mọi widget bọc trong
///  `home` đều bị dispose ⇒ mất listener deep link.
///
///  `MaterialApp.builder` nằm NGOÀI Navigator nên sống suốt vòng đời app.
library;

import 'dart:async';

import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';
import '../../core/services/invitation_deep_link_service.dart';
import '../../core/services/token_storage.dart';
import 'invitation_accept_screen.dart';

class InvitationDeepLinkHost extends StatefulWidget {
  final Widget child;

  /// Navigator gốc — dùng để mở màn xác nhận lời mời từ ngoài Navigator.
  final GlobalKey<NavigatorState> navigatorKey;

  /// ScaffoldMessenger gốc — dùng để hiện thông báo "vui lòng đăng nhập".
  final GlobalKey<ScaffoldMessengerState> scaffoldMessengerKey;

  const InvitationDeepLinkHost({
    super.key,
    required this.child,
    required this.navigatorKey,
    required this.scaffoldMessengerKey,
  });

  @override
  State<InvitationDeepLinkHost> createState() => _InvitationDeepLinkHostState();
}

class _InvitationDeepLinkHostState extends State<InvitationDeepLinkHost> {
  final InvitationDeepLinkService _service = InvitationDeepLinkService();
  StreamSubscription<InvitationDeepLink>? _sub;

  @override
  void initState() {
    super.initState();
    _sub = _service.links.listen(_handleLink);
  }

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }

  Future<void> _handleLink(InvitationDeepLink link) async {
    if (!mounted) return;

    // Đăng nhập rồi → mở màn xác nhận ngay.
    if (await TokenStorage.hasValidSession()) {
      if (!mounted) return;
      _openInvitation(link.token);
      return;
    }

    // Chưa đăng nhập → nhớ token, bảo khách đăng nhập trước.
    await TokenStorage.savePendingInvitationToken(link.token);
    if (!mounted) return;
    _showLoginRequired();
  }

  /// Mở màn xác nhận lời mời.
  ///
  /// Navigator có thể chưa sẵn sàng (app vừa khởi động từ deep link) ⇒ thử lại ở
  /// frame sau nếu chưa có `currentState`.
  void _openInvitation(String token, {int retry = 0}) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final navigator = widget.navigatorKey.currentState;
      if (navigator == null) {
        if (retry < 10) {
          _openInvitation(token, retry: retry + 1);
        }
        return;
      }
      navigator.push(
        MaterialPageRoute(
          builder: (_) => InvitationAcceptScreen(token: token),
        ),
      );
    });
  }

  void _showLoginRequired() {
    // Đợi 1 frame để chắc chắn Scaffold của màn hiện tại đã đăng ký với
    // ScaffoldMessenger (nếu không, snackbar sẽ bị "treo" không hiện).
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final messenger = widget.scaffoldMessengerKey.currentState;
      if (messenger == null) return;
      messenger
        ..clearSnackBars()
        ..showSnackBar(
          SnackBar(
            behavior: SnackBarBehavior.floating,
            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
            backgroundColor: AppCultureColors.heritageJade,
            content: const Text(
              'Bạn được mời tham gia tour. Vui lòng đăng nhập để xác nhận lời mời.',
              style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
            ),
            duration: const Duration(seconds: 5),
          ),
        );
    });
  }

  @override
  Widget build(BuildContext context) {
    return widget.child;
  }
}

/// Mở màn xác nhận lời mời nếu đang có token chờ (sau khi đăng nhập).
///
/// Gọi từ màn HOME sau khi đăng nhập xong. Nếu không có token chờ ⇒ không làm gì.
///
/// Token KHÔNG bị xoá ở đây: chỉ xoá khi lời mời được xác nhận thành công
/// (xem `InvitationAcceptScreen`) ⇒ nếu khách bấm back thì lời mời vẫn còn.
Future<void> openPendingInvitationIfAny(BuildContext context) async {
  final token = await TokenStorage.getPendingInvitationToken();
  if (token == null || token.isEmpty) return;
  if (!context.mounted) return;

  await Navigator.of(context, rootNavigator: true).push(
    MaterialPageRoute(
      builder: (_) => InvitationAcceptScreen(token: token),
    ),
  );
}
