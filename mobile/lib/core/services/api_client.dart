import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import 'token_storage.dart';

/// Lỗi gọi API, `message` đã là tiếng Việt để hiển thị trực tiếp cho người dùng.
class ApiException implements Exception {
  final String message;
  final String? code;
  final int? statusCode;

  const ApiException(this.message, {this.code, this.statusCode});

  bool get isUnauthorized => statusCode == 401;

  @override
  String toString() => message;
}

/// Gọi REST API của backend (đã gắn sẵn base URL và Bearer token), trả về trường `data`.
///
/// ── Xử lý 401 ──
/// Khi gặp 401, client tự gọi `POST /auth/refresh` một lần rồi retry request gốc.
/// Nếu refresh thất bại → ném `ApiException` 401 để UI đưa người dùng về màn đăng nhập.
/// Nhiều request cùng lúc gặp 401 sẽ chỉ refresh MỘT lần (các request còn lại chờ kết quả).
class ApiClient {
  ApiClient._();

  static Future<bool>? _refreshing;

  /// Đảm bảo có access token hợp lệ, refresh nếu cần.
  static Future<bool> _ensureFreshToken() {
    // Nếu đã có một lần refresh đang chạy → chờ chính lần đó.
    if (_refreshing != null) return _refreshing!;

    final completer = Completer<bool>();
    _refreshing = completer.future;

    () async {
      var ok = false;
      try {
        final refreshToken = await TokenStorage.getRefreshToken();
        if (refreshToken != null && refreshToken.isNotEmpty) {
          final baseUrl = await TokenStorage.getBaseUrl();
          final res = await http
              .post(
                Uri.parse('$baseUrl/auth/refresh'),
                headers: {'Content-Type': 'application/json'},
                body: jsonEncode({'refreshToken': refreshToken}),
              )
              .timeout(const Duration(seconds: 15));

          if (res.statusCode == 200) {
            final decoded = jsonDecode(utf8.decode(res.bodyBytes));
            final data = (decoded is Map && decoded['data'] is Map)
                ? decoded['data'] as Map
                : null;
            final accessToken = data?['accessToken']?.toString();
            if (accessToken != null && accessToken.isNotEmpty) {
              await TokenStorage.updateTokens(
                accessToken: accessToken,
                refreshToken: data?['refreshToken']?.toString(),
              );
              ok = true;
            }
          }
        }
      } catch (_) {
        ok = false;
      }

      _refreshing = null;
      if (!completer.isCompleted) completer.complete(ok);
    }();

    return completer.future;
  }

  static Future<dynamic> request(
    String method,
    String path, {
    bool auth = true,
    Object? body,
    Duration timeout = const Duration(seconds: 15),
    bool isRetry = false,
  }) async {
    final baseUrl = await TokenStorage.getBaseUrl();
    final uri = Uri.parse('$baseUrl$path');
    final headers = <String, String>{'Accept': 'application/json'};

    if (auth) {
      final token = await TokenStorage.getAccessToken();
      if (token == null || token.isEmpty) {
        throw const ApiException(
          'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
          statusCode: 401,
        );
      }
      headers['Authorization'] = 'Bearer $token';
    }

    try {
      final req = http.Request(method, uri)..headers.addAll(headers);
      if (body != null) {
        req.headers['Content-Type'] = 'application/json';
        req.body = jsonEncode(body);
      }
      final streamed = await req.send().timeout(timeout);
      final response = await http.Response.fromStream(streamed);
      final responseText = utf8.decode(response.bodyBytes);
      final dynamic decoded = responseText.isEmpty ? null : jsonDecode(responseText);

      if (response.statusCode >= 200 && response.statusCode < 300) {
        return decoded is Map ? decoded['data'] : decoded;
      }

      // ── 401: thử refresh rồi retry đúng 1 lần ────────────────────────────
      if (response.statusCode == 401 && auth && !isRetry) {
        final refreshed = await _ensureFreshToken();
        if (refreshed) {
          return await ApiClient.request(
            method,
            path,
            auth: auth,
            body: body,
            timeout: timeout,
            isRetry: true,
          );
        }
        await TokenStorage.clear();
        throw const ApiException(
          'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
          statusCode: 401,
        );
      }

      if (response.statusCode == 401) {
        throw const ApiException(
          'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
          statusCode: 401,
        );
      }

      final map = decoded is Map ? decoded : const {};
      final serverMessage = map['message']?.toString();
      throw ApiException(
        (serverMessage != null && serverMessage.isNotEmpty)
            ? serverMessage
            : 'Không thể xử lý yêu cầu (mã ${response.statusCode}).',
        code: map['code']?.toString(),
        statusCode: response.statusCode,
      );
    } on TimeoutException {
      throw const ApiException('Kết nối đến máy chủ quá hạn. Vui lòng thử lại.');
    } on SocketException {
      throw const ApiException(
        'Không thể kết nối đến máy chủ. Hãy kiểm tra mạng và địa chỉ API.',
      );
    } on FormatException {
      throw const ApiException('Máy chủ trả về dữ liệu không hợp lệ.');
    }
  }

