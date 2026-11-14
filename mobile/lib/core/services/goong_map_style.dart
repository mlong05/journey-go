import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:http/http.dart' as http;
import 'package:vector_map_tiles/vector_map_tiles.dart';
import 'package:vector_tile_renderer/vector_tile_renderer.dart' as vtr;

/// Bản đồ nền Goong (bản đồ vector của Việt Nam: địa danh tiếng Việt cập nhật, có Hoàng Sa, Trường Sa).
///
/// Cần khóa **Maptiles** của Goong (`GOONG_MAPTILES_KEY` trong `.env`). Khóa này khác khóa REST đang để ở
/// backend cho chỉ đường, và phải nằm trong app nên cần giới hạn theo tên gói ứng dụng ở account.goong.io.
/// Không có khóa hoặc tải lỗi thì [street] trả null (bản đồ chỉ hiện màu nền; lần mở sau tải lại).
/// [preload] tải sẵn cả 2 style ngay khi mở app để lúc mở bản đồ không phải chờ.
class GoongMapStyle {
  GoongMapStyle._();

  static const _styleBase = 'https://tiles.goong.io/assets';

  /// Bản đồ đang hiển thị bằng Goong hay chưa (để ghi đúng nguồn bản đồ).
  static final ValueNotifier<bool> active = ValueNotifier(false);

  static Future<Style?>? _street;
  static Future<Style?>? _satelliteLabels;

  static String? get _key {
    try {
      final key = dotenv.maybeGet('GOONG_MAPTILES_KEY')?.trim();
      return (key == null || key.isEmpty) ? null : key;
    } catch (_) {
      return null; // .env chưa nạp
    }
  }

  static bool get configured => _key != null;

  /// Tải sẵn style đường phố + lớp chữ vệ tinh (chạy nền lúc mở app).
  static void preload() {
    if (!configured) return;
    street();
    satelliteLabels();
  }

  /// Style đường phố của Goong; dùng chung cho mọi bản đồ trong app (chỉ tải một lần).
  static Future<Style?> street() => _street ??= _load('goong_map_web', onError: () => _street = null);

  /// Mẫu URL ảnh vệ tinh của Goong (lấy từ TileJSON `sources/satellite.json`), null khi chưa có khóa.
  static String? get satelliteTileUrl {
    final key = _key;
    return key == null ? null : 'https://satellite.goong.io/{z}/{x}/{y}.png?api_key=$key';
  }

  /// Lớp chữ + đường của style vệ tinh Goong (`goong_satellite`), BỎ lớp ảnh raster —
  /// ảnh vệ tinh được vẽ riêng bằng TileLayer bên dưới, lớp này phủ tên địa danh lên trên.
  static Future<Style?> satelliteLabels() => _satelliteLabels ??= _load(
        'goong_satellite',
        dropRaster: true,
        markActive: false,
        onError: () => _satelliteLabels = null,
      );

  static Future<Style?> _load(
    String styleName, {
    required VoidCallback onError,
    bool dropRaster = false,
    bool markActive = true,
  }) async {
    final key = _key;
    if (key == null) return null;
    try {
      final style = await _read('$_styleBase/$styleName.json', key, dropRaster: dropRaster);
      if (markActive) active.value = true;
      return style;
    } catch (e) {
      debugPrint('Không tải được bản đồ Goong ($styleName): $e');
      onError(); // lần mở bản đồ sau thử lại
      return null;
    }
  }

