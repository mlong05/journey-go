import 'package:flutter/material.dart';
import 'package:flutter/services.dart' show SystemUiOverlayStyle;
import '../../core/constants/app_colors.dart';
import '../../l10n/locale_controller.dart';
import '../../core/models/tour_detail_model.dart';
import '../common/inline_video.dart';
import '../common/no_clip.dart';
import 'tour_cards.dart' show TourMeta, themeIcon;
import 'tour_route_map.dart';
import 'departure_info.dart';
import 'tour_style.dart';

/// Thân trang chi tiết của tour 5 bước: ảnh, thông tin chung, điểm nổi bật, mô tả, lịch trình,
/// các điểm dừng (bản đồ + xem trước), bảng giá, ngày khởi hành, chính sách và liên hệ.
/// Chỉ hiển thị — đặt tour nằm ở thanh dưới của màn chi tiết.
class TourWizardDetailBody extends StatefulWidget {
  final TourDetailModel detail;

  /// Bấm nút "Chat với bên `Tên đối tác`" — mở màn chat hỗ trợ TRƯỚC khi mua tour.
  final VoidCallback? onChatProvider;

  const TourWizardDetailBody({
    super.key,
    required this.detail,
    this.onChatProvider,
  });

  @override
  State<TourWizardDetailBody> createState() => _TourWizardDetailBodyState();
}

class _TourWizardDetailBodyState extends State<TourWizardDetailBody> {
  final Map<int, GlobalKey> _stopKeys = {};
  final Map<String, GlobalKey> _sectionKeys = {};
  final ScrollController _scroll = ScrollController();

  /// Chiều cao ảnh đầu trang khi mở rộng (không tính thanh trạng thái).
  static const double _heroHeight = 330;
  static const double _tabsHeight = 50;

  /// true khi ảnh đầu trang đã cuộn khuất ⇒ thanh trên nền trắng, hiện tên tour.
  bool _collapsed = false;

  /// Mục đang xem (tô đậm trên thanh tab).
  String? _active;

  TourDetailModel get d => widget.detail;

  // Máy chủ ghép ảnh bìa vào đầu `images`; album gồm tối đa 5 ảnh tour riêng (bỏ ảnh bìa).
  List<String> get _album => d.images.where((u) => u != d.coverImageUrl).take(5).toList();

  /// Ảnh trượt ở đầu trang: ảnh bìa + album.
  List<String> get _heroImages => [
        if (d.coverImageUrl != null && d.coverImageUrl!.isNotEmpty) d.coverImageUrl!,
        ..._album,
      ];

  /// Các mục có nội dung ⇒ các tab trên thanh dính.
  List<(String, String)> get _sections {
    final l10n = context.l10n;
    return [
      if (d.highlights.isNotEmpty || _album.isNotEmpty || d.description != null) ('intro', l10n.tdTabIntro),
      if (d.itinerary.isNotEmpty) ('itinerary', l10n.tdTabItinerary),
      if (d.stops.isNotEmpty) ('stops', l10n.tdTabStops),
      if (d.prices.isNotEmpty || d.upcomingDepartureDates.isNotEmpty || d.hasDepartureInfo) ('prices', l10n.tdTabPrices),
      if (d.hasPolicies || d.contactInfo != null) ('notes', l10n.tdTabNotes),
    ];
  }

  bool get _showTabs => _sections.length >= 2;

  /// Mốc vô hình đặt ở đầu mỗi mục để cuộn tới / biết đang xem mục nào.
  Widget _anchor(String id) => SizedBox(key: _sectionKeys.putIfAbsent(id, GlobalKey.new), height: 0);

  /// Mép dưới của phần ghim trên cùng (thanh trạng thái + thanh tiêu đề + thanh tab).
  double get _pinnedBottom =>
      MediaQuery.paddingOf(context).top + kToolbarHeight + (_showTabs ? _tabsHeight : 0);

  double? _topOf(GlobalKey? key) {
    final box = key?.currentContext?.findRenderObject();
    if (box is! RenderBox || !box.attached) return null;
    return box.localToGlobal(Offset.zero).dy;
  }

  @override
  void initState() {
    super.initState();
    _scroll.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scroll.dispose();
    super.dispose();
  }

  void _onScroll() {
    final collapsed = _scroll.offset > _heroHeight - kToolbarHeight - 40;
    String? active;
    for (final (id, _) in _sections) {
      final top = _topOf(_sectionKeys[id]);
      if (top != null && top <= _pinnedBottom + 32) active = id;
    }
    // Cuộn chạm đáy: mục cuối (thường ngắn, không lên tới thanh tab được) là mục đang xem
    if (_scroll.position.pixels >= _scroll.position.maxScrollExtent - 2) active = _sections.lastOrNull?.$1;
    active ??= _sections.firstOrNull?.$1;
    if (collapsed != _collapsed || active != _active) {
      setState(() {
        _collapsed = collapsed;
        _active = active;
      });
    }
  }

  /// Cuộn sao cho [key] nằm ngay dưới phần ghim (không bị thanh tab che).
  void _scrollToKey(GlobalKey? key) {
    final top = _topOf(key);
    if (top == null || !_scroll.hasClients) return;
    final target = (_scroll.offset + top - _pinnedBottom - 4).clamp(0.0, _scroll.position.maxScrollExtent);
    _scroll.animateTo(target, duration: const Duration(milliseconds: 450), curve: Curves.easeOutCubic);
  }

