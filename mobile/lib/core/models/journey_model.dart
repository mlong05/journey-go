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

/// Hạng thành viên theo điểm tích lũy.
String rankTierFor(int points) {
  if (points >= 1000) return 'Bạch Kim';
  if (points >= 500) return 'Hạng Vàng';
  if (points >= 200) return 'Hạng Bạc';
  return 'Hạng Đồng';
}
