import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';
import '../../core/models/departure_model.dart';
import '../../core/models/tour_model.dart';
import '../../core/services/api_client.dart';
import '../../core/services/tour_service.dart';
import '../common/ink.dart';
import '../common/photo.dart';
import '../rewards/rewards_widgets.dart' show RewardsMessageView;
import 'tour_list_screen.dart' show openTourDetail;
import 'tour_style.dart' show TourPlaceholder, TourStyle;

/// Mở màn "Xem tour theo ngày".
Future<void> openTourCalendar(BuildContext context) =>
    Navigator.of(context).push(MaterialPageRoute(builder: (_) => const TourCalendarScreen()));

/// Lịch khởi hành: chọn một ngày trên lịch tháng → thấy các tour khởi hành ngày đó (kèm số chỗ còn).
///
/// - Dữ liệu: một lần gọi `GET /tours/departures` cho ~3 tháng tới.
/// - Ô ngày có tour: chấm màu + số tour; ngày không có tour mờ đi, không bấm được.
/// - Mọi nhãn (tháng, thứ, ngày, số chỗ) nằm trên 1 dòng.
class TourCalendarScreen extends StatefulWidget {
  /// Cho phép test truyền dữ liệu sẵn thay vì gọi API.
  final Future<List<DepartureDay>> Function()? loader;

  const TourCalendarScreen({super.key, this.loader});

  @override
  State<TourCalendarScreen> createState() => _TourCalendarScreenState();
}

class _TourCalendarScreenState extends State<TourCalendarScreen> {
  static const _rangeDays = 92;
  static const _weekdays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  late final DateTime _today = DateUtils.dateOnly(DateTime.now());
  late DateTime _month = DateTime(_today.year, _today.month);
  DateTime? _selected;
  Map<DateTime, DepartureDay> _days = {};
  bool _loading = true;
  String? _error;

