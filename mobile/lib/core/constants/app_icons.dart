import 'package:flutter/widgets.dart';

/// Icon nét mảnh (Phosphor Light, giấy phép MIT) — font đóng gói tại assets/fonts/PhosphorLight.ttf.
///
/// Dùng file font trực tiếp thay cho gói `phosphor_flutter`: gói đó kế thừa `IconData`, mà Flutter 3.47
/// đã khoá `IconData` (final) ⇒ không biên dịch được. Mã ký tự lấy từ bản Phosphor 2.1.0 (cùng file font).
class AppIcons {
  static const String _family = 'PhosphorLight';

  static const IconData compass = IconData(0xe1c8, fontFamily: _family);
  static const IconData sunHorizon = IconData(0xe5b6, fontFamily: _family);
  static const IconData suitcaseRolling = IconData(0xe9b0, fontFamily: _family);
  static const IconData calendarDots = IconData(0xe7b4, fontFamily: _family);
}
