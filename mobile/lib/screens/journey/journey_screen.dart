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
import '../culture/cultural_stories.dart';
import '../tours/tour_detail_sections.dart' show showStopPreview;
import 'journey_map.dart';
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
  final DraggableScrollableController _sheet = DraggableScrollableController();

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
    _sheet.dispose();
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
      await _load(silent: true);
      if (!mounted) return;
      final journey = _journey;
      if (journey != null && journey.isCompleted) {
        showRewardDialog(
          context,
          title: 'Hoàn thành hành trình!',
          subtitle: 'Bạn đã đi trọn "${journey.tourName}". Cảm ơn bạn đã gìn giữ và lan tỏa di sản.',
          points: 50,
          icon: Icons.emoji_events_rounded,
          buttonLabel: 'Xem tổng kết',
        );
      }
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
          if (model.latitude == 0 && model.longitude == 0) return null;
          return MapEntry(d.destinationId, LatLng(model.latitude, model.longitude));
        } catch (_) {
          return null;
        }
      }),
    );
    if (!mounted) return;
    setState(() {
      for (final entry in results.whereType<MapEntry<int, LatLng>>()) {
        _coords[entry.key] = entry.value;
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
          ),
    ];
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
    if (_sheet.isAttached && _sheet.size > 0.45) {
      _sheet.animateTo(0.34, duration: const Duration(milliseconds: 300), curve: Curves.easeOutCubic);
    }
  }

  Widget _buildMapLayout(TourJourney journey) {
    final topInset = MediaQuery.paddingOf(context).top;
    final screenHeight = MediaQuery.sizeOf(context).height;
    final current = _currentDestination;
    final directionsTarget = current != null && !current.checkedIn && _coords[current.destinationId] != null
        ? current
        : null;
    // Ép Stack phủ toàn màn hình: khi đang chỉ đường không còn bảng trượt (con không định vị lớn nhất),
    // Stack sẽ co về chiều cao thanh tiêu đề, bản đồ biến mất và bảng chỉ đường bị đẩy lên đỉnh màn hình.
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
              fitPadding: EdgeInsets.fromLTRB(60, topInset + 110, 60, screenHeight * 0.5 + 24),
              onStopTap: (stop) => _focusDestination(stop.destinationId),
              navRoute: _navRoute,
              onUserGesture: () {
                if (_navActive && _following) setState(() => _following = false);
              },
            ),
          ),
          // Thanh tiêu đề nổi (khi đang dẫn đường: thẻ hướng dẫn rẽ)
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
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(18),
                          boxShadow: const [BoxShadow(color: Colors.black26, blurRadius: 10, offset: Offset(0, 3))],
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              journey.isCompleted ? 'Đã hoàn thành' : 'Đang trải nghiệm',
                              style: TextStyle(
                                fontSize: 10.5,
                                letterSpacing: 0.2,
                                fontWeight: FontWeight.w700,
                                color: journey.isCompleted ? AppCultureColors.jadeDark : AppCultureColors.oceanBlue,
                              ),
                            ),
                            Text(
                              journey.tourName,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontSize: 15.5,
                                fontWeight: FontWeight.w700,
                                color: AppCultureColors.textDark,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          // Nút điều khiển bản đồ
          Positioned(
            right: 12,
            top: topInset + (_navActive ? 176 : 84),
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
            // Bảng hành trình kéo lên / xuống
            DraggableScrollableSheet(
              controller: _sheet,
              initialChildSize: 0.5,
              minChildSize: 0.22,
              maxChildSize: 0.92,
              snap: true,
              snapSizes: const [0.22, 0.5, 0.92],
              builder: (context, scrollController) => Container(
                decoration: const BoxDecoration(
                  color: AppCultureColors.background,
                  borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
                  boxShadow: [BoxShadow(color: Colors.black26, blurRadius: 16, offset: Offset(0, -2))],
                ),
                child: RefreshIndicator(
                  color: AppCultureColors.heritageJade,
                  onRefresh: () => _load(silent: true),
                  child: CustomScrollView(
                    controller: scrollController,
                    slivers: [
                      SliverToBoxAdapter(child: _sheetHeader(journey)),
                      SliverPadding(
                        padding: const EdgeInsets.fromLTRB(16, 4, 16, 16),
                        sliver: SliverList.list(
                          children: [
                            for (var i = 0; i < journey.destinations.length; i++)
                              _buildDestination(journey.destinations[i], isLast: i == journey.destinations.length - 1),
                          ],
                        ),
                      ),
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                          child: MapAttributionText(satellite: _satellite),
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

  Widget _sheetHeader(TourJourney journey) {
    final current = _currentDestination;
    final currentPoint = current == null ? null : _coords[current.destinationId];
    final distance = (currentPoint != null && _user != null) ? distanceMeters(_user!, currentPoint) : null;

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(color: AppCultureColors.border, borderRadius: BorderRadius.circular(2)),
            ),
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      journey.isCompleted
                          ? 'Bạn đã đi trọn hành trình'
                          : current != null
                          ? 'Điểm ${current.orderIndex}: ${current.name}'
                          : 'Hành trình của bạn',
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 17,
                        height: 1.25,
                        fontWeight: FontWeight.w700,
                        color: AppCultureColors.textDark,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      journey.isCompleted
                          ? '+50 điểm thưởng hoàn thành'
                          : current == null
                          ? ''
                          : current.checkedIn
                          ? 'Đã check-in · ${current.tasksCompleted}/${current.totalTasks} nhiệm vụ'
                          : distance != null
                          ? 'Cách bạn ${formatDistance(distance)} · check-in trong bán kính 100 m'
                          : 'Đến nơi và check-in để mở nhiệm vụ',
                      style: const TextStyle(fontSize: 12.5, color: AppCultureColors.textMuted),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              SizedBox(
                width: 54,
                height: 54,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    SizedBox.expand(
                      child: CircularProgressIndicator(
                        value: journey.progress,
                        strokeWidth: 5,
                        strokeCap: StrokeCap.round,
                        backgroundColor: AppCultureColors.surfaceSubtle,
                        color: AppCultureColors.heritageJade,
                      ),
                    ),
                    Text(
                      '${(journey.progress * 100).round()}%',
                      style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 6,
            children: [
              InfoChip(icon: Icons.place_rounded, text: '${journey.doneCount}/${journey.totalDestinations} điểm đến'),
              InfoChip(
                icon: Icons.stars_rounded,
                text: '${journey.pointsEarned} điểm',
                background: AppCultureColors.rewardBg,
                foreground: AppCultureColors.rewardText,
              ),
            ],
          ),
          if (_error != null) ...[
            const SizedBox(height: 10),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(color: const Color(0xFFFEE2E2), borderRadius: BorderRadius.circular(12)),
              child: Text(_error!, style: const TextStyle(color: AppCultureColors.error, fontSize: 12.5)),
            ),
          ],
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppCultureColors.background,
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppCultureColors.heritageJade))
          : _journey == null
          ? _buildError()
          : (_coordsLoaded && _coords.isNotEmpty)
          ? _buildMapLayout(_journey!)
          : RefreshIndicator(
              color: AppCultureColors.heritageJade,
              edgeOffset: 120,
              onRefresh: () => _load(silent: true),
              child: CustomScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                slivers: [
                  _buildHeader(_journey!),
                  if (_error != null)
                    SliverToBoxAdapter(
                      child: Container(
                        margin: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFEE2E2),
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: Text(_error!, style: const TextStyle(color: AppCultureColors.error, fontSize: 12.5)),
                      ),
                    ),
                  SliverPadding(
                    padding: const EdgeInsets.fromLTRB(16, 20, 16, 32),
                    sliver: SliverList.list(
                      children: [
                        const Text(
                          'Hành trình của bạn',
                          style: TextStyle(
                            fontSize: 12,
                            letterSpacing: 0.2,
                            fontWeight: FontWeight.w700,
                            color: AppCultureColors.textMuted,
                          ),
                        ),
                        const SizedBox(height: 12),
                        for (var i = 0; i < _journey!.destinations.length; i++)
                          _buildDestination(_journey!.destinations[i], isLast: i == _journey!.destinations.length - 1),
                      ],
                    ),
                  ),
                ],
              ),
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

  SliverAppBar _buildHeader(TourJourney journey) {
    return SliverAppBar(
      pinned: true,
      expandedHeight: 232,
      backgroundColor: AppCultureColors.jadeDark,
      foregroundColor: Colors.white,
      title: const Text('Hành trình', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 17)),
      flexibleSpace: FlexibleSpaceBar(
        collapseMode: CollapseMode.pin,
        background: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [AppCultureColors.jadeGradientStart, AppCultureColors.jadeGradientEnd],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
          child: Stack(
            children: [
              Positioned(
                right: -28,
                top: 40,
                child: Icon(Icons.temple_buddhist_rounded, size: 190, color: Colors.white.withValues(alpha: 0.09)),
              ),
              SafeArea(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 64, 20, 18),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Expanded(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.end,
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              journey.isCompleted ? 'Đã hoàn thành' : 'Đang trải nghiệm',
                              style: const TextStyle(
                                color: Colors.white70,
                                fontSize: 11,
                                letterSpacing: 0.2,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              journey.tourName,
                              maxLines: 3,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 22,
                                height: 1.2,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            const SizedBox(height: 12),
                            Wrap(
                              spacing: 8,
                              runSpacing: 6,
                              children: [
                                InfoChip.onGradient(
                                  icon: Icons.place_rounded,
                                  text: '${journey.doneCount}/${journey.totalDestinations} điểm đến',
                                ),
                                InfoChip.onGradient(icon: Icons.stars_rounded, text: '${journey.pointsEarned} điểm'),
                              ],
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 12),
                      ProgressRing(
                        value: journey.progress,
                        label: '${(journey.progress * 100).round()}%',
                        caption: 'hoàn thành',
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDestination(JourneyDestination dest, {required bool isLast}) {
    final busy = _busyDestinationId == dest.destinationId;
    final Color accent = dest.isDone
        ? AppCultureColors.heritageJade
        : dest.isCurrent
        ? AppCultureColors.oceanBlue
        : AppCultureColors.textLight;

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SizedBox(
            width: 40,
            child: Column(
              children: [
                Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: dest.isDone || dest.isCurrent ? accent : Colors.white,
                    shape: BoxShape.circle,
                    border: Border.all(color: accent, width: 2),
                  ),
                  child: Center(
                    child: dest.isDone
                        ? Icon(
                            dest.status == ProgressStatus.skipped ? Icons.skip_next_rounded : Icons.check_rounded,
                            size: 18,
                            color: Colors.white,
                          )
                        : Text(
                            '${dest.orderIndex}',
                            style: TextStyle(
                              fontWeight: FontWeight.w700,
                              fontSize: 13,
                              color: dest.isCurrent ? Colors.white : accent,
                            ),
                          ),
                  ),
                ),
                if (!isLast)
                  Expanded(
                    child: Container(
                      width: 2,
                      margin: const EdgeInsets.symmetric(vertical: 4),
                      color: dest.isDone
                          ? AppCultureColors.heritageJade.withValues(alpha: 0.5)
                          : AppCultureColors.border,
                    ),
                  ),
              ],
            ),
          ),
          Expanded(
            child: Padding(
              padding: EdgeInsets.only(bottom: isLast ? 0 : 14),
              child: SoftCard(
                elevated: dest.isCurrent,
                borderColor: dest.isCurrent ? AppCultureColors.heritageJade : AppCultureColors.border,
                color: dest.isLocked ? AppCultureColors.surfaceSubtle : Colors.white,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Text(
                            dest.name,
                            style: TextStyle(
                              fontSize: 16,
                              height: 1.25,
                              fontWeight: FontWeight.w700,
                              color: dest.isLocked ? AppCultureColors.textMuted : AppCultureColors.textDark,
                            ),
                          ),
                        ),
                        if (_coords[dest.destinationId] != null && _coords.isNotEmpty)
                          InkWell(
                            borderRadius: BorderRadius.circular(20),
                            onTap: () => _focusDestination(dest.destinationId),
                            child: const Padding(
                              padding: EdgeInsets.only(left: 8, right: 2),
                              child: Icon(Icons.map_outlined, size: 20, color: AppCultureColors.oceanBlue),
                            ),
                          ),
                        if (dest.badgeAwarded)
                          const Padding(
                            padding: EdgeInsets.only(left: 8),
                            child: Icon(Icons.workspace_premium_rounded, color: AppCultureColors.gold, size: 24),
                          ),
                        if (dest.isLocked)
                          const Padding(
                            padding: EdgeInsets.only(left: 8),
                            child: Icon(Icons.lock_rounded, color: AppCultureColors.textLight, size: 20),
                          ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    _buildDestinationBody(dest, busy),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDestinationBody(JourneyDestination dest, bool busy) {
    if (dest.isLocked) {
      return const Text(
        'Hoàn thành điểm đến trước để mở khóa.',
        style: TextStyle(fontSize: 12.5, color: AppCultureColors.textMuted),
      );
    }

    if (dest.status == ProgressStatus.skipped) {
      return const Text(
        'Bạn đã bỏ qua điểm đến này.',
        style: TextStyle(fontSize: 12.5, color: AppCultureColors.textMuted),
      );
    }

    final stop = _stopOf(dest);

    if (!dest.checkedIn) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (stop?.shortDescription != null) ...[
            Text(
              stop!.shortDescription!,
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 13, height: 1.45, color: AppCultureColors.textDark),
            ),
            const SizedBox(height: 6),
          ],
          Text(
            _isWizard
                ? 'Đến điểm dừng này (trong bán kính 300 m) và check-in bằng GPS để mở câu chuyện văn hóa và thử thách.'
                : 'Hãy đến địa điểm này và check-in bằng GPS để mở khóa nhiệm vụ và nhận huy hiệu di sản.',
            style: const TextStyle(fontSize: 12.5, height: 1.45, color: AppCultureColors.textMuted),
          ),
          const SizedBox(height: 14),
          if (dest.isCurrent && _coords[dest.destinationId] != null) ...[
            FilledButton.icon(
              onPressed: busy ? null : () => _openDirections(dest),
              icon: const Icon(Icons.directions_rounded),
              label: const Text('Chỉ đường tới đây', style: TextStyle(fontWeight: FontWeight.w700)),
              style: FilledButton.styleFrom(
                minimumSize: const Size.fromHeight(52),
                backgroundColor: AppCultureColors.oceanBlue,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
            ),
            const SizedBox(height: 10),
          ],
          PrimaryButton(
            label: 'Check-in bằng GPS',
            icon: Icons.my_location_rounded,
            loading: busy,
            onPressed: () => _checkIn(dest),
          ),
          // Điểm dừng của tour 5 bước không có QR check-in (QR nằm ở từng hoạt động).
          if (!_isWizard) ...[
            const SizedBox(height: 10),
            OutlinedButton.icon(
              onPressed: busy ? null : () => _checkInQr(dest),
              icon: const Icon(Icons.qr_code_scanner_rounded),
              label: const Text('Quét mã QR', style: TextStyle(fontWeight: FontWeight.w700)),
              style: OutlinedButton.styleFrom(
                minimumSize: const Size.fromHeight(52),
                foregroundColor: AppCultureColors.jadeDark,
                side: const BorderSide(color: AppCultureColors.heritageJade),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
            ),
          ],
          Align(
            alignment: Alignment.center,
            child: TextButton(
              onPressed: busy ? null : () => _skip(dest),
              child: const Text('Bỏ qua điểm này', style: TextStyle(color: AppCultureColors.textMuted, fontSize: 12.5)),
            ),
          ),
          if (!_isWizard) CulturalStoriesSection(destinationId: dest.destinationId, hideWhenEmpty: true),
        ],
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            InfoChip(
              icon: Icons.verified_rounded,
              text: 'Đã check-in',
              background: AppCultureColors.jadeLight,
              foreground: AppCultureColors.jadeDark,
            ),
            const SizedBox(width: 8),
            InfoChip(icon: Icons.task_alt_rounded, text: '${dest.tasksCompleted}/${dest.totalTasks} nhiệm vụ'),
          ],
        ),
        const SizedBox(height: 14),
        if (stop != null) ...[
          if (stop.hasCulture || stop.shortDescription != null) ...[
            _sectionLabel('Câu chuyện văn hóa'),
            const SizedBox(height: 8),
            _buildStopCulture(stop),
          ],
        ] else ...[
          _sectionLabel('Câu chuyện văn hóa'),
          const SizedBox(height: 8),
          CulturalStoriesSection(destinationId: dest.destinationId, unlocked: true, showTeaser: true),
        ],
        if (dest.tasks.isNotEmpty) ...[const SizedBox(height: 6), _sectionLabel('Nhiệm vụ'), const SizedBox(height: 8)],
        for (final task in dest.tasks) _buildTask(dest, task),
      ],
    );
  }

  /// Nội dung văn hoá của điểm dừng (tour 5 bước), mở sau khi check-in. Bấm để xem đủ ảnh, video, hiện vật.
  Widget _buildStopCulture(TourStopModel stop) {
    final text = stop.culturalContent ?? stop.shortDescription;
    return InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: () => showStopPreview(context, stop),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppCultureColors.rewardBg.withValues(alpha: 0.6),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppCultureColors.rewardBorder),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (stop.imageUrl != null) ...[
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Image.network(stop.imageUrl!, width: 64, height: 64, fit: BoxFit.cover,
                    errorBuilder: (_, _, _) => const SizedBox(width: 64, height: 64)),
              ),
              const SizedBox(width: 10),
            ],
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (text != null)
                    Text(
                      text,
                      maxLines: 4,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 13, height: 1.45, color: AppCultureColors.textDark),
                    ),
                  const SizedBox(height: 4),
                  Text(
                    [
                      'Đọc tiếp',
                      if (stop.artifacts.isNotEmpty) '${stop.artifacts.length} hiện vật',
                      if (stop.videoUrl != null) 'video',
                    ].join(' · '),
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppCultureColors.amberDark),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _sectionLabel(String text) => Text(
    text,
    style: const TextStyle(
      fontSize: 13,
      letterSpacing: 0.2,
      fontWeight: FontWeight.w700,
      color: AppCultureColors.textMuted,
    ),
  );

  Widget _buildTask(JourneyDestination dest, JourneyTask task) {
    final done = task.isCompleted;
    final failed = task.isFailed;
    final icon = switch (task.type.toUpperCase()) {
      final t when t.contains('REAL_WORLD') => Icons.directions_walk_rounded,
      final t when t.contains('PUZZLE') || t.contains('GPS') => Icons.explore_rounded,
      final t when t.contains('QUIZ') => Icons.quiz_rounded,
      _ => Icons.flag_rounded,
    };
    final Color tone = done
        ? AppCultureColors.heritageJade
        : failed
        ? AppCultureColors.error
        : AppCultureColors.oceanBlue;

    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () => _openTask(dest, task),
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(color: tone.withValues(alpha: 0.07), borderRadius: BorderRadius.circular(16)),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(color: tone.withValues(alpha: 0.14), shape: BoxShape.circle),
                child: Icon(done ? Icons.check_rounded : icon, color: tone, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      task.name,
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 14,
                        color: AppCultureColors.textDark,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      done
                          ? 'Hoàn thành · +${task.pointsEarned} điểm'
                          : failed
                          ? 'Đã hết lượt làm'
                          : task.attempts > 0
                          ? 'Đã làm ${task.attempts} lượt · làm lại'
                          : 'Chạm để bắt đầu',
                      style: TextStyle(fontSize: 12, color: tone, fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
              ),
              Icon(Icons.chevron_right_rounded, color: tone),
            ],
          ),
        ),
      ),
    );
  }
}
