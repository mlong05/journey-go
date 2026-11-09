import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/models/gamification_model.dart' show formatThousands;
import '../../core/models/tour_detail_model.dart';
import '../../core/services/mock_tour_booking_store.dart';
import '../journey/journey_screen.dart';

/// Đặt tour 5 bước GIẢ LẬP: chọn ngày khởi hành và số khách, rồi báo đặt thành công.
/// Không gọi server, không thu tiền; vé chỉ lưu trên máy (xem [MockTourBookingStore]).
/// Trả về vé đã đặt, hoặc null nếu khách đóng bảng.
Future<MockTourBooking?> startMockTourBooking(BuildContext context, TourDetailModel detail) async {
  final booking = await showModalBottomSheet<MockTourBooking>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    backgroundColor: AppCultureColors.surface,
    builder: (_) => _MockBookingSheet(detail: detail),
  );
  if (booking == null || !context.mounted) return booking;
  await MockTourBookingStore.add(booking);
  if (!context.mounted) return booking;
  final startNow = await _showSuccess(context, booking);
  if (startNow == true && context.mounted) await startMockTourJourney(context, booking.tourId);
  return booking;
}

/// Bắt đầu (hoặc tiếp tục) hành trình của tour từ vé giả lập: hành trình không gắn đơn đặt tour.
Future<void> startMockTourJourney(BuildContext context, int tourId) {
  return Navigator.of(context).push(MaterialPageRoute(builder: (_) => JourneyScreen(tourId: tourId)));
}

String _vnd(double v) => v <= 0 ? 'Miễn phí' : '${formatThousands(v)} đ';

String _dayMonth(DateTime d) => '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}';

String _fullDate(DateTime d) => '${_dayMonth(d)}/${d.year}';

class _MockBookingSheet extends StatefulWidget {
  final TourDetailModel detail;
  const _MockBookingSheet({required this.detail});

  @override
  State<_MockBookingSheet> createState() => _MockBookingSheetState();
}

class _MockBookingSheetState extends State<_MockBookingSheet> {
  /// Loại khách có thể chọn; tour chưa có bảng giá thì một loại "Khách" theo giá hiển thị.
  late final List<TourGuestPrice> _types = widget.detail.prices.isNotEmpty
      ? widget.detail.prices
      : [
          TourGuestPrice(
            guestType: 'ADULT',
            label: 'Khách',
            ageRange: '',
            price: widget.detail.price,
            alwaysFree: false,
          ),
        ];

  late final Map<String, int> _counts = {
    for (final t in _types) t.guestType: t.guestType == 'ADULT' ? 1 : 0,
  };

  DateTime? _date;

  List<DateTime> get _dates => widget.detail.upcomingDepartureDates;

  int get _totalGuests => _counts.values.fold(0, (a, b) => a + b);

  int? get _maxGuests => widget.detail.maxGuestsPerSlot;

  double get _total => _types.fold(0.0, (sum, t) => sum + (t.alwaysFree ? 0 : t.price) * (_counts[t.guestType] ?? 0));

  bool get _canConfirm => _date != null && (_counts['ADULT'] ?? 0) >= 1;

  @override
  void initState() {
    super.initState();
    if (_dates.isNotEmpty) _date = _dates.first;
  }

