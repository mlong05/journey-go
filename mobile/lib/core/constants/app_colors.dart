import 'package:flutter/material.dart';

/// Bảng màu duy nhất của app — phong cách hiện đại: nền xám lạnh, bề mặt trắng, chữ xanh than,
/// xanh ngọc tươi làm màu chính, cam cho thứ cần chú ý, vàng cho phần thưởng.
/// (Đồng bộ với màn "Chuyến đi" — `TripsPalette`.) Tên màu cũ được giữ để các màn không phải đổi.
///
/// Quy tắc tương phản (WCAG AA, đo trên [background] và [surface]):
/// - Mọi màu dùng làm CHỮ trong file này đạt ≥ 4.5:1 trên nền sáng.
/// - Chữ trắng trên [heritageJade] đạt 5.5:1, trên [jadeDark] đạt 7.6:1.
/// - Màu ghi "chỉ trang trí" không được dùng cho chữ.
class AppCultureColors {
  // Nền & bề mặt
  static const Color background = Color(0xFFF3F5F8); // xám lạnh, sáng
  static const Color surface = Color(0xFFFFFFFF);
  static const Color surfaceSubtle = Color(0xFFF1F5F9);
  static const Color border = Color(0xFFE2E8F0);
  static const Color borderLight = Color(0xFFEEF2F6);

  // Màu chính: xanh ngọc (emerald)
  static const Color heritageJade = Color(0xFF047857); // chữ trắng 5.5:1
  static const Color jadeLight = Color(0xFFE6F6EF);
  static const Color jadeDark = Color(0xFF065F46);
  static const Color jadeGradientStart = Color(0xFF047857);
  static const Color jadeGradientEnd = Color(0xFF064E3B);

  // Màu phụ: chàm (tên cũ "ocean" giữ lại để không phải sửa các màn khác)
  static const Color oceanBlue = Color(0xFF3346A8);
  static const Color oceanLight = Color(0xFFEEF0FC);
  static const Color oceanDark = Color(0xFF26358A);

  // Điểm nhấn: đỏ (lỗi, chấm thông báo)
  static const Color lacquer = Color(0xFFBE123C);
  static const Color lacquerLight = Color(0xFFFFE4E9);

  // Điểm nhấn "cần chú ý": cam (chờ nhận thưởng, ưu đãi, đếm ngược) — chữ trắng 5.2:1
  static const Color coral = Color(0xFFC2410C);
  static const Color coralDark = Color(0xFF9A3412);
  static const Color coralLight = Color(0xFFFFF1E6);

  // Cộng đồng / thông tin: xanh trời — chữ trắng 5.6:1
  static const Color sky = Color(0xFF0369A1);
  static const Color skyDark = Color(0xFF075985);
  static const Color skyLight = Color(0xFFE0F2FE);

  // Nền pastel cho header / thẻ hero sáng (dùng qua [AppTone])
  static const Color jadeTint = Color(0xFFE6F6EF);
  static const Color brassTint = Color(0xFFFEF9C3);
  static const Color skyTint = Color(0xFFE0F2FE);
  static const Color coralTint = Color(0xFFFFF1E6);

  // Chữ xanh than
  static const Color textDark = Color(0xFF0F172A);
  static const Color textMuted = Color(0xFF475569);

  /// Chữ phụ cấp 3 (chú thích, giờ, icon nhỏ) — vẫn đạt ≥ 4.5:1 trên nền trắng.
  static const Color textLight = Color(0xFF5B6B80);

  /// Chữ phụ trên nền tối (xanh ngọc đậm, ảnh có lớp phủ): trắng 90%.
  static const Color onDarkMuted = Color(0xE6FFFFFF);

  /// Chỉ trang trí (đường kẻ, icon mờ, trạng thái tắt) — KHÔNG dùng cho chữ.
  static const Color decorative = Color(0xFFCBD5E1);

