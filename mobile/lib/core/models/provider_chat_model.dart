/// Model cho chat với nhà tour (trước khi mua tour).
library;

int _asInt(dynamic value) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  return int.tryParse(value?.toString() ?? '') ?? 0;
}

String? _text(dynamic value) {
  final s = value?.toString().trim() ?? '';
  return s.isEmpty ? null : s;
}

DateTime? _date(dynamic value) =>
    value == null ? null : DateTime.tryParse(value.toString());

/// Một cuộc trò chuyện giữa du khách và một nhà tour.
class ProviderConversationModel {
  final int id;
  final int touristId;
  final String? touristName;
  final int providerId;
  final String? providerName;
  final int? tourId;
  final String? tourTitle;
  final String? subject;
  final String? lastMessage;
  final DateTime? lastMessageAt;
  final int unreadCount;
  final DateTime? createdAt;

  const ProviderConversationModel({
    required this.id,
    required this.touristId,
    this.touristName,
    required this.providerId,
    this.providerName,
    this.tourId,
    this.tourTitle,
    this.subject,
    this.lastMessage,
    this.lastMessageAt,
    this.unreadCount = 0,
    this.createdAt,
  });

  factory ProviderConversationModel.fromJson(Map<String, dynamic> json) =>
      ProviderConversationModel(
        id: _asInt(json['id']),
        touristId: _asInt(json['touristId']),
        touristName: _text(json['touristName']),
        providerId: _asInt(json['providerId']),
        providerName: _text(json['providerName']),
        tourId: json['tourId'] == null ? null : _asInt(json['tourId']),
        tourTitle: _text(json['tourTitle']),
        subject: _text(json['subject']),
        lastMessage: _text(json['lastMessage']),
        lastMessageAt: _date(json['lastMessageAt']),
        unreadCount: _asInt(json['unreadCount']),
        createdAt: _date(json['createdAt']),
      );

  /// Tên hiển thị của đối tác trong hội thoại.
  String get counterpartName =>
      (providerName != null && providerName!.isNotEmpty)
          ? providerName!
          : (tourTitle ?? 'Nhà tour');

  /// Thời điểm sắp xếp — tin nhắn mới nhất lên đầu.
  DateTime? get sortAt => lastMessageAt ?? createdAt;

  /// Nhãn thời gian rút gọn: "12/11", "10:30" hoặc "Hôm qua".
  String get timeLabel {
    final at = sortAt;
    if (at == null) return '';
    final now = DateTime.now();
    final sameDay =
        at.year == now.year && at.month == now.month && at.day == now.day;
    if (sameDay) {
      return '${at.hour.toString().padLeft(2, '0')}:${at.minute.toString().padLeft(2, '0')}';
    }
    final yesterday = now.subtract(const Duration(days: 1));
    if (at.year == yesterday.year &&
        at.month == yesterday.month &&
        at.day == yesterday.day) {
      return 'Hôm qua';
    }
    return '${at.day.toString().padLeft(2, '0')}/${at.month.toString().padLeft(2, '0')}';
  }
}

/// Một tin nhắn trong cuộc trò chuyện với nhà tour.
class ProviderMessageModel {
  final int id;
  final int conversationId;
  final int senderId;
  final String body;
  final DateTime? createdAt;
  final bool read;

  const ProviderMessageModel({
    required this.id,
    required this.conversationId,
    required this.senderId,
    required this.body,
    this.createdAt,
    this.read = false,
  });

  factory ProviderMessageModel.fromJson(Map<String, dynamic> json) =>
      ProviderMessageModel(
        id: _asInt(json['id']),
        conversationId: _asInt(json['conversationId']),
        senderId: _asInt(json['senderId']),
        body: json['body']?.toString() ?? '',
        createdAt: _date(json['createdAt']),
        read: json['read'] == true,
      );

  /// Nhãn giờ gửi "10:30".
  String get timeLabel {
    final at = createdAt;
    if (at == null) return '';
    return '${at.hour.toString().padLeft(2, '0')}:${at.minute.toString().padLeft(2, '0')}';
  }
}
