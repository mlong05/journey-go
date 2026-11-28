import 'dart:async';
import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/models/ai_guide_model.dart';
import '../../core/services/ai_guide_service.dart';
import '../../core/services/api_client.dart';
import '../../l10n/locale_controller.dart';
import '../common/ai_mascot.dart';
import '../common/heritage_motion.dart';
import '../common/ink.dart';
import '../tours/tour_detail_opener.dart';

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
  final String? initialPrompt;
  final bool isSheet;

  const AiGuideChatScreen({
    super.key,
    this.destinationId,
    this.destinationName,
    this.taskId,
    this.taskName,
    this.initialSessionId,
    this.initialPrompt,
    this.isSheet = false,
  });

  /// Mở AI Virtual Guide dưới dạng Bottom Sheet nổi ngay trên màn hành trình/nhiệm vụ.
  static Future<void> showSheet(
    BuildContext context, {
    int? destinationId,
    String? destinationName,
    int? taskId,
    String? taskName,
    String? initialPrompt,
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
            initialPrompt: initialPrompt,
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
  AiChatSessionModel? _session;
  List<AiChatMessageModel> _messages = [];
  bool _loading = true;
  bool _sending = false;
  bool _handoffLoading = false;
  String? _error;
  Timer? _pollTimer;

  bool get _isTaskHintMode => widget.taskId != null;
  String get _handoffStatus => _session?.handoffStatus ?? 'AI_ACTIVE';
  bool get _isWaitingHuman => _handoffStatus.toUpperCase() == 'WAITING_HUMAN';
  bool get _isHumanActive => _handoffStatus.toUpperCase() == 'HUMAN_ACTIVE';
  bool get _isLiveQueue => _isWaitingHuman || _isHumanActive;

  List<String> _suggestions(BuildContext context) {
    final l10n = context.l10n;
    return _isTaskHintMode
        ? [
            l10n.aiSuggestHint1,
            l10n.aiSuggestHint2,
            l10n.aiSuggestHint3,
          ]
        : [
            if (widget.destinationName != null)
              l10n.aiSuggestDestHistory(widget.destinationName!)
            else
              l10n.aiSuggestHeritage,
            l10n.aiSuggestArchitecture,
            l10n.aiSuggestVisitTips,
          ];
  }

  @override
  void initState() {
    super.initState();
    if (widget.initialPrompt != null && widget.initialPrompt!.trim().isNotEmpty) {
      _inputCtrl.text = widget.initialPrompt!.trim();
    }
    _initSession(forceNew: false, targetSessionId: widget.initialSessionId);
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _inputCtrl.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  void _syncPolling() {
    _pollTimer?.cancel();
    _pollTimer = null;
    final sid = _sessionId;
    if (!mounted || !_isLiveQueue || sid == null || sid.isEmpty) return;

    _pollTimer = Timer.periodic(const Duration(seconds: 4), (_) {
      _pollLiveSession();
    });
  }

  Future<void> _pollLiveSession() async {
    final sid = _sessionId;
    if (!mounted || sid == null || sid.isEmpty || _handoffLoading) return;
    try {
      final results = await Future.wait<dynamic>([
        _service.getSession(sid),
        _service.getMessages(sid),
      ]);
      if (!mounted) return;
      final updatedSession = results[0] as AiChatSessionModel;
      final updatedMessages = results[1] as List<AiChatMessageModel>;
      final grew = updatedMessages.length > _messages.length;

      setState(() {
        _session = updatedSession;
        _messages = updatedMessages;
      });
      if (grew) _scrollToBottom();
      if (!updatedSession.isLiveQueue) {
        _pollTimer?.cancel();
        _pollTimer = null;
      }
    } catch (_) {
      // Giữ trạng thái hiện tại nếu lỗi mạng tạm thời khi polling
    }
  }

  Future<void> _initSession({bool forceNew = false, String? targetSessionId}) async {
    _pollTimer?.cancel();
    _pollTimer = null;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final AiChatSessionModel session;
      if (targetSessionId != null && targetSessionId.isNotEmpty) {
        session = await _service.getSession(targetSessionId);
      } else {
        session = await _service.getOrCreateSession(
          destinationId: widget.destinationId,
          forceNew: forceNew,
        );
      }
      final history = forceNew
          ? const <AiChatMessageModel>[]
          : await _service.getMessages(session.id);
      if (!mounted) return;
      setState(() {
        _session = session;
        _sessionId = session.id;
        _messages = history;
        _loading = false;
      });
      _syncPolling();
      // Mở lại cuộc trò chuyện cũ ⇒ vào thẳng tin nhắn mới nhất (không cuộn từ đầu xuống)
      _scrollToBottom(animate: false);
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
          _error = context.l10n.aiErrInit;
          _loading = false;
        });
      }
    }
  }

  Future<void> _requestHumanSupport() async {
    if (_handoffLoading || _loading) return;
    setState(() {
      _handoffLoading = true;
      _error = null;
    });
    try {
      var sid = _sessionId;
      if (sid == null || sid.isEmpty) {
        final created = await _service.getOrCreateSession(
          destinationId: widget.destinationId,
          forceNew: false,
        );
        sid = created.id;
        _session = created;
        _sessionId = sid;
      }

      final updated = await _service.requestHumanSupport(sid);
      final list = await _service.getMessages(sid);
      if (!mounted) return;
      setState(() {
        _session = updated;
        _messages = list;
        _handoffLoading = false;
      });
      _syncPolling();
      _scrollToBottom();
    } on ApiException catch (e) {
      if (mounted) {
        setState(() {
          _handoffLoading = false;
          _error = e.message;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _handoffLoading = false;
          _error = context.l10n.aiErrRequestHuman;
        });
      }
    }
  }

  Future<void> _returnToAi() async {
    final sid = _sessionId;
    if (sid == null || sid.isEmpty || _handoffLoading) return;
    setState(() {
      _handoffLoading = true;
      _error = null;
    });
    try {
      final updated = await _service.returnToAi(sid);
      final list = await _service.getMessages(sid);
      if (!mounted) return;
      setState(() {
        _session = updated;
        _messages = list;
        _handoffLoading = false;
      });
      _syncPolling();
      _scrollToBottom();
    } on ApiException catch (e) {
      if (mounted) {
        setState(() {
          _handoffLoading = false;
          _error = e.message;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _handoffLoading = false;
          _error = context.l10n.aiErrReturnAi;
        });
      }
    }
  }

  void _handleReturnToAiPressed() {
    if (_handoffLoading || !_isLiveQueue) return;
    _showReturnToAiDialog();
  }

  Future<void> _showReturnToAiDialog() async {
    final l10n = context.l10n;
    final isHumanActive = _isHumanActive;
    final title = isHumanActive ? l10n.aiEndHumanTitle : l10n.aiCancelWaitTitle;
    final message = isHumanActive ? l10n.aiEndHumanBody : l10n.aiCancelWaitBody;
    final primaryLabel = isHumanActive ? l10n.aiKeepChatting : l10n.aiKeepWaiting;
    final confirmLabel = isHumanActive ? l10n.aiEndAndReturnAi : l10n.aiCancelAndReturnAi;
    final iconData = isHumanActive ? Icons.support_agent_rounded : Icons.hourglass_top_rounded;
    final iconColor = isHumanActive ? AppCultureColors.oceanBlue : AppCultureColors.warning;

    var submitting = false;
    await showDialog<void>(
      context: context,
      barrierDismissible: true,
      builder: (dialogCtx) => StatefulBuilder(
        builder: (ctx, setDialogState) => PopScope(
          canPop: !submitting,
          child: AlertDialog(
            backgroundColor: AppCultureColors.surface,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
            title: Row(
              children: [
                Icon(iconData, color: iconColor, size: 22),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    title,
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                  ),
                ),
              ],
            ),
            content: Text(
              message,
              style: const TextStyle(fontSize: 13.5, height: 1.5, color: AppCultureColors.textMuted),
            ),
            actionsPadding: const EdgeInsets.fromLTRB(16, 0, 16, 14),
            actions: [
              TextButton(
                onPressed: submitting
                    ? null
                    : () async {
                        setDialogState(() => submitting = true);
                        await _returnToAi();
                        if (ctx.mounted) {
                          Navigator.of(ctx).pop();
                        }
                      },
                style: TextButton.styleFrom(foregroundColor: AppCultureColors.lacquer),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (submitting) ...[
                      const SizedBox(
                        width: 13,
                        height: 13,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: AppCultureColors.lacquer,
                        ),
                      ),
                      const SizedBox(width: 6),
                    ],
                    Text(
                      confirmLabel,
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                  ],
                ),
              ),
              FilledButton(
                onPressed: submitting ? null : () => Navigator.of(ctx).pop(),
                style: FilledButton.styleFrom(
                  backgroundColor: AiPalette.indigo,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                child: Text(
                  primaryLabel,
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// Luôn đưa tin nhắn mới nhất xuống đáy màn hình.
  /// Chờ 2 khung hình: câu trả lời dài / ảnh / bàn phím làm `maxScrollExtent` đổi sau lần dựng đầu.
  /// Ở rất xa (mở lịch sử dài) thì nhảy thẳng, gần thì cuộn mượt.
  void _scrollToBottom({bool animate = true}) {
    void go() {
      if (!mounted || !_scrollCtrl.hasClients) return;
      final pos = _scrollCtrl.position;
      final target = pos.maxScrollExtent;
      if (!animate || (target - pos.pixels).abs() > 2000) {
        _scrollCtrl.jumpTo(target);
      } else {
        _scrollCtrl.animateTo(target, duration: const Duration(milliseconds: 280), curve: Curves.easeOutCubic);
      }
    }

    WidgetsBinding.instance.addPostFrameCallback((_) {
      go();
      WidgetsBinding.instance.addPostFrameCallback((_) => go());
    });
  }

  /// Bàn phím bật lên ⇒ giữ tin nhắn cuối ngay trên ô nhập.
  double _lastInset = 0;

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

      final nextSession = (_session ??
              AiChatSessionModel(
                id: reply.sessionId,
                userId: 0,
                currentDestinationId: widget.destinationId,
              ))
          .copyWith(id: reply.sessionId, handoffStatus: reply.handoffStatus);

      final hasAiAnswer = reply.answer.trim().isNotEmpty;
      final aiMsg = hasAiAnswer
          ? AiChatMessageModel(
              id: reply.messageId,
              sessionId: reply.sessionId,
              role: 'ASSISTANT',
              content: reply.answer,
              senderName: context.l10n.aiSenderName,
              senderRole: 'AI',
              createdAt: reply.createdAt ?? DateTime.now(),
              citations: reply.citations,
              mode: reply.mode,
            )
          : null;

      setState(() {
        _session = nextSession;
        _sessionId = reply.sessionId;
        if (aiMsg != null) {
          _messages = [..._messages, aiMsg];
        }
        _sending = false;
      });
      _syncPolling();
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
        _error = context.l10n.aiErrSend;
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
    if (bottomInset > _lastInset && _messages.isNotEmpty) _scrollToBottom(animate: false);
    _lastInset = bottomInset;
    return Scaffold(
      backgroundColor: const Color(0xFFF7F7FB),
      // Ô nhập đã tự đệm đúng chiều cao bàn phím (_buildComposer). Nếu Scaffold cũng thu nhỏ thân thì
      // bàn phím bị trừ hai lần ⇒ khung chat chỉ còn vài chục px và báo "BOTTOM OVERFLOWED".
      resizeToAvoidBottomInset: false,
      appBar: _buildHeader(),
      body: Column(
        children: [
          _buildContextBanner(),
          Expanded(
            child: _loading
                ? const Center(
                    child: CircularProgressIndicator(color: AiPalette.indigo),
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
    final l10n = context.l10n;
    return AppBar(
      backgroundColor: AppCultureColors.surface,
      surfaceTintColor: Colors.transparent,
      foregroundColor: AppInk.ink,
      elevation: 0,
      scrolledUnderElevation: 0.5,
      leading: widget.isSheet
          ? IconButton(
              icon: const Icon(Icons.close_rounded),
              tooltip: l10n.commonClose,
              onPressed: () => Navigator.of(context).pop(),
            )
          : null,
      bottom: const PreferredSize(
        preferredSize: Size.fromHeight(1),
        child: Divider(height: 1, thickness: 1, color: AiPalette.line),
      ),
      title: Row(
        children: [
          // Linh vật AI (cùng nút AI ở trang chủ) — chuyển động nhẹ
          const AiMascot(size: 36),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _isTaskHintMode ? l10n.aiHeaderHintTitle : l10n.aiHeaderGuideTitle,
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
          tooltip: l10n.aiHistoryTooltip,
          icon: const Icon(Icons.history_rounded, size: 21),
          onPressed: _loading ? null : _showSessionHistory,
        ),
        IconButton(
          tooltip: l10n.aiNewChatTooltip,
          icon: const Icon(Icons.add_comment_outlined, size: 20),
          onPressed: _loading || _sending ? null : () => _initSession(forceNew: true),
        ),
      ],
    );
  }

  Widget _buildContextBanner() {
    final l10n = context.l10n;
    final Color bg;
    final Color fg;
    final Color border;
    final IconData leadingIcon;
    final String title;
    final String subtitle;

    if (_isHumanActive) {
      final isAdmin = (_session?.assignedStaffRole ?? '').toUpperCase() == 'ADMIN';
      final roleLabel = isAdmin ? 'Admin' : 'Moderator';
      final staffName = (_session?.assignedStaffName ?? '').trim();
      bg = AppCultureColors.oceanLight;
      fg = AppCultureColors.oceanBlue;
      border = AppCultureColors.oceanBlue.withValues(alpha: 0.25);
      leadingIcon = Icons.support_agent_rounded;
      title = staffName.isNotEmpty ? l10n.aiChattingWithStaff(roleLabel, staffName) : l10n.aiChattingWithRole(roleLabel);
      subtitle = l10n.aiHumanSubtitle;
    } else if (_isWaitingHuman) {
      bg = AppCultureColors.warningLight;
      fg = AppCultureColors.warning;
      border = AppCultureColors.rewardBorder;
      leadingIcon = Icons.hourglass_top_rounded;
      title = l10n.aiWaitingTitle;
      subtitle = l10n.aiWaitingSubtitle;
    } else {
      bg = _isTaskHintMode ? AppCultureColors.rewardBg : AiPalette.softer;
      fg = _isTaskHintMode ? AppCultureColors.rewardText : AiPalette.indigo;
      border = _isTaskHintMode ? AppCultureColors.rewardBorder : AiPalette.line;
      leadingIcon = _isTaskHintMode ? Icons.lightbulb_rounded : Icons.location_on_rounded;
      title = _isTaskHintMode
          ? (widget.taskName ?? l10n.aiDefaultTaskName)
          : (widget.destinationName ?? l10n.aiDefaultDestName);
      subtitle = _isTaskHintMode ? l10n.aiHintBannerSubtitle : l10n.aiGuideBannerSubtitle;
    }

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
      decoration: BoxDecoration(
        color: bg,
        border: Border(
          top: BorderSide(color: border),
          bottom: BorderSide(color: border),
        ),
      ),
      child: Row(
        children: [
          Icon(leadingIcon, size: 18, color: fg),
          const SizedBox(width: 9),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: fg),
                ),
                Text(
                  subtitle,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(fontSize: 10.5, color: fg.withValues(alpha: 0.85)),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          if (_isLiveQueue)
            OutlinedButton.icon(
              onPressed: _handoffLoading ? null : _handleReturnToAiPressed,
              style: OutlinedButton.styleFrom(
                foregroundColor: AppCultureColors.textDark,
                backgroundColor: Colors.white,
                side: const BorderSide(color: AppCultureColors.border),
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                minimumSize: const Size(0, 32),
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              icon: _handoffLoading
                  ? const SizedBox(
                      width: 12,
                      height: 12,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.restart_alt_rounded, size: 15),
              label: Text(l10n.aiReturnToAiBtn, style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700)),
            )
          else
            OutlinedButton.icon(
              onPressed: (_handoffLoading || _loading) ? null : _requestHumanSupport,
              style: OutlinedButton.styleFrom(
                foregroundColor: AppCultureColors.oceanBlue,
                backgroundColor: AppCultureColors.oceanLight,
                side: BorderSide(color: AppCultureColors.oceanBlue.withValues(alpha: 0.3)),
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                minimumSize: const Size(0, 32),
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              icon: _handoffLoading
                  ? const SizedBox(
                      width: 12,
                      height: 12,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.support_agent_rounded, size: 15),
              label: Text(l10n.aiChatHumanBtn, style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700)),
            ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    final l10n = context.l10n;
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 28, 20, 16),
      children: [
        const SizedBox(height: 8),
        const Center(child: AiMascot(size: 76, pulseRing: true)),
        const SizedBox(height: 22),
        Text(
          _isTaskHintMode ? l10n.aiEmptyHintTitle : l10n.aiEmptyGuideTitle,
          textAlign: TextAlign.center,
          style: AppType.display(size: 19),
        ),
        const SizedBox(height: 6),
        Text(
          _isTaskHintMode ? l10n.aiEmptyHintBody : l10n.aiEmptyGuideBody,
          textAlign: TextAlign.center,
          style: const TextStyle(fontSize: 13, height: 1.5, color: AppCultureColors.textMuted),
        ),
        const SizedBox(height: 20),
        if (!_isLiveQueue)
          // Gợi ý câu hỏi: thẻ trắng viền chàm, nhấn thu nhỏ nhẹ + gợn sóng
          for (final q in _suggestions(context))
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Pressable(
                onTap: () => _send(q),
                child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AiPalette.line),
                        boxShadow: [
                          BoxShadow(color: AiPalette.indigo.withValues(alpha: 0.06), blurRadius: 12, offset: const Offset(0, 4)),
                        ],
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 30,
                            height: 30,
                            decoration: BoxDecoration(color: AiPalette.soft, borderRadius: BorderRadius.circular(9)),
                            child: const Icon(Icons.chat_bubble_outline_rounded, size: 16, color: AiPalette.indigo),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              q,
                              style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600, color: AiPalette.ink),
                            ),
                          ),
                          const Icon(Icons.arrow_forward_rounded, size: 18, color: AiPalette.violet),
                        ],
                      ),
                    ),
              ),
            ),
      ],
    );
  }

  Widget _buildMessageBubble(AiChatMessageModel msg) {
    if (msg.isSystem) {
      return Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: Center(
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: AppCultureColors.surfaceSubtle,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: AppCultureColors.border),
            ),
            child: Text(
              msg.content,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 11.5,
                fontWeight: FontWeight.w600,
                color: AppCultureColors.textMuted,
              ),
            ),
          ),
        ),
      );
    }

    final isUser = msg.isUser;
    final isHuman = !isUser && msg.isHumanAgent;
    final isAdmin = isHuman && msg.isAdminSender;
    final parsed = isUser ? null : _parseAiMessage(msg.content);

    final Color avatarBg = isAdmin
        ? AppCultureColors.lacquerLight
        : isHuman
            ? AppCultureColors.oceanLight
            : AiPalette.soft;
    final Color avatarFg = isAdmin
        ? AppCultureColors.lacquer
        : isHuman
            ? AppCultureColors.oceanBlue
            : AiPalette.indigo;
    final IconData avatarIcon = isAdmin
        ? Icons.verified_user_rounded
        : isHuman
            ? Icons.support_agent_rounded
            : Icons.auto_awesome_rounded;

    final Color incomingBubbleBg = isAdmin
        ? const Color(0xFFFFF5F6)
        : isHuman
            ? const Color(0xFFF6F7FE)
            : AppCultureColors.surface;
    final Color incomingBorderColor = isAdmin
        ? AppCultureColors.lacquer.withValues(alpha: 0.25)
        : isHuman
            ? AppCultureColors.oceanBlue.withValues(alpha: 0.25)
            : AppCultureColors.border;

    final String senderLabel = isHuman
        ? '${isAdmin ? 'Admin' : 'Moderator'}${msg.senderName?.trim().isNotEmpty == true ? ' · ${msg.senderName!.trim()}' : ''}'
        : (msg.senderName?.trim().isNotEmpty == true ? msg.senderName!.trim() : context.l10n.aiSenderName);

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        mainAxisAlignment: isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (!isUser) ...[
            // AI: linh vật đứng yên (đỡ rối mắt khi nhiều tin nhắn); Moderator/Admin: biểu tượng riêng
            if (!isHuman)
              const Padding(
                padding: EdgeInsets.only(top: 2, right: 8),
                child: AiMascot(size: 30, animated: false),
              )
            else
              Container(
                width: 30,
                height: 30,
                margin: const EdgeInsets.only(top: 2, right: 8),
                decoration: BoxDecoration(
                  color: avatarBg,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(avatarIcon, size: 16, color: avatarFg),
              ),
          ],
          Flexible(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
              decoration: BoxDecoration(
                color: isUser ? null : incomingBubbleBg,
                // Tin của du khách: nền chàm → tím (đồng bộ màu thương hiệu AI)
                gradient: isUser
                    ? const LinearGradient(
                        colors: [AiPalette.indigo, AiPalette.violet],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      )
                    : null,
                boxShadow: [
                  BoxShadow(
                    color: (isUser ? AiPalette.indigo : AiPalette.ink).withValues(alpha: isUser ? 0.18 : 0.04),
                    blurRadius: 10,
                    offset: const Offset(0, 3),
                  ),
                ],
                borderRadius: BorderRadius.only(
                  topLeft: const Radius.circular(16),
                  topRight: const Radius.circular(16),
                  bottomLeft: Radius.circular(isUser ? 16 : 4),
                  bottomRight: Radius.circular(isUser ? 4 : 16),
                ),
                border: isUser ? null : Border.all(color: incomingBorderColor),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (!isUser) ...[
                    Wrap(
                      spacing: 6,
                      runSpacing: 4,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: avatarBg,
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(avatarIcon, size: 11, color: avatarFg),
                              const SizedBox(width: 4),
                              Text(
                                senderLabel,
                                style: TextStyle(
                                  fontSize: 10.5,
                                  fontWeight: FontWeight.w700,
                                  color: avatarFg,
                                ),
                              ),
                            ],
                          ),
                        ),
                        if (isHuman)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(color: incomingBorderColor),
                            ),
                            child: Text(
                              context.l10n.aiHumanBadge,
                              style: TextStyle(
                                fontSize: 9.5,
                                fontWeight: FontWeight.w800,
                                letterSpacing: 0.3,
                                color: avatarFg,
                              ),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 6),
                  ],
                  Text(
                    isUser ? msg.content : parsed!.displayText,
                    style: TextStyle(
                      fontSize: 14,
                      height: 1.5,
                      color: isUser ? Colors.white : AppCultureColors.textDark,
                    ),
                  ),
                  if (!isUser && parsed!.tourLinks.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: parsed.tourLinks
                          .map(
                            (ref) => Material(
                              color: AiPalette.softer,
                              borderRadius: BorderRadius.circular(10),
                              child: InkWell(
                                borderRadius: BorderRadius.circular(10),
                                onTap: () => openTourDetailScreen(context, tourId: ref.tourId),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
                                  decoration: BoxDecoration(
                                    borderRadius: BorderRadius.circular(10),
                                    border: Border.all(
                                      color: AiPalette.indigo.withValues(alpha: 0.35),
                                    ),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      const Icon(
                                        Icons.travel_explore_rounded,
                                        size: 14,
                                        color: AiPalette.indigo,
                                      ),
                                      const SizedBox(width: 5),
                                      Flexible(
                                        child: Text(
                                          ref.label,
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: const TextStyle(
                                            fontSize: 12,
                                            fontWeight: FontWeight.w700,
                                            color: AiPalette.indigo,
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 4),
                                      const Icon(
                                        Icons.arrow_forward_ios_rounded,
                                        size: 11,
                                        color: AiPalette.indigo,
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          )
                          .toList(),
                    ),
                  ],
                  if (!isUser && !isHuman && msg.citations.isNotEmpty) ...[
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
          // Đang soạn: linh vật chuyển động + ba chấm nhảy
          const Padding(
            padding: EdgeInsets.only(right: 8),
            child: AiMascot(size: 30),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AiPalette.line),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const AiTypingDots(),
                const SizedBox(width: 10),
                Text(
                  _isLiveQueue ? context.l10n.aiSendingMessage : context.l10n.aiThinking,
                  style: const TextStyle(fontSize: 12.5, color: AppCultureColors.textMuted, fontWeight: FontWeight.w600),
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
        border: Border(top: BorderSide(color: AiPalette.line)),
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
                  hintText: _isLiveQueue
                      ? context.l10n.aiInputHintHuman
                      : _isTaskHintMode
                          ? context.l10n.aiInputHintTask
                          : context.l10n.aiInputHintGuide,
                  hintStyle: const TextStyle(fontSize: 13.5, color: AppCultureColors.textLight),
                  filled: true,
                  fillColor: const Color(0xFFF7F7FB),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 11),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(22),
                    borderSide: const BorderSide(color: AiPalette.line),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(22),
                    borderSide: const BorderSide(color: AiPalette.line),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(22),
                    borderSide: const BorderSide(color: AiPalette.indigo, width: 1.5),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 8),
            // Nút gửi: tròn chàm → tím, nhấn thu nhỏ; đang gửi thì mờ đi
            Pressable(
              onTap: _sending ? null : () => _send(),
              child: AnimatedOpacity(
                duration: const Duration(milliseconds: 180),
                opacity: _sending ? 0.45 : 1,
                child: Container(
                  width: 46,
                  height: 46,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: const LinearGradient(
                      colors: [AiPalette.indigo, AiPalette.violet],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    boxShadow: [
                      BoxShadow(color: AiPalette.indigo.withValues(alpha: 0.3), blurRadius: 12, offset: const Offset(0, 4)),
                    ],
                  ),
                  child: const Icon(Icons.send_rounded, size: 20, color: Colors.white),
                ),
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
    final l10n = context.l10n;
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(l10n.aiHistoryTitle, style: AppType.display(size: 18)),
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
                child: Center(child: CircularProgressIndicator(color: AiPalette.indigo)),
              )
            else if (_sessions.isEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 24),
                child: Center(
                  child: Text(l10n.aiHistoryEmpty, style: const TextStyle(color: AppCultureColors.textMuted)),
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
                    final statusLabel = s.isWaitingHuman
                        ? l10n.aiStatusWaiting
                        : s.isHumanActive
                            ? l10n.aiStatusLive
                            : 'AI Guide';
                    return ListTile(
                      selected: active,
                      selectedTileColor: AiPalette.soft.withValues(alpha: 0.45),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      leading: Icon(
                        Icons.chat_bubble_outline_rounded,
                        size: 20,
                        color: active ? AiPalette.indigo : AppCultureColors.textMuted,
                      ),
                      title: Text(
                        s.lastMessagePreview?.isNotEmpty == true
                            ? s.lastMessagePreview!
                            : (s.currentDestinationId != null
                                ? l10n.aiDestinationFallback(s.currentDestinationId!)
                                : l10n.aiGeneralQa),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600),
                      ),
                      subtitle: Text(
                        l10n.aiSessionSubtitle(statusLabel, s.messageCount),
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

class _TourLinkRef {
  final int tourId;
  final String label;

  const _TourLinkRef({required this.tourId, required this.label});
}

class _ParsedAiMessage {
  final String displayText;
  final List<_TourLinkRef> tourLinks;

  const _ParsedAiMessage({required this.displayText, required this.tourLinks});
}

_ParsedAiMessage _parseAiMessage(String raw) {
  var text = raw;
  text = text.replaceAllMapped(RegExp(r'\*\*([\s\S]+?)\*\*'), (m) => m.group(1) ?? '');
  text = text.replaceAllMapped(RegExp(r'__([\s\S]+?)__'), (m) => m.group(1) ?? '');
  text = text.replaceAll(RegExp(r'^#{1,6}\s+', multiLine: true), '');
  text = text.replaceAllMapped(RegExp(r'^(\s*)\*\s+', multiLine: true), (m) => '${m.group(1) ?? ''}- ');
  text = text.replaceAll('**', '');

  final linksById = <int, _TourLinkRef>{};

  text = text.replaceAllMapped(RegExp(r'\[([^\]]+)\]\(/tours/(\d+)\)'), (m) {
    final label = (m.group(1) ?? '').trim();
    final tourId = int.tryParse(m.group(2) ?? '');
    if (tourId != null) {
      final cleanLabel = label.isEmpty ? appL10n.aiViewTour(tourId) : label;
      linksById.putIfAbsent(tourId, () => _TourLinkRef(tourId: tourId, label: cleanLabel));
      return cleanLabel;
    }
    return label;
  });

  text = text.replaceAllMapped(RegExp(r'/tours/(\d+)'), (m) {
    final tourId = int.tryParse(m.group(1) ?? '');
    if (tourId != null) {
      linksById.putIfAbsent(tourId, () => _TourLinkRef(tourId: tourId, label: appL10n.aiViewTour(tourId)));
      return 'Tour #$tourId';
    }
    return m.group(0) ?? '';
  });

  return _ParsedAiMessage(
    displayText: text.trim(),
    tourLinks: linksById.values.toList(),
  );
}
