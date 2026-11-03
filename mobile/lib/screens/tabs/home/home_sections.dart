import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/models/destination_model.dart';
import '../../../core/models/experience_model.dart';
import '../../../core/models/tour_journey_model.dart';
import '../../common/heritage_motion.dart';

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

/// Băng chuyền gói tour: thẻ giữa nổi bật, thẻ hai bên nhỏ và mờ hơn, có chấm trang.
class ExperienceCarousel extends StatefulWidget {
  final List<ExperienceModel> experiences;
  final VoidCallback onOpen;

  const ExperienceCarousel({super.key, required this.experiences, required this.onOpen});

  @override
  State<ExperienceCarousel> createState() => _ExperienceCarouselState();
}

class _ExperienceCarouselState extends State<ExperienceCarousel> {
  final PageController _page = PageController(viewportFraction: 0.84);
  int _current = 0;

  @override
  void dispose() {
    _page.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final items = widget.experiences;
    if (items.isEmpty) {
      return const Padding(
        padding: EdgeInsets.symmetric(horizontal: 16, vertical: 24),
        child: Text(
          'Đang cập nhật các gói tour di sản mới…',
          style: TextStyle(fontSize: 13, color: AppCultureColors.textMuted),
        ),
      );
    }

    return Column(
      children: [
        SizedBox(
          height: 262,
          child: PageView.builder(
            controller: _page,
            itemCount: items.length,
            onPageChanged: (i) => setState(() => _current = i),
            itemBuilder: (_, i) => AnimatedBuilder(
              animation: _page,
              builder: (_, child) {
                final page = _page.hasClients && _page.position.haveDimensions
                    ? _page.page ?? _current.toDouble()
                    : _current.toDouble();
                final d = (page - i).abs().clamp(0.0, 1.0);
                return Opacity(
                  opacity: 1 - 0.35 * d,
                  child: Transform.scale(scale: 1 - 0.07 * d, child: child),
                );
              },
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 6),
                child: _ExperienceCard(exp: items[i], onTap: widget.onOpen),
              ),
            ),
          ),
        ),
        if (items.length > 1) ...[
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              for (var i = 0; i < items.length; i++)
                AnimatedContainer(
                  duration: const Duration(milliseconds: 250),
                  margin: const EdgeInsets.symmetric(horizontal: 3),
                  width: i == _current ? 18 : 6,
                  height: 6,
                  decoration: BoxDecoration(
                    color: i == _current ? AppCultureColors.heritageJade : AppCultureColors.border,
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

class _ExperienceCard extends StatelessWidget {
  final ExperienceModel exp;
  final VoidCallback onTap;

  const _ExperienceCard({required this.exp, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Pressable(
      onTap: onTap,
      child: Container(
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(22),
          border: Border.all(color: AppCultureColors.border),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.06),
              blurRadius: 14,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Stack(
                fit: StackFit.expand,
                children: [
                  Image.asset(exp.coverImage, fit: BoxFit.cover),
                  DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [Colors.transparent, Colors.black.withValues(alpha: 0.5)],
                        begin: Alignment.center,
                        end: Alignment.bottomCenter,
                      ),
                    ),
                  ),
                  Positioned(
                    top: 10,
                    left: 10,
                    child: _Pill(
                      text: exp.formattedPrice,
                      background: exp.price > 0 ? Colors.white : AppCultureColors.heritageJade,
                      foreground: exp.price > 0 ? AppCultureColors.textDark : Colors.white,
                    ),
                  ),
                  Positioned(
                    bottom: 10,
                    left: 10,
                    child: _Pill(
                      icon: Icons.schedule_rounded,
                      text: exp.formattedDuration,
                      background: Colors.black.withValues(alpha: 0.55),
                      foreground: Colors.white,
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 12, 14, 14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    exp.title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 15.5,
                      fontWeight: FontWeight.w700,
                      color: AppCultureColors.textDark,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: Row(
                          children: [
                            Flexible(child: _Meta(icon: Icons.extension_rounded, text: '${exp.taskCount} thử thách')),
                            const SizedBox(width: 12),
                            Flexible(child: _Meta(icon: Icons.location_on_rounded, text: '${exp.checkInPointCount} trạm')),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      const Text(
                        'Xem tour',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: AppCultureColors.heritageJade,
                        ),
                      ),
                      const Icon(Icons.arrow_forward_rounded, size: 16, color: AppCultureColors.heritageJade),
                    ],
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

/// Số trải nghiệm và thử thách thật của một điểm đến (tính từ danh sách trải nghiệm đã xuất bản).
typedef DestinationStats = ({int experiences, int tasks});

/// Lộ trình gợi ý: thẻ ảnh rộng có chữ đè lên ảnh, khác kiểu với thẻ tour.
class RouteCardList extends StatelessWidget {
  final List<DestinationModel> routes;
  final Map<int, DestinationStats> stats;
  final VoidCallback onOpen;

  const RouteCardList({super.key, required this.routes, required this.stats, required this.onOpen});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 178,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: routes.length,
        separatorBuilder: (_, _) => const SizedBox(width: 12),
        itemBuilder: (_, i) => _RouteCard(
          route: routes[i],
          stats: stats[routes[i].id] ?? (experiences: 0, tasks: 0),
          onTap: onOpen,
        ),
      ),
    );
  }
}

class _RouteCard extends StatelessWidget {
  final DestinationModel route;
  final DestinationStats stats;
  final VoidCallback onTap;

  const _RouteCard({required this.route, required this.stats, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final city = route.address.split(',').last.trim();
    final fallback = Image.asset(route.coverImage, fit: BoxFit.cover);
    return Pressable(
      onTap: onTap,
      child: Container(
        width: 270,
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(borderRadius: BorderRadius.circular(22)),
        child: Stack(
          fit: StackFit.expand,
          children: [
            // Ảnh thật của điểm đến; chưa có hoặc lỗi thì dùng ảnh minh hoạ
            route.coverImageUrl == null
                ? fallback
                : Image.network(
                    route.coverImageUrl!,
                    fit: BoxFit.cover,
                    errorBuilder: (_, _, _) => fallback,
                  ),
            DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [Colors.transparent, Colors.black.withValues(alpha: 0.75)],
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  stops: const [0.3, 1],
                ),
              ),
            ),
            Positioned(
              left: 14,
              right: 14,
              bottom: 12,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (city.isNotEmpty)
                    Row(
                      children: [
                        const Icon(Icons.location_on_outlined, size: 13, color: Colors.white70),
                        const SizedBox(width: 3),
                        Flexible(
                          child: Text(
                            city,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontSize: 12, color: Colors.white70),
                          ),
                        ),
                      ],
                    ),
                  const SizedBox(height: 2),
                  Text(
                    route.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: Colors.white),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: stats.experiences == 0
                        ? [
                            _Pill(
                              icon: Icons.hourglass_empty_rounded,
                              text: 'Đang cập nhật trải nghiệm',
                              background: Colors.white.withValues(alpha: 0.18),
                              foreground: Colors.white,
                            ),
                          ]
                        : [
                            _Pill(
                              icon: Icons.temple_buddhist_rounded,
                              text: '${stats.experiences} trải nghiệm',
                              background: Colors.white.withValues(alpha: 0.18),
                              foreground: Colors.white,
                            ),
                            if (stats.tasks > 0)
                              _Pill(
                                icon: Icons.extension_rounded,
                                text: '${stats.tasks} thử thách',
                                background: AppCultureColors.rewardBg,
                                foreground: AppCultureColors.rewardText,
                              ),
                          ],
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

class _Pill extends StatelessWidget {
  final IconData? icon;
  final String text;
  final Color background;
  final Color foreground;

  const _Pill({
    this.icon,
    required this.text,
    required this.background,
    required this.foreground,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(color: background, borderRadius: BorderRadius.circular(10)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 13, color: foreground),
            const SizedBox(width: 3),
          ],
          Text(text, style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: foreground)),
        ],
      ),
    );
  }
}

class _Meta extends StatelessWidget {
  final IconData icon;
  final String text;

  const _Meta({required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 14, color: AppCultureColors.textLight),
        const SizedBox(width: 4),
        Flexible(
          child: Text(
            text,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontSize: 12.5, color: AppCultureColors.textMuted),
          ),
        ),
      ],
    );
  }
}
