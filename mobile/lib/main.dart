import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'core/constants/app_colors.dart';
import 'core/models/auth_models.dart';
import 'core/services/google_auth_service.dart';
import 'core/services/invitation_deep_link_service.dart';
import 'core/services/payment_result_service.dart';
import 'core/services/token_storage.dart';
import 'screens/booking/invitation_deep_link_host.dart';
import 'screens/booking/pending_payment_host.dart';
import 'screens/tourist_home_screen.dart';
import 'tourist_auth_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Load biến môi trường từ file .env (nếu có). Nếu thiếu file, vẫn chạy tiếp
  // và dùng --dart-define làm fallback.
  try {
    await dotenv.load(fileName: '.env');
  } catch (e) {
    debugPrint('Không tìm thấy file .env, sẽ dùng --dart-define làm fallback. Lỗi: $e');
  }

  // Đặt thanh trạng thái trong suốt cho Hero Banner tràn viền
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
      statusBarBrightness: Brightness.dark,
    ),
  );

  // Khởi tạo Google Sign-In (chỉ dùng cho Android).
  // Nếu chưa truyền --dart-define=GOOGLE_ANDROID_CLIENT_ID=... thì sẽ in lỗi ra console nhưng không crash app.
  try {
    await GoogleAuthService.init();
  } catch (e) {
    debugPrint('GoogleAuthService.init() lỗi: $e');
  }

  // Bắt deep link `journeygo://payment/return` TRƯỚC KHI render app.
  //
  // ⚠️ Phải khởi tạo sớm: khi VNPay trả khách về app bằng deep link, app có thể
  // đang ở trạng thái "chưa có listener" (app vừa bị hệ điều kill trong lúc khách
  // ở trình duyệt). `PaymentDeepLinkService` giữ deep link đó lại và phát lại khi
  // có listener ⇒ không bị mất.
  try {
    await PaymentResultService().init();
  } catch (e) {
    debugPrint('PaymentResultService.init() lỗi: $e');
  }

  // Bắt deep link `journeygo://booking/invitations/accept?token=...` TRƯỚC KHI render app.
  //
  // ⚠️ Phải khởi tạo sớm: khi khách bấm link trong email mà app đang tắt, hệ điều
  // mở app ⇒ deep link đến TRƯỚC khi có listener. `InvitationDeepLinkService` giữ
  // deep link đó lại và phát lại khi có listener ⇒ không bị mất.
  try {
    await InvitationDeepLinkService().init();
  } catch (e) {
    debugPrint('InvitationDeepLinkService.init() lỗi: $e');
  }

  // Kiểm tra phiên đăng nhập đã lưu
  UserModel? savedUser;
  final bool isLoggedIn = await TokenStorage.hasValidSession();
  if (isLoggedIn) {
    savedUser = await TokenStorage.getUser();
    // BẢO MẬT: Ứng dụng di động chỉ hỗ trợ duy nhất Khách du lịch (USER/TOURIST)
    // Nếu role không phải USER/TOURIST -> lập tức xóa sạch token/session và gán null
    if (savedUser != null && !isTouristRole(savedUser.role)) {
      await TokenStorage.clear();
      savedUser = null;
    }
  } else {
    // Dọn dẹp token rác nếu không có phiên đăng nhập hợp lệ
    await TokenStorage.clear();
  }

  runApp(JourneyGoTouristApp(initialUser: savedUser));
}

class JourneyGoTouristApp extends StatefulWidget {
  final UserModel? initialUser;

  const JourneyGoTouristApp({super.key, this.initialUser});

  @override
  State<JourneyGoTouristApp> createState() => _JourneyGoTouristAppState();
}

class _JourneyGoTouristAppState extends State<JourneyGoTouristApp> {
  /// Navigator gốc — cần để mở màn xác nhận lời mời từ `InvitationDeepLinkHost`
  /// (host nằm ngoài Navigator nên không dùng được `Navigator.of(context)`).
  final GlobalKey<NavigatorState> _navigatorKey = GlobalKey<NavigatorState>();

  /// ScaffoldMessenger gốc — tương tự, để hiện thông báo "vui lòng đăng nhập".
  final GlobalKey<ScaffoldMessengerState> _scaffoldMessengerKey =
      GlobalKey<ScaffoldMessengerState>();

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Journey Go - Cổng Du Lịch Văn Hóa Việt Nam',
      debugShowCheckedModeBanner: false,
      navigatorKey: _navigatorKey,
      scaffoldMessengerKey: _scaffoldMessengerKey,
      theme: ThemeData(
        useMaterial3: true,
        scaffoldBackgroundColor: AppCultureColors.background,
        colorScheme: ColorScheme.fromSeed(
          seedColor: AppCultureColors.heritageJade,
          primary: AppCultureColors.heritageJade,
          secondary: AppCultureColors.oceanBlue,
          surface: AppCultureColors.background,
        ),
      ),
      // ⚠️ `InvitationDeepLinkHost` đặt trong `builder` (NGOÀI Navigator) vì deep
      // link lời mời có thể mở app khi khách CHƯA đăng nhập; nếu bọc trong `home`
      // thì route gốc bị `pushReplacement` khi đăng nhập ⇒ mất listener.
      builder: (context, child) => InvitationDeepLinkHost(
        navigatorKey: _navigatorKey,
        scaffoldMessengerKey: _scaffoldMessengerKey,
        child: child ?? const SizedBox.shrink(),
      ),
      home: PendingPaymentHost(
        // ⚠️ `PendingPaymentHost` bọc TOÀN BỘ app (kể cả màn đăng nhập) vì deep
        // link thanh toán có thể mở app khi khách CHƯA đăng nhập (endpoint
        // `/return-result` là public). Kết quả được giữ lại và phát lại sau.
        child: widget.initialUser != null
            ? TouristHomeScreen(initialUser: widget.initialUser!)
            : const TouristAuthScreen(),
      ),
    );
  }
}
