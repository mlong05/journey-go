import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/models/experience_model.dart';
import '../../core/models/gamification_model.dart' show formatThousands;
import '../../core/models/tour_model.dart';
import '../../core/services/api_client.dart';
import '../../core/services/booking_service.dart';
import '../../core/services/tour_availability_service.dart';
import '../../core/services/tour_service.dart';
import '../rewards/rewards_widgets.dart' show buildRewardsAppBar;
import '../booking/payment_screen.dart';
import 'tour_style.dart';

/// Chi tiết tour: hành trình theo thứ tự điểm đến, trải nghiệm của từng điểm và giá trọn gói.
class TourDetailScreen extends StatefulWidget {
  final TourModel tour;

  const TourDetailScreen({super.key, required this.tour});

  @override
  State<TourDetailScreen> createState() => _TourDetailScreenState();
}

class _TourDetailScreenState extends State<TourDetailScreen> {
  final TourService _service = TourService();
  final BookingService _bookingService = BookingService();
  final TourAvailabilityService _availabilityService = TourAvailabilityService();

  late TourModel _tour = widget.tour;
  // Trải nghiệm theo destinationId; null nghĩa là điểm đó tải lỗi.
  final Map<int, List<ExperienceModel>?> _experiences = {};
  bool _loading = true;

  // ── Chọn ngày trải nghiệm ────────────────────────────────────────────────
  List<TourAvailableDate> _availableDates = [];
  String? _selectedDate;
  bool _loadingDates = false;

