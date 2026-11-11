import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter_dotenv/flutter_dotenv.dart';

class ApiConstants {
  // Cổng mặc định của Spring Boot backend
  static const int defaultPort = 8088;

  // Đường dẫn cơ sở mặc định tự động nhận diện theo môi trường
  static String getDefaultBaseUrl() {
    if (kIsWeb) {
      return 'http://localhost:$defaultPort/api/v1';
    }
    try {
      if (Platform.isAndroid) {
        // Android Emulator truy cập localhost của máy chủ host qua 10.0.2.2
        return 'http://10.0.2.2:$defaultPort/api/v1';
      }
    } catch (_) {}
    // iOS simulator / macOS / Windows / Linux
    return 'http://127.0.0.1:$defaultPort/api/v1';
  }

  // Endpoints Xác thực (Auth)
  static const String loginEndpoint = '/auth/login';
  static const String logoutEndpoint = '/auth/logout';
  static const String refreshEndpoint = '/auth/refresh';
  static const String registerEndpoint = '/auth/register';
  static const String meEndpoint = '/auth/me';
  static const String profileEndpoint = '/auth/profile';
  static const String destinationsEndpoint = '/destinations';

  // ── Endpoint Booking / Payment / Refund ───────────────────────────────────
  static const String bookingsEndpoint = '/bookings';
  static const String paymentsEndpoint = '/payments';
  static const String refundsEndpoint = '/refunds';

  // Chu kỳ poll trạng thái thanh toán VNPay (milliseconds).
  static const int paymentPollIntervalMs = 2500;

  // Vai trò cho phép trên Mobile Tourist App.
  // Backend chỉ còn 4 role chính thức (ADMIN, CONTENT_MODERATOR, CONTENT_PROVIDER, TOURIST);
  // role 'USER' cũ đã bị gỡ trong đợt hợp nhất Role → Content Provider.
  static const String requiredRole = 'TOURIST';

  // Web Client ID: audience của idToken gửi lên backend (serverClientId của google_sign_in).
  // Cùng giá trị với NEXT_PUBLIC_GOOGLE_CLIENT_ID của frontend.
  static String get googleWebClientId {
    final fromEnv = dotenv.maybeGet('GOOGLE_WEB_CLIENT_ID');
    if (fromEnv != null && fromEnv.isNotEmpty) return fromEnv;
    return const String.fromEnvironment('GOOGLE_WEB_CLIENT_ID');
  }

  // Google OAuth Client ID - ƯU TIÊN:
  //   1. File .env (khuyến nghị cho dev)
  //   2. --dart-define=GOOGLE_ANDROID_CLIENT_ID=... (CI/CD)
  //   3. Rỗng (sẽ báo lỗi rõ ràng khi khởi tạo GoogleAuthService)
  static String get googleAndroidClientId {
    // 1) Đọc từ .env (đã được dotenv.load() trong main.dart)
    final fromEnv = dotenv.maybeGet('GOOGLE_ANDROID_CLIENT_ID');
    if (fromEnv != null && fromEnv.isNotEmpty) return fromEnv;

    // 2) Fallback: --dart-define khi build
    return const String.fromEnvironment('GOOGLE_ANDROID_CLIENT_ID');
  }
}
