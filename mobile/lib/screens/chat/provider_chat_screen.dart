/// Màn chat với NHÀ TOUR (dùng trước khi mua tour).
///
/// ── Luồng ──
///  • Bấm nút "Chat với bên `Tên đối tác`" → màn này mở (hoặc
///  tạo) hội thoại với nhà tour đó và cho phép nhắn ngay.
///
/// ── Vì sao tách khỏi chat trong booking? ──
///  Chat gắn với Booking chỉ dùng được SAU khi đặt tour. Ở đây du khách hỏi
///  lịch trình / giá / thời gian ngay khi đang xem chi tiết tour.
library;

import 'dart:async';

import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';
import '../../core/models/provider_chat_model.dart';
import '../../core/services/api_client.dart';
import '../../core/services/provider_chat_service.dart';
import '../../core/services/realtime_service.dart';
import '../../core/services/token_storage.dart';

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
  int? _myUserId;

  bool _loading = true;
  bool _sending = false;
  String _error = '';

  StreamSubscription<RealtimeEvent>? _realtimeSub;

  @override
  void initState() {
    super.initState();
    _load();
    _listenRealtime();
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
      if (!mounted) return;
      setState(() {
        if (_messages.any((m) => m.id == message.id)) return;
        _messages = [..._messages, message];
      });
      _scrollToBottom();
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
      final messages = await _service.getMessages(conversation.id);

      if (!mounted) return;
      setState(() {
        _conversation = conversation;
        _messages = messages;
        _loading = false;
      });
      _scrollToBottom();
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.message;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _error = 'Không thể mở cuộc trò chuyện.';
        _loading = false;
      });
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scroll.hasClients) {
        _scroll.animateTo(
          _scroll.position.maxScrollExtent,
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _send() async {
    final text = _input.text.trim();
    final conversation = _conversation;
    if (text.isEmpty || conversation == null || _sending) return;

    setState(() => _sending = true);
    try {
      final message = await _service.sendMessage(conversation.id, text);
      if (!mounted) return;
      _input.clear();
      setState(() {
        _messages = [..._messages, message];
        _sending = false;
      });
      _scrollToBottom();
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _sending = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.message), behavior: SnackBarBehavior.floating),
      );
    }
  }

  bool _isMine(ProviderMessageModel m) => m.senderId == _myUserId;

  @override
  Widget build(BuildContext context) {
    final providerName =
        widget.providerName.isEmpty ? 'Nhà tour' : widget.providerName;
    return Scaffold(
      backgroundColor: AppCultureColors.background,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        centerTitle: false,
        iconTheme: const IconThemeData(color: AppCultureColors.textDark),
        titleSpacing: 0,
        title: Row(
          children: [
            Container(
              width: 38,
              height: 38,
              decoration: const BoxDecoration(
                shape: BoxShape.circle,
                color: AppCultureColors.jadeLight,
              ),
              child: const Icon(
                Icons.storefront_rounded,
                size: 20,
                color: AppCultureColors.heritageJade,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    providerName,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 15.5,
                      fontWeight: FontWeight.w700,
                      color: AppCultureColors.textDark,
                    ),
                  ),
                  Text(
                    widget.tourTitle ?? 'Hỗ trợ từ nhà tour',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 11.5,
                      color: AppCultureColors.textMuted,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
      body: Column(
        children: [
          Expanded(child: _buildBody()),
          _buildComposer(),
        ],
      ),
    );
  }

  Widget _buildBody() {
    if (_loading) {
      return const Center(
        child: CircularProgressIndicator(color: AppCultureColors.heritageJade),
      );
    }
    if (_error.isNotEmpty) {
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
              TextButton(onPressed: _load, child: const Text('Thử lại')),
            ],
          ),
        ),
      );
    }
    if (_messages.isEmpty) {
      return ListView(
        padding: const EdgeInsets.all(24),
        children: [
          const SizedBox(height: 40),
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: AppCultureColors.border),
            ),
            child: Column(
              children: [
                const Icon(
                  Icons.forum_rounded,
                  size: 34,
                  color: AppCultureColors.oceanBlue,
                ),
                const SizedBox(height: 10),
                Text(
                  'Hỏi ${widget.providerName.isEmpty ? 'nhà tour' : widget.providerName} về tour này',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: AppCultureColors.textDark,
                  ),
                ),
                const SizedBox(height: 6),
                const Text(
                  'Bạn có thể hỏi về lịch trình, giá, điều kiện thời tiết hoặc thủ tục đặt tour — '
                  'trước khi quyết định đặt vé.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 12.5,
                    height: 1.4,
                    color: AppCultureColors.textMuted,
                  ),
                ),
              ],
            ),
          ),
        ],
      );
    }

    return ListView.builder(
      controller: _scroll,
      padding: const EdgeInsets.fromLTRB(14, 14, 14, 8),
      itemCount: _messages.length,
      itemBuilder: (_, i) => _buildBubble(_messages[i]),
    );
  }

  Widget _buildBubble(ProviderMessageModel m) {
    final mine = _isMine(m);
    return Align(
      alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.76,
        ),
        decoration: BoxDecoration(
          color: mine ? AppCultureColors.heritageJade : Colors.white,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(16),
            topRight: const Radius.circular(16),
            bottomLeft: Radius.circular(mine ? 16 : 4),
            bottomRight: Radius.circular(mine ? 4 : 16),
          ),
          border: mine ? null : Border.all(color: AppCultureColors.border),
        ),
        child: Column(
          crossAxisAlignment:
              mine ? CrossAxisAlignment.end : CrossAxisAlignment.start,
          children: [
            Text(
              m.body,
              style: TextStyle(
                fontSize: 13.5,
                height: 1.4,
                color: mine ? Colors.white : AppCultureColors.textDark,
              ),
            ),
            const SizedBox(height: 3),
            Text(
              m.timeLabel,
              style: TextStyle(
                fontSize: 10.5,
                color: mine ? Colors.white70 : AppCultureColors.textLight,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildComposer() {
    return SafeArea(
      top: false,
      child: Container(
        padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
        decoration: const BoxDecoration(
          color: Colors.white,
          border: Border(top: BorderSide(color: AppCultureColors.border)),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Expanded(
              child: Container(
                constraints: const BoxConstraints(maxHeight: 120),
                decoration: BoxDecoration(
                  color: AppCultureColors.surfaceSubtle,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: AppCultureColors.border),
                ),
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                child: TextField(
                  controller: _input,
                  minLines: 1,
                  maxLines: 5,
                  textInputAction: TextInputAction.newline,
                  style: const TextStyle(
                    fontSize: 13.5,
                    color: AppCultureColors.textDark,
                  ),
                  decoration: const InputDecoration(
                    isDense: true,
                    border: InputBorder.none,
                    hintText: 'Nhắn tin cho nhà tour…',
                    hintStyle: TextStyle(
                      fontSize: 13.5,
                      color: AppCultureColors.textLight,
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 8),
            Material(
              color: AppCultureColors.heritageJade,
              shape: const CircleBorder(),
              child: InkWell(
                customBorder: const CircleBorder(),
                onTap: _sending ? null : _send,
                child: Padding(
                  padding: const EdgeInsets.all(11),
                  child: _sending
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Icon(
                          Icons.send_rounded,
                          size: 18,
                          color: Colors.white,
                        ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
