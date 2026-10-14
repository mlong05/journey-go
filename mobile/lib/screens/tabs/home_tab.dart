import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/models/auth_models.dart';
import '../../core/models/destination_model.dart';
import '../../core/models/journey_model.dart';
import '../../core/services/destination_service.dart';
import '../../core/services/user_data_service.dart';
import '../modals/checkin_modal.dart';
import '../modals/mission_modal.dart';
import '../modals/notification_dialog.dart';
import '../modals/payment_modal.dart';

class HomeTab extends StatefulWidget {
  final UserModel currentUser;
  final Function(int) onNavigateToTab;

  const HomeTab({
    super.key,
    required this.currentUser,
    required this.onNavigateToTab,
  });

  @override
  State<HomeTab> createState() => _HomeTabState();
}

class _HomeTabState extends State<HomeTab> {
  final DestinationService _destinationService = DestinationService();
  final UserDataService _userDataService = UserDataService();

  List<DestinationModel> _destinations = [];
  List<ActiveMission> _missions = [];
  int _userPoints = 350;
  int _badgeCount = 4;
  bool _isLoading = true;
  bool _hasUnreadNotification = true;

  @override
  void initState() {
    super.initState();
    _loadAllData();
  }

  Future<void> _loadAllData() async {
    setState(() => _isLoading = true);

    final results = await Future.wait([
      _destinationService.getApprovedDestinations(),
      _userDataService.getUserPoints(),
      _userDataService.getBadges(),
      _userDataService.getMissions(),
    ]);

    if (mounted) {
      setState(() {
        _destinations = results[0] as List<DestinationModel>;
        _userPoints = results[1] as int;
        _badgeCount = (results[2] as List<BadgeItem>).where((b) => b.isUnlocked).length;
        _missions = results[3] as List<ActiveMission>;
        _isLoading = false;
      });
    }
  }

