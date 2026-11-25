import 'dart:math' as math;
import 'package:flutter/material.dart';

/// Màu thương hiệu của trợ lý AI (dùng chung cho nút AI, trang Hướng dẫn viên AI).
abstract final class AiPalette {
  static const indigo = Color(0xFF4F46E5);
  static const violet = Color(0xFF7C3AED);
  static const pink = Color(0xFFEC4899);
  static const ink = Color(0xFF1E1B4B);
  static const soft = Color(0xFFEEF2FF);
  static const softer = Color(0xFFF5F3FF);
  static const line = Color(0xFFE0E7FF);

  static const gradient = LinearGradient(
    colors: [indigo, violet, pink],
    stops: [0, 0.55, 1],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
}

/// Linh vật AI "Gô": chú robot tròn dễ thương — nhấp nhô nhẹ, chớp mắt, ăng-ten nhấp nháy và (tuỳ chọn)
/// vòng sáng lan ra định kỳ để du khách dễ để ý. [animated] = false ⇒ đứng yên (dùng trong danh sách tin nhắn).
class AiMascot extends StatefulWidget {
  final double size;
  final bool animated;

  /// Vòng sáng lan ra quanh linh vật (gây chú ý trên trang chủ).
  final bool pulseRing;

  const AiMascot({super.key, this.size = 46, this.animated = true, this.pulseRing = false});

