/// Màn chat với NHÀ TOUR (dùng trước khi mua tour).
///
/// ── Luồng ──
///  • Bấm nút "Chat với bên `Tên đối tác`" → màn này mở (hoặc
///  tạo) hội thoại với nhà tour đó và cho phép nhắn ngay.
///
/// ── Vì sao tách khỏi chat trong booking? ──
///  Chat gắn với Booking chỉ dùng được SAU khi đặt tour. Ở đây du khách hỏi
///  lịch trình / giá / thời gian ngay khi đang xem chi tiết tour.
///
/// ── Giao diện ──
///  Tông xanh dương "người thật / hỗ trợ" (khác chàm-tím của AI và xanh ngọc của nút hành động):
///  đầu trang có huy hiệu đối tác + nút ⓘ, dòng "Đang hỏi về: tour" (ẩn được), phân cách theo ngày,
///  gộp tin liên tiếp, ✓ đã gửi / ✓✓ đã xem, nhấn giữ để sao chép, câu hỏi gợi ý, gửi lỗi chạm để gửi lại,
///  nút "↓ N tin mới" khi đang đọc tin cũ.
library;

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart' show Clipboard, ClipboardData, HapticFeedback;

import '../../core/constants/app_colors.dart';
import '../../core/models/provider_chat_model.dart';
import '../../core/services/api_client.dart';
import '../../core/services/provider_chat_service.dart';
import '../../core/services/realtime_service.dart';
import '../../core/services/token_storage.dart';
import '../../l10n/locale_controller.dart';
import '../common/heritage_motion.dart';
import '../tours/tour_detail_opener.dart';

/// Bảng màu kênh chat với nhà tour.
abstract final class ProviderChatPalette {
  static const navy = Color(0xFF1E3A8A);
  static const blue = Color(0xFF2563EB);
  static const sky = Color(0xFFEFF6FF);
  static const skyLine = Color(0xFFDBEAFE);
  static const bg = Color(0xFFF4F6FA);
  static const ink = Color(0xFF0F172A);
  static const muted = Color(0xFF64748B);
  static const line = Color(0xFFE2E8F0);
  static const seen = Color(0xFF93C5FD);
  static const error = Color(0xFFDC2626);
}

/// Tin đang gửi / gửi lỗi (chưa có id từ máy chủ).
class _PendingMessage {
  final int localId;
  final String body;
  final DateTime createdAt;
  bool failed = false;
  _PendingMessage({required this.localId, required this.body, required this.createdAt});
}

class ProviderChatScreen extends StatefulWidget {
  /// ID tour đang hỏi (dùng để mở/tạo hội thoại với đúng nhà tour).
  final int? tourId;

  /// ID nhà tour (fallback khi không có tour).
  final int? providerId;

  /// Tên nhà tour hiển thị trên AppBar.
  final String providerName;

  /// Tên tour liên quan (hiển thị phụ).
  final String? tourTitle;

  const ProviderChatScreen({
    super.key,
    this.tourId,
    this.providerId,
    required this.providerName,
    this.tourTitle,
  });

  @override
  State<ProviderChatScreen> createState() => _ProviderChatScreenState();
}

class _ProviderChatScreenState extends State<ProviderChatScreen> {
  final ProviderChatService _service = ProviderChatService();
  final TextEditingController _input = TextEditingController();
  final ScrollController _scroll = ScrollController();

  ProviderConversationModel? _conversation;
  List<ProviderMessageModel> _messages = const [];
  final List<_PendingMessage> _pending = [];
  int? _myUserId;

  bool _loading = true;
  String _error = '';

  // ⚠️ PHÂN TRANG KIỂU "CUỘN LÊN ĐỂ LOAD THÊM":
  //  • Mở màn ⇒ chỉ tải 10 tin MỚI NHẤT, tự cuộn xuống cuối (thấy ngay tin mới).
  //  • Cuộn lên gần đầu ⇒ tự nối thêm tin CŨ hơn.
  bool _loadingMore = false;
  bool _hasMore = false;
  int? _nextCursor;

  /// Đang ở đáy danh sách (tin mới tới thì tự cuộn); không ở đáy ⇒ đếm tin mới, hiện nút "↓ N tin mới".
  bool _atBottom = true;
  int _unseen = 0;

  /// Dòng "Đang hỏi về: tour" — du khách có thể ẩn (hỏi chuyện khác).
  bool _hideTourBar = false;

