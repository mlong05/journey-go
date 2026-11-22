import 'tour_model.dart';

/// Một tour khởi hành trong một ngày, kèm số chỗ còn (cùng cách tính với màn đặt tour).
class TourDeparture {
  final TourModel tour;
  final int capacity;
  final int remaining;
  final bool available;

  const TourDeparture({required this.tour, required this.capacity, required this.remaining, required this.available});

  factory TourDeparture.fromJson(Map<String, dynamic> json) {
    final raw = json['tour'];
    return TourDeparture(
      tour: TourModel.fromJson(raw is Map<String, dynamic> ? raw : const {}),
      capacity: _int(json['capacity']),
      remaining: _int(json['remaining']),
      available: json['available'] == true,
    );
  }
}

/// Một ngày và các tour khởi hành trong ngày — từ `GET /tours/departures`.
class DepartureDay {
  /// Ngày (chỉ phần ngày, giờ địa phương 00:00).
  final DateTime date;
  final List<TourDeparture> tours;

  const DepartureDay({required this.date, required this.tours});

  /// Số tour còn chỗ trong ngày.
  int get availableCount => tours.where((t) => t.available).length;

  static DepartureDay? fromJson(Map<String, dynamic> json) {
    final d = DateTime.tryParse(json['date']?.toString() ?? '');
    if (d == null) return null;
    final rawTours = json['tours'];
    return DepartureDay(
      date: DateTime(d.year, d.month, d.day),
      tours: [
        if (rawTours is List)
          for (final t in rawTours)
            if (t is Map<String, dynamic>) TourDeparture.fromJson(t),
      ],
    );
  }
}

int _int(dynamic v) => v is int ? v : int.tryParse(v?.toString() ?? '') ?? 0;
