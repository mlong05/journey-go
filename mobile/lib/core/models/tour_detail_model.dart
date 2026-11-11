import 'gamification_model.dart' show formatThousands;
import 'tour_model.dart';

int _asInt(dynamic value) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  return int.tryParse(value?.toString() ?? '') ?? 0;
}

int? _asIntOrNull(dynamic value) {
  if (value == null) return null;
  if (value is num) return value.toInt();
  return int.tryParse(value.toString());
}

double? _asDoubleOrNull(dynamic value) {
  if (value == null) return null;
  if (value is num) return value.toDouble();
  return double.tryParse(value.toString());
}

/// Chuỗi đã bỏ khoảng trắng; rỗng thì null để giao diện ẩn mục tương ứng.
String? _text(dynamic value) {
  final s = value?.toString().trim() ?? '';
  return s.isEmpty ? null : s;
}

String? _url(dynamic value) {
  final s = value?.toString().trim() ?? '';
  return s.startsWith('http') ? s : null;
}

List<String> _texts(dynamic value) =>
    value is List ? value.map(_text).whereType<String>().toList() : const [];

List<String> _urls(dynamic value) =>
    value is List ? value.map(_url).whereType<String>().toList() : const [];

List<Map<String, dynamic>> _maps(dynamic value) =>
    value is List ? value.whereType<Map<String, dynamic>>().toList() : const [];

String? _refName(dynamic value) => value is Map ? _text(value['name']) : null;

int? _refId(dynamic value) => value is Map ? _asIntOrNull(value['id']) : null;

/// Một ngày trong lịch trình (dạng chữ).
class TourItineraryDay {
  final int dayNumber;
  final String? title;
  final String? mainActivity;
  final String? content;

  const TourItineraryDay({required this.dayNumber, this.title, this.mainActivity, this.content});

  factory TourItineraryDay.fromJson(Map<String, dynamic> json) => TourItineraryDay(
        dayNumber: _asInt(json['dayNumber']),
        title: _text(json['title']),
        mainActivity: _text(json['mainActivity']),
        content: _text(json['content']),
      );
}

/// Giá theo loại khách (chỉ để hiển thị).
class TourGuestPrice {
  final String guestType;
  final String label;
  final String ageRange;
  final double price;
  final bool alwaysFree;

  const TourGuestPrice({
    required this.guestType,
    required this.label,
    required this.ageRange,
    required this.price,
    required this.alwaysFree,
  });

  factory TourGuestPrice.fromJson(Map<String, dynamic> json) => TourGuestPrice(
        guestType: json['guestType']?.toString() ?? '',
        label: json['label']?.toString() ?? '',
        ageRange: json['ageRange']?.toString() ?? '',
        price: _asDoubleOrNull(json['price']) ?? 0,
        alwaysFree: json['alwaysFree'] == true,
      );

  String get formattedPrice => alwaysFree || price <= 0 ? 'Miễn phí' : '${formatThousands(price)} đ';
}

/// Hiện vật tại điểm dừng.
class TourArtifact {
  final String name;
  final String? imageUrl;
  final String? shortDescription;
  final String? videoUrl;

  const TourArtifact({required this.name, this.imageUrl, this.shortDescription, this.videoUrl});

  factory TourArtifact.fromJson(Map<String, dynamic> json) => TourArtifact(
        name: json['name']?.toString() ?? '',
        imageUrl: _url(json['imageUrl']),
        shortDescription: _text(json['shortDescription']),
        videoUrl: _url(json['videoUrl']),
      );
}

/// Nội dung văn hoá của điểm dừng, chỉ có sau khi check-in: `GET /journeys/{id}/destinations/{stopId}/culture`.
class StopCulture {
  final int stopId;
  final int sequenceOrder;
  final String name;
  final String? shortDescription;
  final String? imageUrl;
  final String? videoUrl;
  final String? culturalContent;
  final List<String> culturalImages;
  final List<TourArtifact> artifacts;

  const StopCulture({
    required this.stopId,
    required this.sequenceOrder,
    required this.name,
    this.shortDescription,
    this.imageUrl,
    this.videoUrl,
    this.culturalContent,
    this.culturalImages = const [],
    this.artifacts = const [],
  });

  factory StopCulture.fromJson(Map<String, dynamic> json) => StopCulture(
        stopId: _asInt(json['stopId']),
        sequenceOrder: _asInt(json['sequenceOrder']),
        name: json['name']?.toString() ?? '',
        shortDescription: _text(json['shortDescription']),
        imageUrl: _url(json['imageUrl']),
        videoUrl: _url(json['videoUrl']),
        culturalContent: _text(json['culturalContent']),
        culturalImages: _urls(json['culturalImages']),
        artifacts: _maps(json['artifacts']).map(TourArtifact.fromJson).toList(),
      );

