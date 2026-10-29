import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/constants/app_colors.dart';

// Bộ phận dùng chung cho các bản đồ trải nghiệm (hành trình, dẫn đường tới trạm).

// ── Nguồn ảnh bản đồ ──────────────────────────────────────────────────────────
// Đã kiểm tra tại Việt Nam, không cần khóa API:
//  - tile.openstreetmap.org bị chặn trên một số mạng (Connection refused).
//  - CARTO trả ảnh "API KEY REQUIRED" cho yêu cầu từ ứng dụng không có khóa.
//  - Esri World Street Map: đường phố có tên tiếng Việt; World Imagery: ảnh vệ tinh.
const _streetUrl =
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}';
const _satelliteUrl =
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const _satelliteLabelsUrl =
    'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';

const mapBackground = Color(0xFFEFF3F1);

/// Lớp nền: đường phố hoặc ảnh vệ tinh (kèm tên địa danh).
List<Widget> baseTileLayers({required bool satellite}) => satellite
    ? [
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
      ]
    : [
        TileLayer(
          key: const ValueKey('street'),
          urlTemplate: _streetUrl,
          userAgentPackageName: 'com.journeygo.mobile',
          maxNativeZoom: 19,
        ),
      ];

/// Ghi nguồn bản đồ (bắt buộc theo điều khoản Esri). Đặt trong bảng trượt vì bảng che góc dưới bản đồ.
class MapAttributionText extends StatelessWidget {
  final bool satellite;

  const MapAttributionText({super.key, required this.satellite});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => launchUrl(
        Uri.parse('https://www.esri.com/en-us/legal/terms/data-attributions'),
        mode: LaunchMode.externalApplication,
      ),
      child: Text(
        'Bản đồ: ${satellite ? 'Esri, Maxar, Earthstar Geographics' : 'Esri, HERE, Garmin, OpenStreetMap'}',
        textAlign: TextAlign.center,
        style: const TextStyle(fontSize: 10.5, color: AppCultureColors.textLight),
      ),
    );
  }
}

// ── Hướng và khoảng cách ─────────────────────────────────────────────────────

/// Hướng la bàn (0° = Bắc, theo chiều kim đồng hồ) đổi sang tiếng Việt.
String compassLabel(double bearing) {
  const names = ['Bắc', 'Đông Bắc', 'Đông', 'Đông Nam', 'Nam', 'Tây Nam', 'Tây', 'Tây Bắc'];
  final normalized = (bearing % 360 + 360) % 360;
  return names[((normalized + 22.5) ~/ 45) % 8];
}

/// Gợi ý rẽ khi biết hướng đang đi ([heading]) và hướng tới đích ([bearing]).
String turnHint(double heading, double bearing) {
  final diff = ((bearing - heading + 540) % 360) - 180; // -180..180, dương = lệch sang phải
  final abs = diff.abs();
  if (abs <= 25) return 'Đi thẳng';
  if (abs >= 150) return 'Quay lại';
  return diff > 0 ? 'Rẽ phải' : 'Rẽ trái';
}

/// Góc phương vị từ [from] tới [to] (0..360°).
double bearingBetween(LatLng from, LatLng to) => (const Distance().bearing(from, to) + 360) % 360;

int distanceMeters(LatLng a, LatLng b) => const Distance().as(LengthUnit.Meter, a, b).round();

String formatDistance(int meters) =>
    meters >= 1000 ? '${(meters / 1000).toStringAsFixed(meters >= 10000 ? 0 : 1)} km' : '$meters m';

// ── Thành phần giao diện ──────────────────────────────────────────────────────

/// Nút tròn trắng nổi trên bản đồ.
class MapRoundButton extends StatelessWidget {
  final IconData icon;
  final String tooltip;
  final VoidCallback? onPressed;
  final Color color;

  const MapRoundButton({
    super.key,
    required this.icon,
    required this.tooltip,
    required this.onPressed,
    this.color = AppCultureColors.textDark,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      shape: const CircleBorder(),
      elevation: 4,
      shadowColor: Colors.black38,
      child: IconButton(
        tooltip: tooltip,
        onPressed: onPressed,
        icon: Icon(icon, color: color, size: 22),
      ),
    );
  }
}

