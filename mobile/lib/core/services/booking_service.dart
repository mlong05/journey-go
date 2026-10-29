import '../models/booking_model.dart';
import 'api_client.dart';

/// Gọi API đặt tour: /bookings.
class BookingService {
  static final BookingService _instance = BookingService._internal();
  factory BookingService() => _instance;
  BookingService._internal();

  /// POST /bookings. Giữ slot và mở hạn thanh toán 10 phút.
  Future<BookingModel> create({required int tourId, required DateTime experienceDate}) async {
    String two(int n) => n.toString().padLeft(2, '0');
    final data = await ApiClient.request('POST', '/bookings', body: {
      'tourId': tourId,
      'experienceDate': '${experienceDate.year}-${two(experienceDate.month)}-${two(experienceDate.day)}',
    });
    return _one(data);
  }

  /// GET /bookings/my
  Future<List<BookingModel>> getMine({int page = 0, int size = 50}) async {
    final data = await ApiClient.request('GET', '/bookings/my?page=$page&size=$size');
    return ApiClient.asList(data).map(BookingModel.fromJson).toList();
  }

  /// GET /bookings/{id}
  Future<BookingModel> getById(int id) async {
    final data = await ApiClient.request('GET', '/bookings/$id');
    return _one(data);
  }

  /// POST /bookings/{id}/cancel. Chỉ hủy được khi chưa thanh toán.
  Future<BookingModel> cancel(int id, {String? reason}) async {
    final data = await ApiClient.request(
      'POST',
      '/bookings/$id/cancel',
      body: reason == null ? null : {'reason': reason},
    );
    return _one(data);
  }

  BookingModel _one(dynamic data) {
    if (data is! Map<String, dynamic>) {
      throw const ApiException('Máy chủ trả về dữ liệu đơn đặt không hợp lệ.');
    }
    return BookingModel.fromJson(data);
  }
}
