import 'package:flutter/foundation.dart' show ValueListenable;
import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/models/auth_models.dart';
import '../../core/models/forum_model.dart';
import '../../core/services/api_client.dart';
import '../../core/services/forum_service.dart';
import '../../core/services/tour_service.dart';
import '../common/heritage_motion.dart';
import '../common/tab_refresh.dart';
import '../forum/compose_post_screen.dart';
import '../forum/forum_widgets.dart';
import '../forum/my_posts_screen.dart';
import '../forum/post_detail_screen.dart';
import '../rewards/rewards_widgets.dart' show RewardsMessageView, RewardsSkeletonList;

/// Tab Diễn đàn: bảng tin bài viết đã được kiểm duyệt, lọc theo tour (bài viết chỉ gắn tour).
class CommunityTab extends StatefulWidget {
  final UserModel currentUser;

  final ValueListenable<int>? selectedTab;

  const CommunityTab({super.key, required this.currentUser, this.selectedTab});

  @override
  State<CommunityTab> createState() => _CommunityTabState();
}

class _CommunityTabState extends State<CommunityTab> with RefreshOnTabReturn {

  @override
  ValueListenable<int>? get selectedTab => widget.selectedTab;

  @override
  int get tabIndex => 2;

  @override
  void onTabReturn() => _load(silent: true);
  static const int _pageSize = 10;

  final ForumService _service = ForumService();
  final ScrollController _scroll = ScrollController();

  final List<ForumPost> _posts = [];
  ForumOption? _tour;
  bool _loading = true;
  bool _loadingMore = false;
  bool _hasMore = false;
  String? _error;
  int _page = 0;

