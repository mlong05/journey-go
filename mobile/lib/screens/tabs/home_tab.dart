import 'package:flutter/foundation.dart' show ValueListenable;
import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/models/auth_models.dart';
import '../../core/models/destination_model.dart';
import '../../core/models/gamification_model.dart' show formatThousands;
import '../../core/models/tour_journey_model.dart';
import '../../core/models/tour_model.dart';
import '../../core/services/api_client.dart';
import '../../core/services/area_service.dart';
import '../../core/services/catalog_service.dart';
import '../../core/services/destination_service.dart';
import '../../core/services/location_service.dart';
import '../../core/services/progress_service.dart';
import '../../core/services/tour_service.dart';
import '../journey/journey_launcher.dart';
import '../journey/task_screen.dart';
import '../modals/notification_dialog.dart';
import '../common/heritage_motion.dart';
import '../common/tab_refresh.dart';
import '../tours/tour_list_screen.dart';
import 'home/home_sections.dart';
import 'home/journey_card.dart';

/// Trang chủ du khách: tìm kiếm, tour nổi bật, chủ đề, vùng miền và các dải tour.
/// Hành trình đang đi (nếu có) hiện ở đầu trang để quay lại nhanh.
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

class _HomeTabState extends State<HomeTab> with RefreshOnTabReturn {
  @override
  ValueListenable<int>? get selectedTab => widget.selectedTab;

  @override
  int get tabIndex => 0;

  @override
  void onTabReturn() => _loadAllData();

  /// Danh mục tour còn nhỏ: tải một lần rồi chia thành các dải ngay trên máy.
  static const int _catalogSize = 100;

  final TourService _tourService = TourService();
  final CatalogService _catalog = CatalogService();
  final DestinationService _destinationService = DestinationService();
  final ProgressService _progress = ProgressService();

  List<TourModel> _tours = [];

  /// true khi đã tải hết tour (số tour theo vùng miền là chính xác).
  bool _allLoaded = false;
  List<CatalogItem> _themes = [];
  List<CatalogItem> _regions = [];
  String? _toursError;

  List<JourneyMission> _missions = [];
  TourJourney? _journey;
  double? _nextDistance;

  /// Tỉnh/thành du khách đang đứng (GPS + Goong); null thì ẩn nhãn vị trí.
  String? _area;
  int _userPoints = 0;

  /// Chỉ lần tải đầu hiện khung chờ; kéo làm mới thì giữ nội dung cũ.
  bool _firstLoad = true;

  @override
  void initState() {
    super.initState();
    _loadAllData();
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

    String? toursError;
    Future<TourPage?> loadTours() async {
      try {
        return await _tourService.searchTours(size: _catalogSize);
      } on ApiException catch (e) {
        toursError = e.message;
        return null;
      }
    }

    final results = await Future.wait<Object?>([
      loadTours(),
      safe<List<CatalogItem>>(_catalog.getThemes, const []),
      safe<List<CatalogItem>>(_catalog.getRegions, const []),
      safe<int>(_progress.getPoints, 0),
      safe<TourJourney?>(_progress.getActiveJourney, null),
    ]);

    if (!mounted) return;
    final page = results[0] as TourPage?;
    final journey = results[4] as TourJourney?;
    setState(() {
      if (page != null) {
        _tours = page.tours;
        _allLoaded = page.last;
      }
      _toursError = page == null ? toursError : null;
      _themes = results[1] as List<CatalogItem>;
      _regions = results[2] as List<CatalogItem>;
      _userPoints = results[3] as int;
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

  // ── Các dải tour, chia từ danh sách đã tải (mới nhất trước) ────────────────

  /// Tour nổi bật: 5 tour mới nhất, ưu tiên tour có ảnh bìa.
  List<TourModel> get _featured {
    final withCover = _tours.where((t) => t.coverImageUrl != null).toList();
    return (withCover.isNotEmpty ? withCover : _tours).take(5).toList();
  }

  List<TourModel> _byFormat(String format) => _tours.where((t) => t.tourFormat == format).take(10).toList();

  List<TourModel> get _upcoming {
    final list = _tours.where((t) => t.nextDepartureDate != null).toList()
      ..sort((a, b) => a.nextDepartureDate!.compareTo(b.nextDepartureDate!));
    return list.take(10).toList();
  }

  /// Vùng miền có tour (đếm chính xác khi đã tải hết); chưa tải hết thì hiện mọi vùng.
  Map<int, int> get _regionCounts {
    if (!_allLoaded) return const {};
    final counts = <int, int>{};
    for (final t in _tours) {
      final id = t.regionId;
      if (id != null) counts[id] = (counts[id] ?? 0) + 1;
    }
    return counts;
  }

  List<CatalogItem> get _visibleRegions {
    final counts = _regionCounts;
    if (counts.isEmpty) return _regions;
    return _regions.where((r) => counts.containsKey(r.id)).toList();
  }

  // ── Hành trình đang đi ──────────────────────────────────────────────────────

  /// Khoảng cách tới trạm tiếp theo. API hành trình không có toạ độ nên lấy từ danh sách điểm đến;
  /// chỉ tính khi máy đã cấp quyền vị trí, trang chủ không tự xin quyền.
  Future<void> _updateNextDistance() async {
    final journey = _journey;
    final next = journey == null ? null : JourneyCard.nextStop(journey);
    if (next == null) {
      if (_nextDistance != null) setState(() => _nextDistance = null);
      return;
    }
    List<DestinationModel> destinations;
    try {
      destinations = await _destinationService.getApprovedDestinations();
    } catch (_) {
      return;
    }
    final site = destinations.where((d) => d.id == next.destinationId).firstOrNull;
    if (site == null || (site.latitude == 0 && site.longitude == 0)) return;
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

  // ── Điều hướng ─────────────────────────────────────────────────────────────

  void _openTour(TourModel tour) => openTourDetail(context, tour);

  void _openList({TourFilter filter = const TourFilter(), String? title, bool focusSearch = false}) =>
      openTourList(context, filter: filter, title: title, focusSearch: focusSearch);

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: _loadAllData,
      color: AppCultureColors.heritageJade,
      edgeOffset: 140 + MediaQuery.paddingOf(context).top,
      child: CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          _buildHeader(),
          if (_firstLoad)
            const SliverToBoxAdapter(child: HomeSkeleton())
          else
            ..._buildSections(),
          // Chừa chỗ cho thanh điều hướng và nút CHECK-IN nổi
          const SliverToBoxAdapter(child: SizedBox(height: 110)),
        ],
      ),
    );
  }

