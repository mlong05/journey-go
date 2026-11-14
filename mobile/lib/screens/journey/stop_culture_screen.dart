import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../core/constants/app_colors.dart';
import '../../core/models/tour_detail_model.dart';
import '../../core/services/api_client.dart';
import '../../core/services/journey_service.dart';
import '../common/inline_video.dart';
import '../common/ink.dart';
import '../common/photo.dart';
import '../culture/cultural_stories.dart';

/// Đánh dấu du khách đã đọc phần văn hoá của một trạm (lưu trên máy, chỉ để hiện nhãn "Mới").
class CultureReadStore {
  static String _key(int journeyId, int destinationId) => 'jg_culture_read_${journeyId}_$destinationId';

  static Future<bool> isRead(int journeyId, int destinationId) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      return prefs.getBool(_key(journeyId, destinationId)) ?? false;
    } catch (_) {
      return false;
    }
  }

  static Future<void> markRead(int journeyId, int destinationId) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool(_key(journeyId, destinationId), true);
    } catch (_) {}
  }
}

/// Kết quả khi rời màn văn hoá: du khách bấm "Sang phần Trải nghiệm".
const String goToExperience = 'experience';

/// Phần "Nội dung văn hóa" của một trạm, mở sau khi check-in: trình bày như một trang tạp chí di sản.
///
/// Tour 5 bước lấy nội dung từ `GET /journeys/{id}/destinations/{stopId}/culture` (backend chỉ trả khi đã
/// check-in); tour luồng cũ dùng các câu chuyện văn hoá của điểm đến.
class StopCultureScreen extends StatefulWidget {
  final int journeyId;
  final int destinationId;
  final int order;
  final String name;
  final String? coverImage;
  final bool wizard;
  final bool hasExperience;

  const StopCultureScreen({
    super.key,
    required this.journeyId,
    required this.destinationId,
    required this.order,
    required this.name,
    required this.coverImage,
    required this.wizard,
    required this.hasExperience,
  });

  static Future<String?> open(BuildContext context, StopCultureScreen screen) =>
      Navigator.of(context).push<String>(MaterialPageRoute(builder: (_) => screen));

  @override
  State<StopCultureScreen> createState() => _StopCultureScreenState();
}

class _StopCultureScreenState extends State<StopCultureScreen> {
  StopCulture? _culture;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    CultureReadStore.markRead(widget.journeyId, widget.destinationId);
    if (widget.wizard) {
      _load();
    } else {
      _loading = false;
    }
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final culture = await JourneyService().getCulture(
        journeyId: widget.journeyId,
        destinationId: widget.destinationId,
      );
      if (mounted) setState(() => _culture = culture);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  String? get _hero => _culture?.imageUrl ?? widget.coverImage;