  // ── Đặt tour ─────────────────────────────────────────────────────────────
  bool _booking = false;
  String _bookingError = '';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);

    // Làm mới thông tin tour (giá có thể đã đổi), nếu lỗi thì dùng bản từ danh sách.
    try {
      _tour = await _service.getTourById(widget.tour.id);
    } on ApiException {
      // giữ dữ liệu đã có
    }

    final entries = await Future.wait(
      _tour.destinations.map((d) async {
        try {
          final list = await _service.getDestinationExperiences(d.destinationId);
          return MapEntry<int, List<ExperienceModel>?>(d.destinationId, list);
        } on ApiException {
          return MapEntry<int, List<ExperienceModel>?>(d.destinationId, null);
        }
      }),
    );

    if (!mounted) return;
    setState(() {
      _experiences
        ..clear()
        ..addEntries(entries);
      _loading = false;
    });

    _loadAvailableDates();
  }

  /// Tải các ngày còn chỗ (mọi experience của tour đều phải còn slot).
  Future<void> _loadAvailableDates() async {
    setState(() => _loadingDates = true);
    try {
      final dates = await _availabilityService.getTourAvailableDates(_tour);
      if (!mounted) return;
      setState(() {
        _availableDates = dates;
        // Mặc định chọn ngày đầu tiên còn chỗ.
        final firstAvailable =
            dates.where((d) => d.available).toList(growable: false);
        _selectedDate =
            firstAvailable.isEmpty ? null : firstAvailable.first.date;
        _loadingDates = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _availableDates = [];
        _loadingDates = false;
      });
    }
  }

  int get _totalExperiences =>
      _experiences.values.fold(0, (sum, list) => sum + (list?.length ?? 0));

  /// Đặt tour: tạo booking → mở màn thanh toán VNPay.
  Future<void> _onBook() async {
    final date = _selectedDate;
    if (date == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Vui lòng chọn ngày trải nghiệm còn chỗ.'),
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    setState(() {
      _booking = true;
      _bookingError = '';
    });

    try {
      final booking = await _bookingService.createBooking(
        tourId: _tour.id,
        experienceDate: date,
      );

      if (!mounted) return;
      setState(() => _booking = false);

      final paid = await Navigator.of(context).push<bool>(
        MaterialPageRoute(
          builder: (_) => PaymentScreen(
            bookingId: booking.id,
            booking: booking,
          ),
        ),
      );

      if (paid == true && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Đặt tour thành công!'),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _booking = false;
        _bookingError = e.message;
      });
      // Lỗi hết chỗ / không mở bán → tải lại lịch ngày còn chỗ.
      if (e.code == 'BOOKING_SLOT_FULL' ||
          e.code == 'BOOKING_SLOT_NOT_FOUND') {
        _loadAvailableDates();
      }
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _booking = false;
        _bookingError = 'Không thể tạo đơn đặt tour. Vui lòng thử lại.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppCultureColors.background,
      appBar: buildRewardsAppBar(context, 'Chi tiết tour'),
      body: RefreshIndicator(
        color: AppCultureColors.heritageJade,
        onRefresh: _load,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
          children: [
            _buildHeader(),
            const SizedBox(height: 22),
            _buildSectionTitle('HÀNH TRÌNH'),
            const SizedBox(height: 12),
            if (_tour.destinations.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 24),
                child: Center(
                  child: Text(
                    'Tour chưa có điểm đến.',
                    style: TextStyle(color: AppCultureColors.textMuted),
                  ),
                ),
              )
            else
              ..._tour.destinations.asMap().entries.map(
                    (e) => _buildDestinationStep(
                      e.value,
                      isLast: e.key == _tour.destinations.length - 1,
                    ),
                  ),
            const SizedBox(height: 10),
            _buildPriceSummary(),
            const SizedBox(height: 16),
            _buildDatePicker(),
            if (_bookingError.isNotEmpty) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF2F2),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFFECACA)),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.error_outline_rounded,
                        size: 16, color: AppCultureColors.error),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _bookingError,
                        style: const TextStyle(
                          fontSize: 12,
                          height: 1.35,
                          color: Color(0xFF991B1B),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
      bottomNavigationBar: _buildBookBar(),
    );
  }

  /// Bộ chọn ngày trải nghiệm — chỉ hiện ngày còn chỗ.
  Widget _buildDatePicker() {
    final available =
        _availableDates.where((d) => d.available).toList(growable: false);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppCultureColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.event_available_rounded,
                  size: 17, color: AppCultureColors.heritageJade),
              const SizedBox(width: 8),
              const Expanded(
                child: Text(
                  'Chọn ngày trải nghiệm',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                    color: AppCultureColors.textDark,
                  ),
                ),
              ),
              if (available.isNotEmpty)
                Text(
                  '${available.length} ngày còn chỗ',
                  style: const TextStyle(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w700,
                    color: AppCultureColors.textMuted,
                  ),
                ),
            ],
          ),
          const SizedBox(height: 12),
          if (_loadingDates)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 18),
              child: Center(
                child: SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: AppCultureColors.heritageJade,
                  ),
                ),
              ),
            )
          else if (available.isEmpty)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppCultureColors.rewardBg,
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Row(
                children: [
                  Icon(Icons.event_busy_rounded,
                      size: 16, color: AppCultureColors.rewardText),
                  SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'Hiện chưa có ngày nào còn chỗ cho tour này. Vui lòng quay lại sau.',
                      style: TextStyle(
                        fontSize: 12,
                        height: 1.35,
                        color: AppCultureColors.rewardText,
                      ),
                    ),
                  ),
                ],
              ),
            )
          else ...[
            // Lưới ngày dạng card: dễ đọc, dễ bấm, hiện rõ số chỗ còn.
            LayoutBuilder(
              builder: (context, constraints) {
                const spacing = 10.0;
                final cardWidth = (constraints.maxWidth - spacing) / 2;
                return Wrap(
                  spacing: spacing,
                  runSpacing: spacing,
                  children: available.map((d) {
                    return SizedBox(
                      width: cardWidth,
                      child: _buildDateCard(d),
                    );
                  }).toList(),
                );
              },
            ),
            const SizedBox(height: 12),
            _buildSelectedDateSummary(available),
          ],
        ],
      ),
    );
  }

  /// Một thẻ ngày: ngày/tháng, thứ, và số chỗ còn.
  Widget _buildDateCard(TourAvailableDate d) {
    final isSelected = _selectedDate == d.date;
    final parts = _parseDate(d.date);
    final isLow = d.remaining <= 3;

    return InkWell(
      onTap: () => setState(() => _selectedDate = d.date),
      borderRadius: BorderRadius.circular(14),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 160),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: isSelected
              ? AppCultureColors.heritageJade
              : AppCultureColors.surfaceSubtle,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isSelected
                ? AppCultureColors.heritageJade
                : AppCultureColors.border,
            width: isSelected ? 1.5 : 1,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  parts.weekdayShort,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: isSelected
                        ? Colors.white70
                        : AppCultureColors.textMuted,
                  ),
                ),
                const Spacer(),
                if (isSelected)
                  const Icon(Icons.check_circle_rounded,
                      size: 14, color: Colors.white)
                else if (isLow)
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 6, vertical: 1),
                    decoration: BoxDecoration(
                      color: AppCultureColors.warning.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: const Text(
                      'Sắp hết',
                      style: TextStyle(
                        fontSize: 9.5,
                        fontWeight: FontWeight.w800,
                        color: AppCultureColors.amberDark,
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              parts.dayMonth,
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w900,
                color: isSelected ? Colors.white : AppCultureColors.textDark,
              ),
            ),
            Text(
              'Năm ${parts.year}',
              style: TextStyle(
                fontSize: 10.5,
                color: isSelected
                    ? Colors.white70
                    : AppCultureColors.textLight,
              ),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Icon(
                  Icons.event_seat_rounded,
                  size: 12,
                  color: isSelected
                      ? Colors.white70
                      : AppCultureColors.heritageJade,
                ),
                const SizedBox(width: 4),
                Expanded(
                  child: Text(
                    'Còn ${d.remaining} chỗ',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      color: isSelected
                          ? Colors.white
                          : AppCultureColors.heritageJade,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  /// Tóm tắt ngày đang chọn + nhắc rõ điều kiện đặt tour.
  Widget _buildSelectedDateSummary(List<TourAvailableDate> available) {
    final selected = available.where((d) => d.date == _selectedDate);
    if (selected.isEmpty) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppCultureColors.surfaceSubtle,
          borderRadius: BorderRadius.circular(12),
        ),
        child: const Text(
          'Vui lòng chọn một ngày để tiếp tục.',
          style: TextStyle(fontSize: 12, color: AppCultureColors.textMuted),
        ),
      );
    }

    final d = selected.first;
    final parts = _parseDate(d.date);

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(13),
      decoration: BoxDecoration(
        color: AppCultureColors.jadeLight,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
            color: AppCultureColors.heritageJade.withValues(alpha: 0.25)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.event_available_rounded,
                  size: 16, color: AppCultureColors.jadeDark),
              const SizedBox(width: 7),
              Expanded(
                child: Text(
                  'Ngày đã chọn: ${parts.fullLabel}',
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                    color: AppCultureColors.textDark,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            'Tour gồm $_totalExperiences trải nghiệm — mỗi trải nghiệm chiếm 1 chỗ '
            'trong ngày này. Số chỗ còn nhỏ nhất hiện là ${d.remaining}.',
            style: const TextStyle(
              fontSize: 11.5,
              height: 1.4,
              color: AppCultureColors.textMuted,
            ),
          ),
        ],
      ),
    );
  }

  /// Tách `YYYY-MM-DD` thành (thứ, ngày/tháng, năm, nhãn đầy đủ).
  ({String weekdayShort, String dayMonth, String year, String fullLabel})
      _parseDate(String date) {
    try {
      final d = DateTime.parse(date);
      const weekdays = [
        'Thứ 2',
        'Thứ 3',
        'Thứ 4',
        'Thứ 5',
        'Thứ 6',
        'Thứ 7',
        'Chủ Nhật',
      ];
      final wd = weekdays[d.weekday - 1];
      final dd = d.day.toString().padLeft(2, '0');
      final mm = d.month.toString().padLeft(2, '0');
      return (
        weekdayShort: wd,
        dayMonth: '$dd/$mm',
        year: '${d.year}',
        fullLabel: '$dd/$mm/${d.year} ($wd)',
      );
    } catch (_) {
      return (
        weekdayShort: '',
        dayMonth: date,
        year: '',
        fullLabel: date,
      );
    }
  }

  Widget _buildSectionTitle(String text) {
    return Row(
      children: [
        Container(
          width: 4,
          height: 16,
          decoration: BoxDecoration(
            color: AppCultureColors.heritageJade,
            borderRadius: BorderRadius.circular(2),
          ),
        ),
        const SizedBox(width: 8),
        Text(
          text,
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w800,
            letterSpacing: 0.8,
            color: AppCultureColors.textDark,
          ),
        ),
      ],
    );
  }

  Widget _buildHeader() {
    final style = TourStyle.of(_tour.tourType);
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: style.colors,
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(24),
      ),
      child: Stack(
        children: [
          Positioned(
            right: -10,
            bottom: -18,
            child: Icon(style.icon, size: 110, color: Colors.white.withValues(alpha: 0.14)),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  TourChip(icon: style.icon, label: _tour.typeLabel),
                  TourChip(icon: Icons.schedule_rounded, label: _tour.formattedDuration),
                  TourChip(
                    icon: Icons.place_rounded,
                    label: '${_tour.destinationCount} điểm đến',
                  ),
                ],
              ),
              const SizedBox(height: 14),
              Text(
                _tour.title,
                style: const TextStyle(
                  fontSize: 22,
                  height: 1.25,
                  fontWeight: FontWeight.w900,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 8),
              const Row(
                children: [
                  Icon(Icons.verified_rounded, size: 15, color: Colors.white70),
                  SizedBox(width: 5),
                  Text(
                    'Tour đã được kiểm duyệt',
                    style: TextStyle(fontSize: 12.5, color: Colors.white70),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildDestinationStep(TourDestinationModel d, {required bool isLast}) {
    final experiences = _experiences[d.destinationId];
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SizedBox(
            width: 36,
            child: Column(
              children: [
                Container(
                  width: 30,
                  height: 30,
                  alignment: Alignment.center,
                  decoration: const BoxDecoration(
                    color: AppCultureColors.heritageJade,
                    shape: BoxShape.circle,
                  ),
                  child: Text(
                    '${d.sequenceOrder}',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 13,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
                if (!isLast)
                  Expanded(
                    child: Container(
                      width: 2,
                      margin: const EdgeInsets.symmetric(vertical: 4),
                      color: AppCultureColors.border,
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Padding(
              padding: EdgeInsets.only(bottom: isLast ? 0 : 18),
              child: Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: AppCultureColors.border),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      d.name,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                        color: AppCultureColors.textDark,
                      ),
                    ),
                    if (d.address.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Padding(
                            padding: EdgeInsets.only(top: 2),
                            child: Icon(Icons.place_outlined,
                                size: 13, color: AppCultureColors.textLight),
                          ),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              d.address,
                              style: const TextStyle(
                                fontSize: 12,
                                height: 1.35,
                                color: AppCultureColors.textMuted,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                    const SizedBox(height: 12),
                    const Divider(height: 1, color: AppCultureColors.borderLight),
                    const SizedBox(height: 10),
                    ..._buildExperienceRows(experiences),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  List<Widget> _buildExperienceRows(List<ExperienceModel>? experiences) {
    if (_loading) {
      return [
        for (var i = 0; i < 2; i++)
          Container(
            height: 38,
            margin: const EdgeInsets.only(bottom: 8),
            decoration: BoxDecoration(
              color: AppCultureColors.surfaceSubtle,
              borderRadius: BorderRadius.circular(10),
            ),
          ),
      ];
    }
    if (experiences == null) {
      return [
        const Text(
          'Không tải được trải nghiệm của điểm này. Kéo xuống để thử lại.',
          style: TextStyle(fontSize: 12, color: AppCultureColors.error),
        ),
      ];
    }
    if (experiences.isEmpty) {
      return [
        const Text(
          'Điểm đến này chưa có trải nghiệm nào được phát hành.',
          style: TextStyle(fontSize: 12, color: AppCultureColors.textMuted),
        ),
      ];
    }
    return [
      const Text(
        'Trải nghiệm tại điểm này',
        style: TextStyle(
          fontSize: 11.5,
          fontWeight: FontWeight.w700,
          color: AppCultureColors.textMuted,
        ),
      ),
      const SizedBox(height: 8),
      ...experiences.map(_buildExperienceRow),
    ];
  }

  Widget _buildExperienceRow(ExperienceModel e) {
    final details = <String>[
      e.formattedDuration,
      if (e.taskCount > 0) '${e.taskCount} nhiệm vụ',
      if (e.checkInPointCount > 0) '${e.checkInPointCount} điểm check-in',
    ];
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: AppCultureColors.surfaceSubtle,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          const Icon(Icons.auto_awesome_rounded, size: 16, color: AppCultureColors.heritageJade),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  e.title,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: AppCultureColors.textDark,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  details.join(' • '),
                  style: const TextStyle(fontSize: 11.5, color: AppCultureColors.textMuted),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Text(
            e.price <= 0 ? 'Miễn phí' : '${formatThousands(e.price)} đ',
            style: const TextStyle(
              fontSize: 12.5,
              fontWeight: FontWeight.w800,
              color: AppCultureColors.jadeDark,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPriceSummary() {
    return Container(
      margin: const EdgeInsets.only(top: 14),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppCultureColors.jadeLight,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppCultureColors.heritageJade.withValues(alpha: 0.25)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Expanded(
                child: Text(
                  'Giá trọn gói tour',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                    color: AppCultureColors.textDark,
                  ),
                ),
              ),
              Text(
                _tour.formattedPrice,
                style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w900,
                  color: AppCultureColors.jadeDark,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            _loading
                ? 'Đang tải các trải nghiệm trong tour...'
                : 'Tổng giá các trải nghiệm trong tour ($_totalExperiences trải nghiệm). '
                    'Giá cố định cho mỗi lần đặt.',
            style: const TextStyle(
              fontSize: 12,
              height: 1.4,
              color: AppCultureColors.textMuted,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBookBar() {
    return SafeArea(
      child: Container(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
        decoration: const BoxDecoration(
          color: Colors.white,
          border: Border(top: BorderSide(color: AppCultureColors.border)),
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Tổng thanh toán',
                    style: TextStyle(fontSize: 11.5, color: AppCultureColors.textMuted),
                  ),
                  Text(
                    _tour.formattedPrice,
                    style: const TextStyle(
                      fontSize: 19,
                      fontWeight: FontWeight.w900,
                      color: AppCultureColors.jadeDark,
                    ),
                  ),
                ],
              ),
            ),
            FilledButton.icon(
              onPressed: (_booking || _selectedDate == null) ? null : _onBook,
              icon: _booking
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Icon(Icons.confirmation_number_outlined, size: 19),
              label: Text(
                _booking ? 'Đang đặt...' : 'Đặt tour',
                style: const TextStyle(fontWeight: FontWeight.w800),
              ),
              style: FilledButton.styleFrom(
                backgroundColor: AppCultureColors.heritageJade,
                disabledBackgroundColor: AppCultureColors.border,
                disabledForegroundColor: AppCultureColors.textMuted,
                minimumSize: const Size(150, 50),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
