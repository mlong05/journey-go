import 'dart:async';
import 'dart:convert';
import 'dart:math' as math;
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import '../models/notification_model.dart';
import 'api_client.dart';
import 'auth_service.dart';
import 'realtime_service.dart';
import 'token_storage.dart';

/// Thông báo của du khách: danh sách, số chưa đọc và luồng thời gian thực (SSE).
///
/// Một thể hiện dùng chung cho cả app. [start] khi vào màn chính, [stop] khi rời app / đăng xuất.
/// SSE chỉ chạy khi app đang mở; thông báo lúc app tắt vẫn được lưu và tải lại khi mở app.
class NotificationCenter extends ChangeNotifier {
  NotificationCenter._();

  static final NotificationCenter instance = NotificationCenter._();

  static const _pageSize = 15;

  List<AppNotification> _items = const [];
  int _unread = 0;
  bool _loading = false;
  bool _hasMore = false;
  bool _connected = false;
  int _page = 0;

  List<AppNotification> get items => _items;
  int get unread => _unread;
  bool get loading => _loading;
  bool get hasMore => _hasMore;
  bool get connected => _connected;

  final _incoming = StreamController<AppNotification>.broadcast();

  /// Thông báo vừa tới qua SSE (để hiện banner trong app).
  Stream<AppNotification> get incoming => _incoming.stream;

  bool _running = false;
  http.Client? _client;
  StreamSubscription<RealtimeEvent>? _realtimeSub;

  // ── Luồng thời gian thực ───────────────────────────────────────────────────

  void start() {
    if (_running) return;
    _running = true;
    refresh();
    _loop();
    _listenRealtime();
  }

  void stop() {
    _running = false;
    _client?.close();
    _client = null;
    _setConnected(false);
  }

  /// Thông báo tới qua WebSocket/STOMP ⇒ hiện ngay trong app (bổ sung cho luồng SSE).
  ///
  /// Thông báo có thể tới qua CẢ hai kênh (SSE và WebSocket) ⇒ chống trùng theo `id`.
  void _listenRealtime() {
    _realtimeSub?.cancel();
    _realtimeSub = RealtimeService.instance.events.listen((event) {
      if (event.type != kRealtimeTypeNotification) return;
      final raw = event.data['notification'];
      if (raw is! Map<String, dynamic>) return;
      final n = AppNotification.fromJson(raw);
      _addIncoming(n);
    });
  }

  void _addIncoming(AppNotification n) {
    if (_items.any((e) => e.id == n.id)) return;
    _items = [n, ..._items];
    _unread += 1;
    notifyListeners();
    _incoming.add(n);
  }

  Future<void> _loop() async {
    var delay = const Duration(seconds: 1);
    var opens = 0;
    var refreshedToken = false;
    while (_running) {
      final client = http.Client();
      _client = client;
      try {
        final baseUrl = await TokenStorage.getBaseUrl();
        final token = await TokenStorage.getAccessToken();
        if (token == null || token.isEmpty) {
          stop();
          return;
        }
        final request = http.Request('GET', Uri.parse('$baseUrl/notifications/stream'))
          ..headers['Accept'] = 'text/event-stream'
          ..headers['Authorization'] = 'Bearer $token';
        final response = await client.send(request);

        if (response.statusCode == 401) {
          // Token hết hạn: làm mới một lần rồi kết nối lại ngay; vẫn bị từ chối thì dừng (cần đăng nhập lại)
          if (refreshedToken) {
            stop();
            return;
          }
          refreshedToken = true;
          try {
            await AuthService().refreshToken();
            continue;
          } catch (_) {
            stop();
            return;
          }
        }
        if (response.statusCode != 200) throw http.ClientException('SSE ${response.statusCode}');

        refreshedToken = false;
        delay = const Duration(seconds: 1);
        _setConnected(true);
        // Kết nối lại sau khi rớt mạng: tải lại để không sót thông báo trong lúc mất kết nối
        if (opens++ > 0) refresh();

        String event = 'message';
        final data = StringBuffer();
        await for (final line in response.stream.transform(utf8.decoder).transform(const LineSplitter())) {
          if (line.isEmpty) {
            if (data.isNotEmpty) _onEvent(event, data.toString());
            event = 'message';
            data.clear();
          } else if (line.startsWith(':')) {
            // ping giữ kết nối
          } else if (line.startsWith('event:')) {
            event = line.substring(6).trim();
          } else if (line.startsWith('data:')) {
            if (data.isNotEmpty) data.write('\n');
            data.write(line.substring(5).trimLeft());
          }
        }
      } catch (_) {
        // mất mạng / máy chủ khởi động lại / stop() đóng client
      } finally {
        client.close();
        _setConnected(false);
      }
      if (!_running) break;
      await Future.delayed(delay);
      delay = Duration(seconds: math.min(delay.inSeconds * 2, 30));
    }
  }

