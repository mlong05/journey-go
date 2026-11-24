import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart' show HapticFeedback;

import '../../core/constants/app_colors.dart';
import '../../core/models/tour_journey_model.dart';
import '../../l10n/locale_controller.dart';

/// "Dấu ấn di sản": mỗi trạm đã check-in được đóng một con dấu (tròn, viền đôi, nghiêng nhẹ như dấu đóng tay).
/// Trạm chưa tới là ô trống viền đứt. Dùng ở màn hành trình (bảng xem nhanh), màn tổng kết và thẻ chia sẻ.

/// Màu mực của con dấu theo thứ tự trạm (xoay vòng).
const List<Color> _stampInks = [
  Color(0xFF0B7F7E), // xanh ngọc
  Color(0xFF4338CA), // chàm
  Color(0xFFC2410C), // cam
  Color(0xFFBE123C), // đỏ hồng
  Color(0xFF0369A1), // xanh trời
  Color(0xFF7E22CE), // tím
];

Color stampInk(int order) => _stampInks[(order - 1).abs() % _stampInks.length];

/// Độ nghiêng cố định theo thứ tự (không đổi mỗi lần vẽ lại) trong khoảng ±9°.
double _tilt(int order) => ((order * 37) % 19 - 9) * math.pi / 180;

String _dd(DateTime d) => '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}/${d.year}';

/// Một con dấu. [stamped] = false ⇒ ô trống chờ đóng dấu.
class HeritageStamp extends StatelessWidget {
  final int order;
  final String name;
  final DateTime? date;
  final bool stamped;
  final double size;

  const HeritageStamp({
    super.key,
    required this.order,
    required this.name,
    required this.stamped,
    this.date,
    this.size = 96,
  });

  @override
  Widget build(BuildContext context) {
    final ink = stampInk(order);
    final label = appL10n.hpStopLabel(order.toString().padLeft(2, '0'));
    if (!stamped) {
      return SizedBox(
        width: size,
        height: size,
        child: CustomPaint(
          painter: _DashedCirclePainter(color: AppCultureColors.decorative),
          child: Center(
            child: Padding(
              padding: EdgeInsets.all(size * 0.16),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.lock_outline_rounded, size: size * 0.2, color: AppCultureColors.textLight),
                  SizedBox(height: size * 0.03),
                  Text(label,
                      style: TextStyle(fontSize: size * 0.1, fontWeight: FontWeight.w800, color: AppCultureColors.textLight)),
                ],
              ),
            ),
          ),
        ),
      );
    }
    return Semantics(
      label: '${appL10n.hpStampSemantics(label, name)}${date == null ? '' : ', ${_dd(date!)}'}',
      child: Transform.rotate(
        angle: _tilt(order),
        child: Container(
          width: size,
          height: size,
          padding: EdgeInsets.all(size * 0.045),
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: ink.withValues(alpha: 0.06),
            border: Border.all(color: ink, width: size * 0.035),
          ),
          child: Container(
            decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: ink.withValues(alpha: 0.7), width: 1.2)),
            padding: EdgeInsets.symmetric(horizontal: size * 0.1),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(label,
                    style: TextStyle(fontSize: size * 0.095, fontWeight: FontWeight.w900, letterSpacing: 1, color: ink)),
                SizedBox(height: size * 0.02),
                Text(
                  name.toUpperCase(),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: size * 0.085, height: 1.15, fontWeight: FontWeight.w800, color: ink),
                ),
                if (date != null) ...[
                  SizedBox(height: size * 0.03),
                  Container(height: 1, width: size * 0.4, color: ink.withValues(alpha: 0.5)),
                  SizedBox(height: size * 0.025),
                  Text(_dd(date!), style: TextStyle(fontSize: size * 0.08, fontWeight: FontWeight.w700, color: ink)),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _DashedCirclePainter extends CustomPainter {
  final Color color;
  _DashedCirclePainter({required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2;
    final r = size.width / 2 - 2;
    final c = Offset(size.width / 2, size.height / 2);
    const dashes = 28;
    for (var i = 0; i < dashes; i++) {
      final start = i * 2 * math.pi / dashes;
      canvas.drawArc(Rect.fromCircle(center: c, radius: r), start, math.pi / dashes, false, paint);
    }
  }

  @override
  bool shouldRepaint(covariant _DashedCirclePainter old) => old.color != color;
}

/// Trang dấu ấn: tiêu đề, số con dấu đã có, lưới con dấu theo thứ tự trạm.
class HeritagePassport extends StatelessWidget {
  final TourJourney journey;
  final double stampSize;
  const HeritagePassport({super.key, required this.journey, this.stampSize = 96});

  @override
  Widget build(BuildContext context) {
    final dests = [...journey.destinations]..sort((a, b) => a.orderIndex.compareTo(b.orderIndex));
    final stamped = dests.where((d) => d.checkedIn).length;
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppCultureColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(color: AppCultureColors.jadeLight, borderRadius: BorderRadius.circular(12)),
                child: const Icon(Icons.menu_book_rounded, color: AppCultureColors.heritageJade, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(appL10n.jsHeritageStamps,
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppCultureColors.textDark)),
                    Text(journey.tourName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 12.5, color: AppCultureColors.textMuted)),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(color: AppCultureColors.surfaceSubtle, borderRadius: BorderRadius.circular(999)),
                child: Text(appL10n.hpStampCount(stamped, dests.length),
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: AppCultureColors.textDark)),
              ),
            ],
          ),
          const SizedBox(height: 18),
          if (dests.isEmpty)
            Text(appL10n.hpNoStops, style: const TextStyle(color: AppCultureColors.textMuted))
          else
            Wrap(
              spacing: 14,
              runSpacing: 16,
              alignment: WrapAlignment.center,
              children: [
                for (final d in dests)
                  SizedBox(
                    width: stampSize + 8,
                    child: Column(
                      children: [
                        HeritageStamp(
                          order: d.orderIndex,
                          name: d.name,
                          date: d.checkedInAt,
                          stamped: d.checkedIn,
                          size: stampSize,
                        ),
                        const SizedBox(height: 6),
                        Text(
                          d.name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 11.5,
                            fontWeight: FontWeight.w700,
                            color: d.checkedIn ? AppCultureColors.textDark : AppCultureColors.textLight,
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
        ],
      ),
    );
  }
}

/// Mở trang dấu ấn dạng bảng trượt từ dưới lên (màn hành trình).
Future<void> showPassportSheet(BuildContext context, TourJourney journey) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: AppCultureColors.background,
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(28))),
    builder: (ctx) => DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.72,
      maxChildSize: 0.95,
      builder: (_, scroll) => ListView(
        controller: scroll,
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 28),
        children: [
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(color: AppCultureColors.decorative, borderRadius: BorderRadius.circular(4)),
            ),
          ),
          const SizedBox(height: 14),
          HeritagePassport(journey: journey),
          const SizedBox(height: 12),
          Text(
            appL10n.hpHint,
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 12.5, color: AppCultureColors.textMuted),
          ),
        ],
      ),
    ),
  );
}

