import 'dart:async';

import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/models/tour_journey_model.dart';
import '../../../core/models/tour_model.dart';
import '../../../l10n/locale_controller.dart';
import 'package:intl/intl.dart' show DateFormat;
import '../../common/heritage_motion.dart' show Pressable;
import '../../common/ink.dart';
import '../../common/photo.dart';
import '../../tours/tour_cards.dart' show TourCard;
import '../../tours/tour_style.dart' show TourPlaceholder, TourStyle;

// Các khối của trang chủ: nền giấy sáng, ảnh chụp thật làm chủ đạo, chữ đậm, một màu nhấn xanh ngọc.
// Thiếu ảnh thì dùng ảnh giữ chỗ theo loại hình tour (gradient + icon), không để ô xám trống.

/// Ảnh kèm ghi nguồn (ghi nguồn chỉ có khi ảnh do Admin gắn từ nguồn ngoài).
typedef PhotoRef = ({String? url, String? credit});

/// "T7, 14/11" (tiếng Việt); ngôn ngữ khác dùng định dạng chuẩn của intl ("Sat, Nov 14", "11月14日(土)").
String shortDate(DateTime d, [String languageCode = 'vi']) {
  if (languageCode != 'vi') return DateFormat.MMMEd(languageCode).format(d);
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
                foregroundColor: AppInk.accent,
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                // Không ép hàng tiêu đề cao 48dp — vùng chạm vẫn đủ nhờ padding
                minimumSize: const Size(0, 36),
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(actionLabel!),
                  const SizedBox(width: 2),
                  const Icon(Icons.chevron_right_rounded, size: 20),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

/// Một nút danh mục của hàng lọc nhanh: [colors] là gradient tô ô icon (icon trắng trên nền màu).
typedef HomeCategory = ({IconData icon, String label, List<Color> colors, VoidCallback onTap});

/// Màu ô danh mục — tươi, mỗi ô một màu (chỉ tô nền, chữ nhãn luôn màu xanh than).
abstract final class HomeCategoryColors {
  static const teal = [Color(0xFF2DD4BF), Color(0xFF0EA5A4)];
  static const blue = [Color(0xFF60A5FA), Color(0xFF2563EB)];
  static const orange = [Color(0xFFFDBA74), Color(0xFFF97316)];
  static const violet = [Color(0xFFC4B5FD), Color(0xFF8B5CF6)];
}

/// Hàng danh mục trong một thẻ trắng nổi: 4 ô màu đặc chia đều bề ngang, icon trắng + nhãn ngắn.
/// Nhãn luôn 1 dòng: nếu cỡ chữ hệ thống quá lớn thì chữ tự thu nhỏ vừa ô thay vì xuống dòng.
class HomeCategoryRow extends StatelessWidget {
  final List<HomeCategory> items;

  const HomeCategoryRow({super.key, required this.items});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(6, 14, 6, 10),
      decoration: BoxDecoration(
        color: AppInk.surface,
        borderRadius: BorderRadius.circular(22),
        boxShadow: const [BoxShadow(color: Color(0x1A0F172A), blurRadius: 24, offset: Offset(0, 10))],
      ),
      child: Row(
        children: [for (final c in items) Expanded(child: _item(c))],
      ),
    );
  }

  Widget _item(HomeCategory c) {
    return Semantics(
      button: true,
      label: c.label,
      child: Pressable(
        onTap: c.onTap,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(16),
                gradient: LinearGradient(colors: c.colors, begin: Alignment.topLeft, end: Alignment.bottomRight),
                boxShadow: [BoxShadow(color: c.colors.last.withValues(alpha: 0.30), blurRadius: 10, offset: const Offset(0, 4))],
              ),
              child: Icon(c.icon, size: 26, color: Colors.white),
            ),
            const SizedBox(height: 7),
            FittedBox(
              fit: BoxFit.scaleDown,
              child: Text(
                c.label,
                maxLines: 1,
                softWrap: false,
                style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: AppInk.ink),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Một ảnh banner đầu trang chủ: ảnh đóng gói sẵn trong app + tên địa danh.
typedef HeroSlide = ({String asset, String place});

/// Ảnh banner có sẵn (không phụ thuộc dữ liệu tour ⇒ chưa có tour nào vẫn có ảnh).
/// Nguồn: Wikimedia Commons, bản thu nhỏ 1280px, giống ảnh banner bản web (frontend/public/image/CREDITS.md):
/// - hero_mucangchai.jpg — Ruộng bậc thang Chế Cu Nha, Mù Cang Chải · Doan Tuan · CC0
/// - hero_hoian.jpg — Chùa Cầu, Hội An · Alexkom000 · CC BY 4.0
/// - hero_muine.jpg — Thuyền đánh cá, Mũi Né · Trevor Mills · CC BY 2.0
List<HeroSlide> homeHeroSlides(AppLocalizations l10n) => [
  (asset: 'assets/images/hero_mucangchai.jpg', place: l10n.heroPlaceMuCangChai),
  (asset: 'assets/images/hero_hoian.jpg', place: l10n.heroPlaceHoiAn),
  (asset: 'assets/images/hero_muine.jpg', place: l10n.heroPlaceMuiNe),
];

/// Banner đầu trang chủ: ảnh phong cảnh có sẵn trượt ngang (tự chuyển mỗi 5 giây), lớp phủ tối,
/// lời chào lớn + tên địa danh của ảnh đang hiện.
/// [bottomInset]: chừa khoảng dưới cùng (thẻ danh mục đè lên mép banner).
class HomeHeroBanner extends StatefulWidget {
  final List<HeroSlide> slides;
  final String greeting;
  final String headline;
  final String? area;
  final Widget? trailing;
  final double bottomInset;

  const HomeHeroBanner({
    super.key,
    required this.slides,
    required this.greeting,
    required this.headline,
    this.area,
    this.trailing,
    this.bottomInset = 0,
  });

  @override
  State<HomeHeroBanner> createState() => _HomeHeroBannerState();
}

class _HomeHeroBannerState extends State<HomeHeroBanner> {
  final PageController _page = PageController();
  Timer? _timer;
  int _index = 0;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 5), (_) => _next());
  }

  void _next() {
    final n = widget.slides.length;
    if (n < 2 || !_page.hasClients || !mounted) return;
    if (MediaQuery.of(context).disableAnimations) return;
    _page.animateToPage((_index + 1) % n, duration: const Duration(milliseconds: 600), curve: Curves.easeOutCubic);
  }

  @override
  void didUpdateWidget(covariant HomeHeroBanner old) {
    super.didUpdateWidget(old);
    if (_index >= widget.slides.length && widget.slides.isNotEmpty) {
      _index = 0;
      if (_page.hasClients) _page.jumpToPage(0);
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    _page.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final slides = widget.slides;
    final current = slides.isEmpty ? null : slides[_index.clamp(0, slides.length - 1)];
    return Stack(
      fit: StackFit.expand,
      children: [
        Positioned.fill(
          bottom: widget.bottomInset,
          child: Stack(
            fit: StackFit.expand,
            children: [
              if (slides.isEmpty)
                const DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: AppCultureColors.brandGradient,
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                  ),
                )
              else
                PageView.builder(
                  controller: _page,
                  itemCount: slides.length,
                  onPageChanged: (i) => setState(() => _index = i),
                  itemBuilder: (_, i) => Image.asset(
                    slides[i].asset,
                    fit: BoxFit.cover,
                    errorBuilder: (_, _, _) => const DecoratedBox(
                      decoration: BoxDecoration(gradient: LinearGradient(colors: AppCultureColors.brandGradient)),
                    ),
                  ),
                ),
              // Phủ tối trên (để ô tìm kiếm / giờ hệ thống rõ) và dưới (để chữ trắng đạt tương phản)
              const IgnorePointer(
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [Color(0x66000000), Color(0x00000000), Color(0x14000000), Color(0xB3000000)],
                      stops: [0.0, 0.3, 0.55, 1.0],
                    ),
                  ),
                ),
              ),
              Positioned(
                left: 20,
                right: 20,
                bottom: 20 + (widget.bottomInset > 0 ? 34 : 0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            widget.greeting,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w600),
                          ),
                        ),
                        ?widget.trailing,
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      widget.headline,
                      maxLines: 2,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 26,
                        height: 1.2,
                        fontWeight: FontWeight.w800,
                        letterSpacing: -0.4,
                        shadows: [Shadow(color: Color(0x66000000), blurRadius: 12)],
                      ),
                    ),
                    if (current != null) ...[
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          // Tên địa danh của ảnh đang hiện
                          const Icon(Icons.place_rounded, size: 14, color: Colors.white),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              current.place,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(color: Colors.white, fontSize: 12.5, fontWeight: FontWeight.w600),
                            ),
                          ),
                          if (slides.length > 1) ...[
                            const SizedBox(width: 12),
                            for (var i = 0; i < slides.length; i++)
                              AnimatedContainer(
                                duration: const Duration(milliseconds: 250),
                                margin: const EdgeInsets.only(left: 4),
                                width: i == _index ? 16 : 6,
                                height: 6,
                                decoration: BoxDecoration(
                                  color: i == _index ? Colors.white : Colors.white.withValues(alpha: 0.5),
                                  borderRadius: BorderRadius.circular(3),
                                ),
                              ),
                          ],
                        ],
                      ),
                    ] else if (widget.area != null) ...[
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          const Icon(Icons.near_me_rounded, size: 14, color: Colors.white),
                          const SizedBox(width: 4),
                          Text(widget.area!, style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600)),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

