import 'dart:async';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart' show Position;
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/constants/app_colors.dart';
import '../../core/models/tour_detail_model.dart';
import '../../core/models/tour_journey_model.dart';
import '../../core/services/api_client.dart';
import '../../core/services/journey_service.dart';
import '../../core/services/location_service.dart';
import '../chat/ai_guide_chat_screen.dart';
import '../common/ink.dart';
import 'map_kit.dart' show distanceMeters, formatDistance;
import 'stop_checkpoints_map.dart';
import 'task_screen.dart';
import '../../l10n/locale_controller.dart';

/// Phần "Trải nghiệm" của một trạm, mở sau khi check-in: các thử thách (câu đố, hoạt động thực địa) tại điểm.
///
/// Trả về `true` khi có thử thách thay đổi trạng thái, để màn hành trình tải lại.
class StopExperienceScreen extends StatefulWidget {
  final int journeyId;
  final JourneyDestination destination;
  final TourStopModel? stop;

  const StopExperienceScreen({super.key, required this.journeyId, required this.destination, this.stop});

  static Future<bool?> open(BuildContext context, StopExperienceScreen screen) =>
      Navigator.of(context).push<bool>(MaterialPageRoute(builder: (_) => screen));

  @override
  State<StopExperienceScreen> createState() => _StopExperienceScreenState();
}

class _StopExperienceScreenState extends State<StopExperienceScreen> {
  late JourneyDestination _dest = widget.destination;
  bool _changed = false;

  /// Bản đồ checkpoint của trạm (null khi chưa tải xong / lỗi — tab vẫn dùng được bình thường).
  StopCheckpoints? _checkpoints;
  LatLng? _user;
  StreamSubscription<Position>? _positionSub;

  @override
  void initState() {
    super.initState();
    _loadCheckpoints();
    _startLocation();
  }

  @override
  void dispose() {
    _positionSub?.cancel();
    super.dispose();
  }

  Future<void> _loadCheckpoints() async {
    try {
      final data = await JourneyService().getCheckpoints(
        journeyId: widget.journeyId,
        destinationId: _dest.destinationId,
      );
      if (mounted) setState(() => _checkpoints = data);
    } catch (_) {
      // Không có bản đồ thì vẫn hiện danh sách thử thách như trước.
    }
  }

  /// Chỉ theo dõi vị trí khi du khách đã cấp quyền (không hỏi quyền ở màn này).
  Future<void> _startLocation() async {
    final first = await LocationService.positionIfPermitted();
    if (!mounted || first == null) return;
    setState(() => _user = LatLng(first.latitude, first.longitude));
    _positionSub = LocationService.positionStream().listen(
      (p) {
        if (mounted) setState(() => _user = LatLng(p.latitude, p.longitude));
      },
      onError: (_) {},
    );
  }

  StopCheckpoint? _checkpointOf(JourneyTask task) =>
      _checkpoints?.checkpoints.where((c) => c.taskId == task.taskId).firstOrNull;

  /// Khoảng cách tới checkpoint của hoạt động (null khi không có checkpoint hoặc chưa có vị trí).
  int? _distanceTo(StopCheckpoint c) {
    final user = _user;
    return user == null ? null : distanceMeters(user, LatLng(c.latitude, c.longitude));
  }

  /// "Bạn đang ở trong vùng" / "cách 120 m" cho hoạt động có checkpoint (cần vị trí du khách).
  String? _distanceLabel(JourneyTask task) {
    final c = _checkpointOf(task);
    final d = c == null ? null : _distanceTo(c);
    if (c == null || d == null) return null;
    return d <= c.radiusMeters ? appL10n.seInZone : appL10n.seDistance(formatDistance(d));
  }

  /// Hoạt động có checkpoint mà du khách đang ở ngoài vòng tròn ⇒ nút chính là "Chỉ đường".
  bool _outOfZone(JourneyTask task) {
    final c = _checkpointOf(task);
    final d = c == null ? null : _distanceTo(c);
    return c != null && d != null && d > c.radiusMeters;
  }

  /// Checkpoint còn mở gần nhất và khoảng cách tới nó (để hiện dải "Bạn đang cách … · Chỉ đường").
  (StopCheckpoint, int)? _nearestOpenCheckpoint() {
    final open = {for (final t in _dest.tasks) if (t.isOpen) t.taskId};
    (StopCheckpoint, int)? best;
    for (final c in _checkpoints?.checkpoints ?? const <StopCheckpoint>[]) {
      if (!open.contains(c.taskId)) continue;
      final d = _distanceTo(c);
      if (d == null) continue;
      if (best == null || d < best.$2) best = (c, d);
    }
    return best;
  }

