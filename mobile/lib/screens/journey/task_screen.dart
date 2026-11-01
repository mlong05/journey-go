import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_compass/flutter_compass.dart';
import 'package:geolocator/geolocator.dart' show Position;
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/constants/app_colors.dart';
import '../../core/models/tour_journey_model.dart';
import '../../core/services/api_client.dart';
import '../../core/services/journey_service.dart';
import '../../core/services/location_service.dart';
import '../../core/services/route_service.dart';
import '../common/heritage_motion.dart' show DrumMotif, SlowSpin;
import 'journey_widgets.dart';
import 'qr_scan_screen.dart';
import 'map_kit.dart' show MapRoundButton, MapAttributionText, formatDistance;
import 'navigation.dart' show formatDuration;
import 'reward_effects.dart';
import 'station_map.dart';

enum _Phase { loading, intro, locked, quiz, result, error }

/// Trong khoảng này tới trạm thì bỏ tuyến đường, chỉ còn la bàn + khoảng cách đường chim bay
/// (lối đi trong khuôn viên di tích hầu như không có trên bản đồ).
const int _compassRangeMeters = 250;

/// Đi lệch khỏi điểm xuất phát của tuyến quá mức này thì tìm lại đường.
const double _rerouteMeters = 60;

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

  const TaskScreen({
    super.key,
    required this.journeyId,
    required this.taskId,
    required this.fallbackName,
    required this.destinationName,
  });

  @override
  State<TaskScreen> createState() => _TaskScreenState();
}

class _TaskScreenState extends State<TaskScreen> {
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
  final GlobalKey<StationMapState> _mapKey = GlobalKey<StationMapState>();
  bool _satellite = false;

  /// Thứ tự tự do: trạm du khách chọn để dẫn đường tới (id câu hỏi của trạm); null = trạm gần nhất.
  int? _targetQuestionId;

  int _index = 0;
  final Map<int, int> _choices = {};
  final Map<int, TextEditingController> _texts = {};

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
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

  /// Trạm đang dẫn đường tới: thứ tự tự do thì trạm du khách chọn (nếu còn mở), không thì trạm backend gợi ý.
  TaskStation? get _navStation {
    final task = _content;
    if (task == null) return null;
    if (task.freeOrder && _targetQuestionId != null) {
      final picked = task.stations.where((s) => s.questionId == _targetQuestionId && !s.done && s.hasCoords);
      if (picked.isNotEmpty) return picked.first;
    }
    return task.station;
  }

  LatLng? get _stationPoint {
    final s = _navStation;
    if (s == null || !s.hasCoords) return null;
    return LatLng(s.latitude!, s.longitude!);
  }

  /// Khoảng cách từ du khách tới một trạm bất kỳ (null khi chưa có vị trí hoặc trạm không có tọa độ).
  int? _distanceTo(TaskStation s) {
    final user = _userPoint;
    if (user == null || !s.hasCoords) return null;
    return LocationService.distanceMeters(user.latitude, user.longitude, s.latitude!, s.longitude!).round();
  }

  /// Thứ tự tự do: du khách đang đứng trong bán kính của một trạm chưa xong nào đó.
  bool get _insideAnyOpenStation {
    final task = _content;
    if (task == null) return false;
    for (final s in task.stations) {
      if (s.done) continue;
      final d = _distanceTo(s);
      if (d != null && d <= (s.radiusMeters ?? 50)) return true;
    }
    return false;
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
    final radius = _navStation?.radiusMeters ?? 50;
    final now = DateTime.now();
    final cooledDown =
        _lastAutoCheck == null ||
        now.difference(_lastAutoCheck!) > const Duration(seconds: 8);
    // Thứ tự tự do: vào bán kính của bất kỳ trạm chưa xong nào cũng tự mở câu hỏi của trạm đó
    final inside = _content?.freeOrder == true
        ? _insideAnyOpenStation
        : (distance != null && distance <= radius);
    if (inside &&
        !_busy &&
        cooledDown &&
        _phase == _Phase.locked) {
      _lastAutoCheck = now;
      _locateAndOpen();
    }
  }

