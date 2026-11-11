/// Service cho module Booking (Đặt tour) — Mobile.
///
/// ── Contract ──
///  • POST /bookings                      body: { tourId, experienceDate, passengers[] } → 201
///  • GET  /bookings/my                   (phân trang) → `PageResponse<BookingResponse>`
///  • GET  /bookings/{id}                 → BookingResponse
///  • POST /bookings/{id}/cancel          body: { reason? } (optional)
///  • GET  /bookings/{id}/passengers      → BookingPassengerResponse[]
///  • POST /bookings/{id}/passengers/{pid}/invitations  → InvitationResponse
///  • POST /bookings/invitations/{token}/accept          → InvitationResponse
///  • GET  /bookings/{id}/messages        → BookingMessageResponse[]
///  • POST /bookings/{id}/messages        → BookingMessageResponse
///
/// ── Đặt tour nhóm ──
///  `passengers` là danh sách hành khách; người đặt là hành khách đầu tiên.
///  Mỗi hành khách: { fullName, birthDate, gender, email?, guestType? }.
///  Loại khách được suy ra từ tuổi TẠI NGÀY TRẢI NGHIỆM nếu không chỉ định.
///
/// ── Vòng đời ──
///  POST /bookings giữ slot nguyên tử trong 10 phút (`paymentDeadline = createdAt + 10m`).
///  Trạng thái: PENDING_PAYMENT → CONFIRMED → COMPLETED, hoặc EXPIRED / CANCELLED.
///  `POST /payments/.../init` KHÔNG gia hạn deadline — hạn giờ luôn lấy từ `paymentDeadline`.
library;

import '../models/booking_model.dart';
import 'api_client.dart';

/// Một hành khách gửi lên khi đặt tour nhóm.
class BookingPassengerInput {
  final String fullName;
  final String birthDate;
  final String gender;
  final String? email;
  final String? guestType;

  const BookingPassengerInput({
    required this.fullName,
    required this.birthDate,
    required this.gender,
    this.email,
    this.guestType,
  });