/// Chấm vị trí du khách có quầng sáng nhấp nháy; khi đang đi thì thành mũi tên chỉ hướng.
class UserLocationMarker extends StatefulWidget {
  final double? heading;

  const UserLocationMarker({super.key, required this.heading});

  @override
  State<UserLocationMarker> createState() => _UserLocationMarkerState();
}

class _UserLocationMarkerState extends State<UserLocationMarker> with SingleTickerProviderStateMixin {
  late final AnimationController _pulse =
      AnimationController(vsync: this, duration: const Duration(milliseconds: 1800))..repeat();

  @override
  void dispose() {
    _pulse.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final heading = widget.heading;
    return Stack(
      alignment: Alignment.center,
      children: [
        AnimatedBuilder(
          animation: _pulse,
          builder: (_, _) => Container(
            width: 24 + 40 * _pulse.value,
            height: 24 + 40 * _pulse.value,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: AppCultureColors.oceanBlue.withValues(alpha: 0.28 * (1 - _pulse.value)),
            ),
          ),
        ),
        if (heading != null)
          Transform.rotate(
            angle: heading * math.pi / 180,
            child: Container(
              width: 32,
              height: 32,
              decoration: const BoxDecoration(
                color: Colors.white,
                shape: BoxShape.circle,
                boxShadow: [BoxShadow(color: Colors.black26, blurRadius: 6)],
              ),
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
              boxShadow: const [BoxShadow(color: Colors.black26, blurRadius: 6)],
            ),
          ),
      ],
    );
  }
}

/// Ghim điểm đến / trạm: vòng tròn màu có biểu tượng hoặc số, kèm nhãn tên phía dưới.
class PlacePin extends StatelessWidget {
  final String? label;
  final Widget child;
  final Color color;
  final bool emphasized;

  const PlacePin({
    super.key,
    required this.child,
    required this.color,
    this.label,
    this.emphasized = false,
  });

  /// Kích thước Marker cần dành cho ghim (vòng tròn + nhãn).
  static const double markerWidth = 150;
  static const double markerHeight = 84;

  @override
  Widget build(BuildContext context) {
    final size = emphasized ? 46.0 : 36.0;
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: size,
          height: size,
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
            border: Border.all(color: Colors.white, width: 3),
            boxShadow: const [BoxShadow(color: Colors.black26, blurRadius: 6, offset: Offset(0, 2))],
          ),
          child: Center(child: child),
        ),
        if (label != null && label!.isNotEmpty) ...[
          const SizedBox(height: 4),
          Container(
            constraints: const BoxConstraints(maxWidth: markerWidth),
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(10),
              boxShadow: const [BoxShadow(color: Colors.black26, blurRadius: 4)],
            ),
            child: Text(
              label!,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 11.5,
                fontWeight: FontWeight.w800,
                color: emphasized ? AppCultureColors.textDark : AppCultureColors.textMuted,
              ),
            ),
          ),
        ],
      ],
    );
  }
}

/// Vòng bán kính nhấp nháy quanh đích đến hiện tại.
class PulsingRadius extends StatefulWidget {
  final LatLng center;
  final double radiusMeters;
  final Color color;

  const PulsingRadius({super.key, required this.center, required this.radiusMeters, required this.color});

  @override
  State<PulsingRadius> createState() => _PulsingRadiusState();
}

class _PulsingRadiusState extends State<PulsingRadius> with SingleTickerProviderStateMixin {
  late final AnimationController _anim =
      AnimationController(vsync: this, duration: const Duration(milliseconds: 2200))..repeat(reverse: true);

  @override
  void dispose() {
    _anim.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _anim,
      builder: (_, _) => CircleLayer(circles: [
        CircleMarker(
          point: widget.center,
          radius: widget.radiusMeters,
          useRadiusInMeter: true,
          color: widget.color.withValues(alpha: 0.12 + 0.12 * _anim.value),
          borderColor: widget.color,
          borderStrokeWidth: 2,
        ),
      ]),
    );
  }
}
