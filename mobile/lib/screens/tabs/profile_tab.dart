import 'package:flutter/foundation.dart' show ValueListenable;
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
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
import '../../core/services/notification_service.dart';
import '../../core/services/token_storage.dart';
import '../../tourist_auth_screen.dart' show TouristAuthScreen;
import '../account/password_screens.dart';
import '../common/heritage_motion.dart';
import '../common/tab_refresh.dart';
import '../forum/forum_widgets.dart' show ForumAvatar;
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

  final ValueListenable<int>? selectedTab;

  const ProfileTab({super.key, required this.currentUser, this.onUserUpdated, this.selectedTab});

  @override
  State<ProfileTab> createState() => _ProfileTabState();
}

class _ProfileTabState extends State<ProfileTab> with RefreshOnTabReturn {

  @override
  ValueListenable<int>? get selectedTab => widget.selectedTab;

  @override
  int get tabIndex => 3;

  @override
  void onTabReturn() => _loadProfileData();
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

  /// Chỉ lần tải đầu hiện vòng chờ; kéo làm mới thì giữ nội dung cũ.
  bool _firstLoad = true;

  @override
  void initState() {
    super.initState();
    _user = widget.currentUser;
    _loadProfileData();
  }

  Future<void> _loadProfileData() async {
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
        _firstLoad = false;
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

  void _openTickets() {
    Navigator.of(
      context,
    ).push(MaterialPageRoute(builder: (_) => const TicketsScreen()));
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

  /// Số tổng đài hiển thị và số để gọi (lấy từ nội dung cũ của ứng dụng; đổi tại đây khi có số chính thức).
  static const _hotlineLabel = '1900 6888';
  static const _hotlineNumber = '19006888';

  Future<void> _callHotline() async {
    final opened = await launchUrl(Uri(scheme: 'tel', path: _hotlineNumber));
    if (!opened && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Không mở được trình gọi điện trên thiết bị này.'),
        behavior: SnackBarBehavior.floating,
      ));
    }
  }

  void _openChangePassword() {
    Navigator.of(context).push(MaterialPageRoute(
      builder: (_) => ChangePasswordScreen(
        signedInWithGoogle: (_user.authProvider ?? '').toUpperCase() == 'GOOGLE',
      ),
    ));
  }

  void _openNotificationDialog() => showNotificationSheet(context);

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
                fontWeight: FontWeight.w700,
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
              style: TextStyle(fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );

