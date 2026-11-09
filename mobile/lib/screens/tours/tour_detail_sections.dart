import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/constants/app_colors.dart';
import '../../core/models/tour_detail_model.dart';
import 'tour_cards.dart' show TourMeta, ImageBadge, themeIcon;
import 'tour_route_map.dart';
import 'tour_style.dart';

/// Thân trang chi tiết của tour 5 bước: ảnh, thông tin chung, điểm nổi bật, mô tả, lịch trình,
/// các điểm dừng (bản đồ + xem trước), bảng giá, ngày khởi hành, chính sách và liên hệ.
/// Chỉ hiển thị — đặt tour nằm ở thanh dưới của màn chi tiết.
class TourWizardDetailBody extends StatefulWidget {
  final TourDetailModel detail;

  const TourWizardDetailBody({super.key, required this.detail});

  @override
  State<TourWizardDetailBody> createState() => _TourWizardDetailBodyState();
}

class _TourWizardDetailBodyState extends State<TourWizardDetailBody> {
  final Map<int, GlobalKey> _stopKeys = {};

  TourDetailModel get d => widget.detail;

  void _scrollToStop(int stopId) {
    final ctx = _stopKeys[stopId]?.currentContext;
    if (ctx != null) {
      Scrollable.ensureVisible(ctx, duration: const Duration(milliseconds: 400), curve: Curves.easeOutCubic);
    }
  }

  @override
  Widget build(BuildContext context) {
    final located = d.stops.where((s) => s.hasLocation).toList();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _Gallery(images: d.images),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 14, 16, 0),
          child: _Overview(detail: d),
        ),
        if (d.highlights.isNotEmpty) ...[
          const _SectionTitle('Điểm nổi bật'),
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
        if (d.description != null) ...[
          const _SectionTitle('Giới thiệu'),
          _card(_ExpandableText(d.description!)),
        ],
        if (d.itinerary.isNotEmpty) ...[
          const _SectionTitle('Lịch trình'),
          _card(Column(
            children: [
              for (final day in d.itinerary) _ItineraryTile(day: day, initiallyExpanded: d.itinerary.length == 1),
            ],
          ), padding: const EdgeInsets.symmetric(vertical: 4)),
        ],
        if (d.stops.isNotEmpty) ...[
          _SectionTitle('Các điểm dừng (${d.stops.length})'),
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
        if (d.prices.isNotEmpty) ...[
          const _SectionTitle('Bảng giá'),
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
                          Text(p.label, style: _bodyStrong),
                          if (p.ageRange.isNotEmpty)
                            Text(p.ageRange, style: const TextStyle(fontSize: 12, color: AppCultureColors.textMuted)),
                        ],
                      ),
                    ),
                    Text(
                      p.formattedPrice,
                      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: AppCultureColors.jadeDark),
                    ),
                  ],
                ),
              ],
              if (d.maxGuestsPerSlot != null) ...[
                const SizedBox(height: 12),
                TourMeta(icon: Icons.groups_rounded, text: 'Tối đa ${d.maxGuestsPerSlot} khách mỗi chuyến'),
              ],
            ],
          )),
        ],
        if (d.upcomingDepartureDates.isNotEmpty) ...[
          const _SectionTitle('Ngày khởi hành'),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final date in d.upcomingDepartureDates.take(12)) _DateChip(date: date),
                if (d.upcomingDepartureDates.length > 12)
                  Chip(
                    label: Text('+${d.upcomingDepartureDates.length - 12} ngày'),
                    visualDensity: VisualDensity.compact,
                  ),
              ],
            ),
          ),
        ],
        if (d.hasPolicies) ...[
          const _SectionTitle('Thông tin cần lưu ý'),
          _card(Column(
            children: [
              if (d.priceIncludes != null)
                _PolicyTile(icon: Icons.add_task_rounded, title: 'Giá bao gồm', text: d.priceIncludes!),
              if (d.priceExcludes != null)
                _PolicyTile(icon: Icons.remove_circle_outline_rounded, title: 'Giá không bao gồm', text: d.priceExcludes!),
              if (d.cancellationPolicy != null)
                _PolicyTile(icon: Icons.event_busy_rounded, title: 'Chính sách hủy', text: d.cancellationPolicy!),
              if (d.refundPolicy != null)
                _PolicyTile(icon: Icons.currency_exchange_rounded, title: 'Chính sách hoàn tiền', text: d.refundPolicy!),
              if (d.forceMajeure != null)
                _PolicyTile(icon: Icons.thunderstorm_rounded, title: 'Trường hợp bất khả kháng', text: d.forceMajeure!),
            ],
          ), padding: const EdgeInsets.symmetric(vertical: 4)),
        ],
        if (d.contactInfo != null) ...[
          const _SectionTitle('Liên hệ'),
          _card(Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(Icons.support_agent_rounded, color: AppCultureColors.oceanBlue),
              const SizedBox(width: 10),
              Expanded(child: SelectableText(d.contactInfo!, style: _body)),
            ],
          )),
        ],
        const SizedBox(height: 24),
      ],
    );
  }

  Widget _card(Widget child, {EdgeInsetsGeometry padding = const EdgeInsets.all(14)}) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Container(
        padding: padding,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: AppCultureColors.border),
        ),
        child: child,
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

