import 'dart:async';

import 'token_storage.dart';
import '../../l10n/locale_controller.dart';

/// Báo "phiên đăng nhập đã hết hạn" cho toàn app.
///
/// ── Luồng ──
///  1. `ApiClient` gặp 401 và refresh token thất bại ⇒ gọi [SessionExpiry.expire].
///  2. [expire] ghi nhớ tài khoản đang dùng, xóa phiên, phát sự kiện trên [events].
///  3. `JourneyGoTouristApp` nghe [events] ⇒ mở màn đăng nhập ĐÈ lên màn hiện tại;
///     đăng nhập lại đúng tài khoản cũ thì quay về đúng màn đang xem (không về Trang chủ).
class SessionExpiry {
  SessionExpiry._();

  /// Câu báo dùng chung khi hết phiên.
  static String get message => appL10n.sessionExpired;

  static final StreamController<int?> _controller =
      StreamController<int?>.broadcast();

  /// Phát id tài khoản vừa hết phiên (null nếu không đọc được).
  static Stream<int?> get events => _controller.stream;

  static bool _expiring = false;

  /// Xóa phiên hiện tại và báo cho app mở màn đăng nhập lại.
  /// Nhiều request cùng hết phiên một lúc chỉ phát MỘT sự kiện.
  static Future<void> expire() async {
    if (_expiring) return;
    _expiring = true;
    try {
      final user = await TokenStorage.getUser();
      final token = await TokenStorage.getAccessToken();
      await TokenStorage.clear();
      // Đã đăng xuất từ trước (không còn phiên) ⇒ không cần mở lại màn đăng nhập.
      if (user == null && (token == null || token.isEmpty)) return;
      _controller.add(user?.id);
    } finally {
      _expiring = false;
    }
  }
}
