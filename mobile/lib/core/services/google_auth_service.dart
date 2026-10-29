import 'package:google_sign_in/google_sign_in.dart';
import '../constants/api_constants.dart';

/// Dịch vụ Google Sign-In dùng cho Android (Mobile Tourist App).
/// API google_sign_in 6.x: dùng GoogleSignIn() trực tiếp + signIn().
class GoogleAuthService {
  GoogleAuthService._internal();

  static GoogleSignIn? _instance;

  /// Khởi tạo GoogleSignIn một lần duy nhất khi app start.
  /// Phải gọi hàm này trong main.dart trước khi dùng [signIn].
  static Future<void> init() async {
    if (_instance != null) return;
    // Android chỉ trả idToken khi có serverClientId (Web Client ID).
    final webClientId = ApiConstants.googleWebClientId;
    if (webClientId.isEmpty) {
      throw Exception(
        'GOOGLE_WEB_CLIENT_ID chưa được cấu hình.\n'
        'Điền vào mobile/.env hoặc chạy: flutter run --dart-define=GOOGLE_WEB_CLIENT_ID=<client_id>',
      );
    }
    _instance = GoogleSignIn(
      serverClientId: webClientId,
      scopes: const ['email', 'profile', 'openid'],
    );
  }

  /// Mở Google Sign-In flow và trả về idToken để gửi lên backend.
  /// Backend Spring sẽ verify idToken này và cấp accessToken/refreshToken.
  static Future<String> signInAndGetIdToken() async {
    // Thử khởi tạo lại: nếu vẫn thiếu cấu hình, init() ném lỗi nêu đúng biến còn thiếu.
    await init();
    final GoogleSignInAccount? account = await _instance!.signIn();
    if (account == null) {
      throw Exception('Người dùng đã huỷ đăng nhập Google.');
    }
    final GoogleSignInAuthentication auth = await account.authentication;
    final String? idToken = auth.idToken;
    if (idToken == null || idToken.isEmpty) {
      throw Exception('Không lấy được idToken từ Google. Vui lòng thử lại.');
    }
    return idToken;
  }
}
