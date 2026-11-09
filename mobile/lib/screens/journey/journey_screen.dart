import 'dart:async';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart' show Position;
import 'package:latlong2/latlong.dart';
import '../../core/constants/app_colors.dart';
import '../../core/models/tour_detail_model.dart';
import '../../core/models/tour_journey_model.dart';
import '../../core/services/api_client.dart';
import '../../core/services/destination_service.dart';
import '../../core/services/journey_service.dart';
import '../../core/services/location_service.dart';
import '../../core/services/route_service.dart';
import '../../core/services/tour_service.dart';
import '../common/ink.dart';
import '../common/photo.dart';
import '../culture/cultural_stories.dart';
import '../tours/tour_detail_sections.dart' show showStopPreview;
import 'journey_map.dart';
import 'journey_summary_screen.dart';
import 'journey_widgets.dart';
import 'map_kit.dart';
import 'navigation.dart';
import 'qr_scan_screen.dart';
import 'reward_effects.dart';
import 'task_screen.dart';

/// Hành trình trải nghiệm văn hóa: các điểm đến theo thứ tự, check-in GPS và nhiệm vụ tại từng điểm.
///
/// Truyền [journeyId] để mở hành trình có sẵn, hoặc [tourId] (+ [bookingId]) để bắt đầu / tiếp tục.
class JourneyScreen extends StatefulWidget {
  final int? journeyId;
  final int? tourId;
  final int? bookingId;

  /// Mở màn hình quét QR ngay cho điểm đến hiện tại (nếu chưa check-in).
  final bool autoQr;

  const JourneyScreen({super.key, this.journeyId, this.tourId, this.bookingId, this.autoQr = false})
    : assert(journeyId != null || tourId != null);

  @override
  State<JourneyScreen> createState() => _JourneyScreenState();
}

class _JourneyScreenState extends State<JourneyScreen> {
  final JourneyService _service = JourneyService();

  TourJourney? _journey;
  bool _loading = true;
  String? _error;
  int? _busyDestinationId;

  /// Chi tiết công khai của tour; với tour 5 bước dùng để lấy toạ độ, ảnh và nội dung văn hoá của điểm dừng.
  TourDetailModel? _tourDetail;

  bool get _isWizard => _tourDetail?.wizardTour ?? false;

  /// Điểm dừng của tour 5 bước ứng với một trạm hành trình (destinationId = id điểm dừng).
  TourStopModel? _stopOf(JourneyDestination dest) =>
      _isWizard ? _tourDetail!.stops.where((s) => s.id == dest.destinationId).firstOrNull : null;

  // Bản đồ hành trình
  final DestinationService _destinationService = DestinationService();
  final Map<int, LatLng> _coords = {};
  bool _coordsLoaded = false;
  LatLng? _user;
  double? _heading;
  StreamSubscription<Position>? _positionSub;
  bool _satellite = false;
  final GlobalKey<JourneyMapState> _mapKey = GlobalKey<JourneyMapState>();

  /// Ảnh bìa điểm đến của tour luồng cũ (tour 5 bước lấy ảnh điểm dừng trong chi tiết tour).
  final Map<int, String> _legacyImages = {};

  /// Đang xem tab Bản đồ (mặc định là tab Lộ trình).
  bool _mapView = false;

  /// Thẻ trạm vuốt ngang ở tab Bản đồ.
  PageController _cards = PageController(viewportFraction: 0.88);

  /// Trạm đã xong mà du khách mở rộng để xem lại ở tab Lộ trình.
  final Set<int> _expanded = {};

  // Chỉ đường tới điểm đến: _navDestination != null là đang xem trước hoặc đang dẫn đường.
  JourneyDestination? _navDestination;
  RouteModel? _route;
  RouteTracker? _tracker;
  RouteProgress? _progress;
  RouteVehicle _vehicle = RouteVehicle.bike;
  bool _routeLoading = false;
  String? _routeError;
  bool _navActive = false;
  bool _following = true;
  bool _rerouting = false;
  int _offRouteHits = 0;
  DateTime _lastRouteAt = DateTime.fromMillisecondsSinceEpoch(0);

  @override
  void initState() {
    super.initState();
    _load();
    _startLocation();
  }

  @override
  void dispose() {
    _positionSub?.cancel();
    _cards.dispose();
    super.dispose();
  }

