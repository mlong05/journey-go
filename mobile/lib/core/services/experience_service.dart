import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/experience_model.dart';
import 'token_storage.dart';

class ExperienceService {
  static final ExperienceService _instance = ExperienceService._internal();
  factory ExperienceService() => _instance;
  ExperienceService._internal();

  static const String _kCachedExperiencesKey = 'journeygo_cached_experiences_v1';

  /// Lấy danh sách gói Tour / Trải nghiệm đã được duyệt & xuất bản
  /// (GET /api/v1/experiences?status=PUBLISHED)
  /// TUÂN THỦ NGHIỆP VỤ: Tourist chỉ được xem Tour ở trạng thái PUBLISHED
  Future<List<ExperienceModel>> getPublishedExperiences({
    int page = 0,
    int size = 20,
  }) async {
    final baseUrl = await TokenStorage.getBaseUrl();
    final uri = Uri.parse('$baseUrl/experiences?status=PUBLISHED&page=$page&size=$size');
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
        // 2. { data: [...] } (List trong ApiResponse)
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
              .map((item) => ExperienceModel.fromJson(item as Map<String, dynamic>))
              // BẢO VỆ 2 LỚP: Đảm bảo chỉ nhận các tour đã được duyệt (status == PUBLISHED)
              .where((e) => e.isPublished)
              .toList();

          // Lưu cache vào SharedPreferences
          await _saveToCache(rawList);
          return list;
        }
      }
    } catch (_) {
      // Khi mất kết nối tới server, đọc từ cache offline
    }

    // Đọc từ Cache đã lưu
    final cached = await _loadFromCache();
    if (cached.isNotEmpty) {
      return cached.where((e) => e.isPublished).toList();
    }

    // Không có mạng và chưa có cache: trả danh sách rỗng để giao diện báo đúng trạng thái.
    return [];
  }

  /// Lấy danh sách gói trải nghiệm theo Điểm đến (GET /api/v1/destinations/{destinationId}/experiences)
  /// TUÂN THỦ NGHIỆP VỤ: Chỉ hiển thị các gói tour đã PUBLISHED
  Future<List<ExperienceModel>> getExperiencesByDestination(int destinationId) async {
    final baseUrl = await TokenStorage.getBaseUrl();
    final uri = Uri.parse('$baseUrl/destinations/$destinationId/experiences');
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
        List<dynamic>? rawList;
        if (decoded is Map) {
          final data = decoded['data'];
          if (data is List) {
            rawList = data;
          } else if (data is Map && data['content'] is List) {
            rawList = data['content'] as List;
          }
        } else if (decoded is List) {
          rawList = decoded;
        }

        if (rawList != null && rawList.isNotEmpty) {
          return rawList
              .map((item) => ExperienceModel.fromJson(item as Map<String, dynamic>))
              .where((e) => e.isPublished)
              .toList();
        }
      }
    } catch (_) {}

    // Fallback: Tìm trong cache theo destinationId
    final cached = await _loadFromCache();
    final matched = cached.where((e) => e.destinationId == destinationId && e.isPublished).toList();
    if (matched.isNotEmpty) {
      return matched;
    }

    return [];
  }

  /// Lấy thông tin chi tiết gói trải nghiệm theo ID (GET /api/v1/experiences/{id})
  Future<ExperienceModel> getExperienceById(int id) async {
    final baseUrl = await TokenStorage.getBaseUrl();
    final uri = Uri.parse('$baseUrl/experiences/$id');
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
        final dynamic raw = (decoded is Map && decoded.containsKey('data'))
            ? decoded['data']
            : decoded;
        if (raw is Map<String, dynamic>) {
          final model = ExperienceModel.fromJson(raw);
          if (!model.isPublished) {
            throw Exception('Gói trải nghiệm này chưa được phê duyệt hoặc đang tạm dừng phát hành.');
          }
          return model;
        }
      }
    } catch (e) {
      if (e.toString().contains('chưa được phê duyệt')) rethrow;
    }

    final cached = await _loadFromCache();
    final fromCache = cached.where((e) => e.id == id && e.isPublished).toList();
    if (fromCache.isNotEmpty) {
      return fromCache.first;
    }

    throw Exception('Không tìm thấy thông tin gói trải nghiệm #$id');
  }

  Future<void> _saveToCache(List<dynamic> rawList) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_kCachedExperiencesKey, jsonEncode(rawList));
    } catch (_) {}
  }

  Future<List<ExperienceModel>> _loadFromCache() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final str = prefs.getString(_kCachedExperiencesKey);
      if (str != null && str.isNotEmpty) {
        final decoded = jsonDecode(str) as List<dynamic>;
        return decoded
            .map((item) => ExperienceModel.fromJson(item as Map<String, dynamic>))
            .toList();
      }
    } catch (_) {}
    return [];
  }
}
