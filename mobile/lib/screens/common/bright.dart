import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';
import 'heritage_motion.dart';

/// Bộ khối dùng chung cho giao diện sáng & sinh động: thay cho các header nền xanh đậm.
/// Nền pastel theo nhóm màu ([AppTone]), chữ màu mực, số liệu/icon màu đậm của nhóm.

/// Thẻ hero sáng: gradient trắng → pastel của nhóm, viền nhạt, bóng mềm, hoạ tiết trống đồng rất nhạt.
class BrightHeroCard extends StatelessWidget {
  final AppTone tone;
  final Widget child;
  final EdgeInsetsGeometry padding;
  final double radius;
  final bool motif;

  const BrightHeroCard({
    super.key,
    required this.child,
    this.tone = AppTone.jade,
    this.padding = const EdgeInsets.fromLTRB(18, 16, 18, 16),
    this.radius = 24,
    this.motif = true,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [AppCultureColors.surface, tone.tint],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          stops: const [0.15, 1],
        ),
        borderRadius: BorderRadius.circular(radius),
        border: Border.all(color: tone.soft),
        boxShadow: [
          BoxShadow(color: tone.strong.withValues(alpha: 0.08), blurRadius: 20, offset: const Offset(0, 8)),
        ],
      ),
      child: Stack(
        children: [
          if (motif)
            Positioned(
              right: -56,
              top: -56,
              child: IgnorePointer(
                child: SlowSpin(child: DrumMotif(size: 190, color: tone.strong.withValues(alpha: 0.07))),
              ),
            ),
          Padding(padding: padding, child: child),
        ],
      ),
    );
  }
}

/// Ô icon tròn nền pastel, icon màu đậm của nhóm.
class IconTile extends StatelessWidget {
  final IconData icon;
  final AppTone tone;
  final double size;

  const IconTile({super.key, required this.icon, this.tone = AppTone.jade, this.size = 36});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(color: tone.soft.withValues(alpha: 0.6), shape: BoxShape.circle),
      child: Icon(icon, size: size * 0.52, color: tone.strong),
    );
  }
}

/// Ô thống kê trắng đặt trong hero: icon nhóm, số lớn (có hiệu ứng đếm nếu [value] là số), nhãn.
class StatTile extends StatelessWidget {
  final IconData icon;
  final AppTone tone;
  final int? value;
  final Widget? valueWidget;
  final String? suffix;
  final String label;
  final bool compact;

  const StatTile({
    super.key,
    required this.icon,
    required this.label,
    this.tone = AppTone.jade,
    this.value,
    this.valueWidget,
    this.suffix,
    this.compact = false,
  });

  @override
  Widget build(BuildContext context) {
    final numStyle = TextStyle(
      fontSize: compact ? 18 : 20,
      fontWeight: FontWeight.w800,
      color: AppCultureColors.textDark,
      height: 1.1,
    );
    final v = valueWidget ??
        Row(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.baseline,
          textBaseline: TextBaseline.alphabetic,
          children: [
            CountUpText(value: value ?? 0, style: numStyle),
            if (suffix != null)
              Text(suffix!, style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: tone.strong)),
          ],
        );
    return Container(
      padding: EdgeInsets.symmetric(horizontal: 10, vertical: compact ? 10 : 12),
      decoration: BoxDecoration(
        color: AppCultureColors.surface.withValues(alpha: 0.92),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: tone.soft.withValues(alpha: 0.7)),
      ),
      child: Column(
        children: [
          IconTile(icon: icon, tone: tone, size: compact ? 28 : 32),
          const SizedBox(height: 6),
          v,
          const SizedBox(height: 3),
          // Nhãn tối đa 2 dòng trong khung cao cố định: không bị cắt "Chờ khởi hà…" và các ô luôn cao bằng nhau
          SizedBox(
            height: 30,
            child: Center(
              child: Text(
                label,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 12, height: 1.2, fontWeight: FontWeight.w500, color: AppCultureColors.textMuted),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Tiêu đề + mô tả trong hero sáng.
class HeroTitle extends StatelessWidget {
  final String title;
  final String? subtitle;
  final Widget? trailing;

  const HeroTitle({super.key, required this.title, this.subtitle, this.trailing});

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontSize: 21,
                  fontWeight: FontWeight.w800,
                  color: AppCultureColors.textDark,
                  letterSpacing: -0.3,
                ),
              ),
              if (subtitle != null) ...[
                const SizedBox(height: 4),
                Text(subtitle!, style: const TextStyle(fontSize: 13, height: 1.4, color: AppCultureColors.textMuted)),
              ],
            ],
          ),
        ),
        ?trailing,
      ],
    );
  }
}
