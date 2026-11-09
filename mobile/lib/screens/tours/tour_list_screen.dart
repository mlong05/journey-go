import 'dart:async';
import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/models/booking_model.dart' show BookingStatus;
import '../../core/models/tour_model.dart';
import '../../core/services/api_client.dart';
import '../../core/services/catalog_service.dart';
import '../../core/services/progress_service.dart';
import '../../core/services/tour_service.dart';
import '../rewards/rewards_widgets.dart' show RewardsMessageView, RewardsSkeletonList;
import 'tour_cards.dart';
import 'tour_detail_screen.dart';

/// Mở màn chi tiết tour; dùng chung cho trang chủ, danh sách và các nơi khác.
Future<void> openTourDetail(BuildContext context, TourModel tour) {
  return Navigator.of(context).push(MaterialPageRoute(builder: (_) => TourDetailScreen(tour: tour)));
}

/// Mở danh sách tour với bộ lọc ban đầu (từ ô tìm kiếm, chip chủ đề, "Xem tất cả"...).
Future<void> openTourList(
  BuildContext context, {
  TourFilter filter = const TourFilter(),
  String? title,
  bool focusSearch = false,
}) {
  return Navigator.of(context).push(
    MaterialPageRoute(builder: (_) => TourListScreen(initialFilter: filter, title: title, focusSearch: focusSearch)),
  );
}

/// Danh sách tour đã xuất bản: tìm kiếm, bộ lọc (vùng miền, chủ đề, hình thức, sắp xếp), cuộn để tải thêm.
class TourListScreen extends StatefulWidget {
  final TourFilter initialFilter;
  final String? title;
  final bool focusSearch;

  const TourListScreen({super.key, this.initialFilter = const TourFilter(), this.title, this.focusSearch = false});

  @override
  State<TourListScreen> createState() => _TourListScreenState();
}

class _TourListScreenState extends State<TourListScreen> {
  static const _pageSize = 20;

  final TourService _service = TourService();
  final CatalogService _catalog = CatalogService();
  late final TextEditingController _search = TextEditingController(text: widget.initialFilter.query ?? '');
  final ScrollController _scroll = ScrollController();
  Timer? _debounce;

  late TourFilter _filter = widget.initialFilter;
  List<CatalogItem> _regions = const [];
  List<CatalogItem> _themes = const [];
  Set<int> _owned = const {};

  final List<TourModel> _tours = [];
  int _page = 0;
  bool _last = false;
  bool _loading = true;
  bool _loadingMore = false;
  String? _error;

  /// Mỗi lần đổi bộ lọc tăng lên; kết quả của lần tải cũ về muộn sẽ bị bỏ qua.
  int _generation = 0;

  @override
  void initState() {
    super.initState();
    _scroll.addListener(_onScroll);
    _loadCatalog();
    _loadOwned();
    _reload();
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _search.dispose();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _loadCatalog() async {
    try {
      final results = await Future.wait([_catalog.getRegions(), _catalog.getThemes()]);
      if (mounted) {
        setState(() {
          _regions = results[0];
          _themes = results[1];
        });
      }
    } catch (_) {
      // Không có danh mục thì vẫn tìm được theo từ khóa và hình thức.
    }
  }

  /// Tour du khách đang có vé chưa dùng; lỗi thì coi như chưa có vé.
  Future<void> _loadOwned() async {
    try {
      final tickets = await ProgressService().getTickets();
      final ids = {for (final b in tickets) if (b.status != BookingStatus.completed) b.tourId};
      if (mounted) setState(() => _owned = ids);
    } catch (_) {}
  }

  Future<void> _reload() async {
    final gen = ++_generation;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final page = await _service.searchTours(filter: _filter, page: 0, size: _pageSize);
      if (!mounted || gen != _generation) return;
      setState(() {
        _tours
          ..clear()
          ..addAll(page.tours);
        _page = 0;
        _last = page.last;
        _loading = false;
      });
    } on ApiException catch (e) {
      if (!mounted || gen != _generation) return;
      setState(() {
        _error = e.message;
        _loading = false;
      });
    }
  }

  Future<void> _loadMore() async {
    if (_loadingMore || _last || _loading) return;
    final gen = _generation;
    setState(() => _loadingMore = true);
    try {
      final page = await _service.searchTours(filter: _filter, page: _page + 1, size: _pageSize);
      if (!mounted || gen != _generation) return;
      setState(() {
        _tours.addAll(page.tours);
        _page++;
        _last = page.last;
      });
    } on ApiException {
      // Giữ danh sách đã có; cuộn lại sẽ thử tiếp.
    } finally {
      if (mounted && gen == _generation) setState(() => _loadingMore = false);
    }
  }

  void _onScroll() {
    if (_scroll.position.pixels > _scroll.position.maxScrollExtent - 400) _loadMore();
  }