  /// Mở Google Maps (hoặc app bản đồ mặc định) chỉ đường đi bộ tới checkpoint.
  Future<void> _directionsTo(StopCheckpoint c) async {
    final uri = Uri.parse(
      'https://www.google.com/maps/dir/?api=1&destination=${c.latitude},${c.longitude}&travelmode=walking',
    );
    final ok = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!ok && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(appL10n.jsNoRoute), behavior: SnackBarBehavior.floating),
      );
    }
  }

  void _openCheckpoint(StopCheckpoint c) {
    final task = _dest.tasks.where((t) => t.taskId == c.taskId).firstOrNull;
    if (task != null) _open(task);
  }

  Future<void> _refresh() async {
    try {
      final journey = await JourneyService().getById(widget.journeyId);
      final dest = journey.destinations.where((d) => d.destinationId == _dest.destinationId).firstOrNull;
      if (mounted && dest != null) setState(() => _dest = dest);
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message), behavior: SnackBarBehavior.floating));
      }
    }
  }

  Future<void> _open(JourneyTask task) async {
    final changed = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => TaskScreen(
          journeyId: widget.journeyId,
          taskId: task.taskId,
          fallbackName: task.name,
          destinationName: _dest.name,
          destinationId: _dest.destinationId,
        ),
      ),
    );
    if (changed == true) {
      _changed = true;
      await _refresh();
    }
  }

  /// Hoạt động thực địa cùng tên trong chi tiết tour (để lấy thời lượng, điểm tối đa).
  TourActivity? _activityOf(JourneyTask task) =>
      widget.stop?.activities.where((a) => a.name.trim() == task.name.trim()).firstOrNull;

  int? _maxPoints(JourneyTask task) {
    final stop = widget.stop;
    if (stop == null) return null;
    if (_isQuiz(task)) {
      final activityPoints = stop.activities.fold(0, (s, a) => s + a.points);
      final quiz = stop.maxPoints - activityPoints;
      return quiz > 0 ? quiz : null;
    }
    final points = _activityOf(task)?.points;
    return points != null && points > 0 ? points : null;
  }

  static bool _isQuiz(JourneyTask t) => t.type.toUpperCase().contains('QUIZ');
  static bool _isField(JourneyTask t) => t.type.toUpperCase().contains('REAL_WORLD');

  @override
  Widget build(BuildContext context) {
    final tasks = _dest.tasks;
    final done = tasks.where((t) => !t.isOpen).length;
    final points = tasks.fold(0, (s, t) => s + t.pointsEarned);
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) Navigator.of(context).pop(_changed);
      },
      child: Scaffold(
        backgroundColor: AppInk.paper,
        appBar: AppBar(
          backgroundColor: AppInk.paper,
          surfaceTintColor: Colors.transparent,
          foregroundColor: AppInk.ink,
          title: Text(context.l10n.jsExperienceTitle, style: AppType.display(size: 18)),
          actions: [
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: TextButton.icon(
                onPressed: () => AiGuideChatScreen.showSheet(
                  context,
                  destinationId: _dest.destinationId,
                  destinationName: _dest.name,
                ),
                icon: const Icon(Icons.auto_awesome_rounded, size: 17, color: AppCultureColors.heritageJade),
                label: Text(
                  context.l10n.aiAskButton,
                  style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: AppCultureColors.heritageJade),
                ),
              ),
            ),
          ],
        ),
        body: RefreshIndicator(
          color: AppInk.accent,
          onRefresh: _refresh,
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(20, 4, 20, 32),
            children: [
              Text(
                appL10n.seStopHeader(_dest.orderIndex.toString().padLeft(2, '0'), _dest.name.toUpperCase()),
                style: AppType.eyebrow(),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 6),
              Text(appL10n.seHeadline, style: AppType.display(size: 24)),
              const SizedBox(height: 16),
              _summary(done, tasks.length, points),
              if ((_checkpoints?.checkpoints.isNotEmpty ?? false)) ...[
                const SizedBox(height: 16),
                ?_farBanner(),
                StopCheckpointsMap(
                  data: _checkpoints!,
                  user: _user,
                  heading: null,
                  doneTaskIds: {for (final t in tasks) if (!t.isOpen) t.taskId},
                  onTapCheckpoint: _openCheckpoint,
                ),
                const SizedBox(height: 6),
                Text(
                  appL10n.seMapHint,
                  style: TextStyle(fontSize: 11.5, color: AppInk.muted, height: 1.4),
                ),
              ],
              const SizedBox(height: 24),
              if (tasks.isEmpty)
                Text(appL10n.seNoChallenges, style: const TextStyle(color: AppInk.muted))
              else
                for (var i = 0; i < tasks.length; i++) _challenge(tasks[i], i + 1),
            ],
          ),
        ),
      ),
    );
  }

  /// Dải nhắc khi du khách còn ở xa mọi hoạt động chưa làm: khoảng cách + nút "Chỉ đường".
  Widget? _farBanner() {
    final nearest = _nearestOpenCheckpoint();
    if (nearest == null) return null;
    final (c, d) = nearest;
    if (d <= c.radiusMeters) return null;
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.fromLTRB(14, 8, 8, 8),
      decoration: BoxDecoration(
        color: AppCultureColors.oceanLight,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        children: [
          const Icon(Icons.directions_walk_rounded, size: 20, color: AppCultureColors.oceanBlue),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              appL10n.seFarFromActivity(formatDistance(d)),
              style: const TextStyle(fontSize: 13, height: 1.35, fontWeight: FontWeight.w600, color: AppInk.ink),
            ),
          ),
          const SizedBox(width: 8),
          FilledButton.icon(
            onPressed: () => _directionsTo(c),
            style: FilledButton.styleFrom(
              backgroundColor: AppCultureColors.oceanBlue,
              foregroundColor: Colors.white,
              minimumSize: const Size(0, 36),
              padding: const EdgeInsets.symmetric(horizontal: 12),
              shape: const StadiumBorder(),
              textStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
            ),
            icon: const Icon(Icons.near_me_rounded, size: 16),
            label: Text(appL10n.seDirections),
          ),
        ],
      ),
    );
  }

  Widget _summary(int done, int total, int points) {
    final value = total == 0 ? 0.0 : done / total;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppInk.border),
      ),
      child: Row(
        children: [
          SizedBox(
            width: 56,
            height: 56,
            child: Stack(
              alignment: Alignment.center,
              children: [
                SizedBox.expand(
                  child: TweenAnimationBuilder<double>(
                    tween: Tween(begin: 0, end: value),
                    duration: const Duration(milliseconds: 600),
                    curve: Curves.easeOutCubic,
                    builder: (_, v, _) => CircularProgressIndicator(
                      value: v,
                      strokeWidth: 5,
                      strokeCap: StrokeCap.round,
                      backgroundColor: AppInk.line,
                      valueColor: const AlwaysStoppedAnimation(AppInk.accent),
                    ),
                  ),
                ),
                Text('$done/$total', style: AppType.display(size: 15)),
              ],
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  done == total && total > 0 ? appL10n.seAllDone : appL10n.seDone,
                  style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w700, color: AppInk.ink),
                ),
                const SizedBox(height: 2),
                Text(
                  appL10n.seAnyOrder,
                  style: TextStyle(fontSize: 12.5, height: 1.4, color: AppInk.muted),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Column(
            children: [
              Text('$points', style: AppType.display(size: 22, color: AppCultureColors.amberDark)),
              Text(appL10n.wPointsUnit, style: const TextStyle(fontSize: 11.5, color: AppInk.muted)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _challenge(JourneyTask task, int index) {
    final quiz = _isQuiz(task);
    final field = _isField(task);
    final activity = _activityOf(task);
    final max = _maxPoints(task);
    final (String status, Color tone, IconData statusIcon) = task.isPassed
        ? (appL10n.jsCompletedBadge, AppInk.accent, Icons.check_circle_rounded)
        : task.isCompleted
        ? (appL10n.sePartial, AppCultureColors.amberDark, Icons.timelapse_rounded)
        : task.isFailed
        ? (appL10n.seNoAttempts, AppCultureColors.error, Icons.cancel_outlined)
        // Câu đố trả lời từng câu đang làm dở ⇒ "2/3 câu" (tiến độ đã lưu, mở lại làm tiếp)
        : task.isQuizInProgress
        ? (appL10n.tkQuestionsProgress(task.questionIndex, task.totalQuestions!), AppInk.accent, Icons.timelapse_rounded)
        : task.attempts > 0 && task.attemptsRemaining != null
        ? (appL10n.seFailedLeft(task.attemptsRemaining!), AppCultureColors.amberDark, Icons.replay_rounded)
        : task.attempts > 0
        ? (appL10n.seAttempts(task.attempts), AppInk.ink, Icons.replay_rounded)
        : (appL10n.seNotStarted, AppInk.muted, Icons.radio_button_unchecked_rounded);
    final kind = quiz
        ? appL10n.seCulturalQuiz
        : field
        ? appL10n.seFieldActivity
        : (task.type.toUpperCase().contains('PUZZLE') || task.type.toUpperCase().contains('GPS'))
        ? appL10n.seLocationPuzzle
        : appL10n.seChallenge;
    final meta = <String>[
      if (quiz && (widget.stop?.quizCount ?? 0) > 0) appL10n.seQuestions(widget.stop!.quizCount),
      if (activity?.formattedDuration != null) activity!.formattedDuration!,
      if (field) appL10n.seScanQr,
      if (task.isOpen) ?_distanceLabel(task),
    ];

    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        child: InkWell(
          borderRadius: BorderRadius.circular(18),
          onTap: () => _open(task),
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: task.isOpen ? AppInk.border : tone.withValues(alpha: 0.35)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: quiz ? AppCultureColors.oceanLight : AppCultureColors.jadeLight,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(
                        quiz ? Icons.menu_book_outlined : field ? Icons.qr_code_scanner_rounded : Icons.place_outlined,
                        color: quiz ? AppCultureColors.oceanBlue : AppInk.accent,
                        size: 22,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            appL10n.seChallengeHeader(index.toString().padLeft(2, '0'), kind.toUpperCase()),
                            style: AppType.eyebrow(color: AppInk.muted),
                          ),
                          const SizedBox(height: 3),
                          Text(task.name, style: AppType.display(size: 16.5)),
                        ],
                      ),
                    ),
                  ],
                ),
                if (meta.isNotEmpty) ...[
                  const SizedBox(height: 10),
                  Text(meta.join('  ·  '), style: const TextStyle(fontSize: 12.5, color: AppInk.muted)),
                ],
                const SizedBox(height: 12),
                Container(height: 1, color: AppInk.line),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Icon(statusIcon, size: 18, color: tone),
                    const SizedBox(width: 6),
                    // Có nút (Bắt đầu / Chỉ đường) ⇒ trạng thái + điểm xếp hai dòng, co lại được — tránh tràn
                    // ngang ("Chưa đạt · còn 2 lượt" + "Tối đa +50 điểm" + nút không vừa một dòng trên máy hẹp).
                    if (task.isOpen)
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              status,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: tone),
                            ),
                            if (max != null)
                              Text(
                                appL10n.seMaxPoints(max),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  fontSize: 12.5,
                                  fontWeight: FontWeight.w700,
                                  color: AppCultureColors.amberDark,
                                ),
                              ),
                          ],
                        ),
                      )
                    else ...[
                      Expanded(
                        child: Text(
                          status,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: tone),
                        ),
                      ),
                      Text(
                        appL10n.seEarnedPoints(task.pointsEarned, max != null ? '/$max' : ''),
                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppCultureColors.amberDark),
                      ),
                    ],
                    if (task.isOpen && _outOfZone(task)) ...[
                      // Ở ngoài vòng tròn hoạt động: dẫn đường trước, chạm phần còn lại của thẻ vẫn mở hoạt động.
                      const SizedBox(width: 10),
                      Material(
                        color: AppCultureColors.oceanBlue,
                        shape: const StadiumBorder(),
                        child: InkWell(
                          customBorder: const StadiumBorder(),
                          onTap: () => _directionsTo(_checkpointOf(task)!),
                          child: Container(
                            height: 34,
                            padding: const EdgeInsets.symmetric(horizontal: 14),
                            alignment: Alignment.center,
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(Icons.near_me_rounded, size: 15, color: Colors.white),
                                const SizedBox(width: 5),
                                Text(
                                  appL10n.seDirections,
                                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Colors.white),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ] else if (task.isOpen) ...[
                      const SizedBox(width: 10),
                      Container(
                        height: 34,
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        alignment: Alignment.center,
                        decoration: const ShapeDecoration(color: AppInk.accent, shape: StadiumBorder()),
                        child: Text(
                          task.attempts > 0 ? appL10n.tkRetry : appL10n.tripsStart,
                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Colors.white),
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
