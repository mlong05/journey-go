import '../models/experience_model.dart';
import '../models/tour_detail_model.dart';
import '../models/tour_model.dart';
import 'api_client.dart';

/// Thứ tự sắp xếp danh sách tour (khớp `TourSearchFilter.Order` ở backend).
enum TourOrder {
  newest('NEWEST', 'Mới nhất'),
  priceAsc('PRICE_ASC', 'Giá thấp đến cao'),
  priceDesc('PRICE_DESC', 'Giá cao đến thấp'),
  departure('DEPARTURE', 'Khởi hành sớm nhất');

  final String apiValue;
  final String label;
  const TourOrder(this.apiValue, this.label);
}

/// Bộ lọc danh sách tour. Trường null = không lọc theo trường đó.
class TourFilter {
  final String? query;
  final int? regionId;
  final int? themeId;

  /// DAY_TRIP / MULTI_DAY.
  final String? format;
  final TourOrder order;

  const TourFilter({this.query, this.regionId, this.themeId, this.format, this.order = TourOrder.newest});

  /// Số tiêu chí đang bật (không tính từ khóa), để hiện trên nút "Bộ lọc".
  int get activeCount =>
      (regionId != null ? 1 : 0) +
      (themeId != null ? 1 : 0) +
      (format != null ? 1 : 0) +
      (order != TourOrder.newest ? 1 : 0);

  TourFilter copyWith({
    String? query,
    int? regionId,
    int? themeId,
    String? format,
    TourOrder? order,
    bool clearRegion = false,
    bool clearTheme = false,
    bool clearFormat = false,
  }) =>
      TourFilter(
        query: query ?? this.query,
        regionId: clearRegion ? null : (regionId ?? this.regionId),
        themeId: clearTheme ? null : (themeId ?? this.themeId),
        format: clearFormat ? null : (format ?? this.format),
        order: order ?? this.order,
      );

  String toQuery() {
    final params = <String, String>{
      if (query != null && query!.trim().isNotEmpty) 'q': query!.trim(),
      if (regionId != null) 'regionId': '$regionId',
      if (themeId != null) 'themeId': '$themeId',
      'format': ?format,
      if (order != TourOrder.newest) 'order': order.apiValue,
    };
    return params.entries.map((e) => '${e.key}=${Uri.encodeQueryComponent(e.value)}').join('&');
  }
}

/// Một trang tour kèm cờ còn trang sau hay không.
class TourPage {
  final List<TourModel> tours;
  final bool last;
  const TourPage(this.tours, this.last);
}

/// Gọi API tour và trải nghiệm của từng điểm đến.
class TourService {
  static final TourService _instance = TourService._internal();
  factory TourService() => _instance;
  TourService._internal();

  /// GET /tours/published (trang Spring, lấy `content`)
  Future<List<TourModel>> getPublishedTours({int page = 0, int size = 50}) async {
    return (await searchTours(page: page, size: size)).tours;
  }

  /// GET /tours/published có bộ lọc: q, regionId, themeId, format, order.
  Future<TourPage> searchTours({TourFilter filter = const TourFilter(), int page = 0, int size = 20}) async {
    final extra = filter.toQuery();
    final data = await ApiClient.request(
      'GET',
      '/tours/published?page=$page&size=$size${extra.isEmpty ? '' : '&$extra'}',
    );
    final meta = ApiClient.asPageMeta(data);
    return TourPage(ApiClient.asList(data).map(TourModel.fromJson).toList(), meta['last'] == true);
  }

  /// GET /tours/{id}
  Future<TourModel> getTourById(int id) async {
    final data = await ApiClient.request('GET', '/tours/$id');
    if (data is! Map<String, dynamic>) {
      throw const ApiException('Không tìm thấy tour.');
    }
    return TourModel.fromJson(data);
  }

  /// GET /tours/{id}/public-detail: mô tả, ảnh, lịch trình, bảng giá, chính sách, điểm dừng.
  Future<TourDetailModel> getPublicDetail(int id) async {
    final data = await ApiClient.request('GET', '/tours/$id/public-detail');
    if (data is! Map<String, dynamic>) {
      throw const ApiException('Không tìm thấy tour.');
    }
    return TourDetailModel.fromJson(data);
  }

  /// GET /destinations/{id}/experiences, chỉ giữ trải nghiệm đã xuất bản.
  /// Lỗi được ném ra thay vì trả dữ liệu mẫu để giao diện hiện đúng trạng thái.
  Future<List<ExperienceModel>> getDestinationExperiences(int destinationId) async {
    final data = await ApiClient.request(
      'GET',
      '/destinations/$destinationId/experiences',
      auth: false,
    );
    return ApiClient.asList(data)
        .map(ExperienceModel.fromJson)
        .where((e) => e.isPublished)
        .toList();
  }
}