  @override
  State<AiMascot> createState() => _AiMascotState();
}

class _AiMascotState extends State<AiMascot> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 3200));

  @override
  void initState() {
    super.initState();
    if (widget.animated) _c.repeat();
  }

  @override
  void didUpdateWidget(AiMascot old) {
    super.didUpdateWidget(old);
    if (widget.animated && !_c.isAnimating) {
      _c.repeat();
    } else if (!widget.animated && _c.isAnimating) {
      _c.stop();
    }
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final s = widget.size;
    return SizedBox(
      width: s,
      height: s,
      child: AnimatedBuilder(
        animation: _c,
        builder: (context, _) {
          final t = widget.animated ? _c.value : 0.0;
          // Nhấp nhô lên xuống nhẹ (±6% kích thước)
          final bob = math.sin(t * 2 * math.pi * 2) * s * 0.035;
          // Vòng sáng: lan ra trong 45% đầu chu kỳ rồi tắt
          final ring = t < 0.45 ? t / 0.45 : null;
          return Stack(
            clipBehavior: Clip.none,
            alignment: Alignment.center,
            children: [
              if (widget.pulseRing && ring != null)
                Transform.scale(
                  scale: 1 + ring * 0.42,
                  child: Container(
                    width: s,
                    height: s,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: AiPalette.violet.withValues(alpha: (1 - ring) * 0.55),
                        width: 2.5,
                      ),
                    ),
                  ),
                ),
              Container(
                width: s,
                height: s,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: AiPalette.gradient,
                  boxShadow: [
                    BoxShadow(color: AiPalette.violet.withValues(alpha: 0.35), blurRadius: s * 0.32, offset: Offset(0, s * 0.12)),
                  ],
                ),
                child: Transform.translate(
                  offset: Offset(0, bob),
                  child: CustomPaint(painter: _BotFacePainter(t: t)),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

/// Mặt robot: đầu trắng bo tròn, ăng-ten có đèn, hai mắt chớp, má hồng, miệng cười.
class _BotFacePainter extends CustomPainter {
  final double t;
  const _BotFacePainter({required this.t});

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final c = Offset(w / 2, size.height / 2 + w * 0.05);

    // Ăng-ten + đèn (nhấp nháy)
    final antennaTop = Offset(w / 2, c.dy - w * 0.36);
    canvas.drawLine(
      Offset(w / 2, c.dy - w * 0.22),
      antennaTop,
      Paint()
        ..color = Colors.white
        ..strokeWidth = w * 0.045
        ..strokeCap = StrokeCap.round,
    );
    final glow = 0.55 + 0.45 * math.sin(t * 2 * math.pi * 3).abs();
    canvas.drawCircle(antennaTop, w * 0.09, Paint()..color = const Color(0xFFFDE68A).withValues(alpha: glow * 0.45));
    canvas.drawCircle(antennaTop, w * 0.055, Paint()..color = const Color(0xFFFACC15));

    // Tai hai bên
    final ear = Paint()..color = Colors.white.withValues(alpha: 0.9);
    canvas.drawRRect(
      RRect.fromRectAndRadius(Rect.fromCenter(center: Offset(c.dx - w * 0.33, c.dy), width: w * 0.08, height: w * 0.16), Radius.circular(w * 0.04)),
      ear,
    );
    canvas.drawRRect(
      RRect.fromRectAndRadius(Rect.fromCenter(center: Offset(c.dx + w * 0.33, c.dy), width: w * 0.08, height: w * 0.16), Radius.circular(w * 0.04)),
      ear,
    );

    // Đầu
    final head = RRect.fromRectAndRadius(Rect.fromCenter(center: c, width: w * 0.58, height: w * 0.44), Radius.circular(w * 0.16));
    canvas.drawRRect(head, Paint()..color = Colors.white);

    // Màn hình mặt
    final face = RRect.fromRectAndRadius(Rect.fromCenter(center: c, width: w * 0.46, height: w * 0.31), Radius.circular(w * 0.11));
    canvas.drawRRect(face, Paint()..color = const Color(0xFF1E1B4B));

    // Mắt: chớp ở cuối chu kỳ
    final blink = (t > 0.86 && t < 0.91) ? 0.15 : 1.0;
    final eye = Paint()..color = const Color(0xFF67E8F9);
    for (final dx in [-0.1, 0.1]) {
      canvas.drawOval(
        Rect.fromCenter(center: Offset(c.dx + w * dx, c.dy - w * 0.02), width: w * 0.075, height: w * 0.1 * blink),
        eye,
      );
    }

    // Miệng cười
    canvas.drawArc(
      Rect.fromCenter(center: Offset(c.dx, c.dy + w * 0.045), width: w * 0.12, height: w * 0.07),
      0.15 * math.pi,
      0.7 * math.pi,
      false,
      Paint()
        ..color = const Color(0xFF67E8F9)
        ..style = PaintingStyle.stroke
        ..strokeWidth = w * 0.025
        ..strokeCap = StrokeCap.round,
    );

    // Má hồng
    final cheek = Paint()..color = const Color(0xFFF9A8D4).withValues(alpha: 0.85);
    canvas.drawCircle(Offset(c.dx - w * 0.17, c.dy + w * 0.06), w * 0.028, cheek);
    canvas.drawCircle(Offset(c.dx + w * 0.17, c.dy + w * 0.06), w * 0.028, cheek);
  }

  @override
  bool shouldRepaint(_BotFacePainter old) => old.t != t;
}

/// Ba chấm nhảy "đang soạn câu trả lời".
class AiTypingDots extends StatefulWidget {
  final Color color;
  const AiTypingDots({super.key, this.color = AiPalette.violet});

  @override
  State<AiTypingDots> createState() => _AiTypingDotsState();
}

class _AiTypingDotsState extends State<AiTypingDots> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 1100))
    ..repeat();

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _c,
      builder: (context, _) => Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          for (var i = 0; i < 3; i++) ...[
            if (i > 0) const SizedBox(width: 4),
            Transform.translate(
              offset: Offset(0, -3 * math.max(0, math.sin((_c.value - i * 0.15) * 2 * math.pi))),
              child: Container(
                width: 7,
                height: 7,
                decoration: BoxDecoration(
                  color: widget.color.withValues(alpha: 0.5 + 0.5 * math.max(0, math.sin((_c.value - i * 0.15) * 2 * math.pi))),
                  shape: BoxShape.circle,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
