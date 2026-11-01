import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../../core/constants/app_colors.dart';
import 'map_kit.dart';

export 'map_kit.dart' show compassLabel, turnHint, bearingBetween, formatDistance;

/// Một trạm phụ hiện trên bản đồ (nhiệm vụ thứ tự tự do): chạm để chọn làm đích đến.
class StationMarker {
  final LatLng point;
  final String label;
  final bool done;
  final VoidCallback? onTap;

  const StationMarker({required this.point, required this.label, required this.done, this.onTap});
}

/// Bản đồ dẫn đường phủ kín vùng chứa: trạm đích (vòng bán kính nhấp nháy), vị trí du khách
/// (mũi tên theo hướng đi) và đường nối: còn xa thì vẽ tuyến đi bộ [route], gần thì nối thẳng. Màn cha giữ các nút điều khiển và gọi
/// [StationMapState.fitAll] / [StationMapState.focusUser] qua GlobalKey.
class StationMap extends StatefulWidget {
  final LatLng station;
  final String stationName;
  final int radiusMeters;
  final LatLng? user;
  final double? heading;
  final bool satellite;

  /// Tuyến đi bộ khi còn xa trạm; null thì nối thẳng du khách → trạm.
  final List<LatLng>? route;

  /// Du khách đã ở trong bán kính: vòng tròn đổi sang màu xanh ngọc.
  final bool inside;

  /// Khoảng chừa khi căn khung, để hai điểm không bị thanh trên / bảng trượt che.
  final EdgeInsets fitPadding;

  /// Các trạm khác của nhiệm vụ (thứ tự tự do); trạm đã xong màu ngọc, chưa xong màu cát.
  final List<StationMarker> others;

  const StationMap({
    super.key,
    required this.station,
    required this.stationName,
    required this.radiusMeters,
    required this.user,
    required this.heading,
    required this.satellite,
    this.route,
    this.inside = false,
    this.fitPadding = const EdgeInsets.all(56),
    this.others = const [],
  });

  @override
  State<StationMap> createState() => StationMapState();
}

class StationMapState extends State<StationMap> {
  final MapController _controller = MapController();
  bool _ready = false;

  @override
  void didUpdateWidget(covariant StationMap oldWidget) {
    super.didUpdateWidget(oldWidget);
    // Lần đầu có vị trí du khách: căn khung để thấy cả hai điểm.
    if (oldWidget.user == null && widget.user != null && _ready) fitAll();
  }

  /// Căn khung thấy cả du khách và trạm.
  void fitAll() {
    final user = widget.user;
    if (user == null) {
      _controller.move(widget.station, 18);
      return;
    }
    _controller.fitCamera(CameraFit.coordinates(
      coordinates: [user, widget.station],
      padding: widget.fitPadding,
      maxZoom: 18.5,
    ));
  }

  /// Căn khung thấy mọi trạm (và du khách nếu có).
  void fitStations() {
    final points = [widget.station, ...widget.others.map((o) => o.point), ?widget.user];
    if (points.length < 2) {
      _controller.move(widget.station, 18);
      return;
    }
    _controller.fitCamera(CameraFit.coordinates(coordinates: points, padding: widget.fitPadding, maxZoom: 18.5));
  }

  /// Đưa bản đồ về vị trí du khách.
  void focusUser() {
    final user = widget.user;
    if (user != null) _controller.move(user, 18.5);
  }

  @override
  Widget build(BuildContext context) {
    final user = widget.user;
    final route = widget.route;
    return FlutterMap(
      mapController: _controller,
      options: MapOptions(
        initialCenter: widget.station,
        initialZoom: 18,
        initialCameraFit: user == null
            ? null
            : CameraFit.coordinates(
                coordinates: [user, widget.station],
                padding: widget.fitPadding,
                maxZoom: 18.5,
              ),
        interactionOptions: const InteractionOptions(flags: InteractiveFlag.all & ~InteractiveFlag.rotate),
        backgroundColor: mapBackground,
        onMapReady: () => _ready = true,
      ),
      children: [
        ...baseTileLayers(satellite: widget.satellite),
        PulsingRadius(
          center: widget.station,
          radiusMeters: widget.radiusMeters.toDouble(),
          color: widget.inside ? AppCultureColors.heritageJade : AppCultureColors.oceanBlue,
        ),
        if (user != null && route != null) ...[
          PolylineLayer(polylines: [
            Polyline(points: route, strokeWidth: 8, color: Colors.white),
            Polyline(points: route, strokeWidth: 5, color: AppCultureColors.oceanBlue),
            // Đoạn cuối tuyến (mép đường) vào tới trạm
            Polyline(
              points: [route.last, widget.station],
              strokeWidth: 3,
              color: AppCultureColors.oceanBlue,
              pattern: StrokePattern.dashed(segments: const [10, 7]),
            ),
          ]),
        ] else if (user != null)
          PolylineLayer(polylines: [
            Polyline(
              points: [user, widget.station],
              strokeWidth: 5,
              color: Colors.white,
            ),
            Polyline(
              points: [user, widget.station],
              strokeWidth: 3,
              color: AppCultureColors.oceanBlue,
              // Không dùng const: hàm tạo kiểm tra độ dài segments bằng assert lúc chạy.
              pattern: StrokePattern.dashed(segments: const [10, 7]),
            ),
          ]),
        MarkerLayer(markers: [
          for (final o in widget.others)
            Marker(
              point: o.point,
              width: PlacePin.markerWidth,
              height: PlacePin.markerHeight,
              alignment: Marker.computePixelAlignment(
                width: PlacePin.markerWidth,
                height: PlacePin.markerHeight,
                left: PlacePin.markerWidth / 2,
                top: 18,
              ),
              child: GestureDetector(
                onTap: o.onTap,
                child: Opacity(
                  opacity: o.done ? 0.8 : 1,
                  child: PlacePin(
                    color: o.done ? AppCultureColors.heritageJade : AppCultureColors.amberDark,
                    label: o.label,
                    child: Icon(o.done ? Icons.check_rounded : Icons.flag_outlined, color: Colors.white, size: 18),
                  ),
                ),
              ),
            ),
          Marker(
            point: widget.station,
            width: PlacePin.markerWidth,
            height: PlacePin.markerHeight,
            alignment: Marker.computePixelAlignment(
              width: PlacePin.markerWidth,
              height: PlacePin.markerHeight,
              left: PlacePin.markerWidth / 2,
              top: 23,
            ),
            child: PlacePin(
              color: AppCultureColors.heritageJade,
              label: widget.stationName,
              emphasized: true,
              child: const Icon(Icons.flag_rounded, color: Colors.white, size: 22),
            ),
          ),
          if (user != null)
            Marker(
              point: user,
              width: 70,
              height: 70,
              child: UserLocationMarker(heading: widget.heading),
            ),
        ]),
      ],
    );
  }
}