/// Hiệu ứng đóng dấu sau khi check-in trạm: con dấu rơi xuống, chạm thì rung mạnh và lan một vòng mực.
/// Tự đóng sau ~1,6 giây hoặc khi chạm vào màn hình.
Future<void> showStampAnimation(BuildContext context, {required int order, required String name, DateTime? date}) {
  return showGeneralDialog<void>(
    context: context,
    barrierDismissible: true,
    barrierLabel: appL10n.hpStamped,
    barrierColor: Colors.black.withValues(alpha: 0.55),
    transitionDuration: Duration.zero,
    pageBuilder: (_, _, _) => _StampDrop(order: order, name: name, date: date ?? DateTime.now()),
  );
}

class _StampDrop extends StatefulWidget {
  final int order;
  final String name;
  final DateTime date;
  const _StampDrop({required this.order, required this.name, required this.date});

  @override
  State<_StampDrop> createState() => _StampDropState();
}

class _StampDropState extends State<_StampDrop> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 1600));
  bool _thudDone = false;

  @override
  void initState() {
    super.initState();
    _c.addListener(() {
      if (!_thudDone && _c.value >= 0.28) {
        _thudDone = true;
        HapticFeedback.heavyImpact();
      }
    });
    _c.forward().whenComplete(() {
      if (mounted) Navigator.of(context).maybePop();
    });
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final ink = stampInk(widget.order);
    return GestureDetector(
      onTap: () => Navigator.of(context).maybePop(),
      child: Material(
        type: MaterialType.transparency,
        child: Center(
          child: AnimatedBuilder(
            animation: _c,
            builder: (_, _) {
              final drop = Curves.easeInCubic.transform((_c.value / 0.28).clamp(0, 1));
              final scale = 2.6 - 1.6 * drop;
              final ripple = ((_c.value - 0.28) / 0.4).clamp(0.0, 1.0);
              final textIn = ((_c.value - 0.35) / 0.25).clamp(0.0, 1.0);
              return Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  SizedBox(
                    width: 260,
                    height: 260,
                    child: Stack(
                      alignment: Alignment.center,
                      children: [
                        if (ripple > 0)
                          Container(
                            width: 170 + 90 * ripple,
                            height: 170 + 90 * ripple,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              border: Border.all(color: ink.withValues(alpha: 0.5 * (1 - ripple)), width: 3),
                            ),
                          ),
                        Opacity(
                          opacity: drop.clamp(0.0, 1.0),
                          child: Transform.scale(
                            scale: scale,
                            child: DecoratedBox(
                              decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
                              child: HeritageStamp(
                                order: widget.order,
                                name: widget.name,
                                date: widget.date,
                                stamped: true,
                                size: 170,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  Opacity(
                    opacity: textIn,
                    child: Transform.translate(
                      offset: Offset(0, 12 * (1 - textIn)),
                      child: Column(
                        children: [
                          Text(appL10n.hpStampedTitle,
                              style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w800)),
                          SizedBox(height: 4),
                          Text(appL10n.hpUnlocked,
                              style: TextStyle(color: AppCultureColors.onDarkMuted, fontSize: 13.5)),
                        ],
                      ),
                    ),
                  ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}
