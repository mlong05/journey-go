import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/models/gamification_model.dart' show formatThousands;
import '../../core/models/tour_model.dart';
import '../common/heritage_motion.dart' show Pressable;
import 'tour_style.dart';

/// Biểu tượng cho chủ đề du lịch, đoán theo tên/slug (danh mục do Admin đặt tên tự do).
IconData themeIcon(String nameOrSlug) {
  final s = nameOrSlug.toLowerCase();
  bool has(List<String> keys) => keys.any(s.contains);
  if (has(['am-thuc', 'ẩm thực', 'food', 'gastronomy'])) return Icons.restaurant_rounded;
  if (has(['bien', 'biển', 'beach', 'đảo', 'dao'])) return Icons.beach_access_rounded;
  if (has(['nui', 'núi', 'mountain', 'trekking'])) return Icons.landscape_rounded;
  if (has(['lich-su', 'lịch sử', 'history', 'di tích', 'di-tich'])) return Icons.account_balance_rounded;
  if (has(['tam-linh', 'tâm linh', 'chùa', 'chua', 'đền', 'den'])) return Icons.temple_buddhist_rounded;
  if (has(['lang-nghe', 'làng nghề', 'thủ công', 'thu-cong', 'craft'])) return Icons.handyman_rounded;
  if (has(['sinh-thai', 'sinh thái', 'eco', 'thiên nhiên', 'thien-nhien'])) return Icons.eco_rounded;
  if (has(['le-hoi', 'lễ hội', 'festival'])) return Icons.celebration_rounded;
  if (has(['van-hoa', 'văn hóa', 'văn hoá', 'culture'])) return Icons.museum_rounded;
  return Icons.explore_rounded;
}

/// "Khởi hành 20/11"; null nếu tour không còn ngày khởi hành.
String? departureLabel(TourModel tour) {
  final d = tour.nextDepartureDate;
  if (d == null) return null;
  return 'Khởi hành ${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}';
}

/// Giá ngắn gọn cho thẻ tour: "Từ 450.000 đ".
String priceFromLabel(TourModel tour) =>
    tour.price <= 0 ? 'Miễn phí' : 'Từ ${formatThousands(tour.price)} đ';

/// Ảnh bìa tour bo góc; chưa có ảnh thì nền gradient kèm biểu tượng loại hình.
class TourThumb extends StatelessWidget {
  final TourModel tour;
  final double? height;
  final double? width;
  final BorderRadius borderRadius;
  final List<Widget> overlays;

  const TourThumb({
    super.key,
    required this.tour,
    this.height,
    this.width,
    this.borderRadius = const BorderRadius.all(Radius.circular(16)),
    this.overlays = const [],
  });

  @override
  Widget build(BuildContext context) {
    final style = TourStyle.of(tour.tourType);
    final url = tour.coverImageUrl;
    Widget fallback() => DecoratedBox(
          decoration: BoxDecoration(
            gradient: LinearGradient(colors: style.colors, begin: Alignment.topLeft, end: Alignment.bottomRight),
          ),
          child: Center(child: Icon(style.icon, color: Colors.white.withValues(alpha: 0.5), size: 40)),
        );
    return ClipRRect(
      borderRadius: borderRadius,
      child: SizedBox(
        height: height,
        width: width,
        child: Stack(
          fit: StackFit.expand,
          children: [
            if (url == null)
              fallback()
            else
              Image.network(url, fit: BoxFit.cover, errorBuilder: (_, _, _) => fallback()),
            ...overlays,
          ],
        ),
      ),
    );
  }
}

/// Nhãn nhỏ đặt trên ảnh (vùng miền, "Đã có vé"...).
class ImageBadge extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;

  const ImageBadge({super.key, required this.icon, required this.label, this.color = const Color(0xCC000000)});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(20)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: Colors.white),
          const SizedBox(width: 4),
          Flexible(
            child: Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Colors.white),
            ),
          ),
        ],
      ),
    );
  }
}

/// Dòng thông tin nhỏ có biểu tượng: thời lượng, số điểm dừng...
class TourMeta extends StatelessWidget {
  final IconData icon;
  final String text;
  final Color color;

  const TourMeta({super.key, required this.icon, required this.text, this.color = AppCultureColors.textMuted});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 13, color: color),
        const SizedBox(width: 3),
        Flexible(
          child: Text(
            text,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(fontSize: 12, color: color, fontWeight: FontWeight.w500),
          ),
        ),
      ],
    );
  }
}

