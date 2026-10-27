import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/models/forum_model.dart';
import '../../core/services/api_client.dart';
import '../../core/services/forum_service.dart';
import '../rewards/rewards_widgets.dart' show RewardsMessageView, RewardsSkeletonList;
import 'compose_post_screen.dart';
import 'forum_widgets.dart';
import 'post_detail_screen.dart';

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

  static const _tabs = <({String label, bool Function(ForumPost) match})>[
    (label: 'Tất cả', match: _all),
    (label: 'Nháp', match: _isDraft),
    (label: 'Chờ duyệt', match: _isPending),
    (label: 'Đã đăng', match: _isPublished),
    (label: 'Cần sửa', match: _isRevision),
    (label: 'Bị từ chối', match: _isRejected),
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
  }

  @override
  void dispose() {
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
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
      if (!mounted) return;
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
            tooltip: 'Quay lại',
          ),
          title: const Text(
            'Bài của tôi',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w800,
              color: AppCultureColors.textDark,
            ),
          ),
          bottom: TabBar(
            isScrollable: true,
            tabAlignment: TabAlignment.start,
            labelColor: AppCultureColors.heritageJade,
            unselectedLabelColor: AppCultureColors.textMuted,
            indicatorColor: AppCultureColors.heritageJade,
            labelStyle: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13),
            tabs: [
              for (final t in _tabs)
                Tab(text: _loading ? t.label : '${t.label} (${_posts.where(t.match).length})'),
            ],
          ),
        ),
        floatingActionButton: FloatingActionButton.extended(
          onPressed: _compose,
          backgroundColor: AppCultureColors.heritageJade,
          foregroundColor: Colors.white,
          icon: const Icon(Icons.edit_rounded),
          label: const Text('Viết bài', style: TextStyle(fontWeight: FontWeight.w800)),
        ),
        body: _loading
            ? const RewardsSkeletonList(count: 3, itemHeight: 170)
            : _error != null
                ? RewardsMessageView(
                    icon: Icons.cloud_off_rounded,
                    title: 'Không tải được bài viết',
                    message: _error,
                    onRetry: _load,
                  )
                : TabBarView(
                    children: [for (final t in _tabs) _buildList(_posts.where(t.match).toList(), t.label)],
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
                    title: tabLabel == 'Tất cả'
                        ? 'Bạn chưa có bài viết nào'
                        : 'Không có bài ở mục "$tabLabel"',
                    message: tabLabel == 'Tất cả'
                        ? 'Chia sẻ trải nghiệm chuyến đi để mọi người cùng khám phá.'
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
                return ForumPostCard(
                  post: items[i],
                  showStatus: true,
                  onTap: () => _open(items[i]),
                );
              },
            ),
    );
  }
}
