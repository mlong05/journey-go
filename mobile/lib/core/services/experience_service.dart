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

    // Dữ liệu mẫu ban đầu về trải nghiệm di sản văn hóa
    return _getDefaultExperiences();
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

  List<ExperienceModel> _getDefaultExperiences() {
    return [
      ExperienceModel(
        id: 1,
        destinationId: 1,
        title: 'Trải nghiệm Khám phá Khuê Văn Các & 82 Bia Tiến Sĩ',
        description: 'Tham gia giải đố thử thách lịch sử khoa cử Nho học, check-in định vị GPS tại giếng Thiên Quang và nhận huy hiệu danh nhân.',
        price: 50000,
        currency: 'VND',
        durationMinutes: 90,
        status: 'PUBLISHED',
        taskCount: 3,
        checkInPointCount: 2,
        coverImage: 'assets/images/vanmieu.png',
      ),
      ExperienceModel(
        id: 2,
        destinationId: 2,
        title: 'Hành trình Theo dấu Vương triều Thăng Long ngàn năm',
        description: 'Khám phá cổng Đoan Môn, lầu Hậu Lâu và khu khảo cổ 18 Hoàng Diệu với lộ trình check-in GPS và câu đố lịch sử Đại Việt.',
        price: 80000,
        currency: 'VND',
        durationMinutes: 150,
        status: 'PUBLISHED',
        taskCount: 4,
        checkInPointCount: 3,
        coverImage: 'assets/images/thanglong.png',
      ),
      ExperienceModel(
        id: 3,
        destinationId: 3,
        title: 'Tự tay Chuốt gốm & Tìm hiểu Men gốm cổ Bát Tràng',
        description: 'Trải nghiệm xoay bàn gốm truyền thống, thử thách giải đố hoa văn men lam thời Lê - Nguyễn và nhận sản phẩm hoàn thiện.',
        price: 120000,
        currency: 'VND',
        durationMinutes: 120,
        status: 'PUBLISHED',
        taskCount: 2,
        checkInPointCount: 2,
        coverImage: 'assets/images/gomsu.png',
      ),
    ];
  }
}
