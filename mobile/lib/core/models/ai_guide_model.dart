DateTime? _parseDateTime(dynamic v) {
  if (v == null) return null;
  return DateTime.tryParse(v.toString())?.toLocal();
}

int _asInt(dynamic v, [int fallback = 0]) {
  if (v is num) return v.toInt();
  return int.tryParse(v?.toString() ?? '') ?? fallback;
}

int? _asIntOrNull(dynamic v) => v == null ? null : _asInt(v);

class AiChatSessionModel {
  final String id;
  final int userId;
  final int? currentDestinationId;
  final String? lastMessagePreview;
  final int messageCount;
  final String handoffStatus;
  final DateTime? handoffRequestedAt;
  final String? handoffReason;
  final int? assignedStaffId;
  final String? assignedStaffName;
  final String? assignedStaffRole;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  const AiChatSessionModel({
    required this.id,
    required this.userId,
    this.currentDestinationId,
    this.lastMessagePreview,
    this.messageCount = 0,
    this.handoffStatus = 'AI_ACTIVE',
    this.handoffRequestedAt,
    this.handoffReason,
    this.assignedStaffId,
    this.assignedStaffName,
    this.assignedStaffRole,
    this.createdAt,
    this.updatedAt,
  });

  bool get isWaitingHuman => handoffStatus.toUpperCase() == 'WAITING_HUMAN';
  bool get isHumanActive => handoffStatus.toUpperCase() == 'HUMAN_ACTIVE';
  bool get isLiveQueue => isWaitingHuman || isHumanActive;

  AiChatSessionModel copyWith({
    String? id,
    int? userId,
    int? currentDestinationId,
    String? lastMessagePreview,
    int? messageCount,
    String? handoffStatus,
    DateTime? handoffRequestedAt,
    String? handoffReason,
    int? assignedStaffId,
    String? assignedStaffName,
    String? assignedStaffRole,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) =>
      AiChatSessionModel(
        id: id ?? this.id,
        userId: userId ?? this.userId,
        currentDestinationId: currentDestinationId ?? this.currentDestinationId,
        lastMessagePreview: lastMessagePreview ?? this.lastMessagePreview,
        messageCount: messageCount ?? this.messageCount,
        handoffStatus: handoffStatus ?? this.handoffStatus,
        handoffRequestedAt: handoffRequestedAt ?? this.handoffRequestedAt,
        handoffReason: handoffReason ?? this.handoffReason,
        assignedStaffId: assignedStaffId ?? this.assignedStaffId,
        assignedStaffName: assignedStaffName ?? this.assignedStaffName,
        assignedStaffRole: assignedStaffRole ?? this.assignedStaffRole,
        createdAt: createdAt ?? this.createdAt,
        updatedAt: updatedAt ?? this.updatedAt,
      );

  factory AiChatSessionModel.fromJson(Map<String, dynamic> j) => AiChatSessionModel(
        id: (j['id'] ?? '').toString(),
        userId: _asInt(j['userId']),
        currentDestinationId: _asIntOrNull(j['currentDestinationId']),
        lastMessagePreview: j['lastMessagePreview']?.toString(),
        messageCount: _asInt(j['messageCount']),
        handoffStatus: (j['handoffStatus'] ?? 'AI_ACTIVE').toString(),
        handoffRequestedAt: _parseDateTime(j['handoffRequestedAt']),
        handoffReason: j['handoffReason']?.toString(),
        assignedStaffId: _asIntOrNull(j['assignedStaffId']),
        assignedStaffName: j['assignedStaffName']?.toString(),
        assignedStaffRole: j['assignedStaffRole']?.toString(),
        createdAt: _parseDateTime(j['createdAt']),
        updatedAt: _parseDateTime(j['updatedAt']),
      );
}

class AiChatMessageModel {
  final String id;
  final String sessionId;
  final String role;
  final String content;
  final int? senderId;
  final String? senderName;
  final String? senderRole;
  final DateTime? createdAt;
  final List<String> citations;
  final String? mode;

  const AiChatMessageModel({
    required this.id,
    required this.sessionId,
    required this.role,
    required this.content,
    this.senderId,
    this.senderName,
    this.senderRole,
    this.createdAt,
    this.citations = const [],
    this.mode,
  });

  bool get isUser => role.toUpperCase() == 'USER';
  bool get isSystem => role.toUpperCase() == 'SYSTEM';
  bool get isHumanAgent {
    final upperRole = role.toUpperCase();
    final upperSenderRole = (senderRole ?? '').toUpperCase();
    return upperRole == 'HUMAN_AGENT' ||
        upperSenderRole == 'ADMIN' ||
        upperSenderRole == 'CONTENT_MODERATOR';
  }

  bool get isAdminSender => (senderRole ?? '').toUpperCase() == 'ADMIN';

  factory AiChatMessageModel.fromJson(Map<String, dynamic> j) => AiChatMessageModel(
        id: (j['id'] ?? '').toString(),
        sessionId: (j['sessionId'] ?? '').toString(),
        role: (j['role'] ?? 'ASSISTANT').toString(),
        content: (j['content'] ?? '').toString(),
        senderId: _asIntOrNull(j['senderId']),
        senderName: j['senderName']?.toString(),
        senderRole: j['senderRole']?.toString(),
        createdAt: _parseDateTime(j['createdAt']),
        citations: (j['citations'] is List)
            ? (j['citations'] as List).map((e) => e.toString()).toList()
            : const [],
        mode: j['mode']?.toString(),
      );
}

class AiChatReplyModel {
  final String sessionId;
  final String messageId;
  final String answer;
  final String mode;
  final String handoffStatus;
  final List<String> citations;
  final DateTime? createdAt;

  const AiChatReplyModel({
    required this.sessionId,
    required this.messageId,
    required this.answer,
    required this.mode,
    this.handoffStatus = 'AI_ACTIVE',
    this.citations = const [],
    this.createdAt,
  });

  factory AiChatReplyModel.fromJson(Map<String, dynamic> j) => AiChatReplyModel(
        sessionId: (j['sessionId'] ?? '').toString(),
        messageId: (j['messageId'] ?? '').toString(),
        answer: (j['answer'] ?? '').toString(),
        mode: (j['mode'] ?? 'NORMAL_GUIDE').toString(),
        handoffStatus: (j['handoffStatus'] ?? 'AI_ACTIVE').toString(),
        citations: (j['citations'] is List)
            ? (j['citations'] as List).map((e) => e.toString()).toList()
            : const [],
        createdAt: _parseDateTime(j['createdAt']),
      );
}