  Future<void> _openDirections() async {
    final station = _stationPoint;
    if (station == null) return;
    final uri = Uri.parse(
      'https://www.google.com/maps/dir/?api=1'
      '&destination=${station.latitude},${station.longitude}&travelmode=walking',
    );
    final ok = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!ok && mounted) _snack('Không mở được ứng dụng bản đồ.');
  }

  Future<void> _load() async {
    setState(() => _phase = _Phase.loading);
    try {
      final content = await _service.getTask(
        journeyId: widget.journeyId,
        taskId: widget.taskId,
      );
      if (!mounted) return;
      setState(() {
        _content = content;
        _phase = _Phase.intro;
        _error = null;
      });
      _refreshIntroDistance();
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
      _qr = (qr != null && content.unlocked) ? qr : null;
      if (qr != null && !content.unlocked && !content.isFinished) {
        _snack(content.freeOrder
            ? 'Mã QR không khớp với trạm nào chưa hoàn thành.'
            : 'Mã QR không khớp với trạm này. Hãy thử lại.');
      }
      if (content.freeOrder && content.unlocked) _targetQuestionId = content.station?.questionId;
      setState(() {
        _content = content;
        _phase = content.isFinished
            ? _Phase.intro
            : (content.unlocked ? _Phase.quiz : _Phase.locked);
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
          title: 'Quét QR tại trạm',
          hint: _task.freeOrder
              ? 'Quét mã QR tại bất kỳ trạm nào chưa hoàn thành'
              : _task.station != null
              ? 'Quét mã QR tại ${_task.station!.name}'
              : 'Quét mã QR tại trạm kế tiếp',
        ),
      ),
    );
    if (value != null && mounted) await _locateAndOpen(qr: value);
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
      setState(() {
        _result = result;
        _phase = _Phase.result;
      });
      _syncTracking();
      if (result.completed) {
        final earned = result.pointsEarned > 0
            ? result.pointsEarned
            : task.pointsReward;
        if (earned > 0) showPointsBurst(context, text: '+$earned điểm');
      } else if (result.lastAnswerCorrect == true) {
        showPointsBurst(
          context,
          text: 'Chặng ${result.questionIndex}/${result.totalQuestions}',
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
    _load();
  }

  Future<void> _continueNextStation() async {
    _choices.clear();
    for (final c in _texts.values) {
      c.clear();
    }
    _result = null;
    _qr = null;
    _targetQuestionId = null;
    await _locateAndOpen();
  }

  /// Thứ tự tự do, trả lời sai: làm lại đúng trạm vừa sai (các trạm đã xong vẫn giữ).
  Future<void> _retryStation() async {
    final questions = _content?.questions ?? const <TaskQuestion>[];
    _choices.clear();
    for (final c in _texts.values) {
      c.clear();
    }
    _result = null;
    _qr = null;
    if (questions.isNotEmpty) _targetQuestionId = questions.first.id;
    await _locateAndOpen();
  }

  /// Thứ tự tự do: chọn một trạm để dẫn đường tới.
  void _openStation(TaskStation s) {
    if (s.done || s.questionId == null) return;
    setState(() {
      _targetQuestionId = s.questionId;
      _walkRoute = null;
      _walkRouteOrigin = null;
    });
    _locateAndOpen();
  }

  /// Đổi trạm đích ngay trên bản đồ dẫn đường.
  void _switchTarget(TaskStation s) {
    if (s.done) return;
    setState(() {
      _targetQuestionId = s.questionId;
      _walkRoute = null;
      _walkRouteOrigin = null;
      _walkRouteAt = null;
    });
    _snack('Đang dẫn đường tới ${s.name}');
    WidgetsBinding.instance.addPostFrameCallback((_) => _mapKey.currentState?.fitAll());
    _refreshWalkRoute();
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
                const Row(
                  children: [
                    Icon(Icons.lightbulb_rounded, color: AppCultureColors.gold),
                    SizedBox(width: 8),
                    Text(
                      'Manh mối',
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
                  label: 'Đã rõ',
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
                  _error ?? 'Không tải được nhiệm vụ.',
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 16),
                OutlinedButton(onPressed: _load, child: const Text('Thử lại')),
              ],
            ),
          ),
        );
      case _Phase.intro:
        return _buildIntro();
      case _Phase.locked:
        return _buildLocked();
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
    final radius = _navStation?.radiusMeters ?? 50;
    final distance = _liveDistance;
    final atStation = task.freeOrder ? _insideAnyOpenStation : (distance != null && distance <= radius);
    // Cần đi tới trạm trước: nhiệm vụ theo vị trí, trạm hiện tại có tọa độ và chưa vào bán kính
    final needsTravel = task.requiresLocation && _stationPoint != null && !atStation;
    final showDescription =
        task.description.trim().length > 3 && task.description.trim() != task.name.trim();

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
      children: [
        _hero(task, showDescription),
        const SizedBox(height: 16),
        if (stations.isNotEmpty) ...[
          _buildStationList(task, stations),
          const SizedBox(height: 16),
        ],
        _rulesCard(task),
        const SizedBox(height: 20),
        if (task.isCompleted)
          _banner(
            Icons.verified_rounded,
            'Bạn đã hoàn thành nhiệm vụ này.',
            AppCultureColors.jadeLight,
            AppCultureColors.jadeDark,
          )
        else if (task.isFailed)
          _banner(
            Icons.block_rounded,
            'Bạn đã hết lượt làm nhiệm vụ này.',
            const Color(0xFFFEE2E2),
            AppCultureColors.error,
          )
        else
          Row(
            children: [
              Expanded(
                child: PrimaryButton(
                  label: needsTravel
                      ? (task.freeOrder ? 'Đến trạm gần nhất' : 'Chỉ đường tới trạm')
                      : (task.attempts > 0 && !task.freeOrder ? 'Làm lại nhiệm vụ' : 'Bắt đầu nhiệm vụ'),
                  icon: needsTravel ? Icons.near_me_rounded : Icons.play_arrow_rounded,
                  loading: _busy,
                  onPressed: _start,
                ),
              ),
              if (task.requiresLocation) ...[
                const SizedBox(width: 10),
                Tooltip(
                  message: 'Xem manh mối',
                  child: OutlinedButton(
                    onPressed: _busy ? null : _showClue,
                    style: OutlinedButton.styleFrom(
                      minimumSize: const Size(56, 52),
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                      foregroundColor: AppCultureColors.amberDark,
                      side: const BorderSide(color: AppCultureColors.rewardBorder, width: 1.5),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.lightbulb_outline_rounded, size: 20),
                        SizedBox(width: 6),
                        Text('Manh mối', style: TextStyle(fontWeight: FontWeight.w700)),
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

  /// Thẻ mở đầu: nền ngọc chuyển sắc, hoa văn trống đồng xoay chậm, nhãn loại nhiệm vụ, tên lớn
  /// và dải ba con số (trạm/câu hỏi, điểm thưởng, lượt còn lại).
  Widget _hero(TaskContent task, bool showDescription) {
    final field = task.requiresLocation;
    final eyebrow = !field
        ? 'ĐỐ VUI DI SẢN'
        : task.freeOrder
        ? 'NHIỆM VỤ THỰC ĐỊA · TỰ DO KHÁM PHÁ'
        : 'NHIỆM VỤ THỰC ĐỊA · THEO LỘ TRÌNH';

    Widget stat(String value, String label) => Column(
          children: [
            Text(value, style: _Type.statValue),
            const SizedBox(height: 3),
            Text(label, style: _Type.statLabel, maxLines: 1, overflow: TextOverflow.ellipsis),
          ],
        );
    Widget divider() => Container(width: 1, height: 28, color: Colors.white.withValues(alpha: 0.22));

    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(26),
        gradient: const LinearGradient(
          colors: [AppCultureColors.jadeGradientStart, AppCultureColors.jadeGradientEnd],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        boxShadow: [
          BoxShadow(
            color: AppCultureColors.heritageJade.withValues(alpha: 0.28),
            blurRadius: 22,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Stack(
        children: [
          Positioned(
            right: -54,
            top: -54,
            child: SlowSpin(child: DrumMotif(size: 200, color: Colors.white.withValues(alpha: 0.12))),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 34,
                      height: 34,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: Colors.white.withValues(alpha: 0.18),
                      ),
                      child: Icon(
                        field ? (task.freeOrder ? Icons.travel_explore_rounded : Icons.route_rounded) : Icons.quiz_rounded,
                        color: Colors.white,
                        size: 19,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        eyebrow,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: _Type.eyebrow.copyWith(color: Colors.white.withValues(alpha: 0.88)),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                Text(task.name, style: _Type.display.copyWith(color: Colors.white)),
                if (showDescription) ...[
                  const SizedBox(height: 8),
                  Text(task.description, style: _Type.body.copyWith(color: Colors.white.withValues(alpha: 0.88))),
                ],
                const SizedBox(height: 18),
                Container(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.14),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Row(
                    children: [
                      Expanded(child: stat('${task.totalQuestions}', field ? 'trạm' : 'câu hỏi')),
                      divider(),
                      Expanded(child: stat('+${task.pointsReward}', 'điểm thưởng')),
                      divider(),
                      Expanded(child: stat('${task.attemptsRemaining}/${task.maxAttempts}', 'lượt còn lại')),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _rulesCard(TaskContent task) {
    return SoftCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Thể lệ', style: _Type.section),
          const SizedBox(height: 12),
          _rule(
            Icons.workspace_premium_outlined,
            'Trả lời đúng tất cả câu hỏi để nhận trọn điểm thưởng (chỉ một lần).',
          ),
          if (task.requiresLocation && task.freeOrder) ...[
            _rule(
              Icons.map_outlined,
              'Mọi trạm đều hiện trên bản đồ. Tới trạm nào trước cũng được: đứng trong bán kính hoặc quét mã QR tại trạm để mở câu hỏi.',
            ),
            _rule(
              Icons.shield_outlined,
              'Trả lời sai ở một trạm chỉ mất một lượt. Các trạm đã đúng vẫn được giữ.',
            ),
          ] else if (task.requiresLocation) ...[
            _rule(
              Icons.place_outlined,
              'Mỗi câu hỏi gắn với một trạm, mở lần lượt theo thứ tự. Đứng trong bán kính trạm để mở câu hỏi.',
            ),
            _rule(Icons.refresh_rounded, 'Trả lời sai một câu, bạn sẽ phải làm lại từ trạm đầu.'),
          ] else
            _rule(
              Icons.refresh_rounded,
              'Chưa đúng hết, bạn có thể làm lại nếu còn lượt (tối đa ${task.maxAttempts} lượt).',
            ),
        ],
      ),
    );
  }

  /// Danh sách trạm: tuần tự là dòng thời gian khóa dần; tự do là các thẻ trạm, chạm để chỉ đường.
  Widget _buildStationList(TaskContent task, List<TaskStation> stations) {
    final free = task.freeOrder;
    final doneCount = (task.isCompleted ? stations.length : task.stationsDone).clamp(0, stations.length);
    final current = task.isCompleted ? stations.length : task.questionIndex;
    final canLocate = !task.isFinished && _stationPoint != null;

    return SoftCard(
      padding: const EdgeInsets.fromLTRB(16, 16, 12, 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(free ? 'Các trạm khám phá' : 'Lộ trình các trạm', style: _Type.section),
                    const SizedBox(height: 2),
                    Text(
                      free ? 'Tới trạm nào trước cũng được · chạm để chỉ đường' : 'Đi lần lượt theo thứ tự',
                      style: _Type.caption,
                    ),
                  ],
                ),
              ),
              if (canLocate)
                IconButton(
                  tooltip: 'Cập nhật khoảng cách',
                  onPressed: _locatingIntro ? null : _refreshIntroDistance,
                  icon: _locatingIntro
                      ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                      : const Icon(Icons.my_location_rounded, size: 20, color: AppCultureColors.oceanBlue),
                ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: TweenAnimationBuilder<double>(
                    tween: Tween(begin: 0, end: stations.isEmpty ? 0 : doneCount / stations.length),
                    duration: const Duration(milliseconds: 700),
                    curve: Curves.easeOutCubic,
                    builder: (_, v, _) => LinearProgressIndicator(
                      value: v,
                      minHeight: 6,
                      backgroundColor: AppCultureColors.surfaceSubtle,
                      color: AppCultureColors.heritageJade,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Text(
                '$doneCount/${stations.length}',
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: AppCultureColors.jadeDark),
              ),
              const SizedBox(width: 4),
            ],
          ),
          const SizedBox(height: 14),
          for (var i = 0; i < stations.length; i++)
            _stationRow(
              index: i,
              station: stations[i],
              done: free ? (stations[i].done || task.isCompleted) : i < current,
              active: !task.isFinished && (free ? !stations[i].done : i == current),
              isLast: i == stations.length - 1,
              free: free,
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
    required bool free,
  }) {
    final radius = station.radiusMeters ?? 50;
    final distance = active ? _distanceTo(station) : null;
    final arrived = distance != null && distance <= radius;
    final Color tone = done
        ? AppCultureColors.heritageJade
        : !active
        ? AppCultureColors.textLight
        : arrived
        ? AppCultureColors.heritageJade
        : (free ? AppCultureColors.amberDark : AppCultureColors.oceanBlue);

    late final String status;
    if (done) {
      status = 'Đã hoàn thành';
    } else if (!active) {
      status = 'Mở khóa sau trạm $index';
    } else if (_locatingIntro && distance == null) {
      status = 'Đang xác định vị trí…';
    } else if (distance == null) {
      status = station.hasCoords ? (_introLocationError ?? 'Chưa có vị trí của bạn') : 'Quét mã QR tại trạm';
    } else if (arrived) {
      status = 'Bạn đang ở đây · sẵn sàng mở câu hỏi';
    } else {
      status = 'Cách ${formatDistance(distance)} · bán kính $radius m';
    }

    final medallion = Container(
      width: 34,
      height: 34,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: done || active ? tone : AppCultureColors.surfaceSubtle,
        border: active && !done ? Border.all(color: tone.withValues(alpha: 0.28), width: 4) : null,
      ),
      alignment: Alignment.center,
      child: done
          ? const Icon(Icons.check_rounded, size: 18, color: Colors.white)
          : active
          ? Text(
              '${index + 1}',
              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 13),
            )
          : const Icon(Icons.lock_rounded, size: 15, color: AppCultureColors.textLight),
    );

    final text = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'TRẠM ${index + 1}',
          style: _Type.eyebrow.copyWith(fontSize: 10, color: done || active ? tone : AppCultureColors.textLight),
        ),
        const SizedBox(height: 2),
        Text(
          station.name,
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(
            fontSize: 14.5,
            height: 1.3,
            fontWeight: FontWeight.w700,
            color: done || active ? AppCultureColors.textDark : AppCultureColors.textMuted,
            decoration: done && free ? TextDecoration.lineThrough : null,
            decorationColor: AppCultureColors.textLight,
          ),
        ),
        const SizedBox(height: 3),
        Text(
          status,
          style: TextStyle(
            fontSize: 12,
            fontWeight: active ? FontWeight.w700 : FontWeight.w500,
            color: active ? tone : AppCultureColors.textMuted,
          ),
        ),
      ],
    );

    // Thứ tự tự do: mỗi trạm là một thẻ chạm được, không có đường nối
    if (free) {
      final tappable = active && station.questionId != null;
      return Padding(
        padding: EdgeInsets.only(bottom: isLast ? 4 : 10, right: 4),
        child: Material(
          color: done ? AppCultureColors.jadeLight.withValues(alpha: 0.55) : Colors.white,
          borderRadius: BorderRadius.circular(16),
          child: InkWell(
            borderRadius: BorderRadius.circular(16),
            onTap: tappable && !_busy ? () => _openStation(station) : null,
            child: Container(
              padding: const EdgeInsets.fromLTRB(12, 12, 10, 12),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: arrived ? AppCultureColors.heritageJade : AppCultureColors.border,
                  width: arrived ? 1.5 : 1,
                ),
              ),
              child: Row(
                children: [
                  medallion,
                  const SizedBox(width: 12),
                  Expanded(child: text),
                  if (tappable)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
                      decoration: BoxDecoration(
                        color: tone.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(arrived ? Icons.lock_open_rounded : Icons.near_me_rounded, size: 15, color: tone),
                          const SizedBox(width: 4),
                          Text(
                            arrived ? 'Mở' : 'Đi',
                            style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: tone),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            ),
          ),
        ),
      );
    }

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SizedBox(
            width: 36,
            child: Column(
              children: [
                medallion,
                if (!isLast)
                  Expanded(
                    child: Container(
                      width: 2,
                      margin: const EdgeInsets.symmetric(vertical: 3),
                      color: done ? AppCultureColors.heritageJade : AppCultureColors.border,
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Padding(
              padding: EdgeInsets.only(bottom: isLast ? 4 : 16, top: 2),
              child: text,
            ),
          ),
        ],
      ),
    );
  }

  Widget _rule(IconData icon, String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 28,
            height: 28,
            decoration: const BoxDecoration(shape: BoxShape.circle, color: AppCultureColors.jadeLight),
            child: Icon(icon, size: 16, color: AppCultureColors.heritageJade),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(text, style: _Type.body.copyWith(fontSize: 13.5)),
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
    final station = _navStation!;
    final radius = station.radiusMeters ?? 50;
    // Thứ tự tự do: vẽ cả các trạm khác, chạm để đổi trạm đích
    final others = task.freeOrder
        ? [
            for (final s in task.stations)
              if (s.hasCoords && s.questionId != station.questionId)
                StationMarker(
                  point: LatLng(s.latitude!, s.longitude!),
                  label: s.name,
                  done: s.done,
                  onTap: s.done ? null : () => _switchTarget(s),
                ),
          ]
        : const <StationMarker>[];
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
            others: others,
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
                  tooltip: 'Quay lại',
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
                tooltip: 'Xem cả bạn và trạm',
                onPressed: () => _mapKey.currentState?.fitAll(),
              ),
              const SizedBox(height: 10),
              if (others.isNotEmpty) ...[
                MapRoundButton(
                  icon: Icons.scatter_plot_rounded,
                  tooltip: 'Xem mọi trạm',
                  color: AppCultureColors.amberDark,
                  onPressed: () => _mapKey.currentState?.fitStations(),
                ),
                const SizedBox(height: 10),
              ],
              MapRoundButton(
                icon: Icons.my_location_rounded,
                tooltip: 'Vị trí của tôi',
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
                tooltip: _satellite ? 'Bản đồ đường phố' : 'Ảnh vệ tinh',
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
                    task.freeOrder ? 'Xong ${task.stationsDone}/$total' : 'Trạm ${task.questionIndex + 1}/$total',
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
                        color: _segmentColor(task, i),
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

  /// Màu từng đoạn trên thanh tiến độ trạm: xanh ngọc = đã xong, xanh dương = đang tới, xám = chưa.
  Color _segmentColor(TaskContent task, int i) {
    if (task.freeOrder) {
      final stations = _stations;
      if (i < stations.length && stations[i].done) return AppCultureColors.heritageJade;
      final target = _navStation;
      if (i < stations.length && target != null && stations[i].questionId == target.questionId) {
        return AppCultureColors.oceanBlue;
      }
      return AppCultureColors.surfaceSubtle;
    }
    return i < task.questionIndex
        ? AppCultureColors.heritageJade
        : i == task.questionIndex
        ? AppCultureColors.oceanBlue
        : AppCultureColors.surfaceSubtle;
  }

  Widget _navPanel({
    required String stationName,
    required int radius,
    required int? distance,
    required double? bearing,
    required bool arrived,
    required double closeness,
  }) {
    // Mũi tên: chỉ hướng tới trạm; khi đang đi thì tính so với hướng đang đi.
    // Hướng đang đi (GPS) khi di chuyển, hướng điện thoại (la bàn) khi đứng yên.
    final heading = _effectiveHeading;
    final arrowAngle = bearing == null
        ? 0.0
        : (bearing - (heading ?? 0)) * 3.141592653589793 / 180;
    final walkRoute = distance != null && distance > _compassRangeMeters ? _walkRoute : null;
    final directionText = bearing == null
        ? 'Đang xác định vị trí của bạn...'
        : walkRoute != null
        ? 'Đi bộ ~${formatDuration(walkRoute.durationSeconds)} theo đường trên bản đồ'
        : heading != null
        ? '${turnHint(heading, bearing)} · hướng ${compassLabel(bearing)}'
        : 'Đi về hướng ${compassLabel(bearing)}';

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
                              ? 'Bạn đã tới trạm'
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
                              ? (_busy
                                    ? 'Đang mở câu hỏi...'
                                    : 'Câu hỏi sẽ tự mở')
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
                    'Bán kính $radius m',
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppCultureColors.textMuted,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              ClipRRect(
                borderRadius: BorderRadius.circular(6),
                child: LinearProgressIndicator(
                  value: closeness,
                  minHeight: 8,
                  backgroundColor: AppCultureColors.surfaceSubtle,
                  color: AppCultureColors.heritageJade,
                ),
              ),
              if (_locationMessage != null) ...[
                const SizedBox(height: 12),
                _banner(
                  Icons.location_off_rounded,
                  _locationMessage!,
                  const Color(0xFFFEF3C7),
                  AppCultureColors.rewardText,
                ),
                if (_locationNeedsSettings)
                  TextButton(
                    onPressed: LocationService.openSettings,
                    child: const Text('Mở cài đặt vị trí'),
                  ),
              ],
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: arrived
                        ? PrimaryButton(
                            label: 'Mở câu hỏi',
                            icon: Icons.quiz_rounded,
                            loading: _busy,
                            onPressed: _locateAndOpen,
                          )
                        : PrimaryButton(
                            label: 'Quét QR tại trạm',
                            icon: Icons.qr_code_scanner_rounded,
                            loading: _busy,
                            onPressed: _scanQr,
                          ),
                  ),
                  const SizedBox(width: 10),
                  _squareAction(
                    icon: Icons.directions_rounded,
                    tooltip: 'Chỉ đường bằng Google Maps',
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
                    label: const Text('Manh mối'),
                  ),
                  TextButton.icon(
                    onPressed: _busy ? null : _locateAndOpen,
                    icon: const Icon(Icons.refresh_rounded, size: 18),
                    label: const Text('Kiểm tra vị trí'),
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
                task.totalQuestions <= 0
                    ? 'Trạm kế tiếp'
                    : task.freeOrder
                    ? 'Đã xong ${task.stationsDone}/${task.totalQuestions} trạm'
                    : 'Trạm ${task.questionIndex + 1}/${task.totalQuestions}',
                style: const TextStyle(
                  fontSize: 13,
                  color: AppCultureColors.textMuted,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                station?.name ?? 'Địa điểm kế tiếp',
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w700,
                  height: 1.25,
                ),
              ),
              const SizedBox(height: 10),
              const Text(
                'Tìm mã QR đặt tại trạm và quét để mở câu hỏi.',
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
        PrimaryButton(
          label: 'Quét QR tại trạm',
          icon: Icons.qr_code_scanner_rounded,
          loading: _busy,
          onPressed: _scanQr,
        ),
        const SizedBox(height: 6),
        Center(
          child: TextButton.icon(
            onPressed: _busy ? null : _showClue,
            icon: const Icon(Icons.lightbulb_outline_rounded, size: 18),
            label: const Text('Xem manh mối'),
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
            'Nhiệm vụ này chưa có câu hỏi.',
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
                    'Câu $shownNumber / $shownTotal',
                    style: const TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 13.5,
                    ),
                  ),
                  const Spacer(),
                  InfoChip(
                    icon: Icons.stars_rounded,
                    text: '+${task.pointsReward} điểm',
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
                            'Tại: ${task.station!.name}',
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
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      if (question.imageUrl != null) ...[
                        _buildQuestionImage(question.imageUrl!),
                        const SizedBox(height: 14),
                      ],
                      Text(
                        question.content,
                        style: const TextStyle(
                          fontSize: 18,
                          height: 1.4,
                          fontWeight: FontWeight.w700,
                          color: AppCultureColors.textDark,
                        ),
                      ),
                    ],
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
                        ? 'Xác nhận câu trả lời'
                        : (isLast ? 'Nộp bài' : 'Câu tiếp theo'),
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

  /// Ảnh minh hoạ của câu hỏi; chạm để xem toàn màn hình và phóng to.
  Widget _buildQuestionImage(String url) {
    return GestureDetector(
      onTap: () => _showImageFullscreen(url),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(14),
        child: AspectRatio(aspectRatio: 16 / 10, child: _networkImage(url)),
      ),
    );
  }

  void _showImageFullscreen(String url) {
    showDialog<void>(
      context: context,
      barrierColor: Colors.black87,
      builder: (ctx) => GestureDetector(
        onTap: () => Navigator.of(ctx).pop(),
        child: InteractiveViewer(
          maxScale: 5,
          child: Center(child: Image.network(url, fit: BoxFit.contain)),
        ),
      ),
    );
  }

  Widget _networkImage(String url) {
    return Image.network(
      url,
      fit: BoxFit.cover,
      loadingBuilder: (_, child, progress) => progress == null
          ? child
          : Container(
              color: Colors.black12,
              alignment: Alignment.center,
              child: const CircularProgressIndicator(strokeWidth: 2),
            ),
      errorBuilder: (_, _, _) => Container(
        color: Colors.black12,
        alignment: Alignment.center,
        child: const Icon(Icons.broken_image_outlined, color: Colors.black38),
      ),
    );
  }

  /// Câu hỏi "chọn ảnh đúng": lưới ảnh 2 cột; chạm để chọn, nút kính lúp để xem ảnh lớn.
  Widget _buildImageOptionGrid(TaskQuestion question) {
    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
    final selected = _choices[question.id];
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 10,
      crossAxisSpacing: 10,
      childAspectRatio: 0.82,
      children: [
        for (var i = 0; i < question.options.length; i++)
          Builder(builder: (_) {
            final option = question.options[i];
            final isSelected = selected == option.id;
            return InkWell(
              borderRadius: BorderRadius.circular(18),
              onTap: _busy ? null : () => setState(() => _choices[question.id] = option.id),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 180),
                clipBehavior: Clip.antiAlias,
                decoration: BoxDecoration(
                  color: isSelected ? AppCultureColors.jadeLight : Colors.white,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(
                    color: isSelected ? AppCultureColors.heritageJade : AppCultureColors.border,
                    width: isSelected ? 2.5 : 1,
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Expanded(
                      child: Stack(
                        fit: StackFit.expand,
                        children: [
                          if (option.imageUrl != null)
                            _networkImage(option.imageUrl!)
                          else
                            Container(
                              color: AppCultureColors.surfaceSubtle,
                              alignment: Alignment.center,
                              padding: const EdgeInsets.all(10),
                              child: Text(
                                option.content,
                                textAlign: TextAlign.center,
                                style: const TextStyle(fontSize: 15, color: AppCultureColors.textDark),
                              ),
                            ),
                          Positioned(
                            left: 8,
                            top: 8,
                            child: CircleAvatar(
                              radius: 15,
                              backgroundColor: isSelected
                                  ? AppCultureColors.heritageJade
                                  : Colors.white.withValues(alpha: 0.92),
                              child: isSelected
                                  ? const Icon(Icons.check_rounded, color: Colors.white, size: 18)
                                  : Text(
                                      i < letters.length ? letters[i] : '${i + 1}',
                                      style: const TextStyle(
                                        fontWeight: FontWeight.w700,
                                        color: AppCultureColors.textMuted,
                                      ),
                                    ),
                            ),
                          ),
                          if (option.imageUrl != null)
                            Positioned(
                              right: 6,
                              top: 6,
                              child: Material(
                                color: Colors.black45,
                                shape: const CircleBorder(),
                                child: IconButton(
                                  visualDensity: VisualDensity.compact,
                                  iconSize: 18,
                                  color: Colors.white,
                                  tooltip: 'Xem ảnh lớn',
                                  icon: const Icon(Icons.zoom_in_rounded),
                                  onPressed: () => _showImageFullscreen(option.imageUrl!),
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                    if (option.imageUrl != null && option.content.trim().isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.fromLTRB(10, 8, 10, 10),
                        child: Text(
                          option.content,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontSize: 13.5, color: AppCultureColors.textDark),
                        ),
                      ),
                  ],
                ),
              ),
            );
          }),
      ],
    );
  }

  List<Widget> _buildOptions(TaskQuestion question) {
    if (question.options.any((o) => o.imageUrl != null)) {
      return [_buildImageOptionGrid(question)];
    }
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
        hintText: 'Nhập câu trả lời của bạn...',
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

    if (success) {
      icon = Icons.emoji_events_rounded;
      tone = AppCultureColors.heritageJade;
      title = 'Xuất sắc!';
      body = 'Bạn đã hoàn thành nhiệm vụ "${task.name}".';
    } else if (stepCorrect) {
      icon = Icons.check_circle_rounded;
      tone = AppCultureColors.heritageJade;
      title = 'Chính xác!';
      body = task.freeOrder
          ? 'Bạn đã xong ${result.correctCount}/${result.totalQuestions} trạm. '
                'Chọn một trạm còn lại trên bản đồ để đi tiếp.'
          : 'Bạn đã trả lời đúng ${result.questionIndex}/${result.totalQuestions} câu. '
                'Hãy đến địa điểm kế tiếp để mở câu hỏi tiếp theo.';
    } else {
      icon = Icons.sentiment_dissatisfied_rounded;
      tone = AppCultureColors.error;
      title = 'Chưa chính xác';
      body = result.exhausted
          ? 'Bạn đã hết lượt làm nhiệm vụ này.'
          : task.freeOrder
          ? 'Câu trả lời ở trạm này chưa đúng. Các trạm đã xong (${result.correctCount}/${result.totalQuestions}) '
                'vẫn được giữ. Còn ${result.attemptsRemaining} lượt.'
          : 'Bạn đúng ${result.correctCount}/${result.totalQuestions} câu. '
                'Cần đúng tất cả để nhận điểm. Còn ${result.attemptsRemaining} lượt làm lại.';
    }

    final earned = result.pointsEarned > 0
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
        Text(title, textAlign: TextAlign.center, style: _Type.display.copyWith(fontSize: 28)),
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
              text: '+$earned điểm thưởng',
              background: AppCultureColors.rewardBg,
              foreground: AppCultureColors.rewardText,
            ),
          ),
        ],
        const SizedBox(height: 32),
        if (task.requiresLocation && _stations.length > 1) ...[
          _resultStationDots(result),
          const SizedBox(height: 24),
        ],
        if (stepCorrect)
          PrimaryButton(
            label: task.freeOrder ? 'Chọn trạm tiếp theo' : 'Đến địa điểm kế tiếp',
            icon: Icons.near_me_rounded,
            loading: _busy,
            onPressed: _continueNextStation,
          )
        else if (!success && !result.exhausted) ...[
          PrimaryButton(
            label: task.freeOrder ? 'Thử lại trạm này' : 'Làm lại',
            icon: Icons.replay_rounded,
            loading: _busy,
            onPressed: task.freeOrder ? _retryStation : _retry,
          ),
          if (task.freeOrder)
            Center(
              child: TextButton.icon(
                onPressed: _busy ? null : _continueNextStation,
                icon: const Icon(Icons.alt_route_rounded, size: 18),
                label: const Text('Chọn trạm khác', style: TextStyle(fontWeight: FontWeight.w700)),
              ),
            ),
        ],
        const SizedBox(height: 10),
        OutlinedButton(
          onPressed: () => Navigator.of(context).pop(_changed),
          style: OutlinedButton.styleFrom(
            minimumSize: const Size.fromHeight(52),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
          ),
          child: const Text('Về hành trình'),
        ),
      ],
    );
  }

  /// Hàng chấm trạm ở màn kết quả: đã xong (ngọc, có dấu tích) / chưa xong (xám).
  Widget _resultStationDots(TaskSubmitResult result) {
    final stations = _stations;
    final free = _task.freeOrder;
    final doneCount = result.completed ? stations.length : result.correctCount;
    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            for (var i = 0; i < stations.length; i++) ...[
              if (i > 0)
                Container(
                  width: 18,
                  height: 2,
                  color: AppCultureColors.border,
                ),
              Builder(builder: (_) {
                final done = result.completed ||
                    (free ? (stations[i].done || (result.lastAnswerCorrect == true && stations[i].questionId == _targetQuestionId)) : i < result.questionIndex);
                return AnimatedContainer(
                  duration: const Duration(milliseconds: 300),
                  width: 26,
                  height: 26,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: done ? AppCultureColors.heritageJade : AppCultureColors.surfaceSubtle,
                  ),
                  alignment: Alignment.center,
                  child: done
                      ? const Icon(Icons.check_rounded, size: 15, color: Colors.white)
                      : Text('${i + 1}',
                          style: const TextStyle(
                              fontSize: 11.5, fontWeight: FontWeight.w800, color: AppCultureColors.textMuted)),
                );
              }),
            ],
          ],
        ),
        const SizedBox(height: 8),
        Text('$doneCount/${stations.length} trạm đã xong', style: _Type.caption),
      ],
    );
  }
}

/// Thang chữ thống nhất cho màn nhiệm vụ: nhãn nhỏ in hoa giãn chữ, tiêu đề đậm co chữ nhẹ,
/// thân chữ dễ đọc ngoài trời (cỡ 14, giãn dòng 1.5).
abstract final class _Type {
  static const eyebrow = TextStyle(fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 1.3, height: 1.2);
  static const display = TextStyle(
    fontSize: 24,
    fontWeight: FontWeight.w800,
    height: 1.18,
    letterSpacing: -0.3,
    color: AppCultureColors.textDark,
  );
  static const section = TextStyle(
    fontSize: 16,
    fontWeight: FontWeight.w800,
    letterSpacing: -0.1,
    color: AppCultureColors.textDark,
  );
  static const body = TextStyle(fontSize: 14, height: 1.5, color: AppCultureColors.textMuted);
  static const caption = TextStyle(fontSize: 12, height: 1.35, color: AppCultureColors.textMuted);
  static const statValue = TextStyle(fontSize: 19, fontWeight: FontWeight.w800, color: Colors.white, height: 1.1);
  static const statLabel = TextStyle(fontSize: 11, color: Color(0xD9FFFFFF));
}
