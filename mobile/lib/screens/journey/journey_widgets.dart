import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';

/// Vòng tiến độ tròn có số ở giữa, dùng ở đầu màn hành trình.
class ProgressRing extends StatelessWidget {
  final double value;
  final String label;
  final String caption;
  final double size;

  const ProgressRing({
    super.key,
    required this.value,
    required this.label,
    required this.caption,
    this.size = 92,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: Stack(
        alignment: Alignment.center,
        children: [
          SizedBox.expand(
            child: TweenAnimationBuilder<double>(
              tween: Tween(begin: 0, end: value.clamp(0, 1)),
              duration: const Duration(milliseconds: 700),
              curve: Curves.easeOutCubic,
              builder: (_, v, _) => CircularProgressIndicator(
                value: v,
                strokeWidth: 7,
                strokeCap: StrokeCap.round,
                backgroundColor: Colors.white.withValues(alpha: 0.22),
                valueColor: const AlwaysStoppedAnimation(Colors.white),
              ),
            ),
          ),
          Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(label,
                  style: const TextStyle(
                      color: Colors.white, fontSize: 22, fontWeight: FontWeight.w900, height: 1)),
              const SizedBox(height: 2),
              Text(caption, style: const TextStyle(color: Colors.white70, fontSize: 10.5)),
            ],
          ),
        ],
      ),
    );
  }
}

/// Chip nhỏ (điểm, trạng thái, số lượt…).
class InfoChip extends StatelessWidget {
  final IconData icon;
  final String text;
  final Color background;
  final Color foreground;

  const InfoChip({
    super.key,
    required this.icon,
    required this.text,
    this.background = AppCultureColors.surfaceSubtle,
    this.foreground = AppCultureColors.textMuted,
  });

  const InfoChip.onGradient({super.key, required this.icon, required this.text})
      : background = const Color(0x2EFFFFFF),
        foreground = Colors.white;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(color: background, borderRadius: BorderRadius.circular(20)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: foreground),
          const SizedBox(width: 5),
          Text(text,
              style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: foreground)),
        ],
      ),
    );
  }
}

/// Thẻ nền trắng bo góc dùng xuyên suốt.
class SoftCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final Color color;
  final Color borderColor;
  final bool elevated;

  const SoftCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.color = Colors.white,
    this.borderColor = AppCultureColors.border,
    this.elevated = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: padding,
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: borderColor),
        boxShadow: elevated
            ? [
                BoxShadow(
                  color: AppCultureColors.heritageJade.withValues(alpha: 0.14),
                  blurRadius: 18,
                  offset: const Offset(0, 8),
                ),
              ]
            : null,
      ),
      child: child,
    );
  }
}

/// Nút chính của luồng trải nghiệm (cao 52, bo 16, màu ngọc di sản).
class PrimaryButton extends StatelessWidget {
  final String label;
  final IconData? icon;
  final VoidCallback? onPressed;
  final bool loading;

  const PrimaryButton({
    super.key,
    required this.label,
    this.icon,
    required this.onPressed,
    this.loading = false,
  });

  @override
  Widget build(BuildContext context) {
    return FilledButton(
      onPressed: loading ? null : onPressed,
      style: FilledButton.styleFrom(
        backgroundColor: AppCultureColors.heritageJade,
        disabledBackgroundColor: AppCultureColors.heritageJade.withValues(alpha: 0.45),
        foregroundColor: Colors.white,
        disabledForegroundColor: Colors.white,
        minimumSize: const Size.fromHeight(52),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
      child: loading
          ? const SizedBox(
              width: 22,
              height: 22,
              child: CircularProgressIndicator(strokeWidth: 2.4, color: Colors.white),
            )
          : Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                if (icon != null) ...[Icon(icon, size: 20), const SizedBox(width: 8)],
                Text(label, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
              ],
            ),
    );
  }
}

/// Hộp thoại chúc mừng có hiệu ứng phóng to, dùng cho huy hiệu và hoàn thành nhiệm vụ.
Future<void> showRewardDialog(
  BuildContext context, {
  required String title,
  required String subtitle,
  String? badgeName,
  String? badgeIconUrl,
  int? points,
  IconData icon = Icons.workspace_premium_rounded,
  String buttonLabel = 'Tuyệt vời',
}) {
  return showGeneralDialog<void>(
    context: context,
    barrierDismissible: true,
    barrierLabel: 'Đóng',
    barrierColor: Colors.black54,
    transitionDuration: const Duration(milliseconds: 380),
    transitionBuilder: (ctx, anim, _, child) => ScaleTransition(
      scale: CurvedAnimation(parent: anim, curve: Curves.elasticOut),
      child: FadeTransition(opacity: anim, child: child),
    ),
    pageBuilder: (ctx, _, _) => Center(
      child: Material(
        color: Colors.transparent,
        child: Container(
          width: 310,
          padding: const EdgeInsets.fromLTRB(24, 28, 24, 22),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(28),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 104,
                height: 104,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: LinearGradient(
                    colors: [AppCultureColors.rewardBg, Color(0xFFFDE68A)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
                clipBehavior: Clip.antiAlias,
                child: (badgeIconUrl != null && badgeIconUrl.startsWith('http'))
                    ? Image.network(
                        badgeIconUrl,
                        fit: BoxFit.cover,
                        errorBuilder: (_, _, _) =>
                            Icon(icon, size: 54, color: AppCultureColors.gold),
                      )
                    : Icon(icon, size: 54, color: AppCultureColors.gold),
              ),
              const SizedBox(height: 18),
              Text(title,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                      fontSize: 19, fontWeight: FontWeight.w900, color: AppCultureColors.textDark)),
              if (badgeName != null && badgeName.isNotEmpty) ...[
                const SizedBox(height: 6),
                Text(badgeName,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                        color: AppCultureColors.amberDark)),
              ],
              const SizedBox(height: 8),
              Text(subtitle,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                      fontSize: 13, height: 1.45, color: AppCultureColors.textMuted)),
              if (points != null && points > 0) ...[
                const SizedBox(height: 14),
                InfoChip(
                  icon: Icons.stars_rounded,
                  text: '+$points điểm',
                  background: AppCultureColors.rewardBg,
                  foreground: AppCultureColors.rewardText,
                ),
              ],
              const SizedBox(height: 20),
              PrimaryButton(label: buttonLabel, onPressed: () => Navigator.of(ctx).pop()),
            ],
          ),
        ),
      ),
    ),
  );
}
