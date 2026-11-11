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
import 'provider_chat_screen.dart';

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
        _error = 'Không thể tải lịch sử hỗ trợ.';
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
        ? const Center(
            child: CircularProgressIndicator(color: AppCultureColors.heritageJade),
          )
        : _error.isNotEmpty
            ? _errorView()
            : _conversations.isEmpty
                ? _emptyView()
                : RefreshIndicator(
                    color: AppCultureColors.heritageJade,
                    onRefresh: _load,
                    child: ListView.separated(
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: const EdgeInsets.all(16),
                      itemCount: _conversations.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 10),
                      itemBuilder: (_, i) => _tile(_conversations[i]),
                    ),
                  );

    // Nhúng trong TabBarView ⇒ không dựng Scaffold/AppBar riêng.
    if (widget.embedded) return body;

    return Scaffold(
      backgroundColor: AppCultureColors.background,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        centerTitle: true,
        iconTheme: const IconThemeData(color: AppCultureColors.textDark),
        title: const Text(
          'Hỗ trợ từ nhà tour',
          style: TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.w700,
            color: AppCultureColors.textDark,
          ),
        ),
      ),
      body: body,
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
            TextButton(onPressed: _load, child: const Text('Thử lại')),
          ],
        ),
      ),
    );
  }

  Widget _emptyView() {
    return RefreshIndicator(
      color: AppCultureColors.heritageJade,
      onRefresh: _load,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(28),
        children: [
          const SizedBox(height: 60),
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: AppCultureColors.border),
            ),
            child: Column(
              children: [
                const Icon(
                  Icons.forum_rounded,
                  size: 38,
                  color: AppCultureColors.oceanBlue,
                ),
                const SizedBox(height: 12),
                const Text(
                  'Chưa có cuộc trò chuyện nào',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: AppCultureColors.textDark,
                  ),
                ),
                const SizedBox(height: 6),
                const Text(
                  'Mở chi tiết bất kỳ tour nào và bấm "Chat với bên …" để hỏi nhà tour '
                  'trước khi đặt vé. Lịch sử sẽ được lưu lại tại đây.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 12.5,
                    height: 1.45,
                    color: AppCultureColors.textMuted,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _tile(ProviderConversationModel c) {
    final unread = c.unreadCount > 0;
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(18),
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: () => _open(c),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: AppCultureColors.border),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppCultureColors.jadeLight,
                ),
                child: const Icon(
                  Icons.storefront_rounded,
                  size: 22,
                  color: AppCultureColors.heritageJade,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            c.counterpartName,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: unread
                                  ? FontWeight.w800
                                  : FontWeight.w700,
                              color: AppCultureColors.textDark,
                            ),
                          ),
                        ),
                        Text(
                          c.timeLabel,
                          style: const TextStyle(
                            fontSize: 11,
                            color: AppCultureColors.textLight,
                          ),
                        ),
                      ],
                    ),
                    if (c.tourTitle != null) ...[
                      const SizedBox(height: 2),
                      Text(
                        c.tourTitle!,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 11.5,
                          color: AppCultureColors.oceanBlue,
                        ),
                      ),
                    ],
                    const SizedBox(height: 4),
                    Text(
                      c.lastMessage ?? 'Chưa có tin nhắn nào',
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 12.5,
                        height: 1.35,
                        color: unread
                            ? AppCultureColors.textDark
                            : AppCultureColors.textMuted,
                        fontWeight: unread ? FontWeight.w600 : FontWeight.w400,
                      ),
                    ),
                  ],
                ),
              ),
              if (unread) ...[
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 7,
                    vertical: 3,
                  ),
                  decoration: BoxDecoration(
                    color: AppCultureColors.heritageJade,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    '${c.unreadCount}',
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
