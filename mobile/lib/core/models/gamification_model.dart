import '../../l10n/locale_controller.dart';
// Mô hình dữ liệu cho điểm thưởng & voucher (khớp response của /api/v1/gamification).

DateTime? _parseDate(dynamic value) {
  if (value == null) return null;
  return DateTime.tryParse(value.toString())?.toLocal();
}

int _asInt(dynamic value) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  return int.tryParse(value?.toString() ?? '') ?? 0;
}

double _asDouble(dynamic value) {
  if (value is num) return value.toDouble();
  return double.tryParse(value?.toString() ?? '') ?? 0;
}

/// Định dạng ngày dd/MM/yyyy (không dùng thư viện intl).
String formatDate(DateTime? date) {
  if (date == null) return '';
  final d = date.day.toString().padLeft(2, '0');
  final m = date.month.toString().padLeft(2, '0');
  return '$d/$m/${date.year}';
}

/// Định dạng ngày giờ dd/MM/yyyy HH:mm.
String formatDateTime(DateTime? date) {
  if (date == null) return '';
  final h = date.hour.toString().padLeft(2, '0');
  final min = date.minute.toString().padLeft(2, '0');
  return '${formatDate(date)} $h:$min';
}

/// Định dạng số nguyên có dấu chấm ngăn cách hàng nghìn: 50000 -> 50.000
String formatThousands(num value) {
  final negative = value < 0;
  final digits = value.abs().round().toString();
  final buffer = StringBuffer();
  for (var i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 == 0) buffer.write('.');
    buffer.write(digits[i]);
  }
  return negative ? '-$buffer' : buffer.toString();
}

class UserPointModel {
  final int currentBalance;
  final int lifetimeEarned;
  final int lifetimeSpent;

  const UserPointModel({
    required this.currentBalance,
    required this.lifetimeEarned,
    required this.lifetimeSpent,
  });

  factory UserPointModel.fromJson(Map<String, dynamic> json) => UserPointModel(
        currentBalance: _asInt(json['currentBalance']),
        lifetimeEarned: _asInt(json['lifetimeEarned']),
        lifetimeSpent: _asInt(json['lifetimeSpent']),
      );
}

/// Nhãn tiếng Việt cho loại huy hiệu (BadgeType ở backend).
String badgeTypeLabel(String type) {
  switch (type) {
    case 'DESTINATION_CHECKIN':
      return appL10n.badgeTypeCheckin;
    case 'TOUR_COMPLETION':
      return appL10n.badgeTypeTour;
    case 'TASK_MASTER':
      return appL10n.badgeTypeTask;
    case 'STREAK':
      return appL10n.badgeTypeStreak;
    case 'SPECIAL_EVENT':
      return appL10n.badgeTypeEvent;
    default:
      return appL10n.badgeTypeOther;
  }
}

/// Huy hiệu trong danh mục toàn hệ thống (GET /gamification/badges).
class BadgeModel {
  final int id;
  final String name;
  final String description;
  final String iconUrl;
  final String badgeType;
  final int bonusPoints;

  const BadgeModel({
    required this.id,
    required this.name,
    required this.description,
    required this.iconUrl,
    required this.badgeType,
    required this.bonusPoints,
  });

  factory BadgeModel.fromJson(Map<String, dynamic> json) => BadgeModel(
        id: _asInt(json['id']),
        name: json['name']?.toString() ?? '',
        description: json['description']?.toString() ?? '',
        iconUrl: json['iconUrl']?.toString() ?? '',
        badgeType: json['badgeType']?.toString() ?? '',
        bonusPoints: _asInt(json['bonusPoints']),
      );
}

/// Huy hiệu đã nhận (GET /gamification/badges/my).
class UserBadgeModel {
  final int id;
  final String name;
  final String description;
  final String iconUrl;
  final String badgeType;
  final DateTime? earnedAt;

  const UserBadgeModel({
    required this.id,
    required this.name,
    required this.description,
    required this.iconUrl,
    required this.badgeType,
    required this.earnedAt,
  });

