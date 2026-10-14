import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/models/auth_models.dart';
import '../../core/models/community_model.dart';
import '../../core/models/destination_model.dart';
import '../../core/services/destination_service.dart';
import '../../core/services/user_data_service.dart';
import '../modals/create_post_modal.dart';

class CommunityTab extends StatefulWidget {
  final UserModel currentUser;

  const CommunityTab({
    super.key,
    required this.currentUser,
  });

  @override
  State<CommunityTab> createState() => _CommunityTabState();
}

class _CommunityTabState extends State<CommunityTab> {
  final UserDataService _userDataService = UserDataService();
  final DestinationService _destinationService = DestinationService();

  List<CommunityPost> _posts = [];
  List<DestinationModel> _destinations = [];
  bool _isLoading = true;
  String _activeCategory = 'all'; // 'all', 'checkin', 'review'

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    final results = await Future.wait([
      _userDataService.getPosts(),
      _destinationService.getApprovedDestinations(),
    ]);

    if (mounted) {
      setState(() {
        _posts = results[0] as List<CommunityPost>;
        _destinations = results[1] as List<DestinationModel>;
        _isLoading = false;
      });
    }
  }

  List<CommunityPost> get _filteredPosts {
    if (_activeCategory == 'checkin') {
      return _posts.where((p) => p.category == 'checkin').toList();
    }
    if (_activeCategory == 'review') {
      return _posts.where((p) => p.category == 'review' || p.category == 'tips').toList();
    }
    return _posts;
  }

  void _openCreatePostModal() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => CreatePostModal(
        authorName: widget.currentUser.fullName,
        authorAvatar: widget.currentUser.avatarUrl ?? '',
        destinations: _destinations,
        onPostCreated: _loadData,
      ),
    );
  }

  void _toggleLike(CommunityPost post) async {
    setState(() {
      post.isLiked = !post.isLiked;
      post.likesCount += post.isLiked ? 1 : -1;
    });
    await _userDataService.savePosts(_posts);
  }

  void _openCommentsSheet(CommunityPost post) {
    final commentController = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setSheetState) {
          return Container(
            height: MediaQuery.of(context).size.height * 0.75,
            padding: EdgeInsets.only(
              bottom: MediaQuery.of(context).viewInsets.bottom,
            ),
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
            ),
            child: Column(
              children: [
                Center(
                  child: Container(
                    margin: const EdgeInsets.symmetric(vertical: 10),
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: Colors.grey[300],
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Bình luận (${post.comments.length})',
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppCultureColors.textDark),
                      ),
                      IconButton(
                        onPressed: () => Navigator.of(ctx).pop(),
                        icon: const Icon(Icons.close_rounded, size: 20),
                      ),
                    ],
                  ),
                ),
                const Divider(height: 1),
                Expanded(
                  child: post.comments.isEmpty
                      ? const Center(
                          child: Text(
                            'Chưa có bình luận nào. Hãy là người đầu tiên chia sẻ!',
                            style: TextStyle(color: AppCultureColors.textMuted, fontSize: 13),
                          ),
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: post.comments.length,
                          itemBuilder: (context, idx) {
                            final c = post.comments[idx];
                            return Padding(
                              padding: const EdgeInsets.only(bottom: 12),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  CircleAvatar(
                                    radius: 16,
                                    backgroundColor: AppCultureColors.jadeLight,
                                    child: const Icon(Icons.person, size: 18, color: AppCultureColors.heritageJade),
                                  ),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: Container(
                                      padding: const EdgeInsets.all(12),
                                      decoration: BoxDecoration(
                                        color: AppCultureColors.surfaceSubtle,
                                        borderRadius: BorderRadius.circular(14),
                                      ),
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Row(
                                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                            children: [
                                              Text(
                                                c.author,
                                                style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                                              ),
                                              Text(
                                                c.time,
                                                style: const TextStyle(fontSize: 11, color: AppCultureColors.textMuted),
                                              ),
                                            ],
                                          ),
                                          const SizedBox(height: 4),
                                          Text(
                                            c.text,
                                            style: const TextStyle(fontSize: 13, color: AppCultureColors.textDark),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            );
                          },
                        ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  decoration: const BoxDecoration(
                    color: Colors.white,
                    border: Border(top: BorderSide(color: AppCultureColors.border)),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: commentController,
                          decoration: InputDecoration(
                            hintText: 'Viết bình luận văn hóa...',
                            hintStyle: const TextStyle(fontSize: 13, color: AppCultureColors.textLight),
                            filled: true,
                            fillColor: AppCultureColors.surfaceSubtle,
                            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(20),
                              borderSide: const BorderSide(color: AppCultureColors.border),
                            ),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(20),
                              borderSide: const BorderSide(color: AppCultureColors.border),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      IconButton(
                        onPressed: () async {
                          final text = commentController.text.trim();
                          if (text.isEmpty) return;

                          final newComment = CommunityComment(
                            id: 'c_${DateTime.now().millisecondsSinceEpoch}',
                            author: widget.currentUser.fullName,
                            avatar: widget.currentUser.avatarUrl ?? '',
                            text: text,
                            time: 'Vừa xong',
                          );

                          setState(() {
                            post.comments.add(newComment);
                            post.commentsCount = post.comments.length;
                          });
                          setSheetState(() {});
                          commentController.clear();

                          await _userDataService.savePosts(_posts);
                        },
                        icon: const Icon(Icons.send_rounded, color: AppCultureColors.heritageJade),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppCultureColors.background,
      body: SafeArea(
        child: Column(
          children: [
            // Top App Bar
            _buildHeader(),

            // Filter Chips
            _buildFilterChips(),

            // Feed Content
            Expanded(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator(color: AppCultureColors.heritageJade))
                  : RefreshIndicator(
                      onRefresh: _loadData,
                      color: AppCultureColors.heritageJade,
                      child: ListView(
                        padding: const EdgeInsets.only(bottom: 90),
                        children: [
                          // Create post prompt box
                          _buildCreatePostCard(),

                          // Posts list
                          ..._filteredPosts.map((post) => _buildPostCard(post)),
                        ],
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Flexible(
                      child: Text(
                        'Diễn đàn & Đánh giá Di sản',
                        style: TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w800,
                          color: AppCultureColors.textDark,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Container(
                      width: 8,
                      height: 8,
                      decoration: const BoxDecoration(
                        color: AppCultureColors.heritageJade,
                        shape: BoxShape.circle,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 2),
                const Text(
                  'Cộng đồng du khách khám phá thực địa Việt Nam',
                  style: TextStyle(fontSize: 11, color: AppCultureColors.textMuted),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                decoration: const BoxDecoration(
                  color: AppCultureColors.surfaceSubtle,
                  shape: BoxShape.circle,
                ),
                child: IconButton(
                  onPressed: () {},
                  icon: const Icon(Icons.search_rounded, size: 20, color: AppCultureColors.textDark),
                  constraints: const BoxConstraints(),
                  padding: const EdgeInsets.all(8),
                ),
              ),
              const SizedBox(width: 8),
              Container(
                decoration: const BoxDecoration(
                  color: AppCultureColors.surfaceSubtle,
                  shape: BoxShape.circle,
                ),
                child: IconButton(
                  onPressed: () {},
                  icon: const Icon(Icons.tune_rounded, size: 20, color: AppCultureColors.textDark),
                  constraints: const BoxConstraints(),
                  padding: const EdgeInsets.all(8),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChips() {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      child: Row(
        children: [
          _buildFilterChip('all', '✨ Tất cả bài viết'),
          const SizedBox(width: 8),
          _buildFilterChip('checkin', '📷 Ảnh Check-in Mới'),
          const SizedBox(width: 8),
          _buildFilterChip('review', '⭐ Review Điểm Đến'),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String id, String label) {
    final isSelected = _activeCategory == id;

    return GestureDetector(
      onTap: () => setState(() => _activeCategory = id),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? AppCultureColors.oceanBlue : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? AppCultureColors.oceanBlue : AppCultureColors.border,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: isSelected ? FontWeight.w700 : FontWeight.w600,
            color: isSelected ? Colors.white : AppCultureColors.textDark,
          ),
        ),
      ),
    );
  }

  Widget _buildCreatePostCard() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppCultureColors.border),
      ),
      child: Column(
        children: [
          GestureDetector(
            onTap: _openCreatePostModal,
            child: Row(
              children: [
                CircleAvatar(
                  radius: 18,
                  backgroundColor: const Color(0xFFB6E3F4),
                  child: const Icon(Icons.person, color: Color(0xFF0288D1), size: 22),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      color: AppCultureColors.surfaceSubtle,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Text(
                      'Chia sẻ cảm nhận hoặc ảnh chụp di tích của bạn...',
                      style: TextStyle(fontSize: 12, color: AppCultureColors.textLight),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          const Divider(height: 1),
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildQuickPostAction(Icons.camera_alt_outlined, 'Ảnh thực địa', AppCultureColors.heritageJade),
              _buildQuickPostAction(Icons.star_outline_rounded, 'Chấm sao', AppCultureColors.gold),
              _buildQuickPostAction(Icons.location_on_outlined, 'Gắn di tích', AppCultureColors.oceanBlue),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildQuickPostAction(IconData icon, String label, Color color) {
    return GestureDetector(
      onTap: _openCreatePostModal,
      child: Row(
        children: [
          Icon(icon, size: 16, color: color),
          const SizedBox(width: 6),
          Text(
            label,
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppCultureColors.textDark),
          ),
        ],
      ),
    );
  }

  Widget _buildPostCard(CommunityPost post) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: AppCultureColors.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Author header
          Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Row(
                    children: [
                      CircleAvatar(
                        radius: 20,
                        backgroundColor: AppCultureColors.jadeLight,
                        child: const Icon(Icons.person, color: AppCultureColors.heritageJade, size: 24),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Flexible(
                                  child: Text(
                                    post.authorName,
                                    style: const TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w800,
                                      color: AppCultureColors.textDark,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                const SizedBox(width: 6),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: AppCultureColors.surfaceSubtle,
                                    borderRadius: BorderRadius.circular(6),
                                    border: Border.all(color: AppCultureColors.border),
                                  ),
                                  child: Text(
                                    post.authorBadge,
                                    style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: AppCultureColors.textMuted),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 2),
                            Row(
                              children: [
                                const Icon(Icons.schedule_rounded, size: 12, color: AppCultureColors.textLight),
                                const SizedBox(width: 4),
                                Text(
                                  post.createdAt,
                                  style: const TextStyle(fontSize: 11, color: AppCultureColors.textLight),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppCultureColors.rewardBg,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.star_rounded, size: 14, color: AppCultureColors.gold),
                      const SizedBox(width: 2),
                      Text(
                        '${post.rating} (${post.ratingLabel})',
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          color: AppCultureColors.rewardText,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Location badge
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: const Color(0xFFFFF1F2),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.location_on_rounded, size: 14, color: Color(0xFFE11D48)),
                  const SizedBox(width: 4),
                  Text(
                    post.location,
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFFE11D48)),
                  ),
                ],
              ),
            ),
          ),

          // Post text content
          Padding(
            padding: const EdgeInsets.all(14),
            child: Text(
              post.content,
              style: const TextStyle(
                fontSize: 13,
                color: AppCultureColors.textDark,
                height: 1.45,
              ),
            ),
          ),

          // Attached photo with caption overlay
          if (post.image != null) ...[
            SizedBox(
              height: 200,
              width: double.infinity,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  Image.asset(
                    post.image!,
                    fit: BoxFit.cover,
                  ),
                  if (post.imageCaption != null)
                    Positioned(
                      bottom: 0,
                      left: 0,
                      right: 0,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: [Colors.transparent, Colors.black.withOpacity(0.8)],
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                          ),
                        ),
                        child: Text(
                          post.imageCaption!,
                          style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w500),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ],

          // Footer action buttons
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                // Like button
                GestureDetector(
                  onTap: () => _toggleLike(post),
                  child: Row(
                    children: [
                      Icon(
                        post.isLiked ? Icons.favorite_rounded : Icons.favorite_border_rounded,
                        size: 20,
                        color: post.isLiked ? const Color(0xFFE11D48) : AppCultureColors.textMuted,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        '${post.likesCount}',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: post.isLiked ? const Color(0xFFE11D48) : AppCultureColors.textMuted,
                        ),
                      ),
                    ],
                  ),
                ),

                // Comment button
                GestureDetector(
                  onTap: () => _openCommentsSheet(post),
                  child: Row(
                    children: [
                      const Icon(Icons.chat_bubble_outline_rounded, size: 18, color: AppCultureColors.textMuted),
                      const SizedBox(width: 6),
                      Text(
                        '${post.commentsCount} bình luận',
                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppCultureColors.textMuted),
                      ),
                    ],
                  ),
                ),

                // Share button
                GestureDetector(
                  onTap: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Đã sao chép liên kết chia sẻ bài viết!')),
                    );
                  },
                  child: const Row(
                    children: [
                      Icon(Icons.share_outlined, size: 18, color: AppCultureColors.textMuted),
                      SizedBox(width: 4),
                      Text(
                        'Chia sẻ',
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppCultureColors.textMuted),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