  /// Tin vừa tới / vừa gửi trong lần mở này ⇒ có hiệu ứng trượt lên (tin cũ tải lên thì không).
  final Set<int> _freshIds = {};

  StreamSubscription<RealtimeEvent>? _realtimeSub;

  @override
  void initState() {
    super.initState();
    _load();
    _listenRealtime();
    _scroll.addListener(_onScroll);
    // Nút gửi chỉ sáng khi có chữ
    _input.addListener(() {
      if (mounted) setState(() {});
    });
  }

  void _onScroll() {
    if (!_scroll.hasClients) return;
    final pos = _scroll.position;
    // Cuộn lên gần đầu ⇒ nạp thêm tin nhắn cũ.
    if (pos.pixels < 80) _loadMore();
    final atBottom = pos.pixels >= pos.maxScrollExtent - 40;
    if (atBottom != _atBottom || (atBottom && _unseen > 0)) {
      setState(() {
        _atBottom = atBottom;
        if (atBottom) _unseen = 0;
      });
    }
  }

  /// Nghe tin nhắn mới tới tức thì (WebSocket) ⇒ hiện ngay trong khung chat.
  void _listenRealtime() {
    _realtimeSub = RealtimeService.instance.events.listen((event) {
      if (event.type != kRealtimeTypeChatMessage) return;
      if (event.scope != 'PROVIDER_CHAT') return;
      final conversationId = event.conversationId;
      final current = _conversation?.id;
      if (conversationId == null || current == null || conversationId != current) return;

      final raw = event.message;
      if (raw == null) return;
      final message = ProviderMessageModel.fromJson(raw);
      if (!mounted || _messages.any((m) => m.id == message.id)) return;
      // ⚠️ Chỉ cuộn xuống cuối nếu người dùng ĐANG ở đáy (đang đọc lịch sử cũ
      // thì không bị cưỡng ép kéo xuống — hiện nút "↓ N tin mới").
      final wasAtBottom = !_scroll.hasClients || _scroll.position.pixels >= _scroll.position.maxScrollExtent - 40;
      setState(() {
        _messages = [..._messages, message];
        _freshIds.add(message.id);
        if (!wasAtBottom && !_isMine(message)) _unseen++;
      });
      if (wasAtBottom) _scrollToBottom();
    });
  }

