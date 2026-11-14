import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/constants/app_colors.dart';
import '../../core/services/route_service.dart';
import 'map_kit.dart';

// Dẫn đường tới điểm đến: theo dõi vị trí trên tuyến, bước rẽ kế tiếp, lệch tuyến.

/// Vị trí du khách so với tuyến đường tại một thời điểm.
class RouteProgress {
  /// Chỉ số đoạn tuyến (điểm đầu đoạn) du khách đang ở gần nhất.
  final int segmentIndex;

  /// Điểm trên tuyến gần du khách nhất.
  final LatLng snapped;

  /// Khoảng cách từ du khách tới tuyến (mét), dùng để biết đã đi lệch đường.
  final double offRouteMeters;
  final int remainingMeters;
  final int remainingSeconds;

  /// Bước rẽ kế tiếp; null khi chỉ còn đi thẳng tới đích.
  final int? nextStepIndex;
  final int toNextStepMeters;

  const RouteProgress({
    required this.segmentIndex,
    required this.snapped,
    required this.offRouteMeters,
    required this.remainingMeters,
    required this.remainingSeconds,
    required this.nextStepIndex,
    required this.toNextStepMeters,
  });
}

/// Chiếu vị trí du khách lên tuyến để tính quãng còn lại và bước rẽ kế tiếp.
class RouteTracker {
  final RouteModel route;
  late final List<double> _cumulative; // quãng đường tích luỹ tại từng điểm tuyến
  late final List<double> _stepAt; // vị trí (mét dọc tuyến) của điểm bắt đầu từng bước

  RouteTracker(this.route) {
    final pts = route.points;
    _cumulative = List.filled(pts.length, 0);
    for (var i = 1; i < pts.length; i++) {
      _cumulative[i] = _cumulative[i - 1] + _meters(pts[i - 1], pts[i]);
    }
    // Điểm bắt đầu mỗi bước: điểm tuyến gần nhất, tìm tiến dần để giữ đúng thứ tự
    var from = 0;
    _stepAt = [
      for (final step in route.steps)
        () {
          var best = from;
          var bestD = double.infinity;
          for (var i = from; i < pts.length; i++) {
            final d = _meters(step.start, pts[i]);
            if (d < bestD) {
              bestD = d;
              best = i;
            }
          }
          from = best;
          return _cumulative[best];
        }(),
    ];
  }

  double get totalMeters => _cumulative.isEmpty ? 0 : _cumulative.last;

  RouteProgress update(LatLng user) {
    final pts = route.points;
    var bestSeg = 0;
    var bestT = 0.0;
    var bestD = double.infinity;
    for (var i = 0; i < pts.length - 1; i++) {
      final (t, d) = _project(user, pts[i], pts[i + 1]);
      if (d < bestD) {
        bestD = d;
        bestSeg = i;
        bestT = t;
      }
    }
    final a = pts[bestSeg];
    final b = pts[math.min(bestSeg + 1, pts.length - 1)];
    final snapped = LatLng(a.latitude + (b.latitude - a.latitude) * bestT,
        a.longitude + (b.longitude - a.longitude) * bestT);
    final along = _cumulative[bestSeg] + (_cumulative[math.min(bestSeg + 1, pts.length - 1)] - _cumulative[bestSeg]) * bestT;
    final remaining = math.max(0.0, totalMeters - along);

    // Bước đầu là "Bắt đầu đi từ…", nên tìm từ bước thứ hai
    int? next;
    for (var k = 1; k < _stepAt.length; k++) {
      if (_stepAt[k] > along + 8) {
        next = k;
        break;
      }
    }

    return RouteProgress(
      segmentIndex: bestSeg,
      snapped: snapped,
      offRouteMeters: bestD,
      remainingMeters: remaining.round(),
      remainingSeconds:
          totalMeters == 0 ? 0 : (route.durationSeconds * remaining / totalMeters).round(),
      nextStepIndex: next,
      toNextStepMeters: next == null ? remaining.round() : (_stepAt[next] - along).round(),
    );
  }

