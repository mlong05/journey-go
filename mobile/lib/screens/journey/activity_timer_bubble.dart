import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart' show defaultTargetPlatform, kIsWeb, TargetPlatform, debugPrint;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart' show HapticFeedback;
import 'package:flutter_overlay_window/flutter_overlay_window.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../core/services/notification_alerts.dart';
import '../../l10n/locale_controller.dart';
import 'activity_overlay.dart';
import 'task_screen.dart';

/// Hoạt động thực địa đang đếm ngược (đã bấm bắt đầu, chưa quét QR xong).
class ActiveActivity {
  final int journeyId;
  final int taskId;
  final int? destinationId;
  final String taskName;
  final String destinationName;
  final DateTime endsAt;
  final int totalSeconds;

  const ActiveActivity({
    required this.journeyId,
    required this.taskId,
    required this.destinationId,
    required this.taskName,
    required this.destinationName,
    required this.endsAt,
    required this.totalSeconds,
  });

  int get secondsLeft {
    final ms = endsAt.difference(DateTime.now()).inMilliseconds;
    return ms <= 0 ? 0 : (ms / 1000).ceil();
  }

  bool get isDone => secondsLeft == 0;

  Map<String, dynamic> toJson() => {
        'journeyId': journeyId,
        'taskId': taskId,
        'destinationId': destinationId,
        'taskName': taskName,
        'destinationName': destinationName,
        'endsAt': endsAt.millisecondsSinceEpoch,
        'totalSeconds': totalSeconds,
      };

  static ActiveActivity? fromJson(Map<String, dynamic> j) {
    final journeyId = j['journeyId'];
    final taskId = j['taskId'];
    final endsAt = j['endsAt'];
    if (journeyId is! int || taskId is! int || endsAt is! int) return null;
    return ActiveActivity(
      journeyId: journeyId,
      taskId: taskId,
      destinationId: j['destinationId'] is int ? j['destinationId'] as int : null,
      taskName: j['taskName']?.toString() ?? '',
      destinationName: j['destinationName']?.toString() ?? '',
      endsAt: DateTime.fromMillisecondsSinceEpoch(endsAt),
      totalSeconds: j['totalSeconds'] is int ? j['totalSeconds'] as int : 0,
    );
  }
}

/// Hoạt động đang đếm ngược của cả app (mỗi lúc một hoạt động) — để bong bóng đồng hồ nổi
/// vẫn hiện khi du khách thoát màn nhiệm vụ đi xem chỗ khác. Lưu trên máy để tắt app mở lại vẫn còn.
class ActiveActivityTimer {
  ActiveActivityTimer._() {
    // Mở lại đúng nhiệm vụ đang đếm ⇒ bong bóng đã ẩn được hiện lại khi rời màn đó lần sau
    openTaskId.addListener(() {
      final a = current.value;
      if (a != null && openTaskId.value == a.taskId) bubbleHidden.value = false;
    });
  }
  static final ActiveActivityTimer instance = ActiveActivityTimer._();

  /// Du khách bấm X trên bong bóng trong app → "Ẩn": ẩn bong bóng (thời gian vẫn đếm).
  final ValueNotifier<bool> bubbleHidden = ValueNotifier(false);

  static const String _prefsKey = 'active_activity_timer';

  /// Mốc quá cũ (bỏ dở từ lâu) thì không hiện bong bóng nữa.
  static const Duration _maxAge = Duration(hours: 6);

  /// Hoạt động đang đếm (null = không có).
  final ValueNotifier<ActiveActivity?> current = ValueNotifier(null);

  /// Nhiệm vụ đang mở trên màn hình (bong bóng của chính nhiệm vụ đó thì ẩn đi).
  final ValueNotifier<int?> openTaskId = ValueNotifier(null);