  void _scrollToStop(int stopId) => _scrollToKey(_stopKeys[stopId]);

  void _openSection(String id) {
    setState(() => _active = id);
    _scrollToKey(_sectionKeys[id]);
  }

  @override
  Widget build(BuildContext context) {
    final sections = _sections;
    return CustomScrollView(
      controller: _scroll,
      physics: const AlwaysScrollableScrollPhysics(),
      slivers: [
        SliverAppBar(
          pinned: true,
          expandedHeight: _heroHeight,
          automaticallyImplyLeading: false,
          backgroundColor: Colors.white,
          surfaceTintColor: Colors.transparent,
          elevation: 0,
          scrolledUnderElevation: 0,
          systemOverlayStyle: _collapsed ? SystemUiOverlayStyle.dark : SystemUiOverlayStyle.light,
          leading: Padding(
            padding: const EdgeInsets.all(8),
            child: _RoundIconButton(
              icon: Icons.arrow_back_rounded,
              tooltip: MaterialLocalizations.of(context).backButtonTooltip,
              onTap: () => Navigator.of(context).maybePop(),
              elevated: !_collapsed,
            ),
          ),
          title: AnimatedOpacity(
            opacity: _collapsed ? 1 : 0,
            duration: const Duration(milliseconds: 200),
            child: Text(
              d.title,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppCultureColors.textDark),
            ),
          ),
          flexibleSpace: FlexibleSpaceBar(
            collapseMode: CollapseMode.parallax,
            background: Stack(
              fit: StackFit.expand,
              children: [
                _HeroGallery(images: _heroImages),
                // Mép bo tròn của phần nội dung đè lên ảnh
                Positioned(
                  left: 0,
                  right: 0,
                  bottom: -1,
                  height: 26,
                  child: Container(
                    decoration: const BoxDecoration(
                      color: AppCultureColors.background,
                      borderRadius: BorderRadius.vertical(top: Radius.circular(26)),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 6),
            child: _Overview(detail: d, onChatProvider: widget.onChatProvider),
          ),
        ),
        if (_showTabs)
          SliverPersistentHeader(
            pinned: true,
            delegate: _SectionTabsDelegate(
              height: _tabsHeight,
              sections: sections,
              active: _active ?? sections.first.$1,
              onTap: _openSection,
            ),
          ),
        SliverToBoxAdapter(child: _buildSections()),
      ],
    );
  }

  Widget _buildSections() {
    final located = d.stops.where((s) => s.hasLocation).toList();
    final album = _album;
    final l10n = context.l10n;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (_sections.any((s) => s.$1 == 'intro')) _anchor('intro'),
        if (d.highlights.isNotEmpty) ...[
          _SectionTitle(l10n.tdHighlights),
          _card(Column(
            children: [
              for (final h in d.highlights)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Padding(
                        padding: EdgeInsets.only(top: 1),
                        child: Icon(Icons.check_circle_rounded, size: 18, color: AppCultureColors.heritageJade),
                      ),
                      const SizedBox(width: 8),
                      Expanded(child: Text(h, style: _body)),
                    ],
                  ),
                ),
            ],
          )),
        ],
        if (album.isNotEmpty) ...[
          _SectionTitle(l10n.tdPhotos),
          _PhotoStrip(images: album),
        ],
        if (d.description != null) ...[
          _SectionTitle(l10n.tdTabIntro),
          _card(_ExpandableText(d.description!)),
        ],
        if (d.itinerary.isNotEmpty) ...[
          _anchor('itinerary'),
          _SectionTitle(l10n.tdItineraryDetail),
          _card(
            _ItineraryTimeline(
              days: d.itinerary,
              // Điểm dừng không gắn với ngày ⇒ chỉ tour 1 ngày mới chắc chắn mọi điểm dừng thuộc ngày đó.
              singleDayStops: d.itinerary.length == 1 ? d.stops : const [],
              onOpenStop: (stop) => showStopPreview(context, stop),
            ),
            padding: const EdgeInsets.fromLTRB(14, 16, 14, 4),
          ),
        ],
        if (d.stops.isNotEmpty) ...[
          _anchor('stops'),
          _SectionTitle(l10n.tdStopsTitle(d.stops.length)),
          if (located.isNotEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
              child: TourRouteMap(
                destinations: [for (final s in located) s.toMapPoint()],
                onTapStop: (p) => _scrollToStop(p.destinationId),
              ),
            ),
          for (final (i, stop) in d.stops.indexed)
            Padding(
              key: _stopKeys.putIfAbsent(stop.id, GlobalKey.new),
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
              child: _StopCard(stop: stop, isLast: i == d.stops.length - 1),
            ),
        ],
        if (_sections.any((s) => s.$1 == 'prices')) _anchor('prices'),
        if (d.prices.isNotEmpty) ...[
          _SectionTitle(l10n.tdPriceTable),
          _card(Column(
            children: [
              for (final (i, p) in d.prices.indexed) ...[
                if (i > 0) const Divider(height: 18, color: AppCultureColors.borderLight),
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(p.localizedLabel(l10n), style: _bodyStrong),
                          if (p.ageRange.isNotEmpty)
                            Text(p.ageRange, style: const TextStyle(fontSize: 12, color: AppCultureColors.textMuted)),
                        ],
                      ),
                    ),
                    Text(
                      p.formattedPrice,
                      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: AppCultureColors.price),
                    ),
                  ],
                ),
              ],
              if (d.maxGuestsPerSlot != null) ...[
                const SizedBox(height: 12),
                TourMeta(icon: Icons.groups_rounded, text: l10n.tdMaxGuests(d.maxGuestsPerSlot!)),
              ],
            ],
          )),
        ],
        if (d.upcomingDepartureDates.isNotEmpty || d.hasDepartureInfo) _SectionTitle(l10n.tdDepartures),
        if (d.hasDepartureInfo) ...[
          _card(DepartureInfoList(
            departureTime: d.departureTime,
            meetingPoint: d.meetingPoint,
            pickupInfo: d.pickupInfo,
          )),
          if (d.upcomingDepartureDates.isNotEmpty) const SizedBox(height: 12),
        ],
        if (d.upcomingDepartureDates.isNotEmpty) ...[
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final date in d.upcomingDepartureDates.take(12)) _DateChip(date: date),
                if (d.upcomingDepartureDates.length > 12)
                  Chip(
                    label: Text(l10n.tdMoreDates(d.upcomingDepartureDates.length - 12)),
                    visualDensity: VisualDensity.compact,
                  ),
              ],
            ),
          ),
        ],
        if (_sections.any((s) => s.$1 == 'notes')) _anchor('notes'),
        if (d.hasPolicies) ...[
          _SectionTitle(l10n.tdNotes),
          _card(Column(
            children: [
              if (d.priceIncludes != null)
                _PolicyTile(icon: Icons.add_task_rounded, title: l10n.tdPriceIncludes, text: d.priceIncludes!),
              if (d.priceExcludes != null)
                _PolicyTile(icon: Icons.remove_circle_outline_rounded, title: l10n.tdPriceExcludes, text: d.priceExcludes!),
              if (d.cancellationPolicy != null)
                _PolicyTile(icon: Icons.event_busy_rounded, title: l10n.tdCancellationPolicy, text: d.cancellationPolicy!),
              if (d.refundPolicy != null)
                _PolicyTile(icon: Icons.currency_exchange_rounded, title: l10n.tdRefundPolicy, text: d.refundPolicy!),
              if (d.forceMajeure != null)
                _PolicyTile(icon: Icons.thunderstorm_rounded, title: l10n.tdForceMajeure, text: d.forceMajeure!),
            ],
          ), padding: const EdgeInsets.symmetric(vertical: 4)),
        ],
        if (d.contactInfo != null) ...[
          _SectionTitle(l10n.tdContact),
          _card(Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(Icons.support_agent_rounded, color: AppCultureColors.oceanBlue),
              const SizedBox(width: 10),
              Expanded(child: SelectableText(d.contactInfo!, style: _body)),
            ],
          )),
        ],
        const SizedBox(height: 32),
      ],
    );
  }

  Widget _card(Widget child, {EdgeInsetsGeometry padding = const EdgeInsets.all(14)}) {
    // Material (không phải Container tô nền) để hiệu ứng chạm của ExpansionTile bên trong hiện được
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Material(
        color: Colors.white,
        elevation: 0,
        clipBehavior: Clip.antiAlias,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(18),
          side: const BorderSide(color: AppCultureColors.borderLight),
        ),
        child: Padding(padding: padding, child: child),
      ),
    );
  }
}