/// Dải "Tour nổi bật": thẻ dọc (ảnh lớn trên, tên, vùng, giá) kéo ngang.
class HomeFeaturedStrip extends StatelessWidget {
  final List<TourModel> tours;
  final ValueChanged<TourModel> onOpen;

  const HomeFeaturedStrip({super.key, required this.tours, required this.onOpen});

  @override
  Widget build(BuildContext context) {
    final scale = MediaQuery.textScalerOf(context).scale(1).clamp(1.0, 1.4);
    return SizedBox(
      height: 268 * scale,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.fromLTRB(16, 2, 16, 14),
        clipBehavior: Clip.none,
        itemCount: tours.length,
        separatorBuilder: (_, _) => const SizedBox(width: 12),
        itemBuilder: (_, i) => TourCard(tour: tours[i], onTap: () => onOpen(tours[i]), width: 210),
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

  /// Tiếng Việt dùng dấu phẩy thập phân ("1,5 km"), tiếng Anh/Nhật dùng dấu chấm ("1.5 km").
  static String _formatDistance(double m, String languageCode) {
    if (m < 1000) return '${m.round()} m';
    final km = (m / 1000).toStringAsFixed(m >= 10000 ? 0 : 1);
    return '${languageCode == 'vi' ? km.replaceAll('.', ',') : km} km';
  }

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
    final l10n = context.l10n;
    final lang = Localizations.localeOf(context).languageCode;
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
                        l10n.homeJourneyOngoing(position, total),
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
                        next?.checkedIn == true ? l10n.homeJourneyAtStop : l10n.homeJourneyNextStop,
                        style: const TextStyle(fontSize: 12, color: AppInk.muted),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        next == null
                            ? l10n.homeJourneyAllDone
                            : next.checkedIn
                            ? l10n.homeJourneyCheckedIn(next.name)
                            : distance != null
                            ? l10n.homeJourneyDistance(next.name, _formatDistance(distance!, lang))
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
                    backgroundColor: AppInk.accent,
                    minimumSize: const Size(0, 44),
                    padding: const EdgeInsets.symmetric(horizontal: 18),
                    shape: const StadiumBorder(),
                  ),
                  child: Text(l10n.homeJourneyContinue, style: const TextStyle(fontWeight: FontWeight.w700)),
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
                                text: l10n.homeJourneyMissions(missionCount),
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

class _PriceText extends StatelessWidget {
  final TourModel tour;

  const _PriceText({required this.tour});

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    if (tour.price <= 0) {
      return Text(
        l10n.tourPriceFree,
        maxLines: 1,
        softWrap: false,
        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: AppInk.accent),
      );
    }
    return Text.rich(
      TextSpan(
        children: [
          if (l10n.tourPriceFromPrefix.isNotEmpty)
            TextSpan(text: l10n.tourPriceFromPrefix, style: const TextStyle(color: AppInk.muted)),
          TextSpan(
            text: tour.formattedPrice,
            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: AppCultureColors.price),
          ),
          if (l10n.tourPriceFromSuffix.isNotEmpty)
            TextSpan(text: l10n.tourPriceFromSuffix, style: const TextStyle(color: AppInk.muted)),
        ],
      ),
      maxLines: 1,
      softWrap: false,
      style: const TextStyle(fontSize: 14, color: AppInk.ink),
    );
  }
}

