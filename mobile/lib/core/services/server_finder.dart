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
      '• Cắm USB: chạy "adb reverse tcp:${ApiConstants.defaultPort} tcp:${ApiConstants.defaultPort}" '
      '(hoặc mobile/run-usb.sh) rồi thử lại.\n'
      '• Dùng Wi-Fi: điện thoại và máy tính phải cùng mạng, API_BASE_URL trong .env là IP máy tính.';

  /// Địa chỉ khai báo trong .env (API_BASE_URL), nếu có.
  static String? get envBaseUrl {
    final value = dotenv.maybeGet('API_BASE_URL')?.trim();
    return (value == null || value.isEmpty) ? null : value;
  }

  /// Các địa chỉ sẽ thử, theo thứ tự ưu tiên khi không địa chỉ nào trả lời.
  static List<String> get candidates => {
        ?envBaseUrl,
        ApiConstants.getDefaultBaseUrl(),
        'http://127.0.0.1:${ApiConstants.defaultPort}/api/v1',
      }.toList();

  /// Kết quả được nhớ trong phiên; gọi [reset] để dò lại.
  static Future<String> find() => _found ??= _probeAll();

  static void reset() => _found = null;

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

  static Future<String> _probeAll() {
    final list = candidates;
    final done = Completer<String>();
    var pending = list.length;
    for (final url in list) {
      isReachable(url, timeout: const Duration(milliseconds: 2500)).then((ok) {
        pending--;
        if (done.isCompleted) return;
        if (ok) {
          lastProbeFailed = false;
          done.complete(url);
        } else if (pending == 0) {
          _found = null; // không thấy máy chủ: lần gọi sau thử lại
          lastProbeFailed = true;
          done.complete(list.first);
        }
      });
    }
    return done.future;
  }
}
