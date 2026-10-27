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

  /// Lấy danh sách điểm đến đã duyệt từ API Backend (GET /api/v1/destinations)
  Future<List<DestinationModel>> getApprovedDestinations() async {
    final baseUrl = await TokenStorage.getBaseUrl();
    // Backend không có /destinations/approved (bị hiểu là /destinations/{id}). GET /destinations
    // vốn chỉ trả điểm đến đã duyệt, đặt size lớn vì mặc định chỉ 10 dòng.
    final uri = Uri.parse('$baseUrl${ApiConstants.destinationsEndpoint}?page=0&size=200');
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
        
        // Hỗ trợ cả 3 cấu trúc response:
        // 1. { data: { content: [...] } } (PageResponse của Spring Boot)
        // 2. { data: [...] } (List thuần trong ApiResponse)
        // 3. [...] (List mảng thô)
        List<dynamic>? rawList;
        if (decoded is Map) {
          final data = decoded['data'];
          if (data is List) {
            rawList = data;
          } else if (data is Map && data['content'] is List) {
            rawList = data['content'] as List;
          } else if (decoded['content'] is List) {
            rawList = decoded['content'] as List;
          }
        } else if (decoded is List) {
          rawList = decoded;
        }

        if (rawList != null && rawList.isNotEmpty) {
          final list = rawList
              .map((item) => DestinationModel.fromJson(item as Map<String, dynamic>))
              // QUY TẮC NGHIỆP VỤ: Tourist chỉ được xem điểm đến đã duyệt (approved == true) và chưa bị xóa
              .where((d) => d.approved && !d.deleted)
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
      // Đảm bảo cache cũng phải tuân thủ điều kiện đã được duyệt
      return cached.where((d) => d.approved && !d.deleted).toList();
    }

    return [];
  }

  /// Lấy thông tin chi tiết một điểm đến từ API Backend (GET /api/v1/destinations/{id})
  /// Áp dụng cho Tourist: chỉ trả về nếu điểm đến đã được duyệt (approved) và chưa xóa
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
          final model = DestinationModel.fromJson(raw);
          // QUY TẮC NGHIỆP VỤ: Tourist không được truy cập điểm đến chưa duyệt hoặc đã xóa
          if (!model.approved || model.deleted) {
            throw Exception('Điểm đến này chưa được phê duyệt hoặc đã tạm dừng phát hành.');
          }
          return model;
        }
      }
    } catch (e) {
      if (e.toString().contains('chưa được phê duyệt')) {
        rethrow;
      }
      // Rơi xuống fallback bên dưới khi không có kết nối tới server
    }

    // Fallback: tìm trong cache; nếu không có → throw error
    final cached = await _loadFromCache();
    final fromCache = cached.where((d) => d.id == id && d.approved && !d.deleted).toList();
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
