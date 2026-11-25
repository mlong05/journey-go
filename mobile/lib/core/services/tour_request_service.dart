import '../models/tour_request_model.dart';
import 'api_client.dart';

class TourRequestService {
  static final TourRequestService _instance = TourRequestService._internal();
  factory TourRequestService() => _instance;
  TourRequestService._internal();

  /// Lấy danh sách yêu cầu tour của tôi (du khách)
  Future<List<TourRequestModel>> getMyRequests({int page = 0, int size = 20}) async {
    final response = await ApiClient.request('GET', '/tour-requests/my?page=$page&size=$size');
    if (response is Map<String, dynamic>) {
      final content = response['content'];
      if (content is List) {
        return content
            .map((e) => TourRequestModel.fromJson(e as Map<String, dynamic>))
            .toList();
      }
    } else if (response is List) {
      return response
          .map((e) => TourRequestModel.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  /// Lấy chi tiết một yêu cầu tour
  Future<TourRequestModel?> getDetail(int requestId) async {
    final response = await ApiClient.request('GET', '/tour-requests/$requestId');
    if (response is Map<String, dynamic>) {
      return TourRequestModel.fromJson(response);
    }
    return null;
  }

  /// Đăng yêu cầu tạo tour riêng mới
  Future<TourRequestModel?> createRequest({
    required String title,
    required String description,
    String? preferredDestination,
    DateTime? preferredDateFrom,
    DateTime? preferredDateTo,
    int? guestCount,
    double? budgetMin,
    double? budgetMax,
    String? specialRequirements,
  }) async {
    String? fmtDate(DateTime? dt) =>
        dt != null ? '${dt.year}-${dt.month.toString().padLeft(2, '0')}-${dt.day.toString().padLeft(2, '0')}' : null;

    final body = <String, dynamic>{
      'title': title.trim(),
      'description': description.trim(),
      if (preferredDestination != null && preferredDestination.trim().isNotEmpty)
        'preferredDestination': preferredDestination.trim(),
      if (preferredDateFrom != null) 'preferredDateFrom': fmtDate(preferredDateFrom),
      if (preferredDateTo != null) 'preferredDateTo': fmtDate(preferredDateTo),
      if (guestCount != null && guestCount > 0) 'guestCount': guestCount,
      if (budgetMin != null && budgetMin >= 0) 'budgetMin': budgetMin,
      if (budgetMax != null && budgetMax >= 0) 'budgetMax': budgetMax,
      if (specialRequirements != null && specialRequirements.trim().isNotEmpty)
        'specialRequirements': specialRequirements.trim(),
    };

    final response = await ApiClient.request('POST', '/tour-requests', body: body);
    if (response is Map<String, dynamic>) {
      return TourRequestModel.fromJson(response);
    }
    return null;
  }

  /// Hủy yêu cầu tạo tour (khi còn OPEN)
  Future<bool> cancelRequest(int requestId) async {
    try {
      await ApiClient.request('DELETE', '/tour-requests/$requestId');
      return true;
    } catch (_) {
      return false;
    }
  }
}

