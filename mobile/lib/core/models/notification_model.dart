// Thông báo trong ứng dụng (khớp NotificationResponse của /api/v1/notifications).

class AppNotification {
  final int id;
  final String type;

  /// Nhóm hiển thị: REVIEW, COMMUNITY, REFUND, FINANCE, APPROVED, REJECTED, BOOKING, REWARD.
  final String category;
  final String title;
  final String body;

  /// Đối tượng liên quan (BOOKING, REFUND, BADGE, POST...) để mở đúng màn khi bấm.
  final String? refType;
  final int? refId;
  final bool read;
  final DateTime? createdAt;

  const AppNotification({
    required this.id,
    required this.type,
    required this.category,
    required this.title,
    required this.body,
    required this.refType,
    required this.refId,
    required this.read,
    required this.createdAt,
  });

  factory AppNotification.fromJson(Map<String, dynamic> json) {
    int? asInt(dynamic v) => v is num ? v.toInt() : int.tryParse('${v ?? ''}');
    return AppNotification(
      id: asInt(json['id']) ?? 0,
      type: json['type']?.toString() ?? '',
      category: json['category']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      body: json['body']?.toString() ?? '',
      refType: json['refType']?.toString(),
      refId: asInt(json['refId']),
      read: json['read'] == true,
      createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? '')?.toLocal(),
    );
  }

  AppNotification copyWith({bool? read}) => AppNotification(
        id: id,
        type: type,
        category: category,
        title: title,
        body: body,
        refType: refType,
        refId: refId,
        read: read ?? this.read,
        createdAt: createdAt,
      );
}
