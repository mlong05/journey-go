import 'gamification_model.dart' show formatThousands;

int _asInt(dynamic value) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  return int.tryParse(value?.toString() ?? '') ?? 0;
}

double _asDouble(dynamic value) {
  if (value is num) return value.toDouble();
  return double.tryParse(value?.toString() ?? '') ?? 0;
}

/// Một điểm đến trong hành trình của tour (theo thứ tự).
class TourDestinationModel {
  final int destinationId;
  final int sequenceOrder;
  final String name;
  final String address;
  final double? latitude;
  final double? longitude;
  final String? coverImageUrl;

  const TourDestinationModel({
    required this.destinationId,
    required this.sequenceOrder,
    required this.name,
    required this.address,
    this.latitude,
    this.longitude,
    this.coverImageUrl,
  });

  factory TourDestinationModel.fromJson(Map<String, dynamic> json) =>
      TourDestinationModel(
        destinationId: _asInt(json['destinationId']),
        sequenceOrder: _asInt(json['sequenceOrder']),
        name: json['destinationName']?.toString() ?? '',
        address: json['destinationAddress']?.toString() ?? '',
        latitude: _asDoubleOrNull(json['latitude']),
        longitude: _asDoubleOrNull(json['longitude']),
        coverImageUrl: _httpsOrNull(json['coverImageUrl']),
      );

  bool get hasLocation => latitude != null && longitude != null;
}

/// Chỉ nhận đường dẫn ảnh http(s); chuỗi rỗng hay giá trị lạ coi như chưa có ảnh.
String? _httpsOrNull(dynamic value) {
  final s = value?.toString().trim() ?? '';
  return s.startsWith('http') ? s : null;
}

double? _asDoubleOrNull(dynamic value) {
  if (value == null) return null;
  if (value is num) return value.toDouble();
  return double.tryParse(value.toString());
}

/// Tour đã xuất bản. `price` do backend tính = tổng giá các trải nghiệm đã xuất bản
/// của những điểm đến trong tour.
class TourModel {
  final int id;
  final String title;
  final String tourType;
  final double price;
  final int durationDays;
  final List<TourDestinationModel> destinations;

  /// Phần thưởng có thể nhận (backend tổng hợp): nhiệm vụ, tổng điểm nhiệm vụ, huy hiệu check-in.
  final int taskCount;
  final int totalTaskPoints;
  final int badgeCount;

  /// Ảnh bìa tour (backend lấy từ điểm đến đầu tiên có ảnh); null thì dùng nền gradient.
  final String? coverImageUrl;

  const TourModel({
    required this.id,
    required this.title,
    required this.tourType,
    required this.price,
    required this.durationDays,
    required this.destinations,
    this.taskCount = 0,
    this.totalTaskPoints = 0,
    this.badgeCount = 0,
    this.coverImageUrl,
  });

  factory TourModel.fromJson(Map<String, dynamic> json) {
    final raw = json['destinations'];
    final list = raw is List
        ? raw
              .whereType<Map<String, dynamic>>()
              .map(TourDestinationModel.fromJson)
              .toList()
        : <TourDestinationModel>[];
    list.sort((a, b) => a.sequenceOrder.compareTo(b.sequenceOrder));
    return TourModel(
      id: _asInt(json['tourId']),
      title: json['title']?.toString() ?? '',
      tourType: json['tourType']?.toString().toUpperCase() ?? 'OTHER',
      price: _asDouble(json['price']),
      durationDays: _asInt(json['durationDays']),
      destinations: list,
      taskCount: _asInt(json['taskCount']),
      totalTaskPoints: _asInt(json['totalTaskPoints']),
      badgeCount: _asInt(json['badgeCount']),
      coverImageUrl: _httpsOrNull(json['coverImageUrl']),
    );
  }

  bool get hasRewards => taskCount > 0 || totalTaskPoints > 0 || badgeCount > 0;

  int get destinationCount => destinations.length;

  String get formattedPrice =>
      price <= 0 ? 'Miễn phí' : '${formatThousands(price)} đ';

  String get formattedDuration =>
      durationDays <= 1 ? '1 ngày' : '$durationDays ngày';

  String get typeLabel => tourTypeLabel(tourType);

  /// Tóm tắt lộ trình: "Điểm A → Điểm B → Điểm C".
  String get routePreview => destinations.map((d) => d.name).join(' → ');
}

/// Nhãn tiếng Việt cho loại hình tour (khớp enum TourType ở backend).
String tourTypeLabel(String type) {
  switch (type) {
    case 'CULTURAL':
      return 'Văn hóa';
    case 'ADVENTURE':
      return 'Phiêu lưu';
    case 'BEACH':
      return 'Biển';
    case 'MOUNTAIN':
      return 'Núi';
    case 'CITY':
      return 'Thành phố';
    case 'ECOTOURISM':
      return 'Sinh thái';
    case 'HISTORICAL':
      return 'Lịch sử';
    case 'GASTRONOMY':
      return 'Ẩm thực';
    default:
      return 'Khác';
  }
}
