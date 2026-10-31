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

/// Thẻ hướng dẫn trên cùng khi đang dẫn đường: biểu tượng rẽ, "Sau 120 m", câu hướng dẫn, bước sau đó.
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

    return Material(
      color: Colors.transparent,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.fromLTRB(14, 14, 16, 14),
            decoration: BoxDecoration(
              color: arrived ? AppCultureColors.heritageJade : AppCultureColors.jadeDark,
              borderRadius: BorderRadius.vertical(
                top: const Radius.circular(20),
                bottom: Radius.circular(after == null || arrived ? 20 : 0),
              ),
              boxShadow: const [BoxShadow(color: Colors.black26, blurRadius: 12, offset: Offset(0, 4))],
            ),
            child: Row(
              children: [
                AnimatedSwitcher(
                  duration: const Duration(milliseconds: 250),
                  transitionBuilder: (child, a) => ScaleTransition(scale: a, child: child),
                  child: Container(
                    key: ValueKey(icon),
                    width: 52,
                    height: 52,
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.16),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Icon(icon, color: Colors.white, size: 34),
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
                        style: const TextStyle(color: Colors.white, fontSize: 21, fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        detail,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(color: Colors.white.withValues(alpha: 0.92), fontSize: 14, height: 1.3),
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
              decoration: const BoxDecoration(
                color: Color(0xFF00704A),
                borderRadius: BorderRadius.vertical(bottom: Radius.circular(20)),
              ),
              child: Row(
                children: [
                  const Text('Sau đó', style: TextStyle(color: Colors.white70, fontSize: 12.5)),
                  const SizedBox(width: 8),
                  Icon(maneuverIcon(after.maneuver, after.instruction), color: Colors.white, size: 18),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      after.instruction,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(color: Colors.white, fontSize: 12.5),
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

/// Thẻ dưới cùng: xem trước tuyến (chưa đi) hoặc thời gian, quãng còn lại khi đang đi.
class NavigationPanel extends StatelessWidget {
  final RouteModel? route;
  final RouteProgress? progress;
  final String destinationName;
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

    return Container(
      padding: EdgeInsets.fromLTRB(16, 10, 16, 14 + MediaQuery.paddingOf(context).bottom),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(26)),
        boxShadow: [BoxShadow(color: Colors.black26, blurRadius: 16, offset: Offset(0, -2))],
      ),
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
          Row(
            children: [
              Expanded(
                child: loading && r == null
                    ? const Text('Đang tìm đường…',
                        style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: AppCultureColors.textDark))
                    : r == null
                        ? Text(error ?? 'Không tìm được đường',
                            style: const TextStyle(fontSize: 14.5, color: AppCultureColors.error))
                        : Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text.rich(
                                TextSpan(children: [
                                  TextSpan(
                                    text: formatDuration(seconds),
                                    style: const TextStyle(
                                        fontSize: 22, fontWeight: FontWeight.w700, color: AppCultureColors.jadeDark),
                                  ),
                                  TextSpan(
                                    text: '  ·  ${formatDistance(meters)}',
                                    style: const TextStyle(fontSize: 15, color: AppCultureColors.textMuted),
                                  ),
                                ]),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                active ? 'Đến lúc ${_arrivalClock(seconds)} · $destinationName' : 'Tới $destinationName',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(fontSize: 12.5, color: AppCultureColors.textMuted),
                              ),
                            ],
                          ),
              ),
              if (loading && r != null)
                const Padding(
                  padding: EdgeInsets.only(right: 4),
                  child: SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)),
                ),
              IconButton(
                onPressed: onClose,
                tooltip: active ? 'Kết thúc chỉ đường' : 'Đóng',
                style: IconButton.styleFrom(backgroundColor: AppCultureColors.surfaceSubtle),
                icon: const Icon(Icons.close_rounded, color: AppCultureColors.textDark),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (!active)
            SegmentedButton<RouteVehicle>(
              segments: [
                for (final v in RouteVehicle.values)
                  ButtonSegment(
                    value: v,
                    label: Text(v.label),
                    icon: Icon(switch (v) {
                      RouteVehicle.walk => Icons.directions_walk_rounded,
                      RouteVehicle.bike => Icons.two_wheeler_rounded,
                      RouteVehicle.car => Icons.directions_car_rounded,
                    }),
                  ),
              ],
              selected: {vehicle},
              showSelectedIcon: false,
              onSelectionChanged: loading ? null : (s) => onVehicleChanged(s.first),
              style: SegmentedButton.styleFrom(
                selectedBackgroundColor: AppCultureColors.jadeLight,
                selectedForegroundColor: AppCultureColors.jadeDark,
              ),
            ),
          if (!active) const SizedBox(height: 12),
          if (arrived)
            _wideButton(
              label: 'Check-in ngay',
              icon: Icons.my_location_rounded,
              color: AppCultureColors.heritageJade,
              onTap: onCheckIn,
            )
          else
            Row(
              children: [
                Expanded(
                  child: r == null && !loading
                      ? _wideButton(
                          label: 'Thử lại',
                          icon: Icons.refresh_rounded,
                          color: AppCultureColors.oceanBlue,
                          onTap: onRetry,
                        )
                      : active
                          ? OutlinedButton.icon(
                              onPressed: r == null ? null : onSteps,
                              icon: const Icon(Icons.format_list_bulleted_rounded),
                              label: const Text('Các bước', style: TextStyle(fontWeight: FontWeight.w600)),
                              style: _outlined,
                            )
                          : _wideButton(
                              label: 'Bắt đầu đi',
                              icon: Icons.navigation_rounded,
                              color: AppCultureColors.oceanBlue,
                              onTap: r == null ? null : onStart,
                            ),
                ),
                const SizedBox(width: 10),
                Tooltip(
                  message: 'Mở Google Maps (có giọng nói)',
                  child: OutlinedButton(
                    onPressed: onExternal,
                    style: _outlined.copyWith(
                      minimumSize: const WidgetStatePropertyAll(Size(52, 50)),
                      padding: const WidgetStatePropertyAll(EdgeInsets.symmetric(horizontal: 14)),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.record_voice_over_rounded, size: 19),
                        SizedBox(width: 6),
                        Text('Google Maps', style: TextStyle(fontWeight: FontWeight.w600)),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          if (!active && r != null) ...[
            const SizedBox(height: 4),
            Center(
              child: TextButton.icon(
                onPressed: onSteps,
                icon: const Icon(Icons.format_list_bulleted_rounded, size: 18),
                label: Text('Xem ${r.steps.length} bước chỉ đường'),
                style: TextButton.styleFrom(foregroundColor: AppCultureColors.oceanBlue),
              ),
            ),
          ],
        ],
      ),
    );
  }

  static final _outlined = OutlinedButton.styleFrom(
    minimumSize: const Size.fromHeight(50),
    foregroundColor: AppCultureColors.jadeDark,
    side: const BorderSide(color: AppCultureColors.border),
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
  );

  Widget _wideButton({
    required String label,
    required IconData icon,
    required Color color,
    required VoidCallback? onTap,
  }) {
    return SizedBox(
      height: 50,
      width: double.infinity,
      child: FilledButton.icon(
        onPressed: onTap,
        style: FilledButton.styleFrom(
          backgroundColor: color,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        ),
        icon: Icon(icon, size: 20),
        label: Text(label, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
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