  bool get isEmpty => culturalContent == null && culturalImages.isEmpty && artifacts.isEmpty && videoUrl == null;
}

/// Hoạt động thực địa tại điểm dừng (tên, thời lượng, điểm).
class TourActivity {
  final String name;
  final int? durationSeconds;
  final int points;

  const TourActivity({required this.name, this.durationSeconds, this.points = 0});

  factory TourActivity.fromJson(Map<String, dynamic> json) => TourActivity(
        name: _text(json['activityName']) ?? 'Hoạt động thực địa',
        durationSeconds: _asIntOrNull(json['durationSeconds']),
        points: _asInt(json['points']),
      );

  /// "5 phút", "1 phút 30 giây"; null nếu không đếm giờ.
  String? get formattedDuration {
    final s = durationSeconds;
    if (s == null || s <= 0) return null;
    final m = s ~/ 60;
    final r = s % 60;
    if (m == 0) return '$r giây';
    return r == 0 ? '$m phút' : '$m phút $r giây';
  }
}

/// Điểm dừng của tour 5 bước (phần công khai, không có đáp án hay mã QR).
class TourStopModel {
  final int id;
  final int sequenceOrder;
  final String name;
  final String? shortDescription;
  final String? guestNote;
  final String? imageUrl;
  final String? videoUrl;
  final String? culturalContent;
  final List<String> culturalImages;
  final List<TourArtifact> artifacts;
  final int quizCount;
  final List<TourActivity> activities;
  final double? latitude;
  final double? longitude;
  final int maxPoints;

  /// API công khai không trả nội dung văn hoá (chỉ mở sau check-in), chỉ báo trước số lượng.
  final bool hasCulturalStory;
  final int culturalImageCount;
  final int artifactCount;

  const TourStopModel({
    required this.id,
    required this.sequenceOrder,
    required this.name,
    this.shortDescription,
    this.guestNote,
    this.imageUrl,
    this.videoUrl,
    this.culturalContent,
    this.culturalImages = const [],
    this.artifacts = const [],
    this.quizCount = 0,
    this.activities = const [],
    this.latitude,
    this.longitude,
    this.maxPoints = 0,
    this.hasCulturalStory = false,
    this.culturalImageCount = 0,
    this.artifactCount = 0,
  });

  factory TourStopModel.fromJson(Map<String, dynamic> json) => TourStopModel(
        id: _asInt(json['id']),
        sequenceOrder: _asInt(json['sequenceOrder']),
        name: json['name']?.toString() ?? '',
        shortDescription: _text(json['shortDescription']),
        guestNote: _text(json['guestNote']),
        imageUrl: _url(json['imageUrl']),
        videoUrl: _url(json['videoUrl']),
        culturalContent: _text(json['culturalContent']),
        culturalImages: _urls(json['culturalImages']),
        artifacts: _maps(json['artifacts']).map(TourArtifact.fromJson).toList(),
        quizCount: _asInt(json['quizCount']),
        activities: _maps(json['activities']).map(TourActivity.fromJson).toList(),
        latitude: _asDoubleOrNull(json['latitude']),
        longitude: _asDoubleOrNull(json['longitude']),
        maxPoints: _asInt(json['maxPoints']),
        hasCulturalStory: json['hasCulturalStory'] == true || _text(json['culturalContent']) != null,
        culturalImageCount: _asInt(json['culturalImageCount']),
        artifactCount: _asInt(json['artifactCount']),
      );

  bool get hasLocation => latitude != null && longitude != null;

  bool get hasCulture =>
      hasCulturalStory ||
      culturalImageCount > 0 ||
      artifactCount > 0 ||
      culturalContent != null ||
      culturalImages.isNotEmpty ||
      artifacts.isNotEmpty ||
      videoUrl != null;

  /// Số hiện vật / ảnh tư liệu (ưu tiên số đếm từ API công khai).
  int get artifactTotal => artifactCount > 0 ? artifactCount : artifacts.length;
  int get culturalImageTotal => culturalImageCount > 0 ? culturalImageCount : culturalImages.length;

  /// Số thử thách tại điểm: một câu đố (nếu có câu hỏi) + các hoạt động thực địa.
  int get challengeCount => (quizCount > 0 ? 1 : 0) + activities.length;

