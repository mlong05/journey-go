/// Kết nối WebSocket/STOMP cho chat & thông báo tức thời (mobile).
///
/// ── Backend ──
///  • Endpoint: `ws(s)://<host>/ws`
///  • Xác thực: header `Authorization: Bearer <token>` trong frame STOMP CONNECT.
///  • Kênh nhận:
///      `/user/queue/messages`     → tin nhắn chat mới
///      `/user/queue/notifications` → thông báo mới
///
/// ── Vì sao không dùng SSE cho chat? ──
/// SSE chỉ một chiều (server → client). Chat cần gửi tin nhắn lên server và nhận
/// phản hồi tức thì ⇒ WebSocket/STOMP.
library;

import 'dart:async';
import 'dart:convert';

import 'package:stomp_dart_client/stomp_dart_client.dart';

import 'token_storage.dart';

/// Loại sự kiện — tin nhắn chat tới từ bên kia.
const String kRealtimeTypeChatMessage = 'CHAT_MESSAGE';

/// Loại sự kiện — thông báo mới.
const String kRealtimeTypeNotification = 'NOTIFICATION';

/// Chuyển URL REST của API thành URL WebSocket (http → ws, https → wss).
String websocketUrl(String baseUrl) {
  final base = baseUrl.trim().replaceFirst(RegExp(r'/api/v1/?$'), '');
  if (base.startsWith('https://')) {
    return '${base.replaceFirst('https://', 'wss://')}/ws';
  }
  return '${base.replaceFirst(RegExp(r'^http://'), 'ws://')}/ws';
}

/// Một sự kiện tức thời đã parse.
class RealtimeEvent {
  final String type;
  final Map<String, dynamic> data;

  const RealtimeEvent(this.type, this.data);

  /// Phạm vi chat: `PROVIDER_CHAT` hoặc `BOOKING_CHAT`.
  String? get scope => data['scope'] as String?;

  /// ID hội thoại (chat với nhà tour).
  int? get conversationId => _asInt(data['conversationId']);

  /// ID booking (chat hỗ trợ trong booking).
  int? get bookingId => _asInt(data['bookingId']);

  int? get senderId => _asInt(data['senderId']);

  String? get body => data['body'] as String?;

  Map<String, dynamic>? get message {
    final raw = data['message'];
    return raw is Map<String, dynamic> ? raw : null;
  }

  static int? _asInt(dynamic v) {
    if (v is int) return v;
    if (v is num) return v.toInt();
    return int.tryParse('${v ?? ''}');
  }
}

/// Kết nối STOMP dùng chung cho toàn app.
///
/// Một thể hiện cho cả app: kết nối khi có phiên đăng nhập, ngắt khi đăng xuất.
/// Các màn chat chỉ cần lắng nghe [events].
class RealtimeService {
  RealtimeService._();

  static final RealtimeService instance = RealtimeService._();

  StompClient? _client;
  bool _connecting = false;

  final _events = StreamController<RealtimeEvent>.broadcast();
  final _states = StreamController<String>.broadcast();

  /// Sự kiện tức thời (tin nhắn chat + thông báo).
  Stream<RealtimeEvent> get events => _events.stream;

  /// Trạng thái kết nối: CONNECTING | CONNECTED | DISCONNECTED.
  Stream<String> get states => _states.stream;

  bool get isConnected => _client?.connected ?? false;

  /// Mở kết nối (idempotent). Tự kết nối lại khi rớt mạng.
  Future<void> connect() async {
    if (_connecting || isConnected) return;
    _connecting = true;
    try {
      final token = await TokenStorage.getAccessToken();
      if (token == null || token.isEmpty) {
        _connecting = false;
        return;
      }
      final baseUrl = await TokenStorage.getBaseUrl();
      final url = websocketUrl(baseUrl);

      final client = StompClient(
        config: StompConfig(
          url: url,
          // Token nằm trong frame STOMP CONNECT (header `Authorization`).
          stompConnectHeaders: {'Authorization': 'Bearer $token'},
          reconnectDelay: const Duration(seconds: 2),
          heartbeatIncoming: const Duration(seconds: 10),
          heartbeatOutgoing: const Duration(seconds: 10),
          onConnect: _onConnect,
          onStompError: _onError,
          onWebSocketError: _onError,
          onDisconnect: _onDisconnect,
          onWebSocketDone: () => _emitState('DISCONNECTED'),
        ),
      );
      _client = client;
      client.activate();
      _emitState('CONNECTING');
    } catch (_) {
      _emitState('DISCONNECTED');
    } finally {
      _connecting = false;
    }
  }

  void _onConnect(StompFrame frame) {
    _emitState('CONNECTED');
    _client?.subscribe(
      destination: '/user/queue/messages',
      callback: _dispatch,
    );
    _client?.subscribe(
      destination: '/user/queue/notifications',
      callback: _dispatch,
    );
  }

  void _onError(dynamic frame) {
    _emitState('DISCONNECTED');
  }

  void _onDisconnect(StompFrame frame) {
    _emitState('DISCONNECTED');
  }

  void _dispatch(StompFrame frame) {
    dynamic json;
    try {
      json = jsonDecode(frame.body ?? '{}');
    } catch (_) {
      return;
    }
    if (json is! Map<String, dynamic>) return;
    final type = json['type']?.toString() ?? '';
    _events.add(RealtimeEvent(type, json));
  }

  void _emitState(String state) {
    if (!_states.isClosed) _states.add(state);
  }

  /// Ngắt kết nối (đăng xuất hoặc rời app).
  Future<void> disconnect() async {
    try {
      _client?.deactivate();
    } catch (_) {
      // đã ngắt
    }
    _client = null;
    _emitState('DISCONNECTED');
  }
}
