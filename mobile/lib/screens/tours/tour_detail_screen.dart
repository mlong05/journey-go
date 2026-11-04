import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/models/experience_model.dart';
import '../../core/models/tour_model.dart';
import '../../core/services/api_client.dart';
import '../../core/services/booking_service.dart';
import '../../core/services/tour_availability_service.dart';
import '../../core/services/tour_service.dart';
import '../../core/utils/formatters.dart' show formatLocalDateString;
import '../bookings/booking_checkout_screen.dart';
import '../journey/journey_screen.dart';
import 'tour_progress.dart';
import '../culture/cultural_stories.dart';
import '../rewards/rewards_widgets.dart' show buildRewardsAppBar;
import 'tour_route_map.dart';
import 'tour_style.dart';
import 'experience_date_calendar.dart';

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

  // Chặn bấm "Đặt tour" nhiều lần trong lúc đang tạo booking.
  bool _bookingInProgress = false;

  // Khóa từng thẻ chặng để chạm vào điểm trên bản đồ thì cuộn tới thẻ tương ứng.
  final Map<int, GlobalKey> _stopKeys = {};

  late TourModel _tour = widget.tour;
  // Trải nghiệm theo destinationId; null nghĩa là điểm đó tải lỗi.
  final Map<int, List<ExperienceModel>?> _experiences = {};
  bool _loading = true;

  /// Du khách đang đi dở hoặc đã đi xong tour này; null nếu chưa đi.
  TourProgress? _myProgress;

  // ── Chọn ngày trải nghiệm còn chỗ ────────────────────────────────────────
  List<TourAvailableDate> _availableDates = [];
  String? _selectedDate;
  bool _loadingDates = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    _loadMyProgress();

    // Làm mới thông tin tour (giá có thể đã đổi), nếu lỗi thì dùng bản từ danh sách.
    try {
      _tour = await _service.getTourById(widget.tour.id);
    } on ApiException {
      // giữ dữ liệu đã có
    }

    final entries = await Future.wait(
      _tour.destinations.map((d) async {
        try {
          final list = await _service.getDestinationExperiences(
            d.destinationId,
          );
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
    if (!mounted) return;
    setState(() => _loadingDates = true);
    try {
      final dates = await _availabilityService.getTourAvailableDates(_tour);
      if (!mounted) return;
      setState(() {
        _availableDates = dates;
        // Giữ lựa chọn của khách nếu ngày đó vẫn còn chỗ;
        // nếu không còn thì mặc định chọn ngày đầu tiên còn chỗ.
        final bookable = dates.where((d) => d.available).toList(growable: false);
        final stillAvailable =
            _selectedDate != null && bookable.any((d) => d.date == _selectedDate);
        _selectedDate = stillAvailable
            ? _selectedDate
            : (bookable.isEmpty ? null : bookable.first.date);
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

  Future<void> _loadMyProgress() async {
    final byTour = await TourProgress.load();
    if (mounted) setState(() => _myProgress = byTour[widget.tour.id]);
  }

  /// Nhãn ngày trải nghiệm đang chọn (VD "20/11/2026") — null nếu chưa chọn.
  String? get selectedDateLabel {
    final date = _selectedDate;
    if (date == null || date.isEmpty) return null;
    final formatted = formatLocalDateString(date);
    return formatted.isEmpty ? null : formatted;
  }

  Future<void> _continueJourney(TourProgress progress) async {
    await Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => JourneyScreen(journeyId: progress.journey.id)),
    );
    _loadMyProgress();
  }

  void _scrollToStop(TourDestinationModel d) {
    final ctx = _stopKeys[d.destinationId]?.currentContext;
    if (ctx != null) {
      Scrollable.ensureVisible(
        ctx,
        duration: const Duration(milliseconds: 400),
        curve: Curves.easeOutCubic,
      );
    }
  }

  /// Chọn ngày, tạo booking (giữ chỗ 10 phút) rồi sang màn thanh toán.
  ///
  /// Dùng LỊCH THÁNG dùng chung (`ExperienceDateCalendar`) — mỗi ô hiện số slot
  /// còn lại, chỉ ngày còn chỗ mới bấm được.
  /// Nếu API lỗi / không trả về ngày nào ⇒ KHÔNG fallback sang `showDatePicker`
  /// (lịch thuần cho phép chọn ngày không có slot ⇒ backend từ chối với lỗi khó hiểu).
  /// ⇒ Khi không có ngày nào, ta báo rõ ràng cho khách và KHÔNG tạo booking.
  Future<void> _onBook() async {
    if (_bookingInProgress) return;

    final bookedDate = await _pickExperienceDate();
    if (bookedDate == null || !mounted) return;

    setState(() => _bookingInProgress = true);
    try {
      final booking = await _bookingService.createBooking(
        tourId: _tour.id,
        experienceDate: bookedDate,
      );
      if (!mounted) return;
      // Đơn chưa thanh toán vẫn nằm ở "Đơn đặt tour > Chờ thanh toán" nếu khách thoát giữa chừng.
      await Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => BookingCheckoutScreen(bookingId: booking.id),
        ),
      );
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.message), behavior: SnackBarBehavior.floating),
      );
      // Lỗi hết chỗ / ngày không mở bán ⇒ tải lại lịch để khách chọn ngày khác.
      _loadAvailableDates();
    } finally {
      if (mounted) setState(() => _bookingInProgress = false);
    }
  }

  /// Trả về ngày trải nghiệm đã chọn (chuỗi `YYYY-MM-DD`), null nếu khách hủy.
  ///
  /// Mở bottom sheet chứa LỊCH THÁNG (dùng chung `ExperienceDateCalendar`):
  /// mỗi ô hiện số slot còn lại, chỉ ngày còn chỗ mới bấm được.
  /// Không có ngày nào ⇒ hiện thông báo và trả về null (không tạo booking sai).
  Future<String?> _pickExperienceDate() async {
    final bookable = _availableDates.where((d) => d.available).toList(growable: false);
    if (bookable.isEmpty) {
      if (!mounted) return null;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            _loadingDates
                ? 'Đang tải lịch trải nghiệm, vui lòng thử lại sau.'
                : 'Hiện chưa có ngày nào còn chỗ cho tour này. Vui lòng quay lại sau.',
          ),
          behavior: SnackBarBehavior.floating,
        ),
      );
      return null;
    }

    // Mặc định chọn ngày đầu tiên còn chỗ nếu chưa có lựa chọn nào.
    // Luôn non-null: nếu lựa chọn hiện tại không còn trong danh sách còn chỗ
    // ⇒ dùng ngày đầu tiên còn chỗ.
    final String initial = bookable.any((d) => d.date == _selectedDate)
        ? _selectedDate!
        : bookable.first.date;

    final picked = await showModalBottomSheet<String>(
      context: context,
      showDragHandle: true,
      backgroundColor: AppCultureColors.surface,
      isScrollControlled: true,
      builder: (ctx) => _buildDateSheet(ctx, initial),
    );
    if (picked != null && mounted) {
      setState(() => _selectedDate = picked);
    }
    return picked;
  }

  /// Bottom sheet chứa lịch tháng chọn ngày còn chỗ.
  ///
  /// ⚠️ Bấm vào ô ngày CHỈ chọn (tô đậm ô đang chọn) — KHÔNG đóng sheet và
  /// KHÔNG tạo booking. Muốn đi tiếp, khách phải bấm nút "Xác nhận chọn ngày"
  /// ở đáy sheet. Nhờ vậy khách tự do xem lịch, bấm nhiều ngày để so sánh
  /// số chỗ còn lại rồi mới chốt.
  Widget _buildDateSheet(
    BuildContext ctx,
    String initialDate,
  ) {
    // Ngày đang chọn trong sheet — nằm trong sheet để bấm ngày không đóng sheet.
    String? tempSelected = initialDate;

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
        child: StatefulBuilder(
          builder: (ctx, setSheetState) {
            return Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Chọn ngày trải nghiệm',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    color: AppCultureColors.textDark,
                  ),
                ),
                const SizedBox(height: 4),
                const Text(
                  'Số trong ô là số chỗ còn lại — chỉ ngày còn chỗ mới chọn được',
                  style: TextStyle(fontSize: 12, color: AppCultureColors.textMuted),
                ),
                const SizedBox(height: 14),
                Flexible(
                  child: SingleChildScrollView(
                    child: ExperienceDateCalendar(
                      dates: _availableDates,
                      selectedDate: tempSelected,
                      loading: _loadingDates,
                      // Chỉ cập nhật lựa chọn trong sheet, KHÔNG pop.
                      onDateSelected: (date) =>
                          setSheetState(() => tempSelected = date),
                    ),
                  ),
                ),
                const SizedBox(height: 14),
                // Ngày đang chọn — để khách biết mình đã chọn ngày nào.
                Row(
                  children: [
                    const Icon(
                      Icons.event_available_rounded,
                      size: 16,
                      color: AppCultureColors.oceanBlue,
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        tempSelected == null
                            ? 'Chưa chọn ngày nào'
                            : 'Đang chọn: ${formatLocalDateString(tempSelected)}',
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: AppCultureColors.textDark,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                // Nút xác nhận — mới đóng sheet và đi tiếp sang bước đặt tour.
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: tempSelected == null
                        ? null
                        : () => Navigator.of(ctx).pop(tempSelected),
                    icon: const Icon(Icons.check_rounded, size: 18),
                    label: const Text(
                      'Xác nhận chọn ngày',
                      style: TextStyle(fontWeight: FontWeight.w700),
                    ),
                    style: FilledButton.styleFrom(
                      backgroundColor: AppCultureColors.heritageJade,
                      minimumSize: const Size.fromHeight(48),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
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
            if (_tour.destinations.any((d) => d.hasLocation)) ...[
              const SizedBox(height: 22),
              _buildSectionTitle('Bản đồ lộ trình'),
              const SizedBox(height: 12),
              TourRouteMap(
                destinations: _tour.destinations,
                onTapStop: _scrollToStop,
              ),
            ],
            const SizedBox(height: 22),
            _buildSectionTitle('Các chặng hành trình'),
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
          ],
        ),
      ),
      bottomNavigationBar: _buildBookBar(),
    );
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
            fontSize: 16,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.2,
            color: AppCultureColors.textDark,
          ),
        ),
      ],
    );
  }

  Widget _buildHeader() {
    final style = TourStyle.of(_tour.tourType);
    final hasCover = _tour.coverImageUrl != null;
    return TourCover(
      imageUrl: _tour.coverImageUrl,
      colors: style.colors,
      padding: const EdgeInsets.all(18),
      borderRadius: BorderRadius.circular(24),
      child: Stack(
        children: [
          if (!hasCover)
            Positioned(
              right: -10,
              bottom: -18,
              child: Icon(
                style.icon,
                size: 110,
                color: Colors.white.withValues(alpha: 0.14),
              ),
            ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  TourChip(
                    icon: style.icon,
                    label: _tour.typeLabel,
                    dark: true,
                  ),
                  TourChip(
                    icon: Icons.schedule_rounded,
                    label: _tour.formattedDuration,
                    dark: true,
                  ),
                  TourChip(
                    icon: Icons.place_rounded,
                    label: '${_tour.destinationCount} điểm đến',
                    dark: true,
                  ),
                ],
              ),
              // Có ảnh bìa: đẩy tiêu đề xuống để lộ phần ảnh phía trên
              SizedBox(height: hasCover ? 96 : 14),
              Text(
                _tour.title,
                style: const TextStyle(
                  fontSize: 22,
                  height: 1.25,
                  fontWeight: FontWeight.w700,
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
              if (_tour.hasRewards) ...[
                const SizedBox(height: 14),
                TourRewardStrip(
                  taskCount: _tour.taskCount,
                  points: _tour.totalTaskPoints,
                  badgeCount: _tour.badgeCount,
                  onDark: true,
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }

  /// Một chặng của hành trình dạng "bản đồ màn chơi": nút tròn đánh số nối bằng đường nét đứt.
  Widget _buildDestinationStep(TourDestinationModel d, {required bool isLast}) {
    final experiences = _experiences[d.destinationId];
    final key = _stopKeys.putIfAbsent(d.destinationId, GlobalKey.new);
    return IntrinsicHeight(
      key: key,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SizedBox(
            width: 52,
            child: Column(
              children: [
                _QuestNode(number: d.sequenceOrder, isFinal: isLast),
                if (!isLast)
                  const Expanded(
                    child: CustomPaint(
                      painter: _DashedPathPainter(),
                      child: SizedBox(width: 4),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Padding(
              padding: EdgeInsets.only(bottom: isLast ? 0 : 20),
              child: Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: AppCultureColors.border),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.03),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (d.coverImageUrl != null) ...[
                      ClipRRect(
                        borderRadius: BorderRadius.circular(14),
                        child: AspectRatio(
                          aspectRatio: 16 / 9,
                          child: Image.network(
                            d.coverImageUrl!,
                            fit: BoxFit.cover,
                            errorBuilder: (_, _, _) => Container(
                              color: AppCultureColors.surfaceSubtle,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                    ],
                    Text(
                      isLast && _tour.destinations.length > 1
                          ? 'Chặng cuối'
                          : 'Chặng ${d.sequenceOrder}',
                      style: TextStyle(
                        fontSize: 10.5,
                        letterSpacing: 0.2,
                        fontWeight: FontWeight.w700,
                        color: isLast
                            ? AppCultureColors.amberDark
                            : AppCultureColors.heritageJade,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      d.name,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
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
                            child: Icon(
                              Icons.place_outlined,
                              size: 13,
                              color: AppCultureColors.textLight,
                            ),
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
                    // Câu chuyện văn hóa đặt lên đầu: đoạn mở đầu hiện sẵn, nội dung đầy đủ mở khóa khi check-in
                    CulturalStoriesSection(
                      destinationId: d.destinationId,
                      showTeaser: true,
                      hideWhenEmpty: true,
                    ),
                    const SizedBox(height: 8),
                    ..._buildExperienceRows(experiences),
                    const SizedBox(height: 2),
                    Row(
                      children: [
                        const Icon(
                          Icons.military_tech_rounded,
                          size: 16,
                          color: Color(0xFF8B5CF6),
                        ),
                        const SizedBox(width: 5),
                        Expanded(
                          child: Text(
                            'Check-in tại đây để mở khóa huy hiệu của điểm đến',
                            style: const TextStyle(
                              fontSize: 11.5,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF6D28D9),
                            ),
                          ),
                        ),
                      ],
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
    return experiences.map(_buildExperienceRow).toList();
  }

  /// Trải nghiệm tại chặng: tên, thời lượng, số nhiệm vụ và trạm (giá đã gộp ở thanh đặt tour).
  Widget _buildExperienceRow(ExperienceModel e) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: AppCultureColors.surfaceSubtle,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        children: [
          Container(
            width: 34,
            height: 34,
            decoration: BoxDecoration(
              color: AppCultureColors.jadeLight,
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(
              Icons.auto_awesome_rounded,
              size: 18,
              color: AppCultureColors.heritageJade,
            ),
          ),
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
                const SizedBox(height: 4),
                Wrap(
                  spacing: 10,
                  runSpacing: 2,
                  children: [
                    _miniStat(Icons.schedule_rounded, e.formattedDuration),
                    if (e.taskCount > 0)
                      _miniStat(Icons.flag_rounded, '${e.taskCount} nhiệm vụ'),
                    if (e.checkInPointCount > 0)
                      _miniStat(
                        Icons.qr_code_2_rounded,
                        '${e.checkInPointCount} trạm',
                      ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _miniStat(IconData icon, String text) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      Icon(icon, size: 13, color: AppCultureColors.textMuted),
      const SizedBox(width: 3),
      Text(
        text,
        style: const TextStyle(
          fontSize: 11.5,
          color: AppCultureColors.textMuted,
        ),
      ),
    ],
  );

  Widget _buildBookBar() {
    final progress = _myProgress;
    final active = progress?.inProgress ?? false;
    return SafeArea(
      child: Container(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
        decoration: const BoxDecoration(
          color: Colors.white,
          border: Border(top: BorderSide(color: AppCultureColors.border)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (progress != null) ...[
              TourProgressBadge(progress: progress),
              const SizedBox(height: 10),
            ],
            // Đang đi dở thì giá không còn quan trọng: nút tiếp tục chiếm cả hàng
            if (active)
              SizedBox(
                width: double.infinity,
                height: 50,
                child: FilledButton.icon(
                  onPressed: () => _continueJourney(progress!),
                  icon: const Icon(Icons.navigation_rounded, size: 19),
                  label: const Text('Tiếp tục hành trình', style: TextStyle(fontWeight: FontWeight.w700)),
                  style: FilledButton.styleFrom(
                    backgroundColor: AppCultureColors.oceanBlue,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                ),
              )
            else
            Row(
              children: [
                Expanded(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Tổng thanh toán',
                        style: TextStyle(
                          fontSize: 11.5,
                          color: AppCultureColors.textMuted,
                        ),
                      ),
                      Text(
                        _tour.formattedPrice,
                        style: const TextStyle(
                          fontSize: 19,
                          fontWeight: FontWeight.w700,
                          color: AppCultureColors.jadeDark,
                        ),
                      ),
                      // Ngày trải nghiệm đang chọn — hiển thị rõ để khách không
                      // phải mở lại lịch để biết mình đã chọn ngày nào.
                      if (selectedDateLabel != null) ...[
                        const SizedBox(height: 3),
                        Row(
                          children: [
                            const Icon(
                              Icons.event_available_rounded,
                              size: 13,
                              color: AppCultureColors.oceanBlue,
                            ),
                            const SizedBox(width: 4),
                            Flexible(
                              child: Text(
                                selectedDateLabel!,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  fontSize: 11.5,
                                  fontWeight: FontWeight.w700,
                                  color: AppCultureColors.oceanBlue,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(width: 10),
                FilledButton.icon(
                  onPressed: _bookingInProgress ? null : _onBook,
                  icon: Icon(
                    progress != null ? Icons.replay_rounded : Icons.confirmation_number_outlined,
                    size: 19,
                  ),
                  label: Text(
                    _bookingInProgress
                        ? 'Đang giữ chỗ...'
                        : progress != null
                            ? 'Đặt lại'
                            : 'Đặt tour',
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                  style: FilledButton.styleFrom(
                    backgroundColor: AppCultureColors.heritageJade,
                    minimumSize: const Size(150, 50),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
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
}

/// Nút tròn của một chặng; chặng cuối là cờ đích màu vàng.
class _QuestNode extends StatelessWidget {
  final int number;
  final bool isFinal;

  const _QuestNode({required this.number, required this.isFinal});

  @override
  Widget build(BuildContext context) {
    final colors = isFinal
        ? const [Color(0xFFFBBF24), Color(0xFFD97706)]
        : const [
            AppCultureColors.jadeGradientStart,
            AppCultureColors.jadeGradientEnd,
          ];
    return Container(
      width: 46,
      height: 46,
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: colors.last.withValues(alpha: 0.18),
      ),
      child: Container(
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: LinearGradient(
            colors: colors,
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          border: Border.all(color: Colors.white, width: 2),
          boxShadow: [
            BoxShadow(
              color: colors.last.withValues(alpha: 0.35),
              blurRadius: 8,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        alignment: Alignment.center,
        child: isFinal
            ? const Icon(Icons.flag_rounded, color: Colors.white, size: 18)
            : Text(
                '$number',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                ),
              ),
      ),
    );
  }
}

/// Đường nét đứt dọc nối các chặng.
class _DashedPathPainter extends CustomPainter {
  const _DashedPathPainter();

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = AppCultureColors.heritageJade.withValues(alpha: 0.45)
      ..strokeWidth = 3
      ..strokeCap = StrokeCap.round;
    final x = size.width / 2;
    for (double y = 6; y < size.height - 4; y += 12) {
      canvas.drawLine(
        Offset(x, y),
        Offset(x, (y + 6).clamp(0, size.height)),
        paint,
      );
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
