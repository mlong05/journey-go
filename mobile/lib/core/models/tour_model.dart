import '../../l10n/locale_controller.dart';
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

int? _asIntOrNull(dynamic value) {
  if (value == null) return null;
  if (value is num) return value.toInt();
  return int.tryParse(value.toString());
}

String? _textOrNull(dynamic value) {
  final s = value?.toString().trim() ?? '';
  return s.isEmpty ? null : s;
}

/// Thời lượng tour: "4 giờ 30 phút" (trong ngày), "3N2Đ" (nhiều ngày), "2 ngày" (tour luồng cũ).
String formatTourDuration({String? format, int? minutes, int days = 0, int? nights}) {
  // Getter trong model không có BuildContext ⇒ đọc ngôn ngữ đang chọn trực tiếp;
  // MaterialApp dựng lại khi đổi ngôn ngữ nên chuỗi luôn được tính lại.
  final l10n = appL10n;
  if (format == 'DAY_TRIP' && minutes != null && minutes > 0) {
    final h = minutes ~/ 60;
    final m = minutes % 60;
    if (h == 0) return l10n.durationMinutes(m);
    return m == 0 ? l10n.durationHours(h) : l10n.durationHoursMinutes(h, m);
  }
  if (format == 'MULTI_DAY' && days > 0) {
    return nights != null && nights > 0 ? l10n.durationDaysNights(days, nights) : l10n.durationDays(days);
  }
  if (format == 'DAY_TRIP') return l10n.durationDayTrip;
  return l10n.durationDays(days <= 1 ? 1 : days);
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

  // ── Tour tạo theo luồng 5 bước ────────────────────────────────────────────
  /// true = tour 5 bước (điểm dừng riêng, lịch trình, bảng giá); false = tour luồng cũ.
  final bool wizardTour;

  /// DAY_TRIP / MULTI_DAY; null với tour luồng cũ.
  final String? tourFormat;
  final int? durationMinutes;
  final int? durationNights;
  final int? regionId;
  final String? regionName;
  final int? themeId;
  final String? themeName;
  final int stopCount;

  /// Ngày khởi hành gần nhất từ hôm nay; null nếu không còn ngày nào.
  final DateTime? nextDepartureDate;

  /// Nhà tour cung cấp tour (tên + id) — dùng cho nút chat hỗ trợ trước khi mua.
  final String? providerName;
  final int? providerId;

  /// Đánh giá xác thực từ du khách đã trải nghiệm.
  final double? averageRating;
  final int reviewCount;

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
    this.wizardTour = false,
    this.tourFormat,
    this.durationMinutes,
    this.durationNights,
    this.regionId,
    this.regionName,
    this.themeId,
    this.themeName,
    this.stopCount = 0,
    this.nextDepartureDate,
    this.providerName,
    this.providerId,
    this.averageRating,
    this.reviewCount = 0,
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
      wizardTour: json['wizardTour'] == true,
      tourFormat: json['tourFormat']?.toString(),
      durationMinutes: _asIntOrNull(json['durationMinutes']),
      durationNights: _asIntOrNull(json['durationNights']),
      regionId: _asIntOrNull(json['regionId']),
      regionName: _textOrNull(json['regionName']),
      themeId: _asIntOrNull(json['themeId']),
      themeName: _textOrNull(json['themeName']),
      stopCount: _asInt(json['stopCount']),
      nextDepartureDate: DateTime.tryParse(json['nextDepartureDate']?.toString() ?? ''),
      providerName: json['providerName']?.toString() ??
          json['createdBy']?.toString(),
      providerId: _asIntOrNull(json['providerId']),
      averageRating: _asDoubleOrNull(json['averageRating']),
      reviewCount: _asInt(json['reviewCount']),
    );
  }

  bool get hasRewards => taskCount > 0 || totalTaskPoints > 0 || badgeCount > 0;

  /// Tour 5 bước đếm điểm dừng, tour luồng cũ đếm điểm đến.
  int get destinationCount => wizardTour ? stopCount : destinations.length;

  String get formattedPrice => formatVndPrice(price);

  String get formattedDuration => formatTourDuration(
        format: tourFormat,
        minutes: durationMinutes,
        days: durationDays,
        nights: durationNights,
      );

  /// Chủ đề của tour 5 bước; tour luồng cũ dùng loại hình.
  String get typeLabel => themeName ?? tourTypeLabel(tourType);

  /// Tóm tắt lộ trình: "Điểm A → Điểm B → Điểm C".
  String get routePreview => destinations.map((d) => d.name).join(' → ');
}

/// Giá VND theo ngôn ngữ đang chọn: "450.000 đ" / "450.000 VND" / "450.000ドン"; 0 ⇒ "Miễn phí".
String formatVndPrice(double price) {
  final l10n = appL10n;
  return price <= 0 ? l10n.tourPriceFree : l10n.priceVnd(formatThousands(price));
}

/// Nhãn loại hình tour theo ngôn ngữ đang chọn (khớp enum TourType ở backend).
String tourTypeLabel(String type) {
  final l10n = appL10n;
  switch (type) {
    case 'CULTURAL':
      return l10n.tourTypeCultural;
    case 'ADVENTURE':
      return l10n.tourTypeAdventure;
    case 'BEACH':
      return l10n.tourTypeBeach;
    case 'MOUNTAIN':
      return l10n.tourTypeMountain;
    case 'CITY':
      return l10n.tourTypeCity;
    case 'ECOTOURISM':
      return l10n.tourTypeEco;
    case 'HISTORICAL':
      return l10n.tourTypeHistorical;
    case 'GASTRONOMY':
      return l10n.tourTypeGastronomy;
    default:
      return l10n.tourTypeOther;
  }
}