const _body = TextStyle(fontSize: 14, height: 1.5, color: AppCultureColors.textDark);
const _bodyStrong = TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppCultureColors.textDark);

class _SectionTitle extends StatelessWidget {
  final String text;
  const _SectionTitle(this.text);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 24, 16, 10),
      child: Row(
        children: [
          Container(
            width: 4,
            height: 16,
            decoration: BoxDecoration(color: AppCultureColors.heritageJade, borderRadius: BorderRadius.circular(2)),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppCultureColors.textDark),
            ),
          ),
        ],
      ),
    );
  }
}

/// Ảnh đầu trang tràn viền: ảnh bìa + album vuốt ngang, bộ đếm "1/6"; bấm để xem toàn màn hình.
/// Không có ảnh nào thì nền gradient xanh ngọc kèm biểu tượng.
class _HeroGallery extends StatefulWidget {
  final List<String> images;
  const _HeroGallery({required this.images});

  @override
  State<_HeroGallery> createState() => _HeroGalleryState();
}

class _HeroGalleryState extends State<_HeroGallery> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    final images = widget.images;
    if (images.isEmpty) {
      final style = TourStyle.of('CULTURAL');
      return DecoratedBox(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: AppCultureColors.brandGradient,
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: Icon(style.icon, size: 72, color: Colors.white.withValues(alpha: 0.45)),
      );
    }
    return Stack(
      fit: StackFit.expand,
      children: [
        PageView.builder(
          itemCount: images.length,
          onPageChanged: (i) => setState(() => _index = i),
          itemBuilder: (_, i) => GestureDetector(
            onTap: () => _openPhotoViewer(context, images, i),
            child: Image.network(
              images[i],
              fit: BoxFit.cover,
              errorBuilder: (_, _, _) => const ColoredBox(color: AppCultureColors.surfaceSubtle),
            ),
          ),
        ),
        // Phủ tối nhẹ phía trên để nút quay lại và giờ hệ thống luôn rõ
        const IgnorePointer(
          child: DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [Color(0x59000000), Color(0x00000000), Color(0x00000000), Color(0x33000000)],
                stops: [0.0, 0.28, 0.7, 1.0],
              ),
            ),
          ),
        ),
        if (images.length > 1)
          Positioned(
            right: 14,
            bottom: 38,
            child: IgnorePointer(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(color: const Color(0x99000000), borderRadius: BorderRadius.circular(12)),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.photo_library_rounded, size: 13, color: Colors.white),
                    const SizedBox(width: 5),
                    Text(
                      '${_index + 1}/${images.length}',
                      style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w700),
                    ),
                  ],
                ),
              ),
            ),
          ),
      ],
    );
  }
}