  List<Widget> _buildSections() {
    var order = 0;
    Widget block(Widget child) => SliverToBoxAdapter(child: Reveal(order: order++, child: child));

    final dayTrips = _byFormat('DAY_TRIP');
    final multiDays = _byFormat('MULTI_DAY');
    final upcoming = _upcoming;
    final regions = _visibleRegions;

    return [
      if (_journey != null)
        block(Padding(
          padding: const EdgeInsets.fromLTRB(16, 18, 16, 0),
          child: JourneyCard(
            journey: _journey,
            nextDistance: _nextDistance,
            onContinue: _continueJourney,
            onExplore: _openList,
          ),
        )),
      if (_missions.isNotEmpty)
        block(_section(
          header: SectionHeader(
            title: 'Nhiệm vụ đang chờ',
            subtitle: '${_missions.length} thử thách tại các trạm đã check-in',
          ),
          child: MissionStrip(missions: _missions, onOpen: _openMission),
        )),
      if (_toursError != null && _tours.isEmpty)
        block(_buildToursError())
      else if (_tours.isEmpty)
        block(_buildNoTours())
      else ...[
        block(Padding(
          padding: const EdgeInsets.only(top: 18),
          child: FeaturedTourBanner(tours: _featured, onOpen: _openTour),
        )),
        if (_themes.isNotEmpty)
          block(_section(
            header: const SectionHeader(title: 'Khám phá theo chủ đề'),
            child: ThemeRow(
              themes: _themes,
              onOpen: (t) => _openList(filter: TourFilter(themeId: t.id), title: t.name),
            ),
          )),
        if (regions.isNotEmpty)
          block(_section(
            header: const SectionHeader(title: 'Điểm đến theo vùng miền'),
            child: RegionCards(
              regions: regions,
              tourCounts: _regionCounts,
              onOpen: (r) => _openList(filter: TourFilter(regionId: r.id), title: r.name),
            ),
          )),
        if (upcoming.isNotEmpty)
          block(_section(
            header: SectionHeader(
              title: 'Khởi hành sắp tới',
              subtitle: 'Còn ngày khởi hành gần nhất',
              actionLabel: 'Xem tất cả',
              onAction: () => _openList(
                filter: const TourFilter(order: TourOrder.departure),
                title: 'Khởi hành sắp tới',
              ),
            ),
            child: TourStrip(tours: upcoming, onOpen: _openTour, showDeparture: true),
          )),
        if (dayTrips.isNotEmpty)
          block(_section(
            header: SectionHeader(
              title: 'Tour trong ngày',
              subtitle: 'Đi và về trong một ngày',
              actionLabel: 'Xem tất cả',
              onAction: () => _openList(filter: const TourFilter(format: 'DAY_TRIP'), title: 'Tour trong ngày'),
            ),
            child: TourStrip(tours: dayTrips, onOpen: _openTour),
          )),
        if (multiDays.isNotEmpty)
          block(_section(
            header: SectionHeader(
              title: 'Tour nhiều ngày',
              subtitle: 'Hành trình dài ngày khám phá sâu',
              actionLabel: 'Xem tất cả',
              onAction: () => _openList(filter: const TourFilter(format: 'MULTI_DAY'), title: 'Tour nhiều ngày'),
            ),
            child: TourStrip(tours: multiDays, onOpen: _openTour),
          )),
        block(Padding(
          padding: const EdgeInsets.fromLTRB(16, 28, 16, 0),
          child: OutlinedButton.icon(
            onPressed: _openList,
            icon: const Icon(Icons.travel_explore_rounded, size: 19),
            label: Text(
              _allLoaded ? 'Xem tất cả ${_tours.length} tour' : 'Xem tất cả tour',
              style: const TextStyle(fontWeight: FontWeight.w700),
            ),
            style: OutlinedButton.styleFrom(
              foregroundColor: AppCultureColors.jadeDark,
              side: const BorderSide(color: AppCultureColors.heritageJade),
              minimumSize: const Size.fromHeight(48),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            ),
          ),
        )),
      ],
    ];
  }

