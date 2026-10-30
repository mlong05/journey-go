import '../models/refund_model.dart';
import 'api_client.dart';

/// Gọi API hoàn tiền của du khách: /refunds.
class RefundService {
  static final RefundService _instance = RefundService._internal();
  factory RefundService() => _instance;
  RefundService._internal();

  /// GET /refunds/my (mới nhất trước)
  Future<List<RefundModel>> getMine({int page = 0, int size = 50}) async {
    final data = await ApiClient.request(
      'GET',
      '/refunds/my?page=$page&size=$size',
    );
    return ApiClient.asList(data).map(RefundModel.fromJson).toList();
  }
}
