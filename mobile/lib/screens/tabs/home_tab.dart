import 'package:flutter/foundation.dart' show ValueListenable;
import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/models/auth_models.dart';
import '../../core/models/destination_model.dart';
import '../../core/models/experience_model.dart';
import '../../core/models/tour_journey_model.dart';
import '../../core/services/area_service.dart';
import '../../core/services/destination_service.dart';
import '../../core/services/experience_service.dart';
import '../../core/services/location_service.dart';
import '../../core/services/progress_service.dart';
import '../journey/journey_launcher.dart';
import '../journey/task_screen.dart';
import '../modals/notification_dialog.dart';
import '../common/heritage_motion.dart';
import '../common/tab_refresh.dart';
import 'home/home_sections.dart';
import 'home/journey_card.dart';

class HomeTab extends StatefulWidget {
  final UserModel currentUser;
  final Function(int) onNavigateToTab;
  final ValueListenable<int>? selectedTab;

  const HomeTab({
    super.key,
    required this.currentUser,
    required this.onNavigateToTab,
    this.selectedTab,
  });

  @override
  State<HomeTab> createState() => _HomeTabState();
}

class _HomeTabState extends State<HomeTab> with SingleTickerProviderStateMixin, RefreshOnTabReturn {

  @override
  ValueListenable<int>? get selectedTab => widget.selectedTab;

  @override
  int get tabIndex => 0;

  @override
  void onTabReturn() => _loadAllData();
  static const double _heroHeight = 260;

  final DestinationService _destinationService = DestinationService();
  final ExperienceService _experienceService = ExperienceService();
  final ProgressService _progress = ProgressService();

  /// Chuyển động nền ảnh đầu trang: phóng to rất chậm và xoay nhẹ hoa văn trống đồng.
  late final AnimationController _ambient = AnimationController(
    vsync: this,
    duration: const Duration(seconds: 18),
  );

  List<DestinationModel> _destinations = [];
  List<ExperienceModel> _experiences = [];
  List<JourneyMission> _missions = [];
  TourJourney? _journey;
  double? _nextDistance;

  /// Tỉnh/thành du khách đang đứng (GPS + Goong); null thì ẩn nhãn vị trí.
  String? _area;
  int _userPoints = 0;
  int _badgeCount = 0;

  /// Chỉ lần tải đầu hiện khung chờ; kéo làm mới thì giữ nội dung cũ.
  bool _firstLoad = true;

  @override
  void initState() {
    super.initState();
    _loadAllData();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (reduceMotion(context)) {
      _ambient.stop();
    } else if (!_ambient.isAnimating) {
      _ambient.repeat(reverse: true);
    }
  }

  @override
  void dispose() {
    _ambient.dispose();
    super.dispose();
  }

  Future<void> _loadAllData() async {
    // Lỗi một mục không làm hỏng cả trang.
    Future<T> safe<T>(Future<T> Function() load, T fallback) async {
      try {
        return await load();
      } catch (_) {
        return fallback;
      }
    }

    final results = await Future.wait<Object?>([
      safe<List<DestinationModel>>(_destinationService.getApprovedDestinations, const []),
      safe<List<ExperienceModel>>(_experienceService.getPublishedExperiences, const []),
      safe<int>(_progress.getPoints, 0),
      safe(() async => (await _progress.getBadges()).length, 0),
      safe<TourJourney?>(_progress.getActiveJourney, null),
    ]);

    if (!mounted) return;
    final journey = results[4] as TourJourney?;
    setState(() {
      _destinations = results[0] as List<DestinationModel>;
      _experiences = (results[1] as List<ExperienceModel>).where((e) => e.isPublished).toList();
      _userPoints = results[2] as int;
      _badgeCount = results[3] as int;
      _journey = journey;
      _missions = journey == null ? const [] : ProgressService.missionsOf(journey);
      _firstLoad = false;
    });
    _updateNextDistance();
    _loadArea();
  }

  Future<void> _loadArea() async {
    final area = await AreaService.currentProvince();
    if (mounted && area != _area) setState(() => _area = area);
  }

  /// Số trải nghiệm và thử thách thật của từng điểm đến, tính từ trải nghiệm đã xuất bản.
  Map<int, DestinationStats> get _destinationStats {
    final stats = <int, DestinationStats>{};
    for (final e in _experiences) {
      final id = e.destinationId;
      if (id == null) continue;
      final s = stats[id] ?? (experiences: 0, tasks: 0);
      stats[id] = (experiences: s.experiences + 1, tasks: s.tasks + e.taskCount);
    }
    return stats;
  }

  /// Điểm đến đã có trải nghiệm lên trước, nhiều thử thách hơn lên trước.
  List<DestinationModel> get _suggestedDestinations {
    final stats = _destinationStats;
    int score(DestinationModel d) => (stats[d.id]?.experiences ?? 0) * 1000 + (stats[d.id]?.tasks ?? 0);
    return [..._destinations]..sort((a, b) => score(b).compareTo(score(a)));
  }

