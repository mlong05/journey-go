import 'dart:async' show StreamSubscription, unawaited;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'core/constants/app_theme.dart';
import 'core/models/auth_models.dart';
import 'core/services/auth_service.dart';
import 'core/services/goong_map_style.dart';
import 'core/services/google_auth_service.dart';
import 'core/services/invitation_deep_link_service.dart';
import 'core/services/payment_result_service.dart';
import 'core/services/server_finder.dart';
import 'core/services/session_expiry.dart';
import 'core/services/token_storage.dart';
import 'l10n/locale_controller.dart';
import 'screens/booking/invitation_deep_link_host.dart';
import 'core/services/app_route_observer.dart';
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
    dotenv.testLoad();
    debugPrint('Không tìm thấy file .env, sẽ dùng --dart-define làm fallback. Lỗi: $e');
  }

  // Dò địa chỉ backend NGAY khi mở app (chạy nền, không chặn giao diện) để lúc bấm
  // "Đăng nhập" không phải chờ thêm bước dò máy chủ.
  unawaited(ServerFinder.find());
  // Tải sẵn style bản đồ Goong (đường phố + chữ vệ tinh) để mở bản đồ không phải chờ.
  GoongMapStyle.preload();

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

  // Ngôn ngữ giao diện đã chọn lần trước (mặc định tiếng Việt).
  LocaleController.onUserLocaleChanged = (code) => AuthService().updatePreferredLanguage(code);
  await LocaleController.instance.load();

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
    } else if (savedUser != null) {
      await LocaleController.instance.applyFromServer(savedUser.preferredLanguage);
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

class _JourneyGoTouristAppState extends State<JourneyGoTouristApp> with WidgetsBindingObserver {
  /// Navigator gốc — cần để mở màn xác nhận lời mời từ `InvitationDeepLinkHost`
  /// (host nằm ngoài Navigator nên không dùng được `Navigator.of(context)`).
  final GlobalKey<NavigatorState> _navigatorKey = GlobalKey<NavigatorState>();

  /// ScaffoldMessenger gốc — tương tự, để hiện thông báo "vui lòng đăng nhập".
  final GlobalKey<ScaffoldMessengerState> _scaffoldMessengerKey =
      GlobalKey<ScaffoldMessengerState>();

  StreamSubscription<int?>? _sessionExpirySub;
  bool _reloginOpen = false;
  DateTime? _lastLocalePullAt;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _sessionExpirySub = SessionExpiry.events.listen(_onSessionExpired);
    if (widget.initialUser != null) {
      unawaited(_pullAccountLocale());
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      unawaited(_pullAccountLocale());
    }
  }

  Future<void> _pullAccountLocale() async {
    final now = DateTime.now();
    if (_lastLocalePullAt != null && now.difference(_lastLocalePullAt!).inSeconds < 5) {
      return;
    }
    if (!await TokenStorage.hasValidSession()) return;
    _lastLocalePullAt = now;
    try {
      await AuthService().getCurrentUser();
    } catch (_) {
      // Bỏ qua khi mất mạng / server chưa sẵn sàng
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _sessionExpirySub?.cancel();
    super.dispose();
  }

  /// Hết phiên ở bất kỳ màn nào ⇒ mở màn đăng nhập ĐÈ lên màn đó.
  ///  • Đăng nhập lại đúng tài khoản cũ ⇒ đóng màn đăng nhập, ở lại đúng màn đang xem.
  ///  • Đăng nhập tài khoản khác ⇒ dữ liệu màn cũ không còn đúng ⇒ về Trang chủ của tài khoản mới.
  Future<void> _onSessionExpired(int? previousUserId) async {
    final navigator = _navigatorKey.currentState;
    if (navigator == null || _reloginOpen) return;
    _reloginOpen = true;
    try {
      final user = await navigator.push<UserModel>(
        MaterialPageRoute(
          fullscreenDialog: true,
          builder: (_) => TouristAuthScreen(reloginMessage: SessionExpiry.message),
        ),
      );
      if (user == null) return;
      if (previousUserId != null && user.id != previousUserId) {
        navigator.pushAndRemoveUntil(
          MaterialPageRoute(builder: (_) => TouristHomeScreen(initialUser: user)),
          (route) => false,
        );
        return;
      }
      final l10n = lookupAppLocalizations(LocaleController.instance.value);
      _scaffoldMessengerKey.currentState?.showSnackBar(
        SnackBar(
          content: Text(l10n.reloginSuccess),
          behavior: SnackBarBehavior.floating,
        ),
      );
    } finally {
      _reloginOpen = false;
    }
  }

  @override
  Widget build(BuildContext context) {
    // Đổi ngôn ngữ ở màn Tài khoản ⇒ dựng lại MaterialApp với locale mới, không cần mở lại app.
    return ValueListenableBuilder<Locale>(
      valueListenable: LocaleController.instance,
      builder: (context, locale, _) => _buildApp(locale),
    );
  }

  Widget _buildApp(Locale locale) {
    return MaterialApp(
      onGenerateTitle: (context) => context.l10n.appTitle,
      locale: locale,
      supportedLocales: AppLocalizations.supportedLocales,
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      debugShowCheckedModeBanner: false,
      navigatorKey: _navigatorKey,
      scaffoldMessengerKey: _scaffoldMessengerKey,
      navigatorObservers: [appRouteObserver],
      theme: AppTheme.light(),
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
