import 'package:flutter/material.dart';

/// Bảng màu "di sản" dùng cho toàn app: nền giấy dó ấm, chữ màu mực, xanh ngọc sơn mài làm màu chính,
/// chàm làm màu phụ, đồng thau cho phần thưởng và đỏ son làm điểm nhấn.
class AppCultureColors {
  // Nền giấy & bề mặt
  static const Color background = Color(0xFFF7F3EA); // giấy dó
  static const Color surface = Color(0xFFFFFDF8); // ngà
  static const Color surfaceSubtle = Color(0xFFF0EADD);
  static const Color border = Color(0xFFE3DACA);
  static const Color borderLight = Color(0xFFEEE7DA);

  // Màu chính: xanh ngọc sơn mài
  static const Color heritageJade = Color(0xFF1F6F54);
  static const Color jadeLight = Color(0xFFE3EEE7);
  static const Color jadeDark = Color(0xFF17573F);
  static const Color jadeGradientStart = Color(0xFF1F6F54);
  static const Color jadeGradientEnd = Color(0xFF123F31);

  // Màu phụ: chàm (tên cũ "ocean" giữ lại để không phải sửa các màn khác)
  static const Color oceanBlue = Color(0xFF2F4B7C);
  static const Color oceanLight = Color(0xFFE6EAF2);
  static const Color oceanDark = Color(0xFF22375C);

  // Điểm nhấn: đỏ son
  static const Color lacquer = Color(0xFF9E2B25);
  static const Color lacquerLight = Color(0xFFF5E3DF);

  // Chữ màu mực
  static const Color textDark = Color(0xFF1E1A14);
  static const Color textMuted = Color(0xFF6B6357);
  static const Color textLight = Color(0xFFA39A8C);

  // Thưởng & huy hiệu: đồng thau
  static const Color rewardBg = Color(0xFFF6ECD4);
  static const Color rewardBorder = Color(0xFFE7D3A3);
  static const Color rewardText = Color(0xFF6E4A12);
  static const Color gold = Color(0xFFB8862B);
  static const Color amberDark = Color(0xFF8C5A14);

  // Trạng thái
  static const Color success = Color(0xFF2E7D4F);
  static const Color error = Color(0xFFB3261E);
  static const Color warning = Color(0xFFC98A1B);
  static const Color info = Color(0xFF2F4B7C);
}

/// Kiểu chữ: tiêu đề dùng font có chân Noto Serif (đủ dấu tiếng Việt), thân bài dùng font hệ thống.
class AppType {
  static const String serif = 'NotoSerif';

  /// Tiêu đề kiểu tạp chí di sản.
  static TextStyle display({double size = 24, Color color = AppCultureColors.textDark, FontWeight weight = FontWeight.w700, double height = 1.25}) =>
      TextStyle(fontFamily: serif, fontSize: size, fontWeight: weight, color: color, height: height);

  /// Đoạn văn đọc dài (câu chuyện văn hoá).
  static TextStyle reading({double size = 16, Color color = AppCultureColors.textDark}) =>
      TextStyle(fontFamily: serif, fontSize: size, height: 1.75, color: color);

  /// Nhãn nhỏ viết hoa, giãn chữ (VD "CHƯƠNG 1").
  static TextStyle eyebrow({Color color = AppCultureColors.lacquer}) =>
      TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1.4, color: color);
}