  @override
  Widget build(BuildContext context) {
    final video = _culture?.videoUrl;
    return Scaffold(
      backgroundColor: AppInk.paper,
      appBar: AppBar(
        backgroundColor: AppInk.paper,
        surfaceTintColor: Colors.transparent,
        foregroundColor: AppInk.ink,
        scrolledUnderElevation: 0.5,
        titleSpacing: 0,
        title: Text(
          'TRẠM ${widget.order.toString().padLeft(2, '0')}  ·  NỘI DUNG VĂN HÓA',
          style: AppType.eyebrow(),
        ),
      ),
      body: ListView(
        padding: EdgeInsets.zero,
        children: [
          // Trên cùng: video văn hoá; trạm không có video thì dùng ảnh trạm
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 0),
            child: video != null
                ? InlineVideo(key: ValueKey(video), url: video)
                : ClipRRect(
                    borderRadius: BorderRadius.circular(16),
                    child: AspectRatio(
                      aspectRatio: 16 / 9,
                      child: Photo(url: _hero, width: 480, semanticLabel: widget.name),
                    ),
                  ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 18, 20, 0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (video != null)
                  const Padding(
                    padding: EdgeInsets.only(bottom: 10),
                    child: Row(
                      children: [
                        Icon(Icons.movie_outlined, size: 16, color: AppInk.muted),
                        SizedBox(width: 6),
                        Text('Video thuyết minh', style: TextStyle(fontSize: 12.5, color: AppInk.muted)),
                      ],
                    ),
                  ),
                Text(widget.name, style: AppType.display(size: 25)),
              ],
            ),
          ),
          _body(),
        ],
      ),
    );
  }

  Widget _body() {
    if (!widget.wizard) {
      return Padding(
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            CulturalStoriesSection(destinationId: widget.destinationId, unlocked: true, showTeaser: true),
            const SizedBox(height: 28),
            _footer(),
          ],
        ),
      );
    }
    if (_loading) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 80),
        child: Center(child: CircularProgressIndicator(color: AppInk.accent)),
      );
    }
    if (_error != null) {
      return Padding(
        padding: const EdgeInsets.fromLTRB(24, 48, 24, 24),
        child: Column(
          children: [
            const Icon(Icons.lock_outline_rounded, size: 40, color: AppInk.muted),
            const SizedBox(height: 12),
            Text(_error!, textAlign: TextAlign.center, style: const TextStyle(height: 1.5, color: AppInk.muted)),
            const SizedBox(height: 16),
            OutlinedButton(onPressed: _load, child: const Text('Thử lại')),
          ],
        ),
      );
    }
    final c = _culture!;
    final paragraphs = (c.culturalContent ?? '')
        .split(RegExp(r'\n\s*\n|\r\n\s*\r\n'))
        .map((p) => p.trim())
        .where((p) => p.isNotEmpty)
        .toList();

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 14, 20, 32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (c.shortDescription != null) ...[
            Text(
              c.shortDescription!,
              style: AppType.reading(size: 16.5, color: AppInk.muted).copyWith(fontStyle: FontStyle.italic),
            ),
            const SizedBox(height: 22),
          ],
          if (paragraphs.isNotEmpty) ...[
            const _SectionTitle(label: 'Câu chuyện'),
            for (var i = 0; i < paragraphs.length; i++)
              Padding(
                padding: const EdgeInsets.only(bottom: 14),
                child: Text(paragraphs[i], style: AppType.reading(size: 16)),
              ),
          ],
          if (c.culturalImages.isNotEmpty) ...[
            const SizedBox(height: 22),
            _SectionTitle(label: 'Hình ảnh', trailing: '${c.culturalImages.length} ảnh'),
            _gallery(c.culturalImages),
          ],
          if (c.artifacts.isNotEmpty) ...[
            const SizedBox(height: 28),
            _SectionTitle(label: 'Hiện vật', trailing: '${c.artifacts.length} hiện vật'),
            Container(
              clipBehavior: Clip.antiAlias,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppInk.border),
              ),
              child: Column(
                children: [
                  for (var i = 0; i < c.artifacts.length; i++)
                    _artifact(c.artifacts[i], i + 1, divider: i < c.artifacts.length - 1),
                ],
              ),
            ),
          ],
          if (c.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 24),
              child: Text(
                'Đối tác chưa bổ sung nội dung văn hóa cho trạm này.',
                style: TextStyle(color: AppInk.muted),
              ),
            ),
          const SizedBox(height: 28),
          _footer(),
        ],
      ),
    );
  }

  /// Lưới 3 cột ảnh vuông nhỏ; chạm để xem lớn và vuốt qua lại.
  Widget _gallery(List<String> images) {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      padding: EdgeInsets.zero,
      itemCount: images.length,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        mainAxisSpacing: 6,
        crossAxisSpacing: 6,
      ),
      itemBuilder: (_, i) => Semantics(
        button: true,
        label: 'Xem hình ảnh ${i + 1}',
        child: GestureDetector(
          onTap: () => _viewImage(images, i),
          child: Photo(url: images[i], width: 140, borderRadius: BorderRadius.circular(10)),
        ),
      ),
    );
  }

  void _viewImage(List<String> images, int initial) {
    Navigator.of(context).push(
      MaterialPageRoute(
        fullscreenDialog: true,
        builder: (_) => _ImageViewer(images: images, initial: initial),
      ),
    );
  }

  /// Hiện vật: một hàng gọn kiểu danh mục bảo tàng (ảnh vuông nhỏ + nhãn), chạm để xem chi tiết.
  Widget _artifact(TourArtifact a, int index, {required bool divider}) {
    final label = 'HIỆN VẬT SỐ ${index.toString().padLeft(2, '0')}';
    return InkWell(
      onTap: () => _showArtifact(a, label),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          border: divider ? const Border(bottom: BorderSide(color: AppInk.line)) : null,
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(
              width: 84,
              height: 84,
              child: a.imageUrl != null
                  ? Photo(url: a.imageUrl, width: 84, borderRadius: BorderRadius.circular(10), semanticLabel: a.name)
                  : Container(
                      decoration: BoxDecoration(color: AppInk.soft, borderRadius: BorderRadius.circular(10)),
                      child: const Icon(Icons.museum_outlined, color: AppInk.muted),
                    ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label, style: AppType.eyebrow()),
                  const SizedBox(height: 3),
                  Text(a.name, maxLines: 2, overflow: TextOverflow.ellipsis, style: AppType.display(size: 15.5)),
                  if (a.shortDescription != null) ...[
                    const SizedBox(height: 3),
                    Text(
                      a.shortDescription!,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 12.5, height: 1.4, color: AppInk.muted),
                    ),
                  ],
                  if (a.videoUrl != null) ...[
                    const SizedBox(height: 4),
                    const Row(
                      children: [
                        Icon(Icons.play_circle_outline_rounded, size: 15, color: AppInk.accent),
                        SizedBox(width: 4),
                        Text('Có video', style: TextStyle(fontSize: 12, color: AppInk.accent)),
                      ],
                    ),
                  ],
                ],
              ),
            ),
            const Icon(Icons.chevron_right_rounded, color: AppInk.muted),
          ],
        ),
      ),
    );
  }

  /// Bảng chi tiết hiện vật: ảnh vừa khung (không tràn màn), mô tả đầy đủ, video nếu có.
  void _showArtifact(TourArtifact a, String label) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      backgroundColor: AppInk.paper,
      builder: (ctx) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.7,
        maxChildSize: 0.92,
        builder: (_, controller) => ListView(
          controller: controller,
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 28),
          children: [
            if (a.imageUrl != null)
              GestureDetector(
                onTap: () => _viewImage([a.imageUrl!], 0),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxHeight: 240),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(14),
                    child: AspectRatio(aspectRatio: 4 / 3, child: Photo(url: a.imageUrl, width: 400, semanticLabel: a.name)),
                  ),
                ),
              ),
            const SizedBox(height: 14),
            Text(label, style: AppType.eyebrow()),
            const SizedBox(height: 4),
            Text(a.name, style: AppType.display(size: 21)),
            if (a.shortDescription != null) ...[
              const SizedBox(height: 10),
              Text(a.shortDescription!, style: AppType.reading(size: 15.5)),
            ],
            if (a.videoUrl != null) ...[
              const SizedBox(height: 16),
              InlineVideo(url: a.videoUrl!),
            ],
          ],
        ),
      ),
    );
  }

  Widget _footer() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const _Ornament(),
        const SizedBox(height: 20),
        if (widget.hasExperience)
          FilledButton.icon(
            onPressed: () => Navigator.of(context).pop(goToExperience),
            style: FilledButton.styleFrom(
              backgroundColor: AppInk.accent,
              foregroundColor: Colors.white,
              minimumSize: const Size.fromHeight(52),
              shape: const StadiumBorder(),
              textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
            ),
            icon: const Icon(Icons.explore_outlined),
            label: const Text('Sang phần Trải nghiệm'),
          )
        else
          OutlinedButton(
            onPressed: () => Navigator.of(context).maybePop(),
            style: OutlinedButton.styleFrom(
              foregroundColor: AppInk.ink,
              side: const BorderSide(color: AppInk.ink),
              minimumSize: const Size.fromHeight(52),
              shape: const StadiumBorder(),
            ),
            child: const Text('Quay lại lộ trình'),
          ),
      ],
    );
  }
}