  /// Đọc lại hoạt động đã lưu lúc mở app.
  Future<void> restore() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_prefsKey);
      if (raw == null) return;
      final activity = ActiveActivity.fromJson(jsonDecode(raw) as Map<String, dynamic>);
      if (activity == null || DateTime.now().difference(activity.endsAt) > _maxAge) {
        await prefs.remove(_prefsKey);
        return;
      }
      current.value = activity;
      _showCountdownNotification(activity);
      _armTimeUp(activity);
    } catch (_) {
      // Dữ liệu hỏng ⇒ coi như không có hoạt động đang đếm.
    }
  }

  Future<void> start(ActiveActivity activity) async {
    final previous = current.value;
    current.value = activity;
    // Hoạt động khác / lượt đếm mới ⇒ ô nổi được hiện lại (du khách đã ẩn lượt cũ)
    if (previous == null || previous.taskId != activity.taskId || previous.endsAt != activity.endsAt) {
      _overlayDismissed = false;
      bubbleHidden.value = false;
    }
    _showCountdownNotification(activity);
    _armTimeUp(activity);
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_prefsKey, jsonEncode(activity.toJson()));
    } catch (_) {}
  }

  // ── Báo hết giờ đúng lúc (chuông + rung) ────────────────────────────────────

  /// Hẹn giờ TRONG APP tới đúng lúc về 0 — chạy dù đang ở màn nào (kể cả màn nhiệm vụ) và cả khi app
  /// chạy nền. Lịch thông báo của hệ thống vẫn giữ làm dự phòng khi app đã bị tắt hẳn.
  Timer? _dueTimer;

  void _armTimeUp(ActiveActivity a) {
    _dueTimer?.cancel();
    final wait = a.endsAt.difference(DateTime.now());
    if (wait <= Duration.zero) return;
    _dueTimer = Timer(wait, () => _onTimeUp(a));
  }

  void _onTimeUp(ActiveActivity a) {
    final cur = current.value;
    // Hoạt động đã xong / đổi lượt khác trong lúc chờ ⇒ bỏ
    if (cur == null || cur.taskId != a.taskId || cur.endsAt != a.endsAt) return;
    NotificationAlerts.instance.showTimeUpNow(
      id: NotificationAlerts.activityReminderId(a.journeyId, a.taskId),
      title: appL10n.tkTimeUpTitle(a.taskName),
      body: appL10n.tkTimeUpBody(a.destinationName),
      payload: NotificationAlerts.activityPayload(a.journeyId, a.taskId),
    );
  }

  /// Bỏ hoạt động của nhiệm vụ [taskId] (xong trạm / xong nhiệm vụ / sang trạm mới).
  Future<void> clear({required int journeyId, required int taskId}) async {
    final a = current.value;
    if (a == null || a.journeyId != journeyId || a.taskId != taskId) return;
    current.value = null;
    _dueTimer?.cancel();
    _dueTimer = null;
    NotificationAlerts.instance.cancelReminder(NotificationAlerts.activityCountdownId(journeyId, taskId));
    closeOverlay();
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_prefsKey);
      await prefs.remove(OverlayPayload.prefsKey);
    } catch (_) {}
  }

  // ── Thông báo đồng hồ đếm ngược (màn hình khoá) ───────────────────────────

  /// Thông báo cố định có đồng hồ hệ thống đếm ngược — hiện cả trên màn hình khoá, kể cả khi app tắt.
  void _showCountdownNotification(ActiveActivity a) {
    if (a.isDone) return;
    NotificationAlerts.instance.showCountdown(
      id: NotificationAlerts.activityCountdownId(a.journeyId, a.taskId),
      endsAt: a.endsAt,
      title: a.taskName,
      body: appL10n.tkCountdownBody(a.destinationName),
      payload: NotificationAlerts.activityPayload(a.journeyId, a.taskId),
    );
  }

  /// Đổi ngôn ngữ khi đang đếm ⇒ hẹn lại "Hết giờ" + cập nhật đồng hồ trên màn hình khoá bằng ngôn ngữ mới
  /// (tên hoạt động giữ nguyên tới khi mở lại nhiệm vụ — tên do máy chủ dịch theo lúc tải).
  void relocalize() {
    final a = current.value;
    if (a == null || a.isDone) return;
    NotificationAlerts.instance.scheduleReminder(
      id: NotificationAlerts.activityReminderId(a.journeyId, a.taskId),
      at: a.endsAt,
      title: appL10n.tkTimeUpTitle(a.taskName),
      body: appL10n.tkTimeUpBody(a.destinationName),
      payload: NotificationAlerts.activityPayload(a.journeyId, a.taskId),
    );
    _showCountdownNotification(a);
  }

  // ── Ô đồng hồ nổi trên màn hình chính (Android) ───────────────────────────

  static bool get _overlaySupported => !kIsWeb && defaultTargetPlatform == TargetPlatform.android;

  /// Du khách đã bấm X → "Ẩn" cho lượt đếm hiện tại ⇒ không tự mở lại khi rời app lần nữa.
  bool _overlayDismissed = false;

  static const String _permAskedKey = 'activity_overlay_perm_asked';

  /// Hỏi quyền "hiển thị trên ứng dụng khác" (một lần) khi du khách bắt đầu hoạt động có đếm giờ.
  Future<void> askOverlayPermissionOnce(BuildContext context) async {
    if (!_overlaySupported) return;
    try {
      if (await FlutterOverlayWindow.isPermissionGranted()) return;
      final prefs = await SharedPreferences.getInstance();
      if (prefs.getBool(_permAskedKey) ?? false) return;
      await prefs.setBool(_permAskedKey, true);
      if (!context.mounted) return;
      final allow = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          icon: const Icon(Icons.picture_in_picture_alt_rounded),
          title: Text(appL10n.ovPermTitle),
          content: Text(appL10n.ovPermBody),
          actions: [
            TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: Text(appL10n.ovPermLater)),
            FilledButton(onPressed: () => Navigator.of(ctx).pop(true), child: Text(appL10n.ovPermAllow)),
          ],
        ),
      );
      if (allow == true) await FlutterOverlayWindow.requestPermission();
    } catch (e) {
      debugPrint('Không xin được quyền hiển thị trên ứng dụng khác: $e');
    }
  }

  /// Rời app khi đang đếm ⇒ mở ô đồng hồ nổi (nếu có quyền và du khách chưa ẩn lượt này).
  Future<void> showOverlay() async {
    final a = current.value;
    if (!_overlaySupported || a == null || _overlayDismissed) return;
    try {
      if (!await FlutterOverlayWindow.isPermissionGranted()) return;
      // Ô nổi (engine riêng) ghi cờ "đã ẩn" vào bộ nhớ máy ⇒ đọc lại để biết du khách đã ẩn lượt này chưa
      final prefs = await SharedPreferences.getInstance();
      await prefs.reload();
      if (prefs.getInt(OverlayPayload.dismissedEndsAtKey) == a.endsAt.millisecondsSinceEpoch) {
        _overlayDismissed = true;
        return;
      }
      final payload = jsonEncode(OverlayPayload.build(
        endsAt: a.endsAt,
        totalSeconds: a.totalSeconds,
        taskName: a.taskName,
        timeUp: appL10n.tkTimeUp,
        scanQr: appL10n.tkScanQrOnSite,
        hideTitle: appL10n.ovHideTitle,
        hideBody: appL10n.ovHideBody,
        hide: appL10n.ovHide,
        cancel: appL10n.ovCancel,
      ));
      await prefs.setString(OverlayPayload.prefsKey, payload);
      if (!await FlutterOverlayWindow.isActive()) {
        // showOverlay nhận PIXEL (khác resizeOverlay nhận dp) ⇒ đổi dp → px, nếu không ô chỉ còn ~90 dp,
        // chữ bị ép mất và tràn ngang ("OVERFLOWED").
        final dpr = WidgetsBinding.instance.platformDispatcher.views.first.devicePixelRatio;
        await FlutterOverlayWindow.showOverlay(
          width: (OverlayPayload.compactWidth * dpr).round(),
          height: (OverlayPayload.compactHeight * dpr).round(),
          alignment: OverlayAlignment.topRight,
          enableDrag: true,
          positionGravity: PositionGravity.auto,
          overlayTitle: a.taskName,
          overlayContent: appL10n.tkCountdownBody(a.destinationName),
          visibility: NotificationVisibility.visibilityPublic,
        );
      }
      await FlutterOverlayWindow.shareData(payload);
    } catch (e) {
      debugPrint('Không mở được ô đồng hồ nổi: $e');
    }
  }

  /// Quay lại app / xong hoạt động ⇒ đóng ô nổi (trong app đã có bong bóng).
  Future<void> closeOverlay() async {
    if (!_overlaySupported) return;
    try {
      if (await FlutterOverlayWindow.isActive()) await FlutterOverlayWindow.closeOverlay();
    } catch (_) {}
  }

  /// Ô nổi báo du khách đã bấm "Ẩn".
  void markOverlayDismissed() => _overlayDismissed = true;
}

