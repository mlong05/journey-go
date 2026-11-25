import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart' show HapticFeedback;
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/data/latest_all.dart' as tzdata;
import 'package:timezone/timezone.dart' as tz;
import '../models/notification_model.dart';
import '../constants/app_colors.dart';
import '../../l10n/locale_controller.dart';

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

  /// Du khách chạm vào thông báo của hoạt động thực địa ("Hết giờ" / đồng hồ đếm ngược) ⇒ mở màn nhiệm vụ.
  /// Đặt sau khi thông báo đã được chạm (app mở từ trạng thái tắt) thì gọi ngay với lần chạm đang chờ.
  void Function(int journeyId, int taskId)? get onOpenActivity => _onOpenActivity;
  set onOpenActivity(void Function(int journeyId, int taskId)? handler) {
    _onOpenActivity = handler;
    final pending = _pendingActivity;
    if (handler != null && pending != null) {
      _pendingActivity = null;
      handler(pending.$1, pending.$2);
    }
  }

  void Function(int journeyId, int taskId)? _onOpenActivity;
  (int, int)? _pendingActivity;

  /// Payload thông báo hoạt động thực địa: `activity:<journeyId>:<taskId>`.
  static String activityPayload(int journeyId, int taskId) => 'activity:$journeyId:$taskId';

  /// Id cố định (ổn định giữa các lần mở app) cho thông báo "Hết giờ" của một hoạt động.
  /// ⚠️ Không dùng `Object.hash`: giá trị đó đổi theo từng lần chạy ⇒ mở lại app không huỷ được lịch cũ.
  static int activityReminderId(int journeyId, int taskId) => (0x1000000 + journeyId * 7919 + taskId) & 0x3fffffff;

  /// Id thông báo đồng hồ đếm ngược (cố định) của một hoạt động — khác id "Hết giờ".
  static int activityCountdownId(int journeyId, int taskId) => activityReminderId(journeyId, taskId) | 0x40000000;

  bool _handleActivityPayload(String? payload) {
    if (payload == null || !payload.startsWith('activity:')) return false;
    final parts = payload.split(':');
    final journeyId = parts.length == 3 ? int.tryParse(parts[1]) : null;
    final taskId = parts.length == 3 ? int.tryParse(parts[2]) : null;
    if (journeyId == null || taskId == null) return true;
    final handler = _onOpenActivity;
    if (handler != null) {
      handler(journeyId, taskId);
    } else {
      _pendingActivity = (journeyId, taskId);
    }
    return true;
  }

  /// Khởi tạo một lần khi vào màn chính và xin quyền thông báo (Android 13+).
  Future<void> init() async {
    if (_ready || kIsWeb || defaultTargetPlatform != TargetPlatform.android) return;
    try {
      await _plugin.initialize(
        settings: const InitializationSettings(android: AndroidInitializationSettings('@mipmap/ic_launcher')),
        onDidReceiveNotificationResponse: (response) {
          if (_handleActivityPayload(response.payload)) return;
          final id = int.tryParse(response.payload ?? '');
          final n = id == null ? null : _shown[id];
          if (n != null) onOpen?.call(n);
        },
      );
      final android = _plugin.resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();
      _allowed = await android?.requestNotificationsPermission() ?? false;
      _ready = true;
      // App được mở bằng cách chạm vào thông báo hoạt động (lúc app đang tắt)
      final launch = await _plugin.getNotificationAppLaunchDetails();
      if (launch?.didNotificationLaunchApp ?? false) {
        _handleActivityPayload(launch?.notificationResponse?.payload);
      }
    } catch (e) {
      debugPrint('Không khởi tạo được thông báo hệ thống: $e');
    }
  }

  static const _timerChannelId = 'journeygo_activity_timer';
  static const _countdownChannelId = 'journeygo_activity_countdown';
  bool _tzReady = false;

  /// Hẹn một thông báo hệ thống vào thời điểm [at] (vd hết giờ đếm ngược hoạt động thực địa) — vẫn hiện
  /// khi app chạy nền, máy khoá hoặc du khách đã rời màn hình. Gọi lại với cùng [id] sẽ thay lịch cũ.
  /// Máy cho phép báo thức chính xác ⇒ báo đúng giây; không thì dùng lịch "inexact" (có thể trễ một chút).
  Future<void> scheduleReminder({
    required int id,
    required DateTime at,
    required String title,
    required String body,
    String? payload,
  }) async {
    await init();
    if (!_ready || !_allowed || !at.isAfter(DateTime.now())) return;
    try {
      if (!_tzReady) {
        tzdata.initializeTimeZones();
        _tzReady = true;
      }
      final android = _plugin.resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();
      final exact = await android?.canScheduleExactNotifications() ?? false;
      await _plugin.zonedSchedule(
        id: id,
        title: title,
        body: body,
        payload: payload,
        scheduledDate: tz.TZDateTime.from(at.toUtc(), tz.UTC),
        androidScheduleMode: exact ? AndroidScheduleMode.exactAllowWhileIdle : AndroidScheduleMode.inexactAllowWhileIdle,
        notificationDetails: _timeUpDetails(),
      );
    } catch (e) {
      debugPrint('Không hẹn được thông báo: $e');
    }
  }

  /// Kênh "Hết giờ": chuông + rung (theo âm lượng / chế độ âm thanh của máy), hiện banner, mức báo thức.
  NotificationDetails _timeUpDetails() => NotificationDetails(
        android: AndroidNotificationDetails(
          _timerChannelId,
          appL10n.notifChannelTimer,
          channelDescription: appL10n.notifChannelTimerDesc,
          importance: Importance.high,
          priority: Priority.high,
          playSound: true,
          enableVibration: true,
          vibrationPattern: Int64List.fromList([0, 400, 200, 400]),
          color: AppCultureColors.jade600,
          category: AndroidNotificationCategory.alarm,
        ),
      );

  /// Báo "Hết giờ" NGAY (chuông + rung + banner) — app gọi đúng lúc về 0 khi còn đang chạy (mở app,
  /// chạy nền, ô nổi). Dùng cùng [id] với lịch đã hẹn ⇒ thay lịch đó, không báo hai lần.
  Future<void> showTimeUpNow({
    required int id,
    required String title,
    required String body,
    String? payload,
  }) async {
    await init();
    if (!_ready || !_allowed) {
      HapticFeedback.vibrate();
      return;
    }
    try {
      await _plugin.cancel(id: id);
      await _plugin.show(id: id, title: title, body: body, payload: payload, notificationDetails: _timeUpDetails());
    } catch (e) {
      debugPrint('Không hiện được thông báo hết giờ: $e');
    }
  }

  /// Huỷ thông báo đã hẹn (hoạt động xong sớm / bị huỷ).
  Future<void> cancelReminder(int id) async {
    if (!_ready) return;
    try {
      await _plugin.cancel(id: id);
    } catch (_) {}
  }

  /// Thông báo cố định có đồng hồ đếm ngược DO HỆ THỐNG CHẠY (hiện cả trên màn hình khoá, kể cả khi app
  /// đã tắt — không cần dịch vụ nền). Im lặng (không chuông / rung); tự biến mất khi về 0 để thông báo
  /// "Hết giờ" (đã hẹn riêng, có rung) thay chỗ. Gọi lại với cùng [id] chỉ cập nhật nội dung.
  Future<void> showCountdown({
    required int id,
    required DateTime endsAt,
    required String title,
    required String body,
    String? payload,
  }) async {
    await init();
    final remaining = endsAt.difference(DateTime.now());
    if (!_ready || !_allowed || remaining <= Duration.zero) return;
    try {
      await _plugin.show(
        id: id,
        title: title,
        body: body,
        payload: payload,
        notificationDetails: NotificationDetails(
          android: AndroidNotificationDetails(
            _countdownChannelId,
            appL10n.notifChannelCountdown,
            channelDescription: appL10n.notifChannelCountdownDesc,
            importance: Importance.low,
            priority: Priority.low,
            playSound: false,
            enableVibration: false,
            onlyAlertOnce: true,
            ongoing: true,
            autoCancel: false,
            showWhen: true,
            when: endsAt.millisecondsSinceEpoch,
            usesChronometer: true,
            chronometerCountDown: true,
            timeoutAfter: remaining.inMilliseconds,
            visibility: NotificationVisibility.public,
            category: AndroidNotificationCategory.progress,
            color: AppCultureColors.jade600,
          ),
        ),
      );
    } catch (e) {
      debugPrint('Không hiện được đồng hồ đếm ngược: $e');
    }
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
            appL10n.notifChannelMain,
            channelDescription: appL10n.notifChannelMainDesc,
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
