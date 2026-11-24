import 'dart:async';
import 'package:flutter/foundation.dart' show kDebugMode;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart' show HapticFeedback;
import 'package:flutter_compass/flutter_compass.dart';
import 'package:geolocator/geolocator.dart' show Position;
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/constants/app_colors.dart';
import '../../core/models/tour_journey_model.dart';
import '../../core/services/api_client.dart';
import '../../core/services/journey_service.dart';
import '../../core/services/location_service.dart';
import '../../core/services/notification_alerts.dart';
import '../../core/services/route_service.dart';
import 'activity_timer_store.dart';
import '../chat/ai_guide_chat_screen.dart';
import 'journey_widgets.dart';
import 'qr_scan_screen.dart';
import 'map_kit.dart' show MapRoundButton, MapAttributionText, formatDistance;
import 'navigation.dart' show formatDuration;
import 'reward_effects.dart';
import 'station_map.dart';
import 'hot_cold.dart';
import '../../l10n/locale_controller.dart';

/// `activity`: hoạt động thực địa của tour 5 bước — đếm ngược rồi quét QR tại điểm để mở câu hỏi.
enum _Phase { loading, intro, locked, activity, quiz, result, error }

/// Trong khoảng này tới trạm thì bỏ tuyến đường, chỉ còn la bàn + khoảng cách đường chim bay
/// (lối đi trong khuôn viên di tích hầu như không có trên bản đồ).
const int _compassRangeMeters = 250;

/// Đi lệch khỏi điểm xuất phát của tuyến quá mức này thì tìm lại đường.
const double _rerouteMeters = 60;

/// Xa hơn mức này thì gợi ý đi xe tới gần trạm thay vì báo thời gian đi bộ hàng giờ.
const int _walkableMeters = 2000;

/// Một nhiệm vụ tại điểm đến: giới thiệu, (dẫn đường tới trạm nếu cần vị trí), trả lời câu hỏi, kết quả.
///
/// Nhiệm vụ thường nộp cả bài một lần. Nhiệm vụ "tương tác ngoài thực tế" đi từng câu: mỗi câu gắn với
/// một địa điểm, phải đứng trong bán kính của trạm mới mở câu hỏi; sai một câu thì làm lại từ đầu.
/// Pop với giá trị `true` khi tiến độ có thay đổi để màn hành trình tải lại.
class TaskScreen extends StatefulWidget {
  final int journeyId;
  final int taskId;
  final String fallbackName;
  final String destinationName;
  final int? destinationId;

  const TaskScreen({
    super.key,
    required this.journeyId,
    required this.taskId,
    required this.fallbackName,
    required this.destinationName,
    this.destinationId,
  });

  @override
  State<TaskScreen> createState() => _TaskScreenState();
}

class _TaskScreenState extends State<TaskScreen> with WidgetsBindingObserver {
  final JourneyService _service = JourneyService();

  _Phase _phase = _Phase.loading;
  TaskContent? _content;
  TaskSubmitResult? _result;
  String? _error;
  String? _locationMessage;
  bool _locationNeedsSettings = false;
  bool _busy = false;
  bool _changed = false;

  double? _lat;
  double? _lng;
  bool _locatingIntro = false;
  String? _introLocationError;
  String?
  _qr; // mã QR đã quét để mở khóa câu hiện tại (nếu mở bằng QR thay vì GPS)

  // Theo dõi vị trí liên tục khi đang dẫn đường tới trạm (bước "locked").
  StreamSubscription<Position>? _positionSub;
  double? _heading; // hướng đang đi, null khi đứng yên
  StreamSubscription<CompassEvent>? _compassSub;
  double? _compassHeading; // hướng điện thoại đang quay, dùng khi đứng yên
  RouteModel? _walkRoute; // tuyến đi bộ khi còn xa trạm
  LatLng? _walkRouteOrigin;
  DateTime? _walkRouteAt;
  bool _walkRouteLoading = false;
  DateTime? _lastAutoCheck;
  bool _arrivedNotified = false;

  /// Mức "nóng – lạnh" lần đo gần nhất (rung khi lên mức nóng hơn).
  Warmth _warmth = Warmth.cold;
  final GlobalKey<StationMapState> _mapKey = GlobalKey<StationMapState>();
  bool _satellite = false;

  int _index = 0;
  final Map<int, int> _choices = {};
  final Map<int, TextEditingController> _texts = {};

  // Hoạt động thực địa: đếm ngược trước khi được quét QR.
  // Tính theo mốc kết thúc (không trừ dần từng giây) để ẩn app / thoát ra vào lại vẫn đúng giờ.
  Timer? _activityTimer;
  DateTime? _activityEndsAt;

  int get _secondsLeft {
    final end = _activityEndsAt;
    if (end == null) return 0;
    final ms = end.difference(DateTime.now()).inMilliseconds;
    return ms <= 0 ? 0 : (ms / 1000).ceil();
  }

  /// Đã đếm ngược xong (hoặc hoạt động không đếm giờ): được quét QR. Giữ nguyên khi làm lại câu hỏi.
  bool _activityDone = false;

  /// Hoạt động thực địa: đã check-in tại trạm (máy chủ xác nhận đang trong bán kính).
  /// Chỉ sau khi check-in mới được bắt đầu nhiệm vụ đếm ngược. Đổi sang trạm kế tiếp thì phải check-in lại.
  bool _checkedIn = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _load();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // App ở nền thì timer có thể bị tạm dừng (iOS) hoặc chạy chậm (Android): quay lại thì tính lại ngay.
    if (state == AppLifecycleState.resumed && _phase == _Phase.activity && !_activityDone) {
      _tickActivity();
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _activityTimer?.cancel();
    _positionSub?.cancel();
    _compassSub?.cancel();
    for (final c in _texts.values) {
      c.dispose();
    }
    super.dispose();
  }

  TaskContent get _task => _content!;

  /// Bước dẫn đường có tọa độ trạm: bản đồ phủ kín màn hình, không có AppBar.
  bool get _fullScreenMap => _phase == _Phase.locked && _stationPoint != null;

  LatLng? get _stationPoint {
    final s = _content?.station;
    if (s == null || s.latitude == null || s.longitude == null) return null;
    return LatLng(s.latitude!, s.longitude!);
  }

  LatLng? get _userPoint =>
      (_lat != null && _lng != null) ? LatLng(_lat!, _lng!) : null;

  /// Khoảng cách tính ngay trên máy theo vị trí mới nhất (không chờ backend).
  int? get _liveDistance {
    final station = _stationPoint;
    final user = _userPoint;
    if (station == null || user == null) return null;
    return LocationService.distanceMeters(
      user.latitude,
      user.longitude,
      station.latitude,
      station.longitude,
    ).round();
  }

  /// Bật theo dõi vị trí khi đang ở bước dẫn đường, tắt ở mọi bước khác.
  void _syncTracking() {
    if (!mounted) return;
    if (_phase == _Phase.locked && _stationPoint != null) {
      _positionSub ??= LocationService.positionStream().listen(
        _onPosition,
        onError: (_) {
          // Mất tín hiệu tạm thời: giữ vị trí cuối, du khách vẫn bấm cập nhật được.
        },
      );
      // Máy không có cảm biến từ trường: events là null, chỉ dùng hướng GPS.
      _compassSub ??= FlutterCompass.events?.listen((e) {
        final h = e.heading;
        if (!mounted || h == null) return;
        final next = (h + 360) % 360;
        // Bỏ dao động nhỏ để mũi tên không rung
        final prev = _compassHeading;
        if (prev != null && ((next - prev + 540) % 360 - 180).abs() < 3) return;
        setState(() => _compassHeading = next);
      });
    } else {
      _positionSub?.cancel();
      _positionSub = null;
      _compassSub?.cancel();
      _compassSub = null;
      _heading = null;
      _compassHeading = null;
      _walkRoute = null;
      _walkRouteOrigin = null;
      _walkRouteAt = null;
    }
  }

  /// Hướng để xoay mũi tên: hướng đi theo GPS khi đang đi, la bàn khi đứng yên.
  double? get _effectiveHeading => _heading ?? _compassHeading;