    if (confirm == true) {
      // Ngắt luồng và xoá thông báo của tài khoản này trước khi rời phiên
      NotificationCenter.instance.clear();
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
        bottom: false,
        child: _firstLoad
            ? const Center(
                child: CircularProgressIndicator(
                  color: AppCultureColors.heritageJade,
                ),
              )
            : RefreshIndicator(
                onRefresh: _loadProfileData,
                color: AppCultureColors.heritageJade,
                child: ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  // Chừa chỗ cho thanh điều hướng và nút CHECK-IN nổi
                  padding: const EdgeInsets.fromLTRB(16, 10, 16, 110),
                  children: [
                    Reveal(order: 0, child: _buildProfileHeroCard()),
                    const SizedBox(height: 26),
                    Reveal(order: 1, child: _buildHeritageSection()),
                    const SizedBox(height: 26),
                    Reveal(
                      order: 2,
                      child: _buildServicesSection(activeTicketsCount),
                    ),
                    const SizedBox(height: 26),
                    Reveal(order: 3, child: _buildGeneralSettingsSection()),
                  ],
                ),
              ),
      ),
    );
  }

  // ─────────────────────────── Thẻ hồ sơ ───────────────────────────

  /// Thẻ hồ sơ kiểu di sản: nền ngọc, hoa văn trống đồng xoay chậm,
  /// ảnh đại diện thật, hạng thành viên kèm thanh tiến độ lên hạng.
  Widget _buildProfileHeroCard() {
    // Hạng xét theo tổng điểm đã kiếm để đổi voucher không làm tụt hạng
    final earned = _points.lifetimeEarned;
    final rank = rankTierFor(earned);
    final next = nextRankFor(earned);
    final joinedAt = DateTime.tryParse(_user.createdAt ?? '')?.toLocal();

    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [AppCultureColors.jadeDark, AppCultureColors.oceanBlue],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(26),
        boxShadow: [
          BoxShadow(
            color: AppCultureColors.heritageJade.withValues(alpha: 0.28),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Stack(
        children: [
          Positioned(
            right: -70,
            top: -70,
            child: SlowSpin(
              child: DrumMotif(
                size: 230,
                color: Colors.white.withValues(alpha: 0.1),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(18, 14, 14, 18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        'Hồ sơ du khách',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                          color: Colors.white.withValues(alpha: 0.85),
                        ),
                      ),
                    ),
                    _glassIconButton(
                      icon: Icons.notifications_none_rounded,
                      iconWidget: const NotificationBellIcon(size: 19),
                      tooltip: 'Thông báo',
                      onTap: _openNotificationDialog,
                    ),
                    const SizedBox(width: 8),
                    _glassIconButton(
                      icon: Icons.edit_outlined,
                      tooltip: 'Sửa hồ sơ',
                      onTap: _openEditProfileModal,
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(3),
                      decoration: const BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: LinearGradient(
                          colors: [AppCultureColors.gold, Colors.white],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                      ),
                      child: ForumAvatar(
                        name: _user.fullName,
                        url: _user.avatarUrl,
                        size: 64,
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _user.fullName,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.w700,
                              color: Colors.white,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Wrap(
                            spacing: 6,
                            runSpacing: 6,
                            children: [
                              _glassChip(Icons.workspace_premium_rounded, rank),
                              if (joinedAt != null)
                                _glassChip(
                                  Icons.calendar_today_rounded,
                                  'Từ ${formatDate(joinedAt)}',
                                ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 18),
                // Tiến độ lên hạng
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        next == null
                            ? 'Bạn đã đạt hạng cao nhất'
                            : 'Còn ${formatThousands(next.remaining)} điểm lên ${next.name}',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 12.5,
                          color: Colors.white.withValues(alpha: 0.9),
                        ),
                      ),
                    ),
                    const Icon(
                      Icons.auto_awesome_rounded,
                      size: 14,
                      color: Colors.amberAccent,
                    ),
                  ],
                ),
                const SizedBox(height: 7),
                ClipRRect(
                  borderRadius: BorderRadius.circular(6),
                  child: TweenAnimationBuilder<double>(
                    tween: Tween(begin: 0, end: rankProgressFor(earned)),
                    duration: const Duration(milliseconds: 900),
                    curve: Curves.easeOutCubic,
                    builder: (_, v, _) => LinearProgressIndicator(
                      value: v,
                      minHeight: 7,
                      backgroundColor: Colors.white.withValues(alpha: 0.22),
                      valueColor: const AlwaysStoppedAnimation(
                        Colors.amberAccent,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.16),
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(
                      color: Colors.white.withValues(alpha: 0.2),
                    ),
                  ),
                  child: Row(
                    children: [
                      _heroStat(
                        icon: Icons.star_rounded,
                        iconColor: Colors.amberAccent,
                        value: _points.currentBalance,
                        label: 'Điểm khả dụng',
                      ),
                      _heroDivider(),
                      _heroStat(
                        icon: Icons.military_tech_rounded,
                        iconColor: Colors.white,
                        value: _badges.length,
                        label: 'Huy hiệu',
                      ),
                      _heroDivider(),
                      _heroStat(
                        icon: Icons.place_rounded,
                        iconColor: Colors.white,
                        value: _timeline.length,
                        label: 'Điểm đã đến',
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

  Widget _glassIconButton({
    required IconData icon,
    required String tooltip,
    required VoidCallback onTap,
    Widget? iconWidget,
  }) {
    return Tooltip(
      message: tooltip,
      child: Material(
        color: Colors.white.withValues(alpha: 0.18),
        shape: const CircleBorder(),
        child: InkWell(
          customBorder: const CircleBorder(),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(8),
            child: iconWidget ?? Icon(icon, size: 19, color: Colors.white),
          ),
        ),
      ),
    );
  }

  Widget _glassChip(IconData icon, String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.18),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 13, color: Colors.white),
          const SizedBox(width: 4),
          Text(
            text,
            style: const TextStyle(
              fontSize: 11.5,
              fontWeight: FontWeight.w500,
              color: Colors.white,
            ),
          ),
        ],
      ),
    );
  }

  Widget _heroStat({
    required IconData icon,
    required Color iconColor,
    required int value,
    required String label,
  }) {
    return Expanded(
      child: Column(
        children: [
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, color: iconColor, size: 16),
              const SizedBox(width: 4),
              CountUpText(
                value: value,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
          const SizedBox(height: 2),
          Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.8),
              fontSize: 11,
            ),
          ),
        ],
      ),
    );
  }

  Widget _heroDivider() => Container(width: 1, height: 30, color: Colors.white24);

  // ─────────────────────── Hành trình di sản ───────────────────────

  /// Bốn ô lối tắt; nội dung chi tiết chỉ mở ra khi bấm vào.
  Widget _buildHeritageSection() {
    final lastGain = _recentPoints.where((t) => t.isEarning).firstOrNull;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionTitle('Hành trình di sản', 'Dấu ấn văn hoá bạn đã ghi lại'),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _HeritageTile(
                icon: Icons.auto_stories_rounded,
                color: AppCultureColors.heritageJade,
                background: AppCultureColors.jadeLight,
                title: 'Nhật ký hành trình',
                value: '${_timeline.length} điểm đã đến',
                onTap: _showJourneySheet,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _HeritageTile(
                icon: Icons.stars_rounded,
                color: AppCultureColors.amberDark,
                background: AppCultureColors.rewardBg,
                title: 'Lịch sử tích điểm',
                value: lastGain == null
                    ? 'Chưa có giao dịch'
                    : 'Gần nhất +${formatThousands(lastGain.amount.abs())}',
                onTap: _showPointsSheet,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _HeritageTile(
                icon: Icons.military_tech_rounded,
                color: AppCultureColors.oceanBlue,
                background: AppCultureColors.oceanLight,
                title: 'Huy hiệu di sản',
                value: '${_badges.length} đã mở khoá',
                preview: _badges.isEmpty
                    ? null
                    : Row(
                        children: [
                          for (final b in _badges.take(3))
                            Padding(
                              padding: const EdgeInsets.only(right: 4),
                              child: SizedBox(
                                width: 26,
                                height: 26,
                                child: FittedBox(
                                  child: BadgeIcon(iconUrl: b.imageUrl, earned: true),
                                ),
                              ),
                            ),
                        ],
                      ),
                onTap: _openBadges,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _HeritageTile(
                icon: Icons.card_giftcard_rounded,
                color: const Color(0xFFDB2777),
                background: const Color(0xFFFCE7F3),
                title: 'Đổi thưởng',
                value: '${formatThousands(_points.currentBalance)} điểm khả dụng',
                onTap: _openWallet,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _sectionTitle(String title, [String? subtitle]) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.w700,
            color: AppCultureColors.textDark,
          ),
        ),
        if (subtitle != null) ...[
          const SizedBox(height: 2),
          Text(
            subtitle,
            style: const TextStyle(fontSize: 12.5, color: AppCultureColors.textMuted),
          ),
        ],
      ],
    );
  }

  // ─────────────────────── Bảng trượt chi tiết ───────────────────────

  void _showPointsSheet() {
    _showDetailSheet(
      title: 'Lịch sử tích điểm',
      subtitle: 'Các giao dịch điểm gần đây',
      icon: Icons.stars_rounded,
      color: AppCultureColors.amberDark,
      children: (ctx) => [
        Container(
          padding: const EdgeInsets.symmetric(vertical: 14),
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
        const SizedBox(height: 14),
        if (_recentPoints.isEmpty)
          _sheetEmpty(
            Icons.stars_outlined,
            'Chưa có giao dịch điểm. Check-in điểm đến và hoàn thành nhiệm vụ để bắt đầu tích điểm.',
          )
        else
          for (final (i, tx) in _recentPoints.indexed)
            Reveal(order: i, child: PointTransactionTile(tx: tx)),
        const SizedBox(height: 6),
        SizedBox(
          height: 48,
          child: FilledButton.icon(
            onPressed: () {
              Navigator.of(ctx).pop();
              _openWallet();
            },
            style: FilledButton.styleFrom(
              backgroundColor: AppCultureColors.heritageJade,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            ),
            icon: const Icon(Icons.account_balance_wallet_outlined, size: 19),
            label: const Text(
              'Xem toàn bộ & đổi thưởng',
              style: TextStyle(fontWeight: FontWeight.w600),
            ),
          ),
        ),
      ],
    );
  }

  void _showJourneySheet() {
    _showDetailSheet(
      title: 'Nhật ký hành trình',
      subtitle: '${_timeline.length} điểm di sản đã check-in',
      icon: Icons.auto_stories_rounded,
      color: AppCultureColors.heritageJade,
      children: (_) => _timeline.isEmpty
          ? [
              _sheetEmpty(
                Icons.explore_outlined,
                'Chưa có điểm nào. Check-in tại điểm đến trong hành trình để ghi lại dấu ấn đầu tiên.',
              ),
            ]
          : [
              for (final (i, item) in _timeline.indexed)
                Reveal(
                  order: i < 6 ? i : 0,
                  child: _buildTimelineItem(item, isLast: i == _timeline.length - 1),
                ),
            ],
    );
  }

  /// Bảng trượt từ dưới lên, kéo để mở rộng hoặc vuốt xuống để đóng.
  void _showDetailSheet({
    required String title,
    required String subtitle,
    required IconData icon,
    required Color color,
    required List<Widget> Function(BuildContext ctx) children,
  }) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => DraggableScrollableSheet(
        initialChildSize: 0.72,
        minChildSize: 0.4,
        maxChildSize: 0.94,
        expand: false,
        builder: (ctx, scroll) => Container(
          decoration: const BoxDecoration(
            color: AppCultureColors.background,
            borderRadius: BorderRadius.vertical(top: Radius.circular(26)),
          ),
          child: ListView(
            controller: scroll,
            padding: EdgeInsets.fromLTRB(
              16,
              10,
              16,
              24 + MediaQuery.paddingOf(ctx).bottom,
            ),
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppCultureColors.border,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: color.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Icon(icon, color: color, size: 22),
                  ),
                  const SizedBox(width: 12),
                  Expanded(child: _sectionTitle(title, subtitle)),
                  IconButton(
                    onPressed: () => Navigator.of(ctx).pop(),
                    icon: const Icon(Icons.close_rounded),
                    color: AppCultureColors.textMuted,
                    tooltip: 'Đóng',
                  ),
                ],
              ),
              const SizedBox(height: 16),
              ...children(ctx),
            ],
          ),
        ),
      ),
    );
  }

  Widget _sheetEmpty(IconData icon, String text) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 28, horizontal: 12),
      child: Column(
        children: [
          Icon(icon, size: 40, color: AppCultureColors.textLight),
          const SizedBox(height: 10),
          Text(
            text,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 13,
              height: 1.45,
              color: AppCultureColors.textMuted,
            ),
          ),
        ],
      ),
    );
  }

  Widget _pointSummaryCell(String label, int value) => Expanded(
    child: Column(
      children: [
        CountUpText(
          value: value,
          style: const TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.w700,
            color: AppCultureColors.rewardText,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: const TextStyle(
            fontSize: 11.5,
            color: AppCultureColors.textMuted,
          ),
        ),
      ],
    ),
  );

  Widget _buildTimelineItem(JourneyTimelineItem item, {required bool isLast}) {
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Đường nối các điểm đã đến
          Column(
            children: [
              const SizedBox(height: 18),
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
                    color: AppCultureColors.heritageJade.withValues(alpha: 0.35),
                  ),
                ),
            ],
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: AppCultureColors.border),
              ),
              child: Row(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: AppCultureColors.jadeLight,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(
                      Icons.temple_buddhist_rounded,
                      color: AppCultureColors.heritageJade,
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          item.siteName,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: AppCultureColors.textDark,
                          ),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          [item.location, item.checkinDate]
                              .where((s) => s.isNotEmpty)
                              .join(' · '),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 12,
                            color: AppCultureColors.textMuted,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    item.rewardPoints,
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: AppCultureColors.amberDark,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ─────────────────────── Vé & hỗ trợ ───────────────────────

  Widget _buildServicesSection(int activeCount) {
    final refundsInProgress = _refunds.where((r) => r.isInProgress).length;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionTitle('Vé & hỗ trợ'),
        const SizedBox(height: 12),
        _groupCard([
          _buildSettingTile(
            icon: Icons.confirmation_number_outlined,
            iconColor: AppCultureColors.heritageJade,
            iconBg: AppCultureColors.jadeLight,
            title: 'Ví vé & chi phí du lịch',
            subtitle: '${_tickets.length} vé · hoá đơn, mã QR',
            trailing: _badgeTrailing(
              '$activeCount khả dụng',
              AppCultureColors.jadeLight,
              AppCultureColors.jadeDark,
            ),
            onTap: _openTickets,
          ),
          _tileDivider(),
          _buildSettingTile(
            icon: Icons.support_agent_rounded,
            iconColor: const Color(0xFFE11D48),
            iconBg: const Color(0xFFFFF1F2),
            title: 'Hỗ trợ & khiếu nại',
            subtitle: 'Hoàn tiền và xử lý sự cố vé',
            trailing: refundsInProgress > 0
                ? _badgeTrailing(
                    '$refundsInProgress đang xử lý',
                    AppCultureColors.rewardBg,
                    AppCultureColors.rewardText,
                  )
                : null,
            onTap: _openRefunds,
          ),
        ]),
      ],
    );
  }

  Widget _badgeTrailing(String text, Color bg, Color fg, {bool chevron = true}) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: bg,
            borderRadius: BorderRadius.circular(10),
          ),
          child: Text(
            text,
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: fg),
          ),
        ),
        if (chevron) ...[
          const SizedBox(width: 4),
          const Icon(
            Icons.chevron_right_rounded,
            color: AppCultureColors.textLight,
            size: 20,
          ),
        ],
      ],
    );
  }

  // ─────────────────────── Cài đặt ───────────────────────

  Widget _buildGeneralSettingsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionTitle('Cài đặt'),
        const SizedBox(height: 12),
        _groupCard([
          _buildSettingTile(
            icon: Icons.person_outline_rounded,
            iconColor: AppCultureColors.oceanBlue,
            iconBg: AppCultureColors.oceanLight,
            title: 'Thông tin cá nhân',
            subtitle: 'Họ tên, email, số điện thoại',
            onTap: _openEditProfileModal,
          ),
          _tileDivider(),
          _buildSettingTile(
            icon: Icons.lock_reset_rounded,
            iconColor: AppCultureColors.jadeDark,
            iconBg: AppCultureColors.jadeLight,
            title: 'Đổi mật khẩu',
            subtitle: 'Bảo vệ tài khoản của bạn',
            onTap: _openChangePassword,
          ),
          _tileDivider(),
          // Ứng dụng mới có tiếng Việt: chỉ ghi rõ, không cho bấm
          _buildSettingTile(
            icon: Icons.language_rounded,
            iconColor: AppCultureColors.amberDark,
            iconBg: AppCultureColors.rewardBg,
            title: 'Ngôn ngữ',
            subtitle: 'Ứng dụng hiển thị bằng tiếng Việt',
            trailing: _badgeTrailing('Tiếng Việt', AppCultureColors.rewardBg, AppCultureColors.rewardText, chevron: false),
            onTap: null,
          ),
          _tileDivider(),
          _buildSettingTile(
            icon: Icons.phone_in_talk_outlined,
            iconColor: AppCultureColors.oceanDark,
            iconBg: AppCultureColors.oceanLight,
            title: 'Tổng đài $_hotlineLabel',
            subtitle: 'Bấm để gọi hỗ trợ du khách',
            trailing: const Icon(Icons.call_rounded, color: AppCultureColors.oceanBlue, size: 20),
            onTap: _callHotline,
          ),
        ]),
        const SizedBox(height: 14),
        _groupCard([
          _buildSettingTile(
            icon: Icons.logout_rounded,
            iconColor: AppCultureColors.error,
            iconBg: const Color(0xFFFEE2E2),
            title: 'Đăng xuất',
            subtitle: 'Thoát tài khoản khỏi thiết bị',
            titleColor: AppCultureColors.error,
            onTap: _handleLogout,
          ),
        ]),
      ],
    );
  }

  Widget _groupCard(List<Widget> children) {
    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppCultureColors.border),
      ),
      child: Column(children: children),
    );
  }

  Widget _tileDivider() =>
      const Divider(height: 1, indent: 66, color: AppCultureColors.borderLight);

  Widget _buildSettingTile({
    required IconData icon,
    required Color iconColor,
    required Color iconBg,
    required String title,
    required String subtitle,
    Widget? trailing,
    Color? titleColor,
    required VoidCallback? onTap,
  }) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(9),
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
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: titleColor ?? AppCultureColors.textDark,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppCultureColors.textMuted,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            trailing ??
                const Icon(
                  Icons.chevron_right_rounded,
                  color: AppCultureColors.textLight,
                  size: 20,
                ),
          ],
        ),
      ),
    );
  }
}

