import 'package:flutter/foundation.dart' show ValueListenable;
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/constants/app_colors.dart';
import '../../core/models/auth_models.dart';
import '../../core/models/gamification_model.dart'
    show
        AchievementSummaryModel,
        PointTransactionModel,
        UserPointModel,
        formatDate,
        formatThousands;
import '../../core/models/journey_model.dart';
import '../../core/models/booking_model.dart' show BookingModel;
import '../../core/services/auth_service.dart';
import '../../core/models/refund_model.dart';
import '../../core/services/progress_service.dart';
import '../../core/services/refund_service.dart';
import '../../core/services/notification_service.dart';
import '../../core/services/realtime_service.dart';
import '../../core/services/token_storage.dart';
import '../../l10n/locale_controller.dart';
import '../../tourist_auth_screen.dart' show TouristAuthScreen;
import '../account/password_screens.dart';
import '../common/bright.dart';
import '../common/heritage_motion.dart';
import '../common/tab_refresh.dart';
import '../forum/forum_widgets.dart' show ForumAvatar;
import '../modals/edit_profile_modal.dart';
import '../modals/notification_dialog.dart';
import '../rewards/achievements_screen.dart';
import '../rewards/badges_screen.dart';
import '../rewards/rewards_widgets.dart' show BadgeIcon, PointTransactionTile;
import '../rewards/wallet_screen.dart';
import '../bookings/my_bookings_screen.dart';
import '../chat/provider_chat_list_screen.dart';
import '../refunds_screen.dart';

class ProfileTab extends StatefulWidget {
  final UserModel currentUser;
  final ValueChanged<UserModel>? onUserUpdated;

  final ValueListenable<int>? selectedTab;

  const ProfileTab({
    super.key,
    required this.currentUser,
    this.onUserUpdated,
    this.selectedTab,
  });

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
  static const _emptyAchievementSummary = AchievementSummaryModel(
    totalAchieved: 0,
    unclaimedCount: 0,
    totalClaimed: 0,
    totalPointsEarned: 0,
  );