/// Thẻ tour nằm ngang toàn bề rộng: ảnh vuông bên trái, chữ bên phải (~230dp cho tên tour).
/// - Tên tour: tối đa 2 dòng (là câu mô tả dài).
/// - Mọi dòng khác (vùng · thời lượng, ngày, giá) luôn 1 dòng; nếu quá dài thì thu nhỏ vừa chỗ thay vì cắt.
/// - [showDate]: hiện ngày khởi hành gần nhất (khối "Khởi hành sắp tới").
class TourRow extends StatelessWidget {
  final TourModel tour;
  final VoidCallback onTap;
  final bool showDate;

  const TourRow({super.key, required this.tour, required this.onTap, this.showDate = false});

  static const double _photo = 88;

  @override
  Widget build(BuildContext context) {
    final date = showDate ? tour.nextDepartureDate : null;
    final stops = tour.destinationCount;
    return Pressable(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: AppInk.surface,
          borderRadius: BorderRadius.circular(18),
          boxShadow: AppCultureColors.softShadow,
        ),
        // Cao tối thiểu bằng ảnh; chữ to (cỡ chữ hệ thống lớn) thì thẻ tự cao thêm thay vì tràn
        child: IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SizedBox(
                width: _photo,
                height: _photo,
                child: Photo(
                  url: tour.coverImageUrl,
                  width: _photo.round(),
                  borderRadius: BorderRadius.circular(14),
                  placeholder: TourPlaceholder(style: TourStyle.of(tour.tourType), iconSize: 52),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(minHeight: _photo),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _OneLine(
                        Text(
                          [tourMeta(tour), if (!showDate && stops > 0) context.l10n.tourStopCount(stops)].join(' · '),
                          maxLines: 1,
                          softWrap: false,
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: AppInk.muted),
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        tour.title,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 15, height: 1.3, fontWeight: FontWeight.w700, color: AppInk.ink),
                      ),
                      const Spacer(),
                      const SizedBox(height: 6),
                      _OneLine(
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            if (date != null) ...[
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                                decoration: BoxDecoration(
                                  color: AppTone.coral.tint,
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    const Icon(Icons.event_rounded, size: 13, color: AppCultureColors.coralDark),
                                    const SizedBox(width: 4),
                                    Text(
                                      shortDate(date, Localizations.localeOf(context).languageCode),
                                      softWrap: false,
                                      style: const TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w700,
                                        color: AppCultureColors.coralDark,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 8),
                            ],
                            _PriceText(tour: tour),
                          ],
                        ),
                      ),
                    ],
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

/// Giữ nội dung trên đúng 1 dòng: vừa thì để nguyên, quá dài thì thu nhỏ vừa bề ngang (không cắt, không xuống dòng).
class _OneLine extends StatelessWidget {
  final Widget child;
  const _OneLine(this.child);

