/// Mục trong nhật ký hành trình của hồ sơ, dựng từ các lần check-in thật (API /journeys).
class JourneyTimelineItem {
  final String id;
  final String siteName;
  final String location;
  final String checkinDate;
  final String rewardPoints;

  const JourneyTimelineItem({
    required this.id,
    required this.siteName,
    required this.location,
    required this.checkinDate,
    required this.rewardPoints,
  });
}

/// Huy hiệu di sản người dùng đã nhận (API /gamification/badges/my).
class BadgeItem {
  final String id;
  final String name;
  final String imageUrl; // URL ảnh huy hiệu; rỗng nếu không có
  final String earnedAt;
  final String category;
  final String description;

  const BadgeItem({
    required this.id,
    required this.name,
    required this.imageUrl,
    required this.earnedAt,
    required this.category,
    required this.description,
  });
}

const _rankTiers = [
  (minPoints: 1000, name: 'Bạch Kim'),
  (minPoints: 500, name: 'Hạng Vàng'),
  (minPoints: 200, name: 'Hạng Bạc'),
  (minPoints: 0, name: 'Hạng Đồng'),
];

/// Hạng thành viên theo điểm tích lũy (tổng điểm đã kiếm, không trừ điểm đã đổi voucher).
String rankTierFor(int points) => _rankTiers.firstWhere((t) => points >= t.minPoints).name;

/// Hạng kế tiếp và số điểm còn thiếu; null khi đã ở hạng cao nhất.
({String name, int remaining})? nextRankFor(int points) {
  final higher = _rankTiers.where((t) => t.minPoints > points).toList();
  if (higher.isEmpty) return null;
  final next = higher.last;
  return (name: next.name, remaining: next.minPoints - points);
}

/// Tiến độ (0..1) từ mốc hạng hiện tại tới mốc hạng kế tiếp; 1 khi đã ở hạng cao nhất.
double rankProgressFor(int points) {
  final current = _rankTiers.firstWhere((t) => points >= t.minPoints);
  final higher = _rankTiers.where((t) => t.minPoints > points).toList();
  if (higher.isEmpty) return 1;
  final next = higher.last;
  return (points - current.minPoints) / (next.minPoints - current.minPoints);
}
