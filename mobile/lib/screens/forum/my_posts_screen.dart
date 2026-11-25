import 'dart:async';
import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/models/forum_model.dart';
import '../../core/models/notification_model.dart';
import '../../core/services/api_client.dart';
import '../../core/services/forum_service.dart';
import '../../core/services/notification_service.dart';
import '../common/heritage_motion.dart';
import '../common/no_clip.dart';
import '../rewards/rewards_widgets.dart' show RewardsMessageView, RewardsSkeletonList;
import 'compose_post_screen.dart';
import 'forum_widgets.dart';
import 'post_detail_screen.dart';
import '../../l10n/locale_controller.dart';

/// "Bài của tôi": mọi bài của người dùng chia theo trạng thái kiểm duyệt.
class MyPostsScreen extends StatefulWidget {
  const MyPostsScreen({super.key});

  @override
  State<MyPostsScreen> createState() => _MyPostsScreenState();
}

class _MyPostsScreenState extends State<MyPostsScreen> {
  static const int _pageSize = 20;

  final ForumService _service = ForumService();
  final ScrollController _scroll = ScrollController();

  final List<ForumPost> _posts = [];
  bool _loading = true;
  bool _loadingMore = false;
  bool _hasMore = false;
  String? _error;
  int _page = 0;

  static List<({String label, bool Function(ForumPost) match})> get _tabs => [
    (label: appL10n.listAll, match: _all),
    (label: appL10n.forumTabDraft, match: _isDraft),
    (label: appL10n.forumTabPending, match: _isPending),
    (label: appL10n.forumTabPublished, match: _isPublished),
    (label: appL10n.forumTabRevision, match: _isRevision),
    (label: appL10n.forumTabRejected, match: _isRejected),
  ];

  static bool _all(ForumPost p) => true;
  static bool _isDraft(ForumPost p) => p.status == 'DRAFT';
  static bool _isPending(ForumPost p) => p.status == 'PENDING_REVIEW';
  static bool _isPublished(ForumPost p) => p.status == 'PUBLISHED';
  static bool _isRevision(ForumPost p) => p.status == 'NEEDS_REVISION';
  static bool _isRejected(ForumPost p) => p.status == 'REJECTED';

  @override
  void initState() {
    super.initState();
    _scroll.addListener(() {
      if (_scroll.hasClients &&
          _scroll.position.pixels >= _scroll.position.maxScrollExtent - 240) {
        _loadMore();
      }
    });
    _load();
    // Thời gian thực: bài được duyệt / từ chối / bị ẩn / có bình luận → cập nhật trạng thái ngay
    _notificationSub = NotificationCenter.instance.incoming.listen((n) {
      if (n.refType == 'POST' && mounted) _load(silent: true);
    });
  }

  StreamSubscription<AppNotification>? _notificationSub;

