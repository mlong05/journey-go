import 'package:shared_preferences/shared_preferences.dart';

/// Ghi nhớ các booking đã "thanh toán giả" (chỉ dùng khi ApiConstants.mockPayment bật).
/// Dữ liệu nằm cục bộ trên máy, không đổi gì trên server.
class MockPaymentStore {
  MockPaymentStore._();

  static const _key = 'journeygo_mock_paid_bookings';

  static Future<Set<int>> paidIds() async {
    final prefs = await SharedPreferences.getInstance();
    return (prefs.getStringList(_key) ?? const []).map(int.tryParse).whereType<int>().toSet();
  }

  static Future<void> markPaid(int bookingId) async {
    final prefs = await SharedPreferences.getInstance();
    final ids = (prefs.getStringList(_key) ?? const []).toSet()..add(bookingId.toString());
    await prefs.setStringList(_key, ids.toList());
  }
}