  /// Đọc style Mapbox GL của Goong. Không dùng StyleReader của thư viện vì nó chỉ gắn khóa vào URL có
  /// `{key}`; ở đây mọi URL của Goong (nguồn, ô bản đồ, sprite) đều được gắn `api_key` nếu còn thiếu.
  static Future<Style> _read(String styleUrl, String key, {bool dropRaster = false}) async {
    final json = await _getJson(_withKey(styleUrl, key));
    if (json is! Map<String, dynamic>) throw const FormatException('Style không hợp lệ');

    if (dropRaster) {
      // Bỏ nguồn + lớp raster (ảnh vệ tinh) và lớp nền: chỉ giữ chữ/đường để phủ lên ảnh.
      final sources = json['sources'];
      final rasterIds = <String>{};
      if (sources is Map) {
        sources.removeWhere((id, v) {
          final isRaster = v is Map && (v['type'] == 'raster' || v['type'] == 'raster-dem');
          if (isRaster) rasterIds.add(id.toString());
          return isRaster;
        });
      }
      final layers = json['layers'];
      if (layers is List) {
        layers.removeWhere((l) =>
            l is Map &&
            (l['type'] == 'raster' || l['type'] == 'background' || rasterIds.contains(l['source'])));
      }
    }

    final providers = <String, VectorTileProvider>{};
    final sources = json['sources'];
    if (sources is Map) {
      for (final entry in sources.entries) {
        final value = entry.value;
        if (value is! Map) continue;
        final type = TileProviderType.values
            .where((t) => t.name.replaceAll('_', '-') == value['type'])
            .firstOrNull;
        if (type == null) continue;
        var source = value;
        final url = value['url'];
        if (url is String) {
          final tileJson = await _getJson(_withKey(url, key));
          if (tileJson is Map) source = tileJson;
        }
        final tiles = source['tiles'];
        if (tiles is! List || tiles.isEmpty) continue;
        providers[entry.key.toString()] = NetworkVectorTileProvider(
          type: type,
          urlTemplate: _withKey(tiles.first.toString(), key),
          maximumZoom: (source['maxzoom'] as num?)?.toInt() ?? 14,
          minimumZoom: (source['minzoom'] as num?)?.toInt() ?? 1,
        );
      }
    }
    if (providers.isEmpty) throw const FormatException('Style không có nguồn bản đồ');

    SpriteStyle? sprites;
    final sprite = json['sprite'];
    if (sprite is String && sprite.trim().isNotEmpty) {
      for (final suffix in const ['@2x', '']) {
        try {
          final index = await _getJson(_spriteUrl(sprite, suffix, 'json', key));
          if (index is! Map<String, dynamic>) continue;
          final imageUrl = _spriteUrl(sprite, suffix, 'png', key);
          sprites = SpriteStyle(
            atlasProvider: () => _getBytes(imageUrl),
            index: vtr.SpriteIndexReader().read(index),
          );
          break;
        } catch (_) {
          // Thiếu sprite thì bản đồ vẫn vẽ được, chỉ không có biểu tượng.
        }
      }
    }

    return Style(
      name: json['name']?.toString(),
      theme: vtr.ThemeReader().read(json),
      providers: TileProviders(providers),
      sprites: sprites,
    );
  }

  /// Gắn `api_key` vào URL của Goong nếu chưa có; URL của nơi khác giữ nguyên.
  static String _withKey(String url, String key) {
    final uri = Uri.tryParse(url);
    if (uri == null || !uri.host.endsWith('goong.io') || uri.queryParameters.containsKey('api_key')) {
      return url;
    }
    // Không dùng Uri.replace: nó mã hóa {z}/{x}/{y} trong mẫu URL ô bản đồ.
    return '$url${url.contains('?') ? '&' : '?'}api_key=$key';
  }

  /// `.../sprite?x=1` → `.../sprite@2x.json?x=1` (giữ tham số, gắn khóa).
  static String _spriteUrl(String sprite, String suffix, String ext, String key) {
    final q = sprite.indexOf('?');
    final base = q < 0 ? sprite : sprite.substring(0, q);
    final query = q < 0 ? '' : sprite.substring(q);
    return _withKey('$base$suffix.$ext$query', key);
  }

  static Future<dynamic> _getJson(String url) async {
    final res = await http.get(Uri.parse(url)).timeout(const Duration(seconds: 12));
    if (res.statusCode != 200) throw http.ClientException('HTTP ${res.statusCode}', Uri.parse(url));
    return compute(jsonDecode, utf8.decode(res.bodyBytes));
  }

  static Future<Uint8List> _getBytes(String url) async {
    final res = await http.get(Uri.parse(url)).timeout(const Duration(seconds: 12));
    if (res.statusCode != 200) throw http.ClientException('HTTP ${res.statusCode}', Uri.parse(url));
    return res.bodyBytes;
  }
}
