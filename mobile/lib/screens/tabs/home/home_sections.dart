import 'dart:async';
import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/models/tour_journey_model.dart';
import '../../../core/models/tour_model.dart';
import '../../../core/services/catalog_service.dart';
import '../../common/heritage_motion.dart';
import '../../tours/tour_cards.dart';

/// Nhiệm vụ đang mở của hành trình, kéo ngang.
class MissionStrip extends StatelessWidget {
  final List<JourneyMission> missions;
  final ValueChanged<JourneyMission> onOpen;

  const MissionStrip({super.key, required this.missions, required this.onOpen});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 92,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: missions.length,
        separatorBuilder: (_, _) => const SizedBox(width: 10),
        itemBuilder: (_, i) {
          final m = missions[i];
          return Pressable(
            onTap: () => onOpen(m),
            child: Container(
              width: 236,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: AppCultureColors.rewardBorder),
              ),
              child: Row(
                children: [
                  Container(
                    width: 42,
                    height: 42,
                    decoration: const BoxDecoration(
                      color: AppCultureColors.rewardBg,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.extension_rounded, color: AppCultureColors.amberDark, size: 22),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          m.title,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 13.5,
                            fontWeight: FontWeight.w600,
                            color: AppCultureColors.textDark,
                            height: 1.25,
                          ),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          m.siteName,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontSize: 12, color: AppCultureColors.textMuted),
                        ),
                      ],
                    ),
                  ),
                  const Icon(Icons.chevron_right_rounded, color: AppCultureColors.amberDark),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

/// Banner tour nổi bật: ảnh bìa lớn tự trượt, có chấm trang. Bấm để mở chi tiết.
class FeaturedTourBanner extends StatefulWidget {
  final List<TourModel> tours;
  final ValueChanged<TourModel> onOpen;

  const FeaturedTourBanner({super.key, required this.tours, required this.onOpen});

  @override
  State<FeaturedTourBanner> createState() => _FeaturedTourBannerState();
}

