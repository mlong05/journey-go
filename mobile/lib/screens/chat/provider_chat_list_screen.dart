/// Màn "Hỗ trợ từ nhà tour" — lịch sử chat với CÁC nhà tour khác nhau.
///
/// Nằm trong Tài khoản → Vé & hỗ trợ → "Hỗ trợ từ nhà tour".
/// Mỗi hội thoại gom theo một nhà tour nên khách trao đổi với nhiều đối tác
/// mà lịch sử không bị trộn lẫn.
library;

import 'dart:async';

import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';
import '../../core/models/provider_chat_model.dart';
import '../../core/services/api_client.dart';
import '../../core/services/provider_chat_service.dart';
import '../../core/services/realtime_service.dart';
import '../common/heritage_motion.dart';
import 'provider_chat_screen.dart';
import '../../l10n/locale_controller.dart';

class ProviderChatListScreen extends StatefulWidget {
  /// Nhúng vào một màn khác (VD: tab "Hỗ trợ từ nhà tour" trong Đơn đặt tour)
  /// ⇒ không dựng Scaffold/AppBar của riêng mình.
  final bool embedded;

  /// Mở thẳng một hội thoại khi vào màn (VD: bấm vào thông báo "Đã nhận tin nhắn mới").
  final int? openConversationId;

  const ProviderChatListScreen({
    super.key,
    this.embedded = false,
    this.openConversationId,
  });

  @override
  State<ProviderChatListScreen> createState() => _ProviderChatListScreenState();
}

class _ProviderChatListScreenState extends State<ProviderChatListScreen> {
  final ProviderChatService _service = ProviderChatService();

  List<ProviderConversationModel> _conversations = const [];
  bool _loading = true;
  String _error = '';

  StreamSubscription<RealtimeEvent>? _realtimeSub;
  bool _autoOpened = false;

  @override
  void initState() {
    super.initState();
    _load();
    _listenRealtime();
  }

  /// Tin nhắn mới tới ⇒ làm mới danh sách (preview + số chưa đọc) ngay lập tức.
  void _listenRealtime() {
    _realtimeSub = RealtimeService.instance.events.listen((event) {
      if (event.type != kRealtimeTypeChatMessage) return;
      if (event.scope != 'PROVIDER_CHAT') return;
      _load(silent: true);
    });
  }

  @override
  void dispose() {
    _realtimeSub?.cancel();
    super.dispose();
  }

