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

    return _getFallbackHeritageDestinations();
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

  /// Danh sách di sản văn hóa trọng điểm ban đầu chuẩn hóa theo thực địa
  List<DestinationModel> _getFallbackHeritageDestinations() {
    return [
      DestinationModel(
        id: 1,
        name: 'Văn Miếu – Quốc Tử Giám',
        address: '58 Quốc Tử Giám, Văn Miếu, Đống Đa, Hà Nội',
        latitude: 21.0277,
        longitude: 105.8351,
        capacity: 5000,
        approved: true,
        deleted: false,
        coverImage: 'assets/images/vanmieu.png',
        duration: 'Nửa ngày (3 giờ)',
        ticketPrice: '50.000 đ',
        numericPrice: 50000,
        rewardPoints: '+100 pts',
        rating: 4.8,
        reviewCount: 1420,
        category: 'history',
        tags: ['Di tích', 'Lịch sử', 'Quốc Tử Giám'],
        stops: [
          DestinationStop(order: 1, name: 'Cổng Đại Trung & Khuê Văn Các', duration: '45 phút'),
          DestinationStop(order: 2, name: 'Vườn Bia Tiến Sĩ 82 bia đá', duration: '1 giờ'),
          DestinationStop(order: 3, name: 'Đại Thành Điện & Nhà Thái Học', duration: '1 giờ'),
        ],
      ),
      DestinationModel(
        id: 2,
        name: 'Hành Trình Ngàn Năm Văn Hiến',
        address: 'Trung tâm Hoàng Thành Thăng Long & Ba Đình, Hà Nội',
        latitude: 21.0364,
        longitude: 105.8353,
        capacity: 8000,
        approved: true,
        deleted: false,
        coverImage: 'assets/images/thanglong.png',
        duration: '1 ngày',
        ticketPrice: '80.000 đ',
        numericPrice: 80000,
        rewardPoints: '+150 pts',
        rating: 4.8,
        reviewCount: 1240,
        category: 'history',
        tags: ['Lịch sử', 'Kiến trúc', 'UNESCO'],
        stops: [
          DestinationStop(order: 1, name: 'Văn Miếu – Quốc Tử Giám', duration: '2 giờ'),
          DestinationStop(order: 2, name: 'Hoàng Thành Thăng Long', duration: '2.5 giờ'),
          DestinationStop(order: 3, name: 'Hồ Tây – Chùa Trấn Quốc', duration: '1 giờ'),
        ],
      ),
      DestinationModel(
        id: 3,
        name: 'Làng Nghề Gốm Bát Tràng',
        address: 'Làng cổ Bát Tràng, Gia Lâm, Hà Nội',
        latitude: 20.9785,
        longitude: 105.9126,
        capacity: 3000,
        approved: true,
        deleted: false,
        coverImage: 'assets/images/gomsu.png',
        duration: 'Nửa ngày',
        ticketPrice: 'Miễn phí',
        numericPrice: 0,
        rewardPoints: '+80 pts',
        rating: 4.6,
        reviewCount: 870,
        category: 'craft',
        tags: ['Làng nghề', 'Thủ công', 'Trải nghiệm'],
        stops: [
          DestinationStop(order: 1, name: 'Chợ Gốm Bát Tràng', duration: '45 phút'),
          DestinationStop(order: 2, name: 'Xưởng thủ công truyền thống', duration: '1.5 giờ'),
          DestinationStop(order: 3, name: 'Bảo tàng Gốm sứ Bát Tràng', duration: '30 phút'),
        ],
      ),
      DestinationModel(
        id: 4,
        name: 'Quần Thể Di Sản Tràng An',
        address: 'Tràng An, Huyện Hoa Lư, Ninh Bình',
        latitude: 20.2506,
        longitude: 105.9048,
        capacity: 10000,
        approved: true,
        deleted: false,
        coverImage: 'assets/images/trangan.png',
        duration: '1 ngày',
        ticketPrice: '250.000 đ',
        numericPrice: 250000,
        rewardPoints: '+200 pts',
        rating: 4.9,
        reviewCount: 3560,
        category: 'scenery',
        tags: ['UNESCO', 'Thiên nhiên', 'Tâm linh', 'Chèo thuyền'],
        stops: [
          DestinationStop(order: 1, name: 'Bến thuyền Tràng An', duration: '3 giờ'),
          DestinationStop(order: 2, name: 'Đền Trần & Hang Nấu Rượu', duration: '1 giờ'),
          DestinationStop(order: 3, name: 'Chùa Bái Đính', duration: '1.5 giờ'),
        ],
      ),
      DestinationModel(
        id: 5,
        name: 'Di Tích Lịch Sử & Kháng Chiến Hà Nội',
        address: '1 Hỏa Lò, Trần Hưng Đạo, Hoàn Kiếm, Hà Nội',
        latitude: 21.0254,
        longitude: 105.8465,
        capacity: 4000,
        approved: true,
        deleted: false,
        coverImage: 'assets/images/baotang.png',
        duration: 'Nửa ngày (3.5 giờ)',
        ticketPrice: '50.000 đ',
        numericPrice: 50000,
        rewardPoints: '+100 pts',
        rating: 4.7,
        reviewCount: 940,
        category: 'history',
        tags: ['Lịch sử', 'Di tích', 'Kháng chiến'],
        stops: [
          DestinationStop(order: 1, name: 'Di tích Nhà tù Hỏa Lò', duration: '1.5 giờ'),
          DestinationStop(order: 2, name: 'Cột Cờ Hà Nội', duration: '45 phút'),
          DestinationStop(order: 3, name: 'Bảo tàng Lịch sử Quân sự', duration: '1 giờ'),
        ],
      ),
    ];
  }
}