/// Ô lối tắt trong "Hành trình di sản": biểu tượng màu, tiêu đề, số liệu, lún nhẹ khi chạm.
class _HeritageTile extends StatelessWidget {
  final IconData icon;
  final Color color;
  final Color background;
  final String title;
  final String value;
  final Widget? preview;
  final VoidCallback onTap;

  const _HeritageTile({
    required this.icon,
    required this.color,
    required this.background,
    required this.title,
    required this.value,
    this.preview,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Pressable(
      onTap: onTap,
      child: Container(
        height: 132,
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppCultureColors.border),
          boxShadow: [
            BoxShadow(
              color: color.withValues(alpha: 0.08),
              blurRadius: 14,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(9),
                  decoration: BoxDecoration(
                    color: background,
                    borderRadius: BorderRadius.circular(13),
                  ),
                  child: Icon(icon, color: color, size: 21),
                ),
                const Spacer(),
                if (preview != null) Flexible(child: preview!),
                Icon(Icons.arrow_outward_rounded, size: 16, color: color.withValues(alpha: 0.7)),
              ],
            ),
            const Spacer(),
            Text(
              title,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: AppCultureColors.textDark,
              ),
            ),
            const SizedBox(height: 3),
            Text(
              value,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(fontSize: 12, color: color, fontWeight: FontWeight.w500),
            ),
          ],
        ),
      ),
    );
  }
}
