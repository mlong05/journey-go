import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';

/// Tên gọi ngắn cho các màn trang chủ / lộ trình. Mọi giá trị trỏ về [AppCultureColors]
/// — bảng màu duy nhất của app — để không còn hai nguồn màu lệch nhau.
class AppInk {
  static const Color ink = AppCultureColors.textDark;
  static const Color muted = AppCultureColors.textMuted;
  static const Color faint = AppCultureColors.textLight;
  static const Color border = AppCultureColors.border;
  static const Color line = AppCultureColors.borderLight;
  static const Color soft = AppCultureColors.surfaceSubtle;
  static const Color accent = AppCultureColors.heritageJade;
  static const Color accentSoft = AppCultureColors.jadeLight;
  static const Color paper = AppCultureColors.background;
  static const Color surface = AppCultureColors.surface;
  static const Color lacquer = AppCultureColors.lacquer;

  /// Đồng thau đạt tương phản chữ (trước đây #B8862B chỉ 3.2:1).
  static const Color brass = AppCultureColors.gold;
}