  void _onEvent(String event, String raw) {
    dynamic json;
    try {
      json = jsonDecode(raw);
    } catch (_) {
      return;
    }
    if (event == 'notification' && json is Map<String, dynamic>) {
      final n = AppNotification.fromJson(json);
      _addIncoming(n);
    } else if (event == 'unread-count' && json is Map && json['count'] is num) {
      _unread = (json['count'] as num).toInt();
      notifyListeners();
    }
  }

  void _setConnected(bool value) {
    if (_connected == value) return;
    _connected = value;
    notifyListeners();
  }

  // ── REST ──────────────────────────────────────────────────────────────────

  Future<void> refresh() async {
    _loading = _items.isEmpty;
    notifyListeners();
    try {
      // Đồng bộ lời mời tour: nếu email đăng nhập từng được gửi lời mời thì backend
      // tạo thông báo "Bạn được mời tham gia tour". Gọi này KHÔNG chặn việc tải
      // danh sách thông báo ⇒ không làm chậm mở trung tâm thông báo.
      _syncPendingInvitations();

      final results = await Future.wait([
        ApiClient.request('GET', '/notifications?page=0&size=$_pageSize'),
        ApiClient.request('GET', '/notifications/unread-count'),
      ]);
      _items = ApiClient.asList(results[0]).map(AppNotification.fromJson).toList();
      _hasMore = results[0] is Map && results[0]['last'] == false;
      _page = 0;
      final count = results[1];
      if (count is Map && count['count'] is num) _unread = (count['count'] as num).toInt();
    } on ApiException catch (_) {
      // giữ dữ liệu cũ
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  bool _syncingInvitations = false;

  /// Đồng bộ lời mời tour đang chờ (backend tạo thông báo tương ứng nếu chưa có).
  ///
  /// Chạy nền: nếu backend vừa tạo thông báo lời mời mới ⇒ nạp lại danh sách.
  Future<void> _syncPendingInvitations() async {
    if (_syncingInvitations) return;
    _syncingInvitations = true;
    try {
      final data = await ApiClient.request('GET', '/bookings/my-invitations');
      final list = ApiClient.asList(data);
      if (list.isEmpty) return;
      // Có lời mời đang chờ ⇒ backend đã bảo đảm có thông báo tương ứng ⇒ nạp lại.
      await _reloadNotifications();
    } on ApiException catch (_) {
      // Không có lời mời hoặc lỗi mạng ⇒ bỏ qua.
    } finally {
      _syncingInvitations = false;
    }
  }

  /// Nạp lại danh sách thông báo (không đụng tới trạng thái loading).
  Future<void> _reloadNotifications() async {
    try {
      final results = await Future.wait([
        ApiClient.request('GET', '/notifications?page=0&size=$_pageSize'),
        ApiClient.request('GET', '/notifications/unread-count'),
      ]);
      _items = ApiClient.asList(results[0]).map(AppNotification.fromJson).toList();
      _hasMore = results[0] is Map && results[0]['last'] == false;
      _page = 0;
      final count = results[1];
      if (count is Map && count['count'] is num) _unread = (count['count'] as num).toInt();
      notifyListeners();
    } on ApiException catch (_) {
      // giữ dữ liệu cũ
    }
  }

  Future<void> loadMore() async {
    if (!_hasMore) return;
    final data = await ApiClient.request('GET', '/notifications?page=${_page + 1}&size=$_pageSize');
    final seen = _items.map((e) => e.id).toSet();
    _items = [
      ..._items,
      ...ApiClient.asList(data).map(AppNotification.fromJson).where((n) => !seen.contains(n.id)),
    ];
    _hasMore = data is Map && data['last'] == false;
    _page++;
    notifyListeners();
  }

  Future<void> markRead(AppNotification n) async {
    if (n.read) return;
    _items = [for (final e in _items) e.id == n.id ? e.copyWith(read: true) : e];
    _unread = math.max(0, _unread - 1);
    notifyListeners();
    try {
      final data = await ApiClient.request('PATCH', '/notifications/${n.id}/read');
      if (data is Map && data['count'] is num) {
        _unread = (data['count'] as num).toInt();
        notifyListeners();
      }
    } on ApiException catch (_) {
      // máy chủ đồng bộ lại qua SSE
    }
  }

  Future<void> markAllRead() async {
    _items = [for (final e in _items) e.read ? e : e.copyWith(read: true)];
    _unread = 0;
    notifyListeners();
    try {
      await ApiClient.request('PATCH', '/notifications/read-all');
    } on ApiException catch (_) {
      refresh();
    }
  }

  /// Đăng xuất: xoá dữ liệu của tài khoản cũ.
  void clear() {
    stop();
    _realtimeSub?.cancel();
    _realtimeSub = null;
    _items = const [];
    _unread = 0;
    _hasMore = false;
    notifyListeners();
  }
}
