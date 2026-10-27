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
class ApiClient {
  ApiClient._();

  static Future<dynamic> request(
    String method,
    String path, {
    bool auth = true,
    Object? body,
    Duration timeout = const Duration(seconds: 15),
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
      final request = http.Request(method, uri)..headers.addAll(headers);
      if (body != null) {
        request.headers['Content-Type'] = 'application/json';
        request.body = jsonEncode(body);
      }
      final streamed = await request.send().timeout(timeout);
      final response = await http.Response.fromStream(streamed);
      final responseText = utf8.decode(response.bodyBytes);
      final dynamic decoded = responseText.isEmpty ? null : jsonDecode(responseText);

      if (response.statusCode >= 200 && response.statusCode < 300) {
        return decoded is Map ? decoded['data'] : decoded;
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
}