  factory UserBadgeModel.fromJson(Map<String, dynamic> json) => UserBadgeModel(
        id: _asInt(json['badgeId']),
        name: json['badgeName']?.toString() ?? '',
        description: json['badgeDescription']?.toString() ?? '',
        iconUrl: json['badgeIconUrl']?.toString() ?? '',
        badgeType: json['badgeType']?.toString() ?? '',
        earnedAt: _parseDate(json['earnedAt']),
      );
}

class PointTransactionModel {
  final int id;
  final int amount;
  final String type;
  final String description;
  final int balanceAfter;
  final DateTime? createdAt;

  const PointTransactionModel({
    required this.id,
    required this.amount,
    required this.type,
    required this.description,
    required this.balanceAfter,
    this.createdAt,
  });

  bool get isEarning => amount >= 0;

  factory PointTransactionModel.fromJson(Map<String, dynamic> json) =>
      PointTransactionModel(
        id: _asInt(json['id']),
        amount: _asInt(json['amount']),
        type: json['transactionType']?.toString() ?? '',
        description: json['description']?.toString() ?? '',
        balanceAfter: _asInt(json['balanceAfter']),
        createdAt: _parseDate(json['createdAt']),
      );

  /// Nhãn tiếng Việt cho loại giao dịch.
  String get typeLabel {
    switch (type) {
      case 'EARNED_CHECKIN':
        return appL10n.badgeTypeCheckin;
      case 'EARNED_TASK':
        return appL10n.ptxTask;
      case 'EARNED_EXPERIENCE':
        return appL10n.ptxExperience;
      case 'EARNED_TOUR':
        return appL10n.badgeTypeTour;
      case 'EARNED_ACHIEVEMENT':
        return appL10n.ptxAchievement;
      case 'REDEEM_VOUCHER':
        return appL10n.wRedeem;
      case 'ADMIN_ADJUST':
        return appL10n.ptxAdmin;
      case 'REFUND_EXPIRED_VOUCHER':
        return appL10n.ptxVoucherRefund;
      default:
        return appL10n.ptxOther;
    }
  }
}

class VoucherModel {
  final int id;
  final String code;
  final String title;
  final String description;
  final String discountType; // PERCENTAGE | FIXED_AMOUNT
  final double discountValue;
  final double? minOrderAmount;
  final double? maxDiscountAmount;
  final int pointsRequired;
  final int remainingQuantity;
  final int validDays;
  final DateTime? startDate;
  final DateTime? endDate;

  const VoucherModel({
    required this.id,
    required this.code,
    required this.title,
    required this.description,
    required this.discountType,
    required this.discountValue,
    this.minOrderAmount,
    this.maxDiscountAmount,
    required this.pointsRequired,
    required this.remainingQuantity,
    required this.validDays,
    this.startDate,
    this.endDate,
  });

  factory VoucherModel.fromJson(Map<String, dynamic> json) => VoucherModel(
        id: _asInt(json['id']),
        code: json['code']?.toString() ?? '',
        title: json['title']?.toString() ?? '',
        description: json['description']?.toString() ?? '',
        discountType: json['discountType']?.toString() ?? 'FIXED_AMOUNT',
        discountValue: _asDouble(json['discountValue']),
        minOrderAmount: json['minOrderAmount'] == null
            ? null
            : _asDouble(json['minOrderAmount']),
        maxDiscountAmount: json['maxDiscountAmount'] == null
            ? null
            : _asDouble(json['maxDiscountAmount']),
        pointsRequired: _asInt(json['pointsRequired']),
        remainingQuantity: _asInt(json['remainingQuantity']),
        validDays: _asInt(json['validDays']),
        startDate: _parseDate(json['startDate']),
        endDate: _parseDate(json['endDate']),
      );

  bool get isOutOfStock => remainingQuantity <= 0;
  bool get isExpired => endDate != null && endDate!.isBefore(DateTime.now());
  bool get notStarted => startDate != null && startDate!.isAfter(DateTime.now());

  /// Nhãn giảm giá ngắn: "-10%" hoặc "-50.000đ".
  String get discountLabel => discountType == 'PERCENTAGE'
      ? '-${discountValue.toStringAsFixed(discountValue % 1 == 0 ? 0 : 1)}%'
      : '-${appL10n.priceVnd(formatThousands(discountValue))}';

