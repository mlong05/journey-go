import 'package:flutter/material.dart';
import '../../../core/models/tour_journey_model.dart';
import '../../../core/models/tour_model.dart';
import '../../../core/services/catalog_service.dart';
import '../../common/heritage_motion.dart' show Pressable;
import '../../common/ink.dart';
import '../../common/photo.dart';

// Các khối của trang chủ: nền trắng, ảnh chụp thật làm chủ đạo, chữ đậm, một màu nhấn.
// Không dùng ô biểu tượng hay nền gradient: thiếu ảnh thì để nền trung tính.

/// Ảnh kèm ghi nguồn (ghi nguồn chỉ có khi ảnh do Admin gắn từ nguồn ngoài).
typedef PhotoRef = ({String? url, String? credit});

/// "T7, 14/11".
String shortDate(DateTime d) {
  final day = d.weekday == DateTime.sunday ? 'CN' : 'T${d.weekday + 1}';
  String two(int v) => v.toString().padLeft(2, '0');
  return '$day, ${two(d.day)}/${two(d.month)}';
}

/// Dòng phụ của thẻ tour: "Miền Bắc · 2 ngày 1 đêm".
String tourMeta(TourModel t) =>
    [if (t.regionName != null) t.regionName!, t.formattedDuration].where((s) => s.trim().isNotEmpty).join(' · ');

class HomeSectionTitle extends StatelessWidget {
  final String title;
  final String? actionLabel;
  final VoidCallback? onAction;

  const HomeSectionTitle({super.key, required this.title, this.actionLabel, this.onAction});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 8, 10),
      child: Row(
        children: [
          Expanded(
            child: Text(
              title,
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: AppInk.ink),
            ),
          ),
          if (actionLabel != null)
            TextButton(
              onPressed: onAction,
              style: TextButton.styleFrom(
                foregroundColor: AppInk.ink,
                textStyle: const TextStyle(
                  fontWeight: FontWeight.w600,
                  fontSize: 14,
                  decoration: TextDecoration.underline,
                ),
              ),
              child: Text(actionLabel!),
            ),
        ],
      ),
    );
  }
}

/// Tab lọc nhanh chỉ có chữ: "Tất cả" là trang chủ, các tab khác mở danh sách tour đã lọc.
class HomeQuickTabs extends StatelessWidget {
  final List<({String label, VoidCallback onTap})> tabs;

  const HomeQuickTabs({super.key, required this.tabs});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: AppInk.line)),
      ),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 8),
        child: Row(
          children: [
            _tab('Tất cả', selected: true, onTap: null),
            for (final t in tabs) _tab(t.label, selected: false, onTap: t.onTap),
          ],
        ),
      ),
    );
  }

  Widget _tab(String label, {required bool selected, required VoidCallback? onTap}) {
    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.fromLTRB(8, 14, 8, 12),
        margin: const EdgeInsets.symmetric(horizontal: 4),
        decoration: BoxDecoration(
          border: Border(bottom: BorderSide(color: selected ? AppInk.ink : Colors.transparent, width: 2)),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 14,
            fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
            color: selected ? AppInk.ink : AppInk.muted,
          ),
        ),
      ),
    );
  }
}

/// Hành trình đang đi gọn trong một thẻ: ảnh trạm, tiến độ, trạm hiện tại, nhiệm vụ đang chờ.
class HomeJourneyCard extends StatelessWidget {
  final TourJourney journey;

  /// Ảnh trạm hiện tại (hoặc ảnh bìa tour).
  final String? imageUrl;
  final JourneyMission? mission;
  final int missionCount;

  /// Khoảng cách (m) tới trạm kế tiếp khi chưa check-in; null nếu chưa biết vị trí.
  final double? distance;
  final VoidCallback onContinue;
  final VoidCallback? onMission;

  const HomeJourneyCard({
    super.key,
    required this.journey,
    required this.imageUrl,
    required this.onContinue,
    this.mission,
    this.missionCount = 0,
    this.distance,
    this.onMission,
  });

  static String _formatDistance(double m) =>
      m >= 1000 ? '${(m / 1000).toStringAsFixed(m >= 10000 ? 0 : 1).replaceAll('.', ',')} km' : '${m.round()} m';

