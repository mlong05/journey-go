import 'package:flutter/material.dart';

import '../../core/models/booking_model.dart';
import '../../core/models/tour_model.dart';
import '../../core/services/api_client.dart';
import '../../core/services/booking_service.dart';
import '../../core/services/tour_service.dart';
import 'tour_detail_screen.dart';

/// Mở màn "Chi tiết tour" (dạng công khai — giống hệt lúc chưa mua) cho du khách
/// đã mua tour nhưng ngày trải nghiệm còn ở tương lai.
///
/// ── Vì sao cần? ──
/// Backend khoá tour tới ngày trải nghiệm (`BOOKING_TOUR_LOCKED`, HTTP 409).
/// Trước đây app đẩy thẳng màn hành trình ⇒ du khách thấy màn lỗi
/// "Tour chỉ mở từ ngày trải nghiệm ... / Thử lại / Quay lại" và không xem được
/// thông tin tour đã mua.
///
/// ⇒ Nay các màn "Tour của tôi", "Đơn đặt tour" và "Thanh toán thành công" mở
/// thẳng màn chi tiết tour, KHÔNG chạm vào hành trình cho tới khi tới ngày.
///
/// [bookedBooking] = booking đã mua (nếu có) ⇒ thanh đặt tour hiển thị trạng
/// thái "đã mua" thay vì nút "Đặt tour" (tránh đặt trùng).
/// Nếu không truyền mà có [bookingId] thì sẽ tự tải booking đó từ server.
///
/// [replace] = true ⇒ thay thế màn hiện tại (dùng khi màn hành trình bị backend
/// từ chối vì tour chưa mở).
///
/// Trả về true nếu mở được màn chi tiết tour.
Future<bool> openTourDetailScreen(
  BuildContext context, {
  required int tourId,
  TourModel? tour,
  BookingModel? bookedBooking,
  int? bookingId,
  bool replace = false,
}) async {
  var model = (tour != null && tour.id == tourId) ? tour : null;
  if (model == null) {
    try {
      model = await TourService().getTourById(tourId);
    } on ApiException {
      model = null;
    }
  }
  if (!context.mounted) return false;
  if (model == null) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Không tải được thông tin tour. Vui lòng thử lại.'),
        behavior: SnackBarBehavior.floating,
      ),
    );
    return false;
  }

  // Lấy booking để hiện trạng thái "đã mua" thay vì nút "Đặt tour".
  var booking = bookedBooking;
  if (booking == null && bookingId != null) {
    try {
      booking = await BookingService().getBookingById(bookingId);
    } on ApiException {
      booking = null;
    }
  }

  if (!context.mounted) return false;
  final route = MaterialPageRoute(
    builder: (_) => TourDetailScreen(tour: model!, bookedBooking: booking),
  );
  if (replace) {
    await Navigator.of(context).pushReplacement(route);
  } else {
    await Navigator.of(context).push(route);
  }
  return true;
}
