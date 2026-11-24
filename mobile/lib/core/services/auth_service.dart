import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart' show kDebugMode;
import 'package:http/http.dart' as http;
import '../constants/api_constants.dart';
import '../models/auth_models.dart';
import 'api_client.dart';
import 'server_finder.dart';
import 'token_storage.dart';
import '../../l10n/locale_controller.dart';

class AuthService {
  // Singleton pattern
  static final AuthService _instance = AuthService._internal();
  factory AuthService() => _instance;
  AuthService._internal();

  /// Gửi yêu cầu HTTP POST chung với xử lý lỗi
  Future<http.Response> _post({
    required String path,
    Map<String, dynamic>? body,
    String? bearerToken,
    Duration timeout = const Duration(seconds: 15),
  }) async {
    final baseUrl = await TokenStorage.getBaseUrl();
    // Dò máy chủ thất bại ⇒ báo lỗi ngay, không chờ request hết hạn 15 giây.
    if (ServerFinder.lastProbeFailed) throw Exception(ServerFinder.unreachableHint);
    final uri = Uri.parse('$baseUrl$path');

    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Accept-Language': acceptLanguage,
    };
    if (bearerToken != null && bearerToken.isNotEmpty) {
      headers['Authorization'] = 'Bearer $bearerToken';
    }

