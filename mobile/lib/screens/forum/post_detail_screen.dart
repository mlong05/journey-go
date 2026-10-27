import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/models/forum_model.dart';
import '../../core/services/token_storage.dart';
import '../../core/services/api_client.dart';
import '../../core/services/forum_service.dart';
import '../rewards/rewards_widgets.dart' show buildRewardsAppBar;
import 'compose_post_screen.dart';
import 'forum_widgets.dart';

/// Chi tiết bài viết: nội dung đầy đủ, cảm xúc, bình luận và báo cáo.
/// Khi quay lại (`pop`) trả về bài đã cập nhật (hoặc null nếu bài bị xóa) để danh sách đồng bộ.
class PostDetailScreen extends StatefulWidget {
  final ForumPost post;

  const PostDetailScreen({super.key, required this.post});

  @override
  State<PostDetailScreen> createState() => _PostDetailScreenState();
}

class _PostDetailScreenState extends State<PostDetailScreen> {
  final ForumService _service = ForumService();
  final TextEditingController _commentController = TextEditingController();
  final FocusNode _commentFocus = FocusNode();

  late ForumPost _post = widget.post;
  final List<ForumComment> _comments = [];
  int? _myUserId;
  bool _loadingComments = true;
  bool _loadingMore = false;
  bool _hasMore = false;
  bool _sending = false;
  bool _deleted = false;
  String? _commentsError;
  int _page = 0;

  bool get _isMine => _myUserId != null && _myUserId == _post.authorId;
  bool get _canInteract => _post.isPublished;

  @override
  void initState() {
    super.initState();
    _init();
  }

  @override
  void dispose() {
    _commentController.dispose();
    _commentFocus.dispose();
    super.dispose();
  }

  Future<void> _init() async {
    _myUserId = (await TokenStorage.getUser())?.id;
    if (!mounted) return;
    setState(() {});
    await Future.wait([_refreshPost(), _loadComments()]);
  }

  Future<void> _refreshPost() async {
    try {
      final fresh = await _service.getPost(widget.post.id);
      if (mounted) setState(() => _post = fresh);
    } on ApiException {
      // giữ bản đã có từ danh sách
    }
  }

  Future<void> _loadComments() async {
    setState(() {
      _loadingComments = true;
      _commentsError = null;
    });
    try {
      final result = await _service.getComments(_post.id, page: 0);
      if (!mounted) return;
      setState(() {
        _comments
          ..clear()
          ..addAll(result.items);
        _page = 0;
        _hasMore = result.hasMore;
        _loadingComments = false;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _commentsError = e.message;
        _loadingComments = false;
      });
    }
  }

  Future<void> _loadMore() async {
    if (_loadingMore || !_hasMore) return;
    setState(() => _loadingMore = true);
    try {
      final result = await _service.getComments(_post.id, page: _page + 1);
      if (!mounted) return;
      setState(() {
        _comments.addAll(result.items);
        _page += 1;
        _hasMore = result.hasMore;
        _loadingMore = false;
      });
    } on ApiException {
      if (mounted) setState(() => _loadingMore = false);
    }
  }

