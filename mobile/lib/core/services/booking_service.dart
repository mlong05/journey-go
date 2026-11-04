/// Service cho module Booking (Đặt tour) — Mobile.
///
/// ── Contract ──
///  • POST /bookings                      body: { tourId, experienceDate } → 201
///  • GET  /bookings/my                   (phân trang) → `PageResponse<BookingResponse>`
///  • GET  /bookings/{id}                 → BookingResponse
///  • POST /bookings/{id}/cancel          body: { reason? } (optional)
///
/// ── Vòng đời ──
///  POST /bookings giữ slot nguyên tử trong 10 phút (`paymentDeadline = createdAt + 10m`).
///  Trạng thái: PENDING_PAYMENT → CONFIRMED → COMPLETED, hoặc EXPIRED / CANCELLED.
///  `POST /payments/.../init` KHÔNG gia hạn deadline — hạn giờ luôn lấy từ `paymentDeadline`.
library;

import '../models/booking_model.dart';
import 'api_client.dart';

class BookingService {
  static final BookingService _instance = BookingService._internal();
  factory BookingService() => _instance;
  BookingService._internal();

  static const String _endpoint = '/bookings';

  /// Định dạng `DateTime` thành `YYYY-MM-DD` (backend nhận `LocalDate`).
  static String _formatDate(DateTime value) {
    String two(int n) => n.toString().padLeft(2, '0');
    return '${value.year}-${two(value.month)}-${two(value.day)}';
  }

  /// Tạo booking mới. Trả về booking kèm `paymentDeadline` để đếm ngược 10 phút.
  ///
  /// [experienceDate] nhận cả `String` (`YYYY-MM-DD`) lẫn `DateTime`.
  Future<BookingModel> createBooking({
    required int tourId,
    required Object experienceDate,
  }) async {
    final date = experienceDate is DateTime
        ? _formatDate(experienceDate)
        : experienceDate.toString();
    final data = await ApiClient.request(
      'POST',
      _endpoint,
      body: {'tourId': tourId, 'experienceDate': date},
    );
    return BookingModel.fromJson(data as Map<String, dynamic>);
  }

  /// Tạo booking mới (alias theo kiểu gọi của màn checkout).
  Future<BookingModel> create({
    required int tourId,
    required DateTime experienceDate,
  }) =>
      createBooking(tourId: tourId, experienceDate: experienceDate);

  /// Danh sách booking của tôi.
  Future<List<BookingModel>> getMyBookings({int page = 0, int size = 20}) async {
    final data = await ApiClient.request(
      'GET',
      '$_endpoint/my?page=$page&size=$size',
    );
    return ApiClient.asList(data)
        .map(BookingModel.fromJson)
        .toList();
  }

  /// Danh sách booking của tôi (alias theo kiểu gọi của màn danh sách).
  Future<List<BookingModel>> getMine({int page = 0, int size = 50}) =>
      getMyBookings(page: page, size: size);

  /// Metadata phân trang của `getMyBookings`.
  Future<Map<String, dynamic>> getMyBookingsPage({int page = 0, int size = 20}) async {
    final data = await ApiClient.request(
      'GET',
      '$_endpoint/my?page=$page&size=$size',
    );
    return ApiClient.asPageMeta(data);
  }

  /// Chi tiết một booking.
  Future<BookingModel> getBookingById(int bookingId) async {
    final data = await ApiClient.request('GET', '$_endpoint/$bookingId');
    return BookingModel.fromJson(data as Map<String, dynamic>);
  }

  /// Chi tiết một booking (alias theo kiểu gọi của màn checkout).
  Future<BookingModel> getById(int id) => getBookingById(id);

  /// Hủy booking (chỉ được khi chưa thanh toán). Slot đã giữ được giải phóng.
  Future<BookingModel> cancelBooking(int bookingId, {String? reason}) async {
    final data = await ApiClient.request(
      'POST',
      '$_endpoint/$bookingId/cancel',
      body: reason != null && reason.isNotEmpty ? {'reason': reason} : {},
    );
    return BookingModel.fromJson(data as Map<String, dynamic>);
  }

  /// Hủy booking (alias theo kiểu gọi của màn checkout).
  Future<BookingModel> cancel(int id, {String? reason}) =>
      cancelBooking(id, reason: reason);

  /// Tự động hủy booking khi hết hạn thanh toán (10 phút).
  ///
  /// Backend có scheduler quét hẹn giờ, nhưng gọi tường minh giúp UI cập nhật ngay
  /// khi người dùng quay lại app sau khi để mở.
  Future<BookingModel> expireBookingIfNeeded(int bookingId) async {
    final booking = await getBookingById(bookingId);
    if (booking.isPendingPayment && !booking.isPaymentWindowOpen) {
      try {
        return await cancelBooking(bookingId, reason: 'Hết thời hạn thanh toán');
      } catch (_) {
        return booking;
      }
    }
    return booking;
  }
}