  // Thưởng & huy hiệu: vàng
  static const Color rewardBg = Color(0xFFFEF9C3);
  static const Color rewardBorder = Color(0xFFFDE68A);
  static const Color rewardText = Color(0xFF854D0E);

  /// Vàng dùng được cho chữ và icon (≥ 4.5:1 trên nền sáng).
  static const Color gold = Color(0xFF92400E);

  /// Vàng sáng — chỉ cho icon/hoạ tiết trang trí, KHÔNG dùng cho chữ.
  static const Color goldBright = Color(0xFFF59E0B);
  static const Color amberDark = Color(0xFF854D0E);

  // Trạng thái
  static const Color success = Color(0xFF15803D);
  static const Color successLight = Color(0xFFDCFCE7);
  static const Color error = Color(0xFFB91C1C);
  static const Color errorLight = Color(0xFFFEE2E2);
  static const Color warning = Color(0xFFB45309);
  static const Color warningLight = Color(0xFFFEF3C7);
  static const Color info = Color(0xFF3346A8);
  static const Color infoLight = Color(0xFFEEF0FC);

  // ── Thang sắc độ (50 nhạt nhất → 900 đậm nhất) ─────────────────────────────
  // Dùng khi cần nhiều sắc độ hơn các màu vai trò ở trên (huy hiệu, bảng xếp hạng, hiệu ứng...).
  // Quy ước chữ: trên nền sáng dùng ≥ 600; trên nền tối (jade800/900) dùng ≤ 300.

  // Vàng (thưởng)
  static const Color brass50 = Color(0xFFFFFBEB);
  static const Color brass100 = Color(0xFFFEF3C7);
  static const Color brass200 = Color(0xFFFDE68A);
  static const Color brass300 = Color(0xFFFCD34D);
  static const Color brass400 = Color(0xFFFBBF24);
  static const Color brass500 = Color(0xFFF59E0B);
  static const Color brass600 = Color(0xFFD97706);
  static const Color brass700 = Color(0xFFB45309);
  static const Color brass800 = Color(0xFF92400E);
  static const Color brass900 = Color(0xFF78350F);

  // Cam (hạng đồng)
  static const Color terra50 = Color(0xFFFFF7ED);
  static const Color terra200 = Color(0xFFFED7AA);
  static const Color terra300 = Color(0xFFFDBA74);
  static const Color terra500 = Color(0xFFF97316);
  static const Color terra600 = Color(0xFFEA580C);
  static const Color terra700 = Color(0xFFC2410C);

  // Đỏ (lỗi / cảnh báo / chấm thông báo)
  static const Color lacquer50 = Color(0xFFFFF1F2);
  static const Color lacquer100 = Color(0xFFFFE4E6);
  static const Color lacquer200 = Color(0xFFFECDD3);
  static const Color lacquer400 = Color(0xFFFB7185);
  static const Color lacquer500 = Color(0xFFF43F5E);
  static const Color lacquer600 = Color(0xFFBE123C);
  static const Color lacquer700 = Color(0xFF9F1239);

  // Xanh ngọc
  static const Color jade50 = Color(0xFFECFDF5);
  static const Color jade100 = Color(0xFFD1FAE5);
  static const Color jade200 = Color(0xFFA7F3D0);
  static const Color jade300 = Color(0xFF6EE7B7);
  static const Color jade400 = Color(0xFF34D399);
  static const Color jade600 = Color(0xFF047857);
  static const Color jade700 = Color(0xFF065F46);
  static const Color jade800 = Color(0xFF064E3B);
  static const Color jade900 = Color(0xFF022C22);

  // Xám xanh (trung tính lạnh)
  static const Color ink50 = Color(0xFFF8FAFC);
  static const Color ink100 = Color(0xFFF1F5F9);
  static const Color ink200 = Color(0xFFE2E8F0);
  static const Color ink300 = Color(0xFFCBD5E1);
  static const Color ink500 = Color(0xFF64748B);
  static const Color ink600 = Color(0xFF475569);
  static const Color ink700 = Color(0xFF334155);
  static const Color ink900 = Color(0xFF0F172A);

