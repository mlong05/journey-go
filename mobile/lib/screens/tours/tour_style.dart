import 'package:flutter/material.dart';

/// Màu và biểu tượng nhận diện theo loại hình tour (tour chưa có ảnh bìa).
class TourStyle {
  final List<Color> colors;
  final IconData icon;

  const TourStyle(this.colors, this.icon);

  static TourStyle of(String tourType) {
    switch (tourType) {
      case 'HISTORICAL':
        return const TourStyle([Color(0xFFB45309), Color(0xFF92400E)], Icons.account_balance_rounded);
      case 'ADVENTURE':
        return const TourStyle([Color(0xFFEA580C), Color(0xFFC2410C)], Icons.hiking_rounded);
      case 'BEACH':
        return const TourStyle([Color(0xFF0288D1), Color(0xFF01579B)], Icons.beach_access_rounded);
      case 'MOUNTAIN':
        return const TourStyle([Color(0xFF0F766E), Color(0xFF134E4A)], Icons.landscape_rounded);
      case 'CITY':
        return const TourStyle([Color(0xFF475569), Color(0xFF1E293B)], Icons.location_city_rounded);
      case 'ECOTOURISM':
        return const TourStyle([Color(0xFF16A34A), Color(0xFF166534)], Icons.eco_rounded);
      case 'GASTRONOMY':
        return const TourStyle([Color(0xFFE11D48), Color(0xFF9F1239)], Icons.restaurant_rounded);
      case 'CULTURAL':
        return const TourStyle([Color(0xFF00A86B), Color(0xFF0288D1)], Icons.temple_buddhist_rounded);
      default:
        return const TourStyle([Color(0xFF00A86B), Color(0xFF0288D1)], Icons.explore_rounded);
    }
  }
}

/// Nhãn nhỏ bo tròn dùng trên banner tour.
class TourChip extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool dark;

  const TourChip({super.key, required this.icon, required this.label, this.dark = false});

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
