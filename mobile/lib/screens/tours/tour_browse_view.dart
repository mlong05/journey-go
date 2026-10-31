import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/models/tour_model.dart';
import '../../core/services/api_client.dart';
import '../../core/services/tour_service.dart';
import '../rewards/rewards_widgets.dart'
    show RewardsMessageView, RewardsSkeletonList;
import '../../core/models/booking_model.dart' show BookingStatus;
import '../../core/services/progress_service.dart';
import 'tour_detail_screen.dart';
import 'tour_style.dart';

/// Danh sách tour đã xuất bản: tìm kiếm, lọc theo loại hình, mở chi tiết tour.
class TourBrowseView extends StatefulWidget {
  /// Đổi giá trị để tải lại danh sách (khi du khách quay lại tab).
  final int refreshToken;

  const TourBrowseView({super.key, this.refreshToken = 0});

  @override
  State<TourBrowseView> createState() => _TourBrowseViewState();
}

class _TourBrowseViewState extends State<TourBrowseView> {
  final TourService _service = TourService();
  final TextEditingController _search = TextEditingController();

  List<TourModel> _tours = [];

  /// Tour du khách đang có vé chưa dùng (vé nằm ở trang "Tour của tôi").
  Set<int> _owned = const {};
  bool _loading = true;
  String? _error;
  String _query = '';
  String _type = 'ALL';

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void didUpdateWidget(covariant TourBrowseView oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.refreshToken != widget.refreshToken) _load(silent: true);
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  Future<void> _load({bool silent = false}) async {
    if (!silent) {
      setState(() {
        _loading = true;
        _error = null;
      });
    }
    try {
      final owned = _loadOwned();
      final tours = await _service.getPublishedTours();
      final ownedIds = await owned;
      if (!mounted) return;
      setState(() {
        _tours = tours;
        _owned = ownedIds;
        _loading = false;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.message;
        _loading = false;
      });
    }
  }

  /// Mã các tour đang có vé chưa dùng; lỗi (chưa đăng nhập, mất mạng) thì coi như chưa có vé.
  static Future<Set<int>> _loadOwned() async {
    try {
      final tickets = await ProgressService().getTickets();
      return {for (final b in tickets) if (b.status != BookingStatus.completed) b.tourId};
    } catch (_) {
      return const {};
    }
  }

  Future<void> _openTour(TourModel tour) async {
    await Navigator.of(context).push(MaterialPageRoute(builder: (_) => TourDetailScreen(tour: tour)));
    final owned = await _loadOwned();
    if (mounted) setState(() => _owned = owned);
  }

  List<String> get _types {
    final set = <String>{};
    for (final t in _tours) {
      set.add(t.tourType);
    }
    return set.toList()..sort();
  }

