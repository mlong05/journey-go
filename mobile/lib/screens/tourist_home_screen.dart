import 'dart:async';
import 'package:flutter/material.dart';
import '../core/constants/app_colors.dart';
import '../core/models/auth_models.dart';
import '../core/models/notification_model.dart';
import '../core/services/notification_service.dart';
import '../core/services/realtime_service.dart';
import 'booking/invitation_deep_link_host.dart';
import 'journey/journey_launcher.dart';
import 'modals/notification_dialog.dart';
import 'tabs/community_tab.dart';
import 'tabs/home_tab.dart';
import 'tabs/profile_tab.dart';
import 'tabs/trips_tab.dart';

class TouristHomeScreen extends StatefulWidget {
  final UserModel initialUser;

  const TouristHomeScreen({
    super.key,
    required this.initialUser,
  });

  /// Kênh yêu cầu chuyển tab từ MÀN KHÁC (VD: sau khi thanh toán xong, bấm nút
  /// "quay lại" ở chi tiết đơn ⇒ quay về [TouristHomeScreen] và chọn tab Trang chủ).
  ///
  /// ⚠️ Vì `TouristHomeScreen` nằm ở gốc Navigator nên không thể `push` được;
  /// dùng notifier để màn khác ra hiệu lệnh chuyển tab.
  static final HomeTabRequest tabRequest = HomeTabRequest();

  @override
  State<TouristHomeScreen> createState() => _TouristHomeScreenState();
}

/// Yêu cầu chuyển sang một tab cụ thể của màn gốc [TouristHomeScreen].
class HomeTabRequest extends ChangeNotifier {
  /// Tab được yêu cầu; -1 nghĩa là chưa có yêu cầu nào đang chờ.
  int _target = -1;

  int get target => _target;

  /// Màn khác yêu cầu chuyển tới [index] (0 = Trang chủ).
  void request(int index) {
    _target = index;
    notifyListeners();
  }

  /// Đọc rồi xoá yêu cầu (tránh xử lý lặp lại khi rebuild).
  int take() {
    final value = _target;
    _target = -1;
    return value;
  }
}

class _TouristHomeScreenState extends State<TouristHomeScreen> with WidgetsBindingObserver {
  late UserModel _currentUser;
  StreamSubscription<AppNotification>? _incomingSub;
  int _currentIndex = 0; // 0: Trang chủ, 1: Chuyến đi, 2: Diễn đàn, 3: Tài khoản

  /// Báo cho các tab biết tab nào đang mở để tự làm mới khi du khách quay lại.
  final ValueNotifier<int> _selectedTab = ValueNotifier(0);

  void _selectTab(int index) {
    setState(() => _currentIndex = index);
    _selectedTab.value = index;
  }

  /// Nghe yêu cầu chuyển tab từ màn khác (VD: quay lại sau khi thanh toán).
  void _onTabRequested() {
    if (!mounted) return;
    final target = TouristHomeScreen.tabRequest.take();
    if (target < 0) return;
    _selectTab(target);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _incomingSub?.cancel();
    NotificationCenter.instance.stop();
    _selectedTab.dispose();
    TouristHomeScreen.tabRequest.removeListener(_onTabRequested);
    super.dispose();
  }


  @override
  void initState() {
    super.initState();
    _currentUser = widget.initialUser;
    // Nghe yêu cầu chuyển tab từ màn khác (VD: nút "quay lại" sau khi thanh toán
    // ⇒ quay về Trang chủ).
    TouristHomeScreen.tabRequest.addListener(_onTabRequested);
    // Thông báo thời gian thực: chạy khi app đang mở, hiện banner khi có tin mới
    WidgetsBinding.instance.addObserver(this);
    NotificationCenter.instance.start();
    // Chat tức thời (WebSocket): nhận tin nhắn mới từ nhà tour ngay khi đang mở app.
    RealtimeService.instance.connect();
    _incomingSub = NotificationCenter.instance.incoming.listen((n) {
      // ⚠️ Thông báo CHAT (tin nhắn từ đối tác / khách) chỉ nằm trong trung tâm
      // "Thông báo" + tăng số chưa đọc trên chuông — KHÔNG hiện banner hình chữ
      // nhật giữa màn hình (gây gián đoạn trải nghiệm người dùng).
      if (!mounted) return;
      if (isChatNotification(n)) return;
      showIncomingNotification(context, n);
    });

    // Lời mời tham gia tour đang chờ (mở app từ deep link khi CHƯA đăng nhập)
    // → sau khi đăng nhập xong thì mở màn xác nhận lời mời.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      openPendingInvitationIfAny(context);
    });
  }

  /// Ra nền thì đóng luồng (tiết kiệm pin, hệ điều hành cũng sẽ cắt); quay lại thì kết nối và tải lại.
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      NotificationCenter.instance.start();
      RealtimeService.instance.connect();
    } else if (state == AppLifecycleState.paused) {
      NotificationCenter.instance.stop();
      RealtimeService.instance.disconnect();
    }
  }

  /// Check-in thật: mở hành trình đang đi và quét QR tại điểm đến hiện tại.
  void _openCheckIn() => openActiveJourney(context, qr: true);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppCultureColors.background,
      body: IndexedStack(
        index: _currentIndex,
        children: [
          HomeTab(
            currentUser: _currentUser,
            onNavigateToTab: _selectTab,
            selectedTab: _selectedTab,
          ),
          TripsTab(selectedTab: _selectedTab),
          CommunityTab(currentUser: _currentUser, selectedTab: _selectedTab),
          ProfileTab(
            currentUser: _currentUser,
            selectedTab: _selectedTab,
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
          onTap: _openCheckIn,
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
                  fontWeight: FontWeight.w700,
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
                icon: Icons.confirmation_number_rounded,
                unselectedIcon: Icons.confirmation_number_outlined,
                label: 'Chuyến đi',
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
        onTap: () => _selectTab(index),
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
                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w600,
                color: color,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