  /// Còn xa trạm: tìm tuyến đi bộ (tìm lại khi đi lệch). Gần trạm: bỏ tuyến, chỉ dùng la bàn.
  Future<void> _refreshWalkRoute() async {
    final user = _userPoint;
    final station = _stationPoint;
    final distance = _liveDistance;
    if (user == null || station == null || distance == null) return;
    if (distance <= _compassRangeMeters || _walkRouteLoading) return;

    final origin = _walkRouteOrigin;
    final movedAway = origin == null ||
        LocationService.distanceMeters(origin.latitude, origin.longitude, user.latitude, user.longitude) >
            _rerouteMeters;
    final at = _walkRouteAt;
    final cooledDown = at == null || DateTime.now().difference(at) > const Duration(seconds: 20);
    if (!movedAway || !cooledDown) return;

    _walkRouteLoading = true;
    _walkRouteAt = DateTime.now();
    try {
      final route = await RouteService().direction(user, station, vehicle: RouteVehicle.walk);
      if (!mounted || _phase != _Phase.locked) return;
      setState(() {
        _walkRoute = route;
        _walkRouteOrigin = user;
      });
    } catch (_) {
      // Không tìm được đường (mất mạng, hết hạn mức): vẫn còn đường thẳng + mũi tên chỉ hướng.
    } finally {
      _walkRouteLoading = false;
    }
  }

  void _onPosition(Position p) {
    if (!mounted) return;
    setState(() {
      _lat = p.latitude;
      _lng = p.longitude;
      // Hướng do GPS tính chỉ đáng tin khi đang đi (trên ~0,7 m/s).
      _heading = (p.speed > 0.7 && p.heading >= 0) ? p.heading : null;
    });
    _refreshWalkRoute();
    // Vào trong bán kính: tự hỏi backend để mở câu hỏi (backend vẫn là nơi xác nhận).
    final distance = _liveDistance;
    final radius = _content?.station?.radiusMeters ?? 50;
    // Nóng – lạnh: lên mức nóng hơn thì rung mạnh dần (tới nơi rung 3 nhịp). Đi xa ra thì chỉ đổi màu,
    // không rung; ra xa hẳn (chừa sai số GPS) thì lần tới lại rung khi tới trạm.
    final warmth = warmthFor(distance, radius);
    if (warmth.index > _warmth.index && (warmth != Warmth.arrived || !_arrivedNotified)) {
      warmth.buzz();
    }
    _warmth = warmth;
    if (distance != null && distance <= radius && !_arrivedNotified) {
      _arrivedNotified = true;
    } else if (distance != null && distance > radius + 20) {
      _arrivedNotified = false;
    }
    final now = DateTime.now();
    final cooledDown =
        _lastAutoCheck == null ||
        now.difference(_lastAutoCheck!) > const Duration(seconds: 8);
    // Hoạt động bắt buộc QR không tự mở được bằng GPS: du khách bấm "Bắt đầu hoạt động".
    if (distance != null &&
        distance <= radius &&
        !_busy &&
        cooledDown &&
        _phase == _Phase.locked &&
        !(_content?.qrRequired ?? false)) {
      _lastAutoCheck = now;
      _locateAndOpen();
    }
  }