  /// Tải một ảnh lên (POST /upload/image) và trả về đường dẫn https của ảnh.
  static Future<String> uploadImage(String filePath, {String folder = 'journeygo/community'}) async {
    final baseUrl = await TokenStorage.getBaseUrl();
    final token = await TokenStorage.getAccessToken();
    if (token == null || token.isEmpty) {
      throw const ApiException('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', statusCode: 401);
    }
    try {
      final request = http.MultipartRequest('POST', Uri.parse('$baseUrl/upload/image'))
        ..headers['Authorization'] = 'Bearer $token'
        ..headers['Accept'] = 'application/json'
        ..fields['folder'] = folder
        ..files.add(await http.MultipartFile.fromPath('file', filePath));
      final streamed = await request.send().timeout(const Duration(seconds: 60));
      final response = await http.Response.fromStream(streamed);
      final text = utf8.decode(response.bodyBytes);
      final dynamic decoded = text.isEmpty ? null : jsonDecode(text);
      if (response.statusCode >= 200 && response.statusCode < 300) {
        final data = decoded is Map ? decoded['data'] : null;
        final url = data is Map ? data['url']?.toString() : null;
        if (url != null && url.isNotEmpty) return url;
        throw const ApiException('Máy chủ không trả về đường dẫn ảnh.');
      }
      final message = decoded is Map ? decoded['message']?.toString() : null;
      throw ApiException(
        (message != null && message.isNotEmpty) ? message : 'Không thể tải ảnh lên (mã ${response.statusCode}).',
        statusCode: response.statusCode,
      );
    } on TimeoutException {
      throw const ApiException('Tải ảnh quá hạn. Vui lòng thử lại.');
    } on SocketException {
      throw const ApiException('Không thể kết nối đến máy chủ. Hãy kiểm tra mạng và địa chỉ API.');
    } on FormatException {
      throw const ApiException('Máy chủ trả về dữ liệu không hợp lệ.');
    }
  }

  /// Bóc danh sách từ `data` dạng mảng thuần hoặc trang Spring (`content`).
  static List<Map<String, dynamic>> asList(dynamic data) {
    final list = data is Map && data['content'] is List
        ? data['content'] as List
        : (data is List ? data : const []);
    return list.whereType<Map<String, dynamic>>().toList();
  }

  /// Bóc metadata phân trang từ `data` dạng trang Spring.
  static Map<String, dynamic> asPageMeta(dynamic data) {
    if (data is Map) {
      return {
        'page': data['page'] ?? 0,
        'size': data['size'] ?? 0,
        'totalElements': data['totalElements'] ?? 0,
        'totalPages': data['totalPages'] ?? 0,
        'first': data['first'] ?? true,
        'last': data['last'] ?? true,
      };
    }
    return {
      'page': 0,
      'size': 0,
      'totalElements': 0,
      'totalPages': 0,
      'first': true,
      'last': true,
    };
  }
}