  DateTime get _lastDay => _today.add(const Duration(days: _rangeDays));

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final days = await (widget.loader?.call() ??
          TourService().getDepartures(from: _today, to: _lastDay));
      if (!mounted) return;
      final map = {for (final d in days) DateUtils.dateOnly(d.date): d};
      // Chọn sẵn ngày gần nhất có tour và nhảy tới tháng của ngày đó
      final first = map.keys.toList()..sort();
      setState(() {
        _days = map;
        _loading = false;
        if (_selected == null || !map.containsKey(_selected)) {
          _selected = first.isEmpty ? null : first.first;
          if (_selected != null) _month = DateTime(_selected!.year, _selected!.month);
        }
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = e is ApiException ? e.message : 'Không tải được lịch khởi hành.';
      });
    }
  }

  bool get _canPrev => DateTime(_month.year, _month.month).isAfter(DateTime(_today.year, _today.month));
  bool get _canNext => DateTime(_month.year, _month.month + 1).isBefore(DateTime(_lastDay.year, _lastDay.month + 1));

  void _shiftMonth(int delta) => setState(() => _month = DateTime(_month.year, _month.month + delta));

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppInk.paper,
      appBar: AppBar(title: const Text('Xem tour theo ngày')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? RewardsMessageView(
                  icon: Icons.cloud_off_rounded,
                  title: 'Không tải được lịch',
                  message: _error,
                  onRetry: _load,
                )
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(16, 4, 16, 32),
                    children: [
                      _calendarCard(),
                      const SizedBox(height: 18),
                      ..._dayTours(),
                    ],
                  ),
                ),
    );
  }

  // ── Lịch tháng ──────────────────────────────────────────────────────────────

  Widget _calendarCard() {
    final daysInMonth = DateUtils.getDaysInMonth(_month.year, _month.month);
    final leading = DateTime(_month.year, _month.month).weekday - 1; // T2 = 0
    final cells = leading + daysInMonth;
    final rows = (cells / 7).ceil();
    final toursThisMonth = _days.entries
        .where((e) => e.key.year == _month.year && e.key.month == _month.month)
        .fold(0, (sum, e) => sum + e.value.tours.length);

    return Container(
      padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
      decoration: BoxDecoration(
        color: AppInk.surface,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: AppInk.line),
        boxShadow: [BoxShadow(color: AppInk.ink.withValues(alpha: 0.04), blurRadius: 14, offset: const Offset(0, 6))],
      ),
      child: Column(
        children: [
          Row(
            children: [
              _navButton(Icons.chevron_left_rounded, 'Tháng trước', _canPrev ? () => _shiftMonth(-1) : null),
              Expanded(
                child: Column(
                  children: [
                    FittedBox(
                      fit: BoxFit.scaleDown,
                      child: Text(
                        'Tháng ${_month.month}, ${_month.year}',
                        maxLines: 1,
                        softWrap: false,
                        style: AppType.display(size: 17),
                      ),
                    ),
                    FittedBox(
                      fit: BoxFit.scaleDown,
                      child: Text(
                        toursThisMonth == 0 ? 'Chưa có lịch khởi hành' : '$toursThisMonth lượt khởi hành',
                        maxLines: 1,
                        softWrap: false,
                        style: const TextStyle(fontSize: 12.5, color: AppInk.muted),
                      ),
                    ),
                  ],
                ),
              ),
              _navButton(Icons.chevron_right_rounded, 'Tháng sau', _canNext ? () => _shiftMonth(1) : null),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              for (final w in _weekdays)
                Expanded(
                  child: Center(
                    child: Text(
                      w,
                      maxLines: 1,
                      softWrap: false,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: w == 'CN' ? AppCultureColors.coralDark : AppInk.muted,
                      ),
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 4),
          for (var r = 0; r < rows; r++)
            Row(
              children: [
                for (var c = 0; c < 7; c++)
                  Expanded(child: _dayCell(r * 7 + c - leading + 1, daysInMonth)),
              ],
            ),
          const SizedBox(height: 6),
          _legend(),
        ],
      ),
    );
  }

  Widget _navButton(IconData icon, String tooltip, VoidCallback? onTap) => IconButton(
        onPressed: onTap,
        tooltip: tooltip,
        icon: Icon(icon),
        color: AppInk.ink,
        disabledColor: AppInk.border,
      );

  Widget _dayCell(int day, int daysInMonth) {
    if (day < 1 || day > daysInMonth) return const SizedBox(height: 50);
    final date = DateTime(_month.year, _month.month, day);
    final info = _days[date];
    final hasTours = info != null && info.tours.isNotEmpty;
    final soldOut = hasTours && info.availableCount == 0;
    final selected = _selected == date;
    final isToday = date == _today;
    final past = date.isBefore(_today);

    final Color numberColor = selected
        ? Colors.white
        : !hasTours || past
            ? AppInk.faint
            : AppInk.ink;

    return Semantics(
      button: hasTours,
      selected: selected,
      label: '$day tháng ${_month.month}${hasTours ? ', ${info.tours.length} tour' : ', không có tour'}',
      child: GestureDetector(
        onTap: hasTours ? () => setState(() => _selected = date) : null,
        behavior: HitTestBehavior.opaque,
        child: Padding(
          padding: const EdgeInsets.all(2),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 180),
            height: 46,
            decoration: BoxDecoration(
              color: selected
                  ? AppInk.accent
                  : hasTours
                      ? (soldOut ? AppInk.soft : AppTone.jade.tint)
                      : Colors.transparent,
              borderRadius: BorderRadius.circular(12),
              border: isToday && !selected ? Border.all(color: AppInk.accent, width: 1.4) : null,
            ),
            // Ô cao cố định cho lưới đều; chữ hệ thống lớn thì nội dung thu nhỏ vừa ô (không tràn)
            padding: const EdgeInsets.symmetric(vertical: 3),
            child: FittedBox(
              fit: BoxFit.scaleDown,
              child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  '$day',
                  maxLines: 1,
                  softWrap: false,
                  style: TextStyle(
                    fontSize: 14.5,
                    fontWeight: hasTours ? FontWeight.w800 : FontWeight.w500,
                    color: numberColor,
                  ),
                ),
                if (hasTours) ...[
                  const SizedBox(height: 2),
                  FittedBox(
                    fit: BoxFit.scaleDown,
                    child: Text(
                      '${info.tours.length} tour',
                      maxLines: 1,
                      softWrap: false,
                      style: TextStyle(
                        fontSize: 10.5,
                        fontWeight: FontWeight.w700,
                        color: selected
                            ? Colors.white
                            : soldOut
                                ? AppInk.muted
                                : AppCultureColors.jadeDark,
                      ),
                    ),
                  ),
                ],
              ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _legend() {
    Widget item(Color fill, String label, {Color? border}) => Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 12,
              height: 12,
              decoration: BoxDecoration(
                color: fill,
                borderRadius: BorderRadius.circular(4),
                border: border == null ? null : Border.all(color: border, width: 1.4),
              ),
            ),
            const SizedBox(width: 5),
            Text(label, maxLines: 1, softWrap: false, style: const TextStyle(fontSize: 12, color: AppInk.muted)),
          ],
        );
    return FittedBox(
      fit: BoxFit.scaleDown,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          item(AppTone.jade.tint, 'Còn chỗ'),
          const SizedBox(width: 14),
          item(AppInk.soft, 'Hết chỗ'),
          const SizedBox(width: 14),
          item(Colors.transparent, 'Hôm nay', border: AppInk.accent),
        ],
      ),
    );
  }

  // ── Danh sách tour của ngày đang chọn ──────────────────────────────────────

  static const _weekdayNames = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'];

  List<Widget> _dayTours() {
    final selected = _selected;
    if (_days.isEmpty || selected == null) {
      return const [
        Padding(
          padding: EdgeInsets.only(top: 12),
          child: RewardsMessageView(
            icon: Icons.event_busy_rounded,
            title: 'Chưa có lịch khởi hành',
            message: 'Các tour sẽ hiện ở đây khi đối tác mở ngày khởi hành.',
          ),
        ),
      ];
    }
    final info = _days[selected];
    final tours = info?.tours ?? const <TourDeparture>[];
    final dd = selected.day.toString().padLeft(2, '0');
    final mm = selected.month.toString().padLeft(2, '0');
    return [
      Row(
        children: [
          Expanded(
            child: FittedBox(
              fit: BoxFit.scaleDown,
              alignment: Alignment.centerLeft,
              child: Text(
                '${_weekdayNames[selected.weekday - 1]}, $dd/$mm',
                maxLines: 1,
                softWrap: false,
                style: AppType.display(size: 19),
              ),
            ),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(color: AppTone.jade.tint, borderRadius: BorderRadius.circular(999)),
            child: Text(
              '${tours.length} tour',
              maxLines: 1,
              softWrap: false,
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: AppCultureColors.jadeDark),
            ),
          ),
        ],
      ),
      const SizedBox(height: 10),
      for (var i = 0; i < tours.length; i++) ...[
        if (i > 0) const SizedBox(height: 10),
        _DepartureRow(departure: tours[i], onTap: () => openTourDetail(context, tours[i].tour)),
      ],
    ];
  }
}

