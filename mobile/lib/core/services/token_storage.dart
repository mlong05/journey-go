import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/auth_models.dart';
import 'server_finder.dart';

class TokenStorage {
  static const String _keyAccessToken = 'jg_mobile_access_token';
  static const String _keyRefreshToken = 'jg_mobile_refresh_token';
  static const String _keyUserInfo = 'jg_mobile_user_info';
  static const String _keyBaseUrl = 'jg_mobile_api_base_url';
  static const String _keyRememberMe = 'jg_mobile_remember_me';
  static const String _keySavedEmail = 'jg_mobile_saved_email';
  static const String _keyTokenIssuedAt = 'jg_mobile_token_issued_at';

  static SharedPreferences? _prefs;

  static Future<SharedPreferences> _getPrefs() async {
    _prefs ??= await SharedPreferences.getInstance();
    return _prefs!;
  }

  /// Lưu toàn bộ phiên đăng nhập
  static Future<void> saveAuthSession(AuthResponseModel authResponse) async {
    final prefs = await _getPrefs();
    await prefs.setString(_keyAccessToken, authResponse.accessToken);
    await prefs.setString(_keyRefreshToken, authResponse.refreshToken);
    await prefs.setString(_keyUserInfo, jsonEncode(authResponse.user.toJson()));
    await prefs.setInt(_keyTokenIssuedAt, DateTime.now().millisecondsSinceEpoch);
  }

  /// Cập nhật tokens mới (khi refresh)
  static Future<void> updateTokens({
    required String accessToken,
    String? refreshToken,
  }) async {
    final prefs = await _getPrefs();
    await prefs.setString(_keyAccessToken, accessToken);
    if (refreshToken != null && refreshToken.isNotEmpty) {
      await prefs.setString(_keyRefreshToken, refreshToken);
    }
    await prefs.setInt(_keyTokenIssuedAt, DateTime.now().millisecondsSinceEpoch);
  }

  /// Lấy Access Token
  static Future<String?> getAccessToken() async {
    final prefs = await _getPrefs();
    return prefs.getString(_keyAccessToken);
  }

  /// Lấy Refresh Token
  static Future<String?> getRefreshToken() async {
    final prefs = await _getPrefs();
    return prefs.getString(_keyRefreshToken);
  }

  /// Lấy thông tin người dùng đang đăng nhập
  static Future<UserModel?> getUser() async {
    final prefs = await _getPrefs();
    final rawUser = prefs.getString(_keyUserInfo);
    if (rawUser == null || rawUser.isEmpty) return null;
    try {
      final Map<String, dynamic> map = jsonDecode(rawUser) as Map<String, dynamic>;
      return UserModel.fromJson(map);
    } catch (_) {
      return null;
    }
  }

  /// Cập nhật thông tin người dùng
  static Future<void> saveUser(UserModel user) async {
    final prefs = await _getPrefs();
    await prefs.setString(_keyUserInfo, jsonEncode(user.toJson()));
  }

  /// Kiểm tra có phiên đăng nhập hợp lệ không
  static Future<bool> hasValidSession() async {
    final token = await getAccessToken();
    final user = await getUser();
    return token != null && token.isNotEmpty && user != null;
  }

  /// Xóa toàn bộ token & phiên đăng nhập (Hỗ trợ gọi cả clear() lẫn clearSession())
  static Future<void> clearSession() async {
    final prefs = await _getPrefs();
    await prefs.remove(_keyAccessToken);
    await prefs.remove(_keyRefreshToken);
    await prefs.remove(_keyUserInfo);
    await prefs.remove(_keyTokenIssuedAt);
  }

  /// Alias xóa toàn bộ phiên đăng nhập
  static Future<void> clear() async => clearSession();

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

  /// Thiết lập cấu hình Base URL máy chủ
  static Future<void> setBaseUrl(String url) async {
    final prefs = await _getPrefs();
    await prefs.setString(_keyBaseUrl, url.trim());
  }

  /// Khôi phục Base URL về mặc định
  static Future<void> resetBaseUrl() async {
    final prefs = await _getPrefs();
    await prefs.remove(_keyBaseUrl);
    ServerFinder.reset();
  }

  /// Lưu tuỳ chọn ghi nhớ đăng nhập
  static Future<void> setRememberMe(bool value, {String? email}) async {
    final prefs = await _getPrefs();
    await prefs.setBool(_keyRememberMe, value);
    if (value && email != null) {
      await prefs.setString(_keySavedEmail, email);
    } else if (!value) {
      await prefs.remove(_keySavedEmail);
    }
  }

  /// Lấy email đã lưu
  static Future<String?> getSavedEmail() async {
    final prefs = await _getPrefs();
    return prefs.getString(_keySavedEmail);
  }

  /// Lấy thời điểm cấp token gần nhất
  static Future<DateTime?> getTokenIssuedAt() async {
    final prefs = await _getPrefs();
    final ms = prefs.getInt(_keyTokenIssuedAt);
    return ms != null ? DateTime.fromMillisecondsSinceEpoch(ms) : null;
  }
}
