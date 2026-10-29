import 'dart:async';
import 'package:geolocator/geolocator.dart';

/// Lỗi định vị với thông điệp tiếng Việt hiển thị trực tiếp cho du khách.
class LocationException implements Exception {
  final String message;

  /// true khi cần mở cài đặt hệ thống để cấp quyền / bật GPS.
  final bool needsSettings;

  const LocationException(this.message, {this.needsSettings = false});

  @override
  String toString() => message;
}

/// Lấy vị trí hiện tại, xin quyền khi cần.
class LocationService {
  LocationService._();

  static Future<Position> currentPosition() async {
    if (!await Geolocator.isLocationServiceEnabled()) {
      throw const LocationException(
        'GPS đang tắt. Hãy bật định vị để xác thực vị trí của bạn.',
        needsSettings: true,
      );
    }

    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.denied) {
      throw const LocationException('Bạn cần cho phép truy cập vị trí để check-in tại điểm đến.');
    }
    if (permission == LocationPermission.deniedForever) {
      throw const LocationException(
        'Quyền vị trí đã bị chặn. Hãy cấp lại trong Cài đặt của ứng dụng.',
        needsSettings: true,
      );
    }

    try {
      return await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.high),
      ).timeout(const Duration(seconds: 20));
    } on TimeoutException {
      throw const LocationException('Chưa xác định được vị trí. Hãy ra nơi thoáng hơn rồi thử lại.');
    }
  }

  /// Theo dõi vị trí liên tục (gọi sau khi đã xin quyền qua [currentPosition]).
  /// Phát khi di chuyển từ 2 m trở lên, đủ mượt để dẫn đường đi bộ mà không tốn pin.
  static Stream<Position> positionStream() => Geolocator.getPositionStream(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.high, distanceFilter: 2),
      );

  static Future<void> openSettings() async {
    await Geolocator.openLocationSettings();
    await Geolocator.openAppSettings();
  }

  /// Khoảng cách (mét) giữa hai điểm.
  static double distanceMeters(double lat1, double lng1, double lat2, double lng2) =>
      Geolocator.distanceBetween(lat1, lng1, lat2, lng2);
}
