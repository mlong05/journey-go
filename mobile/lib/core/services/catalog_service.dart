import '../../l10n/locale_controller.dart';
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

/// Đọc danh mục vùng miền / chủ đề (GET công khai). Cache theo từng ngôn ngữ đang chọn.
class CatalogService {
  static final CatalogService _instance = CatalogService._internal();
  factory CatalogService() => _instance;
  CatalogService._internal();

  List<CatalogItem>? _regions;
  String? _regionsLang;
  List<CatalogItem>? _themes;
  String? _themesLang;

  void clearCache() {
    _regions = null;
    _regionsLang = null;
    _themes = null;
    _themesLang = null;
  }

  Future<List<CatalogItem>> getRegions({bool refresh = false}) async {
    final lang = acceptLanguage;
    if (!refresh && _regions != null && _regionsLang == lang) return _regions!;
    final loaded = await _load('/regions');
    _regionsLang = lang;
    return _regions = loaded;
  }

  Future<List<CatalogItem>> getThemes({bool refresh = false}) async {
    final lang = acceptLanguage;
    if (!refresh && _themes != null && _themesLang == lang) return _themes!;
    final loaded = await _load('/themes');
    _themesLang = lang;
    return _themes = loaded;
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