  void _openCheckInModal(String mode) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => CheckInModal(
        initialTab: mode,
        destinations: _destinations,
        onCheckInSuccess: _loadAllData,
      ),
    );
  }

  void _openMissionModal(ActiveMission mission) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => MissionModal(
        mission: mission,
        onMissionCompleted: _loadAllData,
      ),
    );
  }

  void _openPaymentModal(DestinationModel route) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => PaymentModal(
        route: route,
        onPaymentSuccess: _loadAllData,
      ),
    );
  }

  void _openNotificationDialog() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => NotificationDialog(
        onAllRead: () {
          setState(() => _hasUnreadNotification = false);
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(color: AppCultureColors.heritageJade),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadAllData,
      color: AppCultureColors.heritageJade,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.only(bottom: 90),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Top Hero Banner with Location pill & Bell
            _buildHeroBanner(),

            // User greeting card
            Transform.translate(
              offset: const Offset(0, -28),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: _buildUserCard(),
              ),
            ),

            // On-site activation section (GPS & QR)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: _buildOnSiteActivationSection(),
            ),

            const SizedBox(height: 24),

            // AI Recommended routes section
            _buildRecommendedRoutesSection(),

            const SizedBox(height: 24),

            // Active missions section
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: _buildActiveMissionsSection(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeroBanner() {
    return SizedBox(
      height: 260,
      width: double.infinity,
      child: Stack(
        fit: StackFit.expand,
        children: [
          // Background heritage photo (Khuê Văn Các)
          Image.asset(
            'assets/images/vanmieu.png',
            fit: BoxFit.cover,
          ),

          // Gradient overlay
          Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  Colors.black.withOpacity(0.55),
                  Colors.transparent,
                  Colors.black.withOpacity(0.4),
                ],
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
              ),
            ),
          ),

          // Top action bar
          Positioned(
            top: MediaQuery.of(context).padding.top + 8,
            left: 16,
            right: 16,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                // Location pill
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                  decoration: BoxDecoration(
                    color: Colors.black.withOpacity(0.45),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: Colors.white24),
                  ),
                  child: const Row(
                    children: [
                      Icon(Icons.location_on_rounded, color: AppCultureColors.heritageJade, size: 16),
                      SizedBox(width: 6),
                      Text(
                        'Hà Nội, VN',
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w700,
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ),
                ),

                // Notification bell icon
                GestureDetector(
                  onTap: _openNotificationDialog,
                  child: Stack(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(9),
                        decoration: BoxDecoration(
                          color: Colors.black.withOpacity(0.45),
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white24),
                        ),
                        child: const Icon(
                          Icons.notifications_none_rounded,
                          color: Colors.white,
                          size: 20,
                        ),
                      ),
                      if (_hasUnreadNotification)
                        Positioned(
                          top: 4,
                          right: 4,
                          child: Container(
                            width: 10,
                            height: 10,
                            decoration: const BoxDecoration(
                              color: AppCultureColors.error,
                              shape: BoxShape.circle,
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Hero Center Overlay Box
          Positioned(
            bottom: 44,
            left: 20,
            right: 20,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.92),
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.12),
                    blurRadius: 16,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: const Column(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Text(
                    'TRẢI NGHIỆM THỰC TẾ DI SẢN',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 1.2,
                      color: AppCultureColors.heritageJade,
                    ),
                  ),
                  SizedBox(height: 4),
                  Text(
                    'Chạm vào Lịch sử - Khám phá Văn hóa',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                      color: AppCultureColors.textDark,
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

  Widget _buildUserCard() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: AppCultureColors.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          // Avatar circle with online indicator
          Stack(
            children: [
              CircleAvatar(
                radius: 24,
                backgroundColor: const Color(0xFFB6E3F4),
                child: const Icon(
                  Icons.person,
                  color: Color(0xFF0288D1),
                  size: 30,
                ),
              ),
              Positioned(
                bottom: 0,
                right: 0,
                child: Container(
                  width: 12,
                  height: 12,
                  decoration: BoxDecoration(
                    color: AppCultureColors.heritageJade,
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 2),
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(width: 12),

          // Name and tier
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      'Xin chào, ${widget.currentUser.fullName}',
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w800,
                        color: AppCultureColors.textDark,
                      ),
                    ),
                    const SizedBox(width: 4),
                    const Text('👋', style: TextStyle(fontSize: 13)),
                  ],
                ),
                const SizedBox(height: 3),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppCultureColors.jadeLight,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Text(
                    'Nhà Thám Hiểm',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: AppCultureColors.jadeDark,
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Stats pills
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: AppCultureColors.rewardBg,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppCultureColors.rewardBorder),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.star_rounded, color: AppCultureColors.gold, size: 16),
                    const SizedBox(width: 4),
                    Text(
                      '$_userPoints',
                      style: const TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 12,
                        color: AppCultureColors.rewardText,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: AppCultureColors.oceanLight,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppCultureColors.oceanBlue.withOpacity(0.25)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.military_tech_rounded, color: AppCultureColors.oceanBlue, size: 16),
                    const SizedBox(width: 4),
                    Text(
                      '$_badgeCount',
                      style: const TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 12,
                        color: AppCultureColors.oceanDark,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildOnSiteActivationSection() {
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
                'TRẢI NGHIỆM THỰC TẾ TẠI ĐIỂM ĐẾN',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 0.8,
                  color: AppCultureColors.textDark,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              // Định vị GPS button
              Expanded(
                child: InkWell(
                  onTap: () => _openCheckInModal('gps'),
                  borderRadius: BorderRadius.circular(16),
                  child: Container(
                    height: 48,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFF0288D1), Color(0xFF039BE5)],
                      ),
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF0288D1).withOpacity(0.25),
                          blurRadius: 8,
                          offset: const Offset(0, 3),
                        ),
                      ],
                    ),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.near_me_rounded, color: Colors.white, size: 18),
                        SizedBox(width: 8),
                        Text(
                          'Định vị GPS',
                          style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w700,
                            fontSize: 14,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),

              const SizedBox(width: 12),

              // Quét mã QR button
              Expanded(
                child: InkWell(
                  onTap: () => _openCheckInModal('qr'),
                  borderRadius: BorderRadius.circular(16),
                  child: Container(
                    height: 48,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFF00A86B), Color(0xFF00C853)],
                      ),
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF00A86B).withOpacity(0.25),
                          blurRadius: 8,
                          offset: const Offset(0, 3),
                        ),
                      ],
                    ),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.qr_code_scanner_rounded, color: Colors.white, size: 18),
                        SizedBox(width: 8),
                        Text(
                          'Quét mã QR',
                          style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w700,
                            fontSize: 14,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildRecommendedRoutesSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    width: 4,
                    height: 16,
                    decoration: BoxDecoration(
                      color: AppCultureColors.oceanBlue,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                  const SizedBox(width: 8),
                  const Text(
                    'LỘ TRÌNH VĂN HÓA AI GỢI Ý',
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
                  color: AppCultureColors.oceanLight,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppCultureColors.oceanBlue.withOpacity(0.2)),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.auto_awesome_rounded, size: 12, color: AppCultureColors.oceanBlue),
                    SizedBox(width: 4),
                    Text(
                      'Dành riêng cho bạn',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: AppCultureColors.oceanBlue,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 14),

        SizedBox(
          height: 250,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: _destinations.length,
            itemBuilder: (context, idx) {
              final route = _destinations[idx];
              return _buildRouteHorizontalCard(route);
            },
          ),
        ),
      ],
    );
  }

  Widget _buildRouteHorizontalCard(DestinationModel route) {
    return GestureDetector(
      onTap: () => _openPaymentModal(route),
      child: Container(
        width: 220,
        margin: const EdgeInsets.only(right: 14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppCultureColors.border),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.04),
              blurRadius: 8,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Cover image with rating and duration
            SizedBox(
              height: 130,
              width: double.infinity,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  ClipRRect(
                    borderRadius: const BorderRadius.vertical(top: Radius.circular(19)),
                    child: Image.asset(route.coverImage, fit: BoxFit.cover),
                  ),
                  Positioned(
                    top: 8,
                    right: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.92),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.star_rounded, color: AppCultureColors.gold, size: 14),
                          const SizedBox(width: 2),
                          Text(
                            '${route.rating}',
                            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 11),
                          ),
                        ],
                      ),
                    ),
                  ),
                  Positioned(
                    bottom: 8,
                    left: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.black.withOpacity(0.65),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.schedule_rounded, color: Colors.white70, size: 12),
                          const SizedBox(width: 4),
                          Text(
                            route.duration,
                            style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),

            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.location_on_outlined, size: 13, color: AppCultureColors.textMuted),
                      const SizedBox(width: 2),
                      Text(
                        route.address.split(',').last.trim(),
                        style: const TextStyle(fontSize: 11, color: AppCultureColors.textMuted),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    route.name,
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w800,
                      color: AppCultureColors.textDark,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 10),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        route.ticketPrice,
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w800,
                          color: AppCultureColors.heritageJade,
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppCultureColors.rewardBg,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          route.rewardPoints,
                          style: const TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w800,
                            color: AppCultureColors.rewardText,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActiveMissionsSection() {
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
                  'NHIỆM VỤ ĐANG HOẠT ĐỘNG',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.8,
                    color: AppCultureColors.textDark,
                  ),
                ),
              ],
            ),
            GestureDetector(
              onTap: () {
                if (_missions.isNotEmpty) _openMissionModal(_missions.first);
              },
              child: const Row(
                children: [
                  Text(
                    'Xem tất cả',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: AppCultureColors.oceanBlue,
                    ),
                  ),
                  Icon(Icons.chevron_right_rounded, size: 16, color: AppCultureColors.oceanBlue),
                ],
              ),
            ),
          ],
        ),

        const SizedBox(height: 12),

        ..._missions.map((m) {
          return GestureDetector(
            onTap: () => _openMissionModal(m),
            child: Container(
              margin: const EdgeInsets.only(bottom: 10),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppCultureColors.border),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.02),
                    blurRadius: 6,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Row(
                children: [
                  Container(
                    width: 42,
                    height: 42,
                    decoration: BoxDecoration(
                      color: m.isCompleted ? AppCultureColors.jadeLight : AppCultureColors.rewardBg,
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      m.isCompleted ? Icons.check_circle_rounded : Icons.quiz_rounded,
                      color: m.isCompleted ? AppCultureColors.heritageJade : AppCultureColors.amberDark,
                      size: 22,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          m.title,
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w800,
                            color: AppCultureColors.textDark,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          m.siteName,
                          style: const TextStyle(fontSize: 12, color: AppCultureColors.textMuted),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: m.isCompleted ? AppCultureColors.jadeLight : AppCultureColors.rewardBg,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: m.isCompleted ? AppCultureColors.heritageJade.withOpacity(0.3) : AppCultureColors.rewardBorder,
                      ),
                    ),
                    child: Text(
                      m.isCompleted ? 'Đã xong' : '+${m.rewardPoints} pts',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                        color: m.isCompleted ? AppCultureColors.jadeDark : AppCultureColors.rewardText,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          );
        }),
      ],
    );
  }
}
