import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/constants/app_colors.dart';

/// Hướng la bàn (0° = Bắc, theo chiều kim đồng hồ) đổi sang tiếng Việt.
String compassLabel(double bearing) {
  const names = ['Bắc', 'Đông Bắc', 'Đông', 'Đông Nam', 'Nam', 'Tây Nam', 'Tây', 'Tây Bắc'];
  final normalized = (bearing % 360 + 360) % 360;
  return names[((normalized + 22.5) ~/ 45) % 8];
}

/// Gợi ý rẽ khi biết hướng đang đi ([heading]) và hướng tới trạm ([bearing]).
String turnHint(double heading, double bearing) {
  final diff = ((bearing - heading + 540) % 360) - 180; // -180..180, dương = lệch sang phải
  final abs = diff.abs();
  if (abs <= 25) return 'Đi thẳng';
  if (abs >= 150) return 'Quay lại';
  return diff > 0 ? 'Rẽ phải' : 'Rẽ trái';
}

/// Góc phương vị từ [from] tới [to] (0..360°).
double bearingBetween(LatLng from, LatLng to) =>
    (const Distance().bearing(from, to) + 360) % 360;

// Nguồn ảnh bản đồ (đã kiểm tra tại Việt Nam, không cần khóa API):
//  - tile.openstreetmap.org bị chặn trên một số mạng (Connection refused).
//  - CARTO trả ảnh "API KEY REQUIRED" cho yêu cầu từ ứng dụng không có khóa.
//  - Esri World Street Map: bản đồ đường phố có tên đường tiếng Việt; World Imagery: ảnh vệ tinh.
const _streetUrl =
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}';
const _satelliteUrl =
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const _satelliteLabelsUrl =
    'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';

/// Bản đồ dẫn đường tới một trạm check-in: vị trí du khách (kèm hướng đi khi đang di chuyển),
/// trạm đích, vòng bán kính mở câu hỏi và đường nối giữa hai điểm. Có hai lớp nền: đường phố và vệ tinh.
class StationMap extends StatefulWidget {
  final LatLng station;
  final String stationName;
  final int radiusMeters;
  final LatLng? user;

  /// Hướng đang di chuyển (độ, 0 = Bắc); null khi đứng yên hoặc chưa xác định.
  final double? heading;
  final double height;

  const StationMap({
    super.key,
    required this.station,
    required this.stationName,
    required this.radiusMeters,
    required this.user,
    required this.heading,
    this.height = 300,
  });

  @override
  State<StationMap> createState() => _StationMapState();
}

class _StationMapState extends State<StationMap> {
  final MapController _controller = MapController();
  bool _ready = false;
  bool _satellite = false;

  @override
  void didUpdateWidget(covariant StationMap old) {
    super.didUpdateWidget(old);
    // Lần đầu có vị trí du khách: căn khung để thấy cả hai điểm.
    if (old.user == null && widget.user != null && _ready) _fitBoth();
  }

  void _fitBoth() {
    final user = widget.user;
    if (user == null) {
      _controller.move(widget.station, 17);
      return;
    }
    _controller.fitCamera(CameraFit.coordinates(
      coordinates: [user, widget.station],
      padding: const EdgeInsets.all(56),
      maxZoom: 18,
    ));
  }

