import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'core/constants/app_colors.dart';
import 'core/models/auth_models.dart';
import 'core/services/token_storage.dart';
import 'screens/tourist_home_screen.dart';
import 'tourist_auth_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Đặt thanh trạng thái trong suốt cho Hero Banner tràn viền
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
      statusBarBrightness: Brightness.dark,
    ),
  );

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

class JourneyGoTouristApp extends StatelessWidget {
  final UserModel? initialUser;

  const JourneyGoTouristApp({super.key, this.initialUser});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Journey Go - Cổng Du Lịch Văn Hóa Việt Nam',
      debugShowCheckedModeBanner: false,
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
      home: initialUser != null
          ? TouristHomeScreen(initialUser: initialUser!)
          : const TouristAuthScreen(),
    );
  }
}
