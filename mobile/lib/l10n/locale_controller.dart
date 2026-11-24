import 'package:flutter/widgets.dart';
import 'package:intl/intl.dart' show DateFormat;
import 'package:shared_preferences/shared_preferences.dart';

import 'app_localizations.dart';

export 'app_localizations.dart';

/// Chuỗi theo ngôn ngữ đang chọn, dùng ở nơi KHÔNG có BuildContext (model, hàm định dạng).
///
/// ⚠️ Trong widget hãy dùng `context.l10n` để widget tự dựng lại khi đổi ngôn ngữ.
AppLocalizations get appL10n => lookupAppLocalizations(LocaleController.instance.value);

/// Giá trị header `Accept-Language` gửi lên backend (vi / en / ja) để lỗi trả về đúng ngôn ngữ.
String get acceptLanguage => LocaleController.instance.value.languageCode;

/// Thứ viết tắt: "T4", "CN" (vi) · "Wed" (en) · "水" (ja).
String formatWeekdayShort(DateTime d) {
  final lang = LocaleController.instance.value.languageCode;
  if (lang == 'vi') return d.weekday == DateTime.sunday ? 'CN' : 'T${d.weekday + 1}';
  return DateFormat.E(lang).format(d);
}

/// Thứ đầy đủ: "Thứ Tư" (vi) · "Wednesday" (en) · "水曜日" (ja).
String formatWeekdayLong(DateTime d) {
  final lang = LocaleController.instance.value.languageCode;
  if (lang == 'vi') {
    const names = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'];
    return names[d.weekday - 1];
  }
  return DateFormat.EEEE(lang).format(d);
}

/// Tháng + năm: "Tháng 11, 2026" (vi) · "November 2026" (en) · "2026年11月" (ja).
String formatMonthYear(DateTime d) {
  final lang = LocaleController.instance.value.languageCode;
  if (lang == 'vi') return 'Tháng ${d.month}, ${d.year}';
  return DateFormat.yMMMM(lang).format(d);
}

/// Ngày + tháng ngắn: "20/11" (vi), "Nov 20" (en), "11月20日" (ja).
String formatDayMonth(DateTime d, [String? languageCode]) {
  final lang = languageCode ?? LocaleController.instance.value.languageCode;
  if (lang == 'vi') return '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}';
  return DateFormat.MMMd(lang).format(d);
}

/// Một ngôn ngữ app hỗ trợ; [nativeName] luôn viết bằng chính ngôn ngữ đó
/// (không dịch) để người dùng nhận ra dù app đang hiện ngôn ngữ nào.
class AppLanguage {
  final Locale locale;
  final String nativeName;

  const AppLanguage(this.locale, this.nativeName);
}

/// Ngôn ngữ giao diện hiện tại; lưu vào máy để lần mở sau giữ nguyên.
///
/// Mặc định là tiếng Việt (KHÔNG theo ngôn ngữ thiết bị) vì phần lớn màn hình
/// và nội dung từ backend vẫn chỉ có tiếng Việt.
class LocaleController extends ValueNotifier<Locale> {
  LocaleController._() : super(fallback);

  static final LocaleController instance = LocaleController._();

  /// Hook đồng bộ lên backend khi người dùng chủ động đổi ngôn ngữ trên app.
  /// Gắn trong `main()` để tránh phụ thuộc vòng giữa `locale_controller` và `api_client`.
  static Future<void> Function(String languageCode)? onUserLocaleChanged;

  static const String _prefsKey = 'app_locale';
  static const Locale fallback = Locale('vi');

  static const List<AppLanguage> languages = [
    AppLanguage(Locale('vi'), 'Tiếng Việt'),
    AppLanguage(Locale('en'), 'English'),
    AppLanguage(Locale('ja'), '日本語'),
  ];

  AppLanguage get current => languages.firstWhere(
    (l) => l.locale == value,
    orElse: () => languages.first,
  );

  /// Đọc ngôn ngữ đã lưu; gọi một lần trong `main()` trước `runApp`.
  Future<void> load() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final code = prefs.getString(_prefsKey);
      final saved = languages
          .where((l) => l.locale.languageCode == code)
          .firstOrNull;
      if (saved != null) value = saved.locale;
    } catch (e) {
      debugPrint('LocaleController.load() lỗi: $e');
    }
  }

  /// Áp dụng ngôn ngữ gắn với tài khoản từ backend (khi đăng nhập hoặc làm mới /me).
  /// Không gọi ngược lại server.
  Future<void> applyFromServer(String? code) async {
    final normalized = code?.trim().toLowerCase();
    final matched = languages
        .where((l) => l.locale.languageCode == normalized)
        .firstOrNull;
    final target = matched?.locale ?? fallback;
    if (value != target) {
      value = target;
    }
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_prefsKey, target.languageCode);
    } catch (e) {
      debugPrint('LocaleController.applyFromServer() lỗi: $e');
    }
  }

  Future<void> setLocale(Locale locale, {bool syncServer = true}) async {
    if (!AppLocalizations.supportedLocales.contains(locale)) return;
    value = locale;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_prefsKey, locale.languageCode);
    } catch (e) {
      debugPrint('LocaleController.setLocale() lỗi: $e');
    }
    if (syncServer) {
      final hook = onUserLocaleChanged;
      if (hook != null) {
        hook(locale.languageCode).catchError((Object e) {
          debugPrint('LocaleController sync server lỗi: $e');
        });
      }
    }
  }
}

extension AppLocalizationsContext on BuildContext {
  /// Chuỗi giao diện theo ngôn ngữ hiện tại: `context.l10n.settingsTitle`.
  AppLocalizations get l10n => AppLocalizations.of(this);
}