/// Bọc toàn app (đặt trong `MaterialApp.builder`): hiện bong bóng đồng hồ nổi khi có hoạt động
/// đang đếm và du khách KHÔNG ở màn nhiệm vụ đó. Chạm để mở lại nhiệm vụ; kéo để dời chỗ.
class ActivityTimerBubbleHost extends StatefulWidget {
  final GlobalKey<NavigatorState> navigatorKey;
  final Widget child;

  const ActivityTimerBubbleHost({super.key, required this.navigatorKey, required this.child});

  @override
  State<ActivityTimerBubbleHost> createState() => _ActivityTimerBubbleHostState();
}

class _ActivityTimerBubbleHostState extends State<ActivityTimerBubbleHost> with WidgetsBindingObserver {
  final _timer = ActiveActivityTimer.instance;
  StreamSubscription<dynamic>? _overlaySub;

  /// Vị trí bong bóng (tính từ mép dưới bên phải); null = vị trí mặc định.
  Offset? _offset;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _timer.restore();
    // Chạm vào thông báo "Hết giờ" / đồng hồ trên màn hình khoá ⇒ mở thẳng màn nhiệm vụ
    NotificationAlerts.instance.onOpenActivity = _openById;
    // Đổi ngôn ngữ khi đang đếm ⇒ thông báo dùng ngôn ngữ mới
    LocaleController.instance.addListener(_timer.relocalize);
    if (ActiveActivityTimer._overlaySupported) {
      // Ô nổi báo du khách bấm "Ẩn" ⇒ không tự mở lại lượt này
      _overlaySub = FlutterOverlayWindow.overlayListener.listen((event) {
        if (event == OverlayPayload.dismissedMessage) _timer.markOverlayDismissed();
      });
      // Mở app lại khi ô nổi còn treo (app bị tắt lúc đang ở màn hình chính) ⇒ đóng đi
      _timer.closeOverlay();
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    LocaleController.instance.removeListener(_timer.relocalize);
    if (NotificationAlerts.instance.onOpenActivity == _openById) NotificationAlerts.instance.onOpenActivity = null;
    _overlaySub?.cancel();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // Rời app (về màn hình chính / mở app khác) ⇒ ô đồng hồ nổi; quay lại ⇒ đóng (trong app có bong bóng)
    if (state == AppLifecycleState.paused) {
      _timer.showOverlay();
    } else if (state == AppLifecycleState.resumed) {
      _timer.closeOverlay();
    }
  }