/// Album ảnh trượt ngang kèm bộ đếm "1/5"; không có ảnh thì nền gradient.
class _Gallery extends StatefulWidget {
  final List<String> images;
  const _Gallery({required this.images});

  @override
  State<_Gallery> createState() => _GalleryState();
}

class _GalleryState extends State<_Gallery> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    final images = widget.images;
    if (images.isEmpty) {
      final style = TourStyle.of('CULTURAL');
      return Container(
        height: 200,
        decoration: BoxDecoration(gradient: LinearGradient(colors: style.colors)),
        child: Icon(style.icon, size: 64, color: Colors.white.withValues(alpha: 0.5)),
      );
    }
    return SizedBox(
      height: 240,
      child: Stack(
        children: [
          PageView.builder(
            itemCount: images.length,
            onPageChanged: (i) => setState(() => _index = i),
            itemBuilder: (_, i) => GestureDetector(
              onTap: () => _openViewer(context, images, i),
              child: Image.network(
                images[i],
                fit: BoxFit.cover,
                width: double.infinity,
                errorBuilder: (_, _, _) => Container(color: AppCultureColors.surfaceSubtle),
              ),
            ),
          ),
          if (images.length > 1)
            Positioned(
              right: 12,
              bottom: 12,
              child: ImageBadge(icon: Icons.photo_library_rounded, label: '${_index + 1}/${images.length}'),
            ),
        ],
      ),
    );
  }

  static void _openViewer(BuildContext context, List<String> images, int initial) {
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
}

/// Tên tour, nhãn (vùng miền, chủ đề, thời lượng, số điểm dừng), đơn vị cung cấp và phần thưởng.
class _Overview extends StatelessWidget {
  final TourDetailModel detail;
  const _Overview({required this.detail});

  @override
  Widget build(BuildContext context) {
    final d = detail;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          d.title,
          style: const TextStyle(fontSize: 21, height: 1.3, fontWeight: FontWeight.w800, color: AppCultureColors.textDark),
        ),
        const SizedBox(height: 10),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            if (d.regionName != null) _InfoPill(icon: Icons.place_rounded, label: d.regionName!),
            if (d.themeName != null) _InfoPill(icon: themeIcon(d.themeName!), label: d.themeName!),
            _InfoPill(icon: Icons.schedule_rounded, label: d.formattedDuration),
            if (d.stops.isNotEmpty) _InfoPill(icon: Icons.route_rounded, label: '${d.stops.length} điểm dừng'),
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
                  'Cung cấp bởi ${d.providerName} · đã được kiểm duyệt',
                  style: const TextStyle(fontSize: 12.5, color: AppCultureColors.textMuted),
                ),
              ),
            ],
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
              child: Text(_expanded ? 'Thu gọn' : 'Xem thêm', style: const TextStyle(fontWeight: FontWeight.w700)),
            ),
        ],
      );
    });
  }
}

