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

  const TourDestinationModel({
    required this.destinationId,
    required this.sequenceOrder,
    required this.name,
    required this.address,
  });

  factory TourDestinationModel.fromJson(Map<String, dynamic> json) =>
      TourDestinationModel(
        destinationId: _asInt(json['destinationId']),
        sequenceOrder: _asInt(json['sequenceOrder']),
        name: json['destinationName']?.toString() ?? '',
        address: json['destinationAddress']?.toString() ?? '',
      );
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

  const TourModel({
    required this.id,
    required this.title,
    required this.tourType,
    required this.price,
    required this.durationDays,
    required this.destinations,
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
    );
  }

  int get destinationCount => destinations.length;

  String get formattedPrice => price <= 0 ? 'Miễn phí' : '${formatThousands(price)} đ';

  String get formattedDuration => durationDays <= 1 ? '1 ngày' : '$durationDays ngày';

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
