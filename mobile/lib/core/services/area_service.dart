import 'api_client.dart';
import 'location_service.dart';

/// Tên tỉnh/thành du khách đang đứng, lấy từ GPS rồi tra địa chỉ qua Goong (GET /geo/reverse).
/// Mỗi phiên mở app chỉ tra một lần thành công để tiết kiệm hạn mức Goong.
class AreaService {
  AreaService._();

  static Future<String?>? _pending;

  /// Ví dụ "TP. Hồ Chí Minh", "Hà Nội"; null khi chưa có quyền vị trí hoặc tra không được (lần sau thử lại).
  static Future<String?> currentProvince() => _pending ??= _resolve();

  static Future<String?> _resolve() async {
    String? result;
    try {
      final pos = await LocationService.positionIfPermitted();
      if (pos != null) {
        final data = await ApiClient.request('GET', '/geo/reverse?lat=${pos.latitude}&lng=${pos.longitude}');
        if (data is Map) result = shortProvince(data['province']?.toString());
      }
    } catch (_) {
      result = null;
    }
    if (result == null) _pending = null;
    return result;
  }

  /// "Thành Phố Hồ Chí Minh" -> "TP. Hồ Chí Minh", "Tỉnh Ninh Bình" -> "Ninh Bình".
  static String? shortProvince(String? name) {
    final value = name?.trim() ?? '';
    if (value.isEmpty) return null;
    final lower = value.toLowerCase();
    if (lower.startsWith('thành phố ')) {
      final rest = value.substring('thành phố '.length);
      return rest.toLowerCase() == 'hà nội' ? 'Hà Nội' : 'TP. $rest';
    }
    if (lower.startsWith('tỉnh ')) return value.substring('tỉnh '.length);
    return value;
  }
}