  @override
  Widget build(BuildContext context) {
    return FittedBox(fit: BoxFit.scaleDown, alignment: Alignment.centerLeft, child: child);
  }
}

/// Danh sách thẻ tour dọc (dùng cho "Khởi hành sắp tới", "Tour trong ngày", "Tour nhiều ngày").
class TourRowList extends StatelessWidget {
  final List<TourModel> tours;
  final ValueChanged<TourModel> onOpen;
  final bool showDate;

  const TourRowList({super.key, required this.tours, required this.onOpen, this.showDate = false});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        children: [
          for (var i = 0; i < tours.length; i++) ...[
            if (i > 0) const SizedBox(height: 10),
            TourRow(tour: tours[i], showDate: showDate, onTap: () => onOpen(tours[i])),
          ],
        ],
      ),
    );
  }
}

/// Một mục của [CatalogChipWrap] (chủ đề / vùng miền).
typedef CatalogChip = ({String label, String? trailing, PhotoRef photo, VoidCallback onTap});

/// Chip có ảnh tròn nhỏ + tên đầy đủ trên 1 dòng; bề rộng co theo độ dài tên, tự xếp sang hàng mới.
/// Không chip nào bị cắt ở mép màn hình, chữ trong chip không bao giờ xuống dòng.
///
/// Đo trước bề rộng từng chip (TextPainter) để chỉ hiện số chip vừa đúng [maxRows] hàng; phần còn lại
/// gom vào chip "+N [moreLabel]" mở bảng xem đủ ⇒ khối luôn cao cố định, không đẩy các khối khác xuống.
class CatalogChipWrap extends StatelessWidget {
  final List<CatalogChip> items;
  final int maxRows;
  final String moreLabel;
  final String sheetTitle;

