/// Xử lý deep link lời mời tham gia tour.
///
/// ── Bối cảnh ──
///  Lời mời tham gia tour được gửi qua EMAIL với link dạng CUSTOM SCHEME:
///
///      journeygo://booking/invitations/accept?token=<token>
///
///  ⇒ Mở link trên điện thoại sẽ mở thẳng ứng dụng JourneyGo (không cần web).
///  Đây là cách DUY NHẤT vì web chỉ phục vụ admin / đối tác / moderator,
///  không có trang xác nhận lời mời cho du khách.
///
/// ── Vì sao cần BUFFER deep link ban đầu? ──
///  `init()` đọc deep link đầu tiên (`getInitialLink`) — nhưng lúc đó thường CHƯA có
///  listener nào đăng ký (app vừa được hệ điều mở). `StreamController.broadcast`
///  DROP mọi event phát ra trước khi có listener ⇒ deep link đó bị mất.
///
///  ⇒ Ta giữ deep link đó lại và PHÁT LẠI ngay khi listener đầu tiên đăng ký.
library;

import 'dart:async';

import 'package:app_links/app_links.dart';
import 'package:flutter/foundation.dart';

/// Một deep link lời mời đã được phân tích.
class InvitationDeepLink {
  /// Token lời mời (truyền trong query string).
  final String token;

  const InvitationDeepLink({required this.token});
}

/// Lắng nghe deep link lời mời tham gia tour.
class InvitationDeepLinkService {
  static final InvitationDeepLinkService _instance = InvitationDeepLinkService._internal();
  factory InvitationDeepLinkService() => _instance;
  InvitationDeepLinkService._internal();

  final AppLinks _appLinks = AppLinks();
  StreamSubscription<Uri>? _subscription;

  StreamController<InvitationDeepLink>? _controller;

  /// Deep link nhận được khi CHƯA có listener ⇒ giữ lại, phát lại khi có listener.
  InvitationDeepLink? _pendingLink;

  StreamController<InvitationDeepLink> get _streamController {
    return _controller ??= StreamController<InvitationDeepLink>.broadcast(
      onListen: _flushPendingLink,
    );
  }

  /// Deep link lời mời mới nhận được (để màn hình xử lý).
  Stream<InvitationDeepLink> get links => _streamController.stream;

  /// Bắt đầu lắng nghe. Gọi 1 lần khi app khởi động.
  Future<void> init() async {
    // Deep link có thể đã được mở TRƯỚC khi app chạy (app bị kill rồi user bấm link).
    try {
      final initial = await _appLinks.getInitialLink();
      if (initial != null) {
        _emit(initial);
      }
    } catch (e) {
      debugPrint('[InvitationDeepLink] Không đọc được deep link ban đầu: $e');
    }

    _subscription ??= _appLinks.uriLinkStream.listen(
          _emit,
          onError: (Object e) => debugPrint('[InvitationDeepLink] Lỗi deep link: $e'),
        );
  }

  void dispose() {
    _subscription?.cancel();
    _subscription = null;
    _controller?.close();
    _controller = null;
  }

  /// Phân tích URI thành [InvitationDeepLink] (null nếu không phải deep link lời mời).
  ///
  /// Chấp nhận:
  ///  • `journeygo://booking/invitations/accept?token=...`
  ///  • `journeygo:///booking/invitations/accept?token=...`
  static InvitationDeepLink? parse(Uri? uri) {
    if (uri == null) return null;

    // ⚠️ Không nhận URL web (http/https) làm deep link lời mời.
    final isWebScheme = uri.scheme == 'http' || uri.scheme == 'https';
    if (isWebScheme) return null;

    // Gộp host + path để xử lý được cả 2 dạng (có/không có host).
    final segments = <String>[
      if (uri.host.isNotEmpty) uri.host.toLowerCase(),
      ...uri.pathSegments.map((e) => e.toLowerCase()),
    ];

    final isInvitation = segments.contains('booking') &&
        segments.contains('invitations') &&
        segments.contains('accept');
    if (!isInvitation) return null;

    final token = uri.queryParameters['token'];
    if (token == null || token.trim().isEmpty) return null;

    return InvitationDeepLink(token: token.trim());
  }

  void _emit(Uri uri) {
    final parsed = parse(uri);
    if (parsed == null) return;

    final controller = _streamController;
    if (controller.isClosed) return;

    // Chưa có listener ⇒ GIữ lại, phát lại khi listener đầu tiên đăng ký.
    if (!controller.hasListener) {
      _pendingLink = parsed;
      return;
    }
    controller.add(parsed);
  }

  /// Phát lại deep link đã giữ khi listener đầu tiên đăng ký.
  void _flushPendingLink() {
    final pending = _pendingLink;
    if (pending == null) return;
    _pendingLink = null;

    final controller = _controller;
    if (controller == null || controller.isClosed) return;

    // Phát ở microtask kế tiếp để chắc chắn listener đã đăng ký xong.
    scheduleMicrotask(() {
      if (controller.isClosed) return;
      controller.add(pending);
    });
  }
}
