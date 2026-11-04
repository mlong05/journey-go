import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';
import '../../core/services/tour_availability_service.dart';

/// Lịch chọn ngày trải nghiệm dạng tháng — dùng chung cho mobile.
///
/// ── Vì sao cần component dùng chung? ──
/// Trước đây mỗi màn tự lo: màn chi tiết tour dùng `showDatePicker` (lịch thuần,
/// cho chọn cả ngày không có slot), màn khác lại dùng danh sách phẳng ⇒ chỗ chọn
/// ngày TRÙNG kiểu, hành vi khác nhau.
///
/// ⇒ Lịch này là nguồn DUY NHẤT cho việc chọn ngày trên mobile:
///   • Lưới 7 cột (T2 → CN) × 6 hàng, mỗi ô hiện số ngày + số slot CÒN LẠI.
///   • Chỉ ngày còn slot mới bấm được ⇒ không bao giờ bị backend từ chối vì hết chỗ.
///   • Có nút ‹ › chuyển tháng và nút "Tháng này".
class ExperienceDateCalendar extends StatefulWidget {
  /// Danh sách ngày còn chỗ (đã lọc theo `available`).
  final List<TourAvailableDate> dates;

  /// Ngày đang chọn (`YYYY-MM-DD`).
  final String? selectedDate;

  /// Gọi khi khách chọn một ngày còn chỗ.
  final ValueChanged<String> onDateSelected;

  /// Đang tải dữ liệu lịch.
  final bool loading;

  const ExperienceDateCalendar({
    super.key,
    required this.dates,
    required this.selectedDate,
    required this.onDateSelected,
    this.loading = false,
  });

  @override
  State<ExperienceDateCalendar> createState() =>
      _ExperienceDateCalendarState();
}

class _ExperienceDateCalendarState extends State<ExperienceDateCalendar> {
  /// Tháng đang xem (`YYYY-MM`).
  late String _viewMonth;

  @override
  void initState() {
    super.initState();
    _viewMonth = _initialMonth();
  }

  @override
  void didUpdateWidget(covariant ExperienceDateCalendar oldWidget) {
    super.didUpdateWidget(oldWidget);
    // Dữ liệu lịch vừa tải xong ⇒ nhảy sang tháng đầu tiên còn lịch.
    if (oldWidget.dates.length != widget.dates.length ||
        oldWidget.dates.isEmpty != widget.dates.isEmpty) {
      final first = _firstAvailable();
      if (first != null) {
        _viewMonth = first.date.substring(0, 7);
      }
    }
  }

  /// Ngày còn chỗ đầu tiên trong danh sách (null nếu không còn ngày nào).
  TourAvailableDate? _firstAvailable() {
    for (final d in widget.dates) {
      if (d.available) return d;
    }
    return null;
  }

  /// Tháng đầu tiên có ngày còn chỗ; nếu không có thì dùng tháng hiện tại.
  String _initialMonth() {
    final first = _firstAvailable();
    if (first != null) return first.date.substring(0, 7);
    final now = DateTime.now();
    return '${now.year}-${now.month.toString().padLeft(2, '0')}';
  }

  /// Tháng trước / tháng sau của `YYYY-MM`.
  ///
  /// ⚠️ Dùng số học nguyên thuần (`year * 12 + (month - 1) + delta`) CHỨ KHÔNG
  /// dùng `DateTime.utc(year, month - 1 + delta, 1)`:
  /// tham số tháng của `DateTime` là **1-based** (tháng 1 = 1), nên cách cũ làm
  /// mỗi lần lùi nhảy cóc 2 tháng và lúc tiến lại đứng yên tại chỗ:
  ///   11 + 1 → 11 (không sang 12),  11 - 1 → 9 (nhảy mất 10),  9 - 1 → 7.
  String _shiftMonth(String monthKey, int delta) {
    final parts = monthKey.split('-');
    final year = int.parse(parts[0]);
    final month = int.parse(parts[1]);
    // Tổng số tháng kể từ năm 0 ⇒ cộng/trừ là luôn đúng 1 tháng, không lỗi ranh giới năm.
    final totalMonths = year * 12 + (month - 1) + delta;
    final newYear = totalMonths ~/ 12;
    final newMonth = totalMonths % 12 + 1;
    return '$newYear-${newMonth.toString().padLeft(2, '0')}';
  }