  const CatalogChipWrap({
    super.key,
    required this.items,
    required this.sheetTitle,
    this.moreLabel = 'khác',
    this.maxRows = 2,
  });

  static const double _height = 40;
  static const double _avatar = 30;
  static const double _spacing = 8;
  static const _labelStyle = TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: AppInk.ink);
  static const _trailingStyle = TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppInk.muted);

  double _textWidth(BuildContext context, String text, TextStyle style) {
    final tp = TextPainter(
      text: TextSpan(text: text, style: style.copyWith(fontFamily: AppType.sans)),
      maxLines: 1,
      textDirection: TextDirection.ltr,
      textScaler: MediaQuery.textScalerOf(context),
    )..layout();
    return tp.width;
  }

  /// Bề rộng 1 chip: viền 1 + đệm trái 5 + ảnh + 8 + tên (+ 6 + phụ) + đệm phải 14 + viền 1.
  double _chipWidth(BuildContext context, CatalogChip c) {
    var w = 1 + 5 + _avatar + 8 + _textWidth(context, c.label, _labelStyle) + 14 + 1;
    if (c.trailing != null) w += 6 + _textWidth(context, c.trailing!, _trailingStyle);
    return w.ceilToDouble() + 1;
  }

  double _moreWidth(BuildContext context, int n) =>
      (1 + 14 + _textWidth(context, '+$n $moreLabel', _labelStyle) + 4 + 16 + 12 + 1).ceilToDouble() + 1;

  /// Số hàng khi xếp lần lượt các bề rộng [widths] trong [maxWidth] (giống cách Wrap xếp).
  static int _rows(List<double> widths, double maxWidth) {
    var rows = 0;
    var x = 0.0;
    for (final raw in widths) {
      final w = raw > maxWidth ? maxWidth : raw;
      if (rows == 0 || x + _spacing + w > maxWidth) {
        rows++;
        x = w;
      } else {
        x += _spacing + w;
      }
    }
    return rows;
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: LayoutBuilder(
        builder: (context, box) {
          final maxWidth = box.maxWidth;
          final widths = [for (final c in items) _chipWidth(context, c)];
          // Lấy nhiều chip nhất sao cho (các chip + chip "+N" nếu còn dư) vừa maxRows hàng
          var shown = 0;
          for (var k = items.length; k >= 0; k--) {
            final hidden = items.length - k;
            final row = [...widths.take(k), if (hidden > 0) _moreWidth(context, hidden)];
            if (_rows(row, maxWidth) <= maxRows) {
              shown = k;
              break;
            }
          }
          final hidden = items.length - shown;
          return Wrap(
            spacing: _spacing,
            runSpacing: _spacing,
            children: [
              for (var i = 0; i < shown; i++) _chip(items[i], maxWidth),
              if (hidden > 0) _moreChip(context, hidden),
            ],
          );
        },
      ),
    );
  }

  Widget _chip(CatalogChip c, double maxWidth) {
    return ConstrainedBox(
      constraints: BoxConstraints(maxWidth: maxWidth),
      child: Semantics(
        button: true,
        label: c.label,
        child: Material(
          color: AppInk.surface,
          shape: const StadiumBorder(side: BorderSide(color: AppInk.border)),
          child: InkWell(
            onTap: c.onTap,
            customBorder: const StadiumBorder(),
            child: SizedBox(
              height: _height,
              child: Padding(
                padding: const EdgeInsets.only(left: 5, right: 14),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    SizedBox(
                      width: _avatar,
                      height: _avatar,
                      child: Photo(
                        url: c.photo.url,
                        width: _avatar.round(),
                        borderRadius: BorderRadius.circular(_avatar / 2),
                        placeholder: TourPlaceholder(style: TourStyle.of('CULTURAL'), iconSize: 30),
                      ),
                    ),
                    const SizedBox(width: 8),
                    // Phòng hờ chữ hệ thống quá lớn: thu nhỏ vừa chip chứ không xuống dòng / cắt
                    Flexible(
                      child: FittedBox(
                        fit: BoxFit.scaleDown,
                        alignment: Alignment.centerLeft,
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(c.label, maxLines: 1, softWrap: false, style: _labelStyle),
                            if (c.trailing != null) ...[
                              const SizedBox(width: 6),
                              Text(c.trailing!, maxLines: 1, softWrap: false, style: _trailingStyle),
                            ],
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _moreChip(BuildContext context, int hidden) {
    return Material(
      color: AppInk.accentSoft,
      shape: StadiumBorder(side: BorderSide(color: AppTone.jade.soft)),
      child: InkWell(
        customBorder: const StadiumBorder(),
        onTap: () => _openAll(context),
        child: SizedBox(
          height: _height,
          child: Padding(
            padding: const EdgeInsets.only(left: 14, right: 12),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  '+$hidden $moreLabel',
                  maxLines: 1,
                  softWrap: false,
                  style: _labelStyle.copyWith(color: AppCultureColors.jadeDark),
                ),
                const SizedBox(width: 4),
                const Icon(Icons.expand_more_rounded, size: 16, color: AppCultureColors.jadeDark),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _openAll(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (sheet) => SafeArea(
        child: ConstrainedBox(
          constraints: BoxConstraints(maxHeight: MediaQuery.sizeOf(sheet).height * 0.75),
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 20),
            child: LayoutBuilder(
              builder: (context, box) => Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(sheetTitle, style: AppType.display(size: 18)),
                  const SizedBox(height: 14),
                  Wrap(
                    spacing: _spacing,
                    runSpacing: _spacing,
                    children: [
                      for (final c in items)
                        _chip(
                          (
                            label: c.label,
                            trailing: c.trailing,
                            photo: c.photo,
                            onTap: () {
                              Navigator.of(sheet).pop();
                              c.onTap();
                            },
                          ),
                          box.maxWidth,
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
