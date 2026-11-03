import 'package:flutter/material.dart';
import '../core/constants/app_colors.dart';
import '../core/models/auth_models.dart';
import '../core/models/destination_model.dart';
import '../core/services/destination_service.dart';
import 'modals/checkin_modal.dart';
import 'tabs/community_tab.dart';
import 'tabs/explore_tab.dart';
import 'tabs/home_tab.dart';
import 'tabs/profile_tab.dart';

class TouristHomeScreen extends StatefulWidget {
  final UserModel initialUser;

  const TouristHomeScreen({
    super.key,
    required this.initialUser,
  });

  @override
  State<TouristHomeScreen> createState() => _TouristHomeScreenState();
}

class _TouristHomeScreenState extends State<TouristHomeScreen> {
  late UserModel _currentUser;
  int _currentIndex = 0; // 0: Home, 1: Explore, 2: Community, 3: Profile

  final DestinationService _destinationService = DestinationService();
  List<DestinationModel> _destinations = [];

  @override
  void initState() {
    super.initState();
    _currentUser = widget.initialUser;
    _loadDestinations();
  }

  Future<void> _loadDestinations() async {
    final list = await _destinationService.getApprovedDestinations();
    if (mounted) {
      setState(() => _destinations = list);
    }
  }

  void _openCheckInModal() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => CheckInModal(
        initialTab: 'qr',
        destinations: _destinations,
        onCheckInSuccess: () {
          setState(() {});
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppCultureColors.background,
      body: IndexedStack(
        index: _currentIndex,
        children: [
          HomeTab(
            currentUser: _currentUser,
            onNavigateToTab: (idx) => setState(() => _currentIndex = idx),
          ),
          const ExploreTab(),
          CommunityTab(currentUser: _currentUser),
          ProfileTab(
            currentUser: _currentUser,
            onUserUpdated: (updated) => setState(() => _currentUser = updated),
          ),
        ],
      ),
      bottomNavigationBar: _buildBottomNav(),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
      floatingActionButton: _buildCheckInFab(),
    );
  }

  Widget _buildCheckInFab() {
    return Container(
      margin: const EdgeInsets.only(top: 14),
      width: 64,
      height: 64,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: const LinearGradient(
          colors: [Color(0xFF00A86B), Color(0xFF00C853)],
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
        ),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF00A86B).withValues(alpha: 0.35),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: _openCheckInModal,
          customBorder: const CircleBorder(),
          child: const Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.qr_code_2_rounded, color: Colors.white, size: 26),
              Text(
                'CHECK-IN',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 8.5,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 0.5,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBottomNav() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        border: const Border(top: BorderSide(color: AppCultureColors.border, width: 0.8)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 10,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: SafeArea(
        child: SizedBox(
          height: 62,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildNavItem(
                index: 0,
                icon: Icons.home_rounded,
                unselectedIcon: Icons.home_outlined,
                label: 'Trang chủ',
              ),
              _buildNavItem(
                index: 1,
                icon: Icons.explore_rounded,
                unselectedIcon: Icons.explore_outlined,
                label: 'Lộ trình',
              ),
              // Empty space for the center floating Check-In button
              const SizedBox(width: 56),
              _buildNavItem(
                index: 2,
                icon: Icons.forum_rounded,
                unselectedIcon: Icons.forum_outlined,
                label: 'Diễn đàn',
              ),
              _buildNavItem(
                index: 3,
                icon: Icons.person_rounded,
                unselectedIcon: Icons.person_outline_rounded,
                label: 'Tài khoản',
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildNavItem({
    required int index,
    required IconData icon,
    required IconData unselectedIcon,
    required String label,
  }) {
    final isSelected = _currentIndex == index;
    final color = isSelected ? AppCultureColors.oceanBlue : AppCultureColors.textMuted;

    return Expanded(
      child: InkWell(
        onTap: () => setState(() => _currentIndex = index),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              isSelected ? icon : unselectedIcon,
              color: color,
              size: 22,
            ),
            const SizedBox(height: 3),
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                color: color,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
