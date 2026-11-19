import '../constants/api_constants.dart';
import '../models/ai_guide_model.dart';
import 'api_client.dart';

class AiGuideService {
  static const Duration _chatTimeout = Duration(seconds: 35);

  Future<AiChatSessionModel> getOrCreateSession({
    int? destinationId,
    bool forceNew = false,
  }) async {
    final params = <String>[];
    if (destinationId != null) params.add('destinationId=$destinationId');
    if (forceNew) params.add('forceNew=true');
    final qs = params.isEmpty ? '' : '?${params.join('&')}';

    final data = await ApiClient.request(
      'POST',
      '${ApiConstants.aiGuideEndpoint}/sessions$qs',
      body: const {},
    );
    return AiChatSessionModel.fromJson(Map<String, dynamic>.from(data as Map));
  }

  Future<List<AiChatSessionModel>> getSessions({int page = 0, int size = 20}) async {
    final data = await ApiClient.request(
      'GET',
      '${ApiConstants.aiGuideEndpoint}/sessions?page=$page&size=$size',
    );
    if (data is Map && data['content'] is List) {
      return (data['content'] as List)
          .whereType<Map>()
          .map((e) => AiChatSessionModel.fromJson(Map<String, dynamic>.from(e)))
          .toList();
    }
    if (data is List) {
      return data
          .whereType<Map>()
          .map((e) => AiChatSessionModel.fromJson(Map<String, dynamic>.from(e)))
          .toList();
    }
    return const [];
  }

  Future<List<AiChatMessageModel>> getMessages(String sessionId) async {
    final data = await ApiClient.request(
      'GET',
      '${ApiConstants.aiGuideEndpoint}/sessions/$sessionId/messages',
    );
    if (data is List) {
      return data
          .whereType<Map>()
          .map((e) => AiChatMessageModel.fromJson(Map<String, dynamic>.from(e)))
          .toList();
    }
    return const [];
  }

  Future<void> deleteSession(String sessionId) async {
    await ApiClient.request(
      'DELETE',
      '${ApiConstants.aiGuideEndpoint}/sessions/$sessionId',
    );
  }

  Future<AiChatReplyModel> sendMessage({
    String? sessionId,
    int? destinationId,
    int? taskId,
    required String question,
  }) async {
    final body = <String, dynamic>{
      'question': question.trim(),
      if (sessionId != null && sessionId.isNotEmpty) 'sessionId': sessionId,
      'destinationId': ?destinationId,
      'taskId': ?taskId,
    };

    final data = await ApiClient.request(
      'POST',
      '${ApiConstants.aiGuideEndpoint}/chat',
      body: body,
      timeout: _chatTimeout,
    );
    return AiChatReplyModel.fromJson(Map<String, dynamic>.from(data as Map));
  }
}