  /// Danh sách ngày của tháng đang xem, theo đúng thứ tự lịch (T2 → CN).
  List<List<({int? day, String? date})>> _buildGrid(String monthKey) {
    final parts = monthKey.split('-');
    final year = int.parse(parts[0]);
    final month = int.parse(parts[1]);

    // `weekday`: 1 = Thứ 2 … 7 = Chủ nhật.
    final leadingBlanks = DateTime.utc(year, month, 1).weekday - 1;
    final daysInMonth = DateTime.utc(year, month + 1, 0).day;

    final cells = <({int? day, String? date})>[];
    for (var i = 0; i < leadingBlanks; i++) {
      cells.add((day: null, date: null));
    }
    for (var day = 1; day <= daysInMonth; day++) {
      cells.add((day: day, date: '$monthKey-${day.toString().padLeft(2, '0')}'));
    }
    // Luôn đủ 6 hàng ⇒ chiều cao lịch không nhảy khi chuyển tháng.
    while (cells.length < 42) {
      cells.add((day: null, date: null));
    }

    final rows = <List<({int? day, String? date})>>[];
    for (var i = 0; i < cells.length; i += 7) {
      rows.add(cells.sublist(i, i + 7));
    }
    return rows;
  }

  @override
  Widget build(BuildContext context) {
    final byDate = <String, TourAvailableDate>{
      for (final d in widget.dates) d.date: d,
    };
    final rows = _buildGrid(_viewMonth);
    final parts = _viewMonth.split('-');
    final monthLabel =
        'Tháng ${int.parse(parts[1])}/${parts[0]}';

    final monthHasAvailable = widget.dates
        .any((d) => d.available && d.date.startsWith(_viewMonth));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // ── Thanh điều hướng tháng ──
        Row(
          children: [
            _navButton(
              icon: Icons.chevron_left_rounded,
              onTap: () =>
                  setState(() => _viewMonth = _shiftMonth(_viewMonth, -1)),
            ),
            Expanded(
              child: Column(
                children: [
                  Text(
                    monthLabel,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w800,
                      color: AppCultureColors.textDark,
                    ),
                  ),
                  Text(
                    monthHasAvailable ? 'Còn lịch' : 'Không có lịch',
                    style: const TextStyle(
                      fontSize: 11,
                      color: AppCultureColors.textMuted,
                    ),
                  ),
                ],
              ),
            ),
            _navButton(
              icon: Icons.chevron_right_rounded,
              onTap: () =>
                  setState(() => _viewMonth = _shiftMonth(_viewMonth, 1)),
            ),
          ],
        ),
        const SizedBox(height: 10),

