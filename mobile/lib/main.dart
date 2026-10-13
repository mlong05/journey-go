import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
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
    // Nếu role không phải USER thì xóa session cũ
    if (savedUser != null && !savedUser.isUserRole) {
      await TokenStorage.clearSession();
      savedUser = null;
    }
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