  /// Khoảng cách tới trạm tiếp theo. API hành trình không có toạ độ nên lấy từ danh sách điểm đến;
  /// chỉ tính khi máy đã cấp quyền vị trí, trang chủ không tự xin quyền.
  Future<void> _updateNextDistance() async {
    final journey = _journey;
    final next = journey == null ? null : JourneyCard.nextStop(journey);
    final site = next == null ? null : _destinations.where((d) => d.id == next.destinationId).firstOrNull;
    if (site == null || (site.latitude == 0 && site.longitude == 0)) {
      if (_nextDistance != null) setState(() => _nextDistance = null);
      return;
    }
    final pos = await LocationService.positionIfPermitted();
    if (!mounted) return;
    setState(() {
      _nextDistance = pos == null
          ? null
          : LocationService.distanceMeters(pos.latitude, pos.longitude, site.latitude, site.longitude);
    });
  }

  Future<void> _continueJourney() async {
    await openActiveJourney(context);
    if (mounted) _loadAllData();
  }

  Future<void> _openMission(JourneyMission mission) async {
    await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => TaskScreen(
          journeyId: mission.journeyId,
          taskId: mission.taskId,
          fallbackName: mission.title,
          destinationName: mission.siteName,
        ),
      ),
    );
    if (mounted) _loadAllData();
  }

  /// Đặt tour diễn ra ở tab Khám phá (danh sách tour và đặt chỗ thật).
  void _goToTours() => widget.onNavigateToTab(1);

  void _openNotificationDialog() => showNotificationSheet(context);

  @override
  Widget build(BuildContext context) {
    final topInset = MediaQuery.paddingOf(context).top;
    return RefreshIndicator(
      onRefresh: _loadAllData,
      color: AppCultureColors.heritageJade,
      edgeOffset: kToolbarHeight + topInset,
      child: CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          _buildHero(),
          if (_firstLoad)
            const SliverToBoxAdapter(child: HomeSkeleton())
          else ...[
            SliverToBoxAdapter(
              child: Reveal(
                order: 0,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 20, 16, 0),
                  child: JourneyCard(
                    journey: _journey,
                    nextDistance: _nextDistance,
                    onContinue: _continueJourney,
                    onExplore: _goToTours,
                  ),
                ),
              ),
            ),
            if (_missions.isNotEmpty)
              SliverToBoxAdapter(
                child: Reveal(
                  order: 1,
                  child: _section(
                    header: SectionHeader(
                      title: 'Nhiệm vụ đang chờ',
                      subtitle: '${_missions.length} thử thách tại các trạm đã check-in',
                    ),
                    child: MissionStrip(missions: _missions, onOpen: _openMission),
                  ),
                ),
              ),
            SliverToBoxAdapter(
              child: Reveal(
                order: 2,
                child: _section(
                  header: SectionHeader(
                    title: 'Tour trải nghiệm',
                    subtitle: 'Gói tour thực địa đã được duyệt',
                    actionLabel: 'Xem tất cả',
                    onAction: _goToTours,
                  ),
                  child: ExperienceCarousel(experiences: _experiences, onOpen: _goToTours),
                ),
              ),
            ),
            if (_destinations.isNotEmpty)
              SliverToBoxAdapter(
                child: Reveal(
                  order: 3,
                  child: _section(
                    header: const SectionHeader(
                      title: 'Gợi ý cho bạn',
                      subtitle: 'Lộ trình di sản nên thử',
                      icon: Icons.auto_awesome_rounded,
                    ),
                    child: RouteCardList(routes: _suggestedDestinations, stats: _destinationStats, onOpen: _goToTours),
                  ),
                ),
              ),
          ],
          // Chừa chỗ cho thanh điều hướng và nút CHECK-IN nổi
          const SliverToBoxAdapter(child: SizedBox(height: 110)),
        ],
      ),
    );
  }

  Widget _section({required Widget header, required Widget child}) {
    return Padding(
      padding: const EdgeInsets.only(top: 28),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [header, const SizedBox(height: 12), child],
      ),
    );
  }

  /// Ảnh đầu trang co lại khi cuộn: ảnh trôi chậm hơn nội dung, lời chào mờ dần
  /// và thanh trên cùng hiện tên gọn khi đã thu nhỏ.
  Widget _buildHero() {
    return SliverAppBar(
      pinned: true,
      expandedHeight: _heroHeight,
      automaticallyImplyLeading: false,
      backgroundColor: AppCultureColors.jadeDark,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      actions: [
        Padding(
          padding: const EdgeInsets.only(right: 12),
          child: _buildBell(),
        ),
      ],
      flexibleSpace: LayoutBuilder(
        builder: (context, box) {
          final topInset = MediaQuery.paddingOf(context).top;
          final minHeight = kToolbarHeight + topInset;
          final t = ((box.maxHeight - minHeight) / (_heroHeight - minHeight)).clamp(0.0, 1.0);

          return ClipRRect(
            borderRadius: BorderRadius.vertical(bottom: Radius.circular(28 * t)),
            child: Stack(
              fit: StackFit.expand,
              children: [
                Positioned(
                  top: -(1 - t) * 70,
                  left: 0,
                  right: 0,
                  height: _heroHeight,
                  child: AnimatedBuilder(
                    animation: _ambient,
                    builder: (_, child) => Transform.scale(
                      scale: 1 + 0.08 * Curves.easeInOut.transform(_ambient.value),
                      child: child,
                    ),
                    child: Image.asset('assets/images/vanmieu.png', fit: BoxFit.cover),
                  ),
                ),
                DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [
                        Colors.black.withValues(alpha: 0.45),
                        Colors.black.withValues(alpha: 0.05),
                        AppCultureColors.jadeDark.withValues(alpha: 0.85),
                      ],
                      stops: const [0, 0.4, 1],
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                    ),
                  ),
                ),
                // Lớp phủ màu khi thu nhỏ để chữ trên thanh luôn đọc được
                Opacity(
                  opacity: 1 - t,
                  child: const ColoredBox(color: AppCultureColors.jadeDark),
                ),
                Positioned(
                  right: -70,
                  bottom: -70,
                  child: Opacity(
                    opacity: t,
                    child: AnimatedBuilder(
                      animation: _ambient,
                      builder: (_, child) => Transform.rotate(angle: _ambient.value * 0.6, child: child),
                      child: DrumMotif(size: 230, color: Colors.white.withValues(alpha: 0.16)),
                    ),
                  ),
                ),
                if (_area != null)
                  Positioned(
                    top: topInset + 10,
                    left: 16,
                    child: Opacity(opacity: t, child: _buildLocationPill(_area!)),
                  ),
                Positioned(
                  top: topInset,
                  left: 16,
                  right: 72,
                  height: kToolbarHeight,
                  child: IgnorePointer(
                    child: Opacity(
                      opacity: (1 - t * 2).clamp(0.0, 1.0),
                      child: Align(
                        alignment: Alignment.centerLeft,
                        child: Text(
                          'Xin chào, ${widget.currentUser.fullName}',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w600),
                        ),
                      ),
                    ),
                  ),
                ),
                Positioned(
                  left: 20,
                  right: 20,
                  bottom: 22,
                  child: Opacity(
                    opacity: Curves.easeIn.transform(t),
                    child: Transform.translate(offset: Offset(0, 16 * (1 - t)), child: _buildGreeting()),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildGreeting() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          'Xin chào 👋',
          style: TextStyle(color: Colors.white.withValues(alpha: 0.85), fontSize: 14),
        ),
        const SizedBox(height: 2),
        Text(
          widget.currentUser.fullName,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w700, height: 1.2),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            _glassChip(
              icon: Icons.explore_rounded,
              iconColor: AppCultureColors.jadeLight,
              child: const Text('Nhà Thám Hiểm', style: _chipText),
            ),
            _glassChip(
              icon: Icons.star_rounded,
              iconColor: AppCultureColors.gold,
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  CountUpText(value: _userPoints, style: _chipText),
                  const Text(' điểm', style: _chipText),
                ],
              ),
            ),
            _glassChip(
              icon: Icons.military_tech_rounded,
              iconColor: AppCultureColors.oceanLight,
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  CountUpText(value: _badgeCount, style: _chipText),
                  const Text(' huy hiệu', style: _chipText),
                ],
              ),
            ),
          ],
        ),
      ],
    );
  }

  static const _chipText = TextStyle(color: Colors.white, fontSize: 12.5, fontWeight: FontWeight.w600);

  Widget _glassChip({required IconData icon, required Color iconColor, required Widget child}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.16),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withValues(alpha: 0.22)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 15, color: iconColor),
          const SizedBox(width: 5),
          child,
        ],
      ),
    );
  }

  /// Tỉnh/thành theo GPS; chỉ hiện khi đã biết (không đoán sẵn một nơi).
  Widget _buildLocationPill(String area) {
    return Container(
      constraints: const BoxConstraints(maxWidth: 220),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.35),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white24),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.location_on_rounded, color: AppCultureColors.heritageJade, size: 15),
          const SizedBox(width: 5),
          Flexible(
            child: Text(
              area,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 13),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBell() {
    return GestureDetector(
      onTap: _openNotificationDialog,
      child: Container(
        padding: const EdgeInsets.all(9),
        decoration: BoxDecoration(
          color: Colors.black.withValues(alpha: 0.3),
          shape: BoxShape.circle,
          border: Border.all(color: Colors.white24),
        ),
        child: const NotificationBellIcon(size: 20),
      ),
    );
  }
}