  List<TourModel> get _filtered {
    final q = _query.trim().toLowerCase();
    return _tours.where((t) {
      if (_type != 'ALL' && t.tourType != _type) return false;
      if (q.isEmpty) return true;
      return t.title.toLowerCase().contains(q) ||
          t.routePreview.toLowerCase().contains(q) ||
          t.typeLabel.toLowerCase().contains(q);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const RewardsSkeletonList(count: 3, itemHeight: 230);

    if (_error != null) {
      return RewardsMessageView(
        icon: Icons.cloud_off_rounded,
        title: 'Không tải được danh sách tour',
        message: _error,
        onRetry: _load,
      );
    }

    final tours = _filtered;
    return RefreshIndicator(
      color: AppCultureColors.heritageJade,
      onRefresh: _load,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
        children: [
          _buildSearchField(),
          if (_types.length > 1) _buildTypeChips(),
          Padding(
            padding: const EdgeInsets.fromLTRB(2, 12, 2, 10),
            child: Row(
              children: [
                const Icon(
                  Icons.verified_rounded,
                  size: 15,
                  color: AppCultureColors.heritageJade,
                ),
                const SizedBox(width: 6),
                Text(
                  tours.isEmpty
                      ? 'Không có tour phù hợp'
                      : '${tours.length} tour đã được kiểm duyệt',
                  style: const TextStyle(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w700,
                    color: AppCultureColors.textMuted,
                  ),
                ),
              ],
            ),
          ),
          if (tours.isEmpty)
            SizedBox(
              height: 280,
              child: RewardsMessageView(
                icon: Icons.travel_explore_rounded,
                title: _tours.isEmpty
                    ? 'Chưa có tour nào'
                    : 'Không tìm thấy tour',
                message: _tours.isEmpty
                    ? 'Các tour mới sẽ xuất hiện tại đây khi được phát hành.'
                    : 'Thử đổi từ khóa hoặc bộ lọc loại hình.',
              ),
            )
          else
            ...tours.map(_buildTourCard),
        ],
      ),
    );
  }

  Widget _buildSearchField() {
    return TextField(
      controller: _search,
      onChanged: (v) => setState(() => _query = v),
      textInputAction: TextInputAction.search,
      decoration: InputDecoration(
        hintText: 'Tìm tour hoặc điểm đến',
        hintStyle: const TextStyle(
          fontSize: 13.5,
          color: AppCultureColors.textLight,
        ),
        prefixIcon: const Icon(
          Icons.search_rounded,
          color: AppCultureColors.textMuted,
        ),
        suffixIcon: _query.isEmpty
            ? null
            : IconButton(
                tooltip: 'Xóa tìm kiếm',
                icon: const Icon(Icons.close_rounded, size: 18),
                onPressed: () {
                  _search.clear();
                  setState(() => _query = '');
                },
              ),
        filled: true,
        fillColor: Colors.white,
        contentPadding: const EdgeInsets.symmetric(vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: AppCultureColors.border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: AppCultureColors.border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(
            color: AppCultureColors.heritageJade,
            width: 1.5,
          ),
        ),
      ),
    );
  }

  Widget _buildTypeChips() {
    final items = ['ALL', ..._types];
    return SizedBox(
      height: 46,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.only(top: 10),
        itemCount: items.length,
        separatorBuilder: (_, _) => const SizedBox(width: 8),
        itemBuilder: (_, i) {
          final value = items[i];
          final selected = value == _type;
          return ChoiceChip(
            label: Text(value == 'ALL' ? 'Tất cả' : tourTypeLabel(value)),
            selected: selected,
            onSelected: (_) => setState(() => _type = value),
            showCheckmark: false,
            selectedColor: AppCultureColors.heritageJade,
            backgroundColor: Colors.white,
            side: BorderSide(
              color: selected
                  ? AppCultureColors.heritageJade
                  : AppCultureColors.border,
            ),
            labelStyle: TextStyle(
              fontSize: 12.5,
              fontWeight: FontWeight.w700,
              color: selected ? Colors.white : AppCultureColors.textDark,
            ),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(20),
            ),
          );
        },
      ),
    );
  }

  Widget _buildTourCard(TourModel tour) {
    final style = TourStyle.of(tour.tourType);
    final owned = _owned.contains(tour.id);
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: AppCultureColors.border),
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => _openTour(tour),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            TourCover(
              height: tour.coverImageUrl != null ? 168 : 112,
              imageUrl: tour.coverImageUrl,
              colors: style.colors,
              child: Stack(
                children: [
                  if (tour.coverImageUrl == null)
                    Positioned(
                      right: -6,
                      bottom: -14,
                      child: Icon(
                        style.icon,
                        size: 92,
                        color: Colors.white.withValues(alpha: 0.16),
                      ),
                    ),
                  Row(
                    children: [
                      TourChip(
                        icon: style.icon,
                        label: tour.typeLabel,
                        dark: true,
                      ),
                      const Spacer(),
                      TourChip(
                        icon: Icons.schedule_rounded,
                        label: tour.formattedDuration,
                        dark: true,
                      ),
                    ],
                  ),
                  Align(
                    alignment: Alignment.bottomLeft,
                    child: TourChip(
                      icon: Icons.place_rounded,
                      label: '${tour.destinationCount} điểm đến',
                      dark: true,
                    ),
                  ),
                  if (owned)
                    const Align(
                      alignment: Alignment.bottomRight,
                      child: _OwnedChip(),
                    ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 4),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    tour.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 17,
                      height: 1.25,
                      fontWeight: FontWeight.w700,
                      color: AppCultureColors.textDark,
                    ),
                  ),
                  if (tour.destinations.isNotEmpty) ...[
                    const SizedBox(height: 6),
                    Text(
                      tour.routePreview,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 12.5,
                        height: 1.4,
                        color: AppCultureColors.textMuted,
                      ),
                    ),
                  ],
                  if (tour.hasRewards) ...[
                    const SizedBox(height: 10),
                    TourRewardStrip(
                      taskCount: tour.taskCount,
                      points: tour.totalTaskPoints,
                      badgeCount: tour.badgeCount,
                    ),
                  ],
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 10, 16, 16),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Giá trọn gói tour',
                          style: TextStyle(
                            fontSize: 11.5,
                            color: AppCultureColors.textMuted,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          tour.formattedPrice,
                          style: const TextStyle(
                            fontSize: 19,
                            fontWeight: FontWeight.w700,
                            color: AppCultureColors.jadeDark,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 10),
                  FilledButton.icon(
                    onPressed: () => _openTour(tour),
                    icon: const Icon(Icons.arrow_forward_rounded, size: 18),
                    label: const Text(
                      'Xem tour',
                      style: TextStyle(fontWeight: FontWeight.w700),
                    ),
                    style: FilledButton.styleFrom(
                      backgroundColor: AppCultureColors.heritageJade,
                      minimumSize: const Size(0, 46),
                      padding: const EdgeInsets.symmetric(horizontal: 18),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Nhãn vàng trên ảnh bìa: du khách đã có vé tour này (xem ở "Tour của tôi").
class _OwnedChip extends StatelessWidget {
  const _OwnedChip();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: const Color(0xFFFDE68A),
        borderRadius: BorderRadius.circular(20),
      ),
      child: const Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.confirmation_number_rounded, size: 13, color: AppCultureColors.rewardText),
          SizedBox(width: 5),
          Text(
            'Đã có vé',
            style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: AppCultureColors.rewardText),
          ),
        ],
      ),
    );
  }
}