class _ItineraryTile extends StatelessWidget {
  final TourItineraryDay day;
  final bool initiallyExpanded;
  const _ItineraryTile({required this.day, required this.initiallyExpanded});

  @override
  Widget build(BuildContext context) {
    return Theme(
      data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
      child: ExpansionTile(
        initiallyExpanded: initiallyExpanded,
        tilePadding: const EdgeInsets.symmetric(horizontal: 14),
        childrenPadding: const EdgeInsets.fromLTRB(14, 0, 14, 12),
        expandedCrossAxisAlignment: CrossAxisAlignment.start,
        leading: CircleAvatar(
          radius: 16,
          backgroundColor: AppCultureColors.oceanLight,
          child: Text(
            '${day.dayNumber}',
            style: const TextStyle(fontWeight: FontWeight.w800, color: AppCultureColors.oceanDark, fontSize: 13),
          ),
        ),
        title: Text(day.title ?? 'Ngày ${day.dayNumber}', style: _bodyStrong),
        subtitle: day.mainActivity == null
            ? null
            : Text(day.mainActivity!, style: const TextStyle(fontSize: 12.5, color: AppCultureColors.textMuted)),
        children: [
          if (day.content != null) Text(day.content!, style: _body),
        ],
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
    final stats = <String>[
      if (stop.quizCount > 0) '${stop.quizCount} câu đố',
      if (stop.activities.isNotEmpty) '${stop.activities.length} hoạt động',
      if (stop.maxPoints > 0) 'tối đa ${stop.maxPoints} điểm',
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
            'Điểm dừng ${stop.sequenceOrder}',
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
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: () => launchUrl(Uri.parse(stop.videoUrl!), mode: LaunchMode.externalApplication),
              icon: const Icon(Icons.play_circle_rounded),
              label: const Text('Xem video giới thiệu'),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppCultureColors.oceanBlue,
                minimumSize: const Size.fromHeight(44),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ],
          if (stop.culturalContent != null || stop.culturalImages.isNotEmpty) ...[
            const SizedBox(height: 20),
            const Text('Câu chuyện văn hoá', style: _bodyStrong),
            const SizedBox(height: 6),
            if (stop.culturalContent != null) Text(stop.culturalContent!, style: _body),
            if (stop.culturalImages.isNotEmpty) ...[
              const SizedBox(height: 10),
              SizedBox(
                height: 96,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: stop.culturalImages.length,
                  separatorBuilder: (_, _) => const SizedBox(width: 8),
                  itemBuilder: (_, i) => ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: Image.network(stop.culturalImages[i], width: 130, fit: BoxFit.cover,
                        errorBuilder: (_, _, _) => Container(width: 130, color: AppCultureColors.surfaceSubtle)),
                  ),
                ),
              ),
            ],
          ],
          if (stop.artifacts.isNotEmpty) ...[
            const SizedBox(height: 20),
            const Text('Hiện vật', style: _bodyStrong),
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
            const Text('Thử thách tại điểm', style: _bodyStrong),
            const SizedBox(height: 8),
            if (stop.quizCount > 0)
              _ChallengeRow(
                icon: Icons.quiz_rounded,
                title: 'Câu đố văn hoá',
                subtitle: '${stop.quizCount} câu trắc nghiệm',
              ),
            for (final a in stop.activities)
              _ChallengeRow(
                icon: Icons.directions_walk_rounded,
                title: a.name,
                subtitle: [
                  if (a.formattedDuration != null) a.formattedDuration!,
                  'quét QR tại điểm để xác nhận',
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
