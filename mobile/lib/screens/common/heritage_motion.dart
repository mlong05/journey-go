import 'dart:math' as math;

import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';

/// Máy đang bật "giảm chuyển động" thì các hiệu ứng đứng yên.
bool reduceMotion(BuildContext context) => MediaQuery.maybeDisableAnimationsOf(context) ?? false;

/// Hiện dần + trượt lên một lần khi khối được dựng; [order] tạo độ trễ nối tiếp giữa các khối.
class Reveal extends StatefulWidget {
  final int order;
  final Widget child;

  const Reveal({super.key, required this.order, required this.child});

  @override
  State<Reveal> createState() => _RevealState();
}

class _RevealState extends State<Reveal> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 520),
  );

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_c.isAnimating || _c.isCompleted) return;
    if (reduceMotion(context)) {
      _c.value = 1;
      return;
    }
    Future.delayed(Duration(milliseconds: 70 * widget.order), () {
      if (mounted) _c.forward();
    });
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final curve = CurvedAnimation(parent: _c, curve: Curves.easeOutCubic);
    return FadeTransition(
      opacity: curve,
      child: SlideTransition(
        position: Tween(begin: const Offset(0, 0.08), end: Offset.zero).animate(curve),
        child: widget.child,
      ),
    );
  }
}

/// Thẻ hơi lún xuống khi chạm, bật lại khi thả.
class Pressable extends StatefulWidget {
  final VoidCallback? onTap;
  final Widget child;

  const Pressable({super.key, required this.onTap, required this.child});

  @override
  State<Pressable> createState() => _PressableState();
}

class _PressableState extends State<Pressable> {
  bool _down = false;

  void _set(bool v) {
    if (_down != v) setState(() => _down = v);
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: widget.onTap,
      onTapDown: (_) => _set(true),
      onTapUp: (_) => _set(false),
      onTapCancel: () => _set(false),
      child: AnimatedScale(
        scale: _down ? 0.97 : 1,
        duration: const Duration(milliseconds: 120),
        curve: Curves.easeOut,
        child: widget.child,
      ),
    );
  }
}

/// Số đếm dần tới [value] (điểm thưởng, huy hiệu).
class CountUpText extends StatelessWidget {
  final int value;
  final TextStyle style;

  const CountUpText({super.key, required this.value, required this.style});

  @override
  Widget build(BuildContext context) {
    if (reduceMotion(context)) return Text('$value', style: style);
    return TweenAnimationBuilder<int>(
      tween: IntTween(begin: 0, end: value),
      duration: const Duration(milliseconds: 1100),
      curve: Curves.easeOutCubic,
      builder: (_, v, _) => Text('$v', style: style),
    );
  }
}

/// Tiêu đề mục thống nhất: chữ thường, nét vừa, nút "Xem tất cả" tuỳ chọn.
class SectionHeader extends StatelessWidget {
  final String title;
  final String? subtitle;
  final IconData? icon;
  final String? actionLabel;
  final VoidCallback? onAction;