    try {
      final response = await http
          .post(
            uri,
            headers: headers,
            body: body != null ? jsonEncode(body) : null,
          )
          .timeout(timeout);
      return response;
    } on SocketException catch (e) {
      ServerFinder.markUnreachable();
      throw Exception(
        kDebugMode
            ? appL10n.authServerUnreachableDebug(baseUrl, e.message, ServerFinder.unreachableHint)
            : appL10n.authServerUnreachable,
      );
    } on TimeoutException {
      ServerFinder.markUnreachable();
      throw Exception(
        kDebugMode
            ? appL10n.authServerTimeoutDebug(baseUrl, ServerFinder.unreachableHint)
            : appL10n.authServerTimeout,
      );
    } catch (e) {
      throw Exception(appL10n.authNetworkError('$e'));
    }
  }

  /// Trích xuất thông điệp lỗi từ Response của Spring Boot
  String _extractErrorMessage(http.Response response) {
    try {
      final decoded = jsonDecode(utf8.decode(response.bodyBytes));
      if (decoded is Map<String, dynamic>) {
        if (decoded.containsKey('message') && decoded['message'] != null) {
          return decoded['message'].toString();
        }
        if (decoded.containsKey('error') && decoded['error'] != null) {
          return decoded['error'].toString();
        }
      }
    } catch (_) {}

    if (response.statusCode == 401) {
      return appL10n.authErr401;
    }
    if (response.statusCode == 403) {
      return appL10n.authErr403;
    }
    if (response.statusCode == 404) {
      return appL10n.authErr404;
    }
    return appL10n.authErrServer('${response.statusCode}');
  }

  // ==========================================================================
  // 1. ĐĂNG NHẬP (POST /api/v1/auth/login) - KIỂM TRA ROLE USER
  // ==========================================================================
  Future<AuthResponseModel> login({
    required String email,
    required String password,
  }) async {
    final normalizedEmail = email.trim();

    // Dò lại máy chủ mỗi lần đăng nhập (vài chục ms khi máy chủ trả lời): địa chỉ nhớ từ trước
    // có thể đã chết vì rút cáp USB / mất adb reverse / đổi Wi-Fi.
    ServerFinder.reset();

    final response = await _post(
      path: ApiConstants.loginEndpoint,
      body: {
        'email': normalizedEmail,
        'password': password,
      },
    );

    if (response.statusCode == 200 || response.statusCode == 201) {
      final dynamic decoded = jsonDecode(utf8.decode(response.bodyBytes));
      final dynamic data = (decoded is Map && decoded.containsKey('data'))
          ? decoded['data']
          : decoded;

      final authResponse = AuthResponseModel.fromJson(
        data as Map<String, dynamic>,
      );

      // YÊU CẦU BẢO MẬT: Kiểm tra vai trò hợp lệ cho Mobile (chỉ chấp nhận USER/TOURIST)
      // Nếu role không hợp lệ -> xóa sạch token ngay lập tức và ném lỗi chung tránh lộ thông tin vai trò
      if (!isTouristRole(authResponse.user.role)) {
        await TokenStorage.clear();
        throw Exception(kInvalidAuthErrorMessage);
      }

      // Lưu trữ phiên đăng nhập vào SharedPreferences
      await TokenStorage.saveAuthSession(authResponse);
      await LocaleController.instance.applyFromServer(authResponse.user.preferredLanguage);
      return authResponse;
    } else {
      final errorMsg = _extractErrorMessage(response);
      throw Exception(errorMsg);
    }
  }

  // ==========================================================================
  // 1b. ĐĂNG NHẬP GOOGLE (POST /api/v1/auth/google) - KIỂM TRA ROLE TOURIST
  // ==========================================================================
  Future<AuthResponseModel> loginWithGoogle({required String idToken}) async {
    final response = await _post(
      path: '/auth/google',
      body: {
        'idToken': idToken,
        // Backend chỉ còn 4 role chính thức: ADMIN, CONTENT_MODERATOR,
        // CONTENT_PROVIDER, TOURIST. Role 'USER' cũ đã bị gỡ khỏi bảng `roles`
        // nên gửi 'USER' sẽ bị backend từ chối (ROLE_NOT_FOUND).
        'role': 'TOURIST',
      },
    );

    if (response.statusCode == 200 || response.statusCode == 201) {
      final dynamic decoded = jsonDecode(utf8.decode(response.bodyBytes));
      final dynamic data = (decoded is Map && decoded.containsKey('data'))
          ? decoded['data']
          : decoded;

      final authResponse = AuthResponseModel.fromJson(
        data as Map<String, dynamic>,
      );

      if (!isTouristRole(authResponse.user.role)) {
        await TokenStorage.clear();
        throw Exception(kInvalidAuthErrorMessage);
      }

      await TokenStorage.saveAuthSession(authResponse);
      await LocaleController.instance.applyFromServer(authResponse.user.preferredLanguage);
      return authResponse;
    } else {
      await TokenStorage.clear();
      throw Exception(kInvalidAuthErrorMessage);
    }
  }

  // ==========================================================================
  // 1c. ĐĂNG NHẬP APPLE (POST /api/v1/auth/apple) - KIỂM TRA ROLE TOURIST
  // ==========================================================================
  Future<AuthResponseModel> loginWithApple({required String identityToken}) async {
    final response = await _post(
      path: '/auth/apple',
      body: {
        'identityToken': identityToken,
        // Xem giải thích ở loginWithGoogle: role hợp lệ duy nhất cho Mobile là TOURIST.
        'role': 'TOURIST',
      },
    );

    if (response.statusCode == 200 || response.statusCode == 201) {
      final dynamic decoded = jsonDecode(utf8.decode(response.bodyBytes));
      final dynamic data = (decoded is Map && decoded.containsKey('data'))
          ? decoded['data']
          : decoded;

      final authResponse = AuthResponseModel.fromJson(
        data as Map<String, dynamic>,
      );

      if (!isTouristRole(authResponse.user.role)) {
        await TokenStorage.clear();
        throw Exception(kInvalidAuthErrorMessage);
      }

      await TokenStorage.saveAuthSession(authResponse);
      await LocaleController.instance.applyFromServer(authResponse.user.preferredLanguage);
      return authResponse;
    } else {
      await TokenStorage.clear();
      throw Exception(kInvalidAuthErrorMessage);
    }
  }

  // ==========================================================================
  // 2. ĐĂNG XUẤT (POST /api/v1/auth/logout)
  // ==========================================================================
  Future<void> logout() async {
    final accessToken = await TokenStorage.getAccessToken();
    final refreshToken = await TokenStorage.getRefreshToken();

    try {
      await _post(
        path: ApiConstants.logoutEndpoint,
        bearerToken: accessToken,
        body: {
          'refreshToken': refreshToken ?? '',
        },
        timeout: const Duration(seconds: 8),
      );
    } catch (_) {
      // Dù API thất bại hay mất mạng, vẫn đảm bảo dọn sạch token cục bộ
    } finally {
      await TokenStorage.clearSession();
    }
  }

  // ==========================================================================
  // 3. LÀM MỚI TOKEN (POST /api/v1/auth/refresh)
  // ==========================================================================
  Future<AuthResponseModel> refreshToken() async {
    final refreshToken = await TokenStorage.getRefreshToken();
    if (refreshToken == null || refreshToken.isEmpty) {
      await TokenStorage.clearSession();
      throw Exception(appL10n.authNoRefreshToken);
    }

    final response = await _post(
      path: ApiConstants.refreshEndpoint,
      body: {
        'refreshToken': refreshToken,
      },
    );

    if (response.statusCode == 200 || response.statusCode == 201) {
      final dynamic decoded = jsonDecode(utf8.decode(response.bodyBytes));
      final dynamic data = (decoded is Map && decoded.containsKey('data'))
          ? decoded['data']
          : decoded;

      final authResponse = AuthResponseModel.fromJson(
        data as Map<String, dynamic>,
      );

      // Kiểm tra bảo mật: Chỉ duy trì phiên nếu là USER / TOURIST
      if (!isTouristRole(authResponse.user.role)) {
        await TokenStorage.clear();
        throw Exception(kInvalidAuthErrorMessage);
      }

      // Cập nhật lại Access Token mới và Refresh Token (nếu có cấp mới)
      await TokenStorage.updateTokens(
        accessToken: authResponse.accessToken,
        refreshToken: authResponse.refreshToken.isNotEmpty
            ? authResponse.refreshToken
            : refreshToken,
      );

      if (authResponse.user.email.isNotEmpty) {
        await TokenStorage.saveUser(authResponse.user);
      }

      return authResponse;
    } else {
      // Refresh token không hợp lệ hoặc đã hết hạn
      await TokenStorage.clear();
      final errorMsg = _extractErrorMessage(response);
      throw Exception(appL10n.authSessionExpiredDetail(errorMsg));
    }
  }

  // ==========================================================================
  // 4. ĐĂNG KÝ (POST /api/v1/auth/register) VỚI ROLE USER
  // ==========================================================================
  Future<AuthResponseModel> register({
    required String email,
    required String password,
    required String fullName,
    String? phone,
  }) async {
    final response = await _post(
      path: ApiConstants.registerEndpoint,
      body: {
        'email': email.trim(),
        'password': password,
        'fullName': fullName.trim(),
        'phone': phone?.trim() ?? '',
        'role': ApiConstants.requiredRole,
      },
    );

    if (response.statusCode == 200 || response.statusCode == 201) {
      final dynamic decoded = jsonDecode(utf8.decode(response.bodyBytes));
      final dynamic data = (decoded is Map && decoded.containsKey('data'))
          ? decoded['data']
          : decoded;

      final authResponse = AuthResponseModel.fromJson(
        data as Map<String, dynamic>,
      );

      if (!isTouristRole(authResponse.user.role)) {
        await TokenStorage.clear();
        throw Exception(kInvalidAuthErrorMessage);
      }

      await TokenStorage.saveAuthSession(authResponse);
      await LocaleController.instance.applyFromServer(authResponse.user.preferredLanguage);
      return authResponse;
    } else {
      final errorMsg = _extractErrorMessage(response);
      throw Exception(errorMsg);
    }
  }

  // ==========================================================================
  // 5. LẤY THÔNG TIN NGƯỜI DÙNG HIỆN TẠI (GET /api/v1/auth/me)
  // ==========================================================================
  // Đi qua ApiClient: token hết hạn ⇒ tự làm mới rồi gọi lại; làm mới thất bại ⇒
  // SessionExpiry mở màn đăng nhập đè lên màn đang xem (đăng nhập xong quay lại đúng màn).
  Future<UserModel> getCurrentUser() async {
    final data = await ApiClient.request('GET', ApiConstants.meEndpoint);
    if (data is! Map) throw ApiException(appL10n.apiInvalidData);
    final user = UserModel.fromJson(Map<String, dynamic>.from(data));
    if (!isTouristRole(user.role)) {
      await TokenStorage.clear();
      throw Exception(kInvalidAuthErrorMessage);
    }
    await TokenStorage.saveUser(user);
    await LocaleController.instance.applyFromServer(user.preferredLanguage);
    return user;
  }

  /// Đồng bộ ngôn ngữ ưa thích (vi / en / ja) của tài khoản hiện tại lên backend.
  Future<void> updatePreferredLanguage(String languageCode) async {
    if (!await TokenStorage.hasValidSession()) return;
    try {
      final data = await ApiClient.request(
        'PATCH',
        '/auth/me/language',
        body: {'preferredLanguage': languageCode},
      );
      if (data is Map) {
        final user = UserModel.fromJson(Map<String, dynamic>.from(data));
        await TokenStorage.saveUser(user);
      }
    } catch (_) {
      // Mất mạng / chưa có phiên hợp lệ: giữ ngôn ngữ đã chọn cục bộ trên máy
    }
  }

  // ==========================================================================
  // 6. CẬP NHẬT THÔNG TIN CÁ NHÂN (PUT /api/v1/auth/profile)
  // ==========================================================================
  Future<UserModel> updateProfile({
    required String fullName,
    String? phone,
    String? avatarUrl,
  }) async {
    final data = await ApiClient.request('PUT', ApiConstants.profileEndpoint, body: {
      'fullName': fullName.trim(),
      'phone': phone?.trim() ?? '',
      'avatarUrl': avatarUrl?.trim() ?? '',
    });
    if (data is! Map) throw ApiException(appL10n.apiInvalidData);
    final updated = UserModel.fromJson(Map<String, dynamic>.from(data));
    await TokenStorage.saveUser(updated);
    return updated;
  }

  // ── Mật khẩu (lỗi ném ApiException kèm thông báo tiếng Việt của máy chủ) ──

  /// Gửi mã OTP 6 số tới email để đặt lại mật khẩu.
  Future<void> forgotPassword(String email) =>
      ApiClient.request('POST', '/auth/forgot-password', auth: false, body: {'email': email.trim()});

  /// Kiểm tra mã OTP còn hiệu lực trước khi cho nhập mật khẩu mới.
  Future<void> verifyOtp({required String email, required String otp}) =>
      ApiClient.request('POST', '/auth/verify-otp', auth: false, body: {'email': email.trim(), 'otp': otp});

  /// Đặt mật khẩu mới bằng OTP (không cần đăng nhập).
  Future<void> resetPassword({
    required String email,
    required String otp,
    required String newPassword,
    required String confirmPassword,
  }) =>
      ApiClient.request('POST', '/auth/reset-password', auth: false, body: {
        'email': email.trim(),
        'otp': otp,
        'newPassword': newPassword,
        'confirmPassword': confirmPassword,
      });

  /// Đổi mật khẩu khi đang đăng nhập; tài khoản Google chưa từng đặt mật khẩu thì bỏ trống [currentPassword].
  /// Sai mật khẩu hiện tại: máy chủ trả 400 kèm câu báo; 401 chỉ còn nghĩa là hết phiên
  /// ⇒ ApiClient tự làm mới token / mở màn đăng nhập lại.
  Future<void> changePassword({
    String? currentPassword,
    required String newPassword,
    required String confirmPassword,
  }) =>
      ApiClient.request('POST', '/auth/change-password', body: {
        if (currentPassword != null && currentPassword.isNotEmpty) 'currentPassword': currentPassword,
        'newPassword': newPassword,
        'confirmPassword': confirmPassword,
      });
}