/// Nút tròn trắng nổi trên ảnh (quay lại...). [elevated]: còn nằm trên ảnh ⇒ có bóng để tách nền.
class _RoundIconButton extends StatelessWidget {
  final IconData icon;
  final String tooltip;
  final VoidCallback onTap;
  final bool elevated;

  const _RoundIconButton({required this.icon, required this.tooltip, required this.onTap, this.elevated = true});

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: tooltip,
      child: Material(
        color: elevated ? Colors.white.withValues(alpha: 0.92) : AppCultureColors.surfaceSubtle,
        shape: const CircleBorder(),
        elevation: elevated ? 2 : 0,
        shadowColor: const Color(0x33000000),
        child: InkWell(
          customBorder: const CircleBorder(),
          onTap: onTap,
          child: Icon(icon, size: 22, color: AppCultureColors.textDark),
        ),
      ),
    );
  }
}

/// Thanh tab dính dưới thanh tiêu đề: bấm để cuộn tới mục; mục đang xem có gạch chân xanh ngọc.
class _SectionTabsDelegate extends SliverPersistentHeaderDelegate {
  final double height;
  final List<(String, String)> sections;
  final String active;
  final ValueChanged<String> onTap;

  _SectionTabsDelegate({required this.height, required this.sections, required this.active, required this.onTap});

  @override
  double get minExtent => height;

  @override
  double get maxExtent => height;

  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) {
    return Container(
      decoration: BoxDecoration(
        color: AppCultureColors.background,
        border: Border(
          bottom: BorderSide(color: overlapsContent || shrinkOffset > 0 ? AppCultureColors.border : AppCultureColors.borderLight),
        ),
      ),
      child: _SectionTabs(sections: sections, active: active, onTap: onTap),
    );
  }

  @override
  bool shouldRebuild(_SectionTabsDelegate old) =>
      old.active != active || old.sections.length != sections.length || old.height != height;
}

/// Hàng tab cuộn ngang; khi mục đang xem đổi thì tự cuộn để tab đó luôn nằm trong khung.
class _SectionTabs extends StatefulWidget {
  final List<(String, String)> sections;
  final String active;
  final ValueChanged<String> onTap;

  const _SectionTabs({required this.sections, required this.active, required this.onTap});

  @override
  State<_SectionTabs> createState() => _SectionTabsState();
}

