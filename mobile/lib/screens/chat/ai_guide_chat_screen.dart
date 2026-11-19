import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/models/ai_guide_model.dart';
import '../../core/services/ai_guide_service.dart';
import '../../core/services/api_client.dart';
import '../common/ink.dart';

/// Màn hình / Bottom Sheet trò chuyện cùng Hướng dẫn viên ảo AI (RAG).
/// Hỗ trợ 2 chế độ:
/// - Normal Guide Mode (`taskId == null`): thuyết minh văn hóa, lịch sử gắn với điểm đến.
/// - Task Hint Mode (`taskId != null`): gợi ý tư duy khi du khách làm nhiệm vụ (không lộ đáp án).
class AiGuideChatScreen extends StatefulWidget {
  final int? destinationId;
  final String? destinationName;
  final int? taskId;
  final String? taskName;
  final String? initialSessionId;
  final bool isSheet;

  const AiGuideChatScreen({
    super.key,
    this.destinationId,
    this.destinationName,
    this.taskId,
    this.taskName,
    this.initialSessionId,
    this.isSheet = false,
  });

  /// Mở AI Virtual Guide dưới dạng Bottom Sheet nổi ngay trên màn hành trình/nhiệm vụ.
  static Future<void> showSheet(
    BuildContext context, {
    int? destinationId,
    String? destinationName,
    int? taskId,
    String? taskName,
  }) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (_) => FractionallySizedBox(
        heightFactor: 0.88,
        child: ClipRRect(
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          child: AiGuideChatScreen(
            destinationId: destinationId,
            destinationName: destinationName,
            taskId: taskId,
            taskName: taskName,
            isSheet: true,
          ),
        ),
      ),
    );
  }

  /// Mở AI Virtual Guide toàn màn hình.
  static Future<void> open(
    BuildContext context, {
    int? destinationId,
    String? destinationName,
    int? taskId,
    String? taskName,
    String? initialSessionId,
  }) {
    return Navigator.of(context).push<void>(
      MaterialPageRoute(
        builder: (_) => AiGuideChatScreen(
          destinationId: destinationId,
          destinationName: destinationName,
          taskId: taskId,
          taskName: taskName,
          initialSessionId: initialSessionId,
          isSheet: false,
        ),
      ),
    );
  }

  @override
  State<AiGuideChatScreen> createState() => _AiGuideChatScreenState();
}

class _AiGuideChatScreenState extends State<AiGuideChatScreen> {
  final AiGuideService _service = AiGuideService();
  final TextEditingController _inputCtrl = TextEditingController();
  final ScrollController _scrollCtrl = ScrollController();

  String? _sessionId;
  List<AiChatMessageModel> _messages = [];
  bool _loading = true;
  bool _sending = false;
  String? _error;

  bool get _isTaskHintMode => widget.taskId != null;

  List<String> get _suggestions => _isTaskHintMode
      ? const [
          'Gợi ý hướng quan sát cho tôi',
          'Tôi nên chú ý chi tiết nào quanh đây?',
          'Cho tôi một manh mối nhỏ nhé',
        ]
      : [
          if (widget.destinationName != null)
            'Kể cho tôi về lịch sử của ${widget.destinationName}'
          else
            'Giới thiệu nét văn hóa di sản nổi bật',
          'Kiến trúc nơi đây có điểm gì đặc sắc?',
          'Cần lưu ý gì khi tham quan điểm này?',
        ];

  @override
  void initState() {
    super.initState();
    _initSession(forceNew: false, targetSessionId: widget.initialSessionId);
  }