  Map<String, dynamic> toJson() => {
        'fullName': fullName,
        'birthDate': birthDate,
        'gender': gender,
        if (email != null && email!.isNotEmpty) 'email': email,
        if (guestType != null && guestType!.isNotEmpty) 'guestType': guestType,
      };
}

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
  /// [passengers] là danh sách hành khách (có thể đặt cho cả nhóm);
  /// hành khách đầu tiên là người đặt tour.
  Future<BookingModel> createBooking({
    required int tourId,
    required Object experienceDate,
    List<BookingPassengerInput> passengers = const [],
    String? note,
  }) async {
    final date = experienceDate is DateTime
        ? _formatDate(experienceDate)
        : experienceDate.toString();
    final body = <String, dynamic>{'tourId': tourId, 'experienceDate': date};
    if (passengers.isNotEmpty) {
      body['passengers'] = passengers.map((p) => p.toJson()).toList();
    }
    if (note != null && note.isNotEmpty) body['note'] = note;
    final data = await ApiClient.request('POST', _endpoint, body: body);
    return BookingModel.fromJson(data as Map<String, dynamic>);
  }

  /// Tạo booking mới (alias theo kiểu gọi của màn checkout).
  Future<BookingModel> create({
    required int tourId,
    required DateTime experienceDate,
    List<BookingPassengerInput> passengers = const [],
    String? note,
  }) =>
      createBooking(
        tourId: tourId,
        experienceDate: experienceDate,
        passengers: passengers,
        note: note,
      );

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

  /// Danh sách booking tôi có quyền xem: vừa booking tôi đặt, vừa booking tôi
  /// được mời tham gia (hành khách được mời).
  ///
  /// ⚠️ Với booking tôi được mời, backend ẩn thông tin cá nhân của hành khách khác.
  Future<List<BookingModel>> getAccessibleBookings() async {
    final data = await ApiClient.request('GET', '$_endpoint/accessible');
    return ApiClient.asList(data)
        .map(BookingModel.fromJson)
        .toList();
  }

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

  // ── Hành khách & lời mời ──────────────────────────────────────────────────

  /// Danh sách hành khách trong một booking.
  Future<List<BookingPassengerModel>> getPassengers(int bookingId) async {
    final data = await ApiClient.request('GET', '$_endpoint/$bookingId/passengers');
    return ApiClient.asList(data)
        .map(BookingPassengerModel.fromJson)
        .toList();
  }

  /// Gửi lời mời tham gia tour cho một hành khách chưa có tài khoản.
  ///
  /// Lời mời hết hạn sau 24 giờ, chỉ dùng được một lần và bị thu hồi khi hủy booking.
  Future<Map<String, dynamic>> invitePassenger(
    int bookingId,
    int passengerId, {
    String? email,
  }) async {
    final query = (email != null && email.isNotEmpty)
        ? '?email=${Uri.encodeQueryComponent(email)}'
        : '';
    final data = await ApiClient.request(
      'POST',
      '$_endpoint/$bookingId/passengers/$passengerId/invitations$query',
    );
    return (data as Map<String, dynamic>);
  }

  /// Xem thông tin lời mời (trước khi xác nhận) — dùng cho màn "Bạn được mời".
  ///
  /// Token tới từ deep link `journeygo://booking/invitations/accept?token=...`.
  ///
  /// ⚠️ Gọi KHÔNG kèm access token: endpoint này là public (token lời mời là
  /// capability token ngẫu nhiên 72 ký tự) ⇒ người được mời xem được thông tin
  /// lời mời NGAY cả khi chưa đăng nhập.
  Future<Map<String, dynamic>> previewInvitation(String token) async {
    final data = await ApiClient.request(
      'GET',
      '$_endpoint/invitations/${Uri.encodeComponent(token)}',
      auth: false,
    );
    return (data as Map<String, dynamic>);
  }

  /// Xác nhận lời mời — email đang đăng nhập phải trùng email được mời.
  Future<Map<String, dynamic>> acceptInvitation(String token) async {
    final data = await ApiClient.request(
      'POST',
      '$_endpoint/invitations/${Uri.encodeComponent(token)}/accept',
    );
    return (data as Map<String, dynamic>);
  }

  /// Các lời mời tham gia tour đang chờ tôi xác nhận.
  ///
  /// Gọi khi vào app / sau khi đăng nhập: nếu email đã được gửi lời mời thì lời
  /// mời sẽ hiện trong trung tâm thông báo (backend tự tạo notification khi gọi
  /// endpoint này).
  Future<List<Map<String, dynamic>>> getMyPendingInvitations() async {
    final data = await ApiClient.request('GET', '$_endpoint/my-invitations');
    return ApiClient.asList(data);
  }

  /// Xác nhận lời mời bằng ID (từ thông báo trong app) — không cần deep link.
  ///
  /// Sau khi xác nhận, hành khách được liên kết với tài khoản ⇒ có quyền xem
  /// booking và truy cập tour.
  Future<Map<String, dynamic>> confirmInvitation(int invitationId) async {
    final data = await ApiClient.request(
      'POST',
      '$_endpoint/my-invitations/$invitationId/confirm',
    );
    return (data as Map<String, dynamic>);
  }

  /// Tin nhắn hỗ trợ của booking (mới nhất trước).
  Future<List<Map<String, dynamic>>> getMessages(int bookingId) async {
    final data = await ApiClient.request('GET', '$_endpoint/$bookingId/messages');
    return ApiClient.asList(data);
  }

  /// Gửi tin nhắn hỗ trợ trong booking.
  Future<Map<String, dynamic>> sendMessage(int bookingId, String body) async {
    final data = await ApiClient.request(
      'POST',
      '$_endpoint/$bookingId/messages',
      body: {'body': body},
    );
    return (data as Map<String, dynamic>);
  }
}