/// Thẻ tour của một ngày: ảnh, vùng · thời lượng, tên (tối đa 2 dòng), giá + số chỗ còn (1 dòng).
class _DepartureRow extends StatelessWidget {
  final TourDeparture departure;
  final VoidCallback onTap;

  const _DepartureRow({required this.departure, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final TourModel tour = departure.tour;
    final meta = [if (tour.regionName != null) tour.regionName!, tour.formattedDuration]
        .where((s) => s.trim().isNotEmpty)
        .join(' · ');
    final soldOut = !departure.available;
    final seatTone = soldOut ? null : (departure.remaining <= 5 ? AppTone.coral : AppTone.jade);

    return Opacity(
      opacity: soldOut ? 0.7 : 1,
      child: Material(
        color: AppInk.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(18),
          side: const BorderSide(color: AppInk.line),
        ),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(18),
          child: Padding(
            padding: const EdgeInsets.all(10),
            child: IntrinsicHeight(
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SizedBox(
                    width: 84,
                    height: 84,
                    child: Photo(
                      url: tour.coverImageUrl,
                      width: 84,
                      borderRadius: BorderRadius.circular(14),
                      placeholder: TourPlaceholder(style: TourStyle.of(tour.tourType), iconSize: 50),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(minHeight: 84),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (meta.isNotEmpty)
                            FittedBox(
                              fit: BoxFit.scaleDown,
                              alignment: Alignment.centerLeft,
                              child: Text(
                                meta,
                                maxLines: 1,
                                softWrap: false,
                                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: AppInk.muted),
                              ),
                            ),
                          const SizedBox(height: 2),
                          Text(
                            tour.title,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontSize: 15, height: 1.3, fontWeight: FontWeight.w700, color: AppInk.ink),
                          ),
                          const Spacer(),
                          const SizedBox(height: 6),
                          FittedBox(
                            fit: BoxFit.scaleDown,
                            alignment: Alignment.centerLeft,
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                                  decoration: BoxDecoration(
                                    color: seatTone?.tint ?? AppInk.soft,
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Text(
                                    soldOut ? 'Hết chỗ' : 'Còn ${departure.remaining} chỗ',
                                    softWrap: false,
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w700,
                                      color: seatTone?.strong ?? AppInk.muted,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Text.rich(
                                  TextSpan(
                                    children: [
                                      const TextSpan(text: 'Từ ', style: TextStyle(color: AppInk.muted)),
                                      TextSpan(
                                        text: tour.formattedPrice,
                                        style: const TextStyle(fontWeight: FontWeight.w800, color: AppInk.accent),
                                      ),
                                    ],
                                  ),
                                  maxLines: 1,
                                  softWrap: false,
                                  style: const TextStyle(fontSize: 14, color: AppInk.ink),
                                ),
                              ],
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
        ),
      ),
    );
  }
}