  /// Lý do không đổi được (null nếu đổi được về mặt voucher).
  String? get unavailableReason {
    if (isOutOfStock) return appL10n.voucherOutOfStock;
    if (isExpired) return appL10n.statusExpired;
    if (notStarted) return appL10n.voucherNotStarted;
    return null;
  }
}

class UserVoucherModel {
  final int id;
  final String voucherTitle;
  final String voucherCode;
  final String userVoucherCode;
  final int pointsSpent;
  final String status; // AVAILABLE | USED | EXPIRED
  final DateTime? redeemedAt;
  final DateTime? expiryDate;
  final DateTime? usedAt;

  const UserVoucherModel({
    required this.id,
    required this.voucherTitle,
    required this.voucherCode,
    required this.userVoucherCode,
    required this.pointsSpent,
    required this.status,
    this.redeemedAt,
    this.expiryDate,
    this.usedAt,
  });

  factory UserVoucherModel.fromJson(Map<String, dynamic> json) =>
      UserVoucherModel(
        id: _asInt(json['id']),
        voucherTitle: json['voucherTitle']?.toString() ?? '',
        voucherCode: json['voucherCode']?.toString() ?? '',
        userVoucherCode: json['userVoucherCode']?.toString() ?? '',
        pointsSpent: _asInt(json['pointsSpent']),
        status: json['status']?.toString() ?? 'AVAILABLE',
        redeemedAt: _parseDate(json['redeemedAt']),
        expiryDate: _parseDate(json['expiryDate']),
        usedAt: _parseDate(json['usedAt']),
      );

  /// Hết hạn theo giờ máy dù server chưa đánh dấu EXPIRED.
  bool get isExpired =>
      status == 'EXPIRED' ||
      (status == 'AVAILABLE' &&
          expiryDate != null &&
          expiryDate!.isBefore(DateTime.now()));

  bool get isUsable => status == 'AVAILABLE' && !isExpired;
  bool get isUsed => status == 'USED';
}

/// Thành tựu cá nhân của du khách (GET /api/v1/tourist/achievements).
class TouristAchievementModel {
  final int id;
  final String code;
  final String name;
  final String description;
  final String category; // TOUR | CHECKIN | CULTURE_QUIZ | EXPERIENCE | STREAK_LOYALTY
  final String tier; // BRONZE | SILVER | GOLD | LEGENDARY
  final int targetValue;
  final int currentProgress;
  final String status; // LOCKED | CLAIMABLE | CLAIMED
  final int pointsReward;
  final String? badgeName;
  final String? badgeIcon;
  final int? badgeId;
  final DateTime? achievedAt;
  final DateTime? claimedAt;

  const TouristAchievementModel({
    required this.id,
    required this.code,
    required this.name,
    required this.description,
    required this.category,
    required this.tier,
    required this.targetValue,
    required this.currentProgress,
    required this.status,
    required this.pointsReward,
    this.badgeName,
    this.badgeIcon,
    this.badgeId,
    this.achievedAt,
    this.claimedAt,
  });

  bool get isClaimable => status == 'CLAIMABLE';
  bool get isClaimed => status == 'CLAIMED';
  bool get isLocked => status == 'LOCKED';
  bool get isAchieved => isClaimable || isClaimed;

  int get safeTarget => targetValue > 0 ? targetValue : 1;
  int get displayProgress =>
      isLocked ? currentProgress.clamp(0, safeTarget) : safeTarget;
  double get progressRatio => (displayProgress / safeTarget).clamp(0.0, 1.0);
  int get progressPercent => (progressRatio * 100).round().clamp(0, 100);

  TouristAchievementModel copyWith({
    String? status,
    DateTime? claimedAt,
  }) {
    return TouristAchievementModel(
      id: id,
      code: code,
      name: name,
      description: description,
      category: category,
      tier: tier,
      targetValue: targetValue,
      currentProgress: currentProgress,
      status: status ?? this.status,
      pointsReward: pointsReward,
      badgeName: badgeName,
      badgeIcon: badgeIcon,
      badgeId: badgeId,
      achievedAt: achievedAt,
      claimedAt: claimedAt ?? this.claimedAt,
    );
  }

