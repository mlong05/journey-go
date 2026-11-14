import 'api_client.dart';

/// Vùng miền hoặc chủ đề du lịch (danh mục do Admin quản lý).
class CatalogItem {
  final int id;
  final String name;
  final String slug;

  /// Ảnh đại diện (ảnh chụp thật, Admin tải lên); null thì trang chủ dùng ảnh bìa của một tour cùng danh mục.
  final String? imageUrl;

  /// Ghi nguồn ảnh (tác giả · giấy phép) khi ảnh không phải của JourneyGo.
  final String? imageCredit;

  const CatalogItem({required this.id, required this.name, required this.slug, this.imageUrl, this.imageCredit});

  factory CatalogItem.fromJson(Map<String, dynamic> json) {
    final url = json['imageUrl']?.toString().trim();
    final credit = json['imageCredit']?.toString().trim();
    return CatalogItem(
      id: json['id'] is num ? (json['id'] as num).toInt() : int.tryParse('${json['id']}') ?? 0,
      name: json['name']?.toString() ?? '',
      slug: json['slug']?.toString() ?? '',
      imageUrl: (url != null && url.startsWith('https://')) ? url : null,
      imageCredit: (credit == null || credit.isEmpty) ? null : credit,
    );
  }
}

/// Đọc danh mục vùng miền / chủ đề (GET công khai). Giữ trong bộ nhớ vì hiếm khi đổi.
class CatalogService {
  static final CatalogService _instance = CatalogService._internal();
  factory CatalogService() => _instance;
  CatalogService._internal();

  List<CatalogItem>? _regions;
  List<CatalogItem>? _themes;

  Future<List<CatalogItem>> getRegions({bool refresh = false}) async {
    if (!refresh && _regions != null) return _regions!;
    return _regions = await _load('/regions');
  }

  Future<List<CatalogItem>> getThemes({bool refresh = false}) async {
    if (!refresh && _themes != null) return _themes!;
    return _themes = await _load('/themes');
  }

  static Future<List<CatalogItem>> _load(String path) async {
    final data = await ApiClient.request('GET', path, auth: false);
    return ApiClient.asList(data)
        .where((m) => m['deleted'] != true)
        .map(CatalogItem.fromJson)
        .where((c) => c.id > 0 && c.name.isNotEmpty)
        .toList();
  }
}