  /// Trạm đầu tiên chưa xong theo thứ tự lộ trình.
  static JourneyDestination? nextStop(TourJourney journey) {
    for (final d in journey.destinations) {
      if (!d.isDone) return d;
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final next = nextStop(journey);
    final total = journey.totalDestinations;
    final position = next == null ? total : journey.destinations.indexOf(next) + 1;
    final m = mission;
    return Pressable(
      onTap: onContinue,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppInk.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                SizedBox(
                  width: 64,
                  height: 64,
                  child: Photo(url: imageUrl, width: 64, borderRadius: BorderRadius.circular(14)),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Đang đi · Trạm $position/$total',
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppInk.accent),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        journey.tourName,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 15,
                          height: 1.3,
                          fontWeight: FontWeight.w700,
                          color: AppInk.ink,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            ClipRRect(
              borderRadius: BorderRadius.circular(3),
              child: LinearProgressIndicator(
                value: journey.progress,
                minHeight: 6,
                backgroundColor: AppInk.line,
                color: AppInk.accent,
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        next?.checkedIn == true ? 'Đang ở trạm' : 'Trạm kế tiếp',
                        style: const TextStyle(fontSize: 12, color: AppInk.muted),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        next == null
                            ? 'Đã đi hết các trạm'
                            : next.checkedIn
                            ? '${next.name} · đã check-in'
                            : distance != null
                            ? '${next.name} · cách ${_formatDistance(distance!)}'
                            : next.name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppInk.ink),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                FilledButton(
                  onPressed: onContinue,
                  style: FilledButton.styleFrom(
                    backgroundColor: AppInk.ink,
                    minimumSize: const Size(0, 44),
                    padding: const EdgeInsets.symmetric(horizontal: 18),
                    shape: const StadiumBorder(),
                  ),
                  child: const Text('Tiếp tục', style: TextStyle(fontWeight: FontWeight.w700)),
                ),
              ],
            ),
            if (m != null) ...[
              const SizedBox(height: 12),
              const Divider(height: 1, color: AppInk.line),
              InkWell(
                onTap: onMission,
                child: Padding(
                  padding: const EdgeInsets.only(top: 12),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text.rich(
                          TextSpan(
                            children: [
                              TextSpan(
                                text: '$missionCount nhiệm vụ chờ: ',
                                style: const TextStyle(fontWeight: FontWeight.w700),
                              ),
                              TextSpan(text: m.title),
                            ],
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontSize: 13, color: AppInk.ink),
                        ),
                      ),
                      const Icon(Icons.chevron_right_rounded, size: 18, color: AppInk.muted),
                    ],
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Thẻ tour dạng ảnh (dải ngang): ảnh 4:3 có nhãn ngày khởi hành, vùng · thời lượng, tên, giá.
class TourPhotoCard extends StatelessWidget {
  final TourModel tour;
  final VoidCallback onTap;
  final double width;

  const TourPhotoCard({super.key, required this.tour, required this.onTap, this.width = 250});

  @override
  Widget build(BuildContext context) {
    final date = tour.nextDepartureDate;
    return Pressable(
      onTap: onTap,
      child: SizedBox(
        width: width,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(
              width: width,
              height: width * 0.75,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  Photo(url: tour.coverImageUrl, width: width.round(), borderRadius: BorderRadius.circular(16)),
                  if (date != null)
                    Positioned(
                      left: 10,
                      top: 10,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(8)),
                        child: Text(
                          shortDate(date),
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppInk.ink),
                        ),
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 8),
            Text(
              tourMeta(tour),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 12, color: AppInk.muted),
            ),
            const SizedBox(height: 4),
            Text(
              tour.title,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 15, height: 1.3, fontWeight: FontWeight.w700, color: AppInk.ink),
            ),
            const SizedBox(height: 4),
            _PriceText(tour: tour),
          ],
        ),
      ),
    );
  }
}

class _PriceText extends StatelessWidget {
  final TourModel tour;

  const _PriceText({required this.tour});

  @override
  Widget build(BuildContext context) {
    if (tour.price <= 0) {
      return const Text(
        'Miễn phí',
        style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: AppInk.ink),
      );
    }
    return Text.rich(
      TextSpan(
        children: [
          const TextSpan(
            text: 'Từ ',
            style: TextStyle(color: AppInk.muted),
          ),
          TextSpan(
            text: tour.formattedPrice,
            style: const TextStyle(fontWeight: FontWeight.w800),
          ),
        ],
      ),
      style: const TextStyle(fontSize: 14, color: AppInk.ink),
    );
  }
}

/// Dải ngang các thẻ tour dạng ảnh.
class TourPhotoStrip extends StatelessWidget {
  final List<TourModel> tours;
  final ValueChanged<TourModel> onOpen;

  const TourPhotoStrip({super.key, required this.tours, required this.onOpen});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      // ảnh 188 + vùng chữ (meta, tên 2 dòng, giá)
      height: 300,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: tours.length,
        separatorBuilder: (_, _) => const SizedBox(width: 12),
        itemBuilder: (_, i) => TourPhotoCard(tour: tours[i], onTap: () => onOpen(tours[i])),
      ),
    );
  }
}

