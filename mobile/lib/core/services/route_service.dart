import 'package:latlong2/latlong.dart';
import 'api_client.dart';

/// Phương tiện chỉ đường. Goong không có chế độ đi bộ: `walk` đi theo tuyến xe 2 bánh,
/// backend tính lại thời gian theo tốc độ đi bộ.
enum RouteVehicle {
  walk('walk', 'Đi bộ'),
  bike('bike', 'Xe 2 bánh'),
  car('car', 'Ô tô');

  final String code;
  final String label;

  const RouteVehicle(this.code, this.label);
}

/// Một bước chỉ đường: thao tác tại [start], rồi đi tiếp [distanceMeters].
class RouteStep {
  final String instruction;
  final String maneuver;
  final int distanceMeters;
  final int durationSeconds;
  final LatLng start;

  const RouteStep({
    required this.instruction,
    required this.maneuver,
    required this.distanceMeters,
    required this.durationSeconds,
    required this.start,
  });

  factory RouteStep.fromJson(Map<String, dynamic> j) => RouteStep(
        instruction: (j['instruction'] ?? '').toString(),
        maneuver: (j['maneuver'] ?? '').toString(),
        distanceMeters: (j['distanceMeters'] as num?)?.toInt() ?? 0,
        durationSeconds: (j['durationSeconds'] as num?)?.toInt() ?? 0,
        start: LatLng((j['lat'] as num?)?.toDouble() ?? 0, (j['lng'] as num?)?.toDouble() ?? 0),
      );
}

/// Tuyến đường tới điểm đến, kèm các bước chỉ đường tiếng Việt.
class RouteModel {
  final int distanceMeters;
  final int durationSeconds;
  final List<LatLng> points;
  final List<RouteStep> steps;

  const RouteModel({
    required this.distanceMeters,
    required this.durationSeconds,
    required this.points,
    required this.steps,
  });

  factory RouteModel.fromJson(Map<String, dynamic> j) => RouteModel(
        distanceMeters: (j['distanceMeters'] as num?)?.toInt() ?? 0,
        durationSeconds: (j['durationSeconds'] as num?)?.toInt() ?? 0,
        points: [
          for (final p in (j['points'] as List? ?? const []))
            if (p is List && p.length >= 2) LatLng((p[0] as num).toDouble(), (p[1] as num).toDouble()),
        ],
        steps: ApiClient.asList(j['steps']).map(RouteStep.fromJson).toList(),
      );
}

/// Chỉ đường qua backend (GET /geo/direction); khoá Goong nằm ở máy chủ.
class RouteService {
  static final RouteService _instance = RouteService._internal();
  factory RouteService() => _instance;
  RouteService._internal();

  /// Null khi không tìm được đường giữa hai điểm.
  Future<RouteModel?> direction(LatLng from, LatLng to, {RouteVehicle vehicle = RouteVehicle.bike}) async {
    final data = await ApiClient.request(
      'GET',
      '/geo/direction?fromLat=${from.latitude}&fromLng=${from.longitude}'
          '&toLat=${to.latitude}&toLng=${to.longitude}&vehicle=${vehicle.code}',
    );
    if (data is! Map) return null;
    final route = RouteModel.fromJson(Map<String, dynamic>.from(data));
    return route.points.length < 2 ? null : route;
  }
}
