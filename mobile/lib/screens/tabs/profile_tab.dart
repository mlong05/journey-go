import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/models/auth_models.dart';
import '../../core/models/gamification_model.dart'
    show PointTransactionModel, UserPointModel, formatDate, formatThousands;
import '../../core/models/journey_model.dart';
import '../../core/models/booking_model.dart' show BookingModel, BookingStatus;
import '../../core/services/auth_service.dart';
import '../../core/models/refund_model.dart';
import '../../core/services/progress_service.dart';
import '../../core/services/refund_service.dart';
import '../../core/services/token_storage.dart';
import '../../tourist_auth_screen.dart' show TouristAuthScreen;
import '../modals/edit_profile_modal.dart';
import '../modals/notification_dialog.dart';
import '../rewards/badges_screen.dart';
import '../rewards/rewards_widgets.dart' show BadgeIcon, PointTransactionTile;
import '../rewards/wallet_screen.dart';
import '../refunds_screen.dart';
import '../tickets_screen.dart';

class ProfileTab extends StatefulWidget {
  final UserModel currentUser;
  final ValueChanged<UserModel>? onUserUpdated;

  const ProfileTab({super.key, required this.currentUser, this.onUserUpdated});

  @override
  State<ProfileTab> createState() => _ProfileTabState();
}

class _ProfileTabState extends State<ProfileTab> {
  final AuthService _authService = AuthService();
  final ProgressService _progress = ProgressService();

  static const _emptyPoints = UserPointModel(
    currentBalance: 0,
    lifetimeEarned: 0,
    lifetimeSpent: 0,
  );

