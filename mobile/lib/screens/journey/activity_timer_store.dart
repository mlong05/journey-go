import 'package:shared_preferences/shared_preferences.dart';

/// Lưu mốc kết thúc đếm ngược của hoạt động thực địa, để du khách thoát màn hình / tắt app
/// rồi quay lại thì thời gian vẫn tính tiếp (không phải đếm lại từ đầu).
///
/// Mỗi nhiệm vụ một khóa; giá trị gắn với chỉ số trạm ([questionIndex]) để sang trạm khác
/// thì mốc cũ không còn hiệu lực.
class ActivityTimerStore {
  ActivityTimerStore._();

  /// Mốc quá cũ (bỏ dở hôm trước) thì bỏ, bắt đầu lại như bình thường.
  static const Duration _maxAge = Duration(hours: 24);

  static String _key(int journeyId, int taskId) => 'task_activity_end_${journeyId}_$taskId';

  static Future<void> save({
    required int journeyId,
    required int taskId,
    required int questionIndex,
    required DateTime endsAt,
  }) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(
        _key(journeyId, taskId),
        '$questionIndex|${endsAt.millisecondsSinceEpoch}',
      );
    } catch (_) {
      // Không lưu được thì chỉ mất khả năng khôi phục; đồng hồ trên màn hình vẫn chạy đúng.
    }
  }

  /// Mốc kết thúc đã lưu cho đúng trạm [questionIndex], hoặc null nếu không có / không còn hợp lệ.
  static Future<DateTime?> load({
    required int journeyId,
    required int taskId,
    required int questionIndex,
  }) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_key(journeyId, taskId));
      if (raw == null) return null;
      final parts = raw.split('|');
      final index = parts.length == 2 ? int.tryParse(parts[0]) : null;
      final ms = parts.length == 2 ? int.tryParse(parts[1]) : null;
      if (index == null || ms == null || index != questionIndex) {
        await prefs.remove(_key(journeyId, taskId));
        return null;
      }
      final endsAt = DateTime.fromMillisecondsSinceEpoch(ms);
      if (DateTime.now().difference(endsAt) > _maxAge) {
        await prefs.remove(_key(journeyId, taskId));
        return null;
      }
      return endsAt;
    } catch (_) {
      return null;
    }
  }

  static Future<void> clear({required int journeyId, required int taskId}) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_key(journeyId, taskId));
    } catch (_) {}
  }
}