/// Tiêu đề mục: chữ có chân, gạch mảnh màu son bên dưới.
class _SectionTitle extends StatelessWidget {
  final String label;
  final String? trailing;
  const _SectionTitle({required this.label, this.trailing});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Expanded(child: Text(label, style: AppType.display(size: 19))),
              if (trailing != null) Text(trailing!, style: const TextStyle(fontSize: 12.5, color: AppInk.muted)),
            ],
          ),
          const SizedBox(height: 6),
          Container(width: 28, height: 2, color: AppInk.lacquer),
        ],
      ),
    );
  }
}

/// Đường phân cách hai vạch mảnh, giữa là ô vuông xoay — họa tiết trang trí kiểu sách cổ.
class _Ornament extends StatelessWidget {
  const _Ornament();

  @override
  Widget build(BuildContext context) {
    Widget line() => Expanded(child: Container(height: 1, color: AppInk.border));
    return Row(
      children: [
        line(),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 10),
          child: Transform.rotate(
            angle: 0.785398,
            child: Container(width: 7, height: 7, decoration: BoxDecoration(border: Border.all(color: AppInk.brass))),
          ),
        ),
        line(),
      ],
    );
  }
}

class _ImageViewer extends StatelessWidget {
  final List<String> images;
  final int initial;
  const _ImageViewer({required this.images, required this.initial});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(backgroundColor: Colors.black, foregroundColor: Colors.white),
      body: PageView.builder(
        controller: PageController(initialPage: initial),
        itemCount: images.length,
        itemBuilder: (_, i) => InteractiveViewer(
          child: Center(
            child: Image.network(
              images[i],
              fit: BoxFit.contain,
              errorBuilder: (_, _, _) => const Icon(Icons.broken_image_outlined, color: Colors.white54, size: 48),
            ),
          ),
        ),
      ),
    );
  }
}
