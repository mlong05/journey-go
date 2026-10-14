class DestinationModel {
  final int id;
  final String name;
  final String address;
  final double latitude;
  final double longitude;
  final int capacity;
  final bool approved;
  final bool deleted;
  final String? createdBy;
  final String? createdAt;
  final String? updatedAt;

  // Thuộc tính hiển thị mở rộng cho giao diện Lộ trình & Trang chủ
  final String coverImage;
  final String duration;
  final String ticketPrice;
  final int numericPrice;
  final String rewardPoints;
  final double rating;
  final int reviewCount;
  final String category;
  final List<String> tags;
  final List<DestinationStop> stops;

  DestinationModel({
    required this.id,
    required this.name,
    required this.address,
    required this.latitude,
    required this.longitude,
    required this.capacity,
    required this.approved,
    required this.deleted,
    this.createdBy,
    this.createdAt,
    this.updatedAt,
    String? coverImage,
    String? duration,
    String? ticketPrice,
    int? numericPrice,
    String? rewardPoints,
    double? rating,
    int? reviewCount,
    String? category,
    List<String>? tags,
    List<DestinationStop>? stops,
  })  : coverImage = coverImage ?? _defaultCoverFor(name),
        duration = duration ?? _defaultDurationFor(name),
        ticketPrice = ticketPrice ?? _defaultPriceFor(name),
        numericPrice = numericPrice ?? _defaultNumericPriceFor(name),
        rewardPoints = rewardPoints ?? '+150 pts',
        rating = rating ?? 4.8,
        reviewCount = reviewCount ?? 1240,
        category = category ?? _defaultCategoryFor(name),
        tags = tags ?? _defaultTagsFor(name),
        stops = stops ?? _defaultStopsFor(name);

  static String _defaultCoverFor(String name) {
    final lower = name.toLowerCase();
    if (lower.contains('văn miếu') || lower.contains('quốc tử giám')) {
      return 'assets/images/vanmieu.png';
    } else if (lower.contains('thăng long') || lower.contains('hoàng thành')) {
      return 'assets/images/thanglong.png';
    } else if (lower.contains('bát tràng') || lower.contains('gốm')) {
      return 'assets/images/gomsu.png';
    } else if (lower.contains('tràng an') || lower.contains('ninh bình')) {
      return 'assets/images/trangan.png';
    } else if (lower.contains('bảo tàng') || lower.contains('lịch sử')) {
      return 'assets/images/baotang.png';
    }
    return 'assets/images/vanmieu.png';
  }

  static String _defaultDurationFor(String name) {
    final lower = name.toLowerCase();
    if (lower.contains('bát tràng')) return 'Nửa ngày';
    if (lower.contains('tràng an')) return '1 ngày';
    if (lower.contains('thăng long')) return '1 ngày';
    return 'Nửa ngày (3.5 giờ)';
  }

  static String _defaultPriceFor(String name) {
    final lower = name.toLowerCase();
    if (lower.contains('bát tràng')) return 'Miễn phí';
    if (lower.contains('thăng long')) return '80.000 đ';
    if (lower.contains('tràng an')) return '250.000 đ';
    if (lower.contains('văn miếu')) return '50.000 đ';
    return 'Miễn phí';
  }

  static int _defaultNumericPriceFor(String name) {
    final lower = name.toLowerCase();
    if (lower.contains('bát tràng')) return 0;
    if (lower.contains('thăng long')) return 80000;
    if (lower.contains('tràng an')) return 250000;
    if (lower.contains('văn miếu')) return 50000;
    return 0;
  }

  static String _defaultCategoryFor(String name) {
    final lower = name.toLowerCase();
    if (lower.contains('bát tràng') || lower.contains('gốm')) return 'craft';
    if (lower.contains('tràng an')) return 'scenery';
    return 'history';
  }

  static List<String> _defaultTagsFor(String name) {
    final lower = name.toLowerCase();
    if (lower.contains('bát tràng')) return ['Làng nghề', 'Thủ công', 'Trải nghiệm'];
    if (lower.contains('tràng an')) return ['UNESCO', 'Thiên nhiên', 'Tâm linh', 'Chèo thuyền'];
    if (lower.contains('thăng long')) return ['Lịch sử', 'Kiến trúc', 'UNESCO'];
    return ['Di tích', 'Lịch sử', 'Văn hóa'];
  }

  static List<DestinationStop> _defaultStopsFor(String name) {
    final lower = name.toLowerCase();
    if (lower.contains('thăng long')) {
      return [
        DestinationStop(order: 1, name: 'Văn Miếu – Quốc Tử Giám', duration: '2 giờ'),
        DestinationStop(order: 2, name: 'Hoàng Thành Thăng Long', duration: '2.5 giờ'),
        DestinationStop(order: 3, name: 'Hồ Tây – Chùa Trấn Quốc', duration: '1 giờ'),
      ];
    } else if (lower.contains('bát tràng')) {
      return [
        DestinationStop(order: 1, name: 'Chợ Gốm Bát Tràng', duration: '45 phút'),
        DestinationStop(order: 2, name: 'Xưởng thủ công truyền thống', duration: '1.5 giờ'),
        DestinationStop(order: 3, name: 'Bảo tàng Gốm sứ Bát Tràng', duration: '30 phút'),
      ];
    } else if (lower.contains('tràng an')) {
      return [
        DestinationStop(order: 1, name: 'Bến thuyền Tràng An', duration: '3 giờ'),
        DestinationStop(order: 2, name: 'Đền Trần', duration: '1 giờ'),
        DestinationStop(order: 3, name: 'Chùa Bái Đính', duration: '1.5 giờ'),
      ];
    }
    return [
      DestinationStop(order: 1, name: 'Cổng Tam Quan', duration: '30 phút'),
      DestinationStop(order: 2, name: 'Khu Di tích Chính', duration: '1.5 giờ'),
      DestinationStop(order: 3, name: 'Nhà trưng bày hiện vật', duration: '45 phút'),
    ];
  }

  factory DestinationModel.fromJson(Map<String, dynamic> json) {
    return DestinationModel(
      id: json['id'] is num ? (json['id'] as num).toInt() : int.tryParse(json['id']?.toString() ?? '0') ?? 0,
      name: json['name']?.toString() ?? '',
      address: json['address']?.toString() ?? '',
      latitude: json['latitude'] is num ? (json['latitude'] as num).toDouble() : double.tryParse(json['latitude']?.toString() ?? '0') ?? 0.0,
      longitude: json['longitude'] is num ? (json['longitude'] as num).toDouble() : double.tryParse(json['longitude']?.toString() ?? '0') ?? 0.0,
      capacity: json['capacity'] is num ? (json['capacity'] as num).toInt() : int.tryParse(json['capacity']?.toString() ?? '1000') ?? 1000,
      approved: json['approved'] == true,
      deleted: json['deleted'] == true,
      createdBy: json['createdBy']?.toString(),
      createdAt: json['createdAt']?.toString(),
      updatedAt: json['updatedAt']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'address': address,
      'latitude': latitude,
      'longitude': longitude,
      'capacity': capacity,
      'approved': approved,
      'deleted': deleted,
      'createdBy': createdBy,
      'createdAt': createdAt,
      'updatedAt': updatedAt,
    };
  }
}

class DestinationStop {
  final int order;
  final String name;
  final String duration;

  DestinationStop({
    required this.order,
    required this.name,
    required this.duration,
  });

  factory DestinationStop.fromJson(Map<String, dynamic> json) {
    return DestinationStop(
      order: json['order'] is num ? (json['order'] as num).toInt() : 1,
      name: json['name']?.toString() ?? '',
      duration: json['duration']?.toString() ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
    'order': order,
    'name': name,
    'duration': duration,
  };
}