class _FeaturedTourBannerState extends State<FeaturedTourBanner> {
  final PageController _controller = PageController(viewportFraction: 0.92);
  Timer? _timer;
  int _index = 0;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _timer?.cancel();
    if (!reduceMotion(context) && widget.tours.length > 1) {
      _timer = Timer.periodic(const Duration(seconds: 5), (_) {
        if (!_controller.hasClients) return;
        final next = (_index + 1) % widget.tours.length;
        _controller.animateToPage(next, duration: const Duration(milliseconds: 450), curve: Curves.easeOutCubic);
      });
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final tours = widget.tours;
    return Column(
      children: [
        SizedBox(
          height: 190,
          child: PageView.builder(
            controller: _controller,
            itemCount: tours.length,
            onPageChanged: (i) => setState(() => _index = i),
            itemBuilder: (_, i) {
              final tour = tours[i];
              return Padding(
                padding: const EdgeInsets.symmetric(horizontal: 5),
                child: Pressable(
                  onTap: () => widget.onOpen(tour),
                  child: TourThumb(
                    tour: tour,
                    borderRadius: BorderRadius.circular(22),
                    overlays: [
                      const DecoratedBox(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: [Colors.transparent, Color(0xB3000000)],
                            stops: [0.35, 1],
                          ),
                        ),
                      ),
                      Positioned(
                        left: 16,
                        right: 16,
                        bottom: 14,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Wrap(
                              spacing: 6,
                              children: [
                                if (tour.regionName != null)
                                  ImageBadge(icon: Icons.place_rounded, label: tour.regionName!),
                                ImageBadge(icon: Icons.schedule_rounded, label: tour.formattedDuration),
                              ],
                            ),
                            const SizedBox(height: 6),
                            Text(
                              tour.title,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 18,
                                height: 1.25,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              priceFromLabel(tour),
                              style: const TextStyle(
                                color: Color(0xFFFDE68A),
                                fontSize: 14,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
        if (tours.length > 1) ...[
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              for (var i = 0; i < tours.length; i++)
                AnimatedContainer(
                  duration: const Duration(milliseconds: 250),
                  margin: const EdgeInsets.symmetric(horizontal: 3),
                  width: i == _index ? 18 : 6,
                  height: 6,
                  decoration: BoxDecoration(
                    color: i == _index ? AppCultureColors.heritageJade : AppCultureColors.border,
                    borderRadius: BorderRadius.circular(3),
                  ),
                ),
            ],
          ),
        ],
      ],
    );
  }
}

/// Hàng chủ đề dạng biểu tượng tròn (giống mục danh mục của các trang du lịch).
class ThemeRow extends StatelessWidget {
  final List<CatalogItem> themes;
  final ValueChanged<CatalogItem> onOpen;

  const ThemeRow({super.key, required this.themes, required this.onOpen});

  static const _tints = [
    (AppCultureColors.jadeLight, AppCultureColors.jadeDark),
    (AppCultureColors.oceanLight, AppCultureColors.oceanDark),
    (AppCultureColors.rewardBg, AppCultureColors.amberDark),
    (Color(0xFFFCE7F3), Color(0xFFBE185D)),
    (Color(0xFFEDE9FE), Color(0xFF6D28D9)),
  ];

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 92,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: themes.length,
        separatorBuilder: (_, _) => const SizedBox(width: 6),
        itemBuilder: (_, i) {
          final theme = themes[i];
          final (bg, fg) = _tints[i % _tints.length];
          return Pressable(
            onTap: () => onOpen(theme),
            child: SizedBox(
              width: 72,
              child: Column(
                children: [
                  Container(
                    width: 52,
                    height: 52,
                    decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(18)),
                    child: Icon(themeIcon('${theme.slug} ${theme.name}'), color: fg, size: 26),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    theme.name,
                    maxLines: 2,
                    textAlign: TextAlign.center,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 11.5,
                      height: 1.2,
                      fontWeight: FontWeight.w600,
                      color: AppCultureColors.textDark,
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

/// Thẻ vùng miền kéo ngang: nền gradient (danh mục chưa có ảnh) kèm tên và số tour.
class RegionCards extends StatelessWidget {
  final List<CatalogItem> regions;

  /// Số tour đang có của từng vùng (đếm từ các tour đã tải); không có thì ẩn dòng số tour.
  final Map<int, int> tourCounts;
  final ValueChanged<CatalogItem> onOpen;

  const RegionCards({super.key, required this.regions, required this.tourCounts, required this.onOpen});

  static const _gradients = [
    [Color(0xFF00A86B), Color(0xFF0288D1)],
    [Color(0xFFB45309), Color(0xFFE11D48)],
    [Color(0xFF0F766E), Color(0xFF134E4A)],
    [Color(0xFF6D28D9), Color(0xFF0288D1)],
  ];

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 96,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: regions.length,
        separatorBuilder: (_, _) => const SizedBox(width: 10),
        itemBuilder: (_, i) {
          final region = regions[i];
          final count = tourCounts[region.id];
          return Pressable(
            onTap: () => onOpen(region),
            child: Container(
              width: 150,
              clipBehavior: Clip.antiAlias,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(18),
                gradient: LinearGradient(
                  colors: _gradients[i % _gradients.length],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
              child: Stack(
                children: [
                  Positioned(
                    right: -30,
                    bottom: -30,
                    child: DrumMotif(size: 90, color: Colors.white.withValues(alpha: 0.16)),
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      const Icon(Icons.map_rounded, color: Colors.white70, size: 18),
                      const Spacer(),
                      Text(
                        region.name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.w800),
                      ),
                      if (count != null && count > 0)
                        Text(
                          '$count tour',
                          style: TextStyle(color: Colors.white.withValues(alpha: 0.85), fontSize: 12),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

/// Dải tour kéo ngang (tour trong ngày, nhiều ngày, sắp khởi hành...).
class TourStrip extends StatelessWidget {
  final List<TourModel> tours;
  final ValueChanged<TourModel> onOpen;
  final bool showDeparture;

  const TourStrip({super.key, required this.tours, required this.onOpen, this.showDeparture = false});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 278,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: tours.length,
        separatorBuilder: (_, _) => const SizedBox(width: 12),
        itemBuilder: (_, i) => TourCard(
          tour: tours[i],
          showDeparture: showDeparture,
          onTap: () => onOpen(tours[i]),
        ),
      ),
    );
  }
}
