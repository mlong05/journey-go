import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../../core/constants/app_colors.dart';
import '../../core/models/tour_journey_model.dart';
import 'map_kit.dart';

/// Bản đồ nhỏ ở đầu tab "Trải nghiệm" của một trạm: thấy cùng lúc
/// - vùng check-in của điểm đến (vòng vàng nét đứt),
/// - checkpoint từng hoạt động thực địa, đánh số theo thứ tự (đã xong: dấu ✓ xanh ngọc),
/// - vị trí du khách.
/// Bấm vào một checkpoint gọi [onTapCheckpoint] (mở đúng hoạt động đó).
class StopCheckpointsMap extends StatefulWidget {
  final StopCheckpoints data;
  final LatLng? user;
  final double? heading;

  /// taskId của các hoạt động đã xong (không còn mở) — vẽ dấu ✓.
  final Set<int> doneTaskIds;
  final ValueChanged<StopCheckpoint> onTapCheckpoint;

  const StopCheckpointsMap({
    super.key,
    required this.data,
    required this.user,
    required this.heading,
    required this.doneTaskIds,
    required this.onTapCheckpoint,
  });

  /// Màu vùng check-in của điểm đến (khớp vòng cam trên web).
  static const Color stopColor = AppCultureColors.goldBright;

  @override
  State<StopCheckpointsMap> createState() => _StopCheckpointsMapState();
}

class _StopCheckpointsMapState extends State<StopCheckpointsMap> {
  final MapController _controller = MapController();
  bool _ready = false;
  bool _fittedWithUser = false;

  LatLng? get _stopPoint =>
      widget.data.hasStopLocation ? LatLng(widget.data.latitude!, widget.data.longitude!) : null;

  /// Các điểm cần thấy: điểm đến + mọi checkpoint (+ du khách nếu có).
  List<LatLng> _fitPoints({bool withUser = true}) => [
        ?_stopPoint,
        for (final c in widget.data.checkpoints) LatLng(c.latitude, c.longitude),
        if (withUser) ?widget.user,
      ];

  CameraFit? _cameraFit(List<LatLng> points) => points.length < 2
      ? null
      : CameraFit.coordinates(coordinates: points, padding: const EdgeInsets.all(42), maxZoom: 18);

  void fitAll() {
    final points = _fitPoints();
    final fit = _cameraFit(points);
    if (fit != null) {
      _controller.fitCamera(fit);
    } else if (points.isNotEmpty) {
      _controller.move(points.first, 17);
    }
  }

  @override
  void didUpdateWidget(covariant StopCheckpointsMap oldWidget) {
    super.didUpdateWidget(oldWidget);
    // Lần đầu có vị trí du khách: căn lại để thấy cả du khách.
    if (_ready && !_fittedWithUser && oldWidget.user == null && widget.user != null) {
      _fittedWithUser = true;
      fitAll();
    }
  }