  void _onQueryChanged(String value) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 400), () {
      _filter = TourFilter(
        query: value,
        regionId: _filter.regionId,
        themeId: _filter.themeId,
        format: _filter.format,
        order: _filter.order,
      );
      _reload();
    });
  }

  void _apply(TourFilter filter) {
    setState(() => _filter = filter);
    _reload();
  }

  Future<void> _openFilters() async {
    final result = await showModalBottomSheet<TourFilter>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      backgroundColor: AppCultureColors.surface,
      builder: (_) => _FilterSheet(filter: _filter, regions: _regions, themes: _themes),
    );
    if (result != null) _apply(result);
  }

  Future<void> _open(TourModel tour) async {
    await openTourDetail(context, tour);
    _loadOwned();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppCultureColors.background,
      appBar: AppBar(
        backgroundColor: AppCultureColors.surface,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        titleSpacing: 0,
        title: Text(
          widget.title ?? 'Tất cả tour',
          style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: AppCultureColors.textDark),
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(108),
          child: Column(
            children: [
              _buildSearchRow(),
              _buildQuickChips(),
            ],
          ),
        ),
      ),
      body: _buildBody(),
    );
  }

  Widget _buildSearchRow() {
    final active = _filter.activeCount;
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: _search,
              autofocus: widget.focusSearch,
              textInputAction: TextInputAction.search,
              onChanged: _onQueryChanged,
              decoration: InputDecoration(
                hintText: 'Tìm tour, vùng miền, chủ đề...',
                hintStyle: const TextStyle(fontSize: 14, color: AppCultureColors.textLight),
                prefixIcon: const Icon(Icons.search_rounded, color: AppCultureColors.textMuted),
                suffixIcon: _search.text.isEmpty
                    ? null
                    : IconButton(
                        icon: const Icon(Icons.close_rounded, size: 18),
                        onPressed: () {
                          _search.clear();
                          _onQueryChanged('');
                          setState(() {});
                        },
                      ),
                filled: true,
                fillColor: AppCultureColors.surfaceSubtle,
                isDense: true,
                contentPadding: const EdgeInsets.symmetric(vertical: 12),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
              ),
            ),
          ),
          const SizedBox(width: 8),
          Badge(
            isLabelVisible: active > 0,
            label: Text('$active'),
            backgroundColor: AppCultureColors.heritageJade,
            child: IconButton.filledTonal(
              onPressed: _openFilters,
              tooltip: 'Bộ lọc',
              icon: const Icon(Icons.tune_rounded),
              style: IconButton.styleFrom(
                backgroundColor: AppCultureColors.surfaceSubtle,
                foregroundColor: AppCultureColors.textDark,
                fixedSize: const Size(46, 46),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// Hàng chip lọc nhanh: hình thức tour và bộ lọc đang bật (bấm để bỏ).
  Widget _buildQuickChips() {
    String? nameOf(List<CatalogItem> items, int? id) =>
        id == null ? null : items.where((i) => i.id == id).firstOrNull?.name;
    final region = nameOf(_regions, _filter.regionId);
    final theme = nameOf(_themes, _filter.themeId);

    return SizedBox(
      height: 44,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
        children: [
          for (final (value, label) in const [(null, 'Tất cả'), ('DAY_TRIP', 'Trong ngày'), ('MULTI_DAY', 'Nhiều ngày')])
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: ChoiceChip(
                label: Text(label),
                selected: _filter.format == value,
                onSelected: (_) => _apply(
                  value == null ? _filter.copyWith(clearFormat: true) : _filter.copyWith(format: value),
                ),
                selectedColor: AppCultureColors.jadeLight,
                labelStyle: TextStyle(
                  fontSize: 12.5,
                  fontWeight: FontWeight.w600,
                  color: _filter.format == value ? AppCultureColors.jadeDark : AppCultureColors.textMuted,
                ),
                showCheckmark: false,
                visualDensity: VisualDensity.compact,
              ),
            ),
          if (region != null) _removableChip(region, () => _apply(_filter.copyWith(clearRegion: true))),
          if (theme != null) _removableChip(theme, () => _apply(_filter.copyWith(clearTheme: true))),
          if (_filter.order != TourOrder.newest)
            _removableChip(_filter.order.label, () => _apply(_filter.copyWith(order: TourOrder.newest))),
        ],
      ),
    );
  }

  Widget _removableChip(String label, VoidCallback onRemove) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: InputChip(
        label: Text(label),
        onDeleted: onRemove,
        onPressed: _openFilters,
        backgroundColor: AppCultureColors.oceanLight,
        labelStyle: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: AppCultureColors.oceanDark),
        deleteIconColor: AppCultureColors.oceanDark,
        visualDensity: VisualDensity.compact,
      ),
    );
  }

  Widget _buildBody() {
    if (_loading) return const RewardsSkeletonList(count: 4, itemHeight: 144);
    if (_error != null) {
      return RewardsMessageView(
        icon: Icons.cloud_off_rounded,
        title: 'Không tải được danh sách tour',
        message: _error,
        onRetry: _reload,
      );
    }
    if (_tours.isEmpty) {
      return RewardsMessageView(
        icon: Icons.travel_explore_rounded,
        title: 'Không tìm thấy tour phù hợp',
        message: 'Thử bỏ bớt bộ lọc hoặc tìm bằng từ khóa khác.',
        onRetry: _filter.activeCount > 0 || (_filter.query?.isNotEmpty ?? false)
            ? () {
                _search.clear();
                _apply(const TourFilter());
              }
            : null,
      );
    }
    return RefreshIndicator(
      color: AppCultureColors.heritageJade,
      onRefresh: _reload,
      child: ListView.separated(
        controller: _scroll,
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
        itemCount: _tours.length + 1,
        separatorBuilder: (_, _) => const SizedBox(height: 12),
        itemBuilder: (_, i) {
          if (i == _tours.length) {
            return _loadingMore
                ? const Padding(
                    padding: EdgeInsets.all(12),
                    child: Center(child: CircularProgressIndicator(strokeWidth: 2.4)),
                  )
                : const SizedBox(height: 4);
          }
          final tour = _tours[i];
          return TourListTile(tour: tour, owned: _owned.contains(tour.id), onTap: () => _open(tour));
        },
      ),
    );
  }
}

