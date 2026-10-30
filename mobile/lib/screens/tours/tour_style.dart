import 'package:flutter/material.dart';
import '../../core/models/gamification_model.dart' show formatThousands;

/// Màu và biểu tượng nhận diện theo loại hình tour (tour chưa có ảnh bìa).
class TourStyle {
  final List<Color> colors;
  final IconData icon;

  const TourStyle(this.colors, this.icon);

  static TourStyle of(String tourType) {
    switch (tourType) {
      case 'HISTORICAL':
        return const TourStyle([
          Color(0xFFB45309),
          Color(0xFF92400E),
        ], Icons.account_balance_rounded);
      case 'ADVENTURE':
        return const TourStyle([
          Color(0xFFEA580C),
          Color(0xFFC2410C),
        ], Icons.hiking_rounded);
      case 'BEACH':
        return const TourStyle([
          Color(0xFF0288D1),
          Color(0xFF01579B),
        ], Icons.beach_access_rounded);
      case 'MOUNTAIN':
        return const TourStyle([
          Color(0xFF0F766E),
          Color(0xFF134E4A),
        ], Icons.landscape_rounded);
      case 'CITY':
        return const TourStyle([
          Color(0xFF475569),
          Color(0xFF1E293B),
        ], Icons.location_city_rounded);
      case 'ECOTOURISM':
        return const TourStyle([
          Color(0xFF16A34A),
          Color(0xFF166534),
        ], Icons.eco_rounded);
      case 'GASTRONOMY':
        return const TourStyle([
          Color(0xFFE11D48),
          Color(0xFF9F1239),
        ], Icons.restaurant_rounded);
      case 'CULTURAL':
        return const TourStyle([
          Color(0xFF00A86B),
          Color(0xFF0288D1),
        ], Icons.temple_buddhist_rounded);
      default:
        return const TourStyle([
          Color(0xFF00A86B),
          Color(0xFF0288D1),
        ], Icons.explore_rounded);
    }
  }
}

/// Nhãn nhỏ bo tròn dùng trên banner tour.
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
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: dark ? Colors.black.withValues(alpha: 0.28) : Colors.white,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 13, color: Colors.white),
          const SizedBox(width: 5),
          Text(
            label,
            style: const TextStyle(
              fontSize: 11.5,
              fontWeight: FontWeight.w700,
              color: Colors.white,
            ),
          ),
        ],
      ),
    );
  }
}

/// Dải phần thưởng của tour: "3 nhiệm vụ · tối đa 300 điểm · 1 huy hiệu".
/// [onDark] = true khi đặt trên banner màu, false khi đặt trên nền trắng.
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
    final items = <(IconData, String, Color)>[
      if (taskCount > 0)
        (Icons.flag_rounded, '$taskCount nhiệm vụ', const Color(0xFF0EA5E9)),
      if (points > 0)
        (
          Icons.stars_rounded,
          'tối đa ${formatThousands(points)} điểm',
          const Color(0xFFF59E0B),
        ),
      if (badgeCount > 0)
        (
          Icons.military_tech_rounded,
          '$badgeCount huy hiệu',
          const Color(0xFF8B5CF6),
        ),
    ];
    if (items.isEmpty) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(
        color: onDark
            ? Colors.white.withValues(alpha: 0.16)
            : const Color(0xFFFFFBEB),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: onDark
              ? Colors.white.withValues(alpha: 0.22)
              : const Color(0xFFFDE68A),
        ),
      ),
      child: Wrap(
        spacing: 12,
        runSpacing: 4,
        children: [
          for (final (icon, label, color) in items)
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(icon, size: 15, color: onDark ? Colors.white : color),
                const SizedBox(width: 4),
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                    color: onDark ? Colors.white : const Color(0xFF78350F),
                  ),
                ),
              ],
            ),
        ],
      ),
    );
  }
}

/// Ảnh bìa tour/điểm đến: ảnh thật (nếu có) phủ lớp tối để chữ trên ảnh dễ đọc;
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
            Positioned.fill(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Colors.black.withValues(alpha: 0.25),
                      Colors.black.withValues(alpha: 0.05),
                      Colors.black.withValues(alpha: 0.6),
                    ],
                  ),
                ),
              ),
            ),
          ],
          Padding(padding: padding, child: child),
        ],
      ),
    );
  }
}