  factory TouristAchievementModel.fromJson(Map<String, dynamic> json) {
    final badgeName = json['badgeName']?.toString();
    final badgeIcon = json['badgeIcon']?.toString();
    return TouristAchievementModel(
      id: _asInt(json['id']),
      code: json['code']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      description: json['description']?.toString() ?? '',
      category: json['category']?.toString() ?? 'TOUR',
      tier: json['tier']?.toString() ?? 'BRONZE',
      targetValue: _asInt(json['targetValue']),
      currentProgress: _asInt(json['currentProgress']),
      status: json['status']?.toString() ?? 'LOCKED',
      pointsReward: _asInt(json['pointsReward']),
      badgeName: (badgeName != null && badgeName.isNotEmpty) ? badgeName : null,
      badgeIcon: (badgeIcon != null && badgeIcon.isNotEmpty) ? badgeIcon : null,
      badgeId: json['badgeId'] == null ? null : _asInt(json['badgeId']),
      achievedAt: _parseDate(json['achievedAt']),
      claimedAt: _parseDate(json['claimedAt']),
    );
  }
}

/// Thống kê tổng quan thành tựu (GET /api/v1/tourist/achievements/summary).
class AchievementSummaryModel {
  final int totalAchieved;
  final int unclaimedCount;
  final int totalClaimed;
  final int totalPointsEarned;

  const AchievementSummaryModel({
    required this.totalAchieved,
    required this.unclaimedCount,
    required this.totalClaimed,
    required this.totalPointsEarned,
  });

  AchievementSummaryModel copyWith({
    int? totalAchieved,
    int? unclaimedCount,
    int? totalClaimed,
    int? totalPointsEarned,
  }) {
    return AchievementSummaryModel(
      totalAchieved: totalAchieved ?? this.totalAchieved,
      unclaimedCount: unclaimedCount ?? this.unclaimedCount,
      totalClaimed: totalClaimed ?? this.totalClaimed,
      totalPointsEarned: totalPointsEarned ?? this.totalPointsEarned,
    );
  }

  factory AchievementSummaryModel.fromJson(Map<String, dynamic> json) =>
      AchievementSummaryModel(
        totalAchieved: _asInt(json['totalAchieved']),
        unclaimedCount: _asInt(json['unclaimedCount']),
        totalClaimed: _asInt(json['totalClaimed']),
        totalPointsEarned: _asInt(json['totalPointsEarned']),
      );
}

/// Kết quả khi bấm nhận thưởng thành tựu (POST /api/v1/tourist/achievements/{id}/claim).
class ClaimAchievementResultModel {
  final int achievementId;
  final String achievementCode;
  final String achievementName;
  final String status;
  final int pointsAwarded;
  final int newPointBalance;
  final String? badgeName;
  final String? badgeIcon;
  final int? badgeId;
  final DateTime? claimedAt;

  const ClaimAchievementResultModel({
    required this.achievementId,
    required this.achievementCode,
    required this.achievementName,
    required this.status,
    required this.pointsAwarded,
    required this.newPointBalance,
    this.badgeName,
    this.badgeIcon,
    this.badgeId,
    this.claimedAt,
  });

  factory ClaimAchievementResultModel.fromJson(Map<String, dynamic> json) {
    final badgeName = json['badgeName']?.toString();
    final badgeIcon = json['badgeIcon']?.toString();
    return ClaimAchievementResultModel(
      achievementId: _asInt(json['achievementId']),
      achievementCode: json['achievementCode']?.toString() ?? '',
      achievementName: json['achievementName']?.toString() ?? '',
      status: json['status']?.toString() ?? 'CLAIMED',
      pointsAwarded: _asInt(json['pointsAwarded']),
      newPointBalance: _asInt(json['newPointBalance']),
      badgeName: (badgeName != null && badgeName.isNotEmpty) ? badgeName : null,
      badgeIcon: (badgeIcon != null && badgeIcon.isNotEmpty) ? badgeIcon : null,
      badgeId: json['badgeId'] == null ? null : _asInt(json['badgeId']),
      claimedAt: _parseDate(json['claimedAt']),
    );
  }
}