  const SectionHeader({
    super.key,
    required this.title,
    this.subtitle,
    this.icon,
    this.actionLabel,
    this.onAction,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: Text(
                        title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w700,
                          color: AppCultureColors.textDark,
                        ),
                      ),
                    ),
                    if (icon != null) ...[
                      const SizedBox(width: 6),
                      Icon(icon, size: 16, color: AppCultureColors.gold),
                    ],
                  ],
                ),
                if (subtitle != null) ...[
                  const SizedBox(height: 2),
                  Text(
                    subtitle!,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 12.5, color: AppCultureColors.textMuted),
                  ),
                ],
              ],
            ),
          ),
          if (actionLabel != null)
            TextButton(
              onPressed: onAction,
              style: TextButton.styleFrom(
                foregroundColor: AppCultureColors.heritageJade,
                padding: const EdgeInsets.symmetric(horizontal: 8),
                minimumSize: const Size(0, 32),
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(actionLabel!, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                  const Icon(Icons.chevron_right_rounded, size: 18),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

/// Hoa văn mặt trống đồng Đông Sơn (ngôi sao giữa, vành tia, vành chấm), vẽ bằng một màu.
class DrumMotif extends StatelessWidget {
  final double size;
  final Color color;

  const DrumMotif({super.key, required this.size, required this.color});

  @override
  Widget build(BuildContext context) {
    return CustomPaint(size: Size.square(size), painter: _DrumPainter(color));
  }
}

class _DrumPainter extends CustomPainter {
  final Color color;

  _DrumPainter(this.color);

  @override
  void paint(Canvas canvas, Size size) {
    final c = size.center(Offset.zero);
    final r = size.shortestSide / 2;
    final line = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = r * 0.012;
    final fill = Paint()..color = color;

    // Các vành đồng tâm
    for (final k in [1.0, 0.92, 0.7, 0.62, 0.42, 0.34]) {
      canvas.drawCircle(c, r * k, line);
    }

    // Ngôi sao 14 cánh ở tâm
    const rays = 14;
    final star = Path();
    for (var i = 0; i < rays * 2; i++) {
      final a = i * math.pi / rays - math.pi / 2;
      final rr = i.isEven ? r * 0.3 : r * 0.1;
      final p = c + Offset(math.cos(a), math.sin(a)) * rr;
      i == 0 ? star.moveTo(p.dx, p.dy) : star.lineTo(p.dx, p.dy);
    }
    canvas.drawPath(star..close(), fill);

    // Vành răng cưa giữa 0.42 và 0.62
    final zig = Path();
    const teeth = 36;
    for (var i = 0; i <= teeth * 2; i++) {
      final a = i * math.pi / teeth;
      final rr = i.isEven ? r * 0.44 : r * 0.6;
      final p = c + Offset(math.cos(a), math.sin(a)) * rr;
      i == 0 ? zig.moveTo(p.dx, p.dy) : zig.lineTo(p.dx, p.dy);
    }
    canvas.drawPath(zig, line);

    // Vành chấm tròn giữa 0.7 và 0.92
    const dots = 40;
    for (var i = 0; i < dots; i++) {
      final a = i * 2 * math.pi / dots;
      canvas.drawCircle(c + Offset(math.cos(a), math.sin(a)) * (r * 0.81), r * 0.022, fill);
    }
  }

  @override
  bool shouldRepaint(_DrumPainter old) => old.color != color;
}

/// Khung xám lấp lánh đúng hình bố cục, hiện trong lúc tải lần đầu.
class HomeSkeleton extends StatefulWidget {
  const HomeSkeleton({super.key});

  @override
  State<HomeSkeleton> createState() => _HomeSkeletonState();
}

class _HomeSkeletonState extends State<HomeSkeleton> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1300),
  );

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!reduceMotion(context) && !_c.isAnimating) _c.repeat();
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  Widget _box(double h, {double? w, double radius = 16}) => Container(
        height: h,
        width: w,
        decoration: BoxDecoration(
          color: AppCultureColors.surfaceSubtle,
          borderRadius: BorderRadius.circular(radius),
        ),
      );

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _c,
      builder: (_, child) => ShaderMask(
        blendMode: BlendMode.srcATop,
        shaderCallback: (rect) {
          final dx = rect.width * (_c.value * 2 - 0.5);
          return LinearGradient(
            colors: [
              Colors.transparent,
              Colors.white.withValues(alpha: 0.7),
              Colors.transparent,
            ],
            stops: const [0.35, 0.5, 0.65],
          ).createShader(Rect.fromLTWH(dx - rect.width / 2, 0, rect.width, rect.height));
        },
        child: child,
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 20, 16, 0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _box(150, radius: 24),
            const SizedBox(height: 28),
            _box(18, w: 170, radius: 6),
            const SizedBox(height: 14),
            Row(
              children: [
                Expanded(child: _box(250, radius: 22)),
                const SizedBox(width: 12),
                SizedBox(width: 40, child: _box(220, radius: 22)),
              ],
            ),
            const SizedBox(height: 28),
            _box(18, w: 130, radius: 6),
            const SizedBox(height: 14),
            _box(170, radius: 22),
          ],
        ),
      ),
    );
  }
}

/// Xoay rất chậm một vòng mỗi [period] (hoa văn trang trí); đứng yên khi giảm chuyển động.
class SlowSpin extends StatefulWidget {
  final Widget child;
  final Duration period;

  const SlowSpin({super.key, required this.child, this.period = const Duration(seconds: 40)});

  @override
  State<SlowSpin> createState() => _SlowSpinState();
}

class _SlowSpinState extends State<SlowSpin> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: widget.period);

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (reduceMotion(context)) {
      _c.stop();
    } else if (!_c.isAnimating) {
      _c.repeat();
    }
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => RotationTransition(turns: _c, child: widget.child);
}

/// Chữ có vệt ánh vàng lướt qua theo chu kỳ, như ánh sáng trên hoành phi sơn son thếp vàng.
class ShimmerText extends StatefulWidget {
  final String text;
  final TextStyle style;
  final Color shine;

  const ShimmerText(this.text, {super.key, required this.style, this.shine = const Color(0xFFFDE68A)});

  @override
  State<ShimmerText> createState() => _ShimmerTextState();
}

class _ShimmerTextState extends State<ShimmerText> with SingleTickerProviderStateMixin {
  // Mỗi chu kỳ 5 giây: vệt sáng lướt trong 1,5 giây đầu rồi nghỉ
  late final AnimationController _c = AnimationController(vsync: this, duration: const Duration(seconds: 5));

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (reduceMotion(context)) {
      _c.stop();
    } else if (!_c.isAnimating) {
      _c.repeat();
    }
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final base = widget.style.color ?? Colors.white;
    return AnimatedBuilder(
      animation: _c,
      builder: (_, child) {
        final t = (_c.value / 0.3).clamp(0.0, 1.0);
        final x = -0.5 + 2 * Curves.easeInOut.transform(t);
        return ShaderMask(
          blendMode: BlendMode.srcIn,
          shaderCallback: (rect) => LinearGradient(
            colors: [base, widget.shine, base],
            stops: [
              (x - 0.18).clamp(0.0, 1.0),
              x.clamp(0.0, 1.0),
              (x + 0.18).clamp(0.0, 1.0),
            ],
          ).createShader(rect),
          child: child,
        );
      },
      child: Text(widget.text, style: widget.style),
    );
  }
}