  @override
  Widget build(BuildContext context) {
    final user = widget.user;
    final moving = widget.heading != null;

    return ClipRRect(
      borderRadius: BorderRadius.circular(22),
      child: SizedBox(
        height: widget.height,
        child: Stack(
          children: [
            FlutterMap(
              mapController: _controller,
              options: MapOptions(
                initialCenter: widget.station,
                initialZoom: 17,
                initialCameraFit: user == null
                    ? null
                    : CameraFit.coordinates(
                        coordinates: [user, widget.station],
                        padding: const EdgeInsets.all(56),
                        maxZoom: 18,
                      ),
                interactionOptions: const InteractionOptions(
                  flags: InteractiveFlag.all & ~InteractiveFlag.rotate,
                ),
                onMapReady: () => _ready = true,
                backgroundColor: const Color(0xFFEFF3F1),
              ),
              children: [
                if (_satellite) ...[
                  TileLayer(
                    key: const ValueKey('satellite'),
                    urlTemplate: _satelliteUrl,
                    userAgentPackageName: 'com.journeygo.mobile',
                    maxNativeZoom: 18,
                  ),
                  TileLayer(
                    key: const ValueKey('satellite-labels'),
                    urlTemplate: _satelliteLabelsUrl,
                    userAgentPackageName: 'com.journeygo.mobile',
                    maxNativeZoom: 18,
                  ),
                ] else
                  TileLayer(
                    key: const ValueKey('street'),
                    urlTemplate: _streetUrl,
                    userAgentPackageName: 'com.journeygo.mobile',
                    maxNativeZoom: 19,
                  ),
                CircleLayer(circles: [
                  CircleMarker(
                    point: widget.station,
                    radius: widget.radiusMeters.toDouble(),
                    useRadiusInMeter: true,
                    color: AppCultureColors.heritageJade.withValues(alpha: 0.16),
                    borderColor: AppCultureColors.heritageJade,
                    borderStrokeWidth: 2,
                  ),
                ]),
                if (user != null)
                  PolylineLayer(polylines: [
                    Polyline(
                      points: [user, widget.station],
                      strokeWidth: 4,
                      color: AppCultureColors.oceanBlue,
                      // Không dùng const: hàm tạo kiểm tra độ dài segments bằng assert lúc chạy.
                      pattern: StrokePattern.dashed(segments: const [12, 8]),
                    ),
                  ]),
                MarkerLayer(markers: [
                  Marker(
                    point: widget.station,
                    width: 46,
                    height: 46,
                    child: Container(
                      decoration: BoxDecoration(
                        color: AppCultureColors.heritageJade,
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white, width: 3),
                        boxShadow: const [BoxShadow(color: Colors.black26, blurRadius: 6, offset: Offset(0, 2))],
                      ),
                      child: const Icon(Icons.flag_rounded, color: Colors.white, size: 22),
                    ),
                  ),
                  if (user != null)
                    Marker(
                      point: user,
                      width: 52,
                      height: 52,
                      child: _UserMarker(heading: widget.heading, moving: moving),
                    ),
                ]),
                RichAttributionWidget(
                  showFlutterMapAttribution: false,
                  attributions: [
                    TextSourceAttribution(
                      _satellite ? 'Esri, Maxar, Earthstar Geographics' : 'Esri, HERE, Garmin, OpenStreetMap',
                      onTap: () => launchUrl(
                        Uri.parse('https://www.esri.com/en-us/legal/terms/data-attributions'),
                        mode: LaunchMode.externalApplication,
                      ),
                    ),
                  ],
                ),
              ],
            ),
            Positioned(
              right: 10,
              top: 10,
              child: Column(
                children: [
                  _MapButton(
                    tooltip: 'Xem cả bạn và trạm',
                    icon: Icons.center_focus_strong_rounded,
                    onPressed: _fitBoth,
                  ),
                  const SizedBox(height: 8),
                  _MapButton(
                    tooltip: _satellite ? 'Bản đồ đường phố' : 'Ảnh vệ tinh',
                    icon: _satellite ? Icons.map_rounded : Icons.satellite_alt_rounded,
                    onPressed: () => setState(() => _satellite = !_satellite),
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

class _MapButton extends StatelessWidget {
  final String tooltip;
  final IconData icon;
  final VoidCallback onPressed;

  const _MapButton({required this.tooltip, required this.icon, required this.onPressed});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      shape: const CircleBorder(),
      elevation: 3,
      child: IconButton(
        tooltip: tooltip,
        onPressed: onPressed,
        icon: Icon(icon, color: AppCultureColors.oceanDark),
      ),
    );
  }
}

/// Chấm xanh vị trí du khách; khi đang di chuyển thì thành mũi tên chỉ hướng đi.
class _UserMarker extends StatelessWidget {
  final double? heading;
  final bool moving;

  const _UserMarker({required this.heading, required this.moving});

  @override
  Widget build(BuildContext context) {
    return Stack(
      alignment: Alignment.center,
      children: [
        Container(
          width: 52,
          height: 52,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: AppCultureColors.oceanBlue.withValues(alpha: 0.18),
          ),
        ),
        if (moving)
          Transform.rotate(
            angle: (heading ?? 0) * math.pi / 180,
            child: Container(
              width: 30,
              height: 30,
              decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
              child: const Icon(Icons.navigation_rounded, color: AppCultureColors.oceanBlue, size: 24),
            ),
          )
        else
          Container(
            width: 20,
            height: 20,
            decoration: BoxDecoration(
              color: AppCultureColors.oceanBlue,
              shape: BoxShape.circle,
              border: Border.all(color: Colors.white, width: 3),
            ),
          ),
      ],
    );
  }
}
