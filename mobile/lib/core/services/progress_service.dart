import '../constants/api_constants.dart';
import '../models/booking_model.dart' show BookingModel;
import '../models/gamification_model.dart'
    show
        BadgeModel,
        PointTransactionModel,
        UserPointModel,
        badgeTypeLabel,
        formatDate,
        formatDateTime,
        formatThousands;
import '../models/journey_model.dart';
import '../models/tour_journey_model.dart';
import 'booking_service.dart';
import 'gamification_service.dart';
import 'journey_service.dart';
import 'mock_payment_store.dart';

/// Tiến độ của du khách lấy từ backend: điểm, huy hiệu, nhật ký check-in, nhiệm vụ, vé.
/// Mọi hàm ném lỗi gốc (ApiException / GamificationException) để giao diện báo đúng thay vì
/// hiện số liệu giả.
class ProgressService {
  static final ProgressService _instance = ProgressService._internal();
  factory ProgressService() => _instance;
  ProgressService._internal();

  final GamificationService _gamification = GamificationService();
  final JourneyService _journeys = JourneyService();
  final BookingService _bookings = BookingService();

  Future<int> getPoints() async => (await _gamification.getMyPoints()).currentBalance;

  /// Số dư khả dụng, tổng đã tích lũy và đã tiêu.
  Future<UserPointModel> getPointSummary() => _gamification.getMyPoints();

  /// Các giao dịch điểm gần nhất (mới nhất trước).
  Future<List<PointTransactionModel>> getRecentPointHistory({int size = 5}) =>
      _gamification.getPointHistory(page: 0, size: size);

  /// Danh mục mọi huy hiệu đang mở, để hiện cả huy hiệu chưa đạt.
  Future<List<BadgeModel>> getBadgeCatalog() => _gamification.getAllBadges();

  Future<List<BadgeItem>> getBadges() async {
    final badges = await _gamification.getMyBadges();
    return badges
        .map((b) => BadgeItem(
              id: b.id.toString(),
              name: b.name,
              imageUrl: b.iconUrl,
              earnedAt: formatDate(b.earnedAt),
              category: badgeTypeLabel(b.badgeType),
              description: b.description,
            ))
        .toList();
  }

  Future<List<TourJourney>> getJourneys() => _journeys.getMine();

  /// Hành trình đang đi (ưu tiên mới nhất), hoặc null nếu chưa có.
  Future<TourJourney?> getActiveJourney() async {
    final list = await _journeys.getMine();
    final active = list.where((j) => j.status == ProgressStatus.inProgress).toList();
    if (active.isEmpty) return null;
    return _journeys.getById(active.first.id); // bản đầy đủ có điểm đến và nhiệm vụ
  }

  /// Nhật ký hành trình: các điểm đã check-in, mới nhất trước.
  Future<List<JourneyTimelineItem>> getTimeline() async {
    final journeys = await _journeys.getMine();
    final items = <({DateTime at, JourneyTimelineItem item})>[];
    for (final journey in journeys) {
      for (final d in journey.destinations.where((d) => d.checkedIn)) {
        final points = d.tasks.fold<int>(0, (s, t) => s + t.pointsEarned);
        items.add((
          at: d.checkedInAt ?? DateTime.fromMillisecondsSinceEpoch(0),
          item: JourneyTimelineItem(
            id: '${journey.id}-${d.destinationId}',
            siteName: d.name,
            location: journey.tourName,
            checkinDate: d.checkedInAt == null ? '' : formatDateTime(d.checkedInAt),
            rewardPoints: points > 0 ? '+${formatThousands(points)} điểm' : 'Đã check-in',
          ),
        ));
      }
    }
    items.sort((a, b) => b.at.compareTo(a.at));
    return items.map((e) => e.item).toList();
  }

  /// Nhiệm vụ cần làm: các nhiệm vụ chưa xong ở những điểm đã check-in của hành trình đang đi.
  Future<List<JourneyMission>> getMissions() async {
    final journey = await getActiveJourney();
    return journey == null ? const [] : missionsOf(journey);
  }

  /// Nhiệm vụ cần làm của một hành trình đã tải sẵn (tránh gọi API lần nữa).
  static List<JourneyMission> missionsOf(TourJourney journey) {
    return [
      for (final d in journey.destinations.where((d) => d.checkedIn && !d.isDone))
        for (final t in d.tasks.where((t) => t.isOpen))
          JourneyMission(
            journeyId: journey.id,
            taskId: t.taskId,
            title: t.name,
            siteName: d.name,
            isCompleted: false,
          ),
    ];
  }

  /// Booking đã thanh toán (vé), gồm cả đơn "thanh toán giả lập" khi bật cờ dev.
  Future<List<BookingModel>> getTickets() async {
    final bookings = await _bookings.getMine();
    final mockPaid = ApiConstants.mockPayment ? await MockPaymentStore.paidIds() : <int>{};
    return bookings.where((b) => b.isPaid || mockPaid.contains(b.id)).toList();
  }
}