class _SectionTabsState extends State<_SectionTabs> {
  final Map<String, GlobalKey> _keys = {};
  final ScrollController _controller = ScrollController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  void didUpdateWidget(covariant _SectionTabs old) {
    super.didUpdateWidget(old);
    if (old.active != widget.active) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _centerActive());
    }
  }

  /// Chỉ cuộn NGANG hàng tab (không dùng Scrollable.ensureVisible: nó cuộn cả trang dọc,
  /// làm hỏng thao tác cuộn tới mục vừa bấm).
  void _centerActive() {
    if (!mounted || !_controller.hasClients) return;
    final tab = _keys[widget.active]?.currentContext?.findRenderObject();
    final bar = context.findRenderObject();
    if (tab is! RenderBox || bar is! RenderBox || !tab.attached) return;
    final left = tab.localToGlobal(Offset.zero, ancestor: bar).dx;
    final target = _controller.offset + left - (bar.size.width - tab.size.width) / 2;
    _controller.animateTo(
      target.clamp(0.0, _controller.position.maxScrollExtent),
      duration: const Duration(milliseconds: 250),
      curve: Curves.easeOut,
    );
  }

  @override
  Widget build(BuildContext context) {
    final active = widget.active;
    return SingleChildScrollView(
      controller: _controller,
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 8),
      child: Row(
        children: [
          for (final (id, label) in widget.sections)
            Semantics(
              key: _keys.putIfAbsent(id, GlobalKey.new),
              button: true,
              selected: id == active,
              child: InkWell(
                onTap: () => widget.onTap(id),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 10),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Spacer(),
                      Text(
                        label,
                        style: TextStyle(
                          fontSize: 14.5,
                          fontWeight: id == active ? FontWeight.w800 : FontWeight.w600,
                          color: id == active ? AppCultureColors.heritageJade : AppCultureColors.textMuted,
                        ),
                      ),
                      const Spacer(),
                      AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        height: 3,
                        width: id == active ? 28 : 0,
                        decoration: BoxDecoration(
                          color: AppCultureColors.brand,
                          borderRadius: BorderRadius.circular(2),
                        ),
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
}

/// Xem ảnh toàn màn hình (vuốt qua lại, phóng to).
void _openPhotoViewer(BuildContext context, List<String> images, int initial) {
  Navigator.of(context).push(MaterialPageRoute(
    fullscreenDialog: true,
    builder: (_) => Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(backgroundColor: Colors.black, foregroundColor: Colors.white),
      body: PageView.builder(
        controller: PageController(initialPage: initial),
        itemCount: images.length,
        itemBuilder: (_, i) => InteractiveViewer(
          child: Center(child: Image.network(images[i], errorBuilder: (_, _, _) => const SizedBox.shrink())),
        ),
      ),
    ),
  ));
}

/// Dải ảnh nhỏ vuốt ngang để thấy cả album ngay trên trang; bấm ảnh để xem toàn màn hình.
class _PhotoStrip extends StatelessWidget {
  final List<String> images;
  const _PhotoStrip({required this.images});

  /// Ảnh lớn kéo ngang (như thẻ ảnh); bấm ảnh để xem toàn màn hình (vuốt qua lại).
  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 100,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: images.length,
        separatorBuilder: (_, _) => const SizedBox(width: 10),
        itemBuilder: (_, i) => GestureDetector(
          onTap: () => _openPhotoViewer(context, images, i),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(14),
            child: Image.network(
              images[i],
              width: 132,
              height: 100,
              fit: BoxFit.cover,
              errorBuilder: (_, _, _) => Container(width: 132, color: AppCultureColors.surfaceSubtle),
            ),
          ),
        ),
      ),
    );
  }
}

/// Tên tour, nhãn (vùng miền, chủ đề, thời lượng, số điểm dừng), đơn vị cung cấp và phần thưởng.
class _Overview extends StatelessWidget {
  final TourDetailModel detail;
  final VoidCallback? onChatProvider;
  const _Overview({required this.detail, this.onChatProvider});

  @override
  Widget build(BuildContext context) {
    final d = detail;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          d.title,
          style: const TextStyle(fontSize: 23, height: 1.25, fontWeight: FontWeight.w800, letterSpacing: -0.3, color: AppCultureColors.textDark),
        ),
        const SizedBox(height: 10),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            if (d.regionName != null) _InfoPill(icon: Icons.place_rounded, label: d.regionName!),
            if (d.themeName != null) _InfoPill(icon: themeIcon(d.themeName!), label: d.themeName!),
            _InfoPill(icon: Icons.schedule_rounded, label: d.formattedDuration),
            if (d.stops.isNotEmpty) _InfoPill(icon: Icons.route_rounded, label: context.l10n.tourDestinationStops(d.stops.length)),
          ],
        ),
        if (d.providerName != null) ...[
          const SizedBox(height: 10),
          Row(
            children: [
              const Icon(Icons.verified_rounded, size: 16, color: AppCultureColors.oceanBlue),
              const SizedBox(width: 5),
              Expanded(
                child: Text(
                  context.l10n.tdProvidedBy(d.providerName!),
                  style: const TextStyle(fontSize: 12.5, color: AppCultureColors.textMuted),
                ),
              ),
            ],
          ),
          // Chat với nhà tour — TRƯỚC khi mua tour (du khách chưa đặt vé vẫn hỏi được).
          const SizedBox(height: 10),
          _ProviderChatButton(
            providerName: d.providerName!,
            onTap: onChatProvider,
          ),
        ],
        if (d.taskCount > 0 || d.totalPoints > 0) ...[
          const SizedBox(height: 12),
          TourRewardStrip(taskCount: d.taskCount, points: d.totalPoints, badgeCount: 0),
        ],
      ],
    );
  }
}

/// Nút "Chat với bên `Tên đối tác`" — mở màn chat hỗ trợ với nhà tour TRƯỚC khi mua tour.
class _ProviderChatButton extends StatelessWidget {
  final String providerName;
  final VoidCallback? onTap;

  const _ProviderChatButton({required this.providerName, this.onTap});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppCultureColors.oceanLight,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
          child: Row(
            children: [
              const Icon(
                Icons.chat_rounded,
                size: 18,
                color: AppCultureColors.oceanDark,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  context.l10n.tdChatWithProvider(providerName),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: AppCultureColors.oceanDark,
                  ),
                ),
              ),
              const Icon(
                Icons.chevron_right_rounded,
                size: 18,
                color: AppCultureColors.oceanBlue,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _InfoPill extends StatelessWidget {
  final IconData icon;
  final String label;
  const _InfoPill({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(color: AppCultureColors.jadeLight, borderRadius: BorderRadius.circular(20)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: AppCultureColors.jadeDark),
          const SizedBox(width: 5),
          Text(label, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: AppCultureColors.jadeDark)),
        ],
      ),
    );
  }
}