  Future<void> _toggleHeart() async {
    final before = _post;
    // Cập nhật ngay trên màn hình, lỗi thì hoàn lại.
    setState(() => _post = before.isLiked
        ? before.copyWith(likesCount: (before.likesCount - 1).clamp(0, 1 << 30), clearReaction: true)
        : before.copyWith(likesCount: before.likesCount + 1, myReaction: kHeartReaction));
    try {
      final total = await _service.toggleHeart(before.id);
      if (mounted) setState(() => _post = _post.copyWith(likesCount: total));
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _post = before);
      showForumSnack(context, e.message);
    }
  }

  Future<void> _sendComment() async {
    final text = _commentController.text.trim();
    if (text.isEmpty || _sending) return;
    setState(() => _sending = true);
    try {
      final comment = await _service.addComment(_post.id, text);
      if (!mounted) return;
      setState(() {
        _comments.add(comment);
        _post = _post.copyWith(commentsCount: _post.commentsCount + 1);
        _commentController.clear();
        _sending = false;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _sending = false);
      showForumSnack(context, e.message);
    }
  }

  Future<void> _deleteComment(ForumComment comment) async {
    final ok = await confirmAction(
      context,
      title: 'Xóa bình luận',
      message: 'Bạn muốn xóa bình luận này?',
      confirmLabel: 'Xóa',
      destructive: true,
    );
    if (!ok || !mounted) return;
    try {
      await _service.deleteComment(comment.id);
      if (!mounted) return;
      setState(() {
        _comments.removeWhere((c) => c.id == comment.id);
        _post = _post.copyWith(commentsCount: (_post.commentsCount - 1).clamp(0, 1 << 30));
      });
    } on ApiException catch (e) {
      if (mounted) showForumSnack(context, e.message);
    }
  }

  Future<void> _report() async {
    final result = await askReportReason(context);
    if (result == null || !mounted) return;
    try {
      await _service.reportPost(_post.id, result.reason, description: result.description);
      if (mounted) showForumSnack(context, 'Đã gửi báo cáo. Cảm ơn bạn đã giúp cộng đồng.');
    } on ApiException catch (e) {
      if (mounted) showForumSnack(context, e.message);
    }
  }

  Future<void> _deletePost() async {
    final ok = await confirmAction(
      context,
      title: 'Xóa bài viết',
      message: 'Bài viết và các bình luận sẽ bị xóa vĩnh viễn.',
      confirmLabel: 'Xóa bài',
      destructive: true,
    );
    if (!ok || !mounted) return;
    try {
      await _service.deletePost(_post.id);
      if (!mounted) return;
      _deleted = true;
      Navigator.of(context).pop(null);
    } on ApiException catch (e) {
      if (mounted) showForumSnack(context, e.message);
    }
  }

  Future<void> _edit() async {
    final updated = await Navigator.of(context).push<ForumPost>(
      MaterialPageRoute(builder: (_) => ComposePostScreen(editing: _post)),
    );
    if (updated != null && mounted) setState(() => _post = updated);
  }

  Future<void> _submitForReview() async {
    try {
      final updated = await _service.submitPost(_post.id);
      if (!mounted) return;
      setState(() => _post = updated);
      showForumSnack(context, 'Đã gửi bài viết để kiểm duyệt.');
    } on ApiException catch (e) {
      if (mounted) showForumSnack(context, e.message);
    }
  }

  @override
  Widget build(BuildContext context) {
    final canResubmit =
        _isMine && (_post.status == 'DRAFT' || _post.status == 'REJECTED' || _post.status == 'NEEDS_REVISION');
    final canEdit = _isMine && _post.status != 'PENDING_REVIEW';

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) Navigator.of(context).pop(_deleted ? null : _post);
      },
      child: Scaffold(
        backgroundColor: AppCultureColors.background,
        appBar: buildRewardsAppBar(
          context,
          'Bài viết',
          actions: [
            PopupMenuButton<String>(
              tooltip: 'Tùy chọn',
              icon: const Icon(Icons.more_vert_rounded, color: AppCultureColors.textDark),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              onSelected: (v) {
                if (v == 'report') _report();
                if (v == 'edit') _edit();
                if (v == 'delete') _deletePost();
              },
              itemBuilder: (_) => [
                if (canEdit) const PopupMenuItem(value: 'edit', child: Text('Chỉnh sửa')),
                if (_isMine) const PopupMenuItem(value: 'delete', child: Text('Xóa bài')),
                if (!_isMine) const PopupMenuItem(value: 'report', child: Text('Báo cáo bài viết')),
              ],
            ),
          ],
        ),
        body: Column(
          children: [
            Expanded(
              child: RefreshIndicator(
                color: AppCultureColors.heritageJade,
                onRefresh: () async {
                  await Future.wait([_refreshPost(), _loadComments()]);
                },
                child: ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
                  children: [
                    _buildPost(canResubmit),
                    const SizedBox(height: 20),
                    _buildCommentsSection(),
                  ],
                ),
              ),
            ),
            if (_canInteract) _buildCommentBar(),
          ],
        ),
      ),
    );
  }

  Widget _buildPost(bool canResubmit) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: AppCultureColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              ForumAvatar(name: _post.authorName, url: _post.authorAvatarUrl, size: 44),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _post.authorName,
                      style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w800),
                    ),
                    Text(
                      [timeAgo(_post.createdAt), if (_post.placeLine != null) _post.placeLine!]
                          .where((e) => e.isNotEmpty)
                          .join(' • '),
                      style: const TextStyle(fontSize: 12, color: AppCultureColors.textMuted),
                    ),
                  ],
                ),
              ),
              if (_isMine) ForumStatusChip(post: _post),
            ],
          ),
          const SizedBox(height: 14),
          Text(
            _post.title,
            style: const TextStyle(
              fontSize: 19,
              height: 1.3,
              fontWeight: FontWeight.w900,
              color: AppCultureColors.textDark,
            ),
          ),
          const SizedBox(height: 8),
          SelectableText(
            _post.content,
            style: const TextStyle(fontSize: 14.5, height: 1.6, color: AppCultureColors.textDark),
          ),
          if (_isMine &&
              (_post.status == 'REJECTED' || _post.status == 'NEEDS_REVISION') &&
              (_post.moderationNote?.isNotEmpty ?? false)) ...[
            const SizedBox(height: 14),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: ForumStatus.of(_post.status).color.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Text(
                'Phản hồi từ kiểm duyệt viên: ${_post.moderationNote}',
                style: TextStyle(
                  fontSize: 13,
                  height: 1.45,
                  color: ForumStatus.of(_post.status).color,
                ),
              ),
            ),
          ],
          if (_post.imageUrls.isNotEmpty) ...[
            const SizedBox(height: 14),
            ..._post.imageUrls.map(
              (url) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: Image.network(
                    url,
                    width: double.infinity,
                    fit: BoxFit.cover,
                    errorBuilder: (_, _, _) => Container(
                      height: 160,
                      color: AppCultureColors.surfaceSubtle,
                      alignment: Alignment.center,
                      child: const Icon(Icons.broken_image_outlined,
                          color: AppCultureColors.textLight),
                    ),
                    loadingBuilder: (context, child, progress) => progress == null
                        ? child
                        : Container(height: 200, color: AppCultureColors.surfaceSubtle),
                  ),
                ),
              ),
            ),
          ],
          const SizedBox(height: 8),
          const Divider(height: 1, color: AppCultureColors.borderLight),
          if (canResubmit) ...[
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: _submitForReview,
                icon: const Icon(Icons.send_rounded, size: 18),
                label: Text(_post.status == 'DRAFT' ? 'Gửi duyệt' : 'Gửi duyệt lại'),
                style: FilledButton.styleFrom(
                  backgroundColor: AppCultureColors.heritageJade,
                  minimumSize: const Size(0, 46),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
              ),
            ),
          ] else if (_canInteract) ...[
            Row(
              children: [
                TextButton.icon(
                  onPressed: _toggleHeart,
                  icon: Icon(
                    _post.isLiked ? Icons.favorite_rounded : Icons.favorite_border_rounded,
                    size: 21,
                  ),
                  label: Text(
                    '${_post.likesCount}',
                    style: const TextStyle(fontWeight: FontWeight.w800),
                  ),
                  style: TextButton.styleFrom(
                    foregroundColor:
                        _post.isLiked ? const Color(0xFFE11D48) : AppCultureColors.textMuted,
                    minimumSize: const Size(0, 44),
                  ),
                ),
                TextButton.icon(
                  onPressed: () => _commentFocus.requestFocus(),
                  icon: const Icon(Icons.chat_bubble_outline_rounded, size: 19),
                  label: Text(
                    '${_post.commentsCount}',
                    style: const TextStyle(fontWeight: FontWeight.w800),
                  ),
                  style: TextButton.styleFrom(
                    foregroundColor: AppCultureColors.textMuted,
                    minimumSize: const Size(0, 44),
                  ),
                ),
              ],
            ),
          ] else
            const Padding(
              padding: EdgeInsets.only(top: 12),
              child: Text(
                'Bài viết chỉ nhận cảm xúc và bình luận sau khi được kiểm duyệt.',
                style: TextStyle(fontSize: 12.5, color: AppCultureColors.textMuted),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildCommentsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'BÌNH LUẬN (${_post.commentsCount})',
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w800,
            letterSpacing: 0.8,
            color: AppCultureColors.textDark,
          ),
        ),
        const SizedBox(height: 12),
        if (_loadingComments)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 24),
            child: Center(child: CircularProgressIndicator(strokeWidth: 2.4)),
          )
        else if (_commentsError != null)
          Column(
            children: [
              Text(_commentsError!, style: const TextStyle(color: AppCultureColors.error)),
              TextButton(onPressed: _loadComments, child: const Text('Thử lại')),
            ],
          )
        else if (_comments.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 20),
            child: Center(
              child: Text(
                'Chưa có bình luận nào. Hãy là người đầu tiên!',
                style: TextStyle(fontSize: 13, color: AppCultureColors.textMuted),
              ),
            ),
          )
        else ...[
          ..._comments.map(_buildComment),
          if (_hasMore)
            Center(
              child: TextButton(
                onPressed: _loadingMore ? null : _loadMore,
                child: Text(_loadingMore ? 'Đang tải...' : 'Xem thêm bình luận'),
              ),
            ),
        ],
      ],
    );
  }

  Widget _buildComment(ForumComment c) {
    final mine = _myUserId != null && c.authorId == _myUserId;
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ForumAvatar(name: c.authorName, url: c.authorAvatarUrl, size: 34),
          const SizedBox(width: 10),
          Expanded(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppCultureColors.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          c.authorName,
                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800),
                        ),
                      ),
                      Text(
                        timeAgo(c.createdAt),
                        style: const TextStyle(fontSize: 11, color: AppCultureColors.textLight),
                      ),
                      if (mine)
                        InkWell(
                          onTap: () => _deleteComment(c),
                          borderRadius: BorderRadius.circular(12),
                          child: const Padding(
                            padding: EdgeInsets.only(left: 8),
                            child: Icon(Icons.delete_outline_rounded,
                                size: 18, color: AppCultureColors.textMuted),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(c.content, style: const TextStyle(fontSize: 13.5, height: 1.45)),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCommentBar() {
    return SafeArea(
      child: Container(
        padding: const EdgeInsets.fromLTRB(16, 10, 12, 10),
        decoration: const BoxDecoration(
          color: Colors.white,
          border: Border(top: BorderSide(color: AppCultureColors.border)),
        ),
        child: Row(
          children: [
            Expanded(
              child: TextField(
                controller: _commentController,
                focusNode: _commentFocus,
                maxLength: 1000,
                minLines: 1,
                maxLines: 3,
                textInputAction: TextInputAction.newline,
                decoration: InputDecoration(
                  counterText: '',
                  hintText: 'Viết bình luận...',
                  hintStyle: const TextStyle(fontSize: 13.5, color: AppCultureColors.textLight),
                  filled: true,
                  fillColor: AppCultureColors.surfaceSubtle,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(22),
                    borderSide: BorderSide.none,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 6),
            IconButton(
              tooltip: 'Gửi bình luận',
              onPressed: _sending ? null : _sendComment,
              icon: _sending
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2.2),
                    )
                  : const Icon(Icons.send_rounded, color: AppCultureColors.heritageJade),
              constraints: const BoxConstraints(minWidth: 46, minHeight: 46),
            ),
          ],
        ),
      ),
    );
  }
}