  Widget _section({required Widget header, required Widget child}) {
    return Padding(
      padding: const EdgeInsets.only(top: 26),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [header, const SizedBox(height: 12), child],
      ),
    );
  }

  Widget _buildNoTours() {
    return _messageCard(
      icon: Icons.luggage_rounded,
      title: 'Chưa có tour nào được mở bán',
      message: 'Các tour mới sẽ xuất hiện ở đây ngay khi được duyệt.',
    );
  }

  Widget _buildToursError() {
    return _messageCard(
      icon: Icons.cloud_off_rounded,
      title: 'Không tải được danh sách tour',
      message: _toursError,
      action: TextButton(onPressed: _loadAllData, child: const Text('Thử lại')),
    );
  }

  Widget _messageCard({required IconData icon, required String title, String? message, Widget? action}) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 24, 16, 0),
      child: Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppCultureColors.border),
        ),
        child: Column(
          children: [
            Icon(icon, size: 40, color: AppCultureColors.textLight),
            const SizedBox(height: 10),
            Text(
              title,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppCultureColors.textDark),
            ),
            if (message != null) ...[
              const SizedBox(height: 4),
              Text(
                message,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 13, color: AppCultureColors.textMuted),
              ),
            ],
            ?action,
          ],
        ),
      ),
    );
  }

  /// Đầu trang gọn: lời chào, vị trí, điểm thưởng, chuông; ô tìm kiếm luôn ghim khi cuộn.
  Widget _buildHeader() {
    return SliverAppBar(
      pinned: true,
      automaticallyImplyLeading: false,
      backgroundColor: AppCultureColors.jadeDark,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      toolbarHeight: 64,
      titleSpacing: 16,
      flexibleSpace: ClipRect(
        child: Stack(
          fit: StackFit.expand,
          children: [
            const DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [AppCultureColors.jadeDark, AppCultureColors.oceanBlue],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
            ),
            Positioned(
              right: -50,
              top: -40,
              child: DrumMotif(size: 170, color: Colors.white.withValues(alpha: 0.12)),
            ),
          ],
        ),
      ),
      title: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Xin chào, ${widget.currentUser.fullName}',
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 2),
          Row(
            children: [
              Icon(
                _area == null ? Icons.travel_explore_rounded : Icons.location_on_rounded,
                size: 13,
                color: Colors.white70,
              ),
              const SizedBox(width: 3),
              Flexible(
                child: Text(
                  _area ?? 'Hôm nay bạn muốn đi đâu?',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: Colors.white70, fontSize: 12.5, fontWeight: FontWeight.w500),
                ),
              ),
            ],
          ),
        ],
      ),
      actions: [
        _buildPointsPill(),
        const SizedBox(width: 8),
        Padding(padding: const EdgeInsets.only(right: 12), child: _buildBell()),
      ],
      bottom: PreferredSize(
        preferredSize: const Size.fromHeight(64),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 14),
          child: Pressable(
            onTap: () => _openList(focusSearch: true),
            child: Container(
              height: 48,
              padding: const EdgeInsets.symmetric(horizontal: 14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                boxShadow: [
                  BoxShadow(color: Colors.black.withValues(alpha: 0.08), blurRadius: 12, offset: const Offset(0, 4)),
                ],
              ),
              child: const Row(
                children: [
                  Icon(Icons.search_rounded, color: AppCultureColors.textMuted),
                  SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'Tìm tour, vùng miền, chủ đề...',
                      style: TextStyle(fontSize: 14, color: AppCultureColors.textLight),
                    ),
                  ),
                  Icon(Icons.tune_rounded, color: AppCultureColors.heritageJade, size: 20),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildPointsPill() {
    return Center(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.16),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.white.withValues(alpha: 0.22)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.star_rounded, size: 15, color: AppCultureColors.gold),
            const SizedBox(width: 4),
            Text(
              formatThousands(_userPoints),
              style: const TextStyle(color: Colors.white, fontSize: 12.5, fontWeight: FontWeight.w700),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBell() {
    return GestureDetector(
      onTap: () => showNotificationSheet(context),
      child: Container(
        padding: const EdgeInsets.all(9),
        decoration: BoxDecoration(
          color: Colors.black.withValues(alpha: 0.18),
          shape: BoxShape.circle,
          border: Border.all(color: Colors.white24),
        ),
        child: const NotificationBellIcon(size: 20),
      ),
    );
  }
}
