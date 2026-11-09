import 'api_client.dart';

/// Vùng miền hoặc chủ đề du lịch (danh mục do Admin quản lý).
class CatalogItem {
  final int id;
  final String name;
  final String slug;

  const CatalogItem({required this.id, required this.name, required this.slug});

  factory CatalogItem.fromJson(Map<String, dynamic> json) => CatalogItem(
        id: json['id'] is num ? (json['id'] as num).toInt() : int.tryParse('${json['id']}') ?? 0,
        name: json['name']?.toString() ?? '',
        slug: json['slug']?.toString() ?? '',
      );
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
