import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/models/tour_detail_model.dart';
import '../../core/models/tour_journey_model.dart';
import '../../core/services/api_client.dart';
import '../../core/services/journey_service.dart';
import '../common/ink.dart';
import 'task_screen.dart';

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
          title: Text('Trải nghiệm', style: AppType.display(size: 18)),
        ),
        body: RefreshIndicator(
          color: AppInk.accent,
          onRefresh: _refresh,
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(20, 4, 20, 32),
            children: [
              Text(
                'TRẠM ${_dest.orderIndex.toString().padLeft(2, '0')}  ·  ${_dest.name.toUpperCase()}',
                style: AppType.eyebrow(),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 6),
              Text('Tự tay khám phá di sản', style: AppType.display(size: 24)),
              const SizedBox(height: 16),
              _summary(done, tasks.length, points),
              const SizedBox(height: 24),
              if (tasks.isEmpty)
                const Text('Trạm này không có thử thách.', style: TextStyle(color: AppInk.muted))
              else
                for (var i = 0; i < tasks.length; i++) _challenge(tasks[i], i + 1),
            ],
          ),
        ),
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
                  done == total && total > 0 ? 'Đã hoàn thành mọi thử thách' : 'Thử thách đã làm',
                  style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w700, color: AppInk.ink),
                ),
                const SizedBox(height: 2),
                const Text(
                  'Làm theo thứ tự bất kỳ. Hoạt động thực địa cần quét mã QR tại điểm để xác nhận.',
                  style: TextStyle(fontSize: 12.5, height: 1.4, color: AppInk.muted),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Column(
            children: [
              Text('$points', style: AppType.display(size: 22, color: AppCultureColors.amberDark)),
              const Text('điểm', style: TextStyle(fontSize: 11.5, color: AppInk.muted)),
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
        ? ('Hoàn thành', AppInk.accent, Icons.check_circle_rounded)
        : task.isCompleted
        ? ('Đúng một phần', AppCultureColors.amberDark, Icons.timelapse_rounded)
        : task.isFailed
        ? ('Đã hết lượt', AppCultureColors.error, Icons.cancel_outlined)
        : task.attempts > 0
        ? ('Đã làm ${task.attempts} lượt', AppInk.ink, Icons.replay_rounded)
        : ('Chưa làm', AppInk.muted, Icons.radio_button_unchecked_rounded);
    final kind = quiz
        ? 'Câu đố văn hóa'
        : field
        ? 'Hoạt động thực địa'
        : (task.type.toUpperCase().contains('PUZZLE') || task.type.toUpperCase().contains('GPS'))
        ? 'Giải đố theo vị trí'
        : 'Thử thách';
    final meta = <String>[
      if (quiz && (widget.stop?.quizCount ?? 0) > 0) '${widget.stop!.quizCount} câu hỏi',
      if (activity?.formattedDuration != null) activity!.formattedDuration!,
      if (field) 'quét QR tại điểm',
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
                            'THỬ THÁCH ${index.toString().padLeft(2, '0')}  ·  ${kind.toUpperCase()}',
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
                    Text(status, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: tone)),
                    const Spacer(),
                    Text(
                      task.isOpen
                          ? (max != null ? 'Tối đa +$max điểm' : '')
                          : '+${task.pointsEarned}${max != null ? '/$max' : ''} điểm',
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppCultureColors.amberDark),
                    ),
                    if (task.isOpen) ...[
                      const SizedBox(width: 10),
                      Container(
                        height: 34,
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        alignment: Alignment.center,
                        decoration: const ShapeDecoration(color: AppInk.accent, shape: StadiumBorder()),
                        child: Text(
                          task.attempts > 0 ? 'Làm lại' : 'Bắt đầu',
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
