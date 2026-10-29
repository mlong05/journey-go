import 'dart:async';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart' show Position;
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/constants/app_colors.dart';
import '../../core/models/tour_journey_model.dart';
import '../../core/services/api_client.dart';
import '../../core/services/journey_service.dart';
import '../../core/services/location_service.dart';
import 'journey_widgets.dart';
import 'qr_scan_screen.dart';
import 'station_map.dart';

enum _Phase { loading, intro, locked, quiz, result, error }

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
  String? _qr; // mã QR đã quét để mở khóa câu hiện tại (nếu mở bằng QR thay vì GPS)

  // Theo dõi vị trí liên tục khi đang dẫn đường tới trạm (bước "locked").
  StreamSubscription<Position>? _positionSub;
  double? _heading; // hướng đang đi, null khi đứng yên
  DateTime? _lastAutoCheck;

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
    for (final c in _texts.values) {
      c.dispose();
    }
    super.dispose();
  }

  TaskContent get _task => _content!;

  LatLng? get _stationPoint {
    final s = _content?.station;
    if (s == null || s.latitude == null || s.longitude == null) return null;
    return LatLng(s.latitude!, s.longitude!);
  }

  LatLng? get _userPoint => (_lat != null && _lng != null) ? LatLng(_lat!, _lng!) : null;

  /// Khoảng cách tính ngay trên máy theo vị trí mới nhất (không chờ backend).
  int? get _liveDistance {
    final station = _stationPoint;
    final user = _userPoint;
    if (station == null || user == null) return null;
    return LocationService.distanceMeters(user.latitude, user.longitude, station.latitude, station.longitude)
        .round();
  }

  /// Bật theo dõi vị trí khi đang ở bước dẫn đường, tắt ở mọi bước khác.
  void _syncTracking() {
    if (!mounted) return;
    if (_phase == _Phase.locked && _stationPoint != null) {
      _positionSub ??= LocationService.positionStream().listen(_onPosition, onError: (_) {
        // Mất tín hiệu tạm thời: giữ vị trí cuối, du khách vẫn bấm cập nhật được.
      });
    } else {
      _positionSub?.cancel();
      _positionSub = null;
      _heading = null;
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
    // Vào trong bán kính: tự hỏi backend để mở câu hỏi (backend vẫn là nơi xác nhận).
    final distance = _liveDistance;
    final radius = _content?.station?.radiusMeters ?? 50;
    final now = DateTime.now();
    final cooledDown = _lastAutoCheck == null || now.difference(_lastAutoCheck!) > const Duration(seconds: 8);
    if (distance != null && distance <= radius && !_busy && cooledDown && _phase == _Phase.locked) {
      _lastAutoCheck = now;
      _locateAndOpen();
    }
  }

  Future<void> _openDirections() async {
    final station = _stationPoint;
    if (station == null) return;
    final uri = Uri.parse('https://www.google.com/maps/dir/?api=1'
        '&destination=${station.latitude},${station.longitude}&travelmode=walking');
    final ok = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!ok && mounted) _snack('Không mở được ứng dụng bản đồ.');
  }

  Future<void> _load() async {
    setState(() => _phase = _Phase.loading);
    try {
      final content = await _service.getTask(journeyId: widget.journeyId, taskId: widget.taskId);
      if (!mounted) return;
      setState(() {
        _content = content;
        _phase = _Phase.intro;
        _error = null;
      });
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
        _snack('Mã QR không khớp với trạm này. Hãy thử lại.');
      }
      setState(() {
        _content = content;
        _phase = content.isFinished ? _Phase.intro : (content.unlocked ? _Phase.quiz : _Phase.locked);
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
          hint: _task.station != null
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

  bool _isAnswered(TaskQuestion q) =>
      q.isText ? (_texts[q.id]?.text.trim().isNotEmpty ?? false) : _choices.containsKey(q.id);

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
    await _locateAndOpen();
  }

  Future<void> _showClue() async {
    setState(() => _busy = true);
    try {
      final clue = await _service.getClue(journeyId: widget.journeyId, taskId: widget.taskId);
      if (!mounted) return;
      await showModalBottomSheet<void>(
        context: context,
        backgroundColor: Colors.white,
        shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(28))),
        builder: (ctx) => SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(24, 24, 24, 20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(children: [
                  Icon(Icons.lightbulb_rounded, color: AppCultureColors.gold),
                  SizedBox(width: 8),
                  Text('Manh mối', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900)),
                ]),
                const SizedBox(height: 12),
                Text(clue.clue,
                    style: const TextStyle(fontSize: 14.5, height: 1.5, color: AppCultureColors.textDark)),
                const SizedBox(height: 18),
                PrimaryButton(label: 'Đã rõ', onPressed: () => Navigator.pop(ctx)),
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
        appBar: AppBar(
          backgroundColor: Colors.white,
          elevation: 0,
          scrolledUnderElevation: 0,
          centerTitle: true,
          iconTheme: const IconThemeData(color: AppCultureColors.textDark),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18),
            onPressed: () => Navigator.of(context).pop(_changed),
          ),
          title: Column(
            children: [
              Text(_content?.name ?? widget.fallbackName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                      fontSize: 16, fontWeight: FontWeight.w800, color: AppCultureColors.textDark)),
              Text(widget.destinationName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 11.5, color: AppCultureColors.textMuted)),
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
        return const Center(child: CircularProgressIndicator(color: AppCultureColors.heritageJade));
      case _Phase.error:
        return Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              const Icon(Icons.error_outline_rounded, size: 46, color: AppCultureColors.warning),
              const SizedBox(height: 12),
              Text(_error ?? 'Không tải được nhiệm vụ.', textAlign: TextAlign.center),
              const SizedBox(height: 16),
              OutlinedButton(onPressed: _load, child: const Text('Thử lại')),
            ]),
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

  Widget _buildIntro() {
    final task = _task;
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [AppCultureColors.jadeGradientStart, AppCultureColors.jadeGradientEnd],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(26),
            boxShadow: [
              BoxShadow(
                color: AppCultureColors.heritageJade.withValues(alpha: 0.28),
                blurRadius: 18,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.2),
                  shape: BoxShape.circle,
                ),
                child: Icon(task.requiresLocation ? Icons.explore_rounded : Icons.quiz_rounded,
                    color: Colors.white, size: 30),
              ),
              const SizedBox(height: 14),
              Text(task.name,
                  style: const TextStyle(
                      color: Colors.white, fontSize: 22, fontWeight: FontWeight.w900, height: 1.2)),
              if (task.description.isNotEmpty) ...[
                const SizedBox(height: 10),
                Text(task.description,
                    style: const TextStyle(color: Colors.white, fontSize: 14, height: 1.5)),
              ],
            ],
          ),
        ),
        const SizedBox(height: 14),
        Row(children: [
          Expanded(child: _stat(Icons.help_outline_rounded, '${task.totalQuestions}', 'câu hỏi')),
          const SizedBox(width: 10),
          Expanded(child: _stat(Icons.stars_rounded, '+${task.pointsReward}', 'điểm thưởng')),
          const SizedBox(width: 10),
          Expanded(
              child: _stat(Icons.replay_rounded, '${task.attemptsRemaining}/${task.maxAttempts}', 'lượt còn lại')),
        ]),
        const SizedBox(height: 14),
        SoftCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Thể lệ',
                  style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14.5)),
              const SizedBox(height: 10),
              _rule(Icons.check_circle_outline_rounded,
                  'Trả lời đúng tất cả câu hỏi để nhận trọn điểm thưởng (chỉ một lần).'),
              if (task.requiresLocation) ...[
                _rule(Icons.place_outlined,
                    'Mỗi câu hỏi gắn với một địa điểm. Bạn cần đứng trong bán kính của trạm để mở câu hỏi.'),
                _rule(Icons.refresh_rounded, 'Trả lời sai một câu, bạn sẽ phải làm lại từ câu đầu.'),
              ] else
                _rule(Icons.refresh_rounded,
                    'Chưa đúng hết, bạn có thể làm lại nếu còn lượt (tối đa ${task.maxAttempts} lượt).'),
            ],
          ),
        ),
        const SizedBox(height: 20),
        if (task.isCompleted)
          _banner(Icons.verified_rounded, 'Bạn đã hoàn thành nhiệm vụ này.', AppCultureColors.jadeLight,
              AppCultureColors.jadeDark)
        else if (task.isFailed)
          _banner(Icons.block_rounded, 'Bạn đã hết lượt làm nhiệm vụ này.', const Color(0xFFFEE2E2),
              AppCultureColors.error)
        else ...[
          PrimaryButton(
            label: task.attempts > 0 ? 'Làm lại nhiệm vụ' : 'Bắt đầu nhiệm vụ',
            icon: Icons.play_arrow_rounded,
            loading: _busy,
            onPressed: _start,
          ),
          if (task.requiresLocation)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Center(
                child: TextButton.icon(
                  onPressed: _busy ? null : _showClue,
                  icon: const Icon(Icons.lightbulb_outline_rounded, size: 18),
                  label: const Text('Xem manh mối'),
                ),
              ),
            ),
        ],
      ],
    );
  }

  Widget _stat(IconData icon, String value, String label) {
    return SoftCard(
      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 8),
      child: Column(children: [
        Icon(icon, color: AppCultureColors.heritageJade, size: 22),
        const SizedBox(height: 6),
        Text(value, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w900)),
        Text(label, style: const TextStyle(fontSize: 11, color: AppCultureColors.textMuted)),
      ]),
    );
  }

  Widget _rule(IconData icon, String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Icon(icon, size: 18, color: AppCultureColors.heritageJade),
        const SizedBox(width: 10),
        Expanded(
          child: Text(text,
              style: const TextStyle(fontSize: 13, height: 1.45, color: AppCultureColors.textMuted)),
        ),
      ]),
    );
  }

  Widget _banner(IconData icon, String text, Color background, Color foreground) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: background, borderRadius: BorderRadius.circular(16)),
      child: Row(children: [
        Icon(icon, color: foreground),
        const SizedBox(width: 10),
        Expanded(
            child: Text(text, style: TextStyle(color: foreground, fontWeight: FontWeight.w700))),
      ]),
    );
  }

  // ── Dẫn đường tới trạm (nhiệm vụ cần vị trí) ───────────────────────────────

  Widget _buildLocked() {
    final task = _task;
    final station = task.station;
    // Ưu tiên khoảng cách tính trên máy theo vị trí mới nhất; chưa có thì dùng số backend trả về.
    final distance = _liveDistance ?? task.distanceMeters;
    final radius = station?.radiusMeters ?? 50;
    final stationPoint = _stationPoint;
    final userPoint = _userPoint;
    final bearing = (stationPoint != null && userPoint != null) ? bearingBetween(userPoint, stationPoint) : null;
    // 0 = còn rất xa, 1 = đã trong bán kính.
    final closeness = distance == null ? 0.0 : (radius / (distance <= 0 ? 1 : distance)).clamp(0.0, 1.0);

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        if (task.totalQuestions > 0)
          SoftCard(
            padding: const EdgeInsets.all(14),
            child: Row(children: [
              InfoChip(
                icon: Icons.flag_rounded,
                text: 'Câu ${task.questionIndex + 1}/${task.totalQuestions}',
                background: AppCultureColors.oceanLight,
                foreground: AppCultureColors.oceanDark,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(6),
                  child: LinearProgressIndicator(
                    value: task.totalQuestions == 0 ? 0 : task.questionIndex / task.totalQuestions,
                    minHeight: 8,
                    backgroundColor: AppCultureColors.surfaceSubtle,
                    color: AppCultureColors.heritageJade,
                  ),
                ),
              ),
            ]),
          ),
        const SizedBox(height: 14),
        if (stationPoint != null) ...[
          StationMap(
            station: stationPoint,
            stationName: station?.name ?? 'Trạm kế tiếp',
            radiusMeters: radius,
            user: userPoint,
            heading: _heading,
          ),
          const SizedBox(height: 14),
        ],
        SoftCard(
          elevated: true,
          padding: const EdgeInsets.all(22),
          child: Column(children: [
            if (stationPoint == null) ...[
              Container(
                width: 84,
                height: 84,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppCultureColors.oceanLight,
                ),
                child: const Icon(Icons.near_me_rounded, size: 40, color: AppCultureColors.oceanBlue),
              ),
              const SizedBox(height: 14),
            ],
            const Text('Hãy đến trạm tiếp theo',
                style: TextStyle(fontSize: 13, color: AppCultureColors.textMuted)),
            const SizedBox(height: 4),
            Text(station?.name ?? 'Địa điểm kế tiếp',
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900, height: 1.25)),
            const SizedBox(height: 18),
            if (distance != null) ...[
              Text(distance >= 1000 ? '${(distance / 1000).toStringAsFixed(1)} km' : '$distance m',
                  style: const TextStyle(
                      fontSize: 34, fontWeight: FontWeight.w900, color: AppCultureColors.oceanDark)),
              const Text('còn cách bạn',
                  style: TextStyle(fontSize: 12, color: AppCultureColors.textMuted)),
              if (bearing != null) ...[
                const SizedBox(height: 10),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Transform.rotate(
                      // Mũi tên chỉ hướng tới trạm; khi đang đi thì tính so với hướng đang đi.
                      angle: ((bearing - (_heading ?? 0)) * 3.141592653589793 / 180),
                      child: const Icon(Icons.navigation_rounded, color: AppCultureColors.oceanBlue, size: 22),
                    ),
                    const SizedBox(width: 6),
                    Flexible(
                      child: Text(
                        _heading != null
                            ? '${turnHint(_heading!, bearing)} · hướng ${compassLabel(bearing)}'
                            : 'Đi về hướng ${compassLabel(bearing)}',
                        style: const TextStyle(
                            fontSize: 14, fontWeight: FontWeight.w700, color: AppCultureColors.oceanDark),
                      ),
                    ),
                  ],
                ),
              ],
              const SizedBox(height: 14),
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: LinearProgressIndicator(
                  value: closeness,
                  minHeight: 10,
                  backgroundColor: AppCultureColors.surfaceSubtle,
                  color: AppCultureColors.heritageJade,
                ),
              ),
              const SizedBox(height: 8),
              Text('Cần ở trong bán kính $radius m để mở câu hỏi',
                  style: const TextStyle(fontSize: 12, color: AppCultureColors.textMuted)),
            ] else
              const Text('Bật định vị để biết bạn còn cách trạm bao xa.',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 13, color: AppCultureColors.textMuted)),
            if (_locationMessage != null) ...[
              const SizedBox(height: 14),
              _banner(Icons.location_off_rounded, _locationMessage!, const Color(0xFFFEF3C7),
                  AppCultureColors.rewardText),
              if (_locationNeedsSettings)
                TextButton(
                    onPressed: LocationService.openSettings, child: const Text('Mở cài đặt vị trí')),
            ],
          ]),
        ),
        const SizedBox(height: 18),
        PrimaryButton(
          label: 'Cập nhật vị trí của tôi',
          icon: Icons.my_location_rounded,
          loading: _busy,
          onPressed: _locateAndOpen,
        ),
        if (stationPoint != null) ...[
          const SizedBox(height: 10),
          OutlinedButton.icon(
            onPressed: _openDirections,
            icon: const Icon(Icons.directions_walk_rounded),
            label: const Text('Chỉ đường bằng Google Maps', style: TextStyle(fontWeight: FontWeight.w800)),
            style: OutlinedButton.styleFrom(
              minimumSize: const Size.fromHeight(52),
              foregroundColor: AppCultureColors.oceanDark,
              side: const BorderSide(color: AppCultureColors.oceanBlue),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            ),
          ),
        ],
        const SizedBox(height: 10),
        OutlinedButton.icon(
          onPressed: _busy ? null : _scanQr,
          icon: const Icon(Icons.qr_code_scanner_rounded),
          label: const Text('Quét QR tại trạm', style: TextStyle(fontWeight: FontWeight.w800)),
          style: OutlinedButton.styleFrom(
            minimumSize: const Size.fromHeight(52),
            foregroundColor: AppCultureColors.jadeDark,
            side: const BorderSide(color: AppCultureColors.heritageJade),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          ),
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
          child: Text('Nhiệm vụ này chưa có câu hỏi.', style: TextStyle(color: AppCultureColors.textMuted)),
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
          child: Column(children: [
            Row(children: [
              Text('Câu $shownNumber / $shownTotal',
                  style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13.5)),
              const Spacer(),
              InfoChip(
                icon: Icons.stars_rounded,
                text: '+${task.pointsReward} điểm',
                background: AppCultureColors.rewardBg,
                foreground: AppCultureColors.rewardText,
              ),
            ]),
            const SizedBox(height: 10),
            Row(children: [
              for (var i = 0; i < shownTotal; i++)
                Expanded(
                  child: Container(
                    height: 6,
                    margin: EdgeInsets.only(right: i == shownTotal - 1 ? 0 : 5),
                    decoration: BoxDecoration(
                      color: i < shownNumber
                          ? AppCultureColors.heritageJade
                          : AppCultureColors.surfaceSubtle,
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                ),
            ]),
          ]),
        ),
        Expanded(
          child: AnimatedSwitcher(
            duration: const Duration(milliseconds: 220),
            transitionBuilder: (child, anim) => FadeTransition(
              opacity: anim,
              child: SlideTransition(
                position: Tween(begin: const Offset(0.06, 0), end: Offset.zero).animate(anim),
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
                    child: Row(children: [
                      const Icon(Icons.place_rounded, size: 16, color: AppCultureColors.heritageJade),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text('Tại: ${task.station!.name}',
                            style: const TextStyle(
                                fontSize: 12.5,
                                fontWeight: FontWeight.w700,
                                color: AppCultureColors.jadeDark)),
                      ),
                    ]),
                  ),
                SoftCard(
                  padding: const EdgeInsets.all(20),
                  child: Text(question.content,
                      style: const TextStyle(
                          fontSize: 18,
                          height: 1.4,
                          fontWeight: FontWeight.w800,
                          color: AppCultureColors.textDark)),
                ),
                const SizedBox(height: 14),
                if (question.isText) _buildTextAnswer(question) else ..._buildOptions(question),
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
            child: Row(children: [
              if (!task.sequential && index > 0) ...[
                OutlinedButton(
                  onPressed: _busy ? null : () => setState(() => _index = index - 1),
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size(56, 52),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
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
                  icon: isLast || task.sequential ? Icons.send_rounded : Icons.arrow_forward_rounded,
                  loading: _busy,
                  onPressed: task.sequential
                      ? (_isAnswered(question) ? _submit : null)
                      : isLast
                          ? (answeredAll ? _submit : null)
                          : (_isAnswered(question) ? () => setState(() => _index = index + 1) : null),
                ),
              ),
            ]),
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
            onTap: _busy ? null : () => setState(() => _choices[question.id] = question.options[i].id),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 180),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: selected == question.options[i].id ? AppCultureColors.jadeLight : Colors.white,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(
                  color: selected == question.options[i].id
                      ? AppCultureColors.heritageJade
                      : AppCultureColors.border,
                  width: selected == question.options[i].id ? 2 : 1,
                ),
              ),
              child: Row(children: [
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
                        ? const Icon(Icons.check_rounded, color: Colors.white, size: 19)
                        : Text(i < letters.length ? letters[i] : '${i + 1}',
                            style: const TextStyle(
                                fontWeight: FontWeight.w800, color: AppCultureColors.textMuted)),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(question.options[i].content,
                      style: const TextStyle(
                          fontSize: 15, height: 1.35, color: AppCultureColors.textDark)),
                ),
              ]),
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
          borderSide: const BorderSide(color: AppCultureColors.heritageJade, width: 2),
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
      body = 'Bạn đã trả lời đúng ${result.questionIndex}/${result.totalQuestions} câu. '
          'Hãy đến địa điểm kế tiếp để mở câu hỏi tiếp theo.';
    } else {
      icon = Icons.sentiment_dissatisfied_rounded;
      tone = AppCultureColors.error;
      title = 'Chưa chính xác';
      body = result.exhausted
          ? 'Bạn đã hết lượt làm nhiệm vụ này.'
          : 'Bạn đúng ${result.correctCount}/${result.totalQuestions} câu. '
              'Cần đúng tất cả để nhận điểm. Còn ${result.attemptsRemaining} lượt làm lại.';
    }

    final earned = result.pointsEarned > 0 ? result.pointsEarned : task.pointsReward;

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
              decoration: BoxDecoration(shape: BoxShape.circle, color: tone.withValues(alpha: 0.12)),
              child: Icon(icon, size: 64, color: tone),
            ),
          ),
        ),
        const SizedBox(height: 22),
        Text(title,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w900)),
        const SizedBox(height: 10),
        Text(body,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 14.5, height: 1.5, color: AppCultureColors.textMuted)),
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
        if (stepCorrect)
          PrimaryButton(
            label: 'Đến địa điểm kế tiếp',
            icon: Icons.near_me_rounded,
            loading: _busy,
            onPressed: _continueNextStation,
          )
        else if (!success && !result.exhausted)
          PrimaryButton(label: 'Làm lại', icon: Icons.replay_rounded, onPressed: _retry),
        const SizedBox(height: 10),
        OutlinedButton(
          onPressed: () => Navigator.of(context).pop(_changed),
          style: OutlinedButton.styleFrom(
            minimumSize: const Size.fromHeight(52),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          ),
          child: const Text('Về hành trình'),
        ),
      ],
    );
  }
}
