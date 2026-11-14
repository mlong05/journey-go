/// Service chat với NHÀ TOUR — dùng TRƯỚC khi mua tour.
///
/// ── Contract ──
///  • POST /provider-chat/conversations  body: { tourId?, providerId? } → ProviderConversationModel
///  • GET  /provider-chat/conversations                    → ProviderConversationModel[]
///  • GET  /provider-chat/conversations/{id}/messages       → ProviderMessageModel[]
///  • POST /provider-chat/conversations/{id}/messages body: { body } → ProviderMessageModel
///
/// ── Vì sao tách khỏi chat trong booking? ──
///  Chat gắn với Booking chỉ dùng được SAU khi đặt tour. Yêu cầu mới: du khách
///  xem chi tiết tour (chưa mua) vẫn nhắn được cho nhà tour ⇒ hội thoại gom theo
///  cặp (du khách, nhà tour) nên lịch sử không bị vỡ khi khách hỏi nhiều tour
///  của cùng một nhà tour.
library;

import '../models/provider_chat_model.dart';
import 'api_client.dart';

class ProviderChatService {
  static final ProviderChatService _instance = ProviderChatService._internal();
  factory ProviderChatService() => _instance;
  ProviderChatService._internal();

  static const String _endpoint = '/provider-chat';

  /// Mở (hoặc lấy lại) cuộc trò chuyện với nhà tour của một tour.
  ///
  /// Mỗi cặp du khách – nhà tour chỉ có MỘT cuộc trò chuyện ⇒ gọi lại với tour
  /// khác của cùng nhà tour vẫn trả về đúng hội thoại cũ (giữ lịch sử).
  Future<ProviderConversationModel> startConversation({
    int? tourId,
    int? providerId,
  }) async {
    final data = await ApiClient.request(
      'POST',
      '$_endpoint/conversations',
      body: {
        'tourId': ?tourId,
        'providerId': ?providerId,
      },
    );
    return ProviderConversationModel.fromJson(data as Map<String, dynamic>);
  }

  /// Danh sách cuộc trò chuyện của du khách — mục "Hỗ trợ từ nhà tour".
  Future<List<ProviderConversationModel>> getConversations() async {
    final data = await ApiClient.request('GET', '$_endpoint/conversations');
    return ApiClient.asList(data)
        .map(ProviderConversationModel.fromJson)
        .toList();
  }

  /// Tin nhắn của một cuộc trò chuyện (cũ nhất trước).
  Future<List<ProviderMessageModel>> getMessages(int conversationId) async {
    final data = await ApiClient.request(
      'GET',
      '$_endpoint/conversations/$conversationId/messages',
    );
    return ApiClient.asList(data)
        .map(ProviderMessageModel.fromJson)
        .toList();
  }

  /// Gửi tin nhắn.
  Future<ProviderMessageModel> sendMessage(int conversationId, String body) async {
    final data = await ApiClient.request(
      'POST',
      '$_endpoint/conversations/$conversationId/messages',
      body: {'body': body},
    );
    return ProviderMessageModel.fromJson(data as Map<String, dynamic>);
  }
}
