# Hướng Dẫn Tích Hợp Google OAuth2 Cho Mobile Bằng In-App Browser & Deep Link
## (Giải pháp không cần cấu hình Android Client ID & Không cần mã SHA-1)

Tài liệu này hướng dẫn chi tiết cho Developer Mobile (Flutter) cách kết nối với Backend JourneyGo để thực hiện tính năng **Đăng nhập / Đăng ký bằng Google** thông qua **In-App Browser & Deep Link**.

---

## 1. Tại Sao Sử Dụng Giải Pháp Này?

- **Không cần cấu hình Android Client ID trên Google Cloud Console.**
- **Không cần lấy mã vân tay SHA-1 của từng máy developer.**
- **Tận dụng 100% cấu hình Google Web Client ID sẵn có của Backend & Web.**
- Chuẩn bảo mật cao nhất: Google xác thực trong WebView/Chrome Tabs chính chủ của hệ điều hành, chống rò rỉ thông tin đăng nhập.

---

## 2. Luồng Hoạt Động (Flow Diagram)

```
[Mobile App]
    │  1. Bấm nút "Đăng nhập Google"
    │  2. Mở trình duyệt (Custom Tabs) trỏ đến:
    │     http://<HOST>:8088/oauth2/authorization/google?redirect_uri=journeygo://oauth2/redirect&role=TOURIST
    ▼
[Google Login Web Page]
    │  3. Du khách chọn tài khoản Google & đồng ý cấp quyền
    ▼
[JourneyGo Backend]
    │  4. Nhận mã callback từ Google (/login/oauth2/code/google)
    │  5. Tự động tìm hoặc tạo mới tài khoản User (Role TOURIST)
    │  6. Sinh Access Token (JWT) & Refresh Token
    │  7. Chuyển hướng trình duyệt về Deep Link:
    │     journeygo://oauth2/redirect?token=<accessToken>&refreshToken=<refreshToken>
    ▼
[Hệ điều hành Android / iOS]
    │  8. Bắt schema "journeygo://" -> Đánh thức App Flutter
    ▼
[Mobile App]
       9. Bóc tách `token` và `refreshToken` từ URL
      10. Lưu vào SharedPreferences & Điều hướng vào màn hình chính!
```

---

## 3. Cấu Hình Phía Mobile (Flutter)

### Bước 1: Khai báo Deep Link trong `AndroidManifest.xml`
Mở file `mobile/android/app/src/main/AndroidManifest.xml`, thêm khối `<intent-filter>` sau vào bên trong thẻ `<activity android:name=".MainActivity">`:

```xml
        <activity
            android:name=".MainActivity"
            ...>
            
            <!-- Đã có sẵn thẻ Main Launcher -->
            <intent-filter>
                <action android:name="android.intent.action.MAIN"/>
                <category android:name="android.intent.category.LAUNCHER"/>
            </intent-filter>

            <!-- THÊM MỚI: Deep Link cho Google OAuth2 -->
            <intent-filter android:autoVerify="true">
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data
                    android:scheme="journeygo"
                    android:host="oauth2"
                    android:path="/redirect" />
            </intent-filter>

        </activity>
```

---

### Bước 2: Cài đặt thư viện Deep Link & Mở trình duyệt
Trong file `mobile/pubspec.yaml`, thêm 2 packages phổ biến nhất:
```yaml
dependencies:
  url_launcher: ^6.3.0    # Dùng để mở Chrome Custom Tabs
  app_links: ^6.3.2       # Dùng để lắng nghe Deep Link khi trình duyệt redirect về
```
Sau đó chạy:
```bash
flutter pub get
```

---

### Bước 3: Code mẫu Flutter hoàn chỉnh

#### A. Hàm gọi mở đăng nhập Google:
```dart
import 'package:url_launcher/url_launcher.dart';

// Lưu ý về địa chỉ IP Backend:
// - Nếu chạy trên Máy ảo Android Emulator: dùng http://10.0.2.2:8088
// - Nếu chạy trên Thiết bị thật: dùng địa chỉ IP LAN máy tính của bạn (VD: http://192.168.1.15:8088)
const String backendBaseUrl = 'http://10.0.2.2:8088';

Future<void> loginWithGoogleInApp() async {
  final redirectUri = Uri.encodeComponent('journeygo://oauth2/redirect');
  final authUrl = Uri.parse(
    '$backendBaseUrl/oauth2/authorization/google?redirect_uri=$redirectUri&role=TOURIST'
  );

  if (await canLaunchUrl(authUrl)) {
    await launchUrl(
      authUrl,
      mode: LaunchMode.externalApplication, // Mở Chrome Tabs ngoài app để tránh bị Google chặn WebView
    );
  } else {
    throw Exception('Không thể mở đường dẫn đăng nhập Google: $authUrl');
  }
}
```

#### B. Lắng nghe Deep Link khi đăng nhập thành công:
Đặt đoạn lắng nghe này trong `initState()` của màn hình đăng nhập hoặc `main.dart`:

```dart
import 'package:app_links/app_links.dart';
import 'package:shared_preferences/shared_preferences.dart';

late AppLinks _appLinks;

@override
void initState() {
  super.initState();
  _initDeepLinks();
}

void _initDeepLinks() {
  _appLinks = AppLinks();

  // Lắng nghe link khi app đang mở hoặc được đánh thức
  _appLinks.uriLinkStream.listen((Uri? uri) {
    if (uri != null) {
      _handleDeepLink(uri);
    }
  });
}

Future<void> _handleDeepLink(Uri uri) async {
  // Kiểm tra đúng scheme và host
  if (uri.scheme == 'journeygo' && uri.host == 'oauth2') {
    final token = uri.queryParameters['token'];
    final refreshToken = uri.queryParameters['refreshToken'];
    final error = uri.queryParameters['error'];

    if (error != null) {
      debugPrint('Đăng nhập Google thất bại: $error');
      // Hiển thị thông báo lỗi lên giao diện
      return;
    }

    if (token != null && refreshToken != null) {
      // 1. Lưu token vào SharedPreferences
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('accessToken', token);
      await prefs.setString('refreshToken', refreshToken);

      debugPrint('Đăng nhập Google thành công! Token: $token');

      // 2. Chuyển hướng người dùng sang Màn hình chính (Home / Journey Screen)
      Navigator.pushReplacementNamed(context, '/home');
    }
  }
}
```

---

## 4. Dành Cho Backend Đã Triển Khai Những Gì?

1. **Hỗ trợ Custom App Scheme (`journeygo://`):**
   - Đã cấu hình danh sách redirect hợp lệ trong `application.yml`:
     `journeygo://oauth2/redirect` và `journeygo://auth/callback`.
   - Lớp `OAuth2AuthenticationSuccessHandler` đã hỗ trợ so khớp scheme/host/path cho cả Web (`http/https`) và Mobile (`journeygo://`).

2. **Hỗ trợ tham số phân quyền (`role`):**
   - Lưu trữ `role=TOURIST` từ query parameter qua Cookie phiên để đảm bảo du khách tạo tài khoản đúng quyền `TOURIST` mà không bị can thiệp trái phép.

3. **Cơ chế chống tấn công Open Redirect:**
   - Chỉ cho phép redirect về các URL đã được khai báo whitelist trên Backend.

---
*Tài liệu được phát triển dành riêng cho dự án JourneyGo Mobile.*