/// Dòng điểm thưởng ngắn gọn: "+120 điểm · 4 nhiệm vụ"; null nếu tour không có phần thưởng.
String? rewardLabel(TourModel tour) {
  final parts = <String>[
    if (tour.totalTaskPoints > 0) '+${formatThousands(tour.totalTaskPoints)} điểm',
    if (tour.taskCount > 0) '${tour.taskCount} nhiệm vụ',
    if (tour.badgeCount > 0) '${tour.badgeCount} huy hiệu',
  ];
  return parts.isEmpty ? null : parts.join(' · ');
}

/// Thẻ tour dọc cho các dải kéo ngang ở trang chủ.
class TourCard extends StatelessWidget {
  final TourModel tour;
  final VoidCallback onTap;
  final double width;
  final bool showDeparture;

  const TourCard({
    super.key,
    required this.tour,
    required this.onTap,
    this.width = 232,
    this.showDeparture = false,
  });

  @override
  Widget build(BuildContext context) {
    final reward = rewardLabel(tour);
    final departure = showDeparture ? departureLabel(tour) : null;
    return Pressable(
      onTap: onTap,
      child: SizedBox(
        width: width,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            TourThumb(
              tour: tour,
              height: 140,
              overlays: [
                if (tour.regionName != null)
                  Positioned(
                    left: 8,
                    top: 8,
                    right: 8,
                    child: Align(
                      alignment: Alignment.centerLeft,
                      child: ImageBadge(icon: Icons.place_rounded, label: tour.regionName!),
                    ),
                  ),
                if (departure != null)
                  Positioned(
                    left: 8,
                    bottom: 8,
                    child: ImageBadge(
                      icon: Icons.event_rounded,
                      label: departure,
                      color: AppCultureColors.oceanBlue.withValues(alpha: 0.92),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              tour.title,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: 14.5,
                height: 1.3,
                fontWeight: FontWeight.w700,
                color: AppCultureColors.textDark,
              ),
            ),
            const SizedBox(height: 4),
            Wrap(
              spacing: 10,
              runSpacing: 2,
              children: [
                TourMeta(icon: Icons.schedule_rounded, text: tour.formattedDuration),
                if (tour.destinationCount > 0)
                  TourMeta(icon: Icons.route_rounded, text: '${tour.destinationCount} điểm dừng'),
              ],
            ),
            if (reward != null) ...[
              const SizedBox(height: 3),
              TourMeta(icon: Icons.stars_rounded, text: reward, color: AppCultureColors.amberDark),
            ],
            const SizedBox(height: 5),
            Text(
              priceFromLabel(tour),
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: AppCultureColors.jadeDark),
            ),
          ],
        ),
      ),
    );
  }
}

/// Thẻ tour ngang cho màn danh sách: ảnh trái, thông tin phải.
class TourListTile extends StatelessWidget {
  final TourModel tour;
  final VoidCallback onTap;
  final bool owned;

  const TourListTile({super.key, required this.tour, required this.onTap, this.owned = false});

  @override
  Widget build(BuildContext context) {
    final reward = rewardLabel(tour);
    final departure = departureLabel(tour);
    return Pressable(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: AppCultureColors.border),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            TourThumb(
              tour: tour,
              width: 112,
              height: 124,
              borderRadius: BorderRadius.circular(14),
              overlays: [
                if (owned)
                  const Positioned(
                    left: 6,
                    top: 6,
                    child: ImageBadge(
                      icon: Icons.confirmation_number_rounded,
                      label: 'Đã có vé',
                      color: AppCultureColors.heritageJade,
                    ),
                  ),
              ],
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (tour.regionName != null || tour.themeName != null)
                    Text(
                      [tour.regionName, tour.themeName].whereType<String>().join(' · '),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w700,
                        color: AppCultureColors.heritageJade,
                      ),
                    ),
                  const SizedBox(height: 2),
                  Text(
                    tour.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 14.5,
                      height: 1.3,
                      fontWeight: FontWeight.w700,
                      color: AppCultureColors.textDark,
                    ),
                  ),
                  const SizedBox(height: 5),
                  Wrap(
                    spacing: 10,
                    runSpacing: 3,
                    children: [
                      TourMeta(icon: Icons.schedule_rounded, text: tour.formattedDuration),
                      if (tour.destinationCount > 0)
                        TourMeta(icon: Icons.route_rounded, text: '${tour.destinationCount} điểm dừng'),
                      if (departure != null) TourMeta(icon: Icons.event_rounded, text: departure),
                    ],
                  ),
                  if (reward != null) ...[
                    const SizedBox(height: 3),
                    TourMeta(icon: Icons.stars_rounded, text: reward, color: AppCultureColors.amberDark),
                  ],
                  const SizedBox(height: 6),
                  Text(
                    priceFromLabel(tour),
                    style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: AppCultureColors.jadeDark),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
