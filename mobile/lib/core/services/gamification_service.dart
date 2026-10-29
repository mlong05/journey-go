import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import '../models/gamification_model.dart';
import 'token_storage.dart';

/// Lỗi nghiệp vụ từ API gamification, `message` đã là tiếng Việt để hiển thị trực tiếp.
class GamificationException implements Exception {
  final String message;
  final String? code;
  final int? statusCode;

  const GamificationException(this.message, {this.code, this.statusCode});

  @override
  String toString() => message;
}

/// Gọi các API điểm thưởng & voucher (/api/v1/gamification).
class GamificationService {
  static final GamificationService _instance = GamificationService._internal();
  factory GamificationService() => _instance;
  GamificationService._internal();

  static const String _base = '/gamification';

  Future<dynamic> _request(
    String method,
    String path, {
    bool auth = true,
  }) async {
    final baseUrl = await TokenStorage.getBaseUrl();
    final uri = Uri.parse('$baseUrl$_base$path');
    final headers = <String, String>{'Accept': 'application/json'};

    if (auth) {
      final token = await TokenStorage.getAccessToken();
      if (token == null || token.isEmpty) {
        throw const GamificationException(
          'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
          statusCode: 401,
        );
      }
      headers['Authorization'] = 'Bearer $token';
    }

    try {
      final request = http.Request(method, uri)..headers.addAll(headers);
      final streamed =
          await request.send().timeout(const Duration(seconds: 15));
      final response = await http.Response.fromStream(streamed);
      final body = utf8.decode(response.bodyBytes);
      final dynamic decoded = body.isEmpty ? null : jsonDecode(body);

      if (response.statusCode >= 200 && response.statusCode < 300) {
        return decoded is Map ? decoded['data'] : decoded;
      }

      final map = decoded is Map ? decoded : const {};
      final serverMessage = map['message']?.toString();
      if (response.statusCode == 401) {
        throw GamificationException(
          'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
          statusCode: 401,
        );
      }
      throw GamificationException(
        (serverMessage != null && serverMessage.isNotEmpty)
            ? serverMessage
            : 'Không thể xử lý yêu cầu (mã ${response.statusCode}).',
        code: map['code']?.toString(),
        statusCode: response.statusCode,
      );
    } on TimeoutException {
      throw const GamificationException(
        'Kết nối đến máy chủ quá hạn. Vui lòng thử lại.',
      );
    } on SocketException {
      throw const GamificationException(
        'Không thể kết nối đến máy chủ. Hãy kiểm tra mạng và địa chỉ API.',
      );
    } on FormatException {
      throw const GamificationException('Máy chủ trả về dữ liệu không hợp lệ.');
    }
  }

  List<Map<String, dynamic>> _asList(dynamic data) {
    final list = data is Map && data['content'] is List
        ? data['content'] as List
        : (data is List ? data : const []);
    return list.whereType<Map<String, dynamic>>().toList();
  }

  /// GET /gamification/points/my
  Future<UserPointModel> getMyPoints() async {
    final data = await _request('GET', '/points/my');
    return UserPointModel.fromJson(
      data is Map<String, dynamic> ? data : <String, dynamic>{},
    );
  }

  /// GET /gamification/badges/my
  Future<List<UserBadgeModel>> getMyBadges() async {
    final data = await _request('GET', '/badges/my');
    return _asList(data).map(UserBadgeModel.fromJson).toList();
  }

  /// GET /gamification/points/history (trả về Page của Spring, lấy `content`)
  Future<List<PointTransactionModel>> getPointHistory({
    int page = 0,
    int size = 20,
  }) async {
    final data = await _request('GET', '/points/history?page=$page&size=$size');
    return _asList(data).map(PointTransactionModel.fromJson).toList();
  }

  /// GET /gamification/vouchers (công khai)
  Future<List<VoucherModel>> getVouchers() async {
    final data = await _request('GET', '/vouchers', auth: false);
    return _asList(data).map(VoucherModel.fromJson).toList();
  }

  /// GET /gamification/vouchers/my?status=
  Future<List<UserVoucherModel>> getMyVouchers({String? status}) async {
    final query = status == null ? '' : '?status=$status';
    final data = await _request('GET', '/vouchers/my$query');
    return _asList(data).map(UserVoucherModel.fromJson).toList();
  }

  /// POST /gamification/vouchers/{id}/redeem
  Future<UserVoucherModel> redeemVoucher(int voucherId) async {
    final data = await _request('POST', '/vouchers/$voucherId/redeem');
    return UserVoucherModel.fromJson(
      data is Map<String, dynamic> ? data : <String, dynamic>{},
    );
  }
}
