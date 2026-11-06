import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart' show kDebugMode;
import 'package:http/http.dart' as http;
import '../constants/api_constants.dart';
import '../models/auth_models.dart';
import 'api_client.dart';
import 'token_storage.dart';

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
    final uri = Uri.parse('$baseUrl$path');

    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
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
      throw Exception(
        'Không thể kết nối đến máy chủ ($baseUrl).\nChi tiết: ${e.message}\nVui lòng kiểm tra địa chỉ API Backend (cổng 8088).',
      );
    } on TimeoutException {
      throw Exception(
        kDebugMode
            ? 'Không kết nối được máy chủ. Kiểm tra địa chỉ ở nút "API" góc trên (điện thoại thật cần IP Wi-Fi của máy tính).'
            : 'Kết nối đến máy chủ quá hạn (timeout). Vui lòng thử lại sau.',
      );
    } catch (e) {
      throw Exception('Lỗi kết nối mạng: $e');
    }
  }

  /// Gửi yêu cầu HTTP GET
  Future<http.Response> _get({
    required String path,
    String? bearerToken,
    Duration timeout = const Duration(seconds: 15),
  }) async {
    final baseUrl = await TokenStorage.getBaseUrl();
    final uri = Uri.parse('$baseUrl$path');

    final headers = <String, String>{
      'Accept': 'application/json',
    };
    if (bearerToken != null && bearerToken.isNotEmpty) {
      headers['Authorization'] = 'Bearer $bearerToken';
    }

    try {
      final response = await http
          .get(
            uri,
            headers: headers,
          )
          .timeout(timeout);
      return response;
    } on SocketException catch (e) {
      throw Exception(
        'Không thể kết nối đến máy chủ ($baseUrl).\nChi tiết: ${e.message}',
      );
    } on TimeoutException {
      throw Exception('Kết nối quá hạn. Vui lòng thử lại.');
    } catch (e) {
      throw Exception('Lỗi mạng: $e');
    }
  }

  /// Gửi yêu cầu HTTP PUT
  Future<http.Response> _put({
    required String path,
    Map<String, dynamic>? body,
    String? bearerToken,
    Duration timeout = const Duration(seconds: 15),
  }) async {
    final baseUrl = await TokenStorage.getBaseUrl();
    final uri = Uri.parse('$baseUrl$path');

    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (bearerToken != null && bearerToken.isNotEmpty) {
      headers['Authorization'] = 'Bearer $bearerToken';
    }

    try {
      final response = await http
          .put(
            uri,
            headers: headers,
            body: body != null ? jsonEncode(body) : null,
          )
          .timeout(timeout);
      return response;
    } on SocketException catch (e) {
      throw Exception('Không thể kết nối máy chủ: ${e.message}');
    } on TimeoutException {
      throw Exception('Kết nối quá hạn. Vui lòng thử lại.');
    } catch (e) {
      throw Exception('Lỗi mạng: $e');
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
      return 'Thông tin đăng nhập không hợp lệ hoặc phiên đã hết hạn.';
    }
    if (response.statusCode == 403) {
      return 'Bạn không có quyền truy cập chức năng này.';
    }
    if (response.statusCode == 404) {
      return 'Không tìm thấy tài nguyên yêu cầu (404).';
    }
    return 'Lỗi máy chủ (${response.statusCode}). Vui lòng thử lại sau.';
  }

  // ==========================================================================
  // 1. ĐĂNG NHẬP (POST /api/v1/auth/login) - KIỂM TRA ROLE USER
  // ==========================================================================
  Future<AuthResponseModel> login({
    required String email,
    required String password,
  }) async {
    final normalizedEmail = email.trim();

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
      throw Exception('Không tìm thấy Refresh Token. Vui lòng đăng nhập lại.');
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
      throw Exception('Phiên đăng nhập đã hết hạn: $errorMsg');
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
      return authResponse;
    } else {
      final errorMsg = _extractErrorMessage(response);
      throw Exception(errorMsg);
    }
  }

  // ==========================================================================
  // 5. LẤY THÔNG TIN NGƯỜI DÙNG HIỆN TẠI (GET /api/v1/auth/me)
  // ==========================================================================
  Future<UserModel> getCurrentUser() async {
    String? token = await TokenStorage.getAccessToken();
    if (token == null || token.isEmpty) {
      throw Exception('Chưa đăng nhập');
    }

    var response = await _get(
      path: ApiConstants.meEndpoint,
      bearerToken: token,
    );

    // Nếu token hết hạn (401), tự động thử refresh token và gọi lại 1 lần
    if (response.statusCode == 401) {
      try {
        final refreshed = await refreshToken();
        token = refreshed.accessToken;
        response = await _get(
          path: ApiConstants.meEndpoint,
          bearerToken: token,
        );
      } catch (e) {
        throw Exception('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      }
    }

    if (response.statusCode == 200) {
      final dynamic decoded = jsonDecode(utf8.decode(response.bodyBytes));
      final dynamic data = (decoded is Map && decoded.containsKey('data'))
          ? decoded['data']
          : decoded;

      final user = UserModel.fromJson(data as Map<String, dynamic>);
      if (!isTouristRole(user.role)) {
        await TokenStorage.clear();
        throw Exception(kInvalidAuthErrorMessage);
      }

      await TokenStorage.saveUser(user);
      return user;
    } else {
      throw Exception(_extractErrorMessage(response));
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
    final token = await TokenStorage.getAccessToken();
    if (token == null || token.isEmpty) {
      throw Exception('Chưa đăng nhập');
    }

    final response = await _put(
      path: ApiConstants.profileEndpoint,
      bearerToken: token,
      body: {
        'fullName': fullName.trim(),
        'phone': phone?.trim() ?? '',
        'avatarUrl': avatarUrl?.trim() ?? '',
      },
    );

    if (response.statusCode == 200) {
      final dynamic decoded = jsonDecode(utf8.decode(response.bodyBytes));
      final dynamic data = (decoded is Map && decoded.containsKey('data'))
          ? decoded['data']
          : decoded;

      final updated = UserModel.fromJson(data as Map<String, dynamic>);
      await TokenStorage.saveUser(updated);
      return updated;
    } else {
      throw Exception(_extractErrorMessage(response));
    }
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
  Future<void> changePassword({
    String? currentPassword,
    required String newPassword,
    required String confirmPassword,
  }) =>
      ApiClient.request('POST', '/auth/change-password', keepUnauthorizedMessage: true, body: {
        if (currentPassword != null && currentPassword.isNotEmpty) 'currentPassword': currentPassword,
        'newPassword': newPassword,
        'confirmPassword': confirmPassword,
      });
}