  @override
  void initState() {
    super.initState();
    _scroll.addListener(() {
      if (_scroll.hasClients &&
          _scroll.position.pixels >= _scroll.position.maxScrollExtent - 300) {
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

  /// [silent]: làm mới khi quay lại tab, giữ bài đang hiện thay vì vòng chờ.
  Future<void> _load({bool silent = false}) async {
    if (!silent) {
      setState(() {
        _loading = true;
        _error = null;
      });
    }
    try {
      final result = await _service.getFeed(
        page: 0,
        size: _pageSize,
        tourId: _tour?.id,
      );
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
      final result = await _service.getFeed(
        page: _page + 1,
        size: _pageSize,
        tourId: _tour?.id,
      );
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

  Future<void> _toggleHeart(ForumPost post) async {
    final index = _posts.indexWhere((p) => p.id == post.id);
    if (index < 0) return;
    final before = _posts[index];

    // Cập nhật ngay trên màn hình, lỗi thì hoàn lại.
    final ForumPost optimistic = before.isLiked
        ? before.copyWith(likesCount: (before.likesCount - 1).clamp(0, 1 << 30), clearReaction: true)
        : before.copyWith(likesCount: before.likesCount + 1, myReaction: kHeartReaction);
    setState(() => _posts[index] = optimistic);

    try {
      final total = await _service.toggleHeart(before.id);
      if (!mounted) return;
      final i = _posts.indexWhere((p) => p.id == post.id);
      if (i >= 0) setState(() => _posts[i] = _posts[i].copyWith(likesCount: total));
    } on ApiException catch (e) {
      if (!mounted) return;
      final i = _posts.indexWhere((p) => p.id == post.id);
      if (i >= 0) setState(() => _posts[i] = before);
      showForumSnack(context, e.message);
    }
  }

  Future<void> _open(ForumPost post) async {
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
    final saved = await Navigator.of(context).push<ForumPost>(
      MaterialPageRoute(builder: (_) => const ComposePostScreen()),
    );
    if (saved != null && mounted) _load();
  }

  void _openMyPosts() {
    Navigator.of(context).push(MaterialPageRoute(builder: (_) => const MyPostsScreen()));
  }

  Future<void> _filterTour() async {
    final picked = await showForumOptionPicker(
      context,
      title: 'Lọc theo tour',
      loader: () async =>
          (await TourService().getPublishedTours()).map((t) => ForumOption(t.id, t.title)).toList(),
    );
    if (picked == null || !mounted) return;
    setState(() => _tour = picked.id < 0 ? null : picked);
    _load();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppCultureColors.background,
      body: SafeArea(bottom: false, child: _buildBody()),
    );
  }

  /// Băng đầu trang kiểu di sản: nền ngọc, hoa văn trống đồng xoay chậm, nút "Bài của tôi".
  Widget _buildHeader() {
    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        gradient: const LinearGradient(
          colors: [AppCultureColors.jadeDark, AppCultureColors.oceanBlue],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        boxShadow: [
          BoxShadow(
            color: AppCultureColors.heritageJade.withValues(alpha: 0.25),
            blurRadius: 18,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Stack(
        children: [
          Positioned(
            right: -50,
            top: -60,
            child: SlowSpin(child: DrumMotif(size: 180, color: Colors.white.withValues(alpha: 0.12))),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(18, 16, 14, 16),
            child: Row(
              children: [
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Diễn đàn di sản',
                        style: TextStyle(fontSize: 21, fontWeight: FontWeight.w700, color: Colors.white),
                      ),
                      SizedBox(height: 3),
                      Text(
                        'Chia sẻ trải nghiệm văn hoá cùng cộng đồng',
                        style: TextStyle(fontSize: 12.5, color: Colors.white70, height: 1.35),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 10),
                Material(
                  color: Colors.white.withValues(alpha: 0.18),
                  shape: StadiumBorder(side: BorderSide(color: Colors.white.withValues(alpha: 0.3))),
                  child: InkWell(
                    customBorder: const StadiumBorder(),
                    onTap: _openMyPosts,
                    child: const Padding(
                      padding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.article_outlined, size: 16, color: Colors.white),
                          SizedBox(width: 5),
                          Text(
                            'Bài của tôi',
                            style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: Colors.white),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBody() {
    if ((_loading || _error != null) && _posts.isEmpty) {
      return Column(
        children: [
          Padding(padding: const EdgeInsets.fromLTRB(16, 10, 16, 0), child: _buildHeader()),
          Expanded(
            child: _loading
                ? const RewardsSkeletonList(count: 3, itemHeight: 200)
                : RewardsMessageView(
                    icon: Icons.cloud_off_rounded,
                    title: 'Không tải được Diễn đàn',
                    message: _error,
                    onRetry: _load,
                  ),
          ),
        ],
      );
    }

    final filtering = _tour != null;
    return RefreshIndicator(
      color: AppCultureColors.heritageJade,
      onRefresh: _load,
      child: ListView(
        controller: _scroll,
        physics: const AlwaysScrollableScrollPhysics(),
        // Chừa chỗ cho thanh điều hướng và nút CHECK-IN nổi
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 40),
        children: [
          _buildHeader(),
          const SizedBox(height: 14),
          _buildComposeCard(),
          const SizedBox(height: 12),
          _buildFilters(),
          const SizedBox(height: 14),
          if (_loading)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 40),
              child: Center(child: CircularProgressIndicator(strokeWidth: 2.4)),
            )
          else if (_posts.isEmpty)
            SizedBox(
              height: 300,
              child: RewardsMessageView(
                icon: Icons.forum_outlined,
                title: filtering ? 'Không có bài viết phù hợp' : 'Chưa có bài viết nào',
                message: filtering
                    ? 'Thử bỏ bớt bộ lọc để xem thêm bài viết.'
                    : 'Hãy là người đầu tiên chia sẻ trải nghiệm của bạn.',
              ),
            )
          else ...[
            for (final (i, p) in _posts.indexed)
              Reveal(
                key: ValueKey(p.id),
                order: i < 4 ? i : 0,
                child: ForumPostCard(
                  post: p,
                  onTap: () => _open(p),
                  onLike: () => _toggleHeart(p),
                ),
              ),
            if (_loadingMore)
              const Padding(
                padding: EdgeInsets.all(12),
                child: Center(child: CircularProgressIndicator(strokeWidth: 2.4)),
              ),
          ],
        ],
      ),
    );
  }

  Widget _buildComposeCard() {
    return InkWell(
      onTap: _compose,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppCultureColors.border),
        ),
        child: Row(
          children: [
            ForumAvatar(
              name: widget.currentUser.fullName,
              url: widget.currentUser.avatarUrl,
              size: 42,
            ),
            const SizedBox(width: 12),
            const Expanded(
              child: Text(
                'Bạn vừa có trải nghiệm gì thú vị?',
                style: TextStyle(fontSize: 14, color: AppCultureColors.textMuted),
              ),
            ),
            const Icon(Icons.add_photo_alternate_outlined,
                color: AppCultureColors.heritageJade, size: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildFilters() {
    Widget chip({
      required IconData icon,
      required String hint,
      required ForumOption? value,
      required VoidCallback onTap,
      required VoidCallback onClear,
    }) {
      final selected = value != null;
      return Expanded(
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(14),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: selected ? AppCultureColors.jadeLight : Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: selected ? AppCultureColors.heritageJade : AppCultureColors.border,
              ),
            ),
            child: Row(
              children: [
                Icon(
                  icon,
                  size: 16,
                  color: selected ? AppCultureColors.jadeDark : AppCultureColors.textMuted,
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    selected ? value.label : hint,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 12.5,
                      fontWeight: FontWeight.w600,
                      color: selected ? AppCultureColors.jadeDark : AppCultureColors.textDark,
                    ),
                  ),
                ),
                if (selected)
                  InkWell(
                    onTap: onClear,
                    child: const Padding(
                      padding: EdgeInsets.only(left: 4),
                      child: Icon(Icons.close_rounded, size: 16, color: AppCultureColors.jadeDark),
                    ),
                  )
                else
                  const Icon(Icons.keyboard_arrow_down_rounded,
                      size: 18, color: AppCultureColors.textMuted),
              ],
            ),
          ),
        ),
      );
    }

    // Bài viết chỉ gắn tour (không gắn điểm đến nữa) nên chỉ lọc theo tour
    return Row(
      children: [
        chip(
          icon: Icons.route_rounded,
          hint: 'Lọc theo tour',
          value: _tour,
          onTap: _filterTour,
          onClear: () {
            setState(() => _tour = null);
            _load();
          },
        ),
      ],
    );
  }
}
