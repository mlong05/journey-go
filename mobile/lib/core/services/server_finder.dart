import 'dart:async';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:http/http.dart' as http;
import '../constants/api_constants.dart';

/// Tìm địa chỉ backend dùng được khi chưa lưu địa chỉ nào.
///
/// `10.0.2.2` chỉ tồn tại trong máy ảo Android; điện thoại thật cần IP Wi-Fi của máy tính
/// (khai báo `API_BASE_URL` trong .env) hoặc `127.0.0.1` khi cắm USB và chạy
/// `adb reverse tcp:8088 tcp:8088`. Thử song song các địa chỉ, lấy địa chỉ trả lời đầu tiên.
class ServerFinder {
  ServerFinder._();

  static Future<String>? _found;

  /// `true` khi lần dò gần nhất KHÔNG địa chỉ nào trả lời.
  /// Dùng để báo lỗi ngay (thay vì chờ request hết hạn 15 giây).
  static bool lastProbeFailed = false;

  /// Hướng dẫn hiển thị khi không tìm thấy máy chủ.
  static const String unreachableHint =
      'Không tìm thấy máy chủ JourneyGo.\n'
      '• Kiểm tra backend local đã chạy (Docker: cổng ${ApiConstants.dockerPort}, mvnw: cổng ${ApiConstants.defaultPort}).\n'
      '• Cắm USB: chạy mobile/run-usb.sh (adb reverse cổng ${ApiConstants.dockerPort} và ${ApiConstants.defaultPort}) rồi thử lại.\n'
      '• Dùng domain public: đặt API_BASE_URL trong mobile/.env.';

  /// Địa chỉ khai báo trong .env (API_BASE_URL), nếu có.
  static String? get envBaseUrl {
    if (!dotenv.isInitialized) return null;
    final value = dotenv.maybeGet('API_BASE_URL')?.trim();
    return (value == null || value.isEmpty) ? null : value;
  }

  /// Các địa chỉ sẽ thử, theo thứ tự ưu tiên khi không địa chỉ nào trả lời.
  ///
  /// Có `API_BASE_URL` trong .env ⇒ CHỈ dùng đúng địa chỉ đó (không tự nhảy sang backend khác).
  /// Bỏ trống ⇒ dò các backend local (Docker 8080, mvnw 8088).
  static List<String> get candidates {
    final env = envBaseUrl;
    if (env != null) return [env];
    return ApiConstants.localBaseUrls();
  }

  /// Kết quả được nhớ trong phiên; gọi [reset] để dò lại.
  static Future<String> find() => _found ??= _probeAll();

  static void reset() => _found = null;

  /// Gọi khi request tới địa chỉ đang nhớ bị lỗi kết nối / quá hạn.
  ///
  /// Rút cáp USB hoặc khởi động lại adb làm mất `adb reverse`, đổi Wi-Fi làm đổi IP:
  /// địa chỉ đã dò được không còn dùng được. Quên nó để request sau dò lại từ đầu
  /// (báo lỗi ngay nếu vẫn không thấy máy chủ) thay vì lần nào cũng chờ hết hạn.
  static void markUnreachable() => _found = null;

  /// Máy chủ có trả lời tại [baseUrl] không (mọi mã HTTP đều tính là có).
  static Future<bool> isReachable(String baseUrl, {Duration timeout = const Duration(seconds: 3)}) async {
    try {
      await http
          .get(Uri.parse('${baseUrl.trim()}/destinations?page=0&size=1'))
          .timeout(timeout);
      return true;
    } catch (_) {
      return false;
    }
  }

  /// Thử song song mọi địa chỉ nhưng chọn theo THỨ TỰ ƯU TIÊN (không phải địa chỉ trả lời
  /// nhanh nhất): khi cả backend 8088 lẫn Docker 8080 cùng chạy, app luôn dùng cùng một backend.
  static Future<String> _probeAll() async {
    final list = candidates;
    final results = await Future.wait(
      list.map((url) => isReachable(url, timeout: const Duration(milliseconds: 2500))),
    );
    for (var i = 0; i < list.length; i++) {
      if (results[i]) {
        lastProbeFailed = false;
        return list[i];
      }
    }
    _found = null; // không thấy máy chủ: lần gọi sau thử lại
    lastProbeFailed = true;
    return list.first;
  }
}
