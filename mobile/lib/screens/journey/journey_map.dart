import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../../core/constants/app_colors.dart';
import 'map_kit.dart';

enum StopState { done, current, locked }

/// Một điểm đến đặt trên bản đồ hành trình.
class JourneyStop {
  final int destinationId;
  final int order;
  final String name;
  final LatLng point;
  final StopState state;
  final bool skipped;

  const JourneyStop({
    required this.destinationId,
    required this.order,
    required this.name,
    required this.point,
    required this.state,
    this.skipped = false,
  });
}

/// Bản đồ toàn hành trình: ghim đánh số theo thứ tự, đường lộ trình (đoạn đã đi tô xanh ngọc),
/// vòng bán kính check-in quanh điểm đang mở và vị trí du khách.
class JourneyMap extends StatefulWidget {
  final List<JourneyStop> stops;
  final LatLng? user;
  final double? heading;
  final bool satellite;
  final EdgeInsets fitPadding;
  final ValueChanged<JourneyStop>? onStopTap;

  /// Đường đi theo mặt đường khi đang chỉ đường (phần còn phải đi); null khi không chỉ đường.
  final List<LatLng>? navRoute;

  /// Du khách tự kéo / phóng bản đồ (để ngừng bám theo vị trí khi dẫn đường).
  final VoidCallback? onUserGesture;

  /// Bán kính check-in điểm đến (backend: DEFAULT_DESTINATION_RADIUS_METERS = 100).
  final double checkInRadiusMeters;

  const JourneyMap({
    super.key,
    required this.stops,
    required this.user,
    required this.heading,
    required this.satellite,
    required this.fitPadding,
    this.onStopTap,
    this.navRoute,
    this.onUserGesture,
    this.checkInRadiusMeters = 100,
  });

  @override
  State<JourneyMap> createState() => JourneyMapState();
}

class JourneyMapState extends State<JourneyMap> {
  final MapController _controller = MapController();
  bool _ready = false;

  List<LatLng> get _allPoints => [
        ...widget.stops.map((s) => s.point),
        if (widget.user != null) widget.user!,
      ];

  @override
  void didUpdateWidget(covariant JourneyMap oldWidget) {
    super.didUpdateWidget(oldWidget);
    // Có thêm tọa độ (điểm đến tải xong, hoặc lần đầu có vị trí du khách): căn lại khung.
    final morePoints = oldWidget.stops.length != widget.stops.length ||
        (oldWidget.user == null && widget.user != null);
    if (morePoints && _ready) fitAll();
  }

  void fitAll() {
    final points = _allPoints;
    if (points.isEmpty) return;
    if (points.length == 1) {
      _controller.move(points.first, 16);
      return;
    }
    _controller.fitCamera(CameraFit.coordinates(
      coordinates: points,
      padding: widget.fitPadding,
      maxZoom: 17.5,
    ));
  }

  void focus(LatLng point, {double zoom = 17.5}) => _controller.move(point, zoom);

  /// Căn khung vừa các điểm (xem trước tuyến chỉ đường).
  void fitPoints(List<LatLng> points, EdgeInsets padding) {
    if (points.length < 2 || !_ready) return;
    _controller.fitCamera(CameraFit.coordinates(coordinates: points, padding: padding, maxZoom: 17.5));
  }

  /// Bám theo du khách khi dẫn đường; giữ mức phóng hiện tại nếu đã đủ gần.
  void follow(LatLng point) {
    if (!_ready) return;
    _controller.move(point, math.max(_controller.camera.zoom, 17));
  }

  void focusUser() {
    final user = widget.user;
    if (user != null) _controller.move(user, 17.5);
  }

