import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/models/tour_detail_model.dart';
import '../../l10n/locale_controller.dart';
import '../common/photo.dart';

/// So sánh ảnh xưa và nay: hai ảnh chồng nhau, kéo (hoặc chạm) vạch dọc để lộ ảnh xưa bên trái.
/// Lần đầu hiện, vạch tự chạy qua lại một nhịp để du khách biết là kéo được.
class ThenNowSlider extends StatefulWidget {
  final ThenNowPair pair;
  final double borderRadius;
  final double? aspectRatio;

  const ThenNowSlider({super.key, required this.pair, this.borderRadius = 16, this.aspectRatio});

  @override
  State<ThenNowSlider> createState() => _ThenNowSliderState();
}

class _ThenNowSliderState extends State<ThenNowSlider> with SingleTickerProviderStateMixin {
  double _split = 0.5;
  bool _touched = false;
  late final AnimationController _hint = AnimationController(vsync: this, duration: const Duration(milliseconds: 1600));

  @override
  void initState() {
    super.initState();
    _hint.addListener(() {
      if (_touched) return;
      // 0.5 → 0.25 → 0.75 → 0.5
      final t = _hint.value;
      final v = t < 0.25
          ? 0.5 - t
          : t < 0.75
              ? 0.25 + (t - 0.25)
              : 0.75 - (t - 0.75);
      setState(() => _split = v);
    });
    Future.delayed(const Duration(milliseconds: 450), () {
      if (mounted && !_touched) _hint.forward();
    });
  }

  @override
  void dispose() {
    _hint.dispose();
    super.dispose();
  }

  void _moveTo(double dx, double width) {
    if (!_touched) {
      _touched = true;
      _hint.stop();
    }
    setState(() => _split = (dx / width).clamp(0.02, 0.98));
  }

  @override
  Widget build(BuildContext context) {
    final pair = widget.pair;
    final slider = LayoutBuilder(
      builder: (context, box) {
        final w = box.maxWidth;
        return Semantics(
          slider: true,
          label: appL10n.scThenNowHint,
          value: '${(_split * 100).round()}%',
          onIncrease: () => setState(() => _split = (_split + 0.1).clamp(0.02, 0.98)),
          onDecrease: () => setState(() => _split = (_split - 0.1).clamp(0.02, 0.98)),
          child: GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTapDown: (d) => _moveTo(d.localPosition.dx, w),
            onHorizontalDragStart: (d) => _moveTo(d.localPosition.dx, w),
            onHorizontalDragUpdate: (d) => _moveTo(d.localPosition.dx, w),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(widget.borderRadius),
              child: Stack(
                fit: StackFit.expand,
                children: [
                  Photo(url: pair.nowImageUrl, width: 480),
                  ClipRect(
                    clipper: _LeftClipper(_split),
                    child: Photo(url: pair.thenImageUrl, width: 480),
                  ),
                  // Vạch chia + tay nắm
                  Positioned(
                    left: w * _split - 1.5,
                    top: 0,
                    bottom: 0,
                    child: Container(width: 3, color: Colors.white),
                  ),
                  Positioned(
                    left: w * _split - 20,
                    top: 0,
                    bottom: 0,
                    child: Center(
                      child: Container(
                        width: 40,
                        height: 40,
                        decoration: const BoxDecoration(
                          color: Colors.white,
                          shape: BoxShape.circle,
                          boxShadow: [BoxShadow(color: Colors.black26, blurRadius: 6)],
                        ),
                        child: const Icon(Icons.compare_arrows_rounded, color: AppCultureColors.textDark),
                      ),
                    ),
                  ),
                  Positioned(left: 10, top: 10, child: _Label(pair.thenLabel ?? appL10n.scThenNowThen)),
                  Positioned(right: 10, top: 10, child: _Label(appL10n.scThenNowNow)),
                  if (!_touched)
                    Positioned(
                      left: 0,
                      right: 0,
                      bottom: 10,
                      child: Center(child: _Label(appL10n.scThenNowHint, small: true)),
                    ),
                ],
              ),
            ),
          ),
        );
      },
    );
    return widget.aspectRatio == null ? slider : AspectRatio(aspectRatio: widget.aspectRatio!, child: slider);
  }
}

class _LeftClipper extends CustomClipper<Rect> {
  final double split;
  const _LeftClipper(this.split);

  @override
  Rect getClip(Size size) => Rect.fromLTWH(0, 0, size.width * split, size.height);

  @override
  bool shouldReclip(_LeftClipper old) => old.split != split;
}

class _Label extends StatelessWidget {
  final String text;
  final bool small;
  const _Label(this.text, {this.small = false});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: small ? 10 : 9, vertical: small ? 5 : 4),
      decoration: BoxDecoration(color: Colors.black.withValues(alpha: 0.55), borderRadius: BorderRadius.circular(999)),
      child: Text(
        text,
        style: TextStyle(color: Colors.white, fontSize: small ? 12 : 13, fontWeight: FontWeight.w800),
      ),
    );
  }
}
