/// Service tính "ngày còn chỗ" cho một tour — dùng cho màn chi tiết tour để chọn ngày trải nghiệm.
///
/// ── Vì sao cần N+1 request? ──
///  `TourResponse.destinations[]` chỉ có `destinationId`, KHÔNG có `experienceId`.
///  Endpoint slot lại là **per-experience**: `GET /experiences/{experienceId}/slots?date=`.
///  Backend chỉ có `GET /destinations/{destinationId}/experiences` để lấy danh sách experience
///  của một điểm đến. Vì vậy bắt buộc phải đi:
///      tour → destinations[] → GET /destinations/{id}/experiences → GET /experiences/{eid}/slots
///
/// ── Quy tắc chọn ngày ──
///  Một ngày chỉ hợp lệ khi **MỌI** experience của tour đều có slot còn chỗ cho ngày đó.
///  Nếu chỉ một experience hết chỗ, `POST /bookings` sẽ ném `BOOKING_SLOT_FULL`.
library;

import '../models/experience_model.dart';
import '../models/tour_model.dart';
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

  /// Lấy danh sách experience (đã PUBLISHED) của một điểm đến.
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

  /// Lấy slot của một experience (tuỳ chọn filter theo ngày).
  Future<List<Map<String, dynamic>>> getExperienceSlots(
    int experienceId, {
    String? date,
  }) async {
    final query = (date != null && date.isNotEmpty) ? '?date=$date' : '';
    final data = await ApiClient.request(
      'GET',
      '/experiences/$experienceId/slots$query',
    );
    return ApiClient.asList(data);
  }

  /// Thu thập danh sách experience của mọi điểm đến trong tour.
  Future<List<ExperienceModel>> getTourExperiences(TourModel tour) async {
    final perDestination = await Future.wait(
      tour.destinations.map(
        (d) => getDestinationExperiences(d.destinationId).catchError((_) => <ExperienceModel>[]),
      ),
    );
    return perDestination.expand((e) => e).toList();
  }

  /// Tính danh sách ngày còn chỗ cho tour.
  ///
  /// [horizonDays] số ngày tối đa xem trước (mặc định 60).
  /// [fromDate] ngày bắt đầu `YYYY-MM-DD` (mặc định = hôm nay).
  ///
  /// `remaining` = số chỗ còn nhỏ nhất giữa các experience (giới hạn thực tế),
  /// `total` = tổng số chỗ còn của tất cả experience.
  Future<List<TourAvailableDate>> getTourAvailableDates(
    TourModel tour, {
    int horizonDays = 60,
    String? fromDate,
  }) async {
    final experiences = await getTourExperiences(tour);
    if (experiences.isEmpty) return [];

    // Gom slot của mọi experience theo ngày.
    final slotsByDate = <String, List<int>>{};
    final results = await Future.wait(
      experiences.map((exp) async {
        try {
          return await getExperienceSlots(exp.id);
        } catch (_) {
          return <Map<String, dynamic>>[];
        }
      }),
    );

    for (final slots in results) {
      for (final slot in slots) {
        final date = slot['slotDate']?.toString();
        if (date == null || date.isEmpty) continue;
        final remaining = _toInt(slot['remaining'] ?? 0);
        slotsByDate.putIfAbsent(date, () => []).add(remaining < 0 ? 0 : remaining);
      }
    }

    final start = fromDate != null ? DateTime.parse(fromDate) : DateTime.now();
    final horizon = start.add(Duration(days: horizonDays));
    final todayStr = _toDateString(start);

    final dates = <TourAvailableDate>[];
    slotsByDate.forEach((date, remainings) {
      if (date.compareTo(todayStr) < 0) return;
      final d = DateTime.parse(date);
      if (d.isAfter(horizon)) return;
      final remaining = remainings.isEmpty ? 0 : remainings.reduce((a, b) => a < b ? a : b);
      dates.add(
        TourAvailableDate(
          date: date,
          remaining: remaining,
          total: _sumOf(remainings),
          available: remaining > 0,
        ),
      );
    });

    dates.sort((a, b) => a.date.compareTo(b.date));
    return dates;
  }

  /// Kiểm tra một ngày cụ thể có đặt được không (mọi experience đều còn chỗ).
  Future<({bool available, int remaining, String? reason})> checkDateAvailability(
    TourModel tour,
    String date,
  ) async {
    final experiences = await getTourExperiences(tour);
    if (experiences.isEmpty) {
      return (available: false, remaining: 0, reason: 'Tour không có trải nghiệm nào khả dụng.');
    }

    var remaining = 1 << 30;
    for (final exp in experiences) {
      final slots = await getExperienceSlots(exp.id, date: date);
      final slot = slots.where((s) => s['slotDate']?.toString() == date).toList();
      if (slot.isEmpty) {
        return (
          available: false,
          remaining: 0,
          reason: 'Trải nghiệm "${exp.title}" chưa mở bán ngày này.',
        );
      }
      final left = _toInt(slot.first['remaining'] ?? 0);
      if (left <= 0) {
        return (
          available: false,
          remaining: 0,
          reason: 'Trải nghiệm "${exp.title}" đã hết chỗ ngày này.',
        );
      }
      if (left < remaining) remaining = left;
    }

    return (available: true, remaining: remaining, reason: null);
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

  /// Tổng các số chỗ còn.
  static int _sumOf(List<int> values) {
    var sum = 0;
    for (final v in values) {
      sum += v;
    }
    return sum;
  }
}
