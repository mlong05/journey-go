import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart' show Position;
import 'package:latlong2/latlong.dart';
import '../../core/constants/app_colors.dart';
import '../../core/services/location_service.dart';
import '../../l10n/locale_controller.dart';
import '../common/ink.dart';
import 'station_map.dart';

/// Lựa chọn của du khách trên bảng xác nhận check-in.
enum CheckInChoiceKind { confirm, directions, qr }

class CheckInChoice {
  final CheckInChoiceKind kind;

  /// Vị trí GPS vừa đo — chỉ có khi [kind] là [CheckInChoiceKind.confirm].
  final Position? position;

  const CheckInChoice(this.kind, [this.position]);
}

/// Bảng trượt từ dưới lên: đo GPS thật, vẽ vị trí du khách cùng vùng check-in của trạm trên bản đồ.
///
/// - Trong vùng: bật nút "Xác nhận check-in" (trả về vị trí vừa đo để gửi lên máy chủ).
/// - Chưa tới: không cho check-in, cho "Chỉ đường" tới trạm.
/// - Không dùng được GPS (tắt / không cấp quyền / không đo được): hướng dẫn quét mã QR tại trạm.
/// Luôn có nút "Quét QR" phòng khi GPS sai số lớn.
///
/// [radiusMeters] là bán kính vùng check-in vẽ trên bản đồ; [arrivalMeters] là ngưỡng "đã tới" dùng để
/// cho phép xác nhận (chừa sai số GPS).
Future<CheckInChoice?> showCheckInSheet(
  BuildContext context, {
  required String stopName,
  required LatLng station,
  required int radiusMeters,
  required int arrivalMeters,
}) {
  return showModalBottomSheet<CheckInChoice>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    backgroundColor: AppInk.surface,
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
    builder: (_) => _CheckInSheet(
      stopName: stopName,
      station: station,
      radiusMeters: radiusMeters,
      arrivalMeters: arrivalMeters,
    ),
  );
}

class _CheckInSheet extends StatefulWidget {
  final String stopName;
  final LatLng station;
  final int radiusMeters;
  final int arrivalMeters;

  const _CheckInSheet({
    required this.stopName,
    required this.station,
    required this.radiusMeters,
    required this.arrivalMeters,
  });

  @override
  State<_CheckInSheet> createState() => _CheckInSheetState();
}

class _CheckInSheetState extends State<_CheckInSheet> {
  final GlobalKey<StationMapState> _mapKey = GlobalKey<StationMapState>();
  bool _locating = true;
  Position? _position;
  LocationException? _error;

  @override
  void initState() {
    super.initState();
    _locate();
  }

  /// Luôn đo vị trí MỚI (không dùng vị trí cũ trong bộ nhớ) rồi mới cho xác nhận.
  Future<void> _locate() async {
    setState(() {
      _locating = true;
      _error = null;
    });
    Position? position;
    LocationException? error;
    try {
      position = await LocationService.currentPosition();
    } on LocationException catch (e) {
      error = e;
    } catch (_) {
      error = LocationException(appL10n.locUnknown);
    }
    if (!mounted) return;
    setState(() {
      _locating = false;
      _position = position;
      _error = error;
    });
    WidgetsBinding.instance.addPostFrameCallback((_) => _mapKey.currentState?.fitAll());
  }

  int? get _distance {
    final p = _position;
    if (p == null) return null;
    return LocationService.distanceMeters(p.latitude, p.longitude, widget.station.latitude, widget.station.longitude)
        .round();
  }

  bool get _inside {
    final d = _distance;
    return d != null && d <= widget.arrivalMeters;
  }

