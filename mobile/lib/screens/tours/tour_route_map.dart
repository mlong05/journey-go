import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../../core/constants/app_colors.dart';
import '../../core/models/tour_model.dart';
import '../journey/map_kit.dart'
    show baseTileLayers, mapBackground, MapAttributionText;

/// Bản đồ nhỏ của lộ trình tour: các điểm đến đánh số, nối theo thứ tự bằng đường nét đứt.
/// Đường nối là đường chim bay giữa các điểm (chưa phải chỉ đường theo đường bộ).
/// Ẩn hẳn khi không điểm đến nào có tọa độ.
class TourRouteMap extends StatelessWidget {
  final List<TourDestinationModel> destinations;
  final ValueChanged<TourDestinationModel>? onTapStop;

  const TourRouteMap({super.key, required this.destinations, this.onTapStop});

  @override
  Widget build(BuildContext context) {
    final stops = destinations.where((d) => d.hasLocation).toList();
    if (stops.isEmpty) return const SizedBox.shrink();
    final points = [for (final d in stops) LatLng(d.latitude!, d.longitude!)];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(20),
          child: SizedBox(
            height: 190,
            child: FlutterMap(
              options: MapOptions(
                initialCenter: points.first,
                initialZoom: 14,
                initialCameraFit: points.length > 1
                    ? CameraFit.coordinates(
                        coordinates: points,
                        padding: const EdgeInsets.all(42),
                        maxZoom: 15,
                      )
                    : null,
                // Xem nhanh: cho kéo và phóng to, không xoay để số thứ tự luôn đứng thẳng
                interactionOptions: const InteractionOptions(
                  flags:
                      InteractiveFlag.drag |
                      InteractiveFlag.pinchZoom |
                      InteractiveFlag.doubleTapZoom,
                ),
                backgroundColor: mapBackground,
              ),
              children: [
                ...baseTileLayers(satellite: false),
                if (points.length > 1)
                  PolylineLayer(
                    polylines: [
                      Polyline(
                        points: points,
                        strokeWidth: 4,
                        color: AppCultureColors.heritageJade,
                        borderStrokeWidth: 2,
                        borderColor: Colors.white,
                        pattern: StrokePattern.dashed(segments: const [10, 7]),
                      ),
                    ],
                  ),
                MarkerLayer(
                  markers: [
                    for (var i = 0; i < stops.length; i++)
                      Marker(
                        point: points[i],
                        width: 34,
                        height: 34,
                        child: GestureDetector(
                          onTap: onTapStop == null
                              ? null
                              : () => onTapStop!(stops[i]),
                          child: _StopMarker(
                            number: stops[i].sequenceOrder,
                            isLast: i == stops.length - 1,
                          ),
                        ),
                      ),
                  ],
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 6),
        const MapAttributionText(satellite: false),
      ],
    );
  }
}

class _StopMarker extends StatelessWidget {
  final int number;
  final bool isLast;

  const _StopMarker({required this.number, required this.isLast});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: LinearGradient(
          colors: isLast
              ? const [Color(0xFFF59E0B), Color(0xFFD97706)]
              : const [
                  AppCultureColors.jadeGradientStart,
                  AppCultureColors.jadeGradientEnd,
                ],
        ),
        border: Border.all(color: Colors.white, width: 3),
        boxShadow: const [
          BoxShadow(color: Colors.black26, blurRadius: 6, offset: Offset(0, 2)),
        ],
      ),
      alignment: Alignment.center,
      child: isLast
          ? const Icon(Icons.flag_rounded, size: 15, color: Colors.white)
          : Text(
              '$number',
              style: const TextStyle(
                color: Colors.white,
                fontSize: 13,
                fontWeight: FontWeight.w700,
              ),
            ),
    );
  }
}
