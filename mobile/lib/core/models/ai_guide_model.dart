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
  final DateTime? createdAt;
  final DateTime? updatedAt;

  const AiChatSessionModel({
    required this.id,
    required this.userId,
    this.currentDestinationId,
    this.lastMessagePreview,
    this.messageCount = 0,
    this.createdAt,
    this.updatedAt,
  });

  factory AiChatSessionModel.fromJson(Map<String, dynamic> j) => AiChatSessionModel(
        id: (j['id'] ?? '').toString(),
        userId: _asInt(j['userId']),
        currentDestinationId: _asIntOrNull(j['currentDestinationId']),
        lastMessagePreview: j['lastMessagePreview']?.toString(),
        messageCount: _asInt(j['messageCount']),
        createdAt: _parseDateTime(j['createdAt']),
        updatedAt: _parseDateTime(j['updatedAt']),
      );
}

class AiChatMessageModel {
  final String id;
  final String sessionId;
  final String role;
  final String content;
  final DateTime? createdAt;
  final List<String> citations;
  final String? mode;

  const AiChatMessageModel({
    required this.id,
    required this.sessionId,
    required this.role,
    required this.content,
    this.createdAt,
    this.citations = const [],
    this.mode,
  });

  bool get isUser => role.toUpperCase() == 'USER';

  factory AiChatMessageModel.fromJson(Map<String, dynamic> j) => AiChatMessageModel(
        id: (j['id'] ?? '').toString(),
        sessionId: (j['sessionId'] ?? '').toString(),
        role: (j['role'] ?? 'ASSISTANT').toString(),
        content: (j['content'] ?? '').toString(),
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
  final List<String> citations;
  final DateTime? createdAt;

  const AiChatReplyModel({
    required this.sessionId,
    required this.messageId,
    required this.answer,
    required this.mode,
    this.citations = const [],
    this.createdAt,
  });

  factory AiChatReplyModel.fromJson(Map<String, dynamic> j) => AiChatReplyModel(
        sessionId: (j['sessionId'] ?? '').toString(),
        messageId: (j['messageId'] ?? '').toString(),
        answer: (j['answer'] ?? '').toString(),
        mode: (j['mode'] ?? 'NORMAL_GUIDE').toString(),
        citations: (j['citations'] is List)
            ? (j['citations'] as List).map((e) => e.toString()).toList()
            : const [],
        createdAt: _parseDateTime(j['createdAt']),
      );
}
