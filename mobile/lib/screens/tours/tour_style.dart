import 'dart:ui' show ImageFilter;

import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../l10n/locale_controller.dart';
import '../../core/models/gamification_model.dart' show formatThousands;

/// Màu và biểu tượng nhận diện theo loại hình tour (dùng khi tour chưa có ảnh bìa).
/// Mọi cặp màu là tông trầm cùng họ với bảng màu chung; chữ trắng đạt ≥ 4.5:1 trên cả hai đầu gradient.
class TourStyle {
  final List<Color> colors;
  final IconData icon;

  const TourStyle(this.colors, this.icon);

  /// Màu chủ đạo (đầu gradient) — dùng cho icon/viền khi cần một màu đơn.
  Color get primary => colors.first;

  static TourStyle of(String tourType) {
    switch (tourType) {
      case 'HISTORICAL':
        return const TourStyle([Color(0xFF4F46E5), Color(0xFF3730A3)], Icons.account_balance_rounded);
      case 'ADVENTURE':
        return const TourStyle([Color(0xFFEA580C), Color(0xFF9A3412)], Icons.hiking_rounded);
      case 'BEACH':
        return const TourStyle([Color(0xFF0284C7), Color(0xFF075985)], Icons.beach_access_rounded);
      case 'MOUNTAIN':
        return const TourStyle([Color(0xFF059669), Color(0xFF065F46)], Icons.landscape_rounded);
      case 'CITY':
        return const TourStyle([Color(0xFF475569), Color(0xFF1E293B)], Icons.location_city_rounded);
      case 'ECOTOURISM':
        return const TourStyle([Color(0xFF16A34A), Color(0xFF14532D)], Icons.eco_rounded);
      case 'GASTRONOMY':
        return const TourStyle([Color(0xFFE11D48), Color(0xFF9F1239)], Icons.restaurant_rounded);
      case 'CULTURAL':
        return const TourStyle(
          [AppCultureColors.jadeGradientStart, AppCultureColors.jadeGradientEnd],
          Icons.temple_buddhist_rounded,
        );
      default:
        return const TourStyle([AppCultureColors.oceanBlue, AppCultureColors.oceanDark], Icons.explore_rounded);
    }
  }
}

/// Nhãn nhỏ bo tròn dùng trên ảnh bìa / banner tour.
/// - [dark] = true: nền đen 55% làm mờ phía sau, chữ trắng — đọc được trên mọi ảnh.
/// - [dark] = false: nền trắng, chữ màu mực.
class TourChip extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool dark;

  const TourChip({
    super.key,
    required this.icon,
    required this.label,
    this.dark = false,
  });

  @override
  Widget build(BuildContext context) {
    final fg = dark ? Colors.white : AppCultureColors.textDark;
    final content = Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: dark ? Colors.black.withValues(alpha: 0.55) : Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: dark ? Border.all(color: Colors.white.withValues(alpha: 0.14)) : null,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: dark ? Colors.white : AppCultureColors.heritageJade),
          const SizedBox(width: 5),
          Text(
            label,
            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: fg),
          ),
        ],
      ),
    );
    if (!dark) return content;
    return ClipRRect(
      borderRadius: BorderRadius.circular(20),
      child: BackdropFilter(filter: ImageFilter.blur(sigmaX: 8, sigmaY: 8), child: content),
    );
  }
}

/// Dải phần thưởng của tour: "3 nhiệm vụ · tối đa 300 điểm · 1 huy hiệu".
/// [onDark] = true khi đặt trên banner màu, false khi đặt trên nền sáng.
class TourRewardStrip extends StatelessWidget {
  final int taskCount;
  final int points;
  final int badgeCount;
  final bool onDark;

