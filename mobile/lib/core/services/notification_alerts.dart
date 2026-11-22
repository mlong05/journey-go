import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart' show HapticFeedback;
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/data/latest_all.dart' as tzdata;
import 'package:timezone/timezone.dart' as tz;
import '../models/notification_model.dart';
import '../constants/app_colors.dart';

/// Báo thông báo mới bằng thông báo hệ thống: phát âm thanh thông báo mặc định của điện thoại và rung,
/// hiện banner trên cùng màn hình và lưu lại trong thanh thông báo.
///
/// Du khách không cho quyền thông báo (Android 13+) thì chỉ rung, app vẫn hiện banner trong app.
class NotificationAlerts {
  NotificationAlerts._();
  static final NotificationAlerts instance = NotificationAlerts._();

  static const _channelId = 'journeygo_alerts';

  final FlutterLocalNotificationsPlugin _plugin = FlutterLocalNotificationsPlugin();
  bool _ready = false;
  bool _allowed = false;

  /// Thông báo đã hiện, theo id, để mở đúng màn khi du khách chạm vào thông báo hệ thống.
  final Map<int, AppNotification> _shown = {};

  /// Du khách chạm vào thông báo hệ thống (màn chính đăng ký để điều hướng).
  void Function(AppNotification n)? onOpen;

  /// Khởi tạo một lần khi vào màn chính và xin quyền thông báo (Android 13+).
  Future<void> init() async {
    if (_ready || kIsWeb || defaultTargetPlatform != TargetPlatform.android) return;
    try {
      await _plugin.initialize(
        settings: const InitializationSettings(android: AndroidInitializationSettings('@mipmap/ic_launcher')),
        onDidReceiveNotificationResponse: (response) {
          final id = int.tryParse(response.payload ?? '');
          final n = id == null ? null : _shown[id];
          if (n != null) onOpen?.call(n);
        },
      );
      final android = _plugin.resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();
      _allowed = await android?.requestNotificationsPermission() ?? false;
      _ready = true;
    } catch (e) {
      debugPrint('Không khởi tạo được thông báo hệ thống: $e');
    }
  }

  static const _timerChannelId = 'journeygo_activity_timer';
  bool _tzReady = false;

  /// Hẹn một thông báo hệ thống vào thời điểm [at] (vd hết giờ đếm ngược hoạt động thực địa) — vẫn hiện
  /// khi app chạy nền hoặc du khách đã rời màn hình. Gọi lại với cùng [id] sẽ thay lịch cũ.
  /// Dùng chế độ "inexact" (không cần quyền báo thức chính xác): có thể trễ vài giây đến một phút.
  Future<void> scheduleReminder({
    required int id,
    required DateTime at,
    required String title,
    required String body,
  }) async {
    await init();
    if (!_ready || !_allowed || !at.isAfter(DateTime.now())) return;
    try {
      if (!_tzReady) {
        tzdata.initializeTimeZones();
        _tzReady = true;
      }
      await _plugin.zonedSchedule(
        id: id,
        title: title,
        body: body,
        scheduledDate: tz.TZDateTime.from(at.toUtc(), tz.UTC),
        androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
        notificationDetails: NotificationDetails(
          android: AndroidNotificationDetails(
            _timerChannelId,
            'Hẹn giờ hoạt động',
            channelDescription: 'Nhắc khi hết giờ đếm ngược của hoạt động thực địa',
            importance: Importance.high,
            priority: Priority.high,
            playSound: true,
            enableVibration: true,
            vibrationPattern: Int64List.fromList([0, 400, 200, 400]),
            color: AppCultureColors.jade600,
            category: AndroidNotificationCategory.alarm,
          ),
        ),
      );
    } catch (e) {
      debugPrint('Không hẹn được thông báo: $e');
    }
  }

  /// Huỷ thông báo đã hẹn (hoạt động xong sớm / bị huỷ).
  Future<void> cancelReminder(int id) async {
    if (!_ready) return;
    try {
      await _plugin.cancel(id: id);
    } catch (_) {}
  }

  /// Chỉ rung nhẹ, không âm thanh, không banner (dùng cho tin nhắn chat).
  void vibrateOnly() => HapticFeedback.lightImpact();

  /// Phát âm thanh + rung cho thông báo mới. Trả về true khi đã hiện thông báo hệ thống
  /// (khi đó màn chính không cần hiện thêm banner trong app).
  Future<bool> alert(AppNotification n) async {
    if (!_ready || !_allowed) {
      HapticFeedback.vibrate();
      return false;
    }
    try {
      // Id thông báo của backend có thể vượt quá số nguyên 32 bit mà Android yêu cầu
      final id = n.id.hashCode & 0x7fffffff;
      _shown[id] = n;
      await _plugin.show(
        id: id,
        title: n.title.isEmpty ? 'Journey Go' : n.title,
        body: n.body,
        payload: '$id',
        notificationDetails: NotificationDetails(
          android: AndroidNotificationDetails(
            _channelId,
            'Thông báo Journey Go',
            channelDescription: 'Đơn đặt tour, hoàn tiền, huy hiệu, bài viết diễn đàn',
            importance: Importance.high,
            priority: Priority.high,
            playSound: true,
            enableVibration: true,
            vibrationPattern: Int64List.fromList([0, 250, 150, 250]),
            styleInformation: BigTextStyleInformation(n.body),
            color: AppCultureColors.jade600,
            category: AndroidNotificationCategory.message,
          ),
        ),
      );
      return true;
    } catch (e) {
      debugPrint('Không hiện được thông báo hệ thống: $e');
      HapticFeedback.vibrate();
      return false;
    }
  }
}
