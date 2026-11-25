import 'package:flutter/material.dart';
import 'package:flutter/services.dart' show HapticFeedback;
import '../../l10n/locale_controller.dart';

/// "Nóng – lạnh" khi đi tìm checkpoint: càng gần càng "nóng", vòng tròn đổi màu và điện thoại rung mạnh dần.
enum Warmth { cold, cool, warm, hot, arrived }

/// Mức nóng theo khoảng cách (mét) tới tâm checkpoint có bán kính [radius].
Warmth warmthFor(int? distance, int radius) {
  if (distance == null) return Warmth.cold;
  if (distance <= radius) return Warmth.arrived;
  if (distance <= radius * 2 || distance <= radius + 40) return Warmth.hot;
  if (distance <= 250) return Warmth.warm;
  if (distance <= 700) return Warmth.cool;
  return Warmth.cold;
}

extension WarmthStyle on Warmth {
  Color get color => switch (this) {
        Warmth.cold => const Color(0xFF3346A8),
        Warmth.cool => const Color(0xFF0284C7),
        Warmth.warm => const Color(0xFFEA580C),
        Warmth.hot => const Color(0xFFDC2626),
        Warmth.arrived => const Color(0xFF0B7F7E),
      };

  /// Màu chữ đạt tương phản trên nền nhạt.
  Color get ink => switch (this) {
        Warmth.cold => const Color(0xFF26358A),
        Warmth.cool => const Color(0xFF075985),
        Warmth.warm => const Color(0xFFC2410C),
        Warmth.hot => const Color(0xFFB91C1C),
        Warmth.arrived => const Color(0xFF115E59),
      };

  Color get soft => color.withValues(alpha: 0.12);

  IconData get icon => switch (this) {
        Warmth.cold => Icons.ac_unit_rounded,
        Warmth.cool => Icons.thermostat_rounded,
        Warmth.warm => Icons.local_fire_department_outlined,
        Warmth.hot => Icons.local_fire_department_rounded,
        Warmth.arrived => Icons.flag_rounded,
      };

  String get label => switch (this) {
        Warmth.cold => appL10n.hcCold,
        Warmth.cool => appL10n.hcCool,
        Warmth.warm => appL10n.hcWarm,
        Warmth.hot => appL10n.hcHot,
        Warmth.arrived => appL10n.hcArrived,
      };

  /// Rung khi vừa lên mức nóng hơn: càng gần càng mạnh.
  Future<void> buzz() async {
    switch (this) {
      case Warmth.cold:
        return;
      case Warmth.cool:
        await HapticFeedback.selectionClick();
      case Warmth.warm:
        await HapticFeedback.lightImpact();
      case Warmth.hot:
        await HapticFeedback.mediumImpact();
        await Future<void>.delayed(const Duration(milliseconds: 140));
        await HapticFeedback.mediumImpact();
      case Warmth.arrived:
        for (var i = 0; i < 3; i++) {
          await HapticFeedback.heavyImpact();
          await Future<void>.delayed(const Duration(milliseconds: 120));
        }
    }
  }
}

/// Nhãn "nhiệt độ" (icon + chữ) đặt trên bảng dẫn đường.
class WarmthChip extends StatelessWidget {
  final Warmth warmth;
  const WarmthChip({super.key, required this.warmth});

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 300),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(color: warmth.soft, borderRadius: BorderRadius.circular(999)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(warmth.icon, size: 15, color: warmth.ink),
          const SizedBox(width: 5),
          Text(warmth.label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: warmth.ink)),
        ],
      ),
    );
  }
}
