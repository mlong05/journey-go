import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:youtube_player_iframe/youtube_player_iframe.dart';
import '../../core/constants/app_colors.dart';
import '../../core/models/cultural_content_model.dart';
import '../../core/services/api_client.dart';
import '../../core/services/cultural_content_service.dart';

/// Nhãn, biểu tượng, màu theo loại nội dung (khớp trang quản lý của provider).
({String label, IconData icon, Color color}) contentTypeMeta(String type) =>
    switch (type) {
      'AUDIO' => (
        label: 'Thuyết minh',
        icon: Icons.headphones_rounded,
        color: const Color(0xFF4F46E5),
      ),
      'VIDEO' => (
        label: 'Video tư liệu',
        icon: Icons.smart_display_rounded,
        color: const Color(0xFFE11D48),
      ),
      'STORY' => (
        label: 'Truyền thuyết',
        icon: Icons.auto_stories_rounded,
        color: AppCultureColors.amberDark,
      ),
      'IMAGE' => (
        label: 'Hình ảnh',
        icon: Icons.photo_rounded,
        color: AppCultureColors.oceanBlue,
      ),
      '3D_VR' => (
        label: 'Mô hình 3D / VR',
        icon: Icons.view_in_ar_rounded,
        color: const Color(0xFF7C3AED),
      ),
      _ => (
        label: 'Bài viết di sản',
        icon: Icons.article_rounded,
        color: AppCultureColors.heritageJade,
      ),
    };

/// Danh sách câu chuyện & thuyết minh văn hóa đã duyệt của một điểm đến.
///
/// [unlocked] = false: chỉ hiện tiêu đề, mô tả kèm biểu tượng khóa (mở khóa khi check-in).
/// [unlocked] = true: chạm để đọc toàn văn và phát media.
class CulturalStoriesSection extends StatefulWidget {
  final int destinationId;
  final bool unlocked;

  /// Ẩn hẳn khi điểm đến chưa có nội dung (dùng trong thẻ hành trình cho gọn).
  final bool hideWhenEmpty;

  /// Hiện sẵn đoạn mở đầu của câu chuyện đầu tiên (kèm nút Nghe nếu có thuyết minh audio),
  /// danh sách đầy đủ thu gọn sau nút "Xem tất cả".
  final bool showTeaser;

  const CulturalStoriesSection({
    super.key,
    required this.destinationId,
    this.unlocked = false,
    this.hideWhenEmpty = false,
    this.showTeaser = false,
  });

  @override
  State<CulturalStoriesSection> createState() => _CulturalStoriesSectionState();
}