  Future<void> _openDirections() async {
    final station = _stationPoint;
    if (station == null) return;
    // Còn xa (trên ~2 km): chỉ đường xe máy thay vì đi bộ.
    final far = (_liveDistance ?? 0) > _walkableMeters;
    final uri = Uri.parse(
      'https://www.google.com/maps/dir/?api=1'
      '&destination=${station.latitude},${station.longitude}&travelmode=${far ? 'two-wheeler' : 'walking'}',
    );
    final ok = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!ok && mounted) _snack(appL10n.tkMapsFailed);
  }

  Future<void> _load() async {
    setState(() => _phase = _Phase.loading);
    try {
      final content = await _service.getTask(
        journeyId: widget.journeyId,
        taskId: widget.taskId,
      );
      final resumeAt = await _restoreActivity(content);
      if (!mounted) return;
      setState(() {
        _content = content;
        _error = null;
        if (resumeAt != null) {
          // Đang đếm dở (hoặc đã hết giờ nhưng chưa quét QR) ở trạm này: vào thẳng bước hoạt động,
          // không bắt check-in và đếm lại từ đầu.
          _phase = _Phase.activity;
          _checkedIn = true;
          _activityEndsAt = resumeAt;
          _activityDone = _secondsLeft == 0;
          // Đếm dở: hẹn lại thông báo (phòng khi lịch cũ đã bị huỷ lúc hệ thống dọn app).
          if (!_activityDone) _scheduleTimeUpReminder(resumeAt);
        } else {
          _phase = _Phase.intro;
        }
      });
      if (resumeAt != null) {
        _runActivityTimer();
      } else {
        _refreshIntroDistance();
      }
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.message;
        _phase = _Phase.error;
      });
    }
    _syncTracking();
  }

  /// Lấy vị trí hiện tại rồi hỏi lại backend: đứng đúng trạm thì mở câu hỏi, sai thì còn khoảng cách.
  Future<void> _locateAndOpen({String? qr}) async {
    setState(() {
      _busy = true;
      _locationMessage = null;
    });
    try {
      if (qr == null) {
        final position = await LocationService.currentPosition();
        _lat = position.latitude;
        _lng = position.longitude;
      }
      final content = await _service.getTask(
        journeyId: widget.journeyId,
        taskId: widget.taskId,
        latitude: qr == null ? _lat : null,
        longitude: qr == null ? _lng : null,
        qrValue: qr,
      );
      if (!mounted) return;
      if (content.isFinished) _clearActivity();
      _qr = (qr != null && content.unlocked) ? qr : null;
      if (qr != null && !content.unlocked && !content.isFinished) {
        _snack(content.qrRequired
            ? appL10n.tkQrMismatchActivity
            : appL10n.tkQrMismatchStop);
      }
      setState(() {
        _content = content;
        _phase = content.isFinished
            ? _Phase.intro
            : content.unlocked
                ? _Phase.quiz
                // Đã làm xong hoạt động mà QR sai: ở lại bước quét QR, không bắt đếm ngược lại.
                : (content.qrRequired && _activityDone ? _Phase.activity : _Phase.locked);
        _index = 0;
      });
    } on LocationException catch (e) {
      if (!mounted) return;
      setState(() {
        _locationMessage = e.message;
        _locationNeedsSettings = e.needsSettings;
        if (_phase == _Phase.intro) _phase = _Phase.locked;
      });
    } on ApiException catch (e) {
      if (mounted) _snack(e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
      _syncTracking();
    }
  }

  Future<void> _scanQr() async {
    final value = await Navigator.of(context).push<String>(
      MaterialPageRoute(
        fullscreenDialog: true,
        builder: (_) => QrScanScreen(
          title: _task.qrRequired ? appL10n.tkQrConfirmTitle : appL10n.tkQrStopTitle,
          hint: _task.station != null
              ? appL10n.tkQrAtPlace(_task.station!.name)
              : appL10n.tkQrNextStop,
        ),
      ),
    );
    if (value != null && mounted) await _locateAndOpen(qr: value);
  }

  // ── Hoạt động thực địa (tour 5 bước) ───────────────────────────────────────

  /// Check-in tại trạm: lấy GPS hiện tại, gửi lên máy chủ và dùng khoảng cách MÁY CHỦ tính để xác nhận
  /// du khách đang trong bán kính trạm. Check-in xong mới mở khóa nút bắt đầu nhiệm vụ đếm ngược.
  Future<void> _checkIn() async {
    setState(() {
      _busy = true;
      _locationMessage = null;
    });
    try {
      final position = await LocationService.currentPosition();
      _lat = position.latitude;
      _lng = position.longitude;
      final content = await _service.getTask(
        journeyId: widget.journeyId,
        taskId: widget.taskId,
        latitude: _lat,
        longitude: _lng,
      );
      if (!mounted) return;
      final radius = content.station?.radiusMeters ?? _task.station?.radiusMeters ?? 50;
      final distance = content.distanceMeters ?? _liveDistance;
      final inside = distance != null && distance <= radius;
      setState(() {
        _content = content;
        _checkedIn = inside;
      });
      if (inside) {
        HapticFeedback.mediumImpact();
        showPointsBurst(context, text: appL10n.tkCheckedIn, icon: Icons.where_to_vote_rounded);
      } else {
        _snack(distance == null
            ? appL10n.tkNoLocation
            : appL10n.tkTooFarToCheckIn(formatDistance(distance), '$radius'));
      }
    } on LocationException catch (e) {
      if (!mounted) return;
      setState(() {
        _locationMessage = e.message;
        _locationNeedsSettings = e.needsSettings;
      });
    } on ApiException catch (e) {
      if (mounted) _snack(e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  /// Bắt đầu hoạt động tại checkpoint: đếm ngược theo thời gian quy định, hết giờ mới được quét QR.
  /// Chỉ gọi được sau khi đã [_checkIn] (trạm có tọa độ).
  void _startActivity() {
    final seconds = _task.durationSeconds ?? 0;
    _activityTimer?.cancel();
    final endsAt = seconds > 0 ? DateTime.now().add(Duration(seconds: seconds)) : null;
    setState(() {
      _phase = _Phase.activity;
      _activityEndsAt = endsAt;
      _activityDone = endsAt == null;
    });
    _syncTracking();
    if (endsAt == null) return;
    ActivityTimerStore.save(
      journeyId: widget.journeyId,
      taskId: widget.taskId,
      questionIndex: _task.questionIndex,
      endsAt: endsAt,
    );
    _scheduleTimeUpReminder(endsAt);
    _runActivityTimer();
  }

  /// Id thông báo hẹn giờ của hoạt động này (cố định theo hành trình + nhiệm vụ để hẹn lại / huỷ đúng cái).
  int get _reminderId => Object.hash('activity-timer', widget.journeyId, widget.taskId) & 0x7fffffff;

  /// Hẹn thông báo hệ thống lúc hết giờ: du khách cất điện thoại đi tham quan vẫn được nhắc quay lại quét QR.
  void _scheduleTimeUpReminder(DateTime endsAt) {
    final task = _content;
    NotificationAlerts.instance.scheduleReminder(
      id: _reminderId,
      at: endsAt,
      title: appL10n.tkTimeUpTitle(task?.name ?? widget.fallbackName),
      body: appL10n.tkTimeUpBody(task?.station?.name ?? widget.destinationName),
    );
  }

  /// Timer chỉ để vẽ lại màn hình; số giây còn lại luôn tính từ [_activityEndsAt].
  void _runActivityTimer() {
    _activityTimer?.cancel();
    _activityTimer = null;
    if (_activityDone || _activityEndsAt == null) return;
    _activityTimer = Timer.periodic(const Duration(milliseconds: 500), (_) => _tickActivity());
  }

  void _tickActivity() {
    if (!mounted) {
      _activityTimer?.cancel();
      return;
    }
    if (_activityDone) return;
    final finished = _secondsLeft == 0;
    setState(() {
      if (finished) _activityDone = true;
    });
    if (finished) {
      _activityTimer?.cancel();
      _activityTimer = null;
      // Đang mở app lúc hết giờ ⇒ hiệu ứng trên màn là đủ, bỏ thông báo hệ thống đã hẹn.
      if (WidgetsBinding.instance.lifecycleState == AppLifecycleState.resumed) {
        NotificationAlerts.instance.cancelReminder(_reminderId);
      }
      HapticFeedback.heavyImpact();
      showPointsBurst(context, text: appL10n.tkTimeUp, icon: Icons.alarm_on_rounded);
    }
  }

  /// Mốc kết thúc đã lưu của trạm hiện tại (nếu có) để tiếp tục đếm sau khi thoát ra vào lại.
  Future<DateTime?> _restoreActivity(TaskContent content) async {
    if (content.isFinished) {
      _clearActivity();
      return null;
    }
    if (!content.qrRequired || content.unlocked || (content.durationSeconds ?? 0) <= 0) return null;
    return ActivityTimerStore.load(
      journeyId: widget.journeyId,
      taskId: widget.taskId,
      questionIndex: content.questionIndex,
    );
  }

  /// Bỏ trạng thái hoạt động (xong trạm / xong nhiệm vụ / sang trạm mới).
  void _clearActivity() {
    _activityTimer?.cancel();
    _activityTimer = null;
    NotificationAlerts.instance.cancelReminder(_reminderId);
    _activityEndsAt = null;
    _activityDone = false;
    ActivityTimerStore.clear(journeyId: widget.journeyId, taskId: widget.taskId);
  }

  /// CHỈ BẢN DEBUG: bỏ qua đếm ngược để thử nhanh.
  void _skipCountdown() {
    _activityTimer?.cancel();
    _activityTimer = null;
    NotificationAlerts.instance.cancelReminder(_reminderId);
    final now = DateTime.now();
    setState(() {
      _activityEndsAt = now;
      _activityDone = true;
    });
    ActivityTimerStore.save(
      journeyId: widget.journeyId,
      taskId: widget.taskId,
      questionIndex: _task.questionIndex,
      endsAt: now,
    );
  }

  void _start() {
    if (_task.requiresLocation) {
      _locateAndOpen();
    } else {
      setState(() {
        _phase = _Phase.quiz;
        _index = 0;
      });
    }
  }

  bool _isAnswered(TaskQuestion q) => q.isText
      ? (_texts[q.id]?.text.trim().isNotEmpty ?? false)
      : _choices.containsKey(q.id);

  TextEditingController _controllerFor(int questionId) =>
      _texts.putIfAbsent(questionId, () => TextEditingController());

  Future<void> _submit() async {
    final task = _task;
    setState(() => _busy = true);
    try {
      double? lat = _lat;
      double? lng = _lng;
      if (task.requiresLocation && _qr == null) {
        // Làm mới vị trí ngay lúc nộp; nếu thất bại thì dùng tọa độ lúc mở khóa.
        try {
          final p = await LocationService.currentPosition();
          lat = p.latitude;
          lng = p.longitude;
        } on LocationException {
          // dùng tọa độ cũ
        }
      }
      final answers = [
        for (final q in task.questions)
          q.isText
              ? AnswerDraft(questionId: q.id, text: _texts[q.id]?.text.trim())
              : AnswerDraft(questionId: q.id, answerId: _choices[q.id]),
      ];
      final result = await _service.submitTask(
        journeyId: widget.journeyId,
        taskId: widget.taskId,
        answers: answers,
        latitude: lat,
        longitude: lng,
        qrValue: _qr,
      );
      if (!mounted) return;
      _changed = true;
      // Xong trạm này (đúng) hoặc hết lượt: mốc đếm ngược không còn dùng nữa.
      final stationDone = result.completed || result.lastAnswerCorrect == true || result.exhausted;
      setState(() {
        _result = result;
        _phase = _Phase.result;
        if (stationDone) _clearActivity();
      });
      _syncTracking();
      if (result.completed) {
        // Câu đố chấm theo câu có thể nhận một phần (hoặc 0) điểm: hiện đúng số điểm nhận được.
        final earned = task.perQuestionPoints || result.pointsEarned > 0
            ? result.pointsEarned
            : task.pointsReward;
        if (earned > 0) showPointsBurst(context, text: appL10n.tkPlusPoints(earned));
      } else if (result.lastAnswerCorrect == true) {
        showPointsBurst(
          context,
          text: appL10n.tkLeg(result.questionIndex, result.totalQuestions),
          icon: Icons.check_circle_rounded,
        );
      }
    } on ApiException catch (e) {
      if (mounted) _snack(e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _retry() {
    _choices.clear();
    for (final c in _texts.values) {
      c.clear();
    }
    _result = null;
    _qr = null;
    _index = 0;
    // Hoạt động đã làm xong, chỉ trả lời sai: quét lại QR để trả lời lại, không phải đếm ngược lại.
    if ((_content?.qrRequired ?? false) && _activityDone) {
      setState(() => _phase = _Phase.activity);
      return;
    }
    _load();
  }

  Future<void> _continueNextStation() async {
    _choices.clear();
    for (final c in _texts.values) {
      c.clear();
    }
    _result = null;
    _qr = null;
    _checkedIn = false; // trạm mới: phải tới nơi và check-in lại
    await _locateAndOpen();
  }

  Future<void> _showClue() async {
    setState(() => _busy = true);
    try {
      final clue = await _service.getClue(
        journeyId: widget.journeyId,
        taskId: widget.taskId,
      );
      if (!mounted) return;
      await showModalBottomSheet<void>(
        context: context,
        backgroundColor: Colors.white,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        ),
        builder: (ctx) => SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(24, 24, 24, 20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.lightbulb_rounded, color: AppCultureColors.gold),
                    const SizedBox(width: 8),
                    Text(
                      appL10n.tkClue,
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  clue.clue,
                  style: const TextStyle(
                    fontSize: 14.5,
                    height: 1.5,
                    color: AppCultureColors.textDark,
                  ),
                ),
                const SizedBox(height: 18),
                PrimaryButton(
                  label: appL10n.tkGotIt,
                  onPressed: () => Navigator.pop(ctx),
                ),
              ],
            ),
          ),
        ),
      );
    } on ApiException catch (e) {
      if (mounted) _snack(e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _snack(String text) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(text), behavior: SnackBarBehavior.floating),
    );
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) Navigator.of(context).pop(_changed);
      },
      child: Scaffold(
        backgroundColor: AppCultureColors.background,
        appBar: _fullScreenMap
            ? null
            : AppBar(
                backgroundColor: Colors.white,
                elevation: 0,
                scrolledUnderElevation: 0,
                centerTitle: true,
                iconTheme: const IconThemeData(
                  color: AppCultureColors.textDark,
                ),
                leading: IconButton(
                  icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18),
                  onPressed: () => Navigator.of(context).pop(_changed),
                ),
                title: Column(
                  children: [
                    Text(
                      _content?.name ?? widget.fallbackName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: AppCultureColors.textDark,
                      ),
                    ),
                    Text(
                      widget.destinationName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 11.5,
                        color: AppCultureColors.textMuted,
                      ),
                    ),
                  ],
                ),
                actions: [
                  TextButton.icon(
                    onPressed: () => AiGuideChatScreen.showSheet(
                      context,
                      destinationId: widget.destinationId,
                      destinationName: widget.destinationName,
                      taskId: widget.taskId,
                      taskName: _content?.name ?? widget.fallbackName,
                    ),
                    icon: const Icon(Icons.auto_awesome_rounded, size: 17, color: AppCultureColors.gold),
                    label: Text(
                      context.l10n.aiHintButton,
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppCultureColors.amberDark),
                    ),
                  ),
                ],
              ),
        body: AnimatedSwitcher(
          duration: const Duration(milliseconds: 250),
          child: KeyedSubtree(key: ValueKey(_phase), child: _buildPhase()),
        ),
      ),
    );
  }

  Widget _buildPhase() {
    switch (_phase) {
      case _Phase.loading:
        return const Center(
          child: CircularProgressIndicator(
            color: AppCultureColors.heritageJade,
          ),
        );
      case _Phase.error:
        return Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(
                  Icons.error_outline_rounded,
                  size: 46,
                  color: AppCultureColors.warning,
                ),
                const SizedBox(height: 12),
                Text(
                  _error ?? appL10n.tkLoadFailed,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 16),
                OutlinedButton(onPressed: _load, child: Text(appL10n.commonRetry)),
              ],
            ),
          ),
        );
      case _Phase.intro:
        return _buildIntro();
      case _Phase.locked:
        return _buildLocked();
      case _Phase.activity:
        return _buildActivity();
      case _Phase.quiz:
        return _buildQuiz();
      case _Phase.result:
        return _buildResult();
    }
  }

  // ── Giới thiệu nhiệm vụ ─────────────────────────────────────────────────────

  /// Danh sách trạm để hiển thị chặng: ưu tiên danh sách đầy đủ, bản backend cũ chỉ có trạm hiện tại.
  List<TaskStation> get _stations {
    final task = _task;
    if (task.stations.isNotEmpty) return task.stations;
    return task.station == null ? const [] : [task.station!];
  }

  /// Vị trí một lần ở màn giới thiệu để biết đã đứng trong bán kính trạm hay chưa (không chặn giao diện).
  Future<void> _refreshIntroDistance() async {
    final task = _content;
    if (task == null ||
        !task.requiresLocation ||
        task.isFinished ||
        _stationPoint == null) {
      return;
    }
    setState(() => _locatingIntro = true);
    try {
      final p = await LocationService.currentPosition();
      if (!mounted) return;
      setState(() {
        _lat = p.latitude;
        _lng = p.longitude;
        _introLocationError = null;
      });
    } on LocationException catch (e) {
      if (mounted) setState(() => _introLocationError = e.message);
    } finally {
      if (mounted) setState(() => _locatingIntro = false);
    }
  }

  Widget _buildIntro() {
    final task = _task;
    final stations = task.requiresLocation ? _stations : const <TaskStation>[];
    final radius = task.station?.radiusMeters ?? 50;
    final distance = _liveDistance;
    final atStation = distance != null && distance <= radius;
    // Cần đi tới trạm trước: nhiệm vụ theo vị trí, trạm hiện tại có tọa độ và chưa vào bán kính
    final needsTravel =
        task.requiresLocation && _stationPoint != null && !atStation;
    final showDescription =
        task.description.trim().length > 3 &&
        task.description.trim() != task.name.trim();

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        SoftCard(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 52,
                height: 52,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: task.requiresLocation ? AppCultureColors.jadeTint : AppCultureColors.brassTint,
                  border: Border.all(color: task.requiresLocation ? AppTone.jade.soft : AppTone.brass.soft),
                ),
                child: Icon(
                  task.requiresLocation
                      ? Icons.explore_rounded
                      : Icons.quiz_rounded,
                  color: task.requiresLocation ? AppCultureColors.heritageJade : AppCultureColors.brass700,
                  size: 26,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      task.requiresLocation
                          ? appL10n.tkFieldMission
                          : appL10n.tkHeritageQuiz,
                      style: const TextStyle(
                        fontSize: 12,
                        letterSpacing: 0.2,
                        fontWeight: FontWeight.w700,
                        color: AppCultureColors.heritageJade,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      task.name,
                      style: const TextStyle(
                        fontSize: 19,
                        fontWeight: FontWeight.w700,
                        height: 1.2,
                      ),
                    ),
                    if (showDescription) ...[
                      const SizedBox(height: 6),
                      Text(
                        task.description,
                        style: const TextStyle(
                          fontSize: 13.5,
                          height: 1.5,
                          color: AppCultureColors.textMuted,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),
        if (stations.isNotEmpty) ...[
          _buildStationList(task, stations, distance: distance, radius: radius),
          const SizedBox(height: 14),
        ],
        Row(
          children: [
            Expanded(
              child: _stat(
                Icons.help_outline_rounded,
                '${task.totalQuestions}',
                appL10n.tkQuestionsLabel,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _stat(
                Icons.stars_rounded,
                '+${task.pointsReward}',
                appL10n.tkBonusLabel,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _stat(
                Icons.replay_rounded,
                '${task.attemptsRemaining}/${task.maxAttempts}',
                appL10n.tkAttemptsLabel,
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),
        SoftCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                appL10n.tkRules,
                style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14.5),
              ),
              const SizedBox(height: 10),
              _rule(
                Icons.check_circle_outline_rounded,
                appL10n.tkRuleAllCorrect,
              ),
              if (task.requiresLocation) ...[
                _rule(
                  Icons.place_outlined,
                  appL10n.tkRuleLocation,
                ),
                _rule(
                  Icons.refresh_rounded,
                  appL10n.tkRuleRestart,
                ),
              ] else
                _rule(
                  Icons.refresh_rounded,
                  appL10n.tkRuleRetry(task.maxAttempts),
                ),
            ],
          ),
        ),
        const SizedBox(height: 20),
        if (task.isCompleted)
          _banner(
            Icons.verified_rounded,
            appL10n.tkMissionDone,
            AppCultureColors.jadeLight,
            AppCultureColors.jadeDark,
          )
        else if (task.isFailed)
          _banner(
            Icons.block_rounded,
            appL10n.tkNoAttempts,
            AppCultureColors.lacquer100,
            AppCultureColors.error,
          )
        else
          Row(
            children: [
              Expanded(
                child: PrimaryButton(
                  label: needsTravel
                      ? appL10n.tkDirectionsToStop
                      : (task.attempts > 0
                            ? appL10n.tkRetryMission
                            : appL10n.tkStartMission),
                  icon: needsTravel
                      ? Icons.near_me_rounded
                      : Icons.play_arrow_rounded,
                  loading: _busy,
                  onPressed: _start,
                ),
              ),
              if (task.requiresLocation) ...[
                const SizedBox(width: 10),
                Tooltip(
                  message: appL10n.tkViewClue,
                  child: OutlinedButton(
                    onPressed: _busy ? null : _showClue,
                    style: OutlinedButton.styleFrom(
                      minimumSize: const Size(56, 52),
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                      foregroundColor: AppCultureColors.amberDark,
                      side: const BorderSide(
                        color: AppCultureColors.rewardBorder,
                        width: 1.5,
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.lightbulb_outline_rounded, size: 20),
                        SizedBox(width: 6),
                        Text(
                          appL10n.tkClue,
                          style: TextStyle(fontWeight: FontWeight.w700),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ],
          ),
      ],
    );
  }

  /// Các chặng của nhiệm vụ thực địa: đã qua (✓), đang mở (kèm khoảng cách), chưa tới lượt (khóa).
  Widget _buildStationList(
    TaskContent task,
    List<TaskStation> stations, {
    required int? distance,
    required int radius,
  }) {
    final current = task.isCompleted ? stations.length : task.questionIndex;
    return SoftCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                appL10n.tkStages,
                style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14.5),
              ),
              const Spacer(),
              Text(
                appL10n.tkStagesDone(current.clamp(0, stations.length), stations.length),
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: AppCultureColors.textMuted,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          for (var i = 0; i < stations.length; i++)
            _stationRow(
              index: i,
              station: stations[i],
              done: i < current,
              active: i == current && !task.isFinished,
              isLast: i == stations.length - 1,
              distance: distance,
              radius: radius,
            ),
        ],
      ),
    );
  }

  Widget _stationRow({
    required int index,
    required TaskStation station,
    required bool done,
    required bool active,
    required bool isLast,
    required int? distance,
    required int radius,
  }) {
    final arrived = active && distance != null && distance <= radius;
    final Color tone = done
        ? AppCultureColors.heritageJade
        : active
        ? (arrived ? AppCultureColors.heritageJade : AppCultureColors.oceanBlue)
        : AppCultureColors.textLight;

    late final String status;
    if (done) {
      status = appL10n.statusCompleted;
    } else if (!active) {
      status = appL10n.tkUnlockAfterStage(index);
    } else if (_locatingIntro && distance == null) {
      status = appL10n.tkLocating;
    } else if (distance == null) {
      status = _introLocationError ?? appL10n.tkNoPosition;
    } else if (arrived) {
      status = appL10n.tkArrivedReady;
    } else {
      status = appL10n.tkDistanceRadius(formatDistance(distance), '$radius');
    }

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SizedBox(
            width: 34,
            child: Column(
              children: [
                Container(
                  width: 30,
                  height: 30,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: done || active
                        ? tone
                        : AppCultureColors.surfaceSubtle,
                    border: active
                        ? Border.all(
                            color: tone.withValues(alpha: 0.3),
                            width: 4,
                          )
                        : null,
                  ),
                  alignment: Alignment.center,
                  child: done
                      ? const Icon(
                          Icons.check_rounded,
                          size: 16,
                          color: Colors.white,
                        )
                      : active
                      ? Text(
                          '${index + 1}',
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w700,
                            fontSize: 12,
                          ),
                        )
                      : const Icon(
                          Icons.lock_rounded,
                          size: 14,
                          color: AppCultureColors.textLight,
                        ),
                ),
                if (!isLast)
                  Expanded(
                    child: Container(
                      width: 2,
                      margin: const EdgeInsets.symmetric(vertical: 3),
                      color: done
                          ? AppCultureColors.heritageJade
                          : AppCultureColors.border,
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Padding(
              padding: EdgeInsets.only(bottom: isLast ? 0 : 14, top: 4),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    appL10n.tkStageAt(index + 1, station.name),
                    style: TextStyle(
                      fontSize: 13.5,
                      fontWeight: FontWeight.w700,
                      color: done || active
                          ? AppCultureColors.textDark
                          : AppCultureColors.textMuted,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    status,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: active ? FontWeight.w700 : FontWeight.w500,
                      color: active ? tone : AppCultureColors.textMuted,
                    ),
                  ),
                ],
              ),
            ),
          ),
          if (active && !arrived && _stationPoint != null)
            IconButton(
              tooltip: appL10n.tkRefreshDistance,
              onPressed: _locatingIntro ? null : _refreshIntroDistance,
              icon: _locatingIntro
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(
                      Icons.my_location_rounded,
                      size: 20,
                      color: AppCultureColors.oceanBlue,
                    ),
            ),
        ],
      ),
    );
  }

  Widget _stat(IconData icon, String value, String label) {
    return SoftCard(
      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 8),
      child: Column(
        children: [
          Icon(icon, color: AppCultureColors.heritageJade, size: 22),
          const SizedBox(height: 6),
          Text(
            value,
            style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700),
          ),
          Text(
            label,
            style: const TextStyle(
              fontSize: 11,
              color: AppCultureColors.textMuted,
            ),
          ),
        ],
      ),
    );
  }

  Widget _rule(IconData icon, String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 18, color: AppCultureColors.heritageJade),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(
                fontSize: 13,
                height: 1.45,
                color: AppCultureColors.textMuted,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _banner(
    IconData icon,
    String text,
    Color background,
    Color foreground,
  ) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          Icon(icon, color: foreground),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              text,
              style: TextStyle(color: foreground, fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );
  }

  // ── Dẫn đường tới trạm (nhiệm vụ cần vị trí) ───────────────────────────────

  Widget _buildLocked() {
    final stationPoint = _stationPoint;
    if (stationPoint == null) return _buildLockedWithoutMap();

    final task = _task;
    final station = task.station!;
    final radius = station.radiusMeters ?? 50;
    final userPoint = _userPoint;
    final distance = _liveDistance ?? task.distanceMeters;
    final bearing = userPoint == null
        ? null
        : bearingBetween(userPoint, stationPoint);
    final arrived = distance != null && distance <= radius;
    final closeness = distance == null
        ? 0.0
        : (radius / (distance <= 0 ? 1 : distance)).clamp(0.0, 1.0);
    final topInset = MediaQuery.paddingOf(context).top;

    return Stack(
      children: [
        Positioned.fill(
          child: StationMap(
            key: _mapKey,
            station: stationPoint,
            stationName: station.name,
            radiusMeters: radius,
            user: userPoint,
            heading: _effectiveHeading,
            satellite: _satellite,
            route: distance != null && distance > _compassRangeMeters ? _walkRoute?.points : null,
            inside: arrived,
            // Nóng – lạnh: vòng bán kính đổi màu theo khoảng cách (xanh dương → cam → đỏ → xanh ngọc khi tới).
            ringColor: warmthFor(distance, radius).color,
            fitPadding: EdgeInsets.fromLTRB(64, topInset + 120, 64, 360),
          ),
        ),

        // Thanh nhiệm vụ nổi phía trên
        SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                MapRoundButton(
                  icon: Icons.arrow_back_rounded,
                  tooltip: MaterialLocalizations.of(context).backButtonTooltip,
                  onPressed: () => Navigator.of(context).pop(_changed),
                ),
                const SizedBox(width: 10),
                Expanded(child: _navHeader(task)),
              ],
            ),
          ),
        ),

        // Nút điều khiển bản đồ
        Positioned(
          right: 12,
          top: topInset + 92,
          child: Column(
            children: [
              MapRoundButton(
                icon: Icons.center_focus_strong_rounded,
                tooltip: appL10n.tkShowBoth,
                onPressed: () => _mapKey.currentState?.fitAll(),
              ),
              const SizedBox(height: 10),
              MapRoundButton(
                icon: Icons.my_location_rounded,
                tooltip: appL10n.jsMyLocation,
                color: AppCultureColors.oceanBlue,
                onPressed: userPoint == null
                    ? _locateAndOpen
                    : () => _mapKey.currentState?.focusUser(),
              ),
              const SizedBox(height: 10),
              MapRoundButton(
                icon: _satellite
                    ? Icons.map_rounded
                    : Icons.satellite_alt_rounded,
                tooltip: _satellite ? appL10n.jsStreetMap : appL10n.jsSatellite,
                onPressed: () => setState(() => _satellite = !_satellite),
              ),
            ],
          ),
        ),

        // Bảng dẫn đường phía dưới
        Align(
          alignment: Alignment.bottomCenter,
          child: _navPanel(
            stationName: station.name,
            radius: radius,
            distance: distance,
            bearing: bearing,
            arrived: arrived,
            closeness: closeness,
          ),
        ),
      ],
    );
  }

  Widget _navHeader(TaskContent task) {
    final total = task.totalQuestions;
    return Container(
      padding: const EdgeInsets.fromLTRB(14, 10, 14, 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        boxShadow: const [
          BoxShadow(
            color: Colors.black26,
            blurRadius: 10,
            offset: Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  task.name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: AppCultureColors.textDark,
                  ),
                ),
              ),
              if (total > 0)
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 3,
                  ),
                  decoration: BoxDecoration(
                    color: AppCultureColors.oceanLight,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    appL10n.tkStopOf(task.questionIndex + 1, total),
                    style: const TextStyle(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w700,
                      color: AppCultureColors.oceanDark,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 2),
          Text(
            widget.destinationName,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 12,
              color: AppCultureColors.textMuted,
            ),
          ),
          if (total > 0) ...[
            const SizedBox(height: 8),
            Row(
              children: [
                for (var i = 0; i < total; i++)
                  Expanded(
                    child: Container(
                      height: 5,
                      margin: EdgeInsets.only(right: i == total - 1 ? 0 : 4),
                      decoration: BoxDecoration(
                        color: i < task.questionIndex
                            ? AppCultureColors.heritageJade
                            : i == task.questionIndex
                            ? AppCultureColors.oceanBlue
                            : AppCultureColors.surfaceSubtle,
                        borderRadius: BorderRadius.circular(3),
                      ),
                    ),
                  ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _navPanel({
    required String stationName,
    required int radius,
    required int? distance,
    required double? bearing,
    required bool arrived,
    required double closeness,
  }) {
    final task = _task;
    // Mũi tên: chỉ hướng tới trạm; khi đang đi thì tính so với hướng đang đi.
    // Hướng đang đi (GPS) khi di chuyển, hướng điện thoại (la bàn) khi đứng yên.
    final heading = _effectiveHeading;
    final arrowAngle = bearing == null
        ? 0.0
        : (bearing - (heading ?? 0)) * 3.141592653589793 / 180;
    final walkRoute = distance != null && distance > _compassRangeMeters ? _walkRoute : null;
    final directionText = bearing == null
        ? appL10n.tkLocatingYou
        : distance != null && distance > _walkableMeters
        ? appL10n.tkTooFarToWalk(walkRoute != null ? ' (~${formatDuration(walkRoute.durationSeconds)})' : '')
        : walkRoute != null
        ? appL10n.tkWalkRoute(formatDuration(walkRoute.durationSeconds))
        : heading != null
        ? appL10n.tkTurnHeading(turnHint(heading, bearing), compassLabel(bearing))
        : appL10n.tkHeadTo(compassLabel(bearing));

    return Container(
      width: double.infinity,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        boxShadow: [
          BoxShadow(
            color: Colors.black26,
            blurRadius: 16,
            offset: Offset(0, -2),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 10, 20, 12),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppCultureColors.border,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  Container(
                    width: 64,
                    height: 64,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: arrived
                          ? AppCultureColors.jadeLight
                          : AppCultureColors.oceanLight,
                    ),
                    child: arrived
                        ? const Icon(
                            Icons.where_to_vote_rounded,
                            color: AppCultureColors.heritageJade,
                            size: 34,
                          )
                        : AnimatedRotation(
                            turns: arrowAngle / (2 * 3.141592653589793),
                            duration: const Duration(milliseconds: 400),
                            child: const Icon(
                              Icons.navigation_rounded,
                              color: AppCultureColors.oceanBlue,
                              size: 34,
                            ),
                          ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          arrived
                              ? appL10n.tkArrivedAtStop
                              : distance == null
                              ? '— m'
                              : formatDistance(distance),
                          style: TextStyle(
                            fontSize: arrived ? 22 : 30,
                            height: 1.1,
                            fontWeight: FontWeight.w700,
                            color: arrived
                                ? AppCultureColors.jadeDark
                                : AppCultureColors.oceanDark,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          arrived
                              ? (task.qrRequired
                                    ? (_checkedIn
                                          ? appL10n.tkCheckedInPressStart
                                          : appL10n.tkPressCheckIn)
                                    : _busy
                                        ? appL10n.tkOpeningQuestion
                                        : appL10n.tkQuestionAutoOpen)
                              : directionText,
                          style: const TextStyle(
                            fontSize: 13.5,
                            fontWeight: FontWeight.w700,
                            color: AppCultureColors.textDark,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              if (task.description.trim().isNotEmpty) ...[
                const SizedBox(height: 12),
                _missionTeaser(task),
              ],
              const SizedBox(height: 14),
              Row(
                children: [
                  const Icon(
                    Icons.flag_rounded,
                    size: 16,
                    color: AppCultureColors.heritageJade,
                  ),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      stationName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        color: AppCultureColors.textDark,
                      ),
                    ),
                  ),
                  Text(
                    appL10n.tkRadius('$radius'),
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppCultureColors.textMuted,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Align(alignment: Alignment.centerLeft, child: WarmthChip(warmth: warmthFor(distance, radius))),
              const SizedBox(height: 8),
              ClipRRect(
                borderRadius: BorderRadius.circular(6),
                child: TweenAnimationBuilder<double>(
                  tween: Tween(end: closeness),
                  duration: const Duration(milliseconds: 500),
                  curve: Curves.easeOutCubic,
                  builder: (_, v, _) => LinearProgressIndicator(
                    value: v,
                    minHeight: 8,
                    backgroundColor: AppCultureColors.surfaceSubtle,
                    color: warmthFor(distance, radius).color,
                  ),
                ),
              ),
              if (_locationMessage != null) ...[
                const SizedBox(height: 12),
                _banner(
                  Icons.location_off_rounded,
                  _locationMessage!,
                  AppCultureColors.brass100,
                  AppCultureColors.rewardText,
                ),
                if (_locationNeedsSettings)
                  TextButton(
                    onPressed: LocationService.openSettings,
                    child: Text(appL10n.tkOpenLocationSettings),
                  ),
              ],
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: task.qrRequired
                        // Hoạt động thực địa: chỉ đường tới nơi → Check-in (máy chủ xác nhận trong bán kính)
                        // → mở khóa "Bắt đầu nhiệm vụ" (đếm ngược) → hết giờ quét QR để trả lời.
                        ? (_checkedIn
                            ? PrimaryButton(
                                label: _task.durationSeconds != null && _task.durationSeconds! > 0
                                    ? appL10n.tkStartMissionTimed(formatDuration(_task.durationSeconds!))
                                    : appL10n.tkStartMission,
                                icon: Icons.timer_outlined,
                                onPressed: _startActivity,
                              )
                            : PrimaryButton(
                                label: arrived
                                    ? appL10n.tkCheckInAtStop
                                    : distance == null
                                        ? appL10n.tkNotAtStop
                                        : appL10n.tkNotAtStopDistance(formatDistance(distance)),
                                icon: arrived ? Icons.where_to_vote_rounded : Icons.lock_outline_rounded,
                                loading: _busy,
                                onPressed: arrived ? _checkIn : null,
                              ))
                        : arrived
                        ? PrimaryButton(
                            label: appL10n.tkOpenQuestion,
                            icon: Icons.quiz_rounded,
                            loading: _busy,
                            onPressed: _locateAndOpen,
                          )
                        : PrimaryButton(
                            label: appL10n.tkQrStopTitle,
                            icon: Icons.qr_code_scanner_rounded,
                            loading: _busy,
                            onPressed: _scanQr,
                          ),
                  ),
                  const SizedBox(width: 10),
                  _squareAction(
                    icon: Icons.directions_rounded,
                    tooltip: appL10n.tkGoogleMaps,
                    onPressed: _openDirections,
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  TextButton.icon(
                    onPressed: _busy ? null : _showClue,
                    icon: const Icon(Icons.lightbulb_outline_rounded, size: 18),
                    label: Text(appL10n.tkClue),
                  ),
                  TextButton.icon(
                    onPressed: _busy ? null : _locateAndOpen,
                    icon: const Icon(Icons.refresh_rounded, size: 18),
                    label: Text(appL10n.tkCheckLocation),
                  ),
                ],
              ),
              MapAttributionText(satellite: _satellite),
            ],
          ),
        ),
      ),
    );
  }

  /// Lời dẫn nhiệm vụ ngay trên bảng dẫn đường (để du khách biết mình tới trạm để làm gì); chạm để đọc hết.
  Widget _missionTeaser(TaskContent task) {
    return InkWell(
      borderRadius: BorderRadius.circular(14),
      onTap: () => showModalBottomSheet<void>(
        context: context,
        backgroundColor: Colors.white,
        showDragHandle: true,
        isScrollControlled: true,
        shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(28))),
        builder: (ctx) => SafeArea(
          child: ConstrainedBox(
            constraints: BoxConstraints(maxHeight: MediaQuery.sizeOf(ctx).height * 0.7),
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(task.name, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 4),
                  Text(widget.destinationName, style: const TextStyle(color: AppCultureColors.textMuted)),
                  const SizedBox(height: 14),
                  Text(task.description, style: const TextStyle(fontSize: 14.5, height: 1.55)),
                ],
              ),
            ),
          ),
        ),
      ),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.fromLTRB(12, 10, 8, 10),
        decoration: BoxDecoration(
          color: AppCultureColors.rewardBg.withValues(alpha: 0.6),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppCultureColors.rewardBorder),
        ),
        child: Row(
          children: [
            const Icon(Icons.auto_stories_rounded, size: 18, color: AppCultureColors.amberDark),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                task.description,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 12.5, height: 1.4, color: AppCultureColors.rewardText),
              ),
            ),
            const Icon(Icons.chevron_right_rounded, color: AppCultureColors.amberDark),
          ],
        ),
      ),
    );
  }

  Widget _squareAction({
    required IconData icon,
    required String tooltip,
    required VoidCallback onPressed,
  }) {
    return SizedBox(
      width: 52,
      height: 52,
      child: OutlinedButton(
        onPressed: onPressed,
        style: OutlinedButton.styleFrom(
          padding: EdgeInsets.zero,
          foregroundColor: AppCultureColors.oceanDark,
          side: const BorderSide(color: AppCultureColors.oceanBlue),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
        ),
        child: Tooltip(message: tooltip, child: Icon(icon)),
      ),
    );
  }

  /// Trạm chưa có tọa độ (chỉ mở bằng QR): giao diện thẻ, không có bản đồ.
  Widget _buildLockedWithoutMap() {
    final task = _task;
    final station = task.station;
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        SoftCard(
          elevated: true,
          padding: const EdgeInsets.all(22),
          child: Column(
            children: [
              Container(
                width: 84,
                height: 84,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppCultureColors.oceanLight,
                ),
                child: const Icon(
                  Icons.qr_code_2_rounded,
                  size: 44,
                  color: AppCultureColors.oceanBlue,
                ),
              ),
              const SizedBox(height: 14),
              Text(
                task.totalQuestions > 0
                    ? appL10n.tkStopOf(task.questionIndex + 1, task.totalQuestions)
                    : appL10n.tkNextStop,
                style: const TextStyle(
                  fontSize: 13,
                  color: AppCultureColors.textMuted,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                station?.name ?? appL10n.tkNextPlace,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w700,
                  height: 1.25,
                ),
              ),
              const SizedBox(height: 10),
              Text(
                appL10n.tkFindQr,
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 13,
                  color: AppCultureColors.textMuted,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 18),
        if (task.qrRequired)
          PrimaryButton(
            label: appL10n.tkStartActivity,
            icon: Icons.play_arrow_rounded,
            onPressed: _startActivity,
          )
        else
          PrimaryButton(
            label: appL10n.tkQrStopTitle,
            icon: Icons.qr_code_scanner_rounded,
            loading: _busy,
            onPressed: _scanQr,
          ),
        const SizedBox(height: 6),
        Center(
          child: TextButton.icon(
            onPressed: _busy ? null : _showClue,
            icon: const Icon(Icons.lightbulb_outline_rounded, size: 18),
            label: Text(appL10n.tkViewClue),
          ),
        ),
      ],
    );
  }

  /// Bước hoạt động: đồng hồ đếm ngược lớn; hết giờ thì quét mã QR tại điểm để mở câu hỏi.
  Widget _buildActivity() {
    final task = _task;
    final total = task.durationSeconds ?? 0;
    final progress = total <= 0 ? 1.0 : 1 - _secondsLeft / total;
    final mm = (_secondsLeft ~/ 60).toString().padLeft(2, '0');
    final ss = (_secondsLeft % 60).toString().padLeft(2, '0');
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        SoftCard(
          elevated: true,
          padding: const EdgeInsets.all(22),
          child: Column(
            children: [
              Text(
                task.station?.name ?? task.name,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w700, height: 1.25),
              ),
              const SizedBox(height: 6),
              Text(
                _activityDone
                    ? appL10n.tkActivityDone
                    : appL10n.tkActivityInProgress,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 13.5, height: 1.45, color: AppCultureColors.textMuted),
              ),
              const SizedBox(height: 22),
              SizedBox(
                width: 190,
                height: 190,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    CircularProgressIndicator(
                      value: progress.clamp(0.0, 1.0),
                      strokeWidth: 12,
                      strokeCap: StrokeCap.round,
                      backgroundColor: AppCultureColors.surfaceSubtle,
                      color: _activityDone ? AppCultureColors.heritageJade : AppCultureColors.oceanBlue,
                    ),
                    Center(
                      child: _activityDone
                          ? const Icon(Icons.check_rounded, size: 84, color: AppCultureColors.heritageJade)
                          : Text(
                              '$mm:$ss',
                              style: const TextStyle(
                                fontSize: 44,
                                fontWeight: FontWeight.w800,
                                fontFeatures: [FontFeature.tabularFigures()],
                                color: AppCultureColors.textDark,
                              ),
                            ),
                    ),
                  ],
                ),
              ),
              if (task.pointsReward > 0) ...[
                const SizedBox(height: 18),
                InfoChip(
                  icon: Icons.stars_rounded,
                  text: appL10n.tkCorrectReward(task.pointsReward),
                  background: AppCultureColors.rewardBg,
                  foreground: AppCultureColors.rewardText,
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: 18),
        PrimaryButton(
          label: appL10n.tkScanQrOnSite,
          icon: Icons.qr_code_scanner_rounded,
          loading: _busy,
          onPressed: _activityDone ? _scanQr : null,
        ),
        if (kDebugMode && !_activityDone)
          Center(
            child: TextButton.icon(
              onPressed: _skipCountdown,
              icon: const Icon(Icons.fast_forward_rounded, size: 18),
              label: Text(appL10n.tkSkipCountdownDev),
            ),
          ),
      ],
    );
  }

  // ── Làm bài ──────────────────────────────────────────────────────────────────

  Widget _buildQuiz() {
    final task = _task;
    final questions = task.questions;
    if (questions.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Text(
            appL10n.tkNoQuestions,
            style: TextStyle(color: AppCultureColors.textMuted),
          ),
        ),
      );
    }
    final index = _index.clamp(0, questions.length - 1);
    final question = questions[index];
    final isLast = index == questions.length - 1;
    final answeredAll = questions.every(_isAnswered);
    final shownNumber = task.sequential ? task.questionIndex + 1 : index + 1;
    final shownTotal = task.sequential ? task.totalQuestions : questions.length;

    return Column(
      children: [
        Container(
          color: Colors.white,
          padding: const EdgeInsets.fromLTRB(16, 4, 16, 14),
          child: Column(
            children: [
              Row(
                children: [
                  Text(
                    appL10n.tkQuestionOf(shownNumber, shownTotal),
                    style: const TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 13.5,
                    ),
                  ),
                  const Spacer(),
                  InfoChip(
                    icon: Icons.stars_rounded,
                    text: appL10n.tkPlusPoints(task.pointsReward),
                    background: AppCultureColors.rewardBg,
                    foreground: AppCultureColors.rewardText,
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  for (var i = 0; i < shownTotal; i++)
                    Expanded(
                      child: Container(
                        height: 6,
                        margin: EdgeInsets.only(
                          right: i == shownTotal - 1 ? 0 : 5,
                        ),
                        decoration: BoxDecoration(
                          color: i < shownNumber
                              ? AppCultureColors.heritageJade
                              : AppCultureColors.surfaceSubtle,
                          borderRadius: BorderRadius.circular(4),
                        ),
                      ),
                    ),
                ],
              ),
            ],
          ),
        ),
        Expanded(
          child: AnimatedSwitcher(
            duration: const Duration(milliseconds: 220),
            transitionBuilder: (child, anim) => FadeTransition(
              opacity: anim,
              child: SlideTransition(
                position: Tween(
                  begin: const Offset(0.06, 0),
                  end: Offset.zero,
                ).animate(anim),
                child: child,
              ),
            ),
            child: ListView(
              key: ValueKey(question.id),
              padding: const EdgeInsets.all(16),
              children: [
                if (task.sequential && task.station != null)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Row(
                      children: [
                        const Icon(
                          Icons.place_rounded,
                          size: 16,
                          color: AppCultureColors.heritageJade,
                        ),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            appL10n.tkAtPlace(task.station!.name),
                            style: const TextStyle(
                              fontSize: 12.5,
                              fontWeight: FontWeight.w700,
                              color: AppCultureColors.jadeDark,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                SoftCard(
                  padding: const EdgeInsets.all(20),
                  child: Text(
                    question.content,
                    style: const TextStyle(
                      fontSize: 18,
                      height: 1.4,
                      fontWeight: FontWeight.w700,
                      color: AppCultureColors.textDark,
                    ),
                  ),
                ),
                const SizedBox(height: 14),
                if (question.isText)
                  _buildTextAnswer(question)
                else
                  ..._buildOptions(question),
              ],
            ),
          ),
        ),
        Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            border: Border(top: BorderSide(color: AppCultureColors.border)),
          ),
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
          child: SafeArea(
            top: false,
            child: Row(
              children: [
                if (!task.sequential && index > 0) ...[
                  OutlinedButton(
                    onPressed: _busy
                        ? null
                        : () => setState(() => _index = index - 1),
                    style: OutlinedButton.styleFrom(
                      minimumSize: const Size(56, 52),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                    ),
                    child: const Icon(Icons.arrow_back_rounded),
                  ),
                  const SizedBox(width: 10),
                ],
                Expanded(
                  child: PrimaryButton(
                    label: task.sequential
                        ? appL10n.tkConfirmAnswer
                        : (isLast ? appL10n.tkSubmit : appL10n.tkNextQuestion),
                    icon: isLast || task.sequential
                        ? Icons.send_rounded
                        : Icons.arrow_forward_rounded,
                    loading: _busy,
                    onPressed: task.sequential
                        ? (_isAnswered(question) ? _submit : null)
                        : isLast
                        ? (answeredAll ? _submit : null)
                        : (_isAnswered(question)
                              ? () => setState(() => _index = index + 1)
                              : null),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  List<Widget> _buildOptions(TaskQuestion question) {
    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
    final selected = _choices[question.id];
    return [
      for (var i = 0; i < question.options.length; i++)
        Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: InkWell(
            borderRadius: BorderRadius.circular(18),
            onTap: _busy
                ? null
                : () => setState(
                    () => _choices[question.id] = question.options[i].id,
                  ),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 180),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: selected == question.options[i].id
                    ? AppCultureColors.jadeLight
                    : Colors.white,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(
                  color: selected == question.options[i].id
                      ? AppCultureColors.heritageJade
                      : AppCultureColors.border,
                  width: selected == question.options[i].id ? 2 : 1,
                ),
              ),
              child: Row(
                children: [
                  Container(
                    width: 34,
                    height: 34,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: selected == question.options[i].id
                          ? AppCultureColors.heritageJade
                          : AppCultureColors.surfaceSubtle,
                    ),
                    child: Center(
                      child: selected == question.options[i].id
                          ? const Icon(
                              Icons.check_rounded,
                              color: Colors.white,
                              size: 19,
                            )
                          : Text(
                              i < letters.length ? letters[i] : '${i + 1}',
                              style: const TextStyle(
                                fontWeight: FontWeight.w700,
                                color: AppCultureColors.textMuted,
                              ),
                            ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      question.options[i].content,
                      style: const TextStyle(
                        fontSize: 15,
                        height: 1.35,
                        color: AppCultureColors.textDark,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
    ];
  }

  Widget _buildTextAnswer(TaskQuestion question) {
    return TextField(
      controller: _controllerFor(question.id),
      onChanged: (_) => setState(() {}),
      enabled: !_busy,
      minLines: 3,
      maxLines: 6,
      textCapitalization: TextCapitalization.sentences,
      style: const TextStyle(fontSize: 15, height: 1.4),
      decoration: InputDecoration(
        hintText: appL10n.tkAnswerHint,
        filled: true,
        fillColor: Colors.white,
        contentPadding: const EdgeInsets.all(16),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(18),
          borderSide: const BorderSide(color: AppCultureColors.border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(18),
          borderSide: const BorderSide(color: AppCultureColors.border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(18),
          borderSide: const BorderSide(
            color: AppCultureColors.heritageJade,
            width: 2,
          ),
        ),
      ),
    );
  }

  // ── Kết quả ──────────────────────────────────────────────────────────────────

  Widget _buildResult() {
    final result = _result!;
    final task = _task;

    final bool success = result.completed;
    final bool stepCorrect = !success && result.lastAnswerCorrect == true;

    late final IconData icon;
    late final Color tone;
    late final String title;
    late final String body;

    if (success && task.perQuestionPoints) {
      // Câu đố chấm theo câu: luôn hoàn thành sau một lần nộp, điểm theo số câu đúng.
      final perfect = result.correctCount >= result.totalQuestions;
      icon = perfect ? Icons.emoji_events_rounded : Icons.fact_check_rounded;
      tone = result.correctCount > 0 ? AppCultureColors.heritageJade : AppCultureColors.amberDark;
      title = perfect ? appL10n.tkExcellent : (result.correctCount > 0 ? appL10n.tkCompleted : appL10n.tkSubmitted);
      body = appL10n.tkResultScore(result.correctCount, result.totalQuestions, task.name);
    } else if (success) {
      icon = Icons.emoji_events_rounded;
      tone = AppCultureColors.heritageJade;
      title = appL10n.tkExcellent;
      body = appL10n.tkMissionCompleted(task.name);
    } else if (stepCorrect) {
      icon = Icons.check_circle_rounded;
      tone = AppCultureColors.heritageJade;
      title = appL10n.tkCorrect;
      body = appL10n.tkCorrectSoFar(result.questionIndex, result.totalQuestions);
    } else {
      icon = Icons.sentiment_dissatisfied_rounded;
      tone = AppCultureColors.error;
      title = appL10n.tkIncorrect;
      body = result.exhausted
          ? appL10n.tkNoAttempts
          : appL10n.tkRetryInfo(result.correctCount, result.totalQuestions, result.attemptsRemaining);
    }

    final earned = task.perQuestionPoints || result.pointsEarned > 0
        ? result.pointsEarned
        : task.pointsReward;

    return ListView(
      padding: const EdgeInsets.all(24),
      children: [
        const SizedBox(height: 24),
        Center(
          child: TweenAnimationBuilder<double>(
            tween: Tween(begin: 0.4, end: 1),
            duration: const Duration(milliseconds: 600),
            curve: Curves.elasticOut,
            builder: (_, v, child) => Transform.scale(scale: v, child: child),
            child: Container(
              width: 120,
              height: 120,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: tone.withValues(alpha: 0.12),
              ),
              child: Icon(icon, size: 64, color: tone),
            ),
          ),
        ),
        const SizedBox(height: 22),
        Text(
          title,
          textAlign: TextAlign.center,
          style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 10),
        Text(
          body,
          textAlign: TextAlign.center,
          style: const TextStyle(
            fontSize: 14.5,
            height: 1.5,
            color: AppCultureColors.textMuted,
          ),
        ),
        if (success && earned > 0) ...[
          const SizedBox(height: 18),
          Center(
            child: InfoChip(
              icon: Icons.stars_rounded,
              text: appL10n.tkBonusPoints(earned),
              background: AppCultureColors.rewardBg,
              foreground: AppCultureColors.rewardText,
            ),
          ),
        ],
        const SizedBox(height: 32),
        if (stepCorrect)
          PrimaryButton(
            label: appL10n.tkGoNextPlace,
            icon: Icons.near_me_rounded,
            loading: _busy,
            onPressed: _continueNextStation,
          )
        else if (!success && !result.exhausted)
          PrimaryButton(
            label: appL10n.tkRetry,
            icon: Icons.replay_rounded,
            onPressed: _retry,
          ),
        const SizedBox(height: 10),
        OutlinedButton(
          onPressed: () => Navigator.of(context).pop(_changed),
          style: OutlinedButton.styleFrom(
            minimumSize: const Size.fromHeight(52),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
          ),
          child: Text(appL10n.tkBackToJourney),
        ),
      ],
    );
  }
}
