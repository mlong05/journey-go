import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:vector_map_tiles/vector_map_tiles.dart';
import '../../core/constants/app_colors.dart';
import '../../core/services/goong_map_style.dart';

// Bộ phận dùng chung cho các bản đồ trải nghiệm (hành trình, dẫn đường tới trạm).

// ── Nguồn bản đồ: chỉ dùng Goong ─────────────────────────────────────────────
// Cần GOONG_MAPTILES_KEY trong .env (xem GoongMapStyle):
//  - Đường phố: bản đồ vector Goong.
//  - Vệ tinh: ảnh vệ tinh Goong (satellite.goong.io) + lớp tên địa danh của style goong_satellite.
// Đã bỏ hẳn ảnh nền Esri (nặng, tải chậm). Trong lúc style Goong đang tải, bản đồ chỉ hiện màu nền.

const mapBackground = Color(0xFFEFF3F1);

/// Lớp nền bản đồ (Goong). Chưa có khóa Goong thì không có lớp nền — chỉ hiện màu [mapBackground].
List<Widget> baseTileLayers({required bool satellite}) {
  final satelliteUrl = GoongMapStyle.satelliteTileUrl;
  if (satelliteUrl == null) {
    debugPrint('Chưa cấu hình GOONG_MAPTILES_KEY — bản đồ không có lớp nền.');
    return const [];
  }
  if (!satellite) return const [_GoongVectorLayer(key: ValueKey('street-goong'), satellite: false)];
  return [
    TileLayer(
      key: const ValueKey('satellite-goong'),
      urlTemplate: satelliteUrl,
      userAgentPackageName: 'com.journeygo.mobile',
      maxNativeZoom: 20,
    ),
    const _GoongVectorLayer(key: ValueKey('satellite-goong-labels'), satellite: true),
  ];
}

/// Lớp vector Goong: bản đồ đường phố, hoặc tên địa danh + đường phủ lên ảnh vệ tinh.
/// Style được tải một lần mỗi phiên (đã tải sẵn từ lúc mở app); trong lúc tải thì không vẽ gì.
class _GoongVectorLayer extends StatefulWidget {
  final bool satellite;

  const _GoongVectorLayer({super.key, required this.satellite});

  @override
  State<_GoongVectorLayer> createState() => _GoongVectorLayerState();
}

class _GoongVectorLayerState extends State<_GoongVectorLayer> {
  late final Future<Style?> _style =
      widget.satellite ? GoongMapStyle.satelliteLabels() : GoongMapStyle.street();

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<Style?>(
      future: _style,
      builder: (context, snap) {
        final style = snap.data;
        if (style == null) return const SizedBox.shrink();
        return VectorTileLayer(
          key: ValueKey(widget.satellite ? 'goong-satellite-labels' : 'goong-vector'),
          theme: style.theme,
          sprites: style.sprites,
          tileProviders: style.providers,
          // Vẽ dạng vector: chữ và đường nét sắc khi phóng to, xoay/thu phóng mượt hơn.
          layerMode: VectorTileLayerMode.vector,
          maximumZoom: 20,
        );
      },
    );
  }
}

/// Ghi nguồn bản đồ (bắt buộc theo điều khoản Goong). Đặt trong bảng trượt vì bảng che góc dưới bản đồ.
class MapAttributionText extends StatelessWidget {
  /// Giữ tham số để các màn hình gọi không phải đổi; nguồn bản đồ luôn là Goong.
  final bool satellite;

  const MapAttributionText({super.key, required this.satellite});

  @override
  Widget build(BuildContext context) {
    if (!GoongMapStyle.configured) return const SizedBox.shrink();
    return GestureDetector(
      onTap: () => launchUrl(Uri.parse('https://goong.io'), mode: LaunchMode.externalApplication),
      child: const Text(
        'Bản đồ: © Goong',
        textAlign: TextAlign.center,
        style: TextStyle(fontSize: 10.5, color: AppCultureColors.textLight),
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
                fontWeight: FontWeight.w700,
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