  @override
  void dispose() {
    _inputCtrl.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  Future<void> _initSession({bool forceNew = false, String? targetSessionId}) async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      String sid;
      if (targetSessionId != null && targetSessionId.isNotEmpty) {
        sid = targetSessionId;
      } else {
        final session = await _service.getOrCreateSession(
          destinationId: widget.destinationId,
          forceNew: forceNew,
        );
        sid = session.id;
      }
      final history = forceNew ? const <AiChatMessageModel>[] : await _service.getMessages(sid);
      if (!mounted) return;
      setState(() {
        _sessionId = sid;
        _messages = history;
        _loading = false;
      });
      _scrollToBottom();
    } on ApiException catch (e) {
      if (mounted) {
        setState(() {
          _error = e.message;
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _error = 'Không thể khởi tạo phiên trò chuyện AI.';
          _loading = false;
        });
      }
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollCtrl.hasClients) {
        _scrollCtrl.animateTo(
          _scrollCtrl.position.maxScrollExtent,
          duration: const Duration(milliseconds: 260),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _send([String? presetQuestion]) async {
    final text = (presetQuestion ?? _inputCtrl.text).trim();
    if (text.isEmpty || _sending) return;

    if (presetQuestion == null) {
      _inputCtrl.clear();
    }

    final optimisticUserMsg = AiChatMessageModel(
      id: 'local-${DateTime.now().millisecondsSinceEpoch}',
      sessionId: _sessionId ?? '',
      role: 'USER',
      content: text,
      createdAt: DateTime.now(),
    );

    setState(() {
      _sending = true;
      _error = null;
      _messages = [..._messages, optimisticUserMsg];
    });
    _scrollToBottom();

    try {
      final reply = await _service.sendMessage(
        sessionId: _sessionId,
        destinationId: widget.destinationId,
        taskId: widget.taskId,
        question: text,
      );
      if (!mounted) return;

      final aiMsg = AiChatMessageModel(
        id: reply.messageId,
        sessionId: reply.sessionId,
        role: 'ASSISTANT',
        content: reply.answer,
        createdAt: reply.createdAt ?? DateTime.now(),
        citations: reply.citations,
        mode: reply.mode,
      );

      setState(() {
        _sessionId = reply.sessionId;
        _messages = [..._messages, aiMsg];
        _sending = false;
      });
      _scrollToBottom();
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _sending = false;
        _error = e.message;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.message), behavior: SnackBarBehavior.floating),
      );
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _sending = false;
        _error = 'Không thể kết nối tới Hướng dẫn viên AI. Vui lòng thử lại.';
      });
    }
  }

  Future<void> _showSessionHistory() async {
    final selected = await showModalBottomSheet<String>(
      context: context,
      backgroundColor: AppCultureColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => _SessionHistorySheet(
        service: _service,
        currentSessionId: _sessionId,
      ),
    );
    if (selected != null && mounted) {
      if (selected == '__EMPTY__') {
        await _initSession(forceNew: true);
      } else {
        await _initSession(targetSessionId: selected);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.viewInsetsOf(context).bottom;
    return Scaffold(
      backgroundColor: AppInk.paper,
      appBar: _buildHeader(),
      body: Column(
        children: [
          _buildContextBanner(),
          Expanded(
            child: _loading
                ? const Center(
                    child: CircularProgressIndicator(color: AppCultureColors.heritageJade),
                  )
                : _messages.isEmpty
                    ? _buildEmptyState()
                    : ListView.builder(
                        controller: _scrollCtrl,
                        padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
                        itemCount: _messages.length + (_sending ? 1 : 0),
                        itemBuilder: (ctx, i) {
                          if (_sending && i == _messages.length) {
                            return _buildTypingBubble();
                          }
                          return _buildMessageBubble(_messages[i]);
                        },
                      ),
          ),
          if (_error != null)
            Container(
              margin: const EdgeInsets.fromLTRB(16, 0, 16, 6),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: AppCultureColors.lacquerLight,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  const Icon(Icons.error_outline_rounded, size: 16, color: AppCultureColors.lacquer),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _error!,
                      style: const TextStyle(fontSize: 12, color: AppCultureColors.lacquer, fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
              ),
            ),
          _buildComposer(bottomInset),
        ],
      ),
    );
  }

  PreferredSizeWidget _buildHeader() {
    return AppBar(
      backgroundColor: AppCultureColors.surface,
      surfaceTintColor: Colors.transparent,
      foregroundColor: AppInk.ink,
      elevation: 0,
      scrolledUnderElevation: 0.5,
      leading: widget.isSheet
          ? IconButton(
              icon: const Icon(Icons.close_rounded),
              tooltip: 'Đóng',
              onPressed: () => Navigator.of(context).pop(),
            )
          : null,
      title: Row(
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: _isTaskHintMode ? AppCultureColors.rewardBg : AppCultureColors.jadeLight,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(
              Icons.auto_awesome_rounded,
              size: 18,
              color: _isTaskHintMode ? AppCultureColors.gold : AppCultureColors.heritageJade,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _isTaskHintMode ? 'Trợ lý gợi ý AI' : 'Hướng dẫn viên AI',
                  style: const TextStyle(fontSize: 15.5, fontWeight: FontWeight.w700),
                ),
                Text(
                  'JourneyGo RAG Guide',
                  style: TextStyle(fontSize: 11, color: AppCultureColors.textMuted),
                ),
              ],
            ),
          ),
        ],
      ),
      actions: [
        IconButton(
          tooltip: 'Lịch sử phiên trò chuyện',
          icon: const Icon(Icons.history_rounded, size: 21),
          onPressed: _loading ? null : _showSessionHistory,
        ),
        IconButton(
          tooltip: 'Cuộc trò chuyện mới',
          icon: const Icon(Icons.add_comment_outlined, size: 20),
          onPressed: _loading || _sending ? null : () => _initSession(forceNew: true),
        ),
      ],
    );
  }

  Widget _buildContextBanner() {
    final bg = _isTaskHintMode ? AppCultureColors.rewardBg : AppCultureColors.jadeLight;
    final fg = _isTaskHintMode ? AppCultureColors.rewardText : AppCultureColors.heritageJade;
    final border = _isTaskHintMode ? AppCultureColors.rewardBorder : AppCultureColors.heritageJade.withValues(alpha: 0.25);

    final title = _isTaskHintMode
        ? (widget.taskName ?? 'Nhiệm vụ trải nghiệm')
        : (widget.destinationName ?? 'Hỏi đáp di sản toàn hành trình');
    final subtitle = _isTaskHintMode
        ? 'Chế độ gợi ý thông minh · Không tiết lộ đáp án'
        : 'Thuyết minh viên ảo dựa trên dữ liệu đã kiểm duyệt';

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: BoxDecoration(
        color: bg,
        border: Border(
          top: BorderSide(color: border),
          bottom: BorderSide(color: border),
        ),
      ),
      child: Row(
        children: [
          Icon(
            _isTaskHintMode ? Icons.lightbulb_rounded : Icons.location_on_rounded,
            size: 18,
            color: fg,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: fg),
                ),
                Text(
                  subtitle,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(fontSize: 11, color: fg.withValues(alpha: 0.85)),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 28, 20, 16),
      children: [
        Center(
          child: Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: _isTaskHintMode ? AppCultureColors.rewardBg : AppCultureColors.jadeLight,
              borderRadius: BorderRadius.circular(18),
            ),
            child: Icon(
              Icons.auto_awesome_rounded,
              size: 28,
              color: _isTaskHintMode ? AppCultureColors.gold : AppCultureColors.heritageJade,
            ),
          ),
        ),
        const SizedBox(height: 14),
        Text(
          _isTaskHintMode
              ? 'Cần manh mối cho thử thách?'
              : 'Xin chào! Tôi có thể giúp gì cho bạn?',
          textAlign: TextAlign.center,
          style: AppType.display(size: 19),
        ),
        const SizedBox(height: 6),
        Text(
          _isTaskHintMode
              ? 'Hãy hỏi tôi để nhận gợi ý quan sát hiện trường. Tôi sẽ dẫn dắt bạn tự tìm ra đáp án!'
              : 'Đặt câu hỏi về lịch sử, câu chuyện văn hóa, kiến trúc hoặc gợi ý khám phá tại điểm dừng.',
          textAlign: TextAlign.center,
          style: const TextStyle(fontSize: 13, height: 1.5, color: AppCultureColors.textMuted),
        ),
        const SizedBox(height: 20),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          alignment: WrapAlignment.center,
          children: _suggestions
              .map(
                (q) => ActionChip(
                  backgroundColor: AppCultureColors.surface,
                  side: const BorderSide(color: AppCultureColors.border),
                  label: Text(
                    q,
                    style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: AppCultureColors.textDark),
                  ),
                  avatar: const Icon(Icons.auto_awesome_rounded, size: 15, color: AppCultureColors.heritageJade),
                  onPressed: () => _send(q),
                ),
              )
              .toList(),
        ),
      ],
    );
  }

  Widget _buildMessageBubble(AiChatMessageModel msg) {
    final isUser = msg.isUser;
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        mainAxisAlignment: isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (!isUser) ...[
            Container(
              width: 28,
              height: 28,
              margin: const EdgeInsets.only(top: 2, right: 8),
              decoration: BoxDecoration(
                color: AppCultureColors.jadeLight,
                borderRadius: BorderRadius.circular(9),
              ),
              child: const Icon(Icons.auto_awesome_rounded, size: 15, color: AppCultureColors.heritageJade),
            ),
          ],
          Flexible(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
              decoration: BoxDecoration(
                color: isUser ? AppCultureColors.heritageJade : AppCultureColors.surface,
                borderRadius: BorderRadius.only(
                  topLeft: const Radius.circular(16),
                  topRight: const Radius.circular(16),
                  bottomLeft: Radius.circular(isUser ? 16 : 4),
                  bottomRight: Radius.circular(isUser ? 4 : 16),
                ),
                border: isUser ? null : Border.all(color: AppCultureColors.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    msg.content,
                    style: TextStyle(
                      fontSize: 14,
                      height: 1.5,
                      color: isUser ? Colors.white : AppCultureColors.textDark,
                    ),
                  ),
                  if (!isUser && msg.citations.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 6,
                      runSpacing: 4,
                      children: msg.citations
                          .map(
                            (cite) => Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: AppCultureColors.surfaceSubtle,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(Icons.menu_book_rounded, size: 11, color: AppCultureColors.textMuted),
                                  const SizedBox(width: 4),
                                  Flexible(
                                    child: Text(
                                      cite,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w600,
                                        color: AppCultureColors.textMuted,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          )
                          .toList(),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTypingBubble() {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Container(
            width: 28,
            height: 28,
            margin: const EdgeInsets.only(right: 8),
            decoration: BoxDecoration(
              color: AppCultureColors.jadeLight,
              borderRadius: BorderRadius.circular(9),
            ),
            child: const Icon(Icons.auto_awesome_rounded, size: 15, color: AppCultureColors.heritageJade),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: AppCultureColors.surface,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppCultureColors.border),
            ),
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                SizedBox(
                  width: 14,
                  height: 14,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: AppCultureColors.heritageJade,
                  ),
                ),
                SizedBox(width: 8),
                Text(
                  'AI đang suy nghĩ...',
                  style: TextStyle(fontSize: 12.5, color: AppCultureColors.textMuted, fontWeight: FontWeight.w600),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildComposer(double bottomInset) {
    return Container(
      padding: EdgeInsets.fromLTRB(12, 8, 12, (widget.isSheet ? 12 : 16) + bottomInset),
      decoration: const BoxDecoration(
        color: AppCultureColors.surface,
        border: Border(top: BorderSide(color: AppCultureColors.border)),
      ),
      child: SafeArea(
        top: false,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Expanded(
              child: TextField(
                controller: _inputCtrl,
                maxLines: 4,
                minLines: 1,
                maxLength: 1000,
                textInputAction: TextInputAction.send,
                onSubmitted: (_) => _send(),
                decoration: InputDecoration(
                  counterText: '',
                  hintText: _isTaskHintMode
                      ? 'Hỏi gợi ý cho nhiệm vụ...'
                      : 'Hỏi về lịch sử, kiến trúc điểm đến...',
                  hintStyle: const TextStyle(fontSize: 13.5, color: AppCultureColors.textLight),
                  filled: true,
                  fillColor: AppCultureColors.background,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(20),
                    borderSide: const BorderSide(color: AppCultureColors.border),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(20),
                    borderSide: const BorderSide(color: AppCultureColors.border),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(20),
                    borderSide: const BorderSide(color: AppCultureColors.heritageJade),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 8),
            SizedBox(
              width: 44,
              height: 44,
              child: FilledButton(
                style: FilledButton.styleFrom(
                  padding: EdgeInsets.zero,
                  backgroundColor: AppCultureColors.heritageJade,
                  shape: const CircleBorder(),
                ),
                onPressed: _sending ? null : () => _send(),
                child: const Icon(Icons.send_rounded, size: 19, color: Colors.white),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SessionHistorySheet extends StatefulWidget {
  final AiGuideService service;
  final String? currentSessionId;

  const _SessionHistorySheet({required this.service, this.currentSessionId});

  @override
  State<_SessionHistorySheet> createState() => _SessionHistorySheetState();
}

class _SessionHistorySheetState extends State<_SessionHistorySheet> {
  List<AiChatSessionModel> _sessions = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final list = await widget.service.getSessions(page: 0, size: 25);
      if (mounted) {
        setState(() {
          _sessions = list;
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _delete(String id) async {
    try {
      await widget.service.deleteSession(id);
      if (!mounted) return;
      final updated = _sessions.where((s) => s.id != id).toList();
      setState(() => _sessions = updated);
      if (id == widget.currentSessionId && updated.isEmpty) {
        Navigator.of(context).pop('__EMPTY__');
      }
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text('Lịch sử trò chuyện AI', style: AppType.display(size: 18)),
                const Spacer(),
                IconButton(
                  icon: const Icon(Icons.close_rounded),
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ],
            ),
            const SizedBox(height: 8),
            if (_loading)
              const Padding(
                padding: EdgeInsets.all(24),
                child: Center(child: CircularProgressIndicator(color: AppCultureColors.heritageJade)),
              )
            else if (_sessions.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 24),
                child: Center(
                  child: Text('Chưa có phiên trò chuyện nào.', style: TextStyle(color: AppCultureColors.textMuted)),
                ),
              )
            else
              ConstrainedBox(
                constraints: const BoxConstraints(maxHeight: 360),
                child: ListView.separated(
                  shrinkWrap: true,
                  itemCount: _sessions.length,
                  separatorBuilder: (_, _) => const Divider(height: 1, color: AppCultureColors.borderLight),
                  itemBuilder: (_, i) {
                    final s = _sessions[i];
                    final active = s.id == widget.currentSessionId;
                    return ListTile(
                      selected: active,
                      selectedTileColor: AppCultureColors.jadeLight.withValues(alpha: 0.45),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      leading: Icon(
                        Icons.chat_bubble_outline_rounded,
                        size: 20,
                        color: active ? AppCultureColors.heritageJade : AppCultureColors.textMuted,
                      ),
                      title: Text(
                        s.lastMessagePreview?.isNotEmpty == true
                            ? s.lastMessagePreview!
                            : (s.currentDestinationId != null ? 'Điểm đến #${s.currentDestinationId}' : 'Hỏi đáp chung'),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600),
                      ),
                      subtitle: Text(
                        '${s.messageCount} tin nhắn',
                        style: const TextStyle(fontSize: 11.5, color: AppCultureColors.textMuted),
                      ),
                      trailing: IconButton(
                        icon: const Icon(Icons.delete_outline_rounded, size: 19, color: AppCultureColors.textLight),
                        onPressed: () => _delete(s.id),
                      ),
                      onTap: () => Navigator.of(context).pop(s.id),
                    );
                  },
                ),
              ),
          ],
        ),
      ),
    );
  }
}