  @override
  void dispose() {
    _realtimeSub?.cancel();
    _input.dispose();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = '';
    });

    try {
      final user = await TokenStorage.getUser();
      _myUserId = user?.id;

      // Mở (hoặc lấy lại) hội thoại — backend tự tìm theo cặp (du khách, nhà tour)
      // nên lịch sử chat với nhà tour này được giữ nguyên qua nhiều tour.
      final conversation = await _service.startConversation(
        tourId: widget.tourId,
        providerId: widget.providerId,
      );
      // Chỉ tải 10 tin MỚI NHẤT ⇒ mở màn không phải tải cả lịch sử.
      final page = await _service.getMessagesPage(conversation.id);

      if (!mounted) return;
      setState(() {
        _conversation = conversation;
        _messages = page.items;
        _hasMore = page.hasMore;
        _nextCursor = page.nextCursor;
        _loading = false;
      });
      _scrollToBottom(animate: false);
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.message;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _error = appL10n.chatOpenFailed;
        _loading = false;
      });
    }
  }

  /// Tải thêm tin nhắn CŨ hơn (nối vào ĐẦU danh sách).
  Future<void> _loadMore() async {
    final conversation = _conversation;
    final cursor = _nextCursor;
    if (conversation == null || cursor == null) return;
    if (_loadingMore || !_hasMore) return;

    setState(() => _loadingMore = true);
    // Ghi lại chiều cao & vị trí cuộn TRƯỚC khi nối tin cũ ⇒ sau khi nối xong
    // khôi phục lại ⇒ người dùng không bị "nhảy" mất chỗ đang đọc.
    final prevMax = _scroll.hasClients ? _scroll.position.maxScrollExtent : 0.0;
    final prevPixels = _scroll.hasClients ? _scroll.position.pixels : 0.0;

    try {
      final page = await _service.getMessagesPage(conversation.id, beforeId: cursor);
      if (!mounted) return;
      setState(() {
        // Tránh trùng tin (phòng trường hợp cursor trùng với tin cuối cùng).
        final existing = _messages.map((m) => m.id).toSet();
        final older = page.items.where((m) => !existing.contains(m.id)).toList();
        _messages = [...older, ..._messages];
        _hasMore = page.hasMore;
        _nextCursor = page.nextCursor;
        _loadingMore = false;
      });
      // Khôi phục vị trí cuộn (giữ nguyên tin đang đọc).
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!_scroll.hasClients) return;
        final delta = _scroll.position.maxScrollExtent - prevMax;
        if (delta > 0) _scroll.jumpTo(prevPixels + delta);
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _loadingMore = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.message), behavior: SnackBarBehavior.floating),
      );
    } catch (_) {
      if (!mounted) return;
      setState(() => _loadingMore = false);
    }
  }

  /// Đưa tin mới nhất xuống đáy (chờ 2 khung hình: tin dài / bàn phím làm chiều cao đổi sau lần dựng đầu).
  void _scrollToBottom({bool animate = true}) {
    void go() {
      if (!mounted || !_scroll.hasClients) return;
      final target = _scroll.position.maxScrollExtent;
      if (!animate) {
        _scroll.jumpTo(target);
      } else {
        _scroll.animateTo(target, duration: const Duration(milliseconds: 260), curve: Curves.easeOutCubic);
      }
    }

    WidgetsBinding.instance.addPostFrameCallback((_) {
      go();
      WidgetsBinding.instance.addPostFrameCallback((_) => go());
    });
  }

  /// Gửi tin: hiện ngay ở trạng thái "Đang gửi…"; lỗi thì giữ lại để chạm gửi lại.
  Future<void> _send([String? preset]) async {
    final text = (preset ?? _input.text).trim();
    final conversation = _conversation;
    if (text.isEmpty || conversation == null) return;
    if (preset == null) _input.clear();
    HapticFeedback.selectionClick();
    final pending = _PendingMessage(localId: DateTime.now().microsecondsSinceEpoch, body: text, createdAt: DateTime.now());
    setState(() => _pending.add(pending));
    _scrollToBottom();
    await _deliver(conversation.id, pending);
  }

  Future<void> _deliver(int conversationId, _PendingMessage pending) async {
    try {
      final message = await _service.sendMessage(conversationId, pending.body);
      if (!mounted) return;
      setState(() {
        _pending.remove(pending);
        if (!_messages.any((m) => m.id == message.id)) {
          _messages = [..._messages, message];
          _freshIds.add(message.id);
        }
      });
      _scrollToBottom();
    } catch (_) {
      if (!mounted) return;
      setState(() => pending.failed = true);
    }
  }

  void _retry(_PendingMessage pending) {
    final conversation = _conversation;
    if (conversation == null) return;
    setState(() => pending.failed = false);
    _deliver(conversation.id, pending);
  }

  bool _isMine(ProviderMessageModel m) => m.senderId == _myUserId;

  String get _providerName => widget.providerName.isEmpty ? context.l10n.chatProviderFallback : widget.providerName;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: ProviderChatPalette.bg,
      appBar: _buildAppBar(),
      body: Column(
        children: [
          if (!_hideTourBar && widget.tourTitle != null && widget.tourTitle!.trim().isNotEmpty) _buildTourBar(),
          Expanded(
            child: Stack(
              children: [
                Positioned.fill(child: _buildBody()),
                // Đang đọc tin cũ mà có tin mới ⇒ nút "↓ N tin mới"
                if (_unseen > 0 && !_atBottom)
                  Positioned(
                    bottom: 12,
                    left: 0,
                    right: 0,
                    child: Center(
                      child: Pressable(
                        onTap: () {
                          setState(() => _unseen = 0);
                          _scrollToBottom();
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                          decoration: BoxDecoration(
                            color: ProviderChatPalette.navy,
                            borderRadius: BorderRadius.circular(999),
                            boxShadow: [BoxShadow(color: ProviderChatPalette.navy.withValues(alpha: 0.3), blurRadius: 12, offset: const Offset(0, 4))],
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.arrow_downward_rounded, size: 16, color: Colors.white),
                              const SizedBox(width: 6),
                              Text(
                                context.l10n.pcNewMessages(_unseen),
                                style: const TextStyle(color: Colors.white, fontSize: 12.5, fontWeight: FontWeight.w700),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
          _buildComposer(),
        ],
      ),
    );
  }

  // ── Đầu trang ──────────────────────────────────────────────────────────────

  PreferredSizeWidget _buildAppBar() {
    return AppBar(
      backgroundColor: Colors.white,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: false,
      iconTheme: const IconThemeData(color: ProviderChatPalette.ink),
      titleSpacing: 0,
      bottom: const PreferredSize(
        preferredSize: Size.fromHeight(1),
        child: Divider(height: 1, thickness: 1, color: ProviderChatPalette.line),
      ),
      title: Row(
        children: [
          ProviderAvatar(name: _providerName, size: 40, online: _conversation?.providerOnline ?? false),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: Text(
                        _providerName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 15.5, fontWeight: FontWeight.w800, color: ProviderChatPalette.ink),
                      ),
                    ),
                    const SizedBox(width: 4),
                    const Icon(Icons.verified_rounded, size: 16, color: ProviderChatPalette.blue),
                  ],
                ),
                // Trạng thái thật: "Đang trực tuyến" (xanh lá) / "Thường trả lời trong …" / (chưa đủ dữ liệu) "Đối tác đã xác minh"
                Builder(builder: (context) {
                  final online = _conversation?.providerOnline ?? false;
                  final status = providerStatusText(
                    context,
                    online: online,
                    replyMinutes: _conversation?.providerReplyMinutes,
                  );
                  return Text(
                    status ?? context.l10n.pcVerified,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 11.5,
                      color: online ? const Color(0xFF16A34A) : ProviderChatPalette.muted,
                      fontWeight: online ? FontWeight.w700 : FontWeight.w600,
                    ),
                  );
                }),
              ],
            ),
          ),
        ],
      ),
      actions: [
        IconButton(
          tooltip: context.l10n.pcInfoTitle,
          icon: const Icon(Icons.info_outline_rounded, color: ProviderChatPalette.ink),
          onPressed: _showProviderInfo,
        ),
      ],
    );
  }

  /// ⓘ: thông tin nhà tour + nút xem tour đang hỏi.
  void _showProviderInfo() {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(22))),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 18, 20, 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  ProviderAvatar(name: _providerName, size: 52),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(_providerName, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: ProviderChatPalette.ink)),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            const Icon(Icons.verified_rounded, size: 15, color: ProviderChatPalette.blue),
                            const SizedBox(width: 4),
                            Text(ctx.l10n.pcVerified, style: const TextStyle(fontSize: 12.5, color: ProviderChatPalette.blue, fontWeight: FontWeight.w700)),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              Text(ctx.l10n.pcInfoBody, style: const TextStyle(fontSize: 13.5, height: 1.5, color: ProviderChatPalette.muted)),
              const SizedBox(height: 8),
              Row(
                children: [
                  const Icon(Icons.notifications_active_outlined, size: 16, color: ProviderChatPalette.muted),
                  const SizedBox(width: 6),
                  Expanded(child: Text(ctx.l10n.pcNotifyReply, style: const TextStyle(fontSize: 12.5, color: ProviderChatPalette.muted))),
                ],
              ),
              if (widget.tourId != null) ...[
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  height: 46,
                  child: FilledButton.icon(
                    onPressed: () {
                      Navigator.of(ctx).pop();
                      openTourDetailScreen(context, tourId: widget.tourId!);
                    },
                    style: FilledButton.styleFrom(backgroundColor: ProviderChatPalette.navy, shape: const StadiumBorder()),
                    icon: const Icon(Icons.map_outlined, size: 18),
                    label: Text(ctx.l10n.pcViewTour, style: const TextStyle(fontWeight: FontWeight.w700)),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  /// "Đang hỏi về: tour" — gọn một dòng, chạm mở tour, ✕ để ẩn (hỏi chuyện khác).
  Widget _buildTourBar() {
    return Container(
      color: ProviderChatPalette.sky,
      padding: const EdgeInsets.fromLTRB(14, 6, 4, 6),
      child: Row(
        children: [
          const Icon(Icons.local_offer_outlined, size: 16, color: ProviderChatPalette.navy),
          const SizedBox(width: 8),
          Expanded(
            child: GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTap: widget.tourId == null ? null : () => openTourDetailScreen(context, tourId: widget.tourId!),
              child: Text(
                context.l10n.pcAskingAbout(widget.tourTitle!.trim()),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: ProviderChatPalette.navy),
              ),
            ),
          ),
          IconButton(
            visualDensity: VisualDensity.compact,
            tooltip: MaterialLocalizations.of(context).closeButtonTooltip,
            icon: const Icon(Icons.close_rounded, size: 18, color: ProviderChatPalette.navy),
            onPressed: () => setState(() => _hideTourBar = true),
          ),
        ],
      ),
    );
  }

  // ── Nội dung ───────────────────────────────────────────────────────────────

  Widget _buildBody() {
    if (_loading) {
      return const Center(child: CircularProgressIndicator(color: ProviderChatPalette.blue));
    }
    if (_error.isNotEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.cloud_off_rounded, size: 40, color: AppCultureColors.textLight),
              const SizedBox(height: 10),
              Text(_error, textAlign: TextAlign.center, style: const TextStyle(color: ProviderChatPalette.muted)),
              const SizedBox(height: 10),
              TextButton(onPressed: _load, child: Text(context.l10n.commonRetry)),
            ],
          ),
        ),
      );
    }
    if (_messages.isEmpty && _pending.isEmpty) return _buildEmpty();

    final rows = _buildRows();
    return ListView.builder(
      controller: _scroll,
      padding: const EdgeInsets.fromLTRB(12, 12, 12, 12),
      itemCount: rows.length + 1,
      itemBuilder: (_, i) => i == 0 ? _buildHistoryHeader() : rows[i - 1],
    );
  }

  /// Màn hình trống: lời chào + câu hỏi gợi ý (chạm là gửi).
  Widget _buildEmpty() {
    final l10n = context.l10n;
    final questions = [l10n.pcQuick1, l10n.pcQuick2, l10n.pcQuick3, l10n.pcQuick4];
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 32, 20, 20),
      children: [
        Center(
          child: Container(
            width: 76,
            height: 76,
            decoration: const BoxDecoration(
              shape: BoxShape.circle,
              gradient: LinearGradient(colors: [ProviderChatPalette.sky, ProviderChatPalette.skyLine], begin: Alignment.topLeft, end: Alignment.bottomRight),
            ),
            child: const Icon(Icons.support_agent_rounded, size: 38, color: ProviderChatPalette.navy),
          ),
        ),
        const SizedBox(height: 16),
        Text(
          l10n.chatAskAbout(widget.providerName.isEmpty ? l10n.chatProviderLower : widget.providerName),
          textAlign: TextAlign.center,
          style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: ProviderChatPalette.ink),
        ),
        const SizedBox(height: 6),
        Text(
          l10n.chatAskHint,
          textAlign: TextAlign.center,
          style: const TextStyle(fontSize: 13, height: 1.5, color: ProviderChatPalette.muted),
        ),
        const SizedBox(height: 22),
        Text(l10n.pcQuickTitle.toUpperCase(),
            style: const TextStyle(fontSize: 11.5, letterSpacing: 0.6, fontWeight: FontWeight.w800, color: ProviderChatPalette.muted)),
        const SizedBox(height: 10),
        for (final q in questions)
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: Pressable(
              onTap: _conversation == null ? null : () => _send(q),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: ProviderChatPalette.line),
                  boxShadow: [BoxShadow(color: ProviderChatPalette.navy.withValues(alpha: 0.05), blurRadius: 10, offset: const Offset(0, 3))],
                ),
                child: Row(
                  children: [
                    Container(
                      width: 30,
                      height: 30,
                      decoration: BoxDecoration(color: ProviderChatPalette.sky, borderRadius: BorderRadius.circular(9)),
                      child: const Icon(Icons.help_outline_rounded, size: 17, color: ProviderChatPalette.navy),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(q, style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600, color: ProviderChatPalette.ink)),
                    ),
                    const Icon(Icons.send_rounded, size: 16, color: ProviderChatPalette.blue),
                  ],
                ),
              ),
            ),
          ),
      ],
    );
  }

  /// Các hàng của danh sách: phân cách ngày + bong bóng (gộp tin liên tiếp) + tin đang gửi.
  List<Widget> _buildRows() {
    final rows = <Widget>[];
    DateTime? prevDay;
    for (var i = 0; i < _messages.length; i++) {
      final m = _messages[i];
      final at = m.createdAt?.toLocal();
      final day = at == null ? null : DateTime(at.year, at.month, at.day);
      if (day != null && day != prevDay) {
        rows.add(_DaySeparator(label: _dayLabel(day)));
        prevDay = day;
      }
      final next = i + 1 < _messages.length ? _messages[i + 1] : null;
      final prev = i > 0 ? _messages[i - 1] : null;
      final groupedWithPrev = prev != null && _sameGroup(prev, m);
      final groupedWithNext = next != null && _sameGroup(m, next);
      // Tin cuối cùng của mình ⇒ hiện trạng thái ✓ / ✓✓ dạng chữ nhỏ
      final lastMine = _isMine(m) && !_messages.skip(i + 1).any(_isMine);
      rows.add(_bubble(
        body: m.body,
        time: m.timeLabel,
        mine: _isMine(m),
        read: m.read,
        first: !groupedWithPrev,
        last: !groupedWithNext,
        showStatusText: lastMine && _pending.isEmpty,
        fresh: _freshIds.contains(m.id),
        key: ValueKey('m${m.id}'),
      ));
    }
    for (final p in _pending) {
      rows.add(_bubble(
        body: p.body,
        time: '',
        mine: true,
        read: false,
        first: true,
        last: true,
        pending: p,
        fresh: true,
        key: ValueKey('p${p.localId}'),
      ));
    }
    return rows;
  }

  /// Cùng người gửi, cách nhau ≤ 5 phút, cùng ngày ⇒ gộp thành một cụm.
  bool _sameGroup(ProviderMessageModel a, ProviderMessageModel b) {
    if (a.senderId != b.senderId) return false;
    final ta = a.createdAt, tb = b.createdAt;
    if (ta == null || tb == null) return true;
    final la = ta.toLocal(), lb = tb.toLocal();
    return la.day == lb.day && lb.difference(la).inMinutes.abs() <= 5;
  }

  String _dayLabel(DateTime day) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final diff = today.difference(day).inDays;
    if (diff == 0) return context.l10n.pcToday;
    if (diff == 1) return context.l10n.pcYesterday;
    final dm = '${day.day.toString().padLeft(2, '0')}/${day.month.toString().padLeft(2, '0')}';
    return day.year == now.year ? dm : '$dm/${day.year}';
  }

  Widget _bubble({
    required String body,
    required String time,
    required bool mine,
    required bool read,
    required bool first,
    required bool last,
    required bool fresh,
    required Key key,
    bool showStatusText = false,
    _PendingMessage? pending,
  }) {
    const r = Radius.circular(18);
    const tight = Radius.circular(6);
    // Bo góc liền mạch trong một cụm tin
    final radius = mine
        ? BorderRadius.only(topLeft: r, bottomLeft: r, topRight: first ? r : tight, bottomRight: last ? tight : tight)
        : BorderRadius.only(topRight: r, bottomRight: r, topLeft: first ? r : tight, bottomLeft: last ? tight : tight);
    final failed = pending?.failed ?? false;

    Widget bubble = GestureDetector(
      onTap: failed ? () => _retry(pending!) : null,
      onLongPress: () {
        Clipboard.setData(ClipboardData(text: body));
        HapticFeedback.mediumImpact();
        ScaffoldMessenger.of(context)
          ..hideCurrentSnackBar()
          ..showSnackBar(SnackBar(content: Text(context.l10n.pcCopied), behavior: SnackBarBehavior.floating));
      },
      child: Container(
        padding: const EdgeInsets.fromLTRB(13, 9, 13, 8),
        constraints: BoxConstraints(maxWidth: MediaQuery.sizeOf(context).width * 0.74),
        decoration: BoxDecoration(
          color: mine ? null : Colors.white,
          gradient: mine && !failed
              ? const LinearGradient(colors: [ProviderChatPalette.navy, ProviderChatPalette.blue], begin: Alignment.topLeft, end: Alignment.bottomRight)
              : null,
          border: mine
              ? (failed ? Border.all(color: ProviderChatPalette.error) : null)
              : Border.all(color: ProviderChatPalette.line),
          borderRadius: radius,
          boxShadow: [
            BoxShadow(color: (mine ? ProviderChatPalette.navy : ProviderChatPalette.ink).withValues(alpha: mine ? 0.16 : 0.04), blurRadius: 8, offset: const Offset(0, 2)),
          ],
        ),
        child: Column(
          crossAxisAlignment: mine ? CrossAxisAlignment.end : CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              body,
              style: TextStyle(
                fontSize: 14,
                height: 1.4,
                color: mine && !failed ? Colors.white : ProviderChatPalette.ink,
              ),
            ),
            const SizedBox(height: 3),
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (pending != null)
                  Text(
                    failed ? context.l10n.pcSendFailed : context.l10n.pcSending,
                    style: TextStyle(
                      fontSize: 10.5,
                      fontWeight: FontWeight.w600,
                      color: failed ? ProviderChatPalette.error : Colors.white.withValues(alpha: 0.75),
                    ),
                  )
                else ...[
                  Text(
                    time,
                    style: TextStyle(fontSize: 10.5, color: mine ? Colors.white.withValues(alpha: 0.75) : ProviderChatPalette.muted),
                  ),
                  if (mine) ...[
                    const SizedBox(width: 4),
                    // ✓ đã gửi · ✓✓ đã xem
                    Icon(
                      read ? Icons.done_all_rounded : Icons.done_rounded,
                      size: 14,
                      color: read ? ProviderChatPalette.seen : Colors.white.withValues(alpha: 0.75),
                      semanticLabel: read ? context.l10n.pcSeen : context.l10n.pcSent,
                    ),
                  ],
                ],
                if (failed) ...[
                  const SizedBox(width: 4),
                  const Icon(Icons.refresh_rounded, size: 14, color: ProviderChatPalette.error),
                ],
              ],
            ),
          ],
        ),
      ),
    );

    // Nhà tour: ảnh đại diện chỉ ở tin cuối của cụm (tin khác chừa chỗ cho thẳng hàng)
    final row = Row(
      mainAxisAlignment: mine ? MainAxisAlignment.end : MainAxisAlignment.start,
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        if (!mine) ...[
          last ? ProviderAvatar(name: _providerName, size: 28) : const SizedBox(width: 28),
          const SizedBox(width: 8),
        ],
        Flexible(child: bubble),
      ],
    );

    final content = Padding(
      key: key,
      padding: EdgeInsets.only(bottom: last ? 10 : 3),
      child: Column(
        crossAxisAlignment: mine ? CrossAxisAlignment.end : CrossAxisAlignment.start,
        children: [
          row,
          if (showStatusText && read)
            Padding(
              padding: const EdgeInsets.only(top: 3, right: 4),
              child: Text(context.l10n.pcSeen, style: const TextStyle(fontSize: 10.5, color: ProviderChatPalette.muted)),
            ),
        ],
      ),
    );
    return fresh ? _Appear(key: key, child: content) : content;
  }

  /// Đầu danh sách: nút load thêm lịch sử cũ / dòng "đã xem hết lịch sử".
  Widget _buildHistoryHeader() {
    if (_hasMore) {
      return Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: Center(
          child: _loadingMore
              ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: ProviderChatPalette.blue))
              : TextButton.icon(
                  onPressed: _loadMore,
                  icon: const Icon(Icons.expand_less_rounded, size: 18),
                  label: Text(context.l10n.pcLoadOlder),
                  style: TextButton.styleFrom(
                    foregroundColor: ProviderChatPalette.muted,
                    textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                  ),
                ),
        ),
      );
    }
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Center(
        child: Text(context.l10n.pcHistoryEnd, style: const TextStyle(fontSize: 11.5, color: AppCultureColors.textLight)),
      ),
    );
  }

  // ── Ô nhập ─────────────────────────────────────────────────────────────────

  Widget _buildComposer() {
    final canSend = _input.text.trim().isNotEmpty && _conversation != null;
    final l10n = context.l10n;
    final quick = [l10n.pcQuick1, l10n.pcQuick2, l10n.pcQuick3, l10n.pcQuick4];
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: ProviderChatPalette.line)),
      ),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Hỏi nhanh (khi đã có tin nhắn — màn trống đã có thẻ gợi ý lớn)
            if (_messages.isNotEmpty && _conversation != null)
              SizedBox(
                height: 44,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.fromLTRB(12, 8, 12, 2),
                  itemCount: quick.length,
                  separatorBuilder: (_, _) => const SizedBox(width: 8),
                  itemBuilder: (_, i) => Pressable(
                    onTap: () => _send(quick[i]),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: ProviderChatPalette.sky,
                        borderRadius: BorderRadius.circular(999),
                        border: Border.all(color: ProviderChatPalette.skyLine),
                      ),
                      child: Text(
                        quick[i],
                        style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: ProviderChatPalette.navy),
                      ),
                    ),
                  ),
                ),
              ),
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 10),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  // Một ô nhập duy nhất (bỏ khung lồng khung)
                  Expanded(
                    child: TextField(
                      controller: _input,
                      minLines: 1,
                      maxLines: 5,
                      textInputAction: TextInputAction.newline,
                      style: const TextStyle(fontSize: 14, color: ProviderChatPalette.ink),
                      decoration: InputDecoration(
                        isDense: true,
                        filled: true,
                        fillColor: ProviderChatPalette.bg,
                        hintText: l10n.chatInputHint,
                        hintStyle: const TextStyle(fontSize: 14, color: AppCultureColors.textLight),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(22),
                          borderSide: const BorderSide(color: ProviderChatPalette.line),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(22),
                          borderSide: const BorderSide(color: ProviderChatPalette.line),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(22),
                          borderSide: const BorderSide(color: ProviderChatPalette.blue, width: 1.5),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  // Nút gửi: chỉ sáng khi có chữ, nhấn thu nhỏ
                  Pressable(
                    onTap: canSend ? () => _send() : null,
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 180),
                      width: 46,
                      height: 46,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: canSend ? null : ProviderChatPalette.line,
                        gradient: canSend
                            ? const LinearGradient(colors: [ProviderChatPalette.navy, ProviderChatPalette.blue], begin: Alignment.topLeft, end: Alignment.bottomRight)
                            : null,
                        boxShadow: canSend
                            ? [BoxShadow(color: ProviderChatPalette.blue.withValues(alpha: 0.3), blurRadius: 12, offset: const Offset(0, 4))]
                            : null,
                      ),
                      child: Icon(Icons.send_rounded, size: 20, color: canSend ? Colors.white : ProviderChatPalette.muted),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Màu chấm "Đang trực tuyến".
const Color kProviderOnlineColor = Color(0xFF22C55E);

/// Dòng trạng thái nhà tour: "Đang trực tuyến" (khi máy chủ thấy nhà tour đang mở trang quản lý),
/// không thì "Thường trả lời trong …" tính từ lịch sử trả lời thật; chưa đủ dữ liệu ⇒ null.
String? providerStatusText(BuildContext context, {required bool online, int? replyMinutes}) {
  final l10n = context.l10n;
  if (online) return l10n.pcOnline;
  final m = replyMinutes;
  if (m == null) return null;
  if (m <= 10) return l10n.pcReplyFewMinutes;
  if (m < 60) return l10n.pcReplyMinutes(((m + 4) ~/ 5) * 5); // làm tròn 5 phút
  if (m < 24 * 60) return l10n.pcReplyHours((m / 60).round().clamp(1, 23));
  if (m < 48 * 60) return l10n.pcReplyDay;
  return l10n.pcReplyDays;
}

/// Ảnh đại diện nhà tour: chữ cái đầu trên nền xanh dương (thống nhất, dễ nhận ra);
/// [online] ⇒ chấm xanh lá ở góc dưới.
class ProviderAvatar extends StatelessWidget {
  final String name;
  final double size;
  final bool online;
  const ProviderAvatar({super.key, required this.name, required this.size, this.online = false});

  @override
  Widget build(BuildContext context) {
    final words = name.trim().split(RegExp(r'\s+')).where((w) => w.isNotEmpty).toList();
    final initials = words.isEmpty
        ? '?'
        : (words.length == 1 ? words.first.characters.first : '${words.first.characters.first}${words.last.characters.first}')
            .toUpperCase();
    final dot = (size * 0.28).clamp(10.0, 15.0);
    return SizedBox(
      width: size,
      height: size,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Container(
            width: size,
            height: size,
            alignment: Alignment.center,
            decoration: const BoxDecoration(
              shape: BoxShape.circle,
              gradient: LinearGradient(colors: [ProviderChatPalette.navy, ProviderChatPalette.blue], begin: Alignment.topLeft, end: Alignment.bottomRight),
            ),
            child: Text(
              initials,
              style: TextStyle(color: Colors.white, fontSize: size * 0.36, fontWeight: FontWeight.w800),
            ),
          ),
          if (online)
            Positioned(
              right: 0,
              bottom: 0,
              child: Container(
                width: dot,
                height: dot,
                decoration: BoxDecoration(
                  color: kProviderOnlineColor,
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white, width: 2),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// Nhãn phân cách theo ngày ("Hôm nay", "Hôm qua", "25/11").
class _DaySeparator extends StatelessWidget {
  final String label;
  const _DaySeparator({required this.label});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Row(
        children: [
          const Expanded(child: Divider(color: ProviderChatPalette.line, thickness: 1)),
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 10),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(999), border: Border.all(color: ProviderChatPalette.line)),
            child: Text(label, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: ProviderChatPalette.muted)),
          ),
          const Expanded(child: Divider(color: ProviderChatPalette.line, thickness: 1)),
        ],
      ),
    );
  }
}

/// Tin mới xuất hiện: trượt lên + hiện dần (một lần).
class _Appear extends StatelessWidget {
  final Widget child;
  const _Appear({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: const Duration(milliseconds: 260),
      curve: Curves.easeOutCubic,
      builder: (_, t, c) => Opacity(
        opacity: t,
        child: Transform.translate(offset: Offset(0, (1 - t) * 12), child: c),
      ),
      child: child,
    );
  }
}
