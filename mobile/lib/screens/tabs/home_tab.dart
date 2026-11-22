import 'package:flutter/foundation.dart' show ValueListenable;
import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_icons.dart';
import '../../core/models/auth_models.dart';
import '../../core/models/booking_model.dart';
import '../../core/models/destination_model.dart';
import '../../core/models/gamification_model.dart' show formatThousands;
import '../../core/models/tour_journey_model.dart';
import '../../core/models/tour_model.dart';
import '../../core/services/api_client.dart';
import '../../core/services/app_route_observer.dart';
import '../../core/services/area_service.dart';
import '../../core/services/booking_service.dart';
import '../../core/services/catalog_service.dart';
import '../../core/services/destination_service.dart';
import '../../core/services/location_service.dart';
import '../../core/services/progress_service.dart';
import '../../core/services/tour_service.dart';
import '../journey/journey_launcher.dart';
import '../journey/task_screen.dart';
import '../modals/notification_dialog.dart';
import '../common/heritage_motion.dart';
import '../common/ink.dart';
import '../common/tab_refresh.dart';
import '../bookings/pending_booking_prompt.dart';
import '../tours/tour_calendar_screen.dart';
import '../tours/tour_list_screen.dart';
import 'home/home_sections.dart';

/// Trang chủ du khách: tìm kiếm, hành trình đang đi, khởi hành sắp tới, chủ đề, vùng miền và các dải tour.
/// Ảnh là ảnh chụp thật (ảnh bìa tour, ảnh Admin gắn cho chủ đề / vùng miền); thiếu ảnh thì nền trung tính.
class HomeTab extends StatefulWidget {
  final UserModel currentUser;
  final Function(int) onNavigateToTab;
  final ValueListenable<int>? selectedTab;

  const HomeTab({super.key, required this.currentUser, required this.onNavigateToTab, this.selectedTab});

  @override
  State<HomeTab> createState() => _HomeTabState();
}