        // ── Tên cột ──
        // (không dùng `const` vì `const` collection không hỗ trợ `for` element)
        Row(
          children: [
            for (final label in const ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'])
              Expanded(
                child: Center(
                  child: Text(
                    label,
                    style: const TextStyle(
                      fontSize: 10.5,
                      fontWeight: FontWeight.w700,
                      color: AppCultureColors.textLight,
                    ),
                  ),
                ),
              ),
          ],
        ),
        const SizedBox(height: 4),

        // ── Các ô ngày ──
        if (widget.loading)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 40),
            child: Center(
              child: CircularProgressIndicator(strokeWidth: 2.5),
            ),
          )
        else
          for (final week in rows)
            Padding(
              padding: const EdgeInsets.only(bottom: 4),
              child: Row(
                children: [
                  for (final cell in week)
                    Expanded(
                      child: _dayCell(
                        day: cell.day,
                        info: cell.date == null ? null : byDate[cell.date],
                        selected: cell.date != null &&
                            cell.date == widget.selectedDate,
                        onTap: cell.date == null
                            ? null
                            : () => widget.onDateSelected(cell.date!),
                      ),
                    ),
                ],
              ),
            ),

        // ── Chú thích màu ──
        if (!widget.loading) ...[
          const SizedBox(height: 8),
          const Row(
            children: [
              _LegendDot(color: Color(0xFF10B981), label: 'Còn chỗ'),
              SizedBox(width: 12),
              _LegendDot(color: Color(0xFFF59E0B), label: 'Sắp hết'),
              SizedBox(width: 12),
              _LegendDot(color: Color(0xFFCBD5E1), label: 'Hết chỗ'),
            ],
          ),          const SizedBox(height: 6),
          Center(
            child: TextButton.icon(
              onPressed: () => setState(() => _viewMonth = _initialMonth()),
              icon: const Icon(Icons.today_rounded, size: 15),
              label: const Text('Về tháng này'),
              style: TextButton.styleFrom(
                foregroundColor: AppCultureColors.oceanBlue,
                textStyle: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ),
        ],
      ],
    );
  }

  Widget _navButton({
    required IconData icon,
    required VoidCallback onTap,
  }) {
    return Material(
      color: AppCultureColors.surfaceSubtle,
      borderRadius: BorderRadius.circular(10),
      child: InkWell(
        borderRadius: BorderRadius.circular(10),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(6),
          child: Icon(icon, size: 20, color: AppCultureColors.textMuted),
        ),
      ),
    );
  }

  /// Một ô ngày trong lịch: số ngày + badge số slot còn lại.
  Widget _dayCell({
    required int? day,
    required TourAvailableDate? info,
    required bool selected,
    required VoidCallback? onTap,
  }) {
    if (day == null) {
      return const AspectRatio(aspectRatio: 0.82, child: SizedBox.shrink());
    }

    final remaining = info?.remaining ?? 0;
    final available = (info?.available ?? false) && remaining > 0;
    final isToday = _isToday(info?.date);

    Color badgeBg;
    Color badgeFg;
    if (selected) {
      badgeBg = Colors.white.withValues(alpha: 0.28);
      badgeFg = Colors.white;
    } else if (!available) {
      badgeBg = Colors.transparent;
      badgeFg = AppCultureColors.textLight;
    } else if (remaining <= 3) {
      badgeBg = const Color(0xFFFEF3C7);
      badgeFg = const Color(0xFF92400E);
    } else {
      badgeBg = AppCultureColors.jadeLight;
      badgeFg = AppCultureColors.jadeDark;
    }

    return AspectRatio(
      aspectRatio: 0.82,
      child: Padding(
        padding: const EdgeInsets.all(1.5),
        child: Material(
          color: selected
              ? AppCultureColors.oceanBlue
              : available
                  ? AppCultureColors.surface
                  : AppCultureColors.surfaceSubtle.withValues(alpha: 0.5),
          borderRadius: BorderRadius.circular(9),
          child: InkWell(
            borderRadius: BorderRadius.circular(9),
            onTap: available ? onTap : null,
            child: Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(9),
                border: Border.all(
                  color: selected
                      ? AppCultureColors.oceanBlue
                      : isToday
                          ? AppCultureColors.oceanBlue
                          : Colors.transparent,
                  width: isToday || selected ? 1.4 : 1,
                ),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    '$day',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: selected
                          ? Colors.white
                          : available
                              ? AppCultureColors.textDark
                              : AppCultureColors.textLight,
                    ),
                  ),
                  const SizedBox(height: 1),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 4,
                      vertical: 1,
                    ),
                    decoration: BoxDecoration(
                      color: badgeBg,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      available ? '$remaining' : '—',
                      style: TextStyle(
                        fontSize: 9,
                        fontWeight: FontWeight.w800,
                        color: badgeFg,
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

  bool _isToday(String? dateIso) {
    if (dateIso == null) return false;
    final now = DateTime.now();
    final today =
        '${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';
    return dateIso == today;
  }
}

/// Chấm màu trong chú thích lịch.
class _LegendDot extends StatelessWidget {
  final Color color;
  final String label;

  const _LegendDot({required this.color, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 4),
        Text(
          label,
          style: const TextStyle(fontSize: 10.5, color: AppCultureColors.textMuted),
        ),
      ],
    );
  }
}
