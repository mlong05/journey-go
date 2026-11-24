import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/models/tour_journey_model.dart';
import '../../../core/models/tour_model.dart';
import '../../common/heritage_motion.dart' show Pressable;
import '../../common/ink.dart';
import '../../common/photo.dart';
import '../../tours/tour_style.dart' show TourPlaceholder, TourStyle;

// Các khối của trang chủ: nền giấy sáng, ảnh chụp thật làm chủ đạo, chữ đậm, một màu nhấn xanh ngọc.
// Thiếu ảnh thì dùng ảnh giữ chỗ theo loại hình tour (gradient + icon), không để ô xám trống.

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

/// Một nút danh mục của hàng lọc nhanh.
typedef HomeCategory = ({IconData icon, String label, AppTone tone, bool selected, VoidCallback? onTap});

/// Hàng danh mục: 4 nút chia đều bề ngang (không cuộn, không bị cắt ở mép), icon nét mảnh + nhãn ngắn.
/// Nhãn luôn 1 dòng: nếu cỡ chữ hệ thống quá lớn thì chữ tự thu nhỏ vừa ô thay vì xuống dòng.
class HomeCategoryRow extends StatelessWidget {
  final List<HomeCategory> items;

  const HomeCategoryRow({super.key, required this.items});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 4, 12, 0),
      child: Row(
        children: [for (final c in items) Expanded(child: _item(c))],
      ),
    );
  }

  Widget _item(HomeCategory c) {
    return Semantics(
      button: true,
      selected: c.selected,
      label: c.label,
      child: InkWell(
        onTap: c.onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 2, vertical: 6),
          child: Column(
            children: [
              // Ô trắng viền mảnh + icon nét mảnh (Phosphor Light) — tinh gọn, không kiểu hình minh hoạ
              AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                width: 52,
                height: 52,
                decoration: BoxDecoration(
                  color: c.selected ? AppInk.accentSoft : AppInk.surface,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: c.selected ? AppInk.accent : AppInk.border,
                    width: c.selected ? 1.5 : 1,
                  ),
                  boxShadow: c.selected
                      ? null
                      : [BoxShadow(color: AppInk.ink.withValues(alpha: 0.04), blurRadius: 8, offset: const Offset(0, 3))],
                ),
                child: Icon(c.icon, size: 27, color: c.selected ? AppInk.accent : c.tone.strong),
              ),
              const SizedBox(height: 6),
              FittedBox(
                fit: BoxFit.scaleDown,
                child: Text(
                  c.label,
                  maxLines: 1,
                  softWrap: false,
                  style: TextStyle(
                    fontSize: 12.5,
                    fontWeight: c.selected ? FontWeight.w800 : FontWeight.w600,
                    color: c.selected ? AppInk.accent : AppInk.ink,
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
                    backgroundColor: AppInk.accent,
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

class _PriceText extends StatelessWidget {
  final TourModel tour;

  const _PriceText({required this.tour});

  @override
  Widget build(BuildContext context) {
    if (tour.price <= 0) {
      return const Text(
        'Miễn phí',
        maxLines: 1,
        softWrap: false,
        style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: AppInk.accent),
      );
    }
    return Text.rich(
      TextSpan(
        children: [
          const TextSpan(text: 'Từ ', style: TextStyle(color: AppInk.muted)),
          TextSpan(
            text: tour.formattedPrice,
            style: const TextStyle(fontWeight: FontWeight.w800, color: AppInk.accent),
          ),
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
          border: Border.all(color: AppInk.line),
          boxShadow: [BoxShadow(color: AppInk.ink.withValues(alpha: 0.04), blurRadius: 12, offset: const Offset(0, 4))],
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
                          [tourMeta(tour), if (!showDate && stops > 0) '$stops trạm'].join(' · '),
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
                                      shortDate(date),
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