  void _openById(int journeyId, int taskId) {
    final a = _timer.current.value;
    if (a != null && a.journeyId == journeyId && a.taskId == taskId) {
      _open(a);
      return;
    }
    final navigator = widget.navigatorKey.currentState;
    if (navigator == null) return;
    navigator.push(MaterialPageRoute(
      builder: (_) => TaskScreen(journeyId: journeyId, taskId: taskId, fallbackName: '', destinationName: ''),
    ));
  }

  void _open(ActiveActivity a) {
    final navigator = widget.navigatorKey.currentState;
    if (navigator == null) return;
    // Đang mở đúng nhiệm vụ này rồi ⇒ không mở chồng thêm một màn
    if (_timer.openTaskId.value == a.taskId) return;
    HapticFeedback.selectionClick();
    navigator.push(MaterialPageRoute(
      builder: (_) => TaskScreen(
        journeyId: a.journeyId,
        taskId: a.taskId,
        fallbackName: a.taskName,
        destinationName: a.destinationName,
        destinationId: a.destinationId,
      ),
    ));
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        widget.child,
        ValueListenableBuilder<ActiveActivity?>(
          valueListenable: _timer.current,
          builder: (context, activity, _) => ValueListenableBuilder<int?>(
            valueListenable: _timer.openTaskId,
            builder: (context, openTaskId, _) => ValueListenableBuilder<bool>(
              valueListenable: _timer.bubbleHidden,
              builder: (context, hidden, _) {
              final visible = activity != null && openTaskId != activity.taskId && !hidden;
              if (!visible) return const SizedBox.shrink();
              final media = MediaQuery.of(context);
              // Mặc định: góc dưới phải, nằm trên thanh điều hướng + nút Check-in nổi
              final offset = _offset ?? Offset(12, media.padding.bottom + 108);
              return Positioned(
                right: offset.dx,
                bottom: offset.dy,
                child: GestureDetector(
                  onPanUpdate: (d) => setState(() {
                    final size = media.size;
                    _offset = Offset(
                      (offset.dx - d.delta.dx).clamp(8.0, size.width - 260),
                      (offset.dy - d.delta.dy).clamp(media.padding.bottom + 8, size.height - media.padding.top - 80),
                    );
                  }),
                  child: _TimerBubble(
                    activity: activity,
                    onTap: () => _open(activity),
                    onClose: _confirmHide,
                  ),
                ),
              );
              },
            ),
          ),
        ),
      ],
    );
  }

  /// Nút X trên bong bóng: hỏi lại trước khi ẩn — thời gian vẫn đếm (thông báo, màn hình khoá, ô nổi).
  Future<void> _confirmHide() async {
    // Host nằm NGOÀI Navigator ⇒ mở hộp thoại bằng context của Navigator
    final ctx = widget.navigatorKey.currentContext;
    if (ctx == null) return;
    final hide = await showDialog<bool>(
      context: ctx,
      builder: (dialogCtx) => AlertDialog(
        title: Text(appL10n.ovHideTitle),
        content: Text(appL10n.ovHideBody),
        actions: [
          TextButton(onPressed: () => Navigator.of(dialogCtx).pop(false), child: Text(appL10n.ovCancel)),
          FilledButton(onPressed: () => Navigator.of(dialogCtx).pop(true), child: Text(appL10n.ovHide)),
        ],
      ),
    );
    if (hide == true) _timer.bubbleHidden.value = true;
  }
}