  const TourRewardStrip({
    super.key,
    required this.taskCount,
    required this.points,
    required this.badgeCount,
    this.onDark = false,
  });

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final items = <(IconData, String, Color)>[
      if (taskCount > 0) (Icons.flag_rounded, l10n.tourTaskCount(taskCount), AppCultureColors.heritageJade),
      if (points > 0) (Icons.stars_rounded, l10n.rewardMaxPoints(formatThousands(points)), AppCultureColors.gold),
      if (badgeCount > 0) (Icons.military_tech_rounded, l10n.tourBadgeCount(badgeCount), AppCultureColors.lacquer),
    ];
    if (items.isEmpty) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: onDark ? Colors.black.withValues(alpha: 0.35) : AppCultureColors.rewardBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: onDark ? Colors.white.withValues(alpha: 0.18) : AppCultureColors.rewardBorder,
        ),
      ),
      child: Wrap(
        spacing: 14,
        runSpacing: 4,
        children: [
          for (final (icon, label, color) in items)
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(icon, size: 16, color: onDark ? Colors.white : color),
                const SizedBox(width: 5),
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w700,
                    color: onDark ? Colors.white : AppCultureColors.rewardText,
                  ),
                ),
              ],
            ),
        ],
      ),
    );
  }
}

/// Ảnh giữ chỗ khi tour/điểm đến chưa có ảnh: gradient theo loại hình + icon lớn mờ + icon nhỏ rõ.
/// Thay cho ô xám trống.
class TourPlaceholder extends StatelessWidget {
  final TourStyle style;
  final double iconSize;

  const TourPlaceholder({super.key, required this.style, this.iconSize = 96});

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(colors: style.colors, begin: Alignment.topLeft, end: Alignment.bottomRight),
      ),
      child: Stack(
        fit: StackFit.expand,
        children: [
          Positioned(
            right: -iconSize * 0.15,
            bottom: -iconSize * 0.2,
            child: Icon(style.icon, size: iconSize, color: Colors.white.withValues(alpha: 0.14)),
          ),
          Center(
            child: Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.16), shape: BoxShape.circle),
              child: Icon(style.icon, size: iconSize * 0.3, color: Colors.white),
            ),
          ),
        ],
      ),
    );
  }
}

/// Lớp phủ tối cho chữ đặt trên ảnh: trên trong suốt → đáy tối 75%.
/// [top] = true thêm dải tối nhẹ phía trên (khi có nhãn/nút ở góc trên).
class PhotoScrim extends StatelessWidget {
  final bool top;
  const PhotoScrim({super.key, this.top = true});

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            Colors.black.withValues(alpha: top ? 0.28 : 0),
            Colors.black.withValues(alpha: 0),
            Colors.black.withValues(alpha: 0.75),
          ],
          stops: const [0, 0.4, 1],
        ),
      ),
    );
  }
}

/// Ảnh bìa tour/điểm đến: ảnh thật (nếu có) phủ lớp tối để chữ trên ảnh luôn đọc được;
/// chưa có ảnh hoặc ảnh lỗi thì dùng nền gradient theo loại hình tour.
class TourCover extends StatelessWidget {
  final String? imageUrl;
  final List<Color> colors;
  final double? height;
  final EdgeInsetsGeometry padding;
  final BorderRadius? borderRadius;
  final Widget child;

  const TourCover({
    super.key,
    required this.imageUrl,
    required this.colors,
    required this.child,
    this.height,
    this.padding = const EdgeInsets.all(14),
    this.borderRadius,
  });

  @override
  Widget build(BuildContext context) {
    final url = imageUrl;
    final hasImage = url != null && url.startsWith('http');
    return Container(
      height: height,
      width: double.infinity,
      decoration: BoxDecoration(
        borderRadius: borderRadius,
        gradient: LinearGradient(
          colors: colors,
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      clipBehavior: borderRadius == null ? Clip.none : Clip.antiAlias,
      child: Stack(
        // Có chiều cao cố định thì phủ kín khung; không thì co theo nội dung
        fit: height != null ? StackFit.expand : StackFit.loose,
        children: [
          if (hasImage) ...[
            Positioned.fill(
              child: Image.network(
                url,
                fit: BoxFit.cover,
                errorBuilder: (_, _, _) => const SizedBox.shrink(),
              ),
            ),
            const Positioned.fill(child: PhotoScrim()),
          ],
          Padding(padding: padding, child: child),
        ],
      ),
    );
  }
}
