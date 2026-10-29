import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/models/experience_model.dart';
import '../../core/models/gamification_model.dart' show formatThousands;
import '../../core/models/tour_model.dart';
import '../../core/services/api_client.dart';
import '../../core/services/booking_service.dart';
import '../../core/services/tour_service.dart';
import '../bookings/booking_checkout_screen.dart';
import '../culture/cultural_stories.dart';
import '../rewards/rewards_widgets.dart' show buildRewardsAppBar;
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

  // Chặn bấm "Đặt tour" nhiều lần trong lúc đang tạo booking.
  bool _bookingInProgress = false;

  // Các điểm đến đang mở phần "Câu chuyện văn hóa" (chỉ tải khi mở).
  final Set<int> _openStories = {};

  late TourModel _tour = widget.tour;
  // Trải nghiệm theo destinationId; null nghĩa là điểm đó tải lỗi.
  final Map<int, List<ExperienceModel>?> _experiences = {};
  bool _loading = true;

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
  }

  int get _totalExperiences =>
      _experiences.values.fold(0, (sum, list) => sum + (list?.length ?? 0));

  /// Chọn ngày, tạo booking (giữ chỗ 10 phút) rồi sang màn thanh toán.
  Future<void> _onBook() async {
    if (_bookingInProgress) return;
    final today = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: today,
      firstDate: DateTime(today.year, today.month, today.day),
      lastDate: today.add(const Duration(days: 365)),
      helpText: 'Chọn ngày trải nghiệm',
    );
    if (picked == null || !mounted) return;

    setState(() => _bookingInProgress = true);
    try {
      final booking = await _bookingService.create(tourId: _tour.id, experienceDate: picked);
      if (!mounted) return;
      // Đơn chưa thanh toán vẫn nằm ở "Đơn đặt tour > Chờ thanh toán" nếu khách thoát giữa chừng.
      await Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => BookingCheckoutScreen(bookingId: booking.id)),
      );
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.message), behavior: SnackBarBehavior.floating),
      );
    } finally {
      if (mounted) setState(() => _bookingInProgress = false);
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
                    const SizedBox(height: 6),
                    InkWell(
                      borderRadius: BorderRadius.circular(10),
                      onTap: () => setState(() {
                        if (!_openStories.remove(d.destinationId)) _openStories.add(d.destinationId);
                      }),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 6),
                        child: Row(
                          children: [
                            const Icon(Icons.auto_stories_rounded,
                                size: 17, color: AppCultureColors.amberDark),
                            const SizedBox(width: 6),
                            const Expanded(
                              child: Text(
                                'Câu chuyện văn hóa',
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                  color: AppCultureColors.amberDark,
                                ),
                              ),
                            ),
                            Icon(
                              _openStories.contains(d.destinationId)
                                  ? Icons.expand_less_rounded
                                  : Icons.expand_more_rounded,
                              color: AppCultureColors.amberDark,
                            ),
                          ],
                        ),
                      ),
                    ),
                    if (_openStories.contains(d.destinationId))
                      CulturalStoriesSection(destinationId: d.destinationId),
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
              onPressed: _bookingInProgress ? null : _onBook,
              icon: const Icon(Icons.confirmation_number_outlined, size: 19),
              label: Text(_bookingInProgress ? 'Đang giữ chỗ...' : 'Đặt tour',
                  style: const TextStyle(fontWeight: FontWeight.w800)),
              style: FilledButton.styleFrom(
                backgroundColor: AppCultureColors.heritageJade,
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