/// Bong bóng: vòng tiến độ + "mm:ss" + tên hoạt động; hết giờ ⇒ xanh ngọc "Hết giờ! · Quét mã QR".
class _TimerBubble extends StatefulWidget {
  final ActiveActivity activity;
  final VoidCallback onTap;

  /// Nút X: ẩn bong bóng (có hỏi lại); thời gian vẫn đếm.
  final VoidCallback onClose;

  const _TimerBubble({required this.activity, required this.onTap, required this.onClose});

  @override
  State<_TimerBubble> createState() => _TimerBubbleState();
}

class _TimerBubbleState extends State<_TimerBubble> {
  static const _night = Color(0xFF0F172A);
  // Hết giờ: cam đậm — "cần quay lại quét QR ngay", khác hẳn xanh ngọc của nút Check-in (đỏ dễ hiểu nhầm là lỗi)
  static const _timeUp = Color(0xFFEA580C);
  static const _accentBright = Color(0xFF2DD4BF);
  static const _muted = Color(0xFF94A3B8);

  Timer? _tick;
  late bool _wasDone = widget.activity.isDone;

  @override
  void initState() {
    super.initState();
    // Chỉ để vẽ lại; số giây luôn tính từ mốc kết thúc
    _tick = Timer.periodic(const Duration(milliseconds: 500), (_) {
      if (!mounted) return;
      final done = widget.activity.isDone;
      // Hết giờ khi đang ở màn khác trong app ⇒ rung mạnh để du khách biết quay lại quét QR
      if (done && !_wasDone) {
        HapticFeedback.heavyImpact();
        Future.delayed(const Duration(milliseconds: 180), HapticFeedback.heavyImpact);
      }
      _wasDone = done;
      setState(() {});
    });
  }