/// Đoạn văn dài: hiện 5 dòng đầu, bấm "Xem thêm" để mở hết.
class _ExpandableText extends StatefulWidget {
  final String text;
  const _ExpandableText(this.text);

  @override
  State<_ExpandableText> createState() => _ExpandableTextState();
}

class _ExpandableTextState extends State<_ExpandableText> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(builder: (context, box) {
      final painter = TextPainter(
        text: TextSpan(text: widget.text, style: _body),
        maxLines: 5,
        textDirection: TextDirection.ltr,
      )..layout(maxWidth: box.maxWidth);
      final overflow = painter.didExceedMaxLines;
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            widget.text,
            style: _body,
            maxLines: _expanded ? null : 5,
            overflow: _expanded ? TextOverflow.visible : TextOverflow.ellipsis,
          ),
          if (overflow)
            TextButton(
              onPressed: () => setState(() => _expanded = !_expanded),
              style: TextButton.styleFrom(
                padding: EdgeInsets.zero,
                minimumSize: const Size(0, 32),
                foregroundColor: AppCultureColors.heritageJade,
              ),
              child: Text(
                _expanded ? context.l10n.commonShowLess : context.l10n.commonShowMore,
                style: const TextStyle(fontWeight: FontWeight.w700),
              ),
            ),
        ],
      );
    });
  }
}

/// Lịch trình dạng dòng thời gian: mỗi ngày là một chấm xanh ngọc nối bằng đường dọc,
/// bên phải là "Ngày N" + tiêu đề, hoạt động chính, nội dung (dài thì "Xem thêm").
/// Tour 1 ngày: kèm dải ảnh các điểm dừng (bấm để xem trước).
class _ItineraryTimeline extends StatelessWidget {
  final List<TourItineraryDay> days;
  final List<TourStopModel> singleDayStops;
  final ValueChanged<TourStopModel> onOpenStop;

  const _ItineraryTimeline({required this.days, required this.singleDayStops, required this.onOpenStop});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        for (final (i, day) in days.indexed)
          // Stack (không dùng IntrinsicHeight vì nội dung có LayoutBuilder): đường dọc nối tới ngày sau
          Stack(
            children: [
              if (i < days.length - 1)
                Positioned(
                  left: 10,
                  top: 22,
                  bottom: 2,
                  child: Container(width: 2, color: AppCultureColors.jade100),
                ),
              Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SizedBox(
                  width: 22,
                  child: Column(
                    children: [
                      const SizedBox(height: 3),
                      Container(
                        width: 14,
                        height: 14,
                        decoration: BoxDecoration(
                          color: AppCultureColors.brand,
                          shape: BoxShape.circle,
                          border: Border.all(color: AppCultureColors.jadeLight, width: 3),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.only(bottom: 18),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text.rich(
                          TextSpan(
                            children: [
                              TextSpan(
                                text: context.l10n.tdDayN(day.dayNumber),
                                style: const TextStyle(color: AppCultureColors.heritageJade, fontWeight: FontWeight.w800),
                              ),
                              if (day.title != null && day.title!.trim().isNotEmpty)
                                TextSpan(text: '  ·  ${day.title}'),
                            ],
                          ),
                          style: const TextStyle(fontSize: 15, height: 1.35, fontWeight: FontWeight.w700, color: AppCultureColors.textDark),
                        ),
                        if (day.mainActivity != null) ...[
                          const SizedBox(height: 6),
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Padding(
                                padding: EdgeInsets.only(top: 2),
                                child: Icon(Icons.flag_rounded, size: 15, color: AppCultureColors.coralDark),
                              ),
                              const SizedBox(width: 6),
                              Expanded(
                                child: Text(day.mainActivity!,
                                    style: const TextStyle(fontSize: 13.5, height: 1.4, fontWeight: FontWeight.w600, color: AppCultureColors.textDark)),
                              ),
                            ],
                          ),
                        ],
                        if (day.content != null) ...[
                          const SizedBox(height: 6),
                          _ExpandableText(day.content!),
                        ],
                        if (singleDayStops.isNotEmpty) ...[
                          const SizedBox(height: 10),
                          SizedBox(
                            height: 92,
                            child: ListView.separated(
                              scrollDirection: Axis.horizontal,
                              itemCount: singleDayStops.length,
                              separatorBuilder: (_, _) => const SizedBox(width: 8),
                              itemBuilder: (_, k) => _StopThumb(stop: singleDayStops[k], onTap: () => onOpenStop(singleDayStops[k])),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              ],
            ),
            ],
          ),
      ],
    );
  }
}

/// Ảnh nhỏ một điểm dừng (tên đè dưới ảnh) cho dòng thời gian lịch trình.
class _StopThumb extends StatelessWidget {
  final TourStopModel stop;
  final VoidCallback onTap;
  const _StopThumb({required this.stop, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: SizedBox(
          width: 112,
          child: Stack(
            fit: StackFit.expand,
            children: [
              if (stop.imageUrl == null)
                const DecoratedBox(
                  decoration: BoxDecoration(gradient: LinearGradient(colors: AppCultureColors.brandGradient)),
                  child: Icon(Icons.place_rounded, color: Colors.white70),
                )
              else
                Image.network(stop.imageUrl!, fit: BoxFit.cover,
                    errorBuilder: (_, _, _) => const ColoredBox(color: AppCultureColors.surfaceSubtle)),
              const DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [Color(0x00000000), Color(0xB3000000)],
                    stops: [0.45, 1.0],
                  ),
                ),
              ),
              Positioned(
                left: 7,
                right: 7,
                bottom: 6,
                child: Text(
                  '${stop.sequenceOrder}. ${stop.name}',
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: Colors.white, fontSize: 11.5, height: 1.2, fontWeight: FontWeight.w700),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Thẻ một điểm dừng; bấm để xem trước nội dung văn hoá, hiện vật và hoạt động.
class _StopCard extends StatelessWidget {
  final TourStopModel stop;
  final bool isLast;
  const _StopCard({required this.stop, required this.isLast});

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final stats = <String>[
      if (stop.quizCount > 0) l10n.tdQuizCount(stop.quizCount),
      if (stop.activities.isNotEmpty) l10n.tdActivityCount(stop.activities.length),
      if (stop.maxPoints > 0) l10n.rewardMaxPoints('${stop.maxPoints}'),
    ];
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(18),
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: () => showStopPreview(context, stop),
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: AppCultureColors.border),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Stack(
                clipBehavior: Clip.none,
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: SizedBox(
                      width: 84,
                      height: 84,
                      child: stop.imageUrl == null
                          ? Container(
                              color: AppCultureColors.jadeLight,
                              child: const Icon(Icons.place_rounded, color: AppCultureColors.heritageJade, size: 32),
                            )
                          : Image.network(
                              stop.imageUrl!,
                              fit: BoxFit.cover,
                              errorBuilder: (_, _, _) => Container(color: AppCultureColors.surfaceSubtle),
                            ),
                    ),
                  ),
                  Positioned(
                    left: -6,
                    top: -6,
                    child: CircleAvatar(
                      radius: 13,
                      backgroundColor: isLast ? AppCultureColors.gold : AppCultureColors.heritageJade,
                      child: isLast
                          ? const Icon(Icons.flag_rounded, size: 14, color: Colors.white)
                          : Text(
                              '${stop.sequenceOrder}',
                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Colors.white),
                            ),
                    ),
                  ),
                ],
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(stop.name, maxLines: 2, overflow: TextOverflow.ellipsis, style: _bodyStrong),
                    if (stop.shortDescription != null) ...[
                      const SizedBox(height: 3),
                      Text(
                        stop.shortDescription!,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 12.5, height: 1.35, color: AppCultureColors.textMuted),
                      ),
                    ],
                    if (stats.isNotEmpty) ...[
                      const SizedBox(height: 6),
                      TourMeta(icon: Icons.stars_rounded, text: stats.join(' · '), color: AppCultureColors.amberDark),
                    ],
                  ],
                ),
              ),
              const Icon(Icons.chevron_right_rounded, color: AppCultureColors.textLight),
            ],
          ),
        ),
      ),
    );
  }
}