  late UserModel _user;
  UserPointModel _points = _emptyPoints;
  AchievementSummaryModel _achievementSummary = _emptyAchievementSummary;
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
      keep<AchievementSummaryModel>(
        _progress.getAchievementSummary,
        _achievementSummary,
      ),
    ]);

    if (mounted) {
      setState(() {
        _points = results[0] as UserPointModel;
        _badges = results[1] as List<BadgeItem>;
        _timeline = results[2] as List<JourneyTimelineItem>;
        _tickets = results[3] as List<BookingModel>;
        _recentPoints = results[4] as List<PointTransactionModel>;
        _refunds = results[5] as List<RefundModel>;
        _achievementSummary = results[6] as AchievementSummaryModel;
        _firstLoad = false;
      });
    }
  }

  Future<void> _openAchievements() async {
    await Navigator.of(
      context,
    ).push(MaterialPageRoute(builder: (_) => const AchievementsScreen()));
    if (mounted) _loadProfileData();
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

  /// Mở "Hỗ trợ từ nhà tour" — lịch sử chat với các nhà tour khác nhau.
  void _openProviderChats() {
    Navigator.of(
      context,
    ).push(MaterialPageRoute(builder: (_) => const ProviderChatListScreen()));
  }

  /// Mở "Đơn đặt tour của tôi" — gồm vé, đơn chờ thanh toán, giao dịch và chat
  /// với nhà tour.
  void _openBookings() {
    Navigator.of(
      context,
    ).push(MaterialPageRoute(builder: (_) => const MyBookingsScreen()));
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
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(context.l10n.hotlineCannotOpen),
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  void _openChangePassword() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => ChangePasswordScreen(
          signedInWithGoogle:
              (_user.authProvider ?? '').toUpperCase() == 'GOOGLE',
        ),
      ),
    );
  }

  void _openNotificationDialog() => showNotificationSheet(context);

  void _handleLogout() async {
    final l10n = context.l10n;
    final bool? confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
        title: Row(
          children: [
            const Icon(Icons.logout_rounded, color: AppCultureColors.error),
            const SizedBox(width: 10),
            Flexible(
              child: Text(
                l10n.logoutConfirmTitle,
                style: const TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w700,
                  color: AppCultureColors.textDark,
                ),
              ),
            ),
          ],
        ),
        content: Text(
          l10n.logoutConfirmMessage,
          style: const TextStyle(
            fontSize: 13,
            color: AppCultureColors.textMuted,
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: Text(
              l10n.commonCancel,
              style: const TextStyle(color: AppCultureColors.textMuted),
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
            child: Text(
              l10n.logoutConfirmButton,
              style: const TextStyle(fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );

    if (confirm == true) {
      // Ngắt luồng và xoá thông báo của tài khoản này trước khi rời phiên
      NotificationCenter.instance.clear();
      // Ngắt kết nối chat tức thời (WebSocket) của tài khoản cũ
      await RealtimeService.instance.disconnect();
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
                  padding: const EdgeInsets.fromLTRB(16, 10, 16, 40),
                  children: [
                    Reveal(order: 0, child: _buildProfileHeroCard()),
                    const SizedBox(height: 26),
                    Reveal(order: 1, child: _buildHeritageSection()),
                    const SizedBox(height: 26),
                    Reveal(order: 2, child: _buildServicesSection()),
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
    final l10n = context.l10n;
    final earned = _points.lifetimeEarned;
    final rank = _rankLabel(rankTierFor(earned));
    final next = nextRankFor(earned);
    final joinedAt = DateTime.tryParse(_user.createdAt ?? '')?.toLocal();

    // Thẻ hồ sơ sáng: nền trắng → ngọc nhạt, chữ màu mực, ba ô thống kê theo nhóm màu
    return BrightHeroCard(
      tone: AppTone.jade,
      radius: 26,
      padding: const EdgeInsets.fromLTRB(18, 14, 14, 18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  l10n.profileHeader,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: AppCultureColors.textMuted,
                  ),
                ),
              ),
              _lightIconButton(
                icon: Icons.notifications_none_rounded,
                iconWidget: const NotificationBellIcon(
                  size: 19,
                  color: AppCultureColors.textDark,
                ),
                tooltip: l10n.profileNotifications,
                onTap: _openNotificationDialog,
              ),
              const SizedBox(width: 8),
              _lightIconButton(
                icon: Icons.edit_outlined,
                tooltip: l10n.profileEdit,
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
                    colors: [
                      AppCultureColors.goldBright,
                      AppCultureColors.jade400,
                    ],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
                child: Container(
                  padding: const EdgeInsets.all(2),
                  decoration: const BoxDecoration(
                    shape: BoxShape.circle,
                    color: AppCultureColors.surface,
                  ),
                  child: ForumAvatar(
                    name: _user.fullName,
                    url: _user.avatarUrl,
                    size: 62,
                  ),
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
                        fontWeight: FontWeight.w800,
                        color: AppCultureColors.textDark,
                        letterSpacing: -0.2,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: [
                        _toneChip(
                          Icons.workspace_premium_rounded,
                          rank,
                          AppTone.brass,
                        ),
                        if (joinedAt != null)
                          _toneChip(
                            Icons.calendar_today_rounded,
                            l10n.profileMemberSince(formatDate(joinedAt)),
                            AppTone.jade,
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
                      ? l10n.profileTopRank
                      : l10n.profilePointsToNextRank(
                          formatThousands(next.remaining),
                          _rankLabel(next.name),
                        ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                    color: AppCultureColors.textMuted,
                  ),
                ),
              ),
              const Icon(
                Icons.auto_awesome_rounded,
                size: 15,
                color: AppCultureColors.gold,
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
                backgroundColor: AppTone.brass.soft.withValues(alpha: 0.6),
                valueColor: const AlwaysStoppedAnimation(
                  AppCultureColors.brass500,
                ),
              ),
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: StatTile(
                  icon: Icons.star_rounded,
                  tone: AppTone.brass,
                  value: _points.currentBalance,
                  label: l10n.profileStatPoints,
                  compact: true,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: StatTile(
                  icon: Icons.military_tech_rounded,
                  tone: AppTone.coral,
                  value: _badges.length,
                  label: l10n.profileStatBadges,
                  compact: true,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: StatTile(
                  icon: Icons.place_rounded,
                  tone: AppTone.jade,
                  value: _timeline.length,
                  label: l10n.profileStatPlaces,
                  compact: true,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  /// Tên hạng trong `journey_model.dart` là tiếng Việt cố định ⇒ đổi sang ngôn ngữ đang chọn.
  String _rankLabel(String vietnameseName) {
    final l10n = context.l10n;
    return switch (vietnameseName) {
      'Bạch Kim' => l10n.rankPlatinum,
      'Hạng Vàng' => l10n.rankGold,
      'Hạng Bạc' => l10n.rankSilver,
      'Hạng Đồng' => l10n.rankBronze,
      _ => vietnameseName,
    };
  }

  Widget _lightIconButton({
    required IconData icon,
    required String tooltip,
    required VoidCallback onTap,
    Widget? iconWidget,
  }) {
    return Tooltip(
      message: tooltip,
      child: Material(
        color: AppCultureColors.surface,
        shape: const CircleBorder(
          side: BorderSide(color: AppCultureColors.borderLight),
        ),
        child: InkWell(
          customBorder: const CircleBorder(),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(8),
            child:
                iconWidget ??
                Icon(icon, size: 19, color: AppCultureColors.textDark),
          ),
        ),
      ),
    );
  }

  Widget _toneChip(IconData icon, String text, AppTone tone) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
      decoration: BoxDecoration(
        color: tone.tint,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: tone.soft),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 13, color: tone.strong),
          const SizedBox(width: 4),
          Text(
            text,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: tone.strong,
            ),
          ),
        ],
      ),
    );
  }

  // ─────────────────────── Hành trình di sản ───────────────────────

  /// Banner Thành tựu & Nhận thưởng cùng bốn ô lối tắt; nội dung chi tiết chỉ mở ra khi bấm vào.
  Widget _buildHeritageSection() {
    final lastGain = _recentPoints.where((t) => t.isEarning).firstOrNull;
    final unclaimed = _achievementSummary.unclaimedCount;
    final l10n = context.l10n;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionTitle(l10n.heritageTitle, l10n.heritageSubtitle),
        const SizedBox(height: 12),
        Pressable(
          onTap: _openAchievements,
          // Thẻ sáng nhóm vàng (thưởng); có thưởng chờ nhận thì nhấn san hô
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [AppCultureColors.surface, AppTone.brass.tint],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: unclaimed > 0 ? AppTone.coral.soft : AppTone.brass.soft,
                width: unclaimed > 0 ? 1.5 : 1,
              ),
              boxShadow: [
                BoxShadow(
                  color: AppCultureColors.brass500.withValues(alpha: 0.12),
                  blurRadius: 14,
                  offset: const Offset(0, 6),
                ),
              ],
            ),
            // Tiêu đề hiện đủ (không bị cắt bởi chip); số thưởng chờ nhận nằm ở dòng phụ màu san hô
            // + chấm số trên icon. Ẩn "+0 JP" khi chưa nhận điểm nào.
            child: Row(
              children: [
                Stack(
                  clipBehavior: Clip.none,
                  children: [
                    const IconTile(
                      icon: Icons.emoji_events_rounded,
                      tone: AppTone.brass,
                      size: 46,
                    ),
                    if (unclaimed > 0)
                      Positioned(
                        right: -4,
                        top: -4,
                        child: Container(
                          constraints: const BoxConstraints(minWidth: 20),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 5,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: AppCultureColors.coral,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(
                              color: AppCultureColors.surface,
                              width: 1.5,
                            ),
                          ),
                          child: Text(
                            '$unclaimed',
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w800,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        l10n.achievementsTitle,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 15,
                          height: 1.25,
                          fontWeight: FontWeight.w700,
                          color: AppCultureColors.textDark,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text.rich(
                        TextSpan(
                          children: [
                            TextSpan(
                              text: l10n.achievementsAchieved(
                                _achievementSummary.totalAchieved,
                              ),
                            ),
                            if (_achievementSummary.totalPointsEarned > 0)
                              TextSpan(
                                text:
                                    ' · +${formatThousands(_achievementSummary.totalPointsEarned)} JP',
                              ),
                            if (unclaimed > 0)
                              TextSpan(
                                text:
                                    ' · ${l10n.achievementsUnclaimed(unclaimed)}',
                                style: const TextStyle(
                                  color: AppCultureColors.coralDark,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                          ],
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                          color: AppCultureColors.brass800,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                const Icon(
                  Icons.chevron_right_rounded,
                  color: AppCultureColors.textMuted,
                  size: 22,
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _HeritageTile(
                icon: Icons.auto_stories_rounded,
                color: AppCultureColors.heritageJade,
                background: AppCultureColors.jadeLight,
                title: l10n.journeyLogTitle,
                value: l10n.journeyPlacesVisited(_timeline.length),
                onTap: _showJourneySheet,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _HeritageTile(
                icon: Icons.stars_rounded,
                color: AppCultureColors.amberDark,
                background: AppCultureColors.rewardBg,
                title: l10n.pointsHistoryTitle,
                value: lastGain == null
                    ? l10n.pointsNoTransactions
                    : l10n.pointsLatestGain(
                        formatThousands(lastGain.amount.abs()),
                      ),
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
                title: l10n.badgesTitle,
                value: l10n.badgesUnlocked(_badges.length),
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
                                  child: BadgeIcon(
                                    iconUrl: b.imageUrl,
                                    earned: true,
                                  ),
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
                icon: Icons.confirmation_number_outlined,
                color: AppCultureColors.lacquer500,
                background: AppCultureColors.lacquer50,
                title: l10n.voucherTitle,
                value: l10n.voucherAvailablePoints(
                  formatThousands(_points.currentBalance),
                ),
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
            style: const TextStyle(
              fontSize: 12.5,
              color: AppCultureColors.textMuted,
            ),
          ),
        ],
      ],
    );
  }

  // ─────────────────────── Bảng trượt chi tiết ───────────────────────

  void _showPointsSheet() {
    final l10n = context.l10n;
    _showDetailSheet(
      title: l10n.pointsHistoryTitle,
      subtitle: l10n.pointsHistorySubtitle,
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
              _pointSummaryCell(l10n.pointsEarned, _points.lifetimeEarned),
              _pointSummaryCell(l10n.pointsSpent, _points.lifetimeSpent),
              _pointSummaryCell(l10n.pointsAvailable, _points.currentBalance),
            ],
          ),
        ),
        const SizedBox(height: 14),
        if (_recentPoints.isEmpty)
          _sheetEmpty(Icons.stars_outlined, l10n.pointsEmpty)
        else
          for (final (i, tx) in _recentPoints.indexed)
            Reveal(
              order: i,
              child: PointTransactionTile(tx: tx),
            ),
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
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
              ),
            ),
            icon: const Icon(Icons.account_balance_wallet_outlined, size: 19),
            label: Text(
              l10n.pointsOpenWallet,
              style: const TextStyle(fontWeight: FontWeight.w600),
            ),
          ),
        ),
      ],
    );
  }

  void _showJourneySheet() {
    final l10n = context.l10n;
    _showDetailSheet(
      title: l10n.journeyLogTitle,
      subtitle: l10n.journeyLogSubtitle(_timeline.length),
      icon: Icons.auto_stories_rounded,
      color: AppCultureColors.heritageJade,
      children: (_) => _timeline.isEmpty
          ? [_sheetEmpty(Icons.explore_outlined, l10n.journeyEmpty)]
          : [
              for (final (i, item) in _timeline.indexed)
                Reveal(
                  order: i < 6 ? i : 0,
                  child: _buildTimelineItem(
                    item,
                    isLast: i == _timeline.length - 1,
                  ),
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
                    tooltip: ctx.l10n.commonClose,
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
                    color: AppCultureColors.heritageJade.withValues(
                      alpha: 0.35,
                    ),
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
                          [
                            item.location,
                            item.checkinDate,
                          ].where((s) => s.isNotEmpty).join(' · '),
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

  Widget _buildServicesSection() {
    final refundsInProgress = _refunds.where((r) => r.isInProgress).length;
    final l10n = context.l10n;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionTitle(l10n.servicesTitle),
        const SizedBox(height: 12),
        _groupCard([
          _buildSettingTile(
            icon: Icons.receipt_long_rounded,
            iconColor: AppCultureColors.oceanBlue,
            iconBg: AppCultureColors.oceanLight,
            title: l10n.myBookingsTitle,
            subtitle: l10n.myBookingsSubtitle,
            onTap: _openBookings,
          ),
          _tileDivider(),
          _buildSettingTile(
            icon: Icons.forum_rounded,
            iconColor: AppCultureColors.oceanDark,
            iconBg: AppCultureColors.oceanLight,
            title: l10n.providerSupportTitle,
            subtitle: l10n.providerSupportSubtitle,
            onTap: _openProviderChats,
          ),
          _tileDivider(),
          _buildSettingTile(
            icon: Icons.support_agent_rounded,
            iconColor: AppCultureColors.lacquer500,
            iconBg: AppCultureColors.lacquer50,
            title: l10n.supportTitle,
            subtitle: l10n.supportSubtitle,
            trailing: refundsInProgress > 0
                ? _badgeTrailing(
                    l10n.refundsInProgress(refundsInProgress),
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

  Widget _badgeTrailing(
    String text,
    Color bg,
    Color fg, {
    bool chevron = true,
  }) {
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
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: fg,
            ),
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

  /// Bảng chọn ngôn ngữ; chọn xong app đổi ngay (MaterialApp nghe [LocaleController]).
  void _showLanguageSheet() {
    final controller = LocaleController.instance;
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: AppCultureColors.background,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(26)),
      ),
      builder: (ctx) {
        final l10n = ctx.l10n;
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 10, 16, 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
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
                _sectionTitle(l10n.languageSheetTitle, l10n.languageSheetNote),
                const SizedBox(height: 14),
                _groupCard([
                  for (final (i, lang)
                      in LocaleController.languages.indexed) ...[
                    if (i > 0) _tileDivider(),
                    _languageOption(
                      lang,
                      selected: lang.locale == controller.value,
                      onTap: () {
                        Navigator.of(ctx).pop();
                        controller.setLocale(lang.locale);
                      },
                    ),
                  ],
                ]),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _languageOption(
    AppLanguage lang, {
    required bool selected,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
        child: Row(
          children: [
            Expanded(
              child: Text(
                lang.nativeName,
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                  color: selected
                      ? AppCultureColors.heritageJade
                      : AppCultureColors.textDark,
                ),
              ),
            ),
            if (selected)
              const Icon(
                Icons.check_circle_rounded,
                color: AppCultureColors.heritageJade,
                size: 22,
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildGeneralSettingsSection() {
    final l10n = context.l10n;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionTitle(l10n.settingsTitle),
        const SizedBox(height: 12),
        _groupCard([
          _buildSettingTile(
            icon: Icons.person_outline_rounded,
            iconColor: AppCultureColors.oceanBlue,
            iconBg: AppCultureColors.oceanLight,
            title: l10n.personalInfoTitle,
            subtitle: l10n.personalInfoSubtitle,
            onTap: _openEditProfileModal,
          ),
          _tileDivider(),
          _buildSettingTile(
            icon: Icons.lock_reset_rounded,
            iconColor: AppCultureColors.jadeDark,
            iconBg: AppCultureColors.jadeLight,
            title: l10n.changePasswordTitle,
            subtitle: l10n.changePasswordSubtitle,
            onTap: _openChangePassword,
          ),
          _tileDivider(),
          _buildSettingTile(
            icon: Icons.language_rounded,
            iconColor: AppCultureColors.amberDark,
            iconBg: AppCultureColors.rewardBg,
            title: l10n.languageTitle,
            subtitle: l10n.languageSubtitle,
            trailing: _badgeTrailing(
              LocaleController.instance.current.nativeName,
              AppCultureColors.rewardBg,
              AppCultureColors.rewardText,
            ),
            onTap: _showLanguageSheet,
          ),
          _tileDivider(),
          _buildSettingTile(
            icon: Icons.phone_in_talk_outlined,
            iconColor: AppCultureColors.oceanDark,
            iconBg: AppCultureColors.oceanLight,
            title: l10n.hotlineTitle(_hotlineLabel),
            subtitle: l10n.hotlineSubtitle,
            trailing: const Icon(
              Icons.call_rounded,
              color: AppCultureColors.oceanBlue,
              size: 20,
            ),
            onTap: _callHotline,
          ),
        ]),
        const SizedBox(height: 14),
        _groupCard([
          _buildSettingTile(
            icon: Icons.logout_rounded,
            iconColor: AppCultureColors.error,
            iconBg: AppCultureColors.lacquer100,
            title: l10n.logoutTitle,
            subtitle: l10n.logoutSubtitle,
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
        // Gọn hơn (132 → 108): bớt khoảng trống lớn giữa icon và chữ
        height: 108,
        padding: const EdgeInsets.fromLTRB(14, 12, 12, 12),
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
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: background,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(icon, color: color, size: 20),
                ),
                const Spacer(),
                if (preview != null) Flexible(child: preview!),
                Icon(
                  Icons.arrow_outward_rounded,
                  size: 16,
                  color: color.withValues(alpha: 0.7),
                ),
              ],
            ),
            const Spacer(),
            Text(
              title,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: 14.5,
                fontWeight: FontWeight.w700,
                color: AppCultureColors.textDark,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              value,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 12.5,
                color: color,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