  /// Phần tuyến còn phải đi, bắt đầu từ điểm du khách đang đứng trên tuyến.
  List<LatLng> remainingPath(RouteProgress p) =>
      [p.snapped, ...route.points.skip(p.segmentIndex + 1)];

  static double _meters(LatLng a, LatLng b) => const Distance().as(LengthUnit.Meter, a, b);

  /// Chiếu [p] lên đoạn [a]-[b] (toạ độ phẳng cục bộ, đủ chính xác ở vài km): (t 0..1, khoảng cách mét).
  static (double, double) _project(LatLng p, LatLng a, LatLng b) {
    const mPerDegLat = 110540.0;
    final mPerDegLng = 111320.0 * math.cos(p.latitude * math.pi / 180);
    final ax = (a.longitude - p.longitude) * mPerDegLng, ay = (a.latitude - p.latitude) * mPerDegLat;
    final bx = (b.longitude - p.longitude) * mPerDegLng, by = (b.latitude - p.latitude) * mPerDegLat;
    final dx = bx - ax, dy = by - ay;
    final len2 = dx * dx + dy * dy;
    final t = len2 == 0 ? 0.0 : (-(ax * dx + ay * dy) / len2).clamp(0.0, 1.0);
    final x = ax + dx * t, y = ay + dy * t;
    return (t, math.sqrt(x * x + y * y));
  }
}

/// Biểu tượng rẽ theo mã thao tác của Goong; thiếu mã thì đoán từ câu hướng dẫn.
IconData maneuverIcon(String maneuver, String instruction) {
  final m = maneuver.toLowerCase().replaceAll(RegExp(r'[\s_]+'), '-');
  switch (m) {
    case 'left':
    case 'turn-left':
      return Icons.turn_left_rounded;
    case 'right':
    case 'turn-right':
      return Icons.turn_right_rounded;
    case 'slight-left':
    case 'turn-slight-left':
    case 'keep-left':
      return Icons.turn_slight_left_rounded;
    case 'slight-right':
    case 'turn-slight-right':
    case 'keep-right':
      return Icons.turn_slight_right_rounded;
    case 'sharp-left':
    case 'turn-sharp-left':
      return Icons.turn_sharp_left_rounded;
    case 'sharp-right':
    case 'turn-sharp-right':
      return Icons.turn_sharp_right_rounded;
    case 'uturn':
    case 'uturn-left':
    case 'u-turn':
      return Icons.u_turn_left_rounded;
    case 'uturn-right':
      return Icons.u_turn_right_rounded;
    case 'fork-left':
      return Icons.fork_left_rounded;
    case 'fork-right':
      return Icons.fork_right_rounded;
    case 'merge':
      return Icons.merge_rounded;
    case 'ramp-left':
      return Icons.ramp_left_rounded;
    case 'ramp-right':
      return Icons.ramp_right_rounded;
    case 'straight':
      return Icons.straight_rounded;
  }
  if (m.contains('roundabout')) return Icons.roundabout_right_rounded;

  final text = instruction.toLowerCase();
  if (text.contains('vòng xuyến') || text.contains('bùng binh')) return Icons.roundabout_right_rounded;
  if (text.contains('quay đầu') || text.contains('quay lại')) return Icons.u_turn_left_rounded;
  if (text.contains('đã đến') || text.contains('điểm đích')) return Icons.flag_rounded;
  if (text.contains('chếch trái') || text.contains('hướng sang trái')) return Icons.turn_slight_left_rounded;
  if (text.contains('chếch phải') || text.contains('hướng sang phải')) return Icons.turn_slight_right_rounded;
  if (text.contains('trái')) return Icons.turn_left_rounded;
  if (text.contains('phải')) return Icons.turn_right_rounded;
  return Icons.straight_rounded;
}

String formatDuration(int seconds) {
  final minutes = (seconds / 60).ceil();
  if (minutes < 60) return '$minutes phút';
  final h = minutes ~/ 60, m = minutes % 60;
  return m == 0 ? '$h giờ' : '$h giờ $m phút';
}

String _arrivalClock(int seconds) {
  final t = DateTime.now().add(Duration(seconds: seconds));
  return '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';
}