class _CulturalStoriesSectionState extends State<CulturalStoriesSection> {
  final CulturalContentService _service = CulturalContentService();
  List<CulturalContentModel>? _contents;
  String? _error;
  bool _expanded = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final list = await _service.getByDestination(widget.destinationId);
      if (mounted) setState(() => _contents = list);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    }
  }

  void _open(CulturalContentModel content) {
    if (!widget.unlocked) return;
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => CulturalContentScreen(initial: content),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_error != null) {
      return Text(
        _error!,
        style: const TextStyle(fontSize: 12, color: AppCultureColors.error),
      );
    }
    final contents = _contents;
    if (contents == null) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 8),
        child: LinearProgressIndicator(
          minHeight: 2,
          color: AppCultureColors.heritageJade,
        ),
      );
    }
    if (contents.isEmpty) {
      return widget.hideWhenEmpty
          ? const SizedBox.shrink()
          : const Text(
              'Điểm đến này chưa có câu chuyện văn hóa được duyệt.',
              style: TextStyle(
                fontSize: 12.5,
                color: AppCultureColors.textMuted,
              ),
            );
    }

    if (widget.showTeaser) return _buildTeaser(contents);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (!widget.unlocked)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Row(
              children: [
                const Icon(
                  Icons.lock_rounded,
                  size: 14,
                  color: AppCultureColors.textMuted,
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    'Mở khóa ${contents.length} nội dung khi check-in tại điểm đến',
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: AppCultureColors.textMuted,
                    ),
                  ),
                ),
              ],
            ),
          ),
        for (final c in contents) _tile(c),
      ],
    );
  }

  Future<void> _listen(CulturalContentModel audio) async {
    // Ghi nhận lượt nghe như khi mở nội dung; lỗi ghi nhận không chặn việc phát
    CulturalContentService().play(audio.id).catchError((_) => audio);
    final ok = await launchUrl(
      Uri.parse(audio.mediaUrl),
      mode: LaunchMode.externalApplication,
    );
    if (!ok && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Không mở được bản thuyết minh.'),
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  /// Đoạn mở đầu: câu chuyện đầu tiên có phần giới thiệu, nút Nghe cho thuyết minh audio.
  Widget _buildTeaser(List<CulturalContentModel> contents) {
    final lead = contents.firstWhere(
      (c) =>
          c.description.isNotEmpty ||
          (widget.unlocked && c.contentText.isNotEmpty),
      orElse: () => contents.first,
    );
    final intro = lead.description.isNotEmpty
        ? lead.description
        : (widget.unlocked ? lead.contentText : '');
    final audio = contents
        .where((c) => c.contentType == 'AUDIO' && c.hasPlayableMedia)
        .firstOrNull;
    final meta = contentTypeMeta(lead.contentType);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: double.infinity,
          padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
          decoration: BoxDecoration(
            color: const Color(0xFFFFFBEB),
            borderRadius: BorderRadius.circular(16),
            border: const Border(
              left: BorderSide(color: AppCultureColors.amberDark, width: 3),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(meta.icon, size: 16, color: AppCultureColors.amberDark),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      lead.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 13.5,
                        fontWeight: FontWeight.w700,
                        color: AppCultureColors.amberDark,
                      ),
                    ),
                  ),
                ],
              ),
              if (intro.isNotEmpty) ...[
                const SizedBox(height: 6),
                Text(
                  intro,
                  maxLines: 3,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 13,
                    height: 1.5,
                    fontStyle: FontStyle.italic,
                    color: AppCultureColors.textDark,
                  ),
                ),
              ],
              if (audio != null) ...[
                const SizedBox(height: 10),
                widget.unlocked
                    ? FilledButton.icon(
                        onPressed: () => _listen(audio),
                        icon: const Icon(Icons.headphones_rounded, size: 18),
                        label: Text(
                          audio.durationLabel.isEmpty
                              ? 'Nghe thuyết minh'
                              : 'Nghe · ${audio.durationLabel}',
                          style: const TextStyle(fontWeight: FontWeight.w700),
                        ),
                        style: FilledButton.styleFrom(
                          backgroundColor: const Color(0xFF4F46E5),
                          minimumSize: const Size(0, 40),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                      )
                    : Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEEF2FF),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              Icons.headphones_rounded,
                              size: 15,
                              color: Color(0xFF4F46E5),
                            ),
                            SizedBox(width: 6),
                            Text(
                              'Có thuyết minh audio',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF4F46E5),
                              ),
                            ),
                            SizedBox(width: 6),
                            Icon(
                              Icons.lock_rounded,
                              size: 13,
                              color: Color(0xFF818CF8),
                            ),
                          ],
                        ),
                      ),
              ],
            ],
          ),
        ),
        const SizedBox(height: 6),
        InkWell(
          borderRadius: BorderRadius.circular(10),
          onTap: () => setState(() => _expanded = !_expanded),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 6),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    _expanded
                        ? 'Thu gọn'
                        : widget.unlocked
                        ? 'Xem tất cả ${contents.length} nội dung văn hóa'
                        : '${contents.length} nội dung văn hóa · mở khóa khi check-in',
                    style: const TextStyle(
                      fontSize: 12.5,
                      fontWeight: FontWeight.w700,
                      color: AppCultureColors.amberDark,
                    ),
                  ),
                ),
                Icon(
                  _expanded
                      ? Icons.expand_less_rounded
                      : Icons.expand_more_rounded,
                  color: AppCultureColors.amberDark,
                ),
              ],
            ),
          ),
        ),
        if (_expanded) ...[
          const SizedBox(height: 4),
          for (final c in contents) _tile(c),
        ],
      ],
    );
  }

  Widget _tile(CulturalContentModel c) {
    final meta = contentTypeMeta(c.contentType);
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: widget.unlocked ? () => _open(c) : null,
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppCultureColors.border),
          ),
          child: Row(
            children: [
              // Có ảnh thì hiện ảnh thu nhỏ, chưa có thì hiện biểu tượng loại nội dung
              c.coverImage != null || c.youTubeId != null
                  ? ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: SizedBox(
                        width: 56,
                        height: 56,
                        child: Stack(
                          fit: StackFit.expand,
                          children: [
                            Image.network(
                              (c.coverImage ?? c.videoThumbnail)!,
                              fit: BoxFit.cover,
                              errorBuilder: (_, _, _) => Container(
                                color: meta.color.withValues(alpha: 0.1),
                                child: Icon(meta.icon, color: meta.color),
                              ),
                            ),
                            if (c.isVideo)
                              const Center(
                                child: Icon(
                                  Icons.play_circle_fill_rounded,
                                  color: Colors.white,
                                  size: 24,
                                ),
                              ),
                          ],
                        ),
                      ),
                    )
                  : Container(
                      width: 42,
                      height: 42,
                      decoration: BoxDecoration(
                        color: meta.color.withValues(alpha: 0.1),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(meta.icon, color: meta.color, size: 22),
                    ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      c.title,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: AppCultureColors.textDark,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      [
                        meta.label,
                        if (c.durationLabel.isNotEmpty) c.durationLabel,
                        if (c.galleryImages.isNotEmpty)
                          '${c.galleryImages.length} ảnh',
                      ].join(' · '),
                      style: TextStyle(
                        fontSize: 11.5,
                        color: meta.color,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    if (c.description.isNotEmpty) ...[
                      const SizedBox(height: 3),
                      Text(
                        c.description,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 12,
                          height: 1.4,
                          color: AppCultureColors.textMuted,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Icon(
                widget.unlocked
                    ? Icons.chevron_right_rounded
                    : Icons.lock_rounded,
                color: AppCultureColors.textLight,
                size: widget.unlocked ? 22 : 18,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Màn đọc / phát một nội dung văn hóa. Gọi /play khi mở để ghi nhận lượt xem.
class CulturalContentScreen extends StatefulWidget {
  final CulturalContentModel initial;

  const CulturalContentScreen({super.key, required this.initial});

  @override
  State<CulturalContentScreen> createState() => _CulturalContentScreenState();
}

class _CulturalContentScreenState extends State<CulturalContentScreen> {
  late CulturalContentModel _content = widget.initial;

  @override
  void initState() {
    super.initState();
    CulturalContentService()
        .play(widget.initial.id)
        .then((fresh) {
          if (mounted) setState(() => _content = fresh);
        })
        .catchError((_) {
          // Không ghi nhận được lượt xem vẫn cho đọc nội dung đang có.
        });
  }

  /// Trình phát YouTube nhúng; chỉ tạo khi người dùng bấm phát để màn mở nhanh và không tốn dữ liệu.
  YoutubePlayerController? _youTube;

  void _startYouTube() {
    final id = _content.youTubeId;
    if (id == null) return;
    setState(() {
      _youTube = YoutubePlayerController.fromVideoId(
        videoId: id,
        autoPlay: true,
        params: const YoutubePlayerParams(
          showFullscreenButton: true,
          strictRelatedVideos: true,
        ),
      );
    });
  }

  @override
  void dispose() {
    _youTube?.close();
    super.dispose();
  }

  Future<void> _playMedia() async {
    final ok = await launchUrl(
      Uri.parse(_content.mediaUrl),
      mode: LaunchMode.externalApplication,
    );
    if (!ok && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Không mở được nội dung đa phương tiện.'),
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  void _openViewer(List<String> images, int index) {
    Navigator.of(context).push(
      MaterialPageRoute(
        fullscreenDialog: true,
        builder: (_) => _ImageViewerScreen(images: images, initialIndex: index),
      ),
    );
  }

  /// Tách câu chuyện thành các đoạn để xen ảnh vào giữa.
  /// Đoạn quá dài (tác giả không xuống dòng) được cắt theo ranh giới câu,
  /// để ảnh không bị dồn hết xuống cuối bài.
  List<String> _paragraphs(String text) {
    const maxLen = 450;
    const targetLen = 300;
    final result = <String>[];
    for (final raw in text.split(RegExp(r'\n+'))) {
      final p = raw.trim();
      if (p.isEmpty) continue;
      if (p.length <= maxLen) {
        result.add(p);
        continue;
      }
      final sentences = p.split(RegExp(r'(?<=[.!?…])\s+'));
      var chunk = StringBuffer();
      for (final s in sentences) {
        if (chunk.isNotEmpty) chunk.write(' ');
        chunk.write(s);
        if (chunk.length >= targetLen) {
          result.add(chunk.toString());
          chunk = StringBuffer();
        }
      }
      if (chunk.isNotEmpty) {
        // Phần đuôi quá ngắn thì nối vào đoạn trước cho tự nhiên
        if (chunk.length < 120 && result.isNotEmpty) {
          result[result.length - 1] = '${result.last} $chunk';
        } else {
          result.add(chunk.toString());
        }
      }
    }
    return result;
  }

  @override
  Widget build(BuildContext context) {
    final c = _content;
    final meta = contentTypeMeta(c.contentType);
    final videoHero = c.hasPlayableMedia && c.isVideo;

    final content = <Widget>[
      _header(c, meta),
      ..._storyWithImages(c, meta),
    ];

    // Nội dung có video: video ghim ở đầu màn (thay ảnh nền), phần đọc cuộn bên dưới
    if (videoHero) {
      return AnnotatedRegion<SystemUiOverlayStyle>(
        value: SystemUiOverlayStyle.light,
        child: Scaffold(
          backgroundColor: Colors.white,
          body: Column(
            children: [
              _videoHero(c, meta),
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(20, 20, 20, 40),
                  children: content,
                ),
              ),
            ],
          ),
        ),
      );
    }

    final cover = c.coverImage;
    return Scaffold(
      backgroundColor: Colors.white,
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            pinned: true,
            expandedHeight: cover != null ? 240 : 140,
            backgroundColor: meta.color,
            foregroundColor: Colors.white,
            flexibleSpace: FlexibleSpaceBar(
              background: cover != null
                  ? GestureDetector(
                      onTap: () => _openViewer([cover], 0),
                      child: Stack(
                        fit: StackFit.expand,
                        children: [
                          Image.network(
                            cover,
                            fit: BoxFit.cover,
                            errorBuilder: (_, _, _) =>
                                Container(color: meta.color),
                          ),
                          const DecoratedBox(
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                colors: [Colors.black38, Colors.transparent],
                                begin: Alignment.topCenter,
                                end: Alignment.center,
                              ),
                            ),
                          ),
                        ],
                      ),
                    )
                  : Container(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [
                            meta.color,
                            meta.color.withValues(alpha: 0.75),
                          ],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                      ),
                      child: Align(
                        alignment: Alignment.bottomRight,
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Icon(
                            meta.icon,
                            size: 72,
                            color: Colors.white.withValues(alpha: 0.25),
                          ),
                        ),
                      ),
                    ),
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 40),
            sliver: SliverList.list(children: content),
          ),
        ],
      ),
    );
  }

  /// Khung video đầu màn: nền đen, nút quay lại, trình phát 16:9.
  Widget _videoHero(CulturalContentModel c, ({String label, IconData icon, Color color}) meta) {
    return Container(
      color: Colors.black,
      padding: EdgeInsets.only(top: MediaQuery.paddingOf(context).top),
      child: Column(
        children: [
          SizedBox(
            height: 48,
            child: Row(
              children: [
                IconButton(
                  onPressed: () => Navigator.of(context).maybePop(),
                  icon: const Icon(Icons.arrow_back_rounded),
                  color: Colors.white,
                  tooltip: 'Quay lại',
                ),
                Icon(meta.icon, size: 16, color: Colors.white70),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    c.title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                const SizedBox(width: 16),
              ],
            ),
          ),
          if (_youTube != null)
            YoutubePlayer(controller: _youTube!)
          else
            _VideoCard(
              thumbnail: c.videoThumbnail,
              color: meta.color,
              durationLabel: c.durationLabel,
              radius: 0,
              onTap: c.youTubeId != null ? _startYouTube : _playMedia,
            ),
        ],
      ),
    );
  }

  /// Nhãn loại, tiêu đề, điểm đến, đoạn giới thiệu và nút nghe/mở media (nếu không phải video).
  Widget _header(CulturalContentModel c, ({String label, IconData icon, Color color}) meta) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: meta.color.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(meta.icon, size: 14, color: meta.color),
                  const SizedBox(width: 5),
                  Text(
                    meta.label,
                    style: TextStyle(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w700,
                      color: meta.color,
                    ),
                  ),
                ],
              ),
            ),
            if (c.durationLabel.isNotEmpty) ...[
              const SizedBox(width: 8),
              const Icon(
                Icons.schedule_rounded,
                size: 13,
                color: AppCultureColors.textMuted,
              ),
              const SizedBox(width: 3),
              Text(
                c.durationLabel,
                style: const TextStyle(
                  fontSize: 12,
                  color: AppCultureColors.textMuted,
                ),
              ),
            ],
          ],
        ),
        const SizedBox(height: 12),
        Text(
          c.title,
          style: const TextStyle(
            fontSize: 24,
            height: 1.25,
            fontWeight: FontWeight.w800,
            letterSpacing: -0.3,
            color: AppCultureColors.textDark,
          ),
        ),
        if (c.destinationName.isNotEmpty) ...[
          const SizedBox(height: 8),
          Row(
            children: [
              const Icon(
                Icons.place_rounded,
                size: 15,
                color: AppCultureColors.heritageJade,
              ),
              const SizedBox(width: 4),
              Expanded(
                child: Text(
                  c.destinationName,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: AppCultureColors.jadeDark,
                  ),
                ),
              ),
            ],
          ),
        ],
        // Audio / media khác: nút mở trình phát (video đã nằm ở đầu màn)
        if (c.hasPlayableMedia && !c.isVideo) ...[
          const SizedBox(height: 16),
          FilledButton.icon(
            onPressed: _playMedia,
            icon: Icon(
              c.contentType == 'AUDIO'
                  ? Icons.play_circle_fill_rounded
                  : Icons.open_in_new_rounded,
            ),
            label: Text(
              c.contentType == 'AUDIO' ? 'Nghe thuyết minh' : 'Mở nội dung',
              style: const TextStyle(fontWeight: FontWeight.w700),
            ),
            style: FilledButton.styleFrom(
              backgroundColor: meta.color,
              minimumSize: const Size.fromHeight(50),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
              ),
            ),
          ),
        ],
        // Đoạn giới thiệu dạng trích dẫn, vạch màu bên trái
        if (c.description.isNotEmpty) ...[
          const SizedBox(height: 18),
          Container(
            padding: const EdgeInsets.only(left: 14),
            decoration: BoxDecoration(
              border: Border(left: BorderSide(color: meta.color, width: 3)),
            ),
            child: Text(
              c.description,
              style: const TextStyle(
                fontSize: 15.5,
                height: 1.6,
                fontStyle: FontStyle.italic,
                color: AppCultureColors.textMuted,
              ),
            ),
          ),
        ],
      ],
    );
  }

  /// Câu chuyện chia đoạn, ảnh xen đều giữa các đoạn; ảnh còn lại xếp lưới nhỏ ở cuối.
  List<Widget> _storyWithImages(
    CulturalContentModel c,
    ({String label, IconData icon, Color color}) meta,
  ) {
    final gallery = c.galleryImages;
    final paragraphs = _paragraphs(c.contentText);
    // Số ảnh xen được = số khoảng trống giữa các đoạn
    final inlineCount = min(gallery.length, max(0, paragraphs.length - 1));
    final imageAfter = <int, int>{}; // vị trí đoạn -> chỉ số ảnh
    for (var i = 0; i < inlineCount; i++) {
      final at = ((i + 1) * paragraphs.length / (inlineCount + 1)).ceil() - 1;
      var slot = at.clamp(0, paragraphs.length - 2);
      while (imageAfter.containsKey(slot) && slot < paragraphs.length - 2) {
        slot++;
      }
      imageAfter[slot] = i;
    }
    final rest = gallery.length - inlineCount;

    Widget heading(String text) => Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: Row(
            children: [
              Container(
                width: 4,
                height: 16,
                decoration: BoxDecoration(
                  color: meta.color,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(width: 8),
              Text(
                text,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                  color: AppCultureColors.textDark,
                ),
              ),
            ],
          ),
        );

    return [
      if (paragraphs.isNotEmpty) ...[
        const SizedBox(height: 24),
        heading('Câu chuyện'),
        for (var p = 0; p < paragraphs.length; p++) ...[
          Padding(
            padding: const EdgeInsets.only(bottom: 14),
            child: Text(
              paragraphs[p],
              style: const TextStyle(
                fontSize: 16,
                height: 1.75,
                color: AppCultureColors.textDark,
              ),
            ),
          ),
          if (imageAfter.containsKey(p))
            Padding(
              padding: const EdgeInsets.only(top: 4, bottom: 18),
              child: _InlineImage(
                url: gallery[imageAfter[p]!],
                caption: 'Ảnh ${imageAfter[p]! + 1}/${gallery.length}',
                onTap: () => _openViewer(gallery, imageAfter[p]!),
              ),
            ),
        ],
      ],
      if (rest > 0) ...[
        const SizedBox(height: 16),
        heading(inlineCount > 0 ? 'Thêm hình ảnh ($rest)' : 'Hình ảnh ($rest)'),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          padding: EdgeInsets.zero,
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 3,
            mainAxisSpacing: 8,
            crossAxisSpacing: 8,
          ),
          itemCount: rest,
          itemBuilder: (_, i) {
            final index = inlineCount + i;
            return GestureDetector(
              onTap: () => _openViewer(gallery, index),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Image.network(
                  gallery[index],
                  fit: BoxFit.cover,
                  errorBuilder: (_, _, _) => Container(
                    color: AppCultureColors.border,
                    child: const Icon(
                      Icons.broken_image_rounded,
                      color: AppCultureColors.textLight,
                    ),
                  ),
                ),
              ),
            );
          },
        ),
      ],
    ];
  }
}

