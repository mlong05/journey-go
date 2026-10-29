import '../models/cultural_content_model.dart';
import 'api_client.dart';

/// Nội dung văn hóa công khai (chỉ bài đã được kiểm duyệt).
class CulturalContentService {
  static final CulturalContentService _instance = CulturalContentService._internal();
  factory CulturalContentService() => _instance;
  CulturalContentService._internal();

  /// GET /destinations/{id}/contents (đã sắp theo thứ tự)
  Future<List<CulturalContentModel>> getByDestination(int destinationId) async {
    final data = await ApiClient.request('GET', '/destinations/$destinationId/contents', auth: false);
    return ApiClient.asList(data).map(CulturalContentModel.fromJson).toList()
      ..sort((a, b) => a.sequenceOrder.compareTo(b.sequenceOrder));
  }

  /// GET /cultural-contents/{id}/play: tăng lượt xem và trả nội dung mới nhất.
  Future<CulturalContentModel> play(int id) async {
    final data = await ApiClient.request('GET', '/cultural-contents/$id/play', auth: false);
    if (data is! Map<String, dynamic>) {
      throw const ApiException('Không mở được nội dung.');
    }
    return CulturalContentModel.fromJson(data);
  }
}