  /// Dùng lại bản đồ lộ trình sẵn có (vốn nhận danh sách điểm đến).
  TourDestinationModel toMapPoint() => TourDestinationModel(
        destinationId: id,
        sequenceOrder: sequenceOrder,
        name: name,
        address: shortDescription ?? '',
        latitude: latitude,
        longitude: longitude,
        coverImageUrl: imageUrl,
      );
}

/// Chi tiết tour cho du khách: `GET /tours/{id}/public-detail`.
class TourDetailModel {
  final int id;
  final String title;
  final bool wizardTour;
  final String? tourFormat;
  final int? durationMinutes;
  final int durationDays;
  final int? durationNights;
  final int? regionId;
  final String? regionName;
  final int? themeId;
  final String? themeName;
  final String? providerName;
  final String? description;
  final List<String> highlights;
  final List<String> images;
  final String? coverImageUrl;
  final List<TourItineraryDay> itinerary;
  final String? priceIncludes;
  final String? priceExcludes;
  final String? forceMajeure;
  final String? refundPolicy;
  final String? cancellationPolicy;
  final String? contactInfo;
  final double price;
  final List<TourGuestPrice> prices;
  final int? maxGuestsPerSlot;
  final List<DateTime> upcomingDepartureDates;
  final List<TourStopModel> stops;
  final int taskCount;
  final int totalPoints;

  const TourDetailModel({
    required this.id,
    required this.title,
    required this.wizardTour,
    this.tourFormat,
    this.durationMinutes,
    this.durationDays = 0,
    this.durationNights,
    this.regionId,
    this.regionName,
    this.themeId,
    this.themeName,
    this.providerName,
    this.description,
    this.highlights = const [],
    this.images = const [],
    this.coverImageUrl,
    this.itinerary = const [],
    this.priceIncludes,
    this.priceExcludes,
    this.forceMajeure,
    this.refundPolicy,
    this.cancellationPolicy,
    this.contactInfo,
    this.price = 0,
    this.prices = const [],
    this.maxGuestsPerSlot,
    this.upcomingDepartureDates = const [],
    this.stops = const [],
    this.taskCount = 0,
    this.totalPoints = 0,
  });

  factory TourDetailModel.fromJson(Map<String, dynamic> json) {
    final stops = _maps(json['stops']).map(TourStopModel.fromJson).toList()
      ..sort((a, b) => a.sequenceOrder.compareTo(b.sequenceOrder));
    return TourDetailModel(
      id: _asInt(json['tourId']),
      title: json['title']?.toString() ?? '',
      wizardTour: json['wizardTour'] == true,
      tourFormat: _text(json['tourFormat']),
      durationMinutes: _asIntOrNull(json['durationMinutes']),
      durationDays: _asInt(json['durationDays']),
      durationNights: _asIntOrNull(json['durationNights']),
      regionId: _refId(json['region']),
      regionName: _refName(json['region']),
      themeId: _refId(json['theme']),
      themeName: _refName(json['theme']),
      providerName: _text(json['providerName']),
      description: _text(json['description']),
      highlights: _texts(json['highlights']),
      images: _urls(json['images']),
      coverImageUrl: _url(json['coverImageUrl']),
      itinerary: _maps(json['itinerary']).map(TourItineraryDay.fromJson).toList(),
      priceIncludes: _text(json['priceIncludes']),
      priceExcludes: _text(json['priceExcludes']),
      forceMajeure: _text(json['forceMajeure']),
      refundPolicy: _text(json['refundPolicy']),
      cancellationPolicy: _text(json['cancellationPolicy']),
      contactInfo: _text(json['contactInfo']),
      price: _asDoubleOrNull(json['price']) ?? 0,
      prices: _maps(json['prices']).map(TourGuestPrice.fromJson).toList(),
      maxGuestsPerSlot: _asIntOrNull(json['maxGuestsPerSlot']),
      upcomingDepartureDates: (json['upcomingDepartureDates'] is List
              ? (json['upcomingDepartureDates'] as List)
              : const [])
          .map((d) => DateTime.tryParse(d.toString()))
          .whereType<DateTime>()
          .toList(),
      stops: stops,
      taskCount: _asInt(json['taskCount']),
      totalPoints: _asInt(json['totalPoints']),
    );
  }

  String get formattedDuration => formatTourDuration(
        format: tourFormat,
        minutes: durationMinutes,
        days: durationDays,
        nights: durationNights,
      );

  String get formattedPrice => price <= 0 ? 'Miễn phí' : '${formatThousands(price)} đ';

  bool get hasPolicies =>
      priceIncludes != null ||
      priceExcludes != null ||
      cancellationPolicy != null ||
      refundPolicy != null ||
      forceMajeure != null;
}
