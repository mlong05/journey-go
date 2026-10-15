import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../constants/api_constants.dart';
import '../models/destination_model.dart';
import 'token_storage.dart';

class DestinationService {
  static final DestinationService _instance = DestinationService._internal();
  factory DestinationService() => _instance;
  DestinationService._internal();

  static const String _kCachedDestinationsKey = 'journeygo_cached_destinations_v1';

  /// Lấy danh sách điểm đến đã duyệt từ API Backend (GET /api/v1/destinations/approved)
  Future<List<DestinationModel>> getApprovedDestinations() async {
    final baseUrl = await TokenStorage.getBaseUrl();
    final uri = Uri.parse('$baseUrl${ApiConstants.destinationsEndpoint}/approved');
    final token = await TokenStorage.getAccessToken();

    final headers = <String, String>{
      'Accept': 'application/json',
    };
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }

    try {
      final response = await http.get(uri, headers: headers).timeout(
            const Duration(seconds: 10),
          );

      if (response.statusCode == 200) {
        final dynamic decoded = jsonDecode(utf8.decode(response.bodyBytes));
        final dynamic rawList = (decoded is Map && decoded.containsKey('data'))
            ? decoded['data']
            : decoded;

        if (rawList is List && rawList.isNotEmpty) {
          final list = rawList
              .map((item) => DestinationModel.fromJson(item as Map<String, dynamic>))
              .toList();

          // Lưu cache vào SharedPreferences để sử dụng offline
          await _saveToCache(rawList);
          return list;
        }
      }
    } catch (_) {
      // Khi không có kết nối tới server, đọc từ cache
    }

    // Đọc từ Cache đã lưu hoặc khởi tạo danh sách mặc định di sản
    final cached = await _loadFromCache();
    if (cached.isNotEmpty) {
      return cached;
    }

    return [];
  }

  /// Lấy thông tin chi tiết một điểm đến từ API Backend (GET /api/v1/destinations/{id})
  /// Áp dụng cho mọi role: USER, PROVIDER, MODERATOR, ADMIN
  Future<DestinationModel> getDestinationById(int id) async {
    final baseUrl = await TokenStorage.getBaseUrl();
    final uri = Uri.parse(
      '$baseUrl${ApiConstants.destinationsEndpoint}/$id',
    );
    final token = await TokenStorage.getAccessToken();

    final headers = <String, String>{
      'Accept': 'application/json',
    };
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }

    try {
      final response = await http.get(uri, headers: headers).timeout(
        const Duration(seconds: 10),
      );

      if (response.statusCode == 200) {
        final dynamic decoded = jsonDecode(utf8.decode(response.bodyBytes));
        // Hỗ trợ cả 2 dạng response: { data: {...} } hoặc trực tiếp object
        final dynamic raw = (decoded is Map && decoded.containsKey('data'))
            ? decoded['data']
            : decoded;
        if (raw is Map<String, dynamic>) {
          return DestinationModel.fromJson(raw);
        }
      }
    } catch (_) {
      // Rơi xuống fallback bên dưới khi không có kết nối tới server
    }

    // Fallback: tìm trong cache; nếu không có → throw error
    final cached = await _loadFromCache();
    final fromCache = cached.where((d) => d.id == id).toList();
    if (fromCache.isNotEmpty) {
      return fromCache.first;
    }

    throw Exception(
      'Không thể tải chi tiết điểm đến #$id. Vui lòng kiểm tra kết nối và thử lại.',
    );
  }

  Future<void> _saveToCache(List<dynamic> rawList) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_kCachedDestinationsKey, jsonEncode(rawList));
    } catch (_) {}
  }

  Future<List<DestinationModel>> _loadFromCache() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final str = prefs.getString(_kCachedDestinationsKey);
      if (str != null && str.isNotEmpty) {
        final decoded = jsonDecode(str) as List<dynamic>;
        return decoded
            .map((item) => DestinationModel.fromJson(item as Map<String, dynamic>))
            .toList();
      }
    } catch (_) {}
    return [];
  }
}