class _HomeTabState extends State<HomeTab> with RefreshOnTabReturn, RouteAware, WidgetsBindingObserver {
  /// Đơn đang giữ chỗ (chờ thanh toán, còn hạn) — hiện thanh nhắc trên cùng để khách quay lại thanh toán.
  BookingModel? _pendingBooking;
  ModalRoute<void>? _route;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final route = ModalRoute.of(context);
    if (route != null && route != _route) {
      if (_route != null) appRouteObserver.unsubscribe(this);
      _route = route;
      appRouteObserver.subscribe(this, route);
    }
  }

  /// Quay về Trang chủ từ màn phía trên (trang tour, màn thanh toán…) ⇒ kiểm tra lại đơn giữ chỗ.
  @override
  void didPopNext() => _loadPending();

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) _loadPending();
  }

  Future<void> _loadPending() async {
    try {
      final list = await _bookingService.getMyPending();
      if (mounted) setState(() => _pendingBooking = list.firstOrNull);
    } catch (_) {
      // Lỗi / chưa đăng nhập ⇒ không hiện thanh nhắc.
    }
  }

  Future<void> _openPending(BookingModel booking) async {
    await openPendingBooking(context, booking);
    _loadPending();
  }

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
  final BookingService _bookingService = BookingService();

  List<TourModel> _tours = [];

  /// Id các tour du khách ĐÃ MUA (đã thanh toán) ⇒ không hiển thị lại trên trang chủ.
  Set<int> _ownedTourIds = const {};

  /// true khi đã tải hết tour (số tour theo vùng miền là chính xác).
  bool _allLoaded = false;
  List<CatalogItem> _themes = [];
  List<CatalogItem> _regions = [];
  String? _toursError;

  List<JourneyMission> _missions = [];
  TourJourney? _journey;
  double? _nextDistance;

  /// Ảnh trạm hiện tại của hành trình đang đi (ảnh điểm dừng, không có thì ảnh bìa tour).
  String? _journeyImage;

  /// Tỉnh/thành du khách đang đứng (GPS + Goong); null thì ẩn nhãn vị trí.
  String? _area;
  int _userPoints = 0;

  /// Chỉ lần tải đầu hiện khung chờ; kéo làm mới thì giữ nội dung cũ.
  bool _firstLoad = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _loadAllData();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    appRouteObserver.unsubscribe(this);
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
      safe<Set<int>>(_loadOwnedTourIds, const <int>{}),
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
      _ownedTourIds = results[5] as Set<int>;
      _firstLoad = false;
    });
    _updateNextDistance();
    _loadJourneyImage();
    _loadArea();
    _loadPending();
  }

  /// Id các tour du khách đã mua (đã thanh toán) ⇒ loại khỏi danh sách hiển thị.
  ///
  /// ⚠️ `size: 200` để không bỏ sót tour đã mua khi du khách có nhiều đơn.
  Future<Set<int>> _loadOwnedTourIds() async {
    final bookings = await _bookingService.getMine(size: 200);
    return {for (final b in bookings) if (b.isPaid) b.tourId};
  }

  /// Ảnh cho thẻ hành trình: ảnh điểm dừng đang mở (tour 5 bước) → ảnh bìa tour.
  Future<void> _loadJourneyImage() async {
    final journey = _journey;
    if (journey == null) {
      if (_journeyImage != null) setState(() => _journeyImage = null);
      return;
    }
    final fromList = _tours.where((t) => t.id == journey.tourId).firstOrNull?.coverImageUrl;
    String? image = fromList;
    try {
      final detail = await _tourService.getPublicDetail(journey.tourId);
      final next = HomeJourneyCard.nextStop(journey);
      final stop = next == null ? null : detail.stops.where((s) => s.id == next.destinationId).firstOrNull;
      image = stop?.imageUrl ?? detail.coverImageUrl ?? fromList;
    } catch (_) {
      // Không tải được chi tiết: giữ ảnh bìa từ danh sách tour.
    }
    if (mounted && image != _journeyImage) setState(() => _journeyImage = image);
  }

  /// Ảnh cho ô chủ đề / vùng miền: ảnh Admin gắn → ảnh bìa một tour cùng danh mục → không có (nền trung tính).
  PhotoRef _catalogPhoto(CatalogItem item, bool Function(TourModel) belongs) {
    if (item.imageUrl != null) return (url: item.imageUrl, credit: item.imageCredit);
    final tour = _tours.where((t) => belongs(t) && t.coverImageUrl != null).firstOrNull;
    return (url: tour?.coverImageUrl, credit: null);
  }

  Future<void> _loadArea() async {
    final area = await AreaService.currentProvince();
    if (mounted && area != _area) setState(() => _area = area);
  }

  // ── Các dải tour, chia từ danh sách đã tải (mới nhất trước) ────────────────

  /// Tour ĐÃ MUA (đã thanh toán) ⇒ không hiển thị lại, không cho đặt tiếp.
  ///
  /// ⚠️ Vẫn giữ `_tours` gốc để dùng cho ảnh đại diện chủ đề / vùng miền.
  List<TourModel> get _availableTours =>
      _tours.where((t) => !_ownedTourIds.contains(t.id)).toList();

  List<TourModel> _byFormat(String format) =>
      _availableTours.where((t) => t.tourFormat == format).take(10).toList();

  List<TourModel> get _upcoming {
    final list =
        _availableTours.where((t) => t.nextDepartureDate != null).toList()
          ..sort((a, b) => a.nextDepartureDate!.compareTo(b.nextDepartureDate!));
    return list.take(10).toList();
  }

  /// Vùng miền có tour (đếm chính xác khi đã tải hết); chưa tải hết thì hiện mọi vùng.
  Map<int, int> get _regionCounts {
    if (!_allLoaded) return const {};
    final counts = <int, int>{};
    for (final t in _availableTours) {
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
    final next = journey == null ? null : HomeJourneyCard.nextStop(journey);
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
    // Cùng màu nền giấy với đầu trang — không còn dải trắng/kem lệch nhau dưới ô tìm kiếm
    return ColoredBox(
      color: AppInk.paper,
      child: RefreshIndicator(
        onRefresh: _loadAllData,
        color: AppInk.accent,
        edgeOffset: 124 + MediaQuery.paddingOf(context).top,
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            _buildHeader(),
            if (_firstLoad) const SliverToBoxAdapter(child: HomeSkeleton()) else ..._buildSections(),
            // Chừa chỗ cho thanh điều hướng và nút CHECK-IN nổi
            const SliverToBoxAdapter(child: SizedBox(height: 40)),
          ],
        ),
      ),
    );
  }

  List<Widget> _buildSections() {
    var order = 0;
    Widget block(Widget child) => SliverToBoxAdapter(
      child: Reveal(order: order++, child: child),
    );

    final dayTrips = _byFormat('DAY_TRIP');
    final multiDays = _byFormat('MULTI_DAY');
    final upcoming = _upcoming;
    final regions = _visibleRegions;

    final journey = _journey;

    final pending = _pendingBooking;
    return [
      // Đơn đang giữ chỗ chưa thanh toán: nhắc trên cùng, bấm để tiếp tục đúng đơn đó.
      if (pending != null)
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 4, 20, 8),
            child: PendingBookingBanner(
              key: ValueKey('home-pending-${pending.id}'),
              booking: pending,
              showTourTitle: true,
              onTap: () => _openPending(pending),
              onExpired: () {
                if (mounted) setState(() => _pendingBooking = null);
              },
            ),
          ),
        ),
      // 4 nút danh mục chia đều — nhãn ngắn, luôn 1 dòng, không cuộn ngang
      block(
        HomeCategoryRow(
          items: [
            (icon: AppIcons.compass, label: 'Tất cả', tone: AppTone.jade, selected: true, onTap: null),
            (
              icon: AppIcons.sunHorizon,
              label: 'Trong ngày',
              tone: AppTone.brass,
              selected: false,
              onTap: () => _openList(filter: const TourFilter(format: 'DAY_TRIP'), title: 'Tour trong ngày'),
            ),
            (
              icon: AppIcons.suitcaseRolling,
              label: 'Nhiều ngày',
              tone: AppTone.sky,
              selected: false,
              onTap: () => _openList(filter: const TourFilter(format: 'MULTI_DAY'), title: 'Tour nhiều ngày'),
            ),
            (
              // Mở lịch: chọn ngày → xem các tour khởi hành ngày đó
              icon: AppIcons.calendarDots,
              label: 'Theo ngày',
              tone: AppTone.coral,
              selected: false,
              onTap: () => openTourCalendar(context),
            ),
          ],
        ),
      ),
      if (journey != null)
        block(
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
            child: HomeJourneyCard(
              journey: journey,
              imageUrl: _journeyImage,
              distance: _nextDistance,
              mission: _missions.firstOrNull,
              missionCount: _missions.length,
              onContinue: _continueJourney,
              onMission: _missions.isEmpty ? null : () => _openMission(_missions.first),
            ),
          ),
        ),
      if (_toursError != null && _tours.isEmpty)
        block(_buildToursError())
      else if (_tours.isEmpty)
        block(_buildNoTours())
      else if (_availableTours.isEmpty)
        block(_buildAllOwned())
      else ...[
        // 2 tour gần nhất, thẻ ngang toàn bề rộng — hiện trọn, phần còn lại qua "Xem tất cả"
        if (upcoming.isNotEmpty)
          block(
            _section(
              title: 'Khởi hành sắp tới',
              onAll: () => _openList(
                filter: const TourFilter(order: TourOrder.departure),
                title: 'Khởi hành sắp tới',
              ),
              child: TourRowList(tours: upcoming.take(2).toList(), showDate: true, onOpen: _openTour),
            ),
          ),
        // Chip co theo tên, vừa đúng 2 hàng; chủ đề dư gom vào chip "+N chủ đề"
        if (_themes.isNotEmpty)
          block(
            _section(
              title: 'Khám phá theo chủ đề',
              child: CatalogChipWrap(
                sheetTitle: 'Tất cả chủ đề',
                moreLabel: 'chủ đề',
                items: [
                  for (final t in _themes)
                    (
                      label: t.name,
                      trailing: null,
                      photo: _catalogPhoto(t, (tour) => tour.themeId == t.id),
                      onTap: () => _openList(filter: TourFilter(themeId: t.id), title: t.name),
                    ),
                ],
              ),
            ),
          ),
        if (regions.isNotEmpty)
          block(
            _section(
              title: 'Điểm đến theo vùng miền',
              child: CatalogChipWrap(
                sheetTitle: 'Tất cả vùng miền',
                moreLabel: 'vùng',
                items: [
                  for (final r in regions)
                    (
                      label: r.name,
                      trailing: _regionCounts[r.id] == null ? null : '${_regionCounts[r.id]} tour',
                      photo: _catalogPhoto(r, (tour) => tour.regionId == r.id),
                      onTap: () => _openList(filter: TourFilter(regionId: r.id), title: r.name),
                    ),
                ],
              ),
            ),
          ),
        if (dayTrips.isNotEmpty)
          block(
            _section(
              title: 'Tour trong ngày',
              onAll: () => _openList(
                filter: const TourFilter(format: 'DAY_TRIP'),
                title: 'Tour trong ngày',
              ),
              child: TourRowList(tours: dayTrips.take(3).toList(), onOpen: _openTour),
            ),
          ),
        if (multiDays.isNotEmpty)
          block(
            _section(
              title: 'Tour nhiều ngày',
              onAll: () => _openList(
                filter: const TourFilter(format: 'MULTI_DAY'),
                title: 'Tour nhiều ngày',
              ),
              child: TourRowList(tours: multiDays.take(3).toList(), onOpen: _openTour),
            ),
          ),
        block(
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 28, 16, 0),
            child: OutlinedButton(
              onPressed: _openList,
              style: OutlinedButton.styleFrom(
                foregroundColor: AppInk.ink,
                side: const BorderSide(color: AppInk.ink),
                minimumSize: const Size.fromHeight(48),
                shape: const StadiumBorder(),
              ),
              child: Text(
                _allLoaded
                    ? 'Xem tất cả ${_availableTours.length} tour'
                    : 'Xem tất cả tour',
                style: const TextStyle(fontWeight: FontWeight.w700),
              ),
            ),
          ),
        ),
      ],
    ];
  }

  Widget _section({required String title, VoidCallback? onAll, required Widget child}) {
    return Padding(
      padding: const EdgeInsets.only(top: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          HomeSectionTitle(title: title, actionLabel: onAll == null ? null : 'Xem tất cả', onAction: onAll),
          child,
        ],
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

  /// Du khách đã mua hết các tour đang hiển thị ⇒ không còn tour nào để đặt.
  Widget _buildAllOwned() {
    return _messageCard(
      icon: Icons.confirmation_number_rounded,
      title: 'Bạn đã mua tất cả tour hiện có',
      message: 'Xem mục "Chuyến đi" để trải nghiệm các tour đã đặt.',
      action: TextButton(
        onPressed: () => widget.onNavigateToTab(1),
        child: const Text('Xem chuyến đi của tôi'),
      ),
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
            Container(
              padding: const EdgeInsets.all(14),
              decoration: const BoxDecoration(color: AppCultureColors.surfaceSubtle, shape: BoxShape.circle),
              child: Icon(icon, size: 30, color: AppCultureColors.textMuted),
            ),
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

  /// Tên gọi trong lời chào: tên riêng (từ cuối của họ tên), bỏ phần trong ngoặc. "Nguyễn Văn Long (SE…)" → "Long".
  String get _firstName {
    final name = widget.currentUser.fullName.replaceAll(RegExp(r'\(.*?\)'), '').trim();
    final parts = name.split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
    return parts.isEmpty ? 'bạn' : parts.last;
  }

  /// Đầu trang nền trắng: lời chào + khu vực, điểm thưởng, chuông; ô tìm kiếm lớn luôn ghim khi cuộn.
  Widget _buildHeader() {
    return SliverAppBar(
      pinned: true,
      automaticallyImplyLeading: false,
      backgroundColor: AppInk.paper,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      scrolledUnderElevation: 0,
      toolbarHeight: 62,
      titleSpacing: 16,
      title: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Xin chào, $_firstName',
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(color: AppInk.muted, fontSize: 13, fontWeight: FontWeight.w500),
          ),
          const SizedBox(height: 2),
          Text(
            _area ?? 'Hôm nay bạn muốn đi đâu?',
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(color: AppInk.ink, fontSize: 18, fontWeight: FontWeight.w800, letterSpacing: -0.2),
          ),
        ],
      ),
      actions: [
        _buildPointsPill(),
        const SizedBox(width: 8),
        Padding(padding: const EdgeInsets.only(right: 12), child: _buildBell()),
      ],
      bottom: PreferredSize(
        preferredSize: const Size.fromHeight(62),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 2, 16, 8),
          child: Semantics(
            button: true,
            label: 'Tìm tour, điểm đến, chủ đề',
            child: Pressable(
              onTap: () => _openList(focusSearch: true),
              child: Container(
                height: 52,
                padding: const EdgeInsets.only(left: 16, right: 6),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(30),
                  border: Border.all(color: AppInk.line),
                  boxShadow: [
                    BoxShadow(color: AppInk.ink.withValues(alpha: 0.07), blurRadius: 22, offset: const Offset(0, 8)),
                  ],
                ),
                child: Row(
                  children: [
                    const Icon(Icons.search_rounded, color: AppInk.accent, size: 24),
                    const SizedBox(width: 12),
                    const Expanded(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Bạn muốn khám phá ở đâu?',
                            style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: AppInk.ink),
                          ),
                          Text('Tour · Điểm đến · Chủ đề', style: TextStyle(fontSize: 12, color: AppInk.muted)),
                        ],
                      ),
                    ),
                    Container(
                      width: 40,
                      height: 40,
                      decoration: const BoxDecoration(shape: BoxShape.circle, color: AppInk.accentSoft),
                      child: const Icon(Icons.tune_rounded, size: 19, color: AppInk.accent),
                    ),
                  ],
                ),
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
        height: 36,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: AppCultureColors.rewardBg,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: AppCultureColors.rewardBorder),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.stars_rounded, size: 17, color: AppCultureColors.gold),
            const SizedBox(width: 5),
            Text(
              '${formatThousands(_userPoints)} điểm',
              style: const TextStyle(color: AppCultureColors.rewardText, fontSize: 13, fontWeight: FontWeight.w700),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBell() {
    return Semantics(
      button: true,
      label: 'Thông báo',
      child: GestureDetector(
        onTap: () => showNotificationSheet(context),
        child: Container(
          width: 44,
          height: 44,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: AppInk.surface,
            border: Border.all(color: AppInk.line),
          ),
          child: const NotificationBellIcon(size: 20, color: AppInk.ink),
        ),
      ),
    );
  }
}