  @override
  Widget build(BuildContext context) {
    final stop = _stopPoint;
    final points = _fitPoints(withUser: false);
    if (points.isEmpty) return const SizedBox.shrink();
    final user = widget.user;
    final stopRadius = widget.data.checkInRadiusMeters;

    return ClipRRect(
      borderRadius: BorderRadius.circular(18),
      child: SizedBox(
        height: 230,
        child: Stack(
          children: [
            FlutterMap(
              mapController: _controller,
              options: MapOptions(
                initialCenter: points.first,
                initialZoom: 17,
                initialCameraFit: _cameraFit(points),
                interactionOptions: const InteractionOptions(flags: InteractiveFlag.all & ~InteractiveFlag.rotate),
                backgroundColor: mapBackground,
                onMapReady: () => _ready = true,
              ),
              children: [
                ...baseTileLayers(satellite: false),
                if (stop != null && stopRadius != null && stopRadius > 0)
                  CircleLayer(circles: [
                    CircleMarker(
                      point: stop,
                      radius: stopRadius.toDouble(),
                      useRadiusInMeter: true,
                      color: StopCheckpointsMap.stopColor.withValues(alpha: 0.10),
                      borderColor: StopCheckpointsMap.stopColor,
                      borderStrokeWidth: 2,
                    ),
                  ]),
                CircleLayer(circles: [
                  for (final c in widget.data.checkpoints)
                    CircleMarker(
                      point: LatLng(c.latitude, c.longitude),
                      radius: c.radiusMeters.toDouble(),
                      useRadiusInMeter: true,
                      color: _colorOf(c).withValues(alpha: 0.16),
                      borderColor: _colorOf(c),
                      borderStrokeWidth: 1.5,
                    ),
                ]),
                MarkerLayer(markers: [
                  if (stop != null)
                    Marker(
                      point: stop,
                      width: 26,
                      height: 26,
                      child: Container(
                        decoration: BoxDecoration(
                          color: StopCheckpointsMap.stopColor,
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 2.5),
                          boxShadow: const [BoxShadow(color: Colors.black26, blurRadius: 4)],
                        ),
                        child: const Icon(Icons.flag_rounded, color: Colors.white, size: 14),
                      ),
                    ),
                  for (final c in widget.data.checkpoints)
                    Marker(
                      point: LatLng(c.latitude, c.longitude),
                      width: 40,
                      height: 40,
                      child: GestureDetector(
                        onTap: () => widget.onTapCheckpoint(c),
                        child: Semantics(
                          button: true,
                          label: 'Hoạt động ${_numberOf(c)}: ${c.name}',
                          child: _CheckpointPin(
                            number: _numberOf(c),
                            done: widget.doneTaskIds.contains(c.taskId),
                            color: _colorOf(c),
                          ),
                        ),
                      ),
                    ),
                  if (user != null)
                    Marker(point: user, width: 60, height: 60, child: UserLocationMarker(heading: widget.heading)),
                ]),
              ],
            ),
            Positioned(
              right: 10,
              top: 10,
              child: MapRoundButton(icon: Icons.fit_screen_rounded, tooltip: 'Xem tất cả', onPressed: fitAll),
            ),
            Positioned(
              left: 10,
              bottom: 8,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.94),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Row(mainAxisSize: MainAxisSize.min, children: [
                  _legendDot(StopCheckpointsMap.stopColor),
                  const Text(' Vùng điểm đến   ', style: _legendStyle),
                  _legendDot(AppCultureColors.oceanBlue),
                  const Text(' Hoạt động', style: _legendStyle),
                ]),
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Số thứ tự hiển thị: theo vị trí trong danh sách checkpoint (1, 2, 3…).
  int _numberOf(StopCheckpoint c) => widget.data.checkpoints.indexOf(c) + 1;

  Color _colorOf(StopCheckpoint c) =>
      widget.doneTaskIds.contains(c.taskId) ? AppCultureColors.heritageJade : AppCultureColors.oceanBlue;

  static const TextStyle _legendStyle = TextStyle(fontSize: 10.5, fontWeight: FontWeight.w600, color: AppCultureColors.textMuted);

  static Widget _legendDot(Color color) =>
      Container(width: 9, height: 9, decoration: BoxDecoration(color: color, shape: BoxShape.circle));
}

class _CheckpointPin extends StatelessWidget {
  final int number;
  final bool done;
  final Color color;

  const _CheckpointPin({required this.number, required this.done, required this.color});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Container(
        width: 30,
        height: 30,
        decoration: BoxDecoration(
          color: color,
          shape: BoxShape.circle,
          border: Border.all(color: Colors.white, width: 2.5),
          boxShadow: const [BoxShadow(color: Colors.black26, blurRadius: 5, offset: Offset(0, 2))],
        ),
        alignment: Alignment.center,
        child: done
            ? const Icon(Icons.check_rounded, color: Colors.white, size: 17)
            : Text('$number', style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w800)),
      ),
    );
  }
}
