import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/auth_models.dart';
import 'server_finder.dart';

/// Lưu trữ phiên đăng nhập.
///
/// ── Ranh giới bảo mật ──
///  • Token (access/refresh) + thông tin user ⇒ `flutter_secure_storage`
///    (Keychain trên iOS, EncryptedSharedPreferences trên Android).
///  • Cấu hình không nhạy cảm (base URL, remember-me, email gợi nhớ) ⇒ `shared_preferences`.
class TokenStorage {
  static const String _keyAccessToken = 'jg_mobile_access_token';
  static const String _keyRefreshToken = 'jg_mobile_refresh_token';
  static const String _keyUserInfo = 'jg_mobile_user_info';
  static const String _keyTokenIssuedAt = 'jg_mobile_token_issued_at';

  static const String _keyBaseUrl = 'jg_mobile_api_base_url';
  static const String _keyRememberMe = 'jg_mobile_remember_me';
  static const String _keySavedEmail = 'jg_mobile_saved_email';

  /// Tiền tố khoá lưu giao dịch thanh toán đang chờ, theo từng booking.
  ///
  /// Không nhạy cảm (chỉ là id + URL) ⇒ lưu trong `shared_preferences`.
  ///
  /// Mục đích: khi người dùng chuyển sang trình duyệt VNPay, hệ điối có thể KILL app.
  /// Khi mở lại app, ta đọc lại giao dịch đang chờ để tra trạng thái thanh toán
  /// (thay vì bắt khách tự kiểm tra lại).
  static const String _keyPendingPaymentPrefix = 'jg_pending_payment_';

  // flutter_secure_storage 11.x dùng AES-GCM + RSA-OAEP (KeyStore) mặc định trên
  // Android — không còn tham số `encryptedSharedPreferences`.
  static const FlutterSecureStorage _secureStorage = FlutterSecureStorage(
    aOptions: AndroidOptions(),
    iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
  );

  static SharedPreferences? _prefs;

  static Future<SharedPreferences> _getPrefs() async {
    _prefs ??= await SharedPreferences.getInstance();
    return _prefs!;
  }

  // ── Secure storage: token & user ────────────────────────────────────────

  /// Lưu toàn bộ phiên đăng nhập.
  static Future<void> saveAuthSession(AuthResponseModel authResponse) async {
    await _secureStorage.write(key: _keyAccessToken, value: authResponse.accessToken);
    await _secureStorage.write(key: _keyRefreshToken, value: authResponse.refreshToken);
    await _secureStorage.write(
      key: _keyUserInfo,
      value: jsonEncode(authResponse.user.toJson()),
    );
    await _secureStorage.write(
      key: _keyTokenIssuedAt,
      value: DateTime.now().millisecondsSinceEpoch.toString(),
    );
  }

  /// Cập nhật tokens mới (khi refresh).
  static Future<void> updateTokens({
    required String accessToken,
    String? refreshToken,
  }) async {
    await _secureStorage.write(key: _keyAccessToken, value: accessToken);
    if (refreshToken != null && refreshToken.isNotEmpty) {
      await _secureStorage.write(key: _keyRefreshToken, value: refreshToken);
    }
    await _secureStorage.write(
      key: _keyTokenIssuedAt,
      value: DateTime.now().millisecondsSinceEpoch.toString(),
    );
  }

  /// Lấy Access Token.
  static Future<String?> getAccessToken() async {
    return _secureStorage.read(key: _keyAccessToken);
  }

  /// Lấy Refresh Token.
  static Future<String?> getRefreshToken() async {
    return _secureStorage.read(key: _keyRefreshToken);
  }

  /// Lấy thông tin người dùng đang đăng nhập.
  static Future<UserModel?> getUser() async {
    final rawUser = await _secureStorage.read(key: _keyUserInfo);
    if (rawUser == null || rawUser.isEmpty) return null;
    try {
      final Map<String, dynamic> map = jsonDecode(rawUser) as Map<String, dynamic>;
      return UserModel.fromJson(map);
    } catch (_) {
      return null;
    }
  }

  /// Cập nhật thông tin người dùng.
  static Future<void> saveUser(UserModel user) async {
    await _secureStorage.write(
      key: _keyUserInfo,
      value: jsonEncode(user.toJson()),
    );
  }

  /// Thời điểm cấp token gần nhất.
  static Future<DateTime?> getTokenIssuedAt() async {
    final raw = await _secureStorage.read(key: _keyTokenIssuedAt);
    if (raw == null || raw.isEmpty) return null;
    final ms = int.tryParse(raw);
    if (ms == null) return null;
    return DateTime.fromMillisecondsSinceEpoch(ms);
  }