  late UserModel _user;
  UserPointModel _points = _emptyPoints;
  List<PointTransactionModel> _recentPoints = [];
  List<BadgeItem> _badges = [];
  List<JourneyTimelineItem> _timeline = [];
  List<BookingModel> _tickets = [];
  List<RefundModel> _refunds = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _user = widget.currentUser;
    _loadProfileData();
  }

  Future<void> _loadProfileData() async {
    setState(() => _isLoading = true);

    // Mọi số liệu lấy từ backend. Một mục lỗi mạng thì giữ giá trị đang có, không dựng số giả.
    Future<T> keep<T>(Future<T> Function() load, T current) async {
      try {
        return await load();
      } catch (_) {
        return current;
      }
    }

    final results = await Future.wait<Object>([
      keep<UserPointModel>(_progress.getPointSummary, _points),
      keep<List<BadgeItem>>(_progress.getBadges, _badges),
      keep<List<JourneyTimelineItem>>(_progress.getTimeline, _timeline),
      keep<List<BookingModel>>(_progress.getTickets, _tickets),
      keep<List<PointTransactionModel>>(
        _progress.getRecentPointHistory,
        _recentPoints,
      ),
      keep<List<RefundModel>>(RefundService().getMine, _refunds),
    ]);

    if (mounted) {
      setState(() {
        _points = results[0] as UserPointModel;
        _badges = results[1] as List<BadgeItem>;
        _timeline = results[2] as List<JourneyTimelineItem>;
        _tickets = results[3] as List<BookingModel>;
        _recentPoints = results[4] as List<PointTransactionModel>;
        _refunds = results[5] as List<RefundModel>;
        _isLoading = false;
      });
    }
  }

  Future<void> _openWallet() async {
    await Navigator.of(
      context,
    ).push(MaterialPageRoute(builder: (_) => const WalletScreen()));
    if (mounted) _loadProfileData(); // số dư có thể đã đổi sau khi đổi voucher
  }

  Future<void> _openRefunds() async {
    await Navigator.of(
      context,
    ).push(MaterialPageRoute(builder: (_) => const RefundsScreen()));
    if (mounted) _loadProfileData();
  }

  void _openBadges() {
    Navigator.of(
      context,
    ).push(MaterialPageRoute(builder: (_) => const BadgesScreen()));
  }

  void _openEditProfileModal() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => EditProfileModal(
        currentUser: _user,
        onProfileUpdated: (updated) {
          setState(() => _user = updated);
          widget.onUserUpdated?.call(updated);
        },
      ),
    );
  }

  void _openNotificationDialog() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => const NotificationDialog(),
    );
  }

  void _handleLogout() async {
    final bool? confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
        title: const Row(
          children: [
            Icon(Icons.logout_rounded, color: AppCultureColors.error),
            SizedBox(width: 10),
            Text(
              'Xác nhận đăng xuất',
              style: TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w800,
                color: AppCultureColors.textDark,
              ),
            ),
          ],
        ),
        content: const Text(
          'Phiên làm việc hiện tại sẽ được hủy an toàn trên máy chủ và toàn bộ token trên thiết bị sẽ được xóa.',
          style: TextStyle(fontSize: 13, color: AppCultureColors.textMuted),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text(
              'Hủy bỏ',
              style: TextStyle(color: AppCultureColors.textMuted),
            ),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppCultureColors.error,
              foregroundColor: Colors.white,
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            child: const Text(
              'Đăng xuất ngay',
              style: TextStyle(fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );

    if (confirm == true) {
      try {
        await _authService.logout();
      } catch (_) {
        await TokenStorage.clear();
      }

      if (mounted) {
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(builder: (_) => const TouristAuthScreen()),
          (route) => false,
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final activeTicketsCount = _tickets
        .where((t) => t.status != BookingStatus.completed)
        .length;

    return Scaffold(
      backgroundColor: AppCultureColors.background,
      body: SafeArea(
        child: Column(
          children: [
            // Top App Bar
            _buildAppBar(),

            // Scrollable Content
            Expanded(
              child: _isLoading
                  ? const Center(
                      child: CircularProgressIndicator(
                        color: AppCultureColors.heritageJade,
                      ),
                    )
                  : RefreshIndicator(
                      onRefresh: _loadProfileData,
                      color: AppCultureColors.heritageJade,
                      child: SingleChildScrollView(
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: const EdgeInsets.only(
                          left: 16,
                          right: 16,
                          bottom: 90,
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const SizedBox(height: 10),

                            // Hero User Profile Card
                            _buildProfileHeroCard(),

                            const SizedBox(height: 22),

                            // Section 1: Bộ sưu tập huy hiệu di sản
                            _buildBadgesSection(),

                            const SizedBox(height: 24),

                            // Section 2: Lịch sử tích điểm gần đây
                            _buildPointHistorySection(),

                            const SizedBox(height: 24),

                            // Section 2: Nhật ký hành trình
                            _buildJourneyTimelineSection(),

                            const SizedBox(height: 24),

                            // Section 3: Giao dịch & Tiện ích
                            _buildTransactionsSection(activeTicketsCount),

                            const SizedBox(height: 24),

                            // Section 4: Cài đặt chung
                            _buildGeneralSettingsSection(),
                          ],
                        ),
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAppBar() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          const Row(
            children: [
              Text(
                'Trang Cá Nhân',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  color: AppCultureColors.textDark,
                ),
              ),
            ],
          ),
          Row(
            children: [
              GestureDetector(
                onTap: _openNotificationDialog,
                child: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppCultureColors.surfaceSubtle,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.notifications_none_rounded,
                    size: 20,
                    color: AppCultureColors.textDark,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppCultureColors.surfaceSubtle,
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.settings_outlined,
                  size: 20,
                  color: AppCultureColors.textDark,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildProfileHeroCard() {
    // Hạng xét theo tổng điểm đã kiếm để đổi voucher không làm tụt hạng
    final earned = _points.lifetimeEarned;
    final rank = rankTierFor(earned);
    final next = nextRankFor(earned);
    final joinedAt = DateTime.tryParse(_user.createdAt ?? '')?.toLocal();

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF00A86B), Color(0xFF0288D1)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF00A86B).withOpacity(0.3),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        children: [
          // Top Row: Avatar + Name + Edit Button
          Row(
            children: [
              Stack(
                children: [
                  CircleAvatar(
                    radius: 34,
                    backgroundColor: const Color(0xFFB6E3F4),
                    child: const Icon(
                      Icons.person,
                      color: Color(0xFF0288D1),
                      size: 44,
                    ),
                  ),
                  Positioned(
                    bottom: 0,
                    right: 0,
                    child: Container(
                      width: 14,
                      height: 14,
                      decoration: BoxDecoration(
                        color: Colors.greenAccent[400],
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white, width: 2.5),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _user.fullName,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 3,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(
                            Icons.auto_awesome_rounded,
                            color: Colors.amberAccent,
                            size: 12,
                          ),
                          const SizedBox(width: 4),
                          Flexible(
                            child: Text(
                              next == null
                                  ? 'Đã đạt hạng cao nhất'
                                  : 'Còn ${formatThousands(next.remaining)} điểm lên ${next.name}',
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                color: Colors.white,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (joinedAt != null) ...[
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          const Icon(
                            Icons.calendar_today_rounded,
                            color: Colors.white70,
                            size: 12,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            'Thành viên từ ${formatDate(joinedAt)}',
                            style: const TextStyle(
                              fontSize: 11,
                              color: Colors.white70,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
              GestureDetector(
                onTap: _openEditProfileModal,
                child: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.2),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.edit_outlined,
                    color: Colors.white,
                    size: 18,
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 18),

          // Translucent Stats Row inside Card
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.18),
              borderRadius: BorderRadius.circular(18),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildCardStatItem(
                  icon: Icons.star_rounded,
                  iconColor: Colors.amberAccent,
                  value: formatThousands(earned),
                  label: 'Điểm tích lũy',
                ),
                Container(width: 1, height: 32, color: Colors.white24),
                _buildCardStatItem(
                  icon: Icons.military_tech_rounded,
                  iconColor: Colors.white,
                  value: '${_badges.length}',
                  label: 'Huy hiệu',
                ),
                Container(width: 1, height: 32, color: Colors.white24),
                _buildCardStatItem(
                  icon: Icons.shield_rounded,
                  iconColor: Colors.white,
                  value: rank,
                  label: 'Hạng thành viên',
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCardStatItem({
    required IconData icon,
    required Color iconColor,
    required String value,
    required String label,
  }) {
    return Column(
      children: [
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: iconColor, size: 16),
            const SizedBox(width: 4),
            Text(
              value,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 15,
                fontWeight: FontWeight.w800,
              ),
            ),
          ],
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: const TextStyle(color: Colors.white70, fontSize: 11),
        ),
      ],
    );
  }

  Widget _buildBadgesSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                Container(
                  width: 4,
                  height: 16,
                  decoration: BoxDecoration(
                    color: AppCultureColors.heritageJade,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(width: 8),
                const Text(
                  'BỘ SƯU TẬP HUY HIỆU DI SẢN',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.8,
                    color: AppCultureColors.textDark,
                  ),
                ),
              ],
            ),
            _seeAllButton(_openBadges),
          ],
        ),

        const SizedBox(height: 14),

        Container(
          padding: const EdgeInsets.symmetric(vertical: 16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(22),
            border: Border.all(color: AppCultureColors.border),
          ),
          child: _badges.isEmpty
              ? const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 16),
                  child: Text(
                    'Chưa có huy hiệu nào. Check-in tại điểm di sản để mở khóa huy hiệu đầu tiên.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 12,
                      color: AppCultureColors.textMuted,
                    ),
                  ),
                )
              : SizedBox(
                  height: 124,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    itemCount: _badges.length,
                    separatorBuilder: (_, _) => const SizedBox(width: 8),
                    itemBuilder: (_, i) => _buildBadgeCircle(_badges[i]),
                  ),
                ),
        ),
      ],
    );
  }

  Widget _seeAllButton(VoidCallback onTap) => InkWell(
    onTap: onTap,
    borderRadius: BorderRadius.circular(8),
    child: const Padding(
      padding: EdgeInsets.symmetric(horizontal: 4, vertical: 2),
      child: Row(
        children: [
          Text(
            'Xem tất cả',
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: AppCultureColors.oceanBlue,
            ),
          ),
          Icon(
            Icons.chevron_right_rounded,
            size: 16,
            color: AppCultureColors.oceanBlue,
          ),
        ],
      ),
    ),
  );

  Widget _buildBadgeCircle(BadgeItem badge) {
    return SizedBox(
      width: 84,
      child: Column(
        children: [
          BadgeIcon(iconUrl: badge.imageUrl, earned: true),
          const SizedBox(height: 8),
          Text(
            badge.name,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              color: AppCultureColors.textDark,
            ),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
          Text(
            badge.earnedAt,
            style: const TextStyle(
              fontSize: 10,
              color: AppCultureColors.textMuted,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPointHistorySection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                Container(
                  width: 4,
                  height: 16,
                  decoration: BoxDecoration(
                    color: AppCultureColors.gold,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(width: 8),
                const Text(
                  'LỊCH SỬ TÍCH ĐIỂM',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.8,
                    color: AppCultureColors.textDark,
                  ),
                ),
              ],
            ),
            _seeAllButton(_openWallet),
          ],
        ),

        const SizedBox(height: 12),

        // Tổng hợp: đã tích lũy / đã tiêu / còn khả dụng
        Container(
          padding: const EdgeInsets.symmetric(vertical: 12),
          margin: const EdgeInsets.only(bottom: 10),
          decoration: BoxDecoration(
            color: AppCultureColors.rewardBg,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: AppCultureColors.rewardBorder),
          ),
          child: Row(
            children: [
              _pointSummaryCell('Đã tích lũy', _points.lifetimeEarned),
              _pointSummaryCell('Đã tiêu', _points.lifetimeSpent),
              _pointSummaryCell('Khả dụng', _points.currentBalance),
            ],
          ),
        ),

        if (_recentPoints.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 8),
            child: Text(
              'Chưa có giao dịch điểm. Check-in điểm đến và hoàn thành nhiệm vụ để bắt đầu tích điểm.',
              style: TextStyle(fontSize: 12, color: AppCultureColors.textMuted),
            ),
          )
        else
          ..._recentPoints.map((tx) => PointTransactionTile(tx: tx)),
      ],
    );
  }

  Widget _pointSummaryCell(String label, int value) => Expanded(
    child: Column(
      children: [
        Text(
          formatThousands(value),
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w900,
            color: AppCultureColors.rewardText,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: const TextStyle(
            fontSize: 11,
            color: AppCultureColors.textMuted,
          ),
        ),
      ],
    ),
  );

  Widget _buildJourneyTimelineSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                Container(
                  width: 4,
                  height: 16,
                  decoration: BoxDecoration(
                    color: AppCultureColors.heritageJade,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(width: 8),
                const Text(
                  'NHẬT KÝ HÀNH TRÌNH',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.8,
                    color: AppCultureColors.textDark,
                  ),
                ),
              ],
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: AppCultureColors.jadeLight,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                '${_timeline.length} điểm đã đến',
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: AppCultureColors.jadeDark,
                ),
              ),
            ),
          ],
        ),

        const SizedBox(height: 14),

        // Timeline items
        ..._timeline.asMap().entries.map((entry) {
          final idx = entry.key;
          final item = entry.value;
          final isLast = idx == _timeline.length - 1;

          return IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Timeline marker line
                Column(
                  children: [
                    Container(
                      width: 14,
                      height: 14,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: AppCultureColors.heritageJade,
                          width: 3,
                        ),
                      ),
                    ),
                    if (!isLast)
                      Expanded(
                        child: Container(
                          width: 2,
                          color: AppCultureColors.heritageJade.withOpacity(0.4),
                        ),
                      ),
                  ],
                ),

                const SizedBox(width: 12),

                // Timeline Card
                Expanded(
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 14),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: AppCultureColors.border),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.02),
                          blurRadius: 6,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              width: 56,
                              height: 56,
                              decoration: BoxDecoration(
                                color: AppCultureColors.jadeLight,
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: const Icon(
                                Icons.place_rounded,
                                color: AppCultureColors.heritageJade,
                                size: 28,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment:
                                        MainAxisAlignment.spaceBetween,
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 6,
                                          vertical: 2,
                                        ),
                                        decoration: BoxDecoration(
                                          color: AppCultureColors.jadeLight,
                                          borderRadius: BorderRadius.circular(
                                            6,
                                          ),
                                        ),
                                        child: const Text(
                                          'ĐÃ CHECK-IN',
                                          style: TextStyle(
                                            fontSize: 9,
                                            fontWeight: FontWeight.w800,
                                            color: AppCultureColors.jadeDark,
                                          ),
                                        ),
                                      ),
                                      Text(
                                        item.rewardPoints,
                                        style: const TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w800,
                                          color: AppCultureColors.gold,
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    item.siteName,
                                    style: const TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w800,
                                      color: AppCultureColors.textDark,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    '${item.location} · ${item.checkinDate}',
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                      fontSize: 11,
                                      color: AppCultureColors.textMuted,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          );
        }),
      ],
    );
  }

  Widget _buildTransactionsSection(int activeCount) {
    final refundsInProgress = _refunds.where((r) => r.isInProgress).length;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Container(
              width: 4,
              height: 16,
              decoration: BoxDecoration(
                color: const Color(0xFFE11D48),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(width: 8),
            const Text(
              'GIAO DỊCH & TIỆN ÍCH',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w800,
                letterSpacing: 0.8,
                color: AppCultureColors.textDark,
              ),
            ),
          ],
        ),

        const SizedBox(height: 12),

        // Card 0: Ví điểm & Đổi thưởng
        GestureDetector(
          onTap: _openWallet,
          child: Container(
            margin: const EdgeInsets.only(bottom: 10),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: AppCultureColors.border),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppCultureColors.rewardBg,
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: const Icon(
                    Icons.card_giftcard_rounded,
                    color: AppCultureColors.gold,
                    size: 22,
                  ),
                ),
                const SizedBox(width: 14),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Ví điểm & Đổi thưởng',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                          color: AppCultureColors.textDark,
                        ),
                      ),
                      SizedBox(height: 2),
                      Text(
                        'Lịch sử điểm, đổi voucher & kho ưu đãi',
                        style: TextStyle(
                          fontSize: 12,
                          color: AppCultureColors.textMuted,
                        ),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: AppCultureColors.rewardBg,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    '${formatThousands(_points.currentBalance)} điểm',
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: AppCultureColors.rewardText,
                    ),
                  ),
                ),
                const SizedBox(width: 6),
                const Icon(
                  Icons.chevron_right_rounded,
                  color: AppCultureColors.textMuted,
                  size: 18,
                ),
              ],
            ),
          ),
        ),

        // Card 1: Ví vé & Chi phí du lịch
        GestureDetector(
          onTap: () {
            Navigator.of(
              context,
            ).push(MaterialPageRoute(builder: (_) => const TicketsScreen()));
          },
          child: Container(
            margin: const EdgeInsets.only(bottom: 10),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: AppCultureColors.border),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppCultureColors.jadeLight,
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: const Icon(
                    Icons.confirmation_number_outlined,
                    color: AppCultureColors.heritageJade,
                    size: 22,
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Ví vé & Chi phí du lịch',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                          color: AppCultureColors.textDark,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${_tickets.length} vé • Hóa đơn, mã QR & lịch sử chi phí',
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppCultureColors.textMuted,
                        ),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: AppCultureColors.jadeLight,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    '$activeCount khả dụng',
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: AppCultureColors.jadeDark,
                    ),
                  ),
                ),
                const SizedBox(width: 6),
                const Icon(
                  Icons.chevron_right_rounded,
                  color: AppCultureColors.textMuted,
                  size: 18,
                ),
              ],
            ),
          ),
        ),

        // Card 2: Hỗ trợ & Khiếu nại đơn hàng
        GestureDetector(
          onTap: _openRefunds,
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: AppCultureColors.border),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFF1F2),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: const Icon(
                    Icons.shield_outlined,
                    color: Color(0xFFE11D48),
                    size: 22,
                  ),
                ),
                const SizedBox(width: 14),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Hỗ trợ & Khiếu nại đơn hàng',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                          color: AppCultureColors.textDark,
                        ),
                      ),
                      SizedBox(height: 2),
                      Text(
                        'Theo dõi tiến độ hoàn tiền & xử lý sự cố vé',
                        style: TextStyle(
                          fontSize: 12,
                          color: AppCultureColors.textMuted,
                        ),
                      ),
                    ],
                  ),
                ),
                if (refundsInProgress > 0) ...[
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: AppCultureColors.rewardBg,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      '$refundsInProgress đang xử lý',
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: AppCultureColors.rewardText,
                      ),
                    ),
                  ),
                  const SizedBox(width: 6),
                ],
                const Icon(
                  Icons.chevron_right_rounded,
                  color: AppCultureColors.textMuted,
                  size: 18,
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildGeneralSettingsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Container(
              width: 4,
              height: 16,
              decoration: BoxDecoration(
                color: AppCultureColors.textDark,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(width: 8),
            const Text(
              'CÀI ĐẶT CHUNG',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w800,
                letterSpacing: 0.8,
                color: AppCultureColors.textDark,
              ),
            ),
          ],
        ),

        const SizedBox(height: 12),

        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(22),
            border: Border.all(color: AppCultureColors.border),
          ),
          child: Column(
            children: [
              // Thông tin cá nhân
              _buildSettingTile(
                icon: Icons.person_outline_rounded,
                iconColor: AppCultureColors.oceanBlue,
                iconBg: AppCultureColors.oceanLight,
                title: 'Thông tin cá nhân',
                subtitle: 'Họ tên, email, số điện thoại',
                onTap: _openEditProfileModal,
              ),
              const Divider(height: 1, indent: 56),

              // Ngôn ngữ
              _buildSettingTile(
                icon: Icons.language_rounded,
                iconColor: AppCultureColors.gold,
                iconBg: AppCultureColors.rewardBg,
                title: 'Ngôn ngữ',
                subtitle: 'Tùy chọn hiển thị ngôn ngữ',
                trailing: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 3,
                  ),
                  decoration: BoxDecoration(
                    color: AppCultureColors.jadeLight,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Text(
                    'VN Tiếng Việt',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: AppCultureColors.jadeDark,
                    ),
                  ),
                ),
                onTap: () {},
              ),
              const Divider(height: 1, indent: 56),

              // Hỗ trợ du khách 1900 6888
              _buildSettingTile(
                icon: Icons.phone_in_talk_outlined,
                iconColor: const Color(0xFFE11D48),
                iconBg: const Color(0xFFFFF1F2),
                title: 'Hỗ trợ du khách 1900 6888',
                subtitle: 'Tổng đài hỗ trợ khẩn cấp 24/7',
                trailing: const Row(
                  children: [
                    Text(
                      'Gọi ngay',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFFE11D48),
                      ),
                    ),
                    Icon(
                      Icons.chevron_right_rounded,
                      size: 16,
                      color: Color(0xFFE11D48),
                    ),
                  ],
                ),
                onTap: () {},
              ),
              const Divider(height: 1, indent: 56),

              // Đăng xuất
              _buildSettingTile(
                icon: Icons.logout_rounded,
                iconColor: AppCultureColors.error,
                iconBg: const Color(0xFFFEE2E2),
                title: 'Đăng xuất',
                subtitle: 'Thoát tài khoản khỏi thiết bị',
                titleColor: AppCultureColors.error,
                onTap: _handleLogout,
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildSettingTile({
    required IconData icon,
    required Color iconColor,
    required Color iconBg,
    required String title,
    required String subtitle,
    Widget? trailing,
    Color? titleColor,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: iconBg,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: iconColor, size: 20),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: titleColor ?? AppCultureColors.textDark,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppCultureColors.textMuted,
                    ),
                  ),
                ],
              ),
            ),
            trailing ??
                const Icon(
                  Icons.chevron_right_rounded,
                  color: AppCultureColors.textMuted,
                  size: 18,
                ),
          ],
        ),
      ),
    );
  }
}
