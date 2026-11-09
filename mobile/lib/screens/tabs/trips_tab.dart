import 'package:flutter/foundation.dart' show ValueListenable;
import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/models/gamification_model.dart' show formatThousands;
import '../../core/services/api_client.dart';
import '../../core/services/mock_tour_booking_store.dart';
import '../../core/services/tour_service.dart';
import '../common/tab_refresh.dart';
import '../tours/mock_tour_booking_sheet.dart' show startMockTourJourney;
import '../tours/my_tours_view.dart';
import '../tours/tour_list_screen.dart';

/// Tab "Chuyến đi": tour đã mua, hành trình đang đi và đã hoàn thành.
/// Nội dung là màn "Tour của tôi" sẵn có, giữ nguyên logic vé và hành trình.
/// Phía trên có thêm vé đặt GIẢ LẬP của tour 5 bước (tạm thời, xem [MockTourBookingStore]).
class TripsTab extends StatefulWidget {
  final ValueListenable<int>? selectedTab;

  const TripsTab({super.key, this.selectedTab});

  @override
  State<TripsTab> createState() => _TripsTabState();
}

class _TripsTabState extends State<TripsTab> with RefreshOnTabReturn {
  @override
  ValueListenable<int>? get selectedTab => widget.selectedTab;

  @override
  int get tabIndex => 1;

  /// Tăng mỗi lần quay lại tab để danh sách chuyến đi tải lại.
  int _refreshToken = 0;

  List<MockTourBooking> _mockBookings = const [];

  @override
  void initState() {
    super.initState();
    _loadMock();
  }

  @override
  void onTabReturn() {
    setState(() => _refreshToken++);
    _loadMock();
  }

  Future<void> _loadMock() async {
    final items = await MockTourBookingStore.list();
    if (mounted) setState(() => _mockBookings = items);
  }

  Future<void> _openMockList() async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      backgroundColor: AppCultureColors.surface,
      builder: (_) => _MockBookingList(onChanged: _loadMock),
    );
    _loadMock();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppCultureColors.background,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Padding(
              padding: EdgeInsets.fromLTRB(16, 14, 16, 6),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Chuyến đi của tôi',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: AppCultureColors.textDark),
                  ),
                  SizedBox(height: 2),
                  Text(
                    'Vé đã mua, hành trình đang đi và đã hoàn thành',
                    style: TextStyle(fontSize: 12.5, color: AppCultureColors.textMuted),
                  ),
                ],
              ),
            ),
            if (_mockBookings.isNotEmpty)
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 6, 16, 4),
                child: Material(
                  color: AppCultureColors.rewardBg,
                  borderRadius: BorderRadius.circular(16),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(16),
                    onTap: _openMockList,
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Row(
                        children: [
                          const Icon(Icons.science_rounded, color: AppCultureColors.amberDark),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  '${_mockBookings.length} vé đặt giả lập',
                                  style: const TextStyle(fontWeight: FontWeight.w700, color: AppCultureColors.rewardText),
                                ),
                                const Text(
                                  'Tour 5 bước, chưa tạo đơn thật',
                                  style: TextStyle(fontSize: 12, color: AppCultureColors.rewardText),
                                ),
                              ],
                            ),
                          ),
                          const Icon(Icons.chevron_right_rounded, color: AppCultureColors.amberDark),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            Expanded(
              child: MyToursView(
                refreshToken: _refreshToken,
                onExplore: () => openTourList(context),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Danh sách vé giả lập: bấm để mở tour, vuốt nút xoá để bỏ vé.
class _MockBookingList extends StatefulWidget {
  final VoidCallback onChanged;
  const _MockBookingList({required this.onChanged});

  @override
  State<_MockBookingList> createState() => _MockBookingListState();
}

class _MockBookingListState extends State<_MockBookingList> {
  List<MockTourBooking> _items = const [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final items = await MockTourBookingStore.list();
    if (mounted) setState(() => _items = items);
  }

  Future<void> _remove(MockTourBooking b) async {
    await MockTourBookingStore.remove(b.code);
    widget.onChanged();
    await _load();
    if (_items.isEmpty && mounted) Navigator.of(context).pop();
  }

  /// Bắt đầu / tiếp tục hành trình của vé; xong thì đóng bảng để tab Chuyến đi tải lại.
  Future<void> _start(MockTourBooking b) async {
    final navigator = Navigator.of(context);
    navigator.pop();
    await startMockTourJourney(navigator.context, b.tourId);
    widget.onChanged();
  }

  Future<void> _openTour(MockTourBooking b) async {
    try {
      final tour = await TourService().getTourById(b.tourId);
      if (!mounted) return;
      await openTourDetail(context, tour);
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    }
  }

  static String _date(DateTime d) =>
      '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}/${d.year}';

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: ConstrainedBox(
        constraints: BoxConstraints(maxHeight: MediaQuery.sizeOf(context).height * 0.75),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Padding(
              padding: EdgeInsets.fromLTRB(20, 0, 20, 8),
              child: Text(
                'Vé đặt giả lập',
                style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: AppCultureColors.textDark),
              ),
            ),
            Flexible(
              child: ListView.separated(
                shrinkWrap: true,
                padding: const EdgeInsets.fromLTRB(16, 4, 16, 16),
                itemCount: _items.length,
                separatorBuilder: (_, _) => const SizedBox(height: 10),
                itemBuilder: (_, i) {
                  final b = _items[i];
                  return Material(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(16),
                      onTap: () => _openTour(b),
                      child: Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: AppCultureColors.border),
                        ),
                        child: Row(
                          children: [
                            ClipRRect(
                              borderRadius: BorderRadius.circular(12),
                              child: SizedBox(
                                width: 64,
                                height: 64,
                                child: b.coverImageUrl == null
                                    ? Container(
                                        color: AppCultureColors.jadeLight,
                                        child: const Icon(Icons.luggage_rounded, color: AppCultureColors.heritageJade),
                                      )
                                    : Image.network(b.coverImageUrl!, fit: BoxFit.cover,
                                        errorBuilder: (_, _, _) => Container(color: AppCultureColors.surfaceSubtle)),
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    b.tourTitle,
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(fontWeight: FontWeight.w700, color: AppCultureColors.textDark),
                                  ),
                                  const SizedBox(height: 3),
                                  Text(
                                    'Khởi hành ${_date(b.departureDate)} · ${b.guestCount} khách',
                                    style: const TextStyle(fontSize: 12, color: AppCultureColors.textMuted),
                                  ),
                                  Text(
                                    '${b.code} · ${b.total <= 0 ? 'Miễn phí' : '${formatThousands(b.total)} đ'}',
                                    style: const TextStyle(fontSize: 12, color: AppCultureColors.textMuted),
                                  ),
                                ],
                              ),
                            ),
                            Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                IconButton.filled(
                                  tooltip: 'Bắt đầu trải nghiệm',
                                  onPressed: () => _start(b),
                                  icon: const Icon(Icons.play_arrow_rounded),
                                  style: IconButton.styleFrom(backgroundColor: AppCultureColors.heritageJade),
                                ),
                                IconButton(
                                  tooltip: 'Xoá vé giả lập',
                                  onPressed: () => _remove(b),
                                  icon: const Icon(Icons.delete_outline_rounded, color: AppCultureColors.error),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