/// Lưới ảnh chủ đề 2 cột: 4 ô đầu, bấm "Xem cả N chủ đề" để mở hết.
class ThemePhotoGrid extends StatefulWidget {
  final List<CatalogItem> themes;
  final PhotoRef Function(CatalogItem theme) photoOf;
  final ValueChanged<CatalogItem> onOpen;

  const ThemePhotoGrid({super.key, required this.themes, required this.photoOf, required this.onOpen});

  @override
  State<ThemePhotoGrid> createState() => _ThemePhotoGridState();
}

class _ThemePhotoGridState extends State<ThemePhotoGrid> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    final all = widget.themes;
    final shown = _expanded ? all : all.take(4).toList();
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            padding: EdgeInsets.zero,
            mainAxisSpacing: 10,
            crossAxisSpacing: 10,
            childAspectRatio: 1.45,
            children: [for (final t in shown) _tile(t)],
          ),
          if (all.length > 4)
            TextButton(
              onPressed: () => setState(() => _expanded = !_expanded),
              style: TextButton.styleFrom(
                foregroundColor: AppInk.ink,
                padding: const EdgeInsets.symmetric(horizontal: 0, vertical: 8),
                textStyle: const TextStyle(fontWeight: FontWeight.w600, decoration: TextDecoration.underline),
              ),
              child: Text(_expanded ? 'Thu gọn' : 'Xem cả ${all.length} chủ đề'),
            ),
        ],
      ),
    );
  }

  Widget _tile(CatalogItem theme) {
    final photo = widget.photoOf(theme);
    return Semantics(
      button: true,
      label: theme.name,
      child: Pressable(
        onTap: () => widget.onOpen(theme),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(16),
          child: Stack(
            fit: StackFit.expand,
            children: [
              Photo(url: photo.url, width: 200, credit: photo.credit),
              // Lớp tối phẳng để chữ trắng đọc được trên mọi ảnh
              if (photo.url != null) const ColoredBox(color: Color(0x61000000)),
              Positioned(
                left: 12,
                right: 12,
                bottom: 12,
                child: Text(
                  theme.name,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 15,
                    height: 1.25,
                    fontWeight: FontWeight.w700,
                    color: photo.url != null ? Colors.white : AppInk.ink,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Dải ngang thẻ ảnh vùng miền: ảnh dọc, tên, số tour.
class RegionPhotoStrip extends StatelessWidget {
  final List<CatalogItem> regions;
  final Map<int, int> tourCounts;
  final PhotoRef Function(CatalogItem region) photoOf;
  final ValueChanged<CatalogItem> onOpen;

  const RegionPhotoStrip({
    super.key,
    required this.regions,
    required this.tourCounts,
    required this.photoOf,
    required this.onOpen,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 218,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: regions.length,
        separatorBuilder: (_, _) => const SizedBox(width: 10),
        itemBuilder: (_, i) {
          final r = regions[i];
          final photo = photoOf(r);
          final count = tourCounts[r.id];
          return Pressable(
            onTap: () => onOpen(r),
            child: SizedBox(
              width: 132,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SizedBox(
                    width: 132,
                    height: 168,
                    child: Photo(
                      url: photo.url,
                      width: 132,
                      credit: photo.credit,
                      borderRadius: BorderRadius.circular(16),
                      semanticLabel: r.name,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    r.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppInk.ink),
                  ),
                  if (count != null) Text('$count tour', style: const TextStyle(fontSize: 12, color: AppInk.muted)),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

/// Hàng tour dạng danh sách: ảnh vuông, vùng · thời lượng, tên, số trạm, giá.
class TourRow extends StatelessWidget {
  final TourModel tour;
  final VoidCallback onTap;
  final bool divider;

  const TourRow({super.key, required this.tour, required this.onTap, this.divider = true});

  @override
  Widget build(BuildContext context) {
    final stops = tour.destinationCount;
    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          border: divider ? const Border(bottom: BorderSide(color: AppInk.line)) : null,
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(
              width: 96,
              height: 96,
              child: Photo(url: tour.coverImageUrl, width: 96, borderRadius: BorderRadius.circular(14)),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: SizedBox(
                height: 96,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      tourMeta(tour),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 12, color: AppInk.muted),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      tour.title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 15,
                        height: 1.3,
                        fontWeight: FontWeight.w700,
                        color: AppInk.ink,
                      ),
                    ),
                    if (stops > 0) ...[
                      const SizedBox(height: 2),
                      Text('$stops trạm', style: const TextStyle(fontSize: 12, color: AppInk.muted)),
                    ],
                    const Spacer(),
                    _PriceText(tour: tour),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
