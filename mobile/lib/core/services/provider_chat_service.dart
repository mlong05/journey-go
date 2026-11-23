/// Service chat với NHÀ TOUR — dùng TRƯỚC khi mua tour.
///
/// ── Contract ──
///  • POST /provider-chat/conversations  body: { tourId?, providerId? } → ProviderConversationModel
///  • GET  /provider-chat/conversations                    → ProviderConversationModel[]
///  • GET  /provider-chat/conversations/{id}/messages       → ProviderMessageModel[]
///  • GET  /provider-chat/conversations/{id}/messages/page
///         ?limit=10[&beforeId=<id>]                       → ChatMessagePage
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

  /// Trang tin nhắn MỚI NHẤT của một cuộc trò chuyện — phân trang kiểu
  /// "cuộn lên để load thêm".
  ///
  /// ⚠️ Luôn trả về `limit` tin MỚI NHẤT. Muốn xem lịch sử cũ hơn thì gọi lại
  /// với `beforeId` = `nextCursor` của lần trước.
  ///
  /// Trả về `(items, hasMore, nextCursor, totalCount)`:
  ///  • `items` — theo thứ tự thời gian TĂNG dần (tin cũ ở trên, tin mới ở dưới).
  ///  • `hasMore` — còn tin cũ hơn nữa không.
  ///  • `nextCursor` — id tin cũ nhất trong trang (null = hết dữ liệu).
  ///  • `totalCount` — tổng số tin nhắn của cuộc trò chuyện.
  Future<ChatMessagePage> getMessagesPage(
    int conversationId, {
    int limit = 10,
    int? beforeId,
  }) async {
    final query = <String, String>{
      'limit': '$limit',
      if (beforeId != null) 'beforeId': '$beforeId',
    };
    final qs = query.entries
        .map((e) => '${e.key}=${Uri.encodeQueryComponent(e.value)}')
        .join('&');
    final data = await ApiClient.request(
      'GET',
      '$_endpoint/conversations/$conversationId/messages/page?$qs',
    );
    final map = data is Map<String, dynamic> ? data : <String, dynamic>{};
    final rawItems = map['items'];
    final items = rawItems is List
        ? rawItems
            .whereType<Map>()
            .map((e) => ProviderMessageModel.fromJson(Map<String, dynamic>.from(e)))
            .toList()
        : <ProviderMessageModel>[];
    return ChatMessagePage(
      items: items,
      hasMore: map['hasMore'] == true,
      nextCursor: map['nextCursor'] is num ? (map['nextCursor'] as num).toInt() : null,
      totalCount: map['totalCount'] is num ? (map['totalCount'] as num).toInt() : items.length,
    );
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

/// Một trang tin nhắn (dùng cho phân trang "cuộn lên để load thêm").
class ChatMessagePage {
  const ChatMessagePage({
    required this.items,
    required this.hasMore,
    required this.nextCursor,
    required this.totalCount,
  });

  final List<ProviderMessageModel> items;
  final bool hasMore;
  final int? nextCursor;
  final int totalCount;
}