  @override
  Widget build(BuildContext context) {
    final p = _position;
    final user = p == null ? null : LatLng(p.latitude, p.longitude);
    final distance = _distance;
    final inside = _inside;
    final mapHeight = MediaQuery.of(context).size.height * 0.4;

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(color: AppInk.line, borderRadius: BorderRadius.circular(2)),
            ),
          ),
          const SizedBox(height: 12),
          Text(
            appL10n.ciTitle,
            style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: AppInk.ink),
          ),
          const SizedBox(height: 2),
          Text(widget.stopName, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 13.5, color: AppInk.muted)),
          const SizedBox(height: 12),
          SizedBox(
            height: mapHeight,
            child: ClipRRect(
              borderRadius: BorderRadius.circular(18),
              child: Stack(
                children: [
                  Positioned.fill(
                    child: StationMap(
                      key: _mapKey,
                      station: widget.station,
                      stationName: widget.stopName,
                      radiusMeters: widget.radiusMeters,
                      user: user,
                      heading: null,
                      satellite: false,
                      inside: inside,
                      fitPadding: const EdgeInsets.all(44),
                    ),
                  ),
                  if (_locating)
                    Positioned.fill(
                      child: ColoredBox(
                        color: Colors.white.withValues(alpha: 0.55),
                        child: const Center(child: CircularProgressIndicator(strokeWidth: 3)),
                      ),
                    ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          _status(distance, inside, p),
          const SizedBox(height: 14),
          _actions(inside),
        ],
      ),
    );
  }

  Widget _status(int? distance, bool inside, Position? p) {
    if (_locating) {
      return Text(appL10n.ciLocating, style: const TextStyle(fontSize: 14, color: AppInk.muted, fontWeight: FontWeight.w600));
    }
    if (_error != null) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(Icons.location_off_rounded, size: 20, color: AppCultureColors.warning),
              const SizedBox(width: 8),
              Expanded(
                child: Text(_error!.message, style: const TextStyle(fontSize: 14, color: AppInk.ink, fontWeight: FontWeight.w600)),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(appL10n.ciQrFallback, style: const TextStyle(fontSize: 13, color: AppInk.muted, height: 1.4)),
        ],
      );
    }
    if (distance == null) return const SizedBox.shrink();
    final color = inside ? AppCultureColors.heritageJade : AppCultureColors.warning;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(inside ? Icons.check_circle_rounded : Icons.near_me_outlined, size: 20, color: color),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                inside
                    ? appL10n.ciInside(distance.toString())
                    : appL10n.ciOutside(formatDistance(distance), widget.arrivalMeters.toString()),
                style: const TextStyle(fontSize: 14, color: AppInk.ink, fontWeight: FontWeight.w700, height: 1.35),
              ),
            ),
          ],
        ),
        if (p != null && p.accuracy > 0) ...[
          const SizedBox(height: 4),
          Text(appL10n.ciAccuracy(p.accuracy.round().toString()), style: const TextStyle(fontSize: 12, color: AppInk.muted)),
        ],
      ],
    );
  }

  Widget _actions(bool inside) {
    final ButtonStyle filled = FilledButton.styleFrom(
      backgroundColor: AppInk.accent,
      foregroundColor: Colors.white,
      minimumSize: const Size(0, 48),
      shape: const StadiumBorder(),
      textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14.5),
    );
    final ButtonStyle outline = OutlinedButton.styleFrom(
      foregroundColor: AppInk.ink,
      side: const BorderSide(color: AppInk.ink),
      minimumSize: const Size(0, 48),
      shape: const StadiumBorder(),
      textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14.5),
    );

    final Widget primary;
    if (_locating) {
      primary = FilledButton(onPressed: null, style: filled, child: Text(appL10n.ciConfirm));
    } else if (_error != null) {
      primary = (_error!.needsSettings)
          ? FilledButton(
              onPressed: LocationService.openSettings,
              style: filled,
              child: Text(appL10n.ciOpenSettings),
            )
          : FilledButton(onPressed: _locate, style: filled, child: Text(appL10n.ciRefresh));
    } else if (inside) {
      primary = FilledButton.icon(
        onPressed: () => Navigator.pop(context, CheckInChoice(CheckInChoiceKind.confirm, _position)),
        style: filled,
        icon: const Icon(Icons.where_to_vote_rounded, size: 20),
        label: Text(appL10n.ciConfirm),
      );
    } else {
      primary = FilledButton.icon(
        onPressed: () => Navigator.pop(context, const CheckInChoice(CheckInChoiceKind.directions)),
        style: filled,
        icon: const Icon(Icons.directions_walk_rounded, size: 20),
        label: Text(appL10n.jsDirections),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        primary,
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(
              child: OutlinedButton.icon(
                onPressed: () => Navigator.pop(context, const CheckInChoice(CheckInChoiceKind.qr)),
                style: outline,
                icon: const Icon(Icons.qr_code_scanner_rounded, size: 18),
                label: Text(appL10n.jsScanQrShort),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: OutlinedButton.icon(
                onPressed: _locating ? null : _locate,
                style: outline,
                icon: const Icon(Icons.my_location_rounded, size: 18),
                label: Text(appL10n.ciRefresh),
              ),
            ),
          ],
        ),
      ],
    );
  }
}