  /// Kiểm tra có phiên đăng nhập hợp lệ không.
  static Future<bool> hasValidSession() async {
    final token = await getAccessToken();
    final user = await getUser();
    return token != null && token.isNotEmpty && user != null;
  }

  /// Xóa toàn bộ token & phiên đăng nhập.
  static Future<void> clearSession() async {
    await _secureStorage.delete(key: _keyAccessToken);
    await _secureStorage.delete(key: _keyRefreshToken);
    await _secureStorage.delete(key: _keyUserInfo);
    await _secureStorage.delete(key: _keyTokenIssuedAt);
  }

  /// Alias xóa toàn bộ phiên đăng nhập.
  static Future<void> clear() async => clearSession();

  // ── SharedPreferences: cấu hình không nhạy cảm ───────────────────────────

  /// Lấy cấu hình Base URL máy chủ: địa chỉ đã lưu, nếu chưa lưu thì tự dò địa chỉ đang trả lời.
  static Future<String> getBaseUrl() async {
    final prefs = await _getPrefs();
    return prefs.getString(_keyBaseUrl) ?? await ServerFinder.find();
  }

  /// Người dùng đã tự lưu địa chỉ máy chủ chưa (chưa thì app tự dò).
  static Future<bool> hasCustomBaseUrl() async {
    final prefs = await _getPrefs();
    return prefs.getString(_keyBaseUrl) != null;
  }

  /// Thiết lập cấu hình Base URL máy chủ.
  static Future<void> setBaseUrl(String url) async {
    final prefs = await _getPrefs();
    await prefs.setString(_keyBaseUrl, url.trim());
  }

  /// Khôi phục Base URL về mặc định.
  static Future<void> resetBaseUrl() async {
    final prefs = await _getPrefs();
    await prefs.remove(_keyBaseUrl);
    ServerFinder.reset();
  }

  /// Lưu tuỳ chọn ghi nhớ đăng nhập.
  static Future<void> setRememberMe(bool value, {String? email}) async {
    final prefs = await _getPrefs();
    await prefs.setBool(_keyRememberMe, value);
    if (value && email != null) {
      await prefs.setString(_keySavedEmail, email);
    } else if (!value) {
      await prefs.remove(_keySavedEmail);
    }
  }

  /// Lấy email đã lưu.
  static Future<String?> getSavedEmail() async {
    final prefs = await _getPrefs();
    return prefs.getString(_keySavedEmail);
  }

  // ── Giao dịch thanh toán đang chờ ────────────────────────────────────────

  /// Nhớ giao dịch thanh toán đang chờ kết quả cho một booking.
  ///
  /// [paymentId] là id giao dịch trên backend, [bookingId] là booking tương ứng.
  /// Dùng để khôi phục trạng thái sau khi app bị hệ điều kill trong lúc khách
  /// đang thanh toán ở trình duyệt VNPay.
  static Future<void> savePendingPayment({
    required int bookingId,
    required int paymentId,
    String? paymentUrl,
  }) async {
    final prefs = await _getPrefs();
    await prefs.setString(
      '$_keyPendingPaymentPrefix$bookingId',
      jsonEncode({
        'paymentId': paymentId,
        'bookingId': bookingId,
        'paymentUrl': paymentUrl,
        'savedAt': DateTime.now().millisecondsSinceEpoch,
      }),
    );
  }

  /// Lấy giao dịch thanh toán đang chờ của một booking (null nếu không có).
  static Future<Map<String, dynamic>?> getPendingPayment(int bookingId) async {
    final prefs = await _getPrefs();
    final raw = prefs.getString('$_keyPendingPaymentPrefix$bookingId');
    if (raw == null || raw.isEmpty) return null;
    try {
      final decoded = jsonDecode(raw);
      if (decoded is Map<String, dynamic>) return decoded;
      return null;
    } catch (_) {
      return null;
    }
  }

  /// Xoá giao dịch thanh toán đang chờ (sau khi đã có kết quả cuối).
  static Future<void> clearPendingPayment(int bookingId) async {
    final prefs = await _getPrefs();
    await prefs.remove('$_keyPendingPaymentPrefix$bookingId');
  }

  /// Danh sách booking đang có giao dịch thanh toán chờ kết quả.
  ///
  /// Dùng khi app vừa mở lại (bị hệ điều kill trong lúc khách đang thanh toán ở
  /// trình duyệt) để tra kết quả mà không cần biết trước booking nào.
  static Future<List<int>> getPendingPaymentBookings() async {
    final prefs = await _getPrefs();
    final result = <int>[];
    for (final key in prefs.getKeys()) {
      if (!key.startsWith(_keyPendingPaymentPrefix)) continue;
      final bookingId = int.tryParse(key.substring(_keyPendingPaymentPrefix.length));
      if (bookingId != null) result.add(bookingId);
    }
    return result;
  }
}
