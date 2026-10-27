import '../models/experience_model.dart';
import '../models/tour_model.dart';
import 'api_client.dart';

/// Gọi API tour và trải nghiệm của từng điểm đến.
class TourService {
  static final TourService _instance = TourService._internal();
  factory TourService() => _instance;
  TourService._internal();

  /// GET /tours/published (trang Spring, lấy `content`)
  Future<List<TourModel>> getPublishedTours({int page = 0, int size = 50}) async {
    final data = await ApiClient.request('GET', '/tours/published?page=$page&size=$size');
    return ApiClient.asList(data).map(TourModel.fromJson).toList();
  }

  /// GET /tours/{id}
  Future<TourModel> getTourById(int id) async {
    final data = await ApiClient.request('GET', '/tours/$id');
    if (data is! Map<String, dynamic>) {
      throw const ApiException('Không tìm thấy tour.');
    }
    return TourModel.fromJson(data);
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