  // Chàm (xanh tím / hạng bạch kim)
  static const Color indigo50 = Color(0xFFEEF2FF);
  static const Color indigo100 = Color(0xFFE0E7FF);
  static const Color indigo200 = Color(0xFFC7D2FE);
  static const Color indigo300 = Color(0xFFA5B4FC);
  static const Color indigo500 = Color(0xFF6366F1);
  static const Color indigo600 = Color(0xFF4F46E5);
  static const Color indigo700 = Color(0xFF4338CA);

  /// Lớp phủ tối cho chữ đặt trên ảnh: đáy tối 75% → trên trong suốt.
  static const List<Color> photoScrim = [Color(0x00000000), Color(0x14000000), Color(0xBF000000)];
  static const List<double> photoScrimStops = [0.0, 0.35, 1.0];
}

/// Nhóm màu theo chức năng cho giao diện sáng:
/// - [jade]: hành trình, hành động chính
/// - [brass]: điểm, thưởng, huy hiệu
/// - [sky]: cộng đồng, diễn đàn, thông tin
/// - [coral]: thứ cần chú ý (chờ nhận thưởng, ưu đãi, đếm ngược)
///
/// [strong] dùng cho chữ/icon/số liệu (≥ 4.5:1 trên [tint] và trên trắng),
/// [tint] cho nền pastel, [soft] cho viền và nền ô icon.
class AppTone {
  final Color strong;
  final Color tint;
  final Color soft;

  const AppTone({required this.strong, required this.tint, required this.soft});

  static const jade = AppTone(strong: AppCultureColors.jadeDark, tint: AppCultureColors.jadeTint, soft: Color(0xFFBBEBD4));
  static const brass = AppTone(strong: AppCultureColors.brass800, tint: AppCultureColors.brassTint, soft: Color(0xFFFDE68A));
  static const sky = AppTone(strong: AppCultureColors.skyDark, tint: AppCultureColors.skyTint, soft: Color(0xFFBAE6FD));
  static const coral = AppTone(strong: AppCultureColors.coralDark, tint: AppCultureColors.coralTint, soft: Color(0xFFFED7AA));
}

/// Kiểu chữ: giao diện dùng Nunito (font không chân bo tròn, thân thiện, đủ dấu tiếng Việt);
/// Noto Serif chỉ dùng cho đoạn đọc câu chuyện văn hoá và tiêu đề lớn của tour.
class AppType {
  static const String sans = 'Nunito';
  static const String serif = 'NotoSerif';

  /// Tiêu đề giao diện (màn hình, khối, thẻ).
  static TextStyle display({double size = 24, Color color = AppCultureColors.textDark, FontWeight weight = FontWeight.w700, double height = 1.25}) =>
      TextStyle(fontFamily: sans, fontSize: size, fontWeight: weight, color: color, height: height, letterSpacing: size >= 20 ? -0.3 : 0);

  /// Tiêu đề lớn kiểu tạp chí (tên tour ở trang chi tiết/hành trình, chương truyện).
  static TextStyle editorial({double size = 26, Color color = AppCultureColors.textDark, FontWeight weight = FontWeight.w700, double height = 1.25}) =>
      TextStyle(fontFamily: serif, fontSize: size, fontWeight: weight, color: color, height: height);

  /// Đoạn văn đọc dài (câu chuyện văn hoá).
  static TextStyle reading({double size = 16, Color color = AppCultureColors.textDark}) =>
      TextStyle(fontFamily: serif, fontSize: size, height: 1.75, color: color);

  /// Nhãn nhỏ viết hoa, giãn chữ (VD "CHƯƠNG 1").
  static TextStyle eyebrow({Color color = AppCultureColors.heritageJade}) =>
      TextStyle(fontFamily: sans, fontSize: 11.5, fontWeight: FontWeight.w800, letterSpacing: 1.2, color: color);
}
