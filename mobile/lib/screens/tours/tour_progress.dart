import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/models/tour_journey_model.dart';
import '../../core/services/progress_service.dart';

/// Du khách đã đi tour này tới đâu: đang trải nghiệm dở, hoặc đã hoàn thành.
class TourProgress {
  final TourJourney journey;

  const TourProgress(this.journey);

  bool get inProgress => journey.status == ProgressStatus.inProgress;

  int get total => journey.totalDestinations;

  /// Số điểm đã xong; danh sách hành trình có thể không kèm điểm đến nên dựa vào thứ tự điểm đang mở.
  int get done => journey.destinations.isNotEmpty
      ? journey.doneCount
      : (journey.currentOrder - 1).clamp(0, total);

  double get fraction => total == 0 ? 0 : done / total;

  String get label {
    if (inProgress) return 'Đang trải nghiệm · $done/$total điểm';
    final at = journey.completedAt;
    return at == null
        ? 'Đã hoàn thành'
        : 'Đã hoàn thành · ${at.day.toString().padLeft(2, '0')}/${at.month.toString().padLeft(2, '0')}';
  }

  /// Trạng thái theo từng tour: hành trình đang đi được ưu tiên, sau đó là lần hoàn thành gần nhất.
  static Map<int, TourProgress> byTour(List<TourJourney> journeys) {
    final result = <int, TourProgress>{};
    for (final j in journeys) {
      final active = j.status == ProgressStatus.inProgress;
      if (!active && !j.isCompleted) continue;
      final existing = result[j.tourId];
      if (existing == null ||
          (active && !existing.inProgress) ||
          (!active &&
              !existing.inProgress &&
              (j.completedAt ?? DateTime(0)).isAfter(existing.journey.completedAt ?? DateTime(0)))) {
        result[j.tourId] = TourProgress(j);
      }
    }
    return result;
  }

  /// Tải trạng thái các tour của du khách; lỗi (chưa đăng nhập, mất mạng) thì coi như chưa đi tour nào.
  static Future<Map<int, TourProgress>> load() async {
    try {
      return byTour(await ProgressService().getJourneys());
    } catch (_) {
      return const {};
    }
  }
}

/// Nhãn trạng thái tour: xanh ngọc khi đã hoàn thành, xanh biển kèm thanh tiến độ khi đang đi.
class TourProgressBadge extends StatelessWidget {
  final TourProgress progress;

  const TourProgressBadge({super.key, required this.progress});

  @override
  Widget build(BuildContext context) {
    final active = progress.inProgress;
    final color = active ? AppCultureColors.oceanDark : AppCultureColors.jadeDark;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(12, 9, 12, 9),
      decoration: BoxDecoration(
        color: active ? AppCultureColors.oceanLight : AppCultureColors.jadeLight,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(active ? Icons.explore_rounded : Icons.check_circle_rounded, size: 17, color: color),
              const SizedBox(width: 7),
              Expanded(
                child: Text(
                  progress.label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: color),
                ),
              ),
            ],
          ),
          if (active) ...[
            const SizedBox(height: 7),
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: TweenAnimationBuilder<double>(
                tween: Tween(begin: 0, end: progress.fraction),
                duration: const Duration(milliseconds: 700),
                curve: Curves.easeOutCubic,
                builder: (_, v, _) => LinearProgressIndicator(
                  value: v,
                  minHeight: 5,
                  backgroundColor: Colors.white,
                  valueColor: const AlwaysStoppedAnimation(AppCultureColors.oceanBlue),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
