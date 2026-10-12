import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'tourist_auth_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  // Đặt thanh trạng thái trong suốt cho Hero Banner tràn viền
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
      statusBarBrightness: Brightness.dark,
    ),
  );
  runApp(const JourneyGoTouristApp());
}

class JourneyGoTouristApp extends StatelessWidget {
  const JourneyGoTouristApp({super.key});

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
      home: const TouristAuthScreen(),
    );
  }
}
