import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/models/tour_journey_model.dart';
import '../../journey/journey_widgets.dart';
import '../../common/heritage_motion.dart';

/// Thẻ chính của trang chủ: tiến độ hành trình đang đi, hoặc lời mời bắt đầu khi chưa có.
class JourneyCard extends StatelessWidget {
  final TourJourney? journey;

  /// Khoảng cách (mét) tới trạm tiếp theo; null khi chưa có quyền vị trí hoặc thiếu toạ độ.
  final double? nextDistance;
  final VoidCallback onContinue;
  final VoidCallback onExplore;

  const JourneyCard({
    super.key,
    required this.journey,
    required this.nextDistance,
    required this.onContinue,
    required this.onExplore,
  });

  /// Trạm đầu tiên chưa hoàn thành theo thứ tự lộ trình.
  static JourneyDestination? nextStop(TourJourney journey) {
    for (final d in journey.destinations) {
      if (!d.isDone) return d;
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final j = journey;
    return Pressable(
      onTap: j == null ? onExplore : onContinue,
      child: Container(
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(24),
          gradient: const LinearGradient(
            colors: [AppCultureColors.jadeDark, AppCultureColors.oceanBlue],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          boxShadow: [
            BoxShadow(
              color: AppCultureColors.heritageJade.withValues(alpha: 0.28),
              blurRadius: 22,
              offset: const Offset(0, 10),
            ),
          ],
        ),
        child: Stack(
          children: [
            Positioned(
              right: -46,
              top: -46,
              child: DrumMotif(size: 190, color: Colors.white.withValues(alpha: 0.1)),
            ),
            Padding(
              padding: const EdgeInsets.all(18),
              child: j == null ? _buildEmpty() : _buildActive(j),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActive(TourJourney j) {
    final next = nextStop(j);
    final distance = nextDistance;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            ProgressRing(
              value: j.progress,
              label: '${j.doneCount}/${j.totalDestinations}',
              caption: 'trạm',
              size: 78,
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _eyebrow('Hành trình đang đi'),
                  const SizedBox(height: 4),
                  Text(
                    j.tourName,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 17,
                      fontWeight: FontWeight.w700,
                      height: 1.25,
                    ),
                  ),
                  if (j.pointsEarned > 0) ...[
                    const SizedBox(height: 6),
                    Text(
                      '+${j.pointsEarned} điểm đã nhận',
                      style: TextStyle(color: Colors.white.withValues(alpha: 0.85), fontSize: 12.5),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.14),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: Colors.white.withValues(alpha: 0.18)),
          ),
          child: Row(
            children: [
              Icon(
                next == null ? Icons.flag_rounded : Icons.near_me_rounded,
                color: Colors.white,
                size: 18,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  next == null ? 'Bạn đã qua hết các trạm' : 'Trạm tiếp: ${next.name}',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: Colors.white, fontSize: 13.5, fontWeight: FontWeight.w500),
                ),
              ),
              if (next != null && distance != null) ...[
                const SizedBox(width: 8),
                Text(
                  _formatDistance(distance),
                  style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w700),
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: 14),
        _PulseButton(label: 'Tiếp tục hành trình', onTap: onContinue),
      ],
    );
  }

  Widget _buildEmpty() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _eyebrow('Hành trình của bạn'),
        const SizedBox(height: 6),
        const Text(
          'Bắt đầu hành trình di sản đầu tiên',
          style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w700, height: 1.25),
        ),
        const SizedBox(height: 6),
        Text(
          'Chọn tour, check-in tại di tích để mở thử thách và tích điểm thưởng.',
          style: TextStyle(color: Colors.white.withValues(alpha: 0.85), fontSize: 13, height: 1.4),
        ),
        const SizedBox(height: 16),
        _PulseButton(label: 'Khám phá tour', onTap: onExplore),
      ],
    );
  }

  Widget _eyebrow(String text) => Text(
        text,
        style: TextStyle(
          color: Colors.white.withValues(alpha: 0.8),
          fontSize: 11,
          fontWeight: FontWeight.w600,
          letterSpacing: 0.2,
        ),
      );

  static String _formatDistance(double m) =>
      m < 1000 ? '${m.round()} m' : '${(m / 1000).toStringAsFixed(1)} km';
}

/// Nút trắng nhịp nhẹ để gợi ý bấm.
class _PulseButton extends StatefulWidget {
  final String label;
  final VoidCallback onTap;

  const _PulseButton({required this.label, required this.onTap});

  @override
  State<_PulseButton> createState() => _PulseButtonState();
}

class _PulseButtonState extends State<_PulseButton> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1400),
  );

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (reduceMotion(context)) {
      _c.stop();
    } else if (!_c.isAnimating) {
      _c.repeat(reverse: true);
    }
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _c,
      builder: (_, child) {
        final t = Curves.easeInOut.transform(_c.value);
        return Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            boxShadow: [
              BoxShadow(
                color: Colors.white.withValues(alpha: 0.35 * t),
                blurRadius: 4 + 10 * t,
                spreadRadius: 1 * t,
              ),
            ],
          ),
          child: child,
        );
      },
      child: SizedBox(
        width: double.infinity,
        height: 46,
        child: ElevatedButton(
          onPressed: widget.onTap,
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.white,
            foregroundColor: AppCultureColors.jadeDark,
            elevation: 0,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Flexible(
                child: Text(
                  widget.label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w700),
                ),
              ),
              const SizedBox(width: 6),
              const Icon(Icons.arrow_forward_rounded, size: 18),
            ],
          ),
        ),
      ),
    );
  }
}