/// Ảnh xen trong câu chuyện: khổ vừa phải, chạm để xem toàn màn hình.
class _InlineImage extends StatelessWidget {
  final String url;
  final String caption;
  final VoidCallback onTap;

  const _InlineImage({
    required this.url,
    required this.caption,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(14),
            child: SizedBox(
              height: 190,
              width: double.infinity,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  Image.network(
                    url,
                    fit: BoxFit.cover,
                    errorBuilder: (_, _, _) => Container(
                      color: AppCultureColors.border,
                      child: const Icon(
                        Icons.broken_image_rounded,
                        color: AppCultureColors.textLight,
                      ),
                    ),
                  ),
                  Positioned(
                    right: 8,
                    bottom: 8,
                    child: Container(
                      padding: const EdgeInsets.all(5),
                      decoration: BoxDecoration(
                        color: Colors.black45,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Icon(
                        Icons.zoom_out_map_rounded,
                        size: 16,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 6),
          Text(
            caption,
            style: const TextStyle(
              fontSize: 11.5,
              color: AppCultureColors.textLight,
            ),
          ),
        ],
      ),
    );
  }
}

/// Khung xem trước video 16:9 với nút phát ở giữa; chạm để mở trình phát.
class _VideoCard extends StatelessWidget {
  final String? thumbnail;
  final Color color;
  final String durationLabel;
  final VoidCallback onTap;
  final double radius;

  const _VideoCard({
    required this.thumbnail,
    required this.color,
    required this.durationLabel,
    required this.onTap,
    this.radius = 18,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(radius),
        child: AspectRatio(
          aspectRatio: 16 / 9,
          child: Stack(
            fit: StackFit.expand,
            children: [
              if (thumbnail != null)
                Image.network(
                  thumbnail!,
                  fit: BoxFit.cover,
                  errorBuilder: (_, _, _) => Container(color: Colors.black87),
                )
              else
                Container(color: Colors.black87),
              const DecoratedBox(
                decoration: BoxDecoration(color: Colors.black26),
              ),
              Center(
                child: Container(
                  width: 64,
                  height: 64,
                  decoration: BoxDecoration(
                    color: color,
                    shape: BoxShape.circle,
                    boxShadow: const [
                      BoxShadow(color: Colors.black38, blurRadius: 12),
                    ],
                  ),
                  child: const Icon(
                    Icons.play_arrow_rounded,
                    color: Colors.white,
                    size: 40,
                  ),
                ),
              ),
              if (durationLabel.isNotEmpty)
                Positioned(
                  right: 10,
                  bottom: 10,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 3,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.black54,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      durationLabel,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 11.5,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Xem ảnh toàn màn hình: vuốt ngang để chuyển ảnh, chụm ngón tay để phóng to.
class _ImageViewerScreen extends StatefulWidget {
  final List<String> images;
  final int initialIndex;

  const _ImageViewerScreen({required this.images, required this.initialIndex});

  @override
  State<_ImageViewerScreen> createState() => _ImageViewerScreenState();
}

class _ImageViewerScreenState extends State<_ImageViewerScreen> {
  late final PageController _controller =
      PageController(initialPage: widget.initialIndex);
  late int _index = widget.initialIndex;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        title: Text(
          '${_index + 1} / ${widget.images.length}',
          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
        ),
      ),
      body: PageView.builder(
        controller: _controller,
        itemCount: widget.images.length,
        onPageChanged: (i) => setState(() => _index = i),
        itemBuilder: (_, i) => InteractiveViewer(
          minScale: 1,
          maxScale: 4,
          child: Center(
            child: Image.network(
              widget.images[i],
              fit: BoxFit.contain,
              errorBuilder: (_, _, _) => const Icon(
                Icons.broken_image_rounded,
                color: Colors.white54,
                size: 48,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