/// Bảng xem trước điểm dừng: ảnh, mô tả, lưu ý, câu chuyện văn hoá, hiện vật, hoạt động.
Future<void> showStopPreview(BuildContext context, TourStopModel stop) {
  final l10n = context.l10n;
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    backgroundColor: AppCultureColors.surface,
    builder: (ctx) => DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.75,
      maxChildSize: 0.95,
      builder: (_, controller) => ListView(
        controller: controller,
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 28),
        children: [
          Text(
            l10n.tdStopN(stop.sequenceOrder),
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppCultureColors.heritageJade),
          ),
          const SizedBox(height: 2),
          Text(stop.name, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: AppCultureColors.textDark)),
          if (stop.imageUrl != null) ...[
            const SizedBox(height: 12),
            ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: AspectRatio(
                aspectRatio: 16 / 9,
                child: Image.network(stop.imageUrl!, fit: BoxFit.cover,
                    errorBuilder: (_, _, _) => Container(color: AppCultureColors.surfaceSubtle)),
              ),
            ),
          ],
          if (stop.shortDescription != null) ...[
            const SizedBox(height: 12),
            Text(stop.shortDescription!, style: _body),
          ],
          if (stop.guestNote != null) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppCultureColors.rewardBg,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppCultureColors.rewardBorder),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.info_rounded, size: 18, color: AppCultureColors.amberDark),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(stop.guestNote!,
                        style: const TextStyle(fontSize: 13, height: 1.45, color: AppCultureColors.rewardText)),
                  ),
                ],
              ),
            ),
          ],
          if (stop.videoUrl != null) ...[
            const SizedBox(height: 16),
            Text(l10n.tdIntroVideo, style: _bodyStrong),
            const SizedBox(height: 8),
            // Phát ngay trong app (YouTube nhúng, MP4 / video tải lên qua video_player)
            InlineVideo(url: stop.videoUrl!),
          ],
          if (stop.culturalContent != null || stop.culturalImages.isNotEmpty) ...[
            const SizedBox(height: 20),
            Text(l10n.tdCulturalStory, style: _bodyStrong),
            const SizedBox(height: 6),
            if (stop.culturalContent != null) Text(stop.culturalContent!, style: _body),
            if (stop.culturalImages.isNotEmpty) ...[
              const SizedBox(height: 10),
              PhotoGridPreview(
                images: stop.culturalImages,
                columns: 3,
                maxCells: 3,
                onOpen: (i) => _openPhotoViewer(context, stop.culturalImages, i),
              ),
            ],
          ],
          // API công khai không trả nội dung văn hoá: chỉ giới thiệu những gì sẽ mở khi check-in
          if (stop.culturalContent == null &&
              stop.culturalImages.isEmpty &&
              stop.artifacts.isEmpty &&
              (stop.hasCulturalStory || stop.culturalImageTotal > 0 || stop.artifactTotal > 0)) ...[
            const SizedBox(height: 20),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppCultureColors.surfaceSubtle,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppCultureColors.border),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.lock_outline_rounded, color: AppCultureColors.lacquer),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(l10n.tdCulturalContent, style: AppType.display(size: 15)),
                        const SizedBox(height: 3),
                        Text(
                          [
                            if (stop.hasCulturalStory) l10n.tdStoryLabel,
                            if (stop.culturalImageTotal > 0) l10n.tdArchivePhotos(stop.culturalImageTotal),
                            if (stop.artifactTotal > 0) l10n.tdArtifactCount(stop.artifactTotal),
                          ].join(' · '),
                          style: const TextStyle(fontSize: 12.5, color: AppCultureColors.textMuted),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          l10n.tdUnlockOnCheckIn,
                          style: const TextStyle(fontSize: 12.5, height: 1.4, color: AppCultureColors.textMuted),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
          if (stop.artifacts.isNotEmpty) ...[
            const SizedBox(height: 20),
            Text(l10n.tdArtifacts, style: _bodyStrong),
            const SizedBox(height: 8),
            for (final a in stop.artifacts)
              Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(10),
                      child: SizedBox(
                        width: 56,
                        height: 56,
                        child: a.imageUrl == null
                            ? Container(
                                color: AppCultureColors.surfaceSubtle,
                                child: const Icon(Icons.museum_rounded, color: AppCultureColors.textLight),
                              )
                            : Image.network(a.imageUrl!, fit: BoxFit.cover,
                                errorBuilder: (_, _, _) => Container(color: AppCultureColors.surfaceSubtle)),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(a.name, style: _bodyStrong),
                          if (a.shortDescription != null)
                            Text(a.shortDescription!,
                                style: const TextStyle(fontSize: 12.5, height: 1.4, color: AppCultureColors.textMuted)),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
          ],
          if (stop.quizCount > 0 || stop.activities.isNotEmpty) ...[
            const SizedBox(height: 20),
            Text(l10n.tdChallenges, style: _bodyStrong),
            const SizedBox(height: 8),
            if (stop.quizCount > 0)
              _ChallengeRow(
                icon: Icons.quiz_rounded,
                title: l10n.tdCulturalQuiz,
                subtitle: l10n.tdQuizQuestions(stop.quizCount),
              ),
            for (final a in stop.activities)
              _ChallengeRow(
                icon: Icons.directions_walk_rounded,
                title: a.name,
                subtitle: [
                  if (a.formattedDuration != null) a.formattedDuration!,
                  l10n.tdScanQrToConfirm,
                ].join(' · '),
                points: a.points,
              ),
          ],
        ],
      ),
    ),
  );
}