  Future<void> _pickAnyDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _date ?? now.add(const Duration(days: 1)),
      firstDate: now,
      lastDate: now.add(const Duration(days: 365)),
    );
    if (picked != null) setState(() => _date = picked);
  }

  void _confirm() {
    final now = DateTime.now();
    Navigator.of(context).pop(MockTourBooking(
      code: MockTourBookingStore.newCode(now),
      tourId: widget.detail.id,
      tourTitle: widget.detail.title,
      coverImageUrl: widget.detail.coverImageUrl ?? widget.detail.images.firstOrNull,
      departureDate: _date!,
      guests: {
        for (final t in _types)
          if ((_counts[t.guestType] ?? 0) > 0) t.label: _counts[t.guestType]!,
      },
      total: _total,
      createdAt: now,
    ));
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: ConstrainedBox(
        constraints: BoxConstraints(maxHeight: MediaQuery.sizeOf(context).height * 0.85),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 4),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Đặt tour',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppCultureColors.textDark),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    widget.detail.title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 13, color: AppCultureColors.textMuted),
                  ),
                  const SizedBox(height: 8),
                  const _MockNotice(),
                ],
              ),
            ),
            Flexible(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(20, 12, 20, 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Ngày khởi hành', style: _label),
                    const SizedBox(height: 8),
                    if (_dates.isNotEmpty)
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          for (final d in _dates.take(16))
                            ChoiceChip(
                              label: Text(_dayMonth(d)),
                              selected: _date == d,
                              onSelected: (_) => setState(() => _date = d),
                              showCheckmark: false,
                              selectedColor: AppCultureColors.jadeLight,
                              side: BorderSide(
                                color: _date == d ? AppCultureColors.heritageJade : AppCultureColors.border,
                              ),
                              labelStyle: TextStyle(
                                fontWeight: FontWeight.w700,
                                color: _date == d ? AppCultureColors.jadeDark : AppCultureColors.textDark,
                              ),
                            ),
                        ],
                      )
                    else
                      OutlinedButton.icon(
                        onPressed: _pickAnyDate,
                        icon: const Icon(Icons.event_rounded),
                        label: Text(_date == null ? 'Chọn ngày' : _fullDate(_date!)),
                        style: OutlinedButton.styleFrom(
                          minimumSize: const Size.fromHeight(46),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                    const SizedBox(height: 20),
                    Row(
                      children: [
                        const Expanded(child: Text('Số khách', style: _label)),
                        if (_maxGuests != null)
                          Text(
                            'Tối đa $_maxGuests khách',
                            style: const TextStyle(fontSize: 12, color: AppCultureColors.textMuted),
                          ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    for (final t in _types) _guestRow(t),
                  ],
                ),
              ),
            ),
            Container(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 12),
              decoration: const BoxDecoration(border: Border(top: BorderSide(color: AppCultureColors.border))),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text('Tổng · $_totalGuests khách', style: const TextStyle(fontSize: 12, color: AppCultureColors.textMuted)),
                        Text(
                          _vnd(_total),
                          style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w800, color: AppCultureColors.jadeDark),
                        ),
                      ],
                    ),
                  ),
                  FilledButton(
                    onPressed: _canConfirm ? _confirm : null,
                    style: FilledButton.styleFrom(
                      backgroundColor: AppCultureColors.heritageJade,
                      minimumSize: const Size(150, 50),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    ),
                    child: const Text('Xác nhận đặt', style: TextStyle(fontWeight: FontWeight.w700)),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _guestRow(TourGuestPrice t) {
    final count = _counts[t.guestType] ?? 0;
    final min = t.guestType == 'ADULT' ? 1 : 0;
    final full = _maxGuests != null && _totalGuests >= _maxGuests!;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(t.label, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppCultureColors.textDark)),
                Text(
                  [if (t.ageRange.isNotEmpty) t.ageRange, t.formattedPrice].join(' · '),
                  style: const TextStyle(fontSize: 12, color: AppCultureColors.textMuted),
                ),
              ],
            ),
          ),
          IconButton.outlined(
            onPressed: count > min ? () => setState(() => _counts[t.guestType] = count - 1) : null,
            icon: const Icon(Icons.remove_rounded, size: 18),
            visualDensity: VisualDensity.compact,
          ),
          SizedBox(
            width: 32,
            child: Text(
              '$count',
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
            ),
          ),
          IconButton.outlined(
            onPressed: full || count >= 20 ? null : () => setState(() => _counts[t.guestType] = count + 1),
            icon: const Icon(Icons.add_rounded, size: 18),
            visualDensity: VisualDensity.compact,
          ),
        ],
      ),
    );
  }
}

const _label = TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppCultureColors.textDark);

/// Nhãn nhắc đây là đặt thử, để không ai tưởng đã có đơn thật.
class _MockNotice extends StatelessWidget {
  const _MockNotice();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: AppCultureColors.rewardBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppCultureColors.rewardBorder),
      ),
      child: const Row(
        children: [
          Icon(Icons.science_rounded, size: 16, color: AppCultureColors.amberDark),
          SizedBox(width: 6),
          Expanded(
            child: Text(
              'Chế độ giả lập: không tạo đơn thật, không thanh toán.',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppCultureColors.rewardText),
            ),
          ),
        ],
      ),
    );
  }
}

/// Trả về true khi du khách chọn "Bắt đầu trải nghiệm".
Future<bool?> _showSuccess(BuildContext context, MockTourBooking b) {
  return showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      contentPadding: const EdgeInsets.all(24),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 68,
            height: 68,
            decoration: const BoxDecoration(color: AppCultureColors.jadeLight, shape: BoxShape.circle),
            child: const Icon(Icons.check_circle_rounded, color: AppCultureColors.heritageJade, size: 42),
          ),
          const SizedBox(height: 16),
          const Text(
            'Đặt tour thành công',
            style: TextStyle(fontSize: 19, fontWeight: FontWeight.w800, color: AppCultureColors.textDark),
          ),
          const SizedBox(height: 8),
          Text(
            'Mã vé: ${b.code}\n'
            'Khởi hành: ${_fullDate(b.departureDate)}\n'
            '${b.guestCount} khách · ${_vnd(b.total)}',
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 13, height: 1.5, color: AppCultureColors.textMuted),
          ),
          const SizedBox(height: 10),
          const Text(
            'Giả lập, chưa tạo đơn thật. Vé xem lại ở tab Chuyến đi.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 11.5, color: AppCultureColors.amberDark),
          ),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            height: 46,
            child: FilledButton.icon(
              onPressed: () => Navigator.of(ctx).pop(true),
              icon: const Icon(Icons.play_arrow_rounded),
              label: const Text('Bắt đầu trải nghiệm', style: TextStyle(fontWeight: FontWeight.w700)),
              style: FilledButton.styleFrom(
                backgroundColor: AppCultureColors.heritageJade,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
            ),
          ),
          const SizedBox(height: 6),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Để sau'),
          ),
        ],
      ),
    ),
  );
}