/// Bảng chọn bộ lọc: vùng miền, chủ đề, hình thức, sắp xếp.
class _FilterSheet extends StatefulWidget {
  final TourFilter filter;
  final List<CatalogItem> regions;
  final List<CatalogItem> themes;

  const _FilterSheet({required this.filter, required this.regions, required this.themes});

  @override
  State<_FilterSheet> createState() => _FilterSheetState();
}

class _FilterSheetState extends State<_FilterSheet> {
  late int? _regionId = widget.filter.regionId;
  late int? _themeId = widget.filter.themeId;
  late String? _format = widget.filter.format;
  late TourOrder _order = widget.filter.order;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: ConstrainedBox(
        constraints: BoxConstraints(maxHeight: MediaQuery.sizeOf(context).height * 0.8),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Padding(
              padding: EdgeInsets.fromLTRB(20, 0, 20, 8),
              child: Text(
                'Bộ lọc',
                style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: AppCultureColors.textDark),
              ),
            ),
            Flexible(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(20, 4, 20, 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _group(
                      'Sắp xếp',
                      [
                        for (final o in TourOrder.values)
                          _chip(o.label, _order == o, () => setState(() => _order = o)),
                      ],
                    ),
                    _group('Hình thức', [
                      _chip('Tất cả', _format == null, () => setState(() => _format = null)),
                      _chip('Trong ngày', _format == 'DAY_TRIP', () => setState(() => _format = 'DAY_TRIP')),
                      _chip('Nhiều ngày', _format == 'MULTI_DAY', () => setState(() => _format = 'MULTI_DAY')),
                    ]),
                    if (widget.regions.isNotEmpty)
                      _group('Vùng miền', [
                        _chip('Tất cả', _regionId == null, () => setState(() => _regionId = null)),
                        for (final r in widget.regions)
                          _chip(r.name, _regionId == r.id, () => setState(() => _regionId = r.id)),
                      ]),
                    if (widget.themes.isNotEmpty)
                      _group('Chủ đề', [
                        _chip('Tất cả', _themeId == null, () => setState(() => _themeId = null)),
                        for (final t in widget.themes)
                          _chip(t.name, _themeId == t.id, () => setState(() => _themeId = t.id)),
                      ]),
                  ],
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 12),
              child: Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => setState(() {
                        _regionId = null;
                        _themeId = null;
                        _format = null;
                        _order = TourOrder.newest;
                      }),
                      style: OutlinedButton.styleFrom(
                        minimumSize: const Size.fromHeight(48),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                      child: const Text('Đặt lại'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    flex: 2,
                    child: FilledButton(
                      onPressed: () => Navigator.of(context).pop(
                        TourFilter(
                          query: widget.filter.query,
                          regionId: _regionId,
                          themeId: _themeId,
                          format: _format,
                          order: _order,
                        ),
                      ),
                      style: FilledButton.styleFrom(
                        backgroundColor: AppCultureColors.heritageJade,
                        minimumSize: const Size.fromHeight(48),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                      child: const Text('Áp dụng', style: TextStyle(fontWeight: FontWeight.w700)),
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

  Widget _group(String title, List<Widget> chips) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppCultureColors.textDark),
          ),
          const SizedBox(height: 8),
          Wrap(spacing: 8, runSpacing: 8, children: chips),
        ],
      ),
    );
  }

  Widget _chip(String label, bool selected, VoidCallback onTap) {
    return ChoiceChip(
      label: Text(label),
      selected: selected,
      onSelected: (_) => onTap(),
      showCheckmark: false,
      selectedColor: AppCultureColors.jadeLight,
      side: BorderSide(color: selected ? AppCultureColors.heritageJade : AppCultureColors.border),
      labelStyle: TextStyle(
        fontSize: 13,
        fontWeight: FontWeight.w600,
        color: selected ? AppCultureColors.jadeDark : AppCultureColors.textMuted,
      ),
    );
  }
}