  Future<void> _load({bool silent = false}) async {
    if (!silent && mounted) {
      setState(() {
        _loading = true;
        _error = '';
      });
    }
    try {
      final list = await _service.getConversations();
      if (!mounted) return;
      setState(() {
        _conversations = list;
        _loading = false;
      });
      // Mở thẳng hội thoại được chỉ định (từ thông báo) — chỉ mở 1 lần.
      final targetId = widget.openConversationId;
      if (targetId != null && !_autoOpened) {
        _autoOpened = true;
        final target = list.where((c) => c.id == targetId).toList();
        if (target.isNotEmpty) {
          await _open(target.first);
        }
      }
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.message;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _error = appL10n.chatListLoadFailed;
        _loading = false;
      });
    }
  }

  Future<void> _open(ProviderConversationModel c) async {
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => ProviderChatScreen(
          tourId: c.tourId,
          providerId: c.providerId,
          providerName: c.counterpartName,
          tourTitle: c.tourTitle,
        ),
      ),
    );
    if (mounted) _load();
  }

  @override
  Widget build(BuildContext context) {
    final body = _loading
        ? const Center(child: CircularProgressIndicator(color: _P.blue))
        : _error.isNotEmpty
            ? _errorView()
            : _conversations.isEmpty
                ? _emptyView()
                : RefreshIndicator(
                    color: _P.blue,
                    onRefresh: _load,
                    child: ListView.separated(
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: const EdgeInsets.fromLTRB(16, 14, 16, 24),
                      itemCount: _conversations.length + 1,
                      separatorBuilder: (_, i) => SizedBox(height: i == 0 ? 14 : 10),
                      itemBuilder: (_, i) => i == 0 ? _intro() : _tile(_conversations[i - 1]),
                    ),
                  );

    // Nhúng trong TabBarView ⇒ không dựng Scaffold/AppBar riêng.
    if (widget.embedded) return ColoredBox(color: _P.bg, child: body);

    return Scaffold(
      backgroundColor: _P.bg,
      appBar: AppBar(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: true,
        iconTheme: const IconThemeData(color: _P.ink),
        bottom: const PreferredSize(
          preferredSize: Size.fromHeight(1),
          child: Divider(height: 1, thickness: 1, color: _P.line),
        ),
        title: Text(
          context.l10n.providerSupportTitle,
          style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: _P.ink),
        ),
      ),
      body: body,
    );
  }

  /// Dòng giới thiệu ngắn đầu danh sách.
  Widget _intro() {
    return Row(
      children: [
        const Icon(Icons.support_agent_rounded, size: 18, color: _P.navy),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            context.l10n.pcListSubtitle,
            style: const TextStyle(fontSize: 12.5, color: _P.muted, fontWeight: FontWeight.w600),
          ),
        ),
      ],
    );
  }

  Widget _errorView() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.cloud_off_rounded,
              size: 40,
              color: AppCultureColors.textLight,
            ),
            const SizedBox(height: 10),
            Text(
              _error,
              textAlign: TextAlign.center,
              style: const TextStyle(color: AppCultureColors.textMuted),
            ),
            const SizedBox(height: 10),
            TextButton(onPressed: _load, child: Text(context.l10n.commonRetry)),
          ],
        ),
      ),
    );
  }

  /// Chưa có hội thoại nào: minh hoạ + lời nhắn (cùng tông với màn chat).
  Widget _emptyView() {
    return RefreshIndicator(
      color: _P.blue,
      onRefresh: _load,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(28, 80, 28, 28),
        children: [
          Center(
            child: Container(
              width: 84,
              height: 84,
              decoration: const BoxDecoration(
                shape: BoxShape.circle,
                gradient: LinearGradient(colors: [_P.sky, _P.skyLine], begin: Alignment.topLeft, end: Alignment.bottomRight),
              ),
              child: const Icon(Icons.forum_rounded, size: 40, color: _P.navy),
            ),
          ),
          const SizedBox(height: 18),
          Text(
            context.l10n.chatEmpty,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: _P.ink),
          ),
          const SizedBox(height: 6),
          Text(
            context.l10n.chatEmptyHint,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 13, height: 1.5, color: _P.muted),
          ),
        ],
      ),
    );
  }

  /// Một hội thoại: ảnh chữ cái đầu (+ chấm chưa đọc), tên + ✔ + giờ, tour (nhãn nhỏ), tin cuối, số chưa đọc.
  Widget _tile(ProviderConversationModel c) {
    final unread = c.unreadCount > 0;
    final hasMessage = c.lastMessage != null && c.lastMessage!.trim().isNotEmpty;
    final name = c.counterpartName.isEmpty ? context.l10n.chatProviderFallback : c.counterpartName;
    return Pressable(
      onTap: () => _open(c),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: unread ? _P.skyLine : _P.line),
          boxShadow: [
            BoxShadow(color: _P.navy.withValues(alpha: unread ? 0.08 : 0.04), blurRadius: 14, offset: const Offset(0, 4)),
          ],
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Stack(
              clipBehavior: Clip.none,
              children: [
                // Chấm xanh lá (góc dưới) = nhà tour đang trực tuyến; chấm xanh dương (góc trên) = có tin chưa đọc
                ProviderAvatar(name: name, size: 50, online: c.providerOnline),
                if (unread)
                  Positioned(
                    right: -1,
                    top: -1,
                    child: Container(
                      width: 14,
                      height: 14,
                      decoration: BoxDecoration(
                        color: _P.blue,
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white, width: 2),
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Tên hiện đủ (tối đa 2 dòng), huy hiệu ✔ đi liền sau chữ cuối — không còn bị cắt "Ban Quản L…"
                  Text.rich(
                    TextSpan(
                      children: [
                        TextSpan(text: name),
                        const WidgetSpan(
                          alignment: PlaceholderAlignment.middle,
                          child: Padding(
                            padding: EdgeInsets.only(left: 4),
                            child: Icon(Icons.verified_rounded, size: 15, color: _P.blue),
                          ),
                        ),
                      ],
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 15,
                      height: 1.3,
                      fontWeight: unread ? FontWeight.w800 : FontWeight.w700,
                      color: _P.ink,
                    ),
                  ),
                  // Trạng thái nhà tour: "● Đang trực tuyến" / "Thường trả lời trong …" (chưa đủ dữ liệu thì ẩn)
                  if (providerStatusText(context, online: c.providerOnline, replyMinutes: c.providerReplyMinutes)
                      case final status?) ...[
                    const SizedBox(height: 3),
                    Row(
                      children: [
                        Icon(
                          c.providerOnline ? Icons.circle : Icons.schedule_rounded,
                          size: c.providerOnline ? 8 : 13,
                          color: c.providerOnline ? kProviderOnlineColor : _P.muted,
                        ),
                        const SizedBox(width: 5),
                        Flexible(
                          child: Text(
                            status,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: c.providerOnline ? FontWeight.w700 : FontWeight.w500,
                              color: c.providerOnline ? const Color(0xFF16A34A) : _P.muted,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                  if (c.tourTitle != null && c.tourTitle!.trim().isNotEmpty) ...[
                    const SizedBox(height: 6),
                    // Tour liên quan: nhãn nhỏ nền xanh nhạt
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(color: _P.sky, borderRadius: BorderRadius.circular(8)),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.local_offer_outlined, size: 12, color: _P.navy),
                          const SizedBox(width: 4),
                          Flexible(
                            child: Text(
                              c.tourTitle!.trim(),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: _P.navy),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                  const SizedBox(height: 7),
                  Row(
                    children: [
                      Expanded(
                        child: hasMessage
                            ? Text(
                                c.lastMessage!.trim(),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  fontSize: 13,
                                  height: 1.35,
                                  color: unread ? _P.ink : _P.muted,
                                  fontWeight: unread ? FontWeight.w600 : FontWeight.w400,
                                ),
                              )
                            // Chưa có tin nhắn ⇒ mời bắt đầu trò chuyện
                            : Row(
                                children: [
                                  Text(
                                    context.l10n.pcStartChat,
                                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: _P.blue),
                                  ),
                                  const SizedBox(width: 4),
                                  const Icon(Icons.arrow_forward_rounded, size: 15, color: _P.blue),
                                ],
                              ),
                      ),
                      // Giờ của TIN NHẮN CUỐI nằm ngay cạnh tin đó (rõ nghĩa); chưa có tin ⇒ không hiện giờ
                      if (hasMessage && c.timeLabel.isNotEmpty) ...[
                        const SizedBox(width: 8),
                        Text(
                          c.timeLabel,
                          style: TextStyle(
                            fontSize: 11.5,
                            fontWeight: unread ? FontWeight.w700 : FontWeight.w500,
                            color: unread ? _P.blue : _P.muted,
                          ),
                        ),
                      ],
                      if (unread) ...[
                        const SizedBox(width: 8),
                        Container(
                          constraints: const BoxConstraints(minWidth: 22),
                          height: 22,
                          padding: const EdgeInsets.symmetric(horizontal: 7),
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(colors: [_P.navy, _P.blue]),
                            borderRadius: BorderRadius.circular(11),
                          ),
                          child: Text(
                            c.unreadCount > 99 ? '99+' : '${c.unreadCount}',
                            style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800, color: Colors.white),
                          ),
                        ),
                      ],
                    ],
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

/// Bảng màu dùng chung với màn chat với nhà tour.
typedef _P = ProviderChatPalette;