  Future<void> _load({bool silent = false}) async {
    if (!silent) setState(() => _loading = true);
    try {
      final journey = _journey == null && widget.journeyId == null
          ? await _service.start(tourId: widget.tourId!, bookingId: widget.bookingId)
          : await _service.getById(_journey?.id ?? widget.journeyId!);
      if (!mounted) return;
      final firstLoad = _journey == null;
      if (_tourDetail == null) {
        try {
          _tourDetail = await TourService().getPublicDetail(journey.tourId);
        } catch (_) {
          // Không có chi tiết thì vẫn hiện hành trình như tour thường.
        }
        if (!mounted) return;
      }
      setState(() {
        _journey = journey;
        _error = null;
        _loading = false;
      });
      _loadCoords(journey);
      if (firstLoad && widget.autoQr) {
        final pending = journey.destinations.where((d) => d.isCurrent && !d.checkedIn);
        if (pending.isNotEmpty) {
          _checkInQr(pending.first);
        } else {
          // Không còn điểm nào cần check-in: báo thay vì mở màn quét QR
          _showAlreadyCheckedIn(
            journey.isCompleted
                ? 'Hành trình này đã kết thúc. Bạn có thể xem lại câu chuyện văn hóa đã mở khóa.'
                : 'Bạn đã check-in điểm đến hiện tại rồi. Hãy hoàn thành nhiệm vụ để mở điểm đến kế tiếp.',
          );
        }
      }
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        // Lỗi mạng khi làm mới: giữ dữ liệu đang có, chỉ báo lỗi.
        _error = e.message;
        _loading = false;
      });
    }
  }

  Future<void> _checkIn(JourneyDestination dest) async {
    if (_blockRepeatCheckIn(dest)) return;
    final journey = _journey!;
    setState(() => _busyDestinationId = dest.destinationId);
    try {
      final position = await LocationService.currentPosition();
      final result = await _service.checkInGps(
        journeyId: journey.id,
        destinationId: dest.destinationId,
        latitude: position.latitude,
        longitude: position.longitude,
      );
      await _afterCheckIn(result, dest);
    } on LocationException catch (e) {
      if (mounted) await _showLocationProblem(e);
    } on ApiException catch (e) {
      if (mounted) await _showCheckInProblem(e.message);
    } finally {
      if (mounted) setState(() => _busyDestinationId = null);
    }
  }

  /// Check-in bằng cách quét mã QR đặt tại điểm đến.
  Future<void> _checkInQr(JourneyDestination dest) async {
    if (_blockRepeatCheckIn(dest)) return;
    final journey = _journey!;
    final value = await Navigator.of(context).push<String>(
      MaterialPageRoute(
        fullscreenDialog: true,
        builder: (_) => QrScanScreen(title: 'Check-in bằng QR', hint: 'Quét mã QR tại ${dest.name}'),
      ),
    );
    if (value == null || !mounted) return;
    setState(() => _busyDestinationId = dest.destinationId);
    try {
      final result = await _service.checkInQr(journeyId: journey.id, destinationId: dest.destinationId, qrValue: value);
      await _afterCheckIn(result, dest);
    } on ApiException catch (e) {
      if (mounted) await _showCheckInProblem(e.message);
    } finally {
      if (mounted) setState(() => _busyDestinationId = null);
    }
  }

  Future<void> _afterCheckIn(CheckInResult result, JourneyDestination dest) async {
    if (_navDestination?.destinationId == dest.destinationId) _endNavigation();
    await _load(silent: true);
    if (!mounted) return;
    if (result.alreadyCheckedIn) {
      await _showAlreadyCheckedIn(result.message.isEmpty ? 'Bạn đã check-in ${dest.name} rồi.' : '${result.message}.');
      return;
    }
    if (result.badgeAwarded) {
      await showBadgeUnlock(
        context,
        badgeName: (result.badgeName?.isNotEmpty ?? false) ? result.badgeName! : 'Huy hiệu di sản',
        badgeIconUrl: result.badgeIconUrl,
        subtitle: 'Check-in thành công tại ${dest.name}. Nội dung văn hóa và nhiệm vụ đã được mở khóa.',
        buttonLabel: 'Bắt đầu nhiệm vụ',
      );
    } else {
      _snack(result.message.isEmpty ? 'Check-in thành công.' : result.message);
    }
  }

  Future<void> _skip(JourneyDestination dest) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
        title: const Text('Bỏ qua điểm đến?'),
        content: Text(
          'Bạn sẽ không nhận huy hiệu và điểm thưởng tại ${dest.name}. Hành trình tiếp tục ở điểm kế tiếp.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Ở lại')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Bỏ qua', style: TextStyle(color: AppCultureColors.error)),
          ),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    setState(() => _busyDestinationId = dest.destinationId);
    try {
      await _service.skipDestination(journeyId: _journey!.id, destinationId: dest.destinationId);
      await _load(silent: true);
      // Bỏ qua điểm cuối cũng kết thúc hành trình
      if (mounted && (_journey?.isCompleted ?? false)) await _celebrateCompletion();
    } on ApiException catch (e) {
      _snack(e.message);
    } finally {
      if (mounted) setState(() => _busyDestinationId = null);
    }
  }

  Future<void> _openTask(JourneyDestination dest, JourneyTask task) async {
    final changed = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => TaskScreen(
          journeyId: _journey!.id,
          taskId: task.taskId,
          fallbackName: task.name,
          destinationName: dest.name,
        ),
      ),
    );
    if (changed == true && mounted) {
      final wasCompleted = _journey?.isCompleted ?? false;
      await _load(silent: true);
      if (!mounted) return;
      if (!wasCompleted && (_journey?.isCompleted ?? false)) await _celebrateCompletion();
    }
  }

  void _snack(String text) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text), behavior: SnackBarBehavior.floating));
  }

  Future<void> _showLocationProblem(LocationException e) {
    return showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
        icon: const Icon(Icons.location_off_rounded, size: 36, color: AppCultureColors.warning),
        title: const Text('Chưa lấy được vị trí'),
        content: Text(e.message),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Đóng')),
          if (e.needsSettings)
            TextButton(
              onPressed: () {
                Navigator.pop(ctx);
                LocationService.openSettings();
              },
              child: const Text('Mở cài đặt'),
            ),
        ],
      ),
    );
  }

  /// Báo du khách đã check-in (hoặc đã hoàn thành hành trình), không cho check-in lại.
  Future<void> _showAlreadyCheckedIn(String message) {
    final completed = _journey?.isCompleted ?? false;
    return showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(28))),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 24, 24, 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                completed ? Icons.emoji_events_rounded : Icons.verified_rounded,
                size: 48,
                color: completed ? AppCultureColors.amberDark : AppCultureColors.heritageJade,
              ),
              const SizedBox(height: 12),
              Text(
                completed ? 'Bạn đã hoàn thành hành trình' : 'Bạn đã check-in rồi',
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 8),
              Text(
                message,
                textAlign: TextAlign.center,
                style: const TextStyle(height: 1.45, color: AppCultureColors.textMuted),
              ),
              const SizedBox(height: 18),
              PrimaryButton(label: 'Đã hiểu', onPressed: () => Navigator.pop(ctx)),
            ],
          ),
        ),
      ),
    );
  }

  /// Chặn check-in lại ngay trên app: điểm đã check-in hoặc hành trình đã xong thì chỉ báo.
  bool _blockRepeatCheckIn(JourneyDestination dest) {
    final journey = _journey;
    if (journey == null) return false;
    if (dest.checkedIn) {
      _showAlreadyCheckedIn(
        journey.isCompleted
            ? 'Bạn đã check-in ${dest.name} và đi trọn hành trình. Không cần check-in thêm.'
            : 'Bạn đã check-in ${dest.name} rồi. Hãy tiếp tục làm nhiệm vụ tại điểm đến này.',
      );
      return true;
    }
    if (journey.isCompleted) {
      _showAlreadyCheckedIn('Hành trình này đã kết thúc. Bạn có thể xem lại câu chuyện văn hóa đã mở khóa.');
      return true;
    }
    return false;
  }

  Future<void> _showCheckInProblem(String message) {
    return showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(28))),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 24, 24, 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.wrong_location_rounded, size: 44, color: AppCultureColors.warning),
              const SizedBox(height: 12),
              const Text('Chưa thể check-in', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              Text(
                message,
                textAlign: TextAlign.center,
                style: const TextStyle(height: 1.45, color: AppCultureColors.textMuted),
              ),
              const SizedBox(height: 18),
              PrimaryButton(label: 'Đã hiểu', onPressed: () => Navigator.pop(ctx)),
            ],
          ),
        ),
      ),
    );
  }

  // ── Bản đồ hành trình ────────────────────────────────────────────────────────

  /// Tải tọa độ các điểm đến (GET /destinations/{id}); điểm lỗi thì bỏ qua, không chặn màn hình.
  Future<void> _loadCoords(TourJourney journey) async {
    // Tour 5 bước: toạ độ điểm dừng (checkpoint đầu tiên) đã có trong chi tiết tour.
    if (_isWizard) {
      setState(() {
        for (final d in journey.destinations) {
          final stop = _stopOf(d);
          if (stop != null && stop.hasLocation) _coords[d.destinationId] = LatLng(stop.latitude!, stop.longitude!);
        }
        _coordsLoaded = true;
      });
      return;
    }
    final missing = journey.destinations.where((d) => !_coords.containsKey(d.destinationId)).toList();
    if (missing.isEmpty) {
      if (!_coordsLoaded && mounted) setState(() => _coordsLoaded = true);
      return;
    }
    final results = await Future.wait(
      missing.map((d) async {
        try {
          final model = await _destinationService.getDestinationById(d.destinationId);
          final hasPoint = !(model.latitude == 0 && model.longitude == 0);
          return (
            id: d.destinationId,
            point: hasPoint ? LatLng(model.latitude, model.longitude) : null,
            image: model.coverImageUrl,
          );
        } catch (_) {
          return null;
        }
      }),
    );
    if (!mounted) return;
    setState(() {
      for (final r in results.nonNulls) {
        if (r.point != null) _coords[r.id] = r.point!;
        if (r.image != null) _legacyImages[r.id] = r.image!;
      }
      _coordsLoaded = true;
    });
  }

  /// Hiện vị trí du khách trên bản đồ; không có quyền thì bản đồ vẫn dùng được.
  Future<void> _startLocation() async {
    try {
      final p = await LocationService.currentPosition();
      if (!mounted) return;
      setState(() => _user = LatLng(p.latitude, p.longitude));
      _positionSub = LocationService.positionStream().listen((p) {
        if (!mounted) return;
        setState(() {
          _user = LatLng(p.latitude, p.longitude);
          _heading = (p.speed > 0.7 && p.heading >= 0) ? p.heading : null;
        });
        _onNavPosition();
      }, onError: (_) {});
    } on LocationException {
      // Chưa bật GPS / chưa cấp quyền: nút check-in GPS sẽ hướng dẫn khi du khách bấm.
    }
  }

  List<JourneyStop> get _stops {
    final journey = _journey;
    if (journey == null) return const [];
    return [
      for (final d in journey.destinations)
        if (_coords[d.destinationId] != null)
          JourneyStop(
            destinationId: d.destinationId,
            order: d.orderIndex,
            name: d.name,
            point: _coords[d.destinationId]!,
            state: d.isDone
                ? StopState.done
                : d.isCurrent
                ? StopState.current
                : StopState.locked,
            skipped: d.status == ProgressStatus.skipped,
            imageUrl: _imageOf(d),
          ),
    ];
  }

  /// Ảnh của trạm: ảnh điểm dừng (tour 5 bước) hoặc ảnh bìa điểm đến (tour luồng cũ).
  String? _imageOf(JourneyDestination d) => _stopOf(d)?.imageUrl ?? _legacyImages[d.destinationId];

  /// Ảnh từng trạm theo destinationId.
  Map<int, String> get _images => {
    for (final d in _journey?.destinations ?? const <JourneyDestination>[]) d.destinationId: ?_imageOf(d),
  };

  void _openSummary() {
    final journey = _journey;
    if (journey == null) return;
    JourneySummaryScreen.open(context, journey: journey, stops: _stops, images: _images, coverImage: _coverImage);
  }

  /// Vừa đi hết hành trình: màn chúc mừng toàn màn hình rồi mở tổng kết.
  Future<void> _celebrateCompletion() async {
    final journey = _journey;
    if (journey == null || !journey.isCompleted) return;
    final bonus = journey.completionBonusPoints;
    await showBadgeUnlock(
      context,
      badgeName: switch (journey.completionRank) {
        CompletionRank.perfect => 'Hoàn thành trọn vẹn',
        CompletionRank.partial => 'Đã đi hết hành trình',
        _ => 'Hoàn thành hành trình',
      },
      subtitle: bonus > 0
          ? 'Bạn đã đi trọn "${journey.tourName}" và nhận thêm $bonus điểm thưởng. Cảm ơn bạn đã lan tỏa di sản!'
          : 'Bạn đã đi hết "${journey.tourName}". Cảm ơn bạn đã đồng hành cùng di sản!',
      buttonLabel: 'Xem tổng kết',
    );
    if (mounted) _openSummary();
  }

  // ── Chỉ đường ────────────────────────────────────────────────────────────────

  /// Bắt đầu chỉ đường tới [dest]: tìm tuyến từ vị trí hiện tại và xem trước toàn tuyến.
  Future<void> _openDirections(JourneyDestination dest) async {
    if (_coords[dest.destinationId] == null) return;
    if (_user == null) await _startLocation();
    if (!mounted) return;
    if (_user == null) {
      _snack('Hãy bật định vị và cho phép truy cập vị trí để chỉ đường.');
      return;
    }
    setState(() {
      _navDestination = dest;
      _navActive = false;
      _following = true;
      _mapView = true;
    });
    await _fetchRoute(fit: true);
  }

  Future<void> _fetchRoute({bool fit = false}) async {
    final dest = _navDestination;
    final from = _user;
    final to = dest == null ? null : _coords[dest.destinationId];
    if (dest == null || from == null || to == null) return;
    setState(() {
      _routeLoading = true;
      _routeError = null;
    });
    _lastRouteAt = DateTime.now();
    try {
      final route = await RouteService().direction(from, to, vehicle: _vehicle);
      if (!mounted || _navDestination?.destinationId != dest.destinationId) return;
      final user = _user ?? from;
      setState(() {
        _route = route;
        _tracker = route == null ? null : RouteTracker(route);
        _progress = _tracker?.update(user);
        _routeError = route == null ? 'Không tìm được đường tới điểm này.' : null;
        _offRouteHits = 0;
      });
      if (route != null && fit && !_navActive) _fitRoute(route);
    } on ApiException catch (e) {
      if (mounted) setState(() => _routeError = e.message);
    } finally {
      if (mounted) {
        setState(() {
          _routeLoading = false;
          _rerouting = false;
        });
      }
    }
  }

  void _fitRoute(RouteModel route) {
    final topInset = MediaQuery.paddingOf(context).top;
    _mapKey.currentState?.fitPoints(route.points, EdgeInsets.fromLTRB(50, topInset + 90, 70, 320));
  }

  void _beginNavigation() {
    setState(() {
      _navActive = true;
      _following = true;
    });
    final user = _user;
    if (user != null) _mapKey.currentState?.follow(user);
  }

  void _endNavigation() {
    setState(() {
      _navDestination = null;
      _route = null;
      _tracker = null;
      _progress = null;
      _navActive = false;
      _rerouting = false;
      _routeError = null;
    });
  }

  /// Mỗi lần vị trí đổi: cập nhật bước rẽ, bám theo du khách, tìm lại đường khi đi lệch.
  void _onNavPosition() {
    final tracker = _tracker;
    final user = _user;
    if (tracker == null || user == null || _navDestination == null) return;
    final progress = tracker.update(user);
    setState(() => _progress = progress);
    if (_navActive && _following) _mapKey.currentState?.follow(user);
    if (_arrived) return;

    // Lệch tuyến hơn 45 m ba lần liên tiếp thì tìm đường mới (tối đa mỗi 15 giây)
    _offRouteHits = progress.offRouteMeters > 45 ? _offRouteHits + 1 : 0;
    if (_navActive &&
        _offRouteHits >= 3 &&
        !_routeLoading &&
        DateTime.now().difference(_lastRouteAt) > const Duration(seconds: 15)) {
      setState(() => _rerouting = true);
      _fetchRoute();
    }
  }

  /// Đã vào gần điểm đang chỉ đường (trong bán kính check-in 100 m, chừa sai số GPS).
  bool get _arrived {
    final dest = _navDestination;
    final point = dest == null ? null : _coords[dest.destinationId];
    return point != null && _user != null && distanceMeters(_user!, point) <= 80;
  }

  /// Phần đường còn phải đi (từ chỗ du khách đang đứng trên tuyến tới đích).
  List<LatLng>? get _navRoute {
    final route = _route;
    if (route == null) return null;
    final tracker = _tracker, progress = _progress;
    return tracker != null && progress != null ? tracker.remainingPath(progress) : route.points;
  }

  JourneyDestination? get _currentDestination {
    final list = _journey?.destinations.where((d) => d.isCurrent).toList() ?? const [];
    return list.isEmpty ? null : list.first;
  }

  void _focusDestination(int destinationId) {
    final point = _coords[destinationId];
    if (point == null) return;
    _mapKey.currentState?.focus(point);
  }

  /// Mở tab Bản đồ, thẻ trạm dừng ở trạm đang mở.
  void _enterMap() {
    final dests = _journey?.destinations ?? const <JourneyDestination>[];
    final index = dests.indexWhere((d) => d.isCurrent);
    final old = _cards;
    setState(() {
      _cards = PageController(viewportFraction: 0.88, initialPage: index < 0 ? 0 : index);
      _mapView = true;
    });
    WidgetsBinding.instance.addPostFrameCallback((_) => old.dispose());
  }

  void _leaveMap() {
    if (_navDestination != null) _endNavigation();
    setState(() => _mapView = false);
  }

  /// Chạm ghim trên bản đồ: lướt thẻ tới trạm đó.
  void _showStopCard(int destinationId) {
    final index = _journey?.destinations.indexWhere((d) => d.destinationId == destinationId) ?? -1;
    if (index < 0) return;
    _focusDestination(destinationId);
    if (_cards.hasClients) {
      _cards.animateToPage(index, duration: const Duration(milliseconds: 300), curve: Curves.easeOutCubic);
    }
  }

  // ── Giao diện ────────────────────────────────────────────────────────────────
  // Hai tab của cùng màn: "Lộ trình" (ảnh bìa, tiến độ, dòng thời gian các trạm, thanh việc kế tiếp)
  // và "Bản đồ" (ghim bằng ảnh địa điểm, thẻ trạm vuốt ngang). Đang chỉ đường thì luôn ở bản đồ.

  bool get _hasMap => _coordsLoaded && _coords.isNotEmpty;

  /// Ảnh bìa: ảnh bìa tour → ảnh trạm đầu tiên có ảnh; không có thì nền trung tính.
  String? get _coverImage =>
      _tourDetail?.coverImageUrl ?? _journey?.destinations.map(_imageOf).whereType<String>().firstOrNull;

  String _rankTitle(TourJourney journey) => switch (journey.completionRank) {
    CompletionRank.perfect => 'Hoàn thành trọn vẹn',
    CompletionRank.partial => 'Đã đi hết hành trình',
    _ => 'Hoàn thành hành trình',
  };

  @override
  Widget build(BuildContext context) {
    final journey = _journey;
    if (_loading) {
      return const Scaffold(
        backgroundColor: Colors.white,
        body: Center(child: CircularProgressIndicator(color: AppInk.accent)),
      );
    }
    if (journey == null) return Scaffold(backgroundColor: Colors.white, body: _buildError());
    final showMap = _hasMap && (_mapView || _navDestination != null);
    return Scaffold(
      backgroundColor: Colors.white,
      body: showMap ? _buildMapLayout(journey) : _buildRouteView(journey),
      bottomNavigationBar: showMap ? null : _nextActionBar(journey),
    );
  }

  /// Nút chuyển tab Lộ trình / Bản đồ. [floating]: nổi trên bản đồ (nền trắng, tab chọn màu đậm).
  Widget _viewSwitch({required bool onMap, bool floating = false}) {
    Widget seg(String label, bool selected, VoidCallback? onTap) {
      final Color fg = selected
          ? (floating ? Colors.white : AppInk.ink)
          : (onTap == null ? AppInk.muted.withValues(alpha: 0.5) : AppInk.muted);
      return Expanded(
        child: Semantics(
          button: true,
          selected: selected,
          child: GestureDetector(
            onTap: onTap,
            behavior: HitTestBehavior.opaque,
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              height: floating ? 36 : 40,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: selected ? (floating ? AppInk.ink : Colors.white) : Colors.transparent,
                borderRadius: BorderRadius.circular(10),
                boxShadow: selected && !floating
                    ? const [BoxShadow(color: Color(0x1F16181D), blurRadius: 3, offset: Offset(0, 1))]
                    : null,
              ),
              child: Text(
                label,
                style: TextStyle(fontSize: 14, fontWeight: selected ? FontWeight.w700 : FontWeight.w600, color: fg),
              ),
            ),
          ),
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: floating ? Colors.white : AppInk.soft,
        borderRadius: BorderRadius.circular(14),
        boxShadow: floating ? const [BoxShadow(color: Color(0x2616181D), blurRadius: 8, offset: Offset(0, 2))] : null,
      ),
      child: Row(
        children: [
          seg('Lộ trình', !onMap, onMap ? _leaveMap : null),
          seg('Bản đồ', onMap, !onMap && _hasMap ? _enterMap : null),
        ],
      ),
    );
  }

  // ── Tab Lộ trình ─────────────────────────────────────────────────────────────

  Widget _buildRouteView(TourJourney journey) {
    final dests = journey.destinations;
    return RefreshIndicator(
      color: AppInk.accent,
      onRefresh: () => _load(silent: true),
      child: CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          SliverAppBar(
            pinned: true,
            expandedHeight: 240,
            backgroundColor: Colors.white,
            surfaceTintColor: Colors.transparent,
            foregroundColor: AppInk.ink,
            elevation: 0,
            scrolledUnderElevation: 0.5,
            automaticallyImplyLeading: false,
            leadingWidth: 64,
            leading: Center(
              child: MapRoundButton(
                icon: Icons.arrow_back_rounded,
                tooltip: 'Quay lại',
                onPressed: () => Navigator.of(context).maybePop(),
              ),
            ),
            flexibleSpace: FlexibleSpaceBar(
              collapseMode: CollapseMode.parallax,
              background: Photo(url: _coverImage, width: 420, semanticLabel: journey.tourName),
            ),
          ),
          SliverToBoxAdapter(child: _routeHeader(journey)),
          if (_error != null)
            SliverToBoxAdapter(
              child: Container(
                margin: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: const Color(0xFFFEE2E2), borderRadius: BorderRadius.circular(12)),
                child: Text(_error!, style: const TextStyle(color: AppCultureColors.error, fontSize: 12.5)),
              ),
            ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(16, 22, 16, 0),
            sliver: SliverList.list(
              children: [for (var i = 0; i < dests.length; i++) _timelineItem(dests[i], isLast: i == dests.length - 1)],
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
              child: journey.isCompleted ? _completedCard(journey) : _rewardHint(journey),
            ),
          ),
        ],
      ),
    );
  }

  Widget _routeHeader(TourJourney journey) {
    final dests = journey.destinations;
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 18, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            journey.isCompleted
                ? 'Đã đi xong · ${journey.totalDestinations} trạm'
                : 'Đang trải nghiệm · ${journey.totalDestinations} trạm',
            style: const TextStyle(fontSize: 13, color: AppInk.muted),
          ),
          const SizedBox(height: 6),
          Text(
            journey.tourName,
            style: const TextStyle(fontSize: 22, height: 1.3, fontWeight: FontWeight.w800, color: AppInk.ink),
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: Row(
                  children: [
                    for (var i = 0; i < dests.length; i++)
                      Expanded(
                        child: Container(
                          height: 6,
                          margin: EdgeInsets.only(right: i == dests.length - 1 ? 0 : 4),
                          decoration: BoxDecoration(
                            color: dests[i].isDone
                                ? AppInk.accent
                                : dests[i].isCurrent
                                ? AppInk.accent.withValues(alpha: 0.35)
                                : AppInk.line,
                            borderRadius: BorderRadius.circular(3),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Text(
                '${journey.totalPoints} điểm',
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppInk.ink),
              ),
            ],
          ),
          if (_hasMap) ...[const SizedBox(height: 18), _viewSwitch(onMap: false)],
        ],
      ),
    );
  }

  /// Một trạm trên dòng thời gian: trạm đang mở (và trạm đã xong được mở rộng) hiện đủ câu chuyện,
  /// nút hành động, nhiệm vụ; trạm khác là một hàng gọn có ảnh.
  Widget _timelineItem(JourneyDestination dest, {required bool isLast}) {
    final skipped = dest.status == ProgressStatus.skipped;
    final expanded = dest.isCurrent || _expanded.contains(dest.destinationId);
    final Widget marker;
    if (dest.isCurrent) {
      marker = _railDot(28, AppInk.ink, AppInk.ink, Text('${dest.orderIndex}', style: _railText(Colors.white)));
    } else if (skipped) {
      marker = _railDot(
        26,
        Colors.white,
        AppInk.border,
        const Icon(Icons.skip_next_rounded, size: 15, color: AppInk.muted),
      );
    } else if (dest.isDone) {
      marker = _railDot(
        26,
        AppInk.accent,
        AppInk.accent,
        const Icon(Icons.check_rounded, size: 15, color: Colors.white),
      );
    } else {
      marker = _railDot(
        26,
        Colors.white,
        const Color(0xFFC9C6BF),
        Text('${dest.orderIndex}', style: _railText(AppInk.muted)),
      );
    }
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SizedBox(
            width: 28,
            child: Column(
              children: [
                marker,
                if (!isLast)
                  Expanded(
                    child: Container(
                      width: 2,
                      margin: const EdgeInsets.only(top: 4),
                      color: dest.isDone ? AppInk.accent.withValues(alpha: 0.45) : AppInk.border,
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Padding(
              padding: EdgeInsets.only(bottom: isLast ? 12 : 24),
              child: expanded ? _stopExpanded(dest) : _stopCompact(dest),
            ),
          ),
        ],
      ),
    );
  }

  Widget _railDot(double size, Color fill, Color border, Widget child) => Container(
    width: size,
    height: size,
    decoration: BoxDecoration(
      color: fill,
      shape: BoxShape.circle,
      border: Border.all(color: border),
    ),
    child: Center(child: child),
  );

  TextStyle _railText(Color color) => TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: color);

  Widget _stopCompact(JourneyDestination dest) {
    final skipped = dest.status == ProgressStatus.skipped;
    final points = dest.tasks.fold(0, (s, t) => s + t.pointsEarned);
    final sub = skipped
        ? 'Đã bỏ qua'
        : dest.isDone
        ? 'Đã xong · +$points điểm · chạm để xem lại'
        : dest.orderIndex > 1
        ? 'Mở khi xong trạm ${dest.orderIndex - 1}${dest.totalTasks > 0 ? ' · ${dest.totalTasks} thử thách' : ''}'
        : 'Chưa mở';
    final stop = _stopOf(dest);
    return InkWell(
      borderRadius: BorderRadius.circular(14),
      onTap: dest.isDone && !skipped
          ? () => setState(() => _expanded.add(dest.destinationId))
          : stop != null
          ? () => showStopPreview(context, stop)
          : null,
      child: Row(
        children: [
          SizedBox(
            width: 72,
            height: 72,
            child: Photo(url: _imageOf(dest), width: 72, borderRadius: BorderRadius.circular(14)),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  dest.name,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: dest.isLocked ? AppInk.muted : AppInk.ink,
                  ),
                ),
                const SizedBox(height: 3),
                Text(sub, style: const TextStyle(fontSize: 12, color: AppInk.muted)),
              ],
            ),
          ),
          if (dest.badgeAwarded) const Icon(Icons.workspace_premium_rounded, color: AppCultureColors.gold, size: 22),
        ],
      ),
    );
  }

  Widget _stopExpanded(JourneyDestination dest) {
    final stop = _stopOf(dest);
    final skipped = dest.status == ProgressStatus.skipped;
    final point = _coords[dest.destinationId];
    final distance = (point != null && _user != null) ? distanceMeters(_user!, point) : null;
    final at = dest.checkedInAt;
    final status = dest.isDone
        ? (skipped ? 'Đã bỏ qua' : 'Đã xong')
        : dest.checkedIn
        ? 'Đang ở trạm · đã check-in${at == null ? '' : ' ${at.hour.toString().padLeft(2, '0')}:${at.minute.toString().padLeft(2, '0')}'}'
        : distance != null
        ? 'Trạm đang mở · cách ${formatDistance(distance)}'
        : 'Trạm đang mở';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    status,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: dest.isDone ? AppInk.muted : AppInk.accent,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    dest.name,
                    style: const TextStyle(fontSize: 17, height: 1.25, fontWeight: FontWeight.w800, color: AppInk.ink),
                  ),
                ],
              ),
            ),
            if (!dest.isCurrent)
              IconButton(
                tooltip: 'Thu gọn',
                onPressed: () => setState(() => _expanded.remove(dest.destinationId)),
                icon: const Icon(Icons.expand_less_rounded, color: AppInk.muted),
              ),
          ],
        ),
        const SizedBox(height: 10),
        _storyCard(dest, stop),
        if (dest.isCurrent && !dest.checkedIn) _checkInActions(dest),
        if (dest.checkedIn && dest.tasks.isNotEmpty) _taskList(dest),
        // Tour luồng cũ: câu chuyện văn hoá của điểm đến (tour 5 bước đã có trong thẻ câu chuyện)
        if (!_isWizard) ...[
          const SizedBox(height: 10),
          dest.checkedIn
              ? CulturalStoriesSection(destinationId: dest.destinationId, unlocked: true, showTeaser: true)
              : CulturalStoriesSection(destinationId: dest.destinationId, hideWhenEmpty: true),
        ],
      ],
    );
  }

  /// Ảnh trạm kèm lời dẫn câu chuyện; chạm để đọc đủ (ảnh, video, hiện vật) ở tour 5 bước.
  Widget _storyCard(JourneyDestination dest, TourStopModel? stop) {
    final image = _imageOf(dest);
    final text = dest.checkedIn ? (stop?.culturalContent ?? stop?.shortDescription) : stop?.shortDescription;
    if (image == null && text == null) return const SizedBox.shrink();
    final caption = Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      color: image != null ? const Color(0xA316181D) : AppInk.soft,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            dest.checkedIn ? 'Câu chuyện đã mở khóa' : 'Câu chuyện đang chờ bạn',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              color: image != null ? const Color(0xFFF3E3B5) : AppCultureColors.amberDark,
            ),
          ),
          if (text != null) ...[
            const SizedBox(height: 2),
            Text(
              text,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(fontSize: 13, height: 1.4, color: image != null ? Colors.white : AppInk.ink),
            ),
          ],
        ],
      ),
    );
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Semantics(
        button: stop != null,
        label: stop != null ? 'Đọc câu chuyện ${dest.name}' : null,
        child: GestureDetector(
          onTap: stop == null ? null : () => showStopPreview(context, stop),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(16),
            child: image == null
                ? caption
                : SizedBox(
                    height: 160,
                    child: Stack(
                      fit: StackFit.expand,
                      children: [
                        Photo(url: image, width: 360, semanticLabel: dest.name),
                        Align(alignment: Alignment.bottomCenter, child: caption),
                      ],
                    ),
                  ),
          ),
        ),
      ),
    );
  }

  Widget _checkInActions(JourneyDestination dest) {
    final busy = _busyDestinationId == dest.destinationId;
    final canRoute = _coords[dest.destinationId] != null;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          _isWizard
              ? 'Đến trong bán kính 300 m rồi check-in để mở câu chuyện và thử thách.'
              : 'Đến nơi rồi check-in để mở nhiệm vụ và nhận huy hiệu di sản.',
          style: const TextStyle(fontSize: 12.5, height: 1.45, color: AppInk.muted),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            if (canRoute) ...[
              Expanded(
                child: OutlinedButton(
                  onPressed: busy ? null : () => _openDirections(dest),
                  style: _outlineStyle(),
                  child: const Text('Chỉ đường'),
                ),
              ),
              const SizedBox(width: 8),
            ],
            Expanded(
              child: FilledButton(
                onPressed: busy ? null : () => _checkIn(dest),
                style: _filledStyle(),
                child: busy
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2.2, color: Colors.white),
                      )
                    : const Text('Check-in GPS'),
              ),
            ),
          ],
        ),
        if (!_isWizard)
          TextButton(
            onPressed: busy ? null : () => _checkInQr(dest),
            style: TextButton.styleFrom(foregroundColor: AppInk.ink),
            child: const Text('Quét mã QR tại điểm', style: TextStyle(fontWeight: FontWeight.w700)),
          ),
        TextButton(
          onPressed: busy ? null : () => _skip(dest),
          style: TextButton.styleFrom(foregroundColor: AppInk.muted),
          child: const Text('Bỏ qua trạm này', style: TextStyle(fontSize: 12.5)),
        ),
      ],
    );
  }

  ButtonStyle _filledStyle() => FilledButton.styleFrom(
    backgroundColor: AppInk.accent,
    foregroundColor: Colors.white,
    minimumSize: const Size(0, 48),
    shape: const StadiumBorder(),
    textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14.5),
  );

  ButtonStyle _outlineStyle() => OutlinedButton.styleFrom(
    foregroundColor: AppInk.ink,
    side: const BorderSide(color: AppInk.ink),
    minimumSize: const Size(0, 48),
    shape: const StadiumBorder(),
    textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14.5),
  );

  Widget _taskList(JourneyDestination dest) {
    final tasks = dest.tasks;
    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppInk.border),
      ),
      child: Column(
        children: [for (var i = 0; i < tasks.length; i++) _taskRow(dest, tasks[i], divider: i < tasks.length - 1)],
      ),
    );
  }

  static String _taskKind(String type) {
    final t = type.toUpperCase();
    if (t.contains('REAL_WORLD')) return 'Hoạt động thực địa · quét QR tại điểm';
    if (t.contains('QUIZ')) return 'Câu đố';
    if (t.contains('PUZZLE') || t.contains('GPS')) return 'Giải đố theo vị trí';
    return 'Nhiệm vụ';
  }

  Widget _taskRow(JourneyDestination dest, JourneyTask task, {required bool divider}) {
    final (IconData icon, Color tone) = task.isPassed
        ? (Icons.check_circle_rounded, AppInk.accent)
        : task.isCompleted
        ? (Icons.remove_circle_outline_rounded, AppCultureColors.amberDark)
        : task.isFailed
        ? (Icons.cancel_outlined, AppCultureColors.error)
        : (Icons.radio_button_unchecked_rounded, AppInk.ink);
    final sub = task.isPassed
        ? 'Hoàn thành'
        : task.isCompleted
        ? 'Đúng một phần'
        : task.isFailed
        ? 'Đã hết lượt'
        : task.attempts > 0
        ? 'Đã làm ${task.attempts} lượt · làm lại'
        : _taskKind(task.type);
    return InkWell(
      onTap: () => _openTask(dest, task),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          border: divider ? const Border(bottom: BorderSide(color: AppInk.line)) : null,
        ),
        child: Row(
          children: [
            Icon(icon, size: 22, color: tone),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    task.name,
                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppInk.ink),
                  ),
                  const SizedBox(height: 1),
                  Text(sub, style: const TextStyle(fontSize: 12, color: AppInk.muted)),
                ],
              ),
            ),
            const SizedBox(width: 8),
            task.isOpen
                ? Container(
                    height: 36,
                    padding: const EdgeInsets.symmetric(horizontal: 14),
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(color: AppInk.ink),
                    ),
                    child: const Text(
                      'Làm',
                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppInk.ink),
                    ),
                  )
                : Text(
                    '+${task.pointsEarned}',
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppInk.ink),
                  ),
          ],
        ),
      ),
    );
  }

  Widget _rewardHint(TourJourney journey) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: AppInk.soft, borderRadius: BorderRadius.circular(16)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Đi trọn ${journey.totalDestinations} trạm',
            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppInk.ink),
          ),
          const SizedBox(height: 4),
          const Text(
            'Nhận điểm thưởng hoàn thành và bảng tổng kết chuyến đi. Bỏ qua trạm nào thì không có thưởng hoàn thành.',
            style: TextStyle(fontSize: 13, height: 1.45, color: AppInk.muted),
          ),
        ],
      ),
    );
  }

  Widget _completedCard(TourJourney journey) {
    return InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: _openSummary,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppCultureColors.rewardBg,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppCultureColors.rewardBorder),
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _rankTitle(journey),
                    style: const TextStyle(fontWeight: FontWeight.w800, color: AppCultureColors.rewardText),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '${journey.totalPoints} điểm · ${journey.passedTaskCount}/${journey.allTasks.length} thử thách đạt trọn',
                    style: const TextStyle(fontSize: 12.5, color: AppCultureColors.amberDark),
                  ),
                ],
              ),
            ),
            const Text(
              'Xem tổng kết',
              style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: AppCultureColors.amberDark),
            ),
            const Icon(Icons.chevron_right_rounded, color: AppCultureColors.amberDark),
          ],
        ),
      ),
    );
  }

  /// Thanh dưới luôn chỉ việc kế tiếp: chỉ đường tới trạm, làm nhiệm vụ, hoặc xem tổng kết.
  Widget? _nextActionBar(TourJourney journey) {
    final String label, title, button;
    final VoidCallback action;
    if (journey.isCompleted) {
      label = 'Hành trình đã kết thúc';
      title = _rankTitle(journey);
      button = 'Xem tổng kết';
      action = _openSummary;
    } else {
      final cur = _currentDestination;
      if (cur == null) return null;
      if (!cur.checkedIn) {
        label = 'Trạm kế tiếp';
        title = cur.name;
        if (_coords[cur.destinationId] != null) {
          button = 'Chỉ đường';
          action = () => _openDirections(cur);
        } else {
          button = 'Check-in';
          action = () => _checkIn(cur);
        }
      } else {
        final task = cur.tasks.where((t) => t.isOpen).firstOrNull;
        if (task == null) return null;
        label = 'Việc tiếp theo';
        title = task.name;
        button = 'Bắt đầu';
        action = () => _openTask(cur, task);
      }
    }
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: AppInk.line)),
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(label, style: const TextStyle(fontSize: 12, color: AppInk.muted)),
                    const SizedBox(height: 1),
                    Text(
                      title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppInk.ink),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              FilledButton(
                onPressed: _busyDestinationId != null ? null : action,
                style: _filledStyle().copyWith(
                  padding: const WidgetStatePropertyAll(EdgeInsets.symmetric(horizontal: 22)),
                ),
                child: Text(button),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ── Tab Bản đồ ───────────────────────────────────────────────────────────────

  Widget _buildMapLayout(TourJourney journey) {
    final topInset = MediaQuery.paddingOf(context).top;
    final current = _currentDestination;
    final directionsTarget = current != null && !current.checkedIn && _coords[current.destinationId] != null
        ? current
        : null;
    final dests = journey.destinations;
    // Ép Stack phủ toàn màn hình: khi không có con nào chiếm chỗ, Stack co lại và bản đồ biến mất.
    return SizedBox.expand(
      child: Stack(
        children: [
          Positioned.fill(
            child: JourneyMap(
              key: _mapKey,
              stops: _stops,
              user: _user,
              heading: _heading,
              satellite: _satellite,
              fitPadding: EdgeInsets.fromLTRB(60, topInset + 90, 60, 250),
              onStopTap: (stop) => _showStopCard(stop.destinationId),
              navRoute: _navRoute,
              onUserGesture: () {
                if (_navActive && _following) setState(() => _following = false);
              },
            ),
          ),
          // Trên cùng: thẻ hướng dẫn rẽ khi đang dẫn đường, không thì nút quay lại + chuyển tab
          if (_navActive && _route != null)
            SafeArea(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
                child: NavigationBanner(
                  route: _route!,
                  progress: _progress,
                  destinationName: _navDestination?.name ?? '',
                  arrived: _arrived,
                  rerouting: _rerouting,
                ),
              ),
            )
          else
            SafeArea(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
                child: Row(
                  children: [
                    MapRoundButton(
                      icon: Icons.arrow_back_rounded,
                      tooltip: 'Quay lại',
                      onPressed: () => Navigator.of(context).maybePop(),
                    ),
                    const SizedBox(width: 10),
                    Expanded(child: _viewSwitch(onMap: true, floating: true)),
                  ],
                ),
              ),
            ),
          Positioned(
            right: 12,
            top: topInset + (_navActive ? 176 : 72),
            child: Column(
              children: [
                if (_navDestination == null && directionsTarget != null) ...[
                  MapRoundButton(
                    icon: Icons.directions_rounded,
                    tooltip: 'Chỉ đường tới ${directionsTarget.name}',
                    color: AppCultureColors.oceanBlue,
                    onPressed: () => _openDirections(directionsTarget),
                  ),
                  const SizedBox(height: 10),
                ],
                MapRoundButton(
                  icon: Icons.route_rounded,
                  tooltip: _route != null ? 'Xem toàn bộ đường đi' : 'Xem toàn tuyến',
                  onPressed: () {
                    if (_route != null) {
                      setState(() => _following = false);
                      _fitRoute(_route!);
                    } else {
                      _mapKey.currentState?.fitAll();
                    }
                  },
                ),
                const SizedBox(height: 10),
                MapRoundButton(
                  icon: _navActive && !_following ? Icons.navigation_rounded : Icons.my_location_rounded,
                  tooltip: _navActive ? 'Bám theo vị trí của tôi' : 'Vị trí của tôi',
                  color: AppCultureColors.oceanBlue,
                  onPressed: _user == null
                      ? _startLocation
                      : () {
                          if (_navActive) {
                            setState(() => _following = true);
                            _mapKey.currentState?.follow(_user!);
                          } else {
                            _mapKey.currentState?.focusUser();
                          }
                        },
                ),
                const SizedBox(height: 10),
                MapRoundButton(
                  icon: _satellite ? Icons.map_rounded : Icons.satellite_alt_rounded,
                  tooltip: _satellite ? 'Bản đồ đường phố' : 'Ảnh vệ tinh',
                  onPressed: () => setState(() => _satellite = !_satellite),
                ),
              ],
            ),
          ),
          if (_navDestination != null)
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              child: NavigationPanel(
                route: _route,
                progress: _navActive ? _progress : null,
                destinationName: _navDestination!.name,
                vehicle: _vehicle,
                loading: _routeLoading,
                active: _navActive,
                arrived: _navActive && _arrived,
                error: _routeError,
                onVehicleChanged: (v) {
                  setState(() => _vehicle = v);
                  _fetchRoute(fit: true);
                },
                onStart: _beginNavigation,
                onSteps: () => showRouteSteps(context, _route!, currentIndex: _progress?.nextStepIndex),
                onExternal: () {
                  final point = _coords[_navDestination!.destinationId];
                  if (point != null) openExternalNavigation(point, _vehicle);
                },
                onClose: _endNavigation,
                onCheckIn: () => _checkIn(_navDestination!),
                onRetry: () => _fetchRoute(fit: true),
              ),
            )
          else
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              child: SafeArea(
                top: false,
                child: Padding(
                  padding: const EdgeInsets.only(bottom: 16),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.88),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: MapAttributionText(satellite: _satellite),
                      ),
                      const SizedBox(height: 8),
                      SizedBox(
                        height: 158,
                        child: PageView.builder(
                          controller: _cards,
                          itemCount: dests.length,
                          onPageChanged: (i) => _focusDestination(dests[i].destinationId),
                          itemBuilder: (_, i) => Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 5),
                            child: Align(alignment: Alignment.bottomCenter, child: _stopMapCard(dests[i])),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  /// Thẻ một trạm ở tab Bản đồ; trạm đang mở có nút chỉ đường / check-in / làm nhiệm vụ.
  Widget _stopMapCard(JourneyDestination dest) {
    final skipped = dest.status == ProgressStatus.skipped;
    final point = _coords[dest.destinationId];
    final distance = (point != null && _user != null) ? distanceMeters(_user!, point) : null;
    final openTask = dest.tasks.where((t) => t.isOpen).firstOrNull;
    final openCount = dest.tasks.where((t) => t.isOpen).length;
    final state = dest.isCurrent
        ? (dest.checkedIn ? 'đang ở trạm' : 'đang mở')
        : dest.isDone
        ? (skipped ? 'đã bỏ qua' : 'đã xong')
        : 'chưa mở';
    final sub = dest.isCurrent
        ? (dest.checkedIn
              ? (openCount > 0 ? '$openCount thử thách còn lại' : 'Đã làm hết thử thách')
              : distance != null
              ? 'Cách ${formatDistance(distance)}'
              : 'Đến nơi để check-in')
        : dest.isDone
        ? (skipped ? 'Không nhận điểm tại trạm này' : '+${dest.tasks.fold(0, (s, t) => s + t.pointsEarned)} điểm')
        : '${dest.totalTasks} thử thách';
    final busy = _busyDestinationId == dest.destinationId;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: const [BoxShadow(color: Color(0x2E16181D), blurRadius: 24, offset: Offset(0, 8))],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              SizedBox(
                width: 64,
                height: 64,
                child: Photo(url: _imageOf(dest), width: 64, borderRadius: BorderRadius.circular(14)),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Trạm ${dest.orderIndex} · $state',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: dest.isCurrent ? AppInk.accent : AppInk.muted,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      dest.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppInk.ink),
                    ),
                    const SizedBox(height: 2),
                    Text(sub, style: const TextStyle(fontSize: 12, color: AppInk.muted)),
                  ],
                ),
              ),
            ],
          ),
          if (dest.isCurrent) ...[
            const SizedBox(height: 12),
            Row(
              children: [
                if (!dest.checkedIn && point != null) ...[
                  Expanded(
                    child: OutlinedButton(
                      onPressed: busy ? null : () => _openDirections(dest),
                      style: _outlineStyle().copyWith(minimumSize: const WidgetStatePropertyAll(Size(0, 44))),
                      child: const Text('Chỉ đường'),
                    ),
                  ),
                  const SizedBox(width: 8),
                ],
                Expanded(
                  child: FilledButton(
                    onPressed: busy
                        ? null
                        : !dest.checkedIn
                        ? () => _checkIn(dest)
                        : openTask != null
                        ? () => _openTask(dest, openTask)
                        : _leaveMap,
                    style: _filledStyle().copyWith(minimumSize: const WidgetStatePropertyAll(Size(0, 44))),
                    child: Text(
                      !dest.checkedIn
                          ? 'Check-in'
                          : openTask != null
                          ? 'Làm nhiệm vụ'
                          : 'Xem trạm',
                    ),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildError() {
    return SafeArea(
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.cloud_off_rounded, size: 48, color: AppCultureColors.textLight),
              const SizedBox(height: 12),
              Text(_error ?? 'Không tải được hành trình.', textAlign: TextAlign.center),
              const SizedBox(height: 16),
              OutlinedButton(onPressed: _load, child: const Text('Thử lại')),
              TextButton(onPressed: () => Navigator.pop(context), child: const Text('Quay lại')),
            ],
          ),
        ),
      ),
    );
  }
}
