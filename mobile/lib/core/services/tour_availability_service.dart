/// Service tính "ngày còn chỗ" cho một tour — dùng cho màn chi tiết tour để chọn ngày trải nghiệm.
///
/// ── Nguồn dữ liệu ──
/// `GET /tours/{tourId}/availability` — backend đã gom logic slot về một chỗ:
///   • Tour luồng 5 bước: `TourSlot` theo NGÀY KHỞI HÀNH (`capacity` - `bookedCount`).
///   • Tour luồng cũ: `ExperienceSlot` theo trải nghiệm (số chỗ còn = MIN giữa các experience).
///
/// Trước đây mobile phải tự đi tour → destinations[] → experiences[] → slots (N+1 request),
/// và với tour luồng 5 bước (không có `destinations[]`) ⇒ luôn ra danh sách rỗng ⇒ lịch
/// không hiển thị được. Nay gọi thẳng endpoint chính thức.
library;

import 'api_client.dart';

/// Một ngày còn chỗ để đặt tour.
class TourAvailableDate {
  final String date;
  final int remaining;
  final int total;
  final bool available;

  const TourAvailableDate({
    required this.date,
    required this.remaining,
    required this.total,
    required this.available,
  });
}

class TourAvailabilityService {
  static final TourAvailabilityService _instance = TourAvailabilityService._internal();
  factory TourAvailabilityService() => _instance;
  TourAvailabilityService._internal();

  /// Lấy danh sách ngày còn chỗ của tour.
  ///
  /// [horizonDays] số ngày tối đa xem trước (mặc định 60).
  /// [fromDate] ngày bắt đầu `YYYY-MM-DD` (mặc định = hôm nay).
  Future<List<TourAvailableDate>> getTourAvailableDates(
    int tourId, {
    int horizonDays = 60,
    String? fromDate,
  }) async {
    if (tourId <= 0) return [];

    final data = await ApiClient.request(
      'GET',
      '/tours/$tourId/availability',
      auth: false,
    );
    final raw = ApiClient.asList(data is Map ? data['dates'] : data);

    final start = fromDate != null ? DateTime.parse(fromDate) : DateTime.now();
    final horizon = start.add(Duration(days: horizonDays));
    final todayStr = _toDateString(start);

    final dates = <TourAvailableDate>[];
    for (final item in raw) {
      final date = item['date']?.toString();
      if (date == null || date.isEmpty) continue;
      if (date.compareTo(todayStr) < 0) continue;
      final d = DateTime.parse(date);
      if (d.isAfter(horizon)) continue;
      final remaining = _toInt(item['remaining'] ?? 0);
      dates.add(TourAvailableDate(
        date: date,
        remaining: remaining < 0 ? 0 : remaining,
        total: _toInt(item['capacity'] ?? item['remaining'] ?? 0),
        available: item['available'] == true && remaining > 0,
      ));
    }

    dates.sort((a, b) => a.date.compareTo(b.date));
    return dates;
  }

  /// Số chỗ còn của một ngày (null nếu ngày không mở bán).
  Future<int?> remainingFor(int tourId, String? date) async {
    if (date == null || date.isEmpty) return null;
    final dates = await getTourAvailableDates(tourId);
    for (final d in dates) {
      if (d.date == date) return d.remaining;
    }
    return null;
  }

  static int _toInt(dynamic v) {
    if (v is num) return v.toInt();
    return int.tryParse(v?.toString() ?? '') ?? 0;
  }

  static String _toDateString(DateTime d) {
    final dd = d.day.toString().padLeft(2, '0');
    final mm = d.month.toString().padLeft(2, '0');
    return '${d.year}-$mm-$dd';
  }
}