  @override
  void dispose() {
    _notificationSub?.cancel();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _load({bool silent = false}) async {
    if (!silent) {
      setState(() {
        _loading = true;
        _error = null;
      });
    }
    try {
      final result = await _service.getMyPosts(page: 0, size: _pageSize);
      if (!mounted) return;
      setState(() {
        _posts
          ..clear()
          ..addAll(result.items);
        _page = 0;
        _hasMore = result.hasMore;
        _loading = false;
      });
    } on ApiException catch (e) {
      if (!mounted || silent) return; // tải ngầm lỗi thì giữ danh sách đang xem
      setState(() {
        _error = e.message;
        _loading = false;
      });
    }
  }

  Future<void> _loadMore() async {
    if (_loading || _loadingMore || !_hasMore) return;
    setState(() => _loadingMore = true);
    try {
      final result = await _service.getMyPosts(page: _page + 1, size: _pageSize);
      if (!mounted) return;
      setState(() {
        _posts.addAll(result.items);
        _page += 1;
        _hasMore = result.hasMore;
        _loadingMore = false;
      });
    } on ApiException {
      if (mounted) setState(() => _loadingMore = false);
    }
  }

  Future<void> _open(ForumPost post) async {
    // Bài bị xóa trả về null, các trường hợp khác trả bài đã cập nhật.
    final result = await Navigator.of(context).push<ForumPost?>(
      MaterialPageRoute(builder: (_) => PostDetailScreen(post: post)),
    );
    if (!mounted) return;
    final index = _posts.indexWhere((p) => p.id == post.id);
    if (index < 0) return;
    setState(() {
      if (result == null) {
        _posts.removeAt(index);
      } else {
        _posts[index] = result;
      }
    });
  }

  Future<void> _compose() async {
    final created = await Navigator.of(context).push<ForumPost>(
      MaterialPageRoute(builder: (_) => const ComposePostScreen()),
    );
    if (created != null && mounted) _load();
  }

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: _tabs.length,
      child: Scaffold(
        backgroundColor: AppCultureColors.background,
        appBar: AppBar(
          backgroundColor: Colors.white,
          elevation: 0,
          centerTitle: true,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_ios_new_rounded,
                size: 18, color: AppCultureColors.textDark),
            onPressed: () => Navigator.of(context).maybePop(),
            tooltip: MaterialLocalizations.of(context).backButtonTooltip,
          ),
          title: Text(
            context.l10n.forumMyPosts,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: AppCultureColors.textDark,
            ),
          ),
        ),
        floatingActionButton: FloatingActionButton.extended(
          onPressed: _compose,
          backgroundColor: AppCultureColors.heritageJade,
          foregroundColor: Colors.white,
          icon: const Icon(Icons.edit_rounded),
          label: Text(context.l10n.forumWrite, style: const TextStyle(fontWeight: FontWeight.w600)),
        ),
        body: Column(
          children: [
            // Nhóm bài dạng chip tự xuống hàng — thay thanh tab cuộn ngang bị cắt ở mép
            TabChipWrap(
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 10),
              labels: [
                for (final t in _tabs) _loading ? t.label : '${t.label} (${_posts.where(t.match).length})',
              ],
            ),
            Expanded(
              child: _loading
                  ? const RewardsSkeletonList(count: 3, itemHeight: 170)
                  : _error != null
                      ? RewardsMessageView(
                          icon: Icons.cloud_off_rounded,
                          title: context.l10n.forumPostsLoadFailed,
                          message: _error,
                          onRetry: _load,
                        )
                      : TabBarView(
                          children: [for (final t in _tabs) _buildList(_posts.where(t.match).toList(), t.label)],
                        ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildList(List<ForumPost> items, String tabLabel) {
    return RefreshIndicator(
      color: AppCultureColors.heritageJade,
      onRefresh: _load,
      child: items.isEmpty
          ? ListView(
              children: [
                SizedBox(
                  height: MediaQuery.of(context).size.height * 0.5,
                  child: RewardsMessageView(
                    icon: Icons.article_outlined,
                    title: tabLabel == context.l10n.listAll
                        ? context.l10n.forumMyEmpty
                        : context.l10n.forumMyEmptyTab(tabLabel),
                    message: tabLabel == context.l10n.listAll
                        ? context.l10n.forumMyEmptyHint
                        : null,
                  ),
                ),
              ],
            )
          : ListView.builder(
              controller: _scroll,
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
              itemCount: items.length + (_loadingMore ? 1 : 0),
              itemBuilder: (_, i) {
                if (i == items.length) {
                  return const Padding(
                    padding: EdgeInsets.all(16),
                    child: Center(child: CircularProgressIndicator(strokeWidth: 2.4)),
                  );
                }
                return Reveal(
                  key: ValueKey(items[i].id),
                  order: i < 4 ? i : 0,
                  child: ForumPostCard(
                    post: items[i],
                    showStatus: true,
                    onTap: () => _open(items[i]),
                  ),
                );
              },
            ),
    );
  }
}
