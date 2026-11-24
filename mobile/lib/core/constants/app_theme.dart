import 'package:flutter/material.dart';

import 'app_colors.dart';

/// Theme Material 3 cho toàn app. Các màn nên dựa vào theme này thay vì tự đặt màu/cỡ chữ,
/// để giao diện đồng nhất và đổi một chỗ là đổi cả app.
class AppTheme {

  static ThemeData light() {
    final scheme = ColorScheme.fromSeed(
      seedColor: AppCultureColors.heritageJade,
      primary: AppCultureColors.heritageJade,
      onPrimary: Colors.white,
      primaryContainer: AppCultureColors.jadeLight,
      onPrimaryContainer: AppCultureColors.jadeDark,
      secondary: AppCultureColors.oceanBlue,
      secondaryContainer: AppCultureColors.oceanLight,
      onSecondaryContainer: AppCultureColors.oceanDark,
      tertiary: AppCultureColors.lacquer,
      tertiaryContainer: AppCultureColors.lacquerLight,
      error: AppCultureColors.error,
      surface: AppCultureColors.background,
      onSurface: AppCultureColors.textDark,
      onSurfaceVariant: AppCultureColors.textMuted,
      surfaceContainerLowest: AppCultureColors.surface,
      surfaceContainerLow: AppCultureColors.surface,
      surfaceContainer: AppCultureColors.surfaceSubtle,
      outline: AppCultureColors.border,
      outlineVariant: AppCultureColors.borderLight,
    );

    // Thang chữ: tiêu đề đậm, hơi khít; thân bài 14–16 dễ đọc. Tất cả dùng Nunito.
    const ink = AppCultureColors.textDark;
    final textTheme = const TextTheme(
      displayLarge: TextStyle(fontSize: 40, fontWeight: FontWeight.w800, letterSpacing: -0.8, height: 1.15),
      displayMedium: TextStyle(fontSize: 34, fontWeight: FontWeight.w800, letterSpacing: -0.6, height: 1.15),
      displaySmall: TextStyle(fontSize: 28, fontWeight: FontWeight.w700, letterSpacing: -0.4, height: 1.2),
      headlineLarge: TextStyle(fontSize: 26, fontWeight: FontWeight.w700, letterSpacing: -0.4, height: 1.25),
      headlineMedium: TextStyle(fontSize: 22, fontWeight: FontWeight.w700, letterSpacing: -0.3, height: 1.25),
      headlineSmall: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, letterSpacing: -0.2, height: 1.3),
      titleLarge: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, height: 1.3),
      titleMedium: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, height: 1.35),
      titleSmall: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, height: 1.35),
      bodyLarge: TextStyle(fontSize: 16, height: 1.5),
      bodyMedium: TextStyle(fontSize: 14, height: 1.5),
      bodySmall: TextStyle(fontSize: 12.5, height: 1.45, color: AppCultureColors.textMuted),
      labelLarge: TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
      labelMedium: TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
      labelSmall: TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
    ).apply(fontFamily: AppType.sans, bodyColor: ink, displayColor: ink);

    final buttonShape = RoundedRectangleBorder(borderRadius: BorderRadius.circular(14));
    const buttonText = TextStyle(fontFamily: AppType.sans, fontSize: 15, fontWeight: FontWeight.w600);

    return ThemeData(
      useMaterial3: true,
      fontFamily: AppType.sans,
      colorScheme: scheme,
      textTheme: textTheme,
      scaffoldBackgroundColor: AppCultureColors.background,
      splashFactory: InkSparkle.splashFactory,
      appBarTheme: const AppBarTheme(
        backgroundColor: AppCultureColors.background,
        foregroundColor: AppCultureColors.textDark,
        surfaceTintColor: Colors.transparent,
        scrolledUnderElevation: 0.5,
        centerTitle: false,
        titleTextStyle: TextStyle(
          fontFamily: AppType.sans,
          fontSize: 18,
          fontWeight: FontWeight.w700,
          color: AppCultureColors.textDark,
        ),
      ),
      dividerTheme: const DividerThemeData(color: AppCultureColors.border, thickness: 1, space: 1),
      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: AppCultureColors.surface,
        surfaceTintColor: Colors.transparent,
        showDragHandle: true,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: AppCultureColors.surface,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        titleTextStyle: textTheme.titleLarge,
        contentTextStyle: textTheme.bodyMedium?.copyWith(color: AppCultureColors.textMuted),
      ),
      cardTheme: CardThemeData(
        color: AppCultureColors.surface,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(18),
          side: const BorderSide(color: AppCultureColors.border),
        ),
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: AppCultureColors.textDark,
        contentTextStyle: const TextStyle(fontFamily: AppType.sans, color: Colors.white, fontSize: 14),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: AppCultureColors.surface,
        indicatorColor: AppCultureColors.jadeLight,
        surfaceTintColor: Colors.transparent,
        labelTextStyle: WidgetStateProperty.resolveWith(
          (s) => TextStyle(
            fontFamily: AppType.sans,
            fontSize: 12,
            fontWeight: s.contains(WidgetState.selected) ? FontWeight.w700 : FontWeight.w500,
            color: s.contains(WidgetState.selected) ? AppCultureColors.heritageJade : AppCultureColors.textMuted,
          ),
        ),
      ),
      tabBarTheme: TabBarThemeData(
        labelColor: AppCultureColors.textDark,
        unselectedLabelColor: AppCultureColors.textMuted,
        labelStyle: const TextStyle(fontFamily: AppType.sans, fontSize: 14.5, fontWeight: FontWeight.w700),
        unselectedLabelStyle: const TextStyle(fontFamily: AppType.sans, fontSize: 14.5, fontWeight: FontWeight.w500),
        indicatorColor: AppCultureColors.heritageJade,
        dividerColor: Colors.transparent,
      ),
      chipTheme: ChipThemeData(
        backgroundColor: AppCultureColors.surface,
        selectedColor: AppCultureColors.jadeLight,
        side: const BorderSide(color: AppCultureColors.border),
        labelStyle: const TextStyle(fontFamily: AppType.sans, fontSize: 13, fontWeight: FontWeight.w600, color: AppCultureColors.textDark),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppCultureColors.surface,
        hintStyle: const TextStyle(color: AppCultureColors.textLight),
        labelStyle: const TextStyle(color: AppCultureColors.textMuted),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: AppCultureColors.border)),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: AppCultureColors.border)),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: AppCultureColors.heritageJade, width: 1.6)),
        errorBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: AppCultureColors.error)),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: AppCultureColors.heritageJade,
          foregroundColor: Colors.white,
          disabledBackgroundColor: AppCultureColors.surfaceSubtle,
          disabledForegroundColor: AppCultureColors.textLight,
          minimumSize: const Size(0, 48),
          shape: buttonShape,
          textStyle: buttonText,
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppCultureColors.heritageJade,
          foregroundColor: Colors.white,
          elevation: 0,
          minimumSize: const Size(0, 48),
          shape: buttonShape,
          textStyle: buttonText,
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppCultureColors.heritageJade,
          side: const BorderSide(color: AppCultureColors.heritageJade, width: 1.2),
          minimumSize: const Size(0, 48),
          shape: buttonShape,
          textStyle: buttonText,
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(foregroundColor: AppCultureColors.heritageJade, textStyle: buttonText),
      ),
      progressIndicatorTheme: ProgressIndicatorThemeData(color: AppCultureColors.heritageJade, linearTrackColor: AppCultureColors.jadeLight),
      listTileTheme: const ListTileThemeData(iconColor: AppCultureColors.textMuted, textColor: AppCultureColors.textDark),
    );
  }
}