/// Mở Google Maps dẫn đường bằng giọng nói tới [to].
Future<void> openExternalNavigation(LatLng to, RouteVehicle vehicle) {
  final mode = switch (vehicle) {
    RouteVehicle.walk => 'walking',
    RouteVehicle.bike => 'two-wheeler',
    RouteVehicle.car => 'driving',
  };
  return launchUrl(
    Uri.parse('https://www.google.com/maps/dir/?api=1'
        '&destination=${to.latitude},${to.longitude}&travelmode=$mode&dir_action=navigate'),
    mode: LaunchMode.externalApplication,
  );
}

/// Thẻ hướng dẫn trên cùng khi đang dẫn đường: nền giấy, mũi tên rẽ lớn, "Sau 120 m" chữ có chân, bước sau đó.
class NavigationBanner extends StatelessWidget {
  final RouteModel route;
  final RouteProgress? progress;
  final String destinationName;
  final bool arrived;
  final bool rerouting;

  const NavigationBanner({
    super.key,
    required this.route,
    required this.progress,
    required this.destinationName,
    required this.arrived,
    required this.rerouting,
  });

  @override
  Widget build(BuildContext context) {
    final p = progress;
    final nextIndex = p?.nextStepIndex;
    final step = nextIndex == null ? null : route.steps[nextIndex];
    final after = nextIndex != null && nextIndex + 1 < route.steps.length ? route.steps[nextIndex + 1] : null;

    final IconData icon;
    final String headline;
    final String detail;
    if (arrived) {
      icon = Icons.flag_rounded;
      headline = 'Bạn đã đến nơi';
      detail = destinationName;
    } else if (rerouting) {
      icon = Icons.alt_route_rounded;
      headline = 'Đang tìm lại đường…';
      detail = 'Bạn đã đi khác tuyến gợi ý';
    } else if (step == null) {
      icon = Icons.straight_rounded;
      headline = p == null ? 'Bắt đầu đi' : 'Đi tiếp ${formatDistance(p.toNextStepMeters)}';
      detail = 'Tới $destinationName';
    } else {
      icon = maneuverIcon(step.maneuver, step.instruction);
      headline = 'Sau ${formatDistance(p!.toNextStepMeters)}';
      detail = step.instruction;
    }
    final Color tone = arrived ? AppCultureColors.heritageJade : AppCultureColors.textDark;

    return Material(
      color: Colors.transparent,
      child: Container(
        decoration: BoxDecoration(
          color: AppCultureColors.surface,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppCultureColors.border),
          boxShadow: const [BoxShadow(color: Color(0x331E1A14), blurRadius: 18, offset: Offset(0, 6))],
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 12, 16, 12),
              child: Row(
                children: [
                  AnimatedSwitcher(
                    duration: const Duration(milliseconds: 280),
                    transitionBuilder: (child, a) => ScaleTransition(scale: a, child: child),
                    child: Container(
                      key: ValueKey(icon),
                      width: 58,
                      height: 58,
                      decoration: BoxDecoration(
                        color: arrived ? AppCultureColors.heritageJade : AppCultureColors.jadeDark,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Icon(icon, color: Colors.white, size: 38),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          headline,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: AppType.display(size: 22, color: tone, height: 1.2),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          detail,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(color: AppCultureColors.textMuted, fontSize: 14, height: 1.3),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            if (after != null && !arrived && !rerouting)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                color: AppCultureColors.surfaceSubtle,
                child: Row(
                  children: [
                    const Text('Sau đó', style: TextStyle(color: AppCultureColors.textMuted, fontSize: 12.5)),
                    const SizedBox(width: 8),
                    Icon(maneuverIcon(after.maneuver, after.instruction), color: AppCultureColors.jadeDark, size: 18),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        after.instruction,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(color: AppCultureColors.textDark, fontSize: 12.5),
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}

/// Thông báo mốc khi đến gần trạm ("Còn 500 m", "Chuẩn bị check-in"), hiện vài giây dưới thẻ rẽ.
class NavigationMilestone extends StatelessWidget {
  final IconData icon;
  final String text;
  const NavigationMilestone({super.key, required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    return TweenAnimationBuilder<double>(
      key: ValueKey(text),
      tween: Tween(begin: 0, end: 1),
      duration: const Duration(milliseconds: 380),
      curve: Curves.easeOutBack,
      builder: (_, t, child) => Transform.translate(
        offset: Offset(0, -12 * (1 - t)),
        child: Opacity(opacity: t.clamp(0, 1), child: child),
      ),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: AppCultureColors.textDark,
          borderRadius: BorderRadius.circular(24),
          boxShadow: const [BoxShadow(color: Color(0x331E1A14), blurRadius: 12, offset: Offset(0, 4))],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 18, color: const Color(0xFFF1DFB4)),
            const SizedBox(width: 8),
            Flexible(
              child: Text(
                text,
                style: const TextStyle(color: Colors.white, fontSize: 13.5, fontWeight: FontWeight.w600),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

IconData vehicleIcon(RouteVehicle v) => switch (v) {
      RouteVehicle.walk => Icons.directions_walk_rounded,
      RouteVehicle.bike => Icons.two_wheeler_rounded,
      RouteVehicle.car => Icons.directions_car_rounded,
    };

/// Bảng dưới cùng: "Đường tới Trạm N" (ảnh trạm, thời gian, quãng đường), thanh hành trình có biểu tượng
/// phương tiện chạy tới lá cờ đích, lời giới thiệu trạm "Trên đường đi", và thẻ "Bạn đã đến" khi tới nơi.
class NavigationPanel extends StatelessWidget {
  final RouteModel? route;
  final RouteProgress? progress;
  final String destinationName;
  final int destinationOrder;
  final String? destinationImage;

  /// Lời giới thiệu ngắn (công khai) của trạm, hiện trong mục "Trên đường đi".
  final String? teaser;
  final RouteVehicle vehicle;
  final bool loading;
  final bool active;
  final bool arrived;
  final String? error;
  final ValueChanged<RouteVehicle> onVehicleChanged;
  final VoidCallback onStart;
  final VoidCallback onSteps;
  final VoidCallback onExternal;
  final VoidCallback onClose;
  final VoidCallback onCheckIn;
  final VoidCallback onRetry;

  const NavigationPanel({
    super.key,
    required this.route,
    required this.progress,
    required this.destinationName,
    required this.destinationOrder,
    required this.destinationImage,
    required this.teaser,
    required this.vehicle,
    required this.loading,
    required this.active,
    required this.arrived,
    required this.error,
    required this.onVehicleChanged,
    required this.onStart,
    required this.onSteps,
    required this.onExternal,
    required this.onClose,
    required this.onCheckIn,
    required this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    final r = route;
    final seconds = progress?.remainingSeconds ?? r?.durationSeconds ?? 0;
    final meters = progress?.remainingMeters ?? r?.distanceMeters ?? 0;
    final total = r?.distanceMeters ?? 0;
    final fraction = arrived ? 1.0 : (total <= 0 || progress == null ? 0.0 : (1 - meters / total).clamp(0.0, 1.0));

    return Container(
      padding: EdgeInsets.fromLTRB(16, 10, 16, 14 + MediaQuery.paddingOf(context).bottom),
      decoration: const BoxDecoration(
        color: AppCultureColors.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(26)),
        boxShadow: [BoxShadow(color: Color(0x401E1A14), blurRadius: 18, offset: Offset(0, -2))],
      ),
      child: AnimatedSize(
        duration: const Duration(milliseconds: 250),
        alignment: Alignment.topCenter,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(color: AppCultureColors.border, borderRadius: BorderRadius.circular(2)),
              ),
            ),
            const SizedBox(height: 12),
            _header(),
            const SizedBox(height: 12),
            if (arrived)
              _arrivedCard()
            else ...[
              _stats(r, seconds, meters),
              if (r != null) ...[
                const SizedBox(height: 14),
                _journeyBar(fraction),
              ],
              if (!active) ...[
                const SizedBox(height: 14),
                _vehicles(),
              ],
              if (teaser != null && r != null) ...[
                const SizedBox(height: 12),
                _teaser(),
              ],
              const SizedBox(height: 14),
              _actions(r),
            ],
          ],
        ),
      ),
    );
  }

  Widget _header() {
    final order = destinationOrder.toString().padLeft(2, '0');
    final image = destinationImage;
    return Row(
      children: [
        SizedBox(
          width: 52,
          height: 52,
          child: ClipRRect(
            borderRadius: BorderRadius.circular(14),
            child: image != null && image.startsWith('https://')
                ? Image.network(
                    image,
                    fit: BoxFit.cover,
                    errorBuilder: (_, _, _) => const ColoredBox(color: AppCultureColors.surfaceSubtle),
                  )
                : const ColoredBox(
                    color: AppCultureColors.surfaceSubtle,
                    child: Icon(Icons.place_outlined, color: AppCultureColors.textMuted),
                  ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(arrived ? 'ĐÃ ĐẾN TRẠM $order' : 'ĐƯỜNG TỚI TRẠM $order', style: AppType.eyebrow()),
              const SizedBox(height: 2),
              Text(destinationName, maxLines: 1, overflow: TextOverflow.ellipsis, style: AppType.display(size: 17)),
            ],
          ),
        ),
        if (loading && route != null)
          const Padding(
            padding: EdgeInsets.only(right: 6),
            child: SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)),
          ),
        IconButton(
          onPressed: onClose,
          tooltip: active ? 'Kết thúc chỉ đường' : 'Đóng',
          style: IconButton.styleFrom(backgroundColor: AppCultureColors.surfaceSubtle),
          icon: const Icon(Icons.close_rounded, color: AppCultureColors.textDark),
        ),
      ],
    );
  }

  Widget _stats(RouteModel? r, int seconds, int meters) {
    if (loading && r == null) {
      return const Text('Đang tìm đường…', style: TextStyle(fontSize: 15, color: AppCultureColors.textMuted));
    }
    if (r == null) {
      return Text(error ?? 'Không tìm được đường', style: const TextStyle(fontSize: 14.5, color: AppCultureColors.error));
    }
    return Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        Text(formatDuration(seconds), style: AppType.display(size: 26, color: AppCultureColors.jadeDark, height: 1)),
        const SizedBox(width: 10),
        Padding(
          padding: const EdgeInsets.only(bottom: 2),
          child: Text(formatDistance(meters), style: const TextStyle(fontSize: 15, color: AppCultureColors.textMuted)),
        ),
        const Spacer(),
        Padding(
          padding: const EdgeInsets.only(bottom: 2),
          child: Text(
            'Đến lúc ${_arrivalClock(seconds)}',
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppCultureColors.textDark),
          ),
        ),
      ],
    );
  }

  /// Thanh hành trình: biểu tượng phương tiện chạy dọc thanh theo tiến độ thật, cuối thanh là lá cờ đích.
  Widget _journeyBar(double fraction) {
    return LayoutBuilder(
      builder: (_, c) {
        const marker = 30.0;
        final track = math.max(0.0, c.maxWidth - marker - 26);
        return SizedBox(
          height: 34,
          child: Stack(
            alignment: Alignment.centerLeft,
            children: [
              Positioned(
                left: marker / 2,
                right: 13,
                child: Container(
                  height: 4,
                  decoration: BoxDecoration(borderRadius: BorderRadius.circular(2), color: AppCultureColors.border),
                ),
              ),
              Positioned(
                left: marker / 2,
                child: TweenAnimationBuilder<double>(
                  tween: Tween(end: fraction),
                  duration: const Duration(milliseconds: 600),
                  curve: Curves.easeOutCubic,
                  builder: (_, f, _) => Container(
                    width: track * f,
                    height: 4,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(2),
                      color: AppCultureColors.heritageJade,
                    ),
                  ),
                ),
              ),
              const Positioned(right: 0, child: Icon(Icons.flag_rounded, size: 26, color: AppCultureColors.lacquer)),
              TweenAnimationBuilder<double>(
                tween: Tween(end: fraction),
                duration: const Duration(milliseconds: 600),
                curve: Curves.easeOutCubic,
                builder: (_, f, child) => Positioned(left: track * f, child: child!),
                child: Container(
                  width: marker,
                  height: marker,
                  decoration: BoxDecoration(
                    color: AppCultureColors.heritageJade,
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 2),
                    boxShadow: const [BoxShadow(color: Color(0x331E1A14), blurRadius: 6, offset: Offset(0, 2))],
                  ),
                  child: Icon(vehicleIcon(vehicle), size: 17, color: Colors.white),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _vehicles() {
    return Row(
      children: [
        for (final v in RouteVehicle.values) ...[
          Expanded(
            child: Material(
              color: v == vehicle ? AppCultureColors.jadeLight : AppCultureColors.surfaceSubtle,
              borderRadius: BorderRadius.circular(14),
              child: InkWell(
                borderRadius: BorderRadius.circular(14),
                onTap: loading || v == vehicle ? null : () => onVehicleChanged(v),
                child: Container(
                  height: 54,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                      color: v == vehicle ? AppCultureColors.heritageJade : Colors.transparent,
                      width: 1.4,
                    ),
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        vehicleIcon(v),
                        size: 21,
                        color: v == vehicle ? AppCultureColors.jadeDark : AppCultureColors.textMuted,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        v.label,
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: v == vehicle ? FontWeight.w700 : FontWeight.w500,
                          color: v == vehicle ? AppCultureColors.jadeDark : AppCultureColors.textMuted,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
          if (v != RouteVehicle.values.last) const SizedBox(width: 8),
        ],
      ],
    );
  }

  Widget _teaser() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppCultureColors.background,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppCultureColors.borderLight),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.auto_stories_outlined, size: 15, color: AppCultureColors.lacquer),
              const SizedBox(width: 6),
              Text('TRÊN ĐƯỜNG ĐI', style: AppType.eyebrow()),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            teaser!,
            maxLines: 3,
            overflow: TextOverflow.ellipsis,
            style: AppType.reading(size: 14).copyWith(height: 1.5, fontStyle: FontStyle.italic),
          ),
        ],
      ),
    );
  }

  Widget _arrivedCard() {
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: const Duration(milliseconds: 500),
      curve: Curves.easeOutBack,
      builder: (_, t, child) =>
          Transform.scale(scale: 0.92 + 0.08 * t, child: Opacity(opacity: t.clamp(0, 1), child: child)),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [AppCultureColors.jadeGradientStart, AppCultureColors.jadeGradientEnd],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(18),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.flag_rounded, color: Color(0xFFF1DFB4), size: 20),
                SizedBox(width: 8),
                Text('Bạn đã đến nơi', style: TextStyle(color: Color(0xFFF1DFB4), fontWeight: FontWeight.w700)),
              ],
            ),
            const SizedBox(height: 6),
            Text(destinationName, style: AppType.display(size: 21, color: Colors.white)),
            const SizedBox(height: 4),
            const Text(
              'Check-in để mở khóa Nội dung văn hóa và Trải nghiệm tại trạm này.',
              style: TextStyle(color: Colors.white70, fontSize: 13, height: 1.4),
            ),
            const SizedBox(height: 14),
            SizedBox(
              width: double.infinity,
              height: 50,
              child: FilledButton.icon(
                onPressed: onCheckIn,
                style: FilledButton.styleFrom(
                  backgroundColor: Colors.white,
                  foregroundColor: AppCultureColors.jadeDark,
                  shape: const StadiumBorder(),
                ),
                icon: const Icon(Icons.verified_outlined),
                label: const Text('Check-in ngay', style: TextStyle(fontSize: 15.5, fontWeight: FontWeight.w700)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _actions(RouteModel? r) {
    final square = _outlined.copyWith(
      minimumSize: const WidgetStatePropertyAll(Size(50, 50)),
      padding: const WidgetStatePropertyAll(EdgeInsets.zero),
    );
    return Row(
      children: [
        Expanded(
          child: r == null && !loading
              ? _wideButton(label: 'Thử lại', icon: Icons.refresh_rounded, onTap: onRetry)
              : active
              ? OutlinedButton.icon(
                  onPressed: r == null ? null : onSteps,
                  icon: const Icon(Icons.format_list_bulleted_rounded),
                  label: const Text('Các bước', style: TextStyle(fontWeight: FontWeight.w600)),
                  style: _outlined,
                )
              : _wideButton(label: 'Bắt đầu đi', icon: Icons.navigation_rounded, onTap: r == null ? null : onStart),
        ),
        if (!active && r != null) ...[
          const SizedBox(width: 10),
          Tooltip(
            message: 'Xem ${r.steps.length} bước chỉ đường',
            child: OutlinedButton(onPressed: onSteps, style: square, child: const Icon(Icons.format_list_bulleted_rounded)),
          ),
        ],
        const SizedBox(width: 10),
        Tooltip(
          message: 'Mở Google Maps (có giọng nói)',
          child: OutlinedButton(onPressed: onExternal, style: square, child: const Icon(Icons.record_voice_over_outlined)),
        ),
      ],
    );
  }

  static final _outlined = OutlinedButton.styleFrom(
    minimumSize: const Size.fromHeight(50),
    foregroundColor: AppCultureColors.jadeDark,
    side: const BorderSide(color: AppCultureColors.border),
    shape: const StadiumBorder(),
  );

  Widget _wideButton({required String label, required IconData icon, required VoidCallback? onTap}) {
    return SizedBox(
      height: 50,
      width: double.infinity,
      child: FilledButton.icon(
        onPressed: onTap,
        style: FilledButton.styleFrom(backgroundColor: AppCultureColors.heritageJade, shape: const StadiumBorder()),
        icon: Icon(icon, size: 20),
        label: Text(label, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
      ),
    );
  }
}

/// Danh sách mọi bước chỉ đường; bước đang tới được tô đậm.
Future<void> showRouteSteps(BuildContext context, RouteModel route, {int? currentIndex}) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (ctx) => DraggableScrollableSheet(
      initialChildSize: 0.6,
      minChildSize: 0.35,
      maxChildSize: 0.92,
      expand: false,
      builder: (ctx, scroll) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(26)),
        ),
        child: ListView.builder(
          controller: scroll,
          padding: EdgeInsets.fromLTRB(16, 12, 16, 20 + MediaQuery.paddingOf(ctx).bottom),
          itemCount: route.steps.length + 1,
          itemBuilder: (_, i) {
            if (i == 0) {
              return Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Center(
                      child: Container(
                        width: 40,
                        height: 4,
                        decoration: BoxDecoration(
                            color: AppCultureColors.border, borderRadius: BorderRadius.circular(2)),
                      ),
                    ),
                    const SizedBox(height: 14),
                    const Text('Các bước chỉ đường',
                        style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: AppCultureColors.textDark)),
                    const SizedBox(height: 2),
                    Text('${formatDuration(route.durationSeconds)} · ${formatDistance(route.distanceMeters)}',
                        style: const TextStyle(fontSize: 12.5, color: AppCultureColors.textMuted)),
                  ],
                ),
              );
            }
            final index = i - 1;
            final step = route.steps[index];
            final current = index == currentIndex;
            final passed = currentIndex != null && index < currentIndex;
            return Container(
              margin: const EdgeInsets.only(bottom: 6),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: current ? AppCultureColors.jadeLight : Colors.transparent,
                borderRadius: BorderRadius.circular(14),
              ),
              child: Row(
                children: [
                  Icon(
                    maneuverIcon(step.maneuver, step.instruction),
                    color: passed ? AppCultureColors.textLight : AppCultureColors.jadeDark,
                    size: 26,
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Text(
                      step.instruction.isEmpty ? 'Đi tiếp' : step.instruction,
                      style: TextStyle(
                        fontSize: 14,
                        height: 1.35,
                        fontWeight: current ? FontWeight.w600 : FontWeight.w400,
                        color: passed ? AppCultureColors.textLight : AppCultureColors.textDark,
                      ),
                    ),
                  ),
                  if (step.distanceMeters > 0) ...[
                    const SizedBox(width: 10),
                    Text(formatDistance(step.distanceMeters),
                        style: const TextStyle(fontSize: 12.5, color: AppCultureColors.textMuted)),
                  ],
                ],
              ),
            );
          },
        ),
      ),
    ),
  );
}