class _ChallengeRow extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final int points;
  const _ChallengeRow({required this.icon, required this.title, required this.subtitle, this.points = 0});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: AppCultureColors.surfaceSubtle, borderRadius: BorderRadius.circular(14)),
      child: Row(
        children: [
          Icon(icon, color: AppCultureColors.oceanBlue),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: AppCultureColors.textDark)),
                Text(subtitle, style: const TextStyle(fontSize: 12, color: AppCultureColors.textMuted)),
              ],
            ),
          ),
          if (points > 0)
            Text('+$points', style: const TextStyle(fontWeight: FontWeight.w800, color: AppCultureColors.amberDark)),
        ],
      ),
    );
  }
}

class _PolicyTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String text;
  const _PolicyTile({required this.icon, required this.title, required this.text});

  @override
  Widget build(BuildContext context) {
    return Theme(
      data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
      child: ExpansionTile(
        tilePadding: const EdgeInsets.symmetric(horizontal: 14),
        childrenPadding: const EdgeInsets.fromLTRB(14, 0, 14, 12),
        expandedCrossAxisAlignment: CrossAxisAlignment.start,
        leading: Icon(icon, color: AppCultureColors.textMuted, size: 20),
        title: Text(title, style: _bodyStrong),
        children: [Text(text, style: _body)],
      ),
    );
  }
}

class _DateChip extends StatelessWidget {
  final DateTime date;
  const _DateChip({required this.date});

  static const _weekdays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 64,
      padding: const EdgeInsets.symmetric(vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppCultureColors.border),
      ),
      child: Column(
        children: [
          Text(_weekdays[date.weekday - 1], style: const TextStyle(fontSize: 11, color: AppCultureColors.textMuted)),
          Text(
            '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}',
            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: AppCultureColors.textDark),
          ),
        ],
      ),
    );
  }
}
