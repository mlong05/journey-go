import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

/// Vé đặt GIẢ LẬP của tour 5 bước, lưu cục bộ trên máy.
///
/// TẠM THỜI: luồng booking thật cho tour 5 bước chưa xong (backend còn tính theo điểm đến cũ),
/// nên nút "Đặt tour" của tour 5 bước chỉ ghi vé vào đây, không gọi server, không thu tiền.
/// Khi booking thật hoàn thành thì gỡ file này cùng `mock_tour_booking_sheet.dart`.
class MockTourBooking {
  final String code;
  final int tourId;
  final String tourTitle;
  final String? coverImageUrl;
  final DateTime departureDate;

  /// Nhãn loại khách → số lượng (VD "Người lớn" → 2).
  final Map<String, int> guests;
  final double total;
  final DateTime createdAt;

  const MockTourBooking({
    required this.code,
    required this.tourId,
    required this.tourTitle,
    required this.departureDate,
    required this.guests,
    required this.total,
    required this.createdAt,
    this.coverImageUrl,
  });

  int get guestCount => guests.values.fold(0, (a, b) => a + b);

  Map<String, dynamic> toJson() => {
        'code': code,
        'tourId': tourId,
        'tourTitle': tourTitle,
        'coverImageUrl': coverImageUrl,
        'departureDate': departureDate.toIso8601String(),
        'guests': guests,
        'total': total,
        'createdAt': createdAt.toIso8601String(),
      };

  static MockTourBooking? fromJson(Map<String, dynamic> json) {
    final departure = DateTime.tryParse(json['departureDate']?.toString() ?? '');
    final created = DateTime.tryParse(json['createdAt']?.toString() ?? '');
    if (departure == null || created == null) return null;
    final rawGuests = json['guests'];
    return MockTourBooking(
      code: json['code']?.toString() ?? '',
      tourId: (json['tourId'] as num?)?.toInt() ?? 0,
      tourTitle: json['tourTitle']?.toString() ?? '',
      coverImageUrl: json['coverImageUrl']?.toString(),
      departureDate: departure,
      guests: rawGuests is Map
          ? {for (final e in rawGuests.entries) e.key.toString(): (e.value as num?)?.toInt() ?? 0}
          : const {},
      total: (json['total'] as num?)?.toDouble() ?? 0,
      createdAt: created,
    );
  }
}

class MockTourBookingStore {
  MockTourBookingStore._();

  static const _key = 'journeygo_mock_tour_bookings_v1';

  /// Vé giả lập, mới đặt trước.
  static Future<List<MockTourBooking>> list() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_key);
      if (raw == null || raw.isEmpty) return const [];
      final items = (jsonDecode(raw) as List)
          .whereType<Map<String, dynamic>>()
          .map(MockTourBooking.fromJson)
          .whereType<MockTourBooking>()
          .toList()
        ..sort((a, b) => b.createdAt.compareTo(a.createdAt));
      return items;
    } catch (_) {
      return const [];
    }
  }

  static Future<void> add(MockTourBooking booking) async {
    final items = [booking, ...await list()];
    await _save(items);
  }

  static Future<void> remove(String code) async {
    final items = (await list()).where((b) => b.code != code).toList();
    await _save(items);
  }

  static Future<void> _save(List<MockTourBooking> items) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_key, jsonEncode(items.map((b) => b.toJson()).toList()));
  }

  /// Mã vé dễ đọc: GL-yyMMdd-XXXX.
  static String newCode(DateTime now) {
    final y = (now.year % 100).toString().padLeft(2, '0');
    final m = now.month.toString().padLeft(2, '0');
    final d = now.day.toString().padLeft(2, '0');
    final suffix = (now.microsecondsSinceEpoch % 0xFFFF).toRadixString(16).toUpperCase().padLeft(4, '0');
    return 'GL-$y$m$d-$suffix';
  }
}
