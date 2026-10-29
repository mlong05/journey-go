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
        return 'Check-in điểm đến';
      case 'EARNED_TASK':
        return 'Hoàn thành nhiệm vụ';
      case 'EARNED_EXPERIENCE':
        return 'Trải nghiệm';
      case 'EARNED_TOUR':
        return 'Hoàn thành tour';
      case 'REDEEM_VOUCHER':
        return 'Đổi voucher';
      case 'ADMIN_ADJUST':
        return 'Điều chỉnh bởi quản trị';
      case 'REFUND_EXPIRED_VOUCHER':
        return 'Hoàn điểm voucher hết hạn';
      default:
        return 'Giao dịch điểm';
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
      : '-${formatThousands(discountValue)}đ';

  /// Lý do không đổi được (null nếu đổi được về mặt voucher).
  String? get unavailableReason {
    if (isOutOfStock) return 'Đã hết lượt đổi';
    if (isExpired) return 'Đã hết hạn';
    if (notStarted) return 'Chưa mở đổi';
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
