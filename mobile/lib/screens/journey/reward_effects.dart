import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';

/// Hiệu ứng "+điểm" bay lên giữa màn hình rồi mờ dần, kèm vài ngôi sao tỏa ra. Tự gỡ sau khi chạy xong.
void showPointsBurst(
  BuildContext context, {
  required String text,
  IconData icon = Icons.stars_rounded,
}) {
  final overlay = Overlay.maybeOf(context);
  if (overlay == null) return;
  late final OverlayEntry entry;
  entry = OverlayEntry(
    builder: (_) =>
        _PointsBurst(text: text, icon: icon, onDone: () => entry.remove()),
  );
  overlay.insert(entry);
}

class _PointsBurst extends StatefulWidget {
  final String text;
  final IconData icon;
  final VoidCallback onDone;

  const _PointsBurst({
    required this.text,
    required this.icon,
    required this.onDone,
  });

  @override
  State<_PointsBurst> createState() => _PointsBurstState();
}

class _PointsBurstState extends State<_PointsBurst>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1600),
  )..forward().whenComplete(widget.onDone);

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: AnimatedBuilder(
        animation: _c,
        builder: (context, _) {
          final t = _c.value;
          // Bật lên nhanh, giữ một nhịp, rồi bay cao và mờ đi
          final scale = Curves.elasticOut.transform((t / 0.35).clamp(0.0, 1.0));
          final rise = Curves.easeIn.transform(
            ((t - 0.45) / 0.55).clamp(0.0, 1.0),
          );
          final opacity = 1 - ((t - 0.7) / 0.3).clamp(0.0, 1.0);
          return Center(
            child: Transform.translate(
              offset: Offset(0, -160 * rise),
              child: Opacity(
                opacity: opacity,
                child: Stack(
                  alignment: Alignment.center,
                  clipBehavior: Clip.none,
                  children: [
                    for (var i = 0; i < 8; i++) _sparkle(i, t),
                    Transform.scale(
                      scale: scale,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 20,
                          vertical: 12,
                        ),
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [Color(0xFFFBBF24), Color(0xFFF59E0B)],
                          ),
                          borderRadius: BorderRadius.circular(30),
                          boxShadow: [
                            BoxShadow(
                              color: const Color(
                                0xFFF59E0B,
                              ).withValues(alpha: 0.45),
                              blurRadius: 24,
                              offset: const Offset(0, 8),
                            ),
                          ],
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(widget.icon, color: Colors.white, size: 26),
                            const SizedBox(width: 8),
                            Text(
                              widget.text,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 22,
                                fontWeight: FontWeight.w700,
                                decoration: TextDecoration.none,
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
        },
      ),
    );
  }

  Widget _sparkle(int i, double t) {
    final angle = i * math.pi / 4;
    final spread = Curves.easeOut.transform((t / 0.6).clamp(0.0, 1.0)) * 90;
    final fade = 1 - (t / 0.8).clamp(0.0, 1.0);
    return Transform.translate(
      offset: Offset(math.cos(angle) * spread, math.sin(angle) * spread),
      child: Opacity(
        opacity: fade,
        child: Icon(
          Icons.star_rounded,
          size: i.isEven ? 18 : 12,
          color: const Color(0xFFFCD34D),
        ),
      ),
    );
  }
}

/// Màn hình mở khóa huy hiệu toàn màn hình: tia sáng xoay, huy hiệu lật ra, hạt lấp lánh.
/// Ảnh huy hiệu lấy từ trang quản trị (Cloudinary); không có ảnh thì dùng biểu tượng huy chương.
Future<void> showBadgeUnlock(
  BuildContext context, {
  required String badgeName,
  String? badgeIconUrl,
  required String subtitle,
  String buttonLabel = 'Tuyệt vời',
}) {
  return showGeneralDialog<void>(
    context: context,
    barrierDismissible: false,
    barrierLabel: 'Mở khóa huy hiệu',
    barrierColor: const Color(0xE60B1220),
    transitionDuration: const Duration(milliseconds: 250),
    transitionBuilder: (ctx, anim, _, child) =>
        FadeTransition(opacity: anim, child: child),
    pageBuilder: (ctx, _, _) => _BadgeUnlockView(
      badgeName: badgeName,
      badgeIconUrl: badgeIconUrl,
      subtitle: subtitle,
      buttonLabel: buttonLabel,
    ),
  );
}

class _BadgeUnlockView extends StatefulWidget {
  final String badgeName;
  final String? badgeIconUrl;
  final String subtitle;
  final String buttonLabel;

  const _BadgeUnlockView({
    required this.badgeName,
    required this.badgeIconUrl,
    required this.subtitle,
    required this.buttonLabel,
  });

  @override
  State<_BadgeUnlockView> createState() => _BadgeUnlockViewState();
}

class _BadgeUnlockViewState extends State<_BadgeUnlockView>
    with TickerProviderStateMixin {
  late final AnimationController _reveal = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1400),
  )..forward();
  late final AnimationController _spin = AnimationController(
    vsync: this,
    duration: const Duration(seconds: 12),
  )..repeat();

  @override
  void dispose() {
    _reveal.dispose();
    _spin.dispose();
    super.dispose();
  }

  Widget _badgeFace() {
    final url = widget.badgeIconUrl;
    final fallback = Container(
      color: AppCultureColors.rewardBg,
      child: const Icon(
        Icons.workspace_premium_rounded,
        size: 84,
        color: AppCultureColors.gold,
      ),
    );
    return Container(
      width: 168,
      height: 168,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(color: const Color(0xFFFCD34D), width: 5),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFFFBBF24).withValues(alpha: 0.6),
            blurRadius: 40,
            spreadRadius: 4,
          ),
        ],
      ),
      child: ClipOval(
        child: (url != null && url.startsWith('http'))
            ? Image.network(
                url,
                fit: BoxFit.cover,
                errorBuilder: (_, _, _) => fallback,
              )
            : fallback,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: SafeArea(
        child: AnimatedBuilder(
          animation: Listenable.merge([_reveal, _spin]),
          builder: (context, _) {
            final t = _reveal.value;
            final pop = Curves.elasticOut.transform((t / 0.7).clamp(0.0, 1.0));
            // Lật quanh trục dọc: từ mặt sau (xoay 180°) về mặt trước
            final flip =
                (1 - Curves.easeOutBack.transform((t / 0.6).clamp(0.0, 1.0))) *
                math.pi;
            final textIn = Curves.easeOut.transform(
              ((t - 0.45) / 0.55).clamp(0.0, 1.0),
            );
            return Column(
              children: [
                const Spacer(flex: 2),
                Opacity(
                  opacity: textIn,
                  child: const Text(
                    'Mở khóa huy hiệu mới',
                    style: TextStyle(
                      color: Color(0xFFFCD34D),
                      fontSize: 13,
                      letterSpacing: 0.2,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                SizedBox(
                  width: 320,
                  height: 320,
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      Transform.rotate(
                        angle: _spin.value * 2 * math.pi,
                        child: Opacity(
                          opacity: (t * 1.5).clamp(0.0, 1.0),
                          child: CustomPaint(
                            size: const Size(320, 320),
                            painter: _RaysPainter(),
                          ),
                        ),
                      ),
                      for (var i = 0; i < 12; i++) _sparkle(i, t),
                      Transform(
                        alignment: Alignment.center,
                        transform: Matrix4.identity()
                          ..setEntry(3, 2, 0.0015)
                          ..rotateY(flip)
                          ..scaleByDouble(pop, pop, 1, 1),
                        child: _badgeFace(),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                Opacity(
                  opacity: textIn,
                  child: Transform.translate(
                    offset: Offset(0, 20 * (1 - textIn)),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 32),
                      child: Column(
                        children: [
                          Text(
                            widget.badgeName,
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 24,
                              height: 1.25,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const SizedBox(height: 10),
                          Text(
                            widget.subtitle,
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                              color: Colors.white70,
                              fontSize: 14,
                              height: 1.5,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                const Spacer(flex: 3),
                Opacity(
                  opacity: textIn,
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(32, 0, 32, 24),
                    child: FilledButton(
                      onPressed: t < 0.6
                          ? null
                          : () => Navigator.of(context).pop(),
                      style: FilledButton.styleFrom(
                        backgroundColor: const Color(0xFFF59E0B),
                        foregroundColor: Colors.white,
                        disabledBackgroundColor: const Color(0xFFF59E0B),
                        disabledForegroundColor: Colors.white,
                        minimumSize: const Size.fromHeight(54),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(18),
                        ),
                      ),
                      child: Text(
                        widget.buttonLabel,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }

  Widget _sparkle(int i, double t) {
    final angle = i * math.pi / 6 + 0.3;
    final burst = Curves.easeOutCubic.transform(
      ((t - 0.15) / 0.7).clamp(0.0, 1.0),
    );
    final distance = 70 + burst * 80;
    final twinkle = 0.5 + 0.5 * math.sin(_spin.value * 2 * math.pi * 6 + i);
    return Transform.translate(
      offset: Offset(math.cos(angle) * distance, math.sin(angle) * distance),
      child: Opacity(
        opacity: (burst * twinkle).clamp(0.0, 1.0),
        child: Icon(
          Icons.auto_awesome,
          size: i.isEven ? 18 : 12,
          color: const Color(0xFFFDE68A),
        ),
      ),
    );
  }
}

/// Các tia sáng hình quạt tỏa từ tâm sau huy hiệu.
class _RaysPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final center = size.center(Offset.zero);
    final radius = size.width / 2;
    final paint = Paint()
      ..shader = RadialGradient(
        colors: [
          const Color(0xFFFCD34D).withValues(alpha: 0.55),
          const Color(0x00FCD34D),
        ],
      ).createShader(Rect.fromCircle(center: center, radius: radius));
    const rays = 12;
    for (var i = 0; i < rays; i++) {
      final a = i * 2 * math.pi / rays;
      final path = Path()
        ..moveTo(center.dx, center.dy)
        ..lineTo(
          center.dx + radius * math.cos(a - 0.11),
          center.dy + radius * math.sin(a - 0.11),
        )
        ..lineTo(
          center.dx + radius * math.cos(a + 0.11),
          center.dy + radius * math.sin(a + 0.11),
        )
        ..close();
      canvas.drawPath(path, paint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