  @override
  Widget build(BuildContext context) {
    final stops = widget.stops;
    final user = widget.user;
    final current = stops.where((s) => s.state == StopState.current).toList();
    final route = stops.map((s) => s.point).toList();
    // Đoạn đã đi: từ điểm đầu tới điểm đang mở (hoặc hết tuyến nếu đã xong).
    final doneUntil = current.isEmpty ? stops.length : stops.indexOf(current.first) + 1;
    final walked = route.take(doneUntil).toList();
    final initialPoints = _allPoints;
    final navRoute = widget.navRoute;

    return FlutterMap(
      mapController: _controller,
      options: MapOptions(
        initialCenter: initialPoints.isNotEmpty ? initialPoints.first : const LatLng(16.0, 107.5),
        initialZoom: initialPoints.isNotEmpty ? 15 : 5,
        initialCameraFit: initialPoints.length >= 2
            ? CameraFit.coordinates(coordinates: initialPoints, padding: widget.fitPadding, maxZoom: 17.5)
            : null,
        interactionOptions: const InteractionOptions(flags: InteractiveFlag.all & ~InteractiveFlag.rotate),
        backgroundColor: mapBackground,
        onMapReady: () => _ready = true,
        onPositionChanged: (_, hasGesture) {
          if (hasGesture) widget.onUserGesture?.call();
        },
      ),
      children: [
        ...baseTileLayers(satellite: widget.satellite),
        for (final s in current)
          PulsingRadius(
            center: s.point,
            radiusMeters: widget.checkInRadiusMeters,
            color: AppCultureColors.oceanBlue,
          ),
        if (route.length >= 2)
          PolylineLayer(polylines: [
            Polyline(points: route, strokeWidth: 7, color: Colors.white),
            Polyline(
              points: route,
              strokeWidth: 4,
              color: AppCultureColors.textLight,
              pattern: StrokePattern.dashed(segments: const [10, 8]),
            ),
            if (walked.length >= 2)
              Polyline(points: walked, strokeWidth: 4, color: AppCultureColors.heritageJade),
          ]),
        if (navRoute != null && navRoute.length >= 2)
          PolylineLayer(polylines: [
            Polyline(points: navRoute, strokeWidth: 10, color: Colors.white),
            Polyline(points: navRoute, strokeWidth: 6.5, color: AppCultureColors.oceanBlue),
          ])
        else if (user != null && current.isNotEmpty)
          PolylineLayer(polylines: [
            Polyline(
              points: [user, current.first.point],
              strokeWidth: 3,
              color: AppCultureColors.oceanBlue,
              pattern: StrokePattern.dashed(segments: const [6, 6]),
            ),
          ]),
        MarkerLayer(markers: [
          // Điểm chưa tới vẽ trước để điểm đang mở luôn nằm trên cùng.
          for (final s in [
            ...stops.where((s) => s.state == StopState.locked),
            ...stops.where((s) => s.state == StopState.done),
            ...current,
          ])
            Marker(
              point: s.point,
              width: PlacePin.markerWidth,
              height: PlacePin.markerHeight,
              alignment: Marker.computePixelAlignment(
                width: PlacePin.markerWidth,
                height: PlacePin.markerHeight,
                left: PlacePin.markerWidth / 2,
                top: s.state == StopState.current ? 23 : 18,
              ),
              child: GestureDetector(
                onTap: widget.onStopTap == null ? null : () => widget.onStopTap!(s),
                child: PlacePin(
                  color: switch (s.state) {
                    StopState.done => AppCultureColors.heritageJade,
                    StopState.current => AppCultureColors.oceanBlue,
                    StopState.locked => const Color(0xFF94A3B8),
                  },
                  emphasized: s.state == StopState.current,
                  label: s.name,
                  child: s.state == StopState.done
                      ? Icon(s.skipped ? Icons.skip_next_rounded : Icons.check_rounded,
                          color: Colors.white, size: 20)
                      : Text('${s.order}',
                          style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w700,
                            fontSize: s.state == StopState.current ? 18 : 14,
                          )),
                ),
              ),
            ),
          if (user != null)
            Marker(point: user, width: 70, height: 70, child: UserLocationMarker(heading: widget.heading)),
        ]),
      ],
    );
  }
}