  @override
  void dispose() {
    _tick?.cancel();
    super.dispose();
  }

  String _mmss(int seconds) {
    final m = seconds ~/ 60;
    final s = seconds % 60;
    return '${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final a = widget.activity;
    final left = a.secondsLeft;
    final done = left == 0;
    final total = a.totalSeconds <= 0 ? 1 : a.totalSeconds;
    final progress = done ? 1.0 : 1 - (left / total).clamp(0.0, 1.0);

    return Semantics(
      button: true,
      label: done ? '${appL10n.tkTimeUp} ${appL10n.tkScanQrOnSite}' : '${a.taskName} ${_mmss(left)}',
      child: Material(
        color: done ? _timeUp : _night,
        elevation: 10,
        shadowColor: Colors.black.withValues(alpha: 0.35),
        borderRadius: BorderRadius.circular(999),
        child: InkWell(
          borderRadius: BorderRadius.circular(999),
          onTap: widget.onTap,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(6, 6, 6, 6),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                SizedBox(
                  width: 40,
                  height: 40,
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      CircularProgressIndicator(
                        value: progress,
                        strokeWidth: 3.5,
                        backgroundColor: Colors.white.withValues(alpha: 0.15),
                        valueColor: AlwaysStoppedAnimation(done ? Colors.white : _accentBright),
                      ),
                      Icon(
                        done ? Icons.qr_code_scanner_rounded : Icons.timer_outlined,
                        size: 18,
                        color: Colors.white,
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 10),
                ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 150),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        done ? appL10n.tkTimeUp : _mmss(left),
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 17,
                          fontWeight: FontWeight.w800,
                          fontFeatures: [FontFeature.tabularFigures()],
                          height: 1.1,
                        ),
                      ),
                      Text(
                        done ? appL10n.tkScanQrOnSite : a.taskName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: done ? Colors.white.withValues(alpha: 0.9) : _muted,
                          fontSize: 11.5,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                // Nút X: ẩn bong bóng (hỏi lại trước), thời gian vẫn đếm.
                // ⚠️ KHÔNG dùng Tooltip: bong bóng nằm ngoài Navigator (không có Overlay) ⇒ Tooltip ném lỗi
                // và cả vùng bong bóng thành màn hình đỏ báo lỗi.
                Semantics(
                  button: true,
                  label: appL10n.ovHide,
                  child: Material(
                    color: Colors.white.withValues(alpha: 0.14),
                    shape: const CircleBorder(),
                    child: InkWell(
                      customBorder: const CircleBorder(),
                      onTap: widget.onClose,
                      child: const SizedBox(
                        width: 32,
                        height: 32,
                        child: Icon(Icons.close_rounded, size: 17, color: Colors.white),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
