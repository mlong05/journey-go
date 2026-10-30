import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
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
                        fontWeight: FontWeight.w800,
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
                          style: const TextStyle(fontWeight: FontWeight.w800),
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
              Container(
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

  @override
  Widget build(BuildContext context) {
    final c = _content;
    final meta = contentTypeMeta(c.contentType);
    return Scaffold(
      backgroundColor: AppCultureColors.background,
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            pinned: true,
            expandedHeight: c.hasImage ? 260 : 150,
            backgroundColor: meta.color,
            foregroundColor: Colors.white,
            flexibleSpace: FlexibleSpaceBar(
              background: c.hasImage
                  ? Stack(
                      fit: StackFit.expand,
                      children: [
                        Image.network(
                          c.mediaUrl,
                          fit: BoxFit.cover,
                          errorBuilder: (_, _, _) =>
                              Container(color: meta.color),
                        ),
                        const DecoratedBox(
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              colors: [Colors.transparent, Colors.black54],
                              begin: Alignment.topCenter,
                              end: Alignment.bottomCenter,
                            ),
                          ),
                        ),
                      ],
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
            sliver: SliverList.list(
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 4,
                      ),
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
                    fontSize: 23,
                    height: 1.25,
                    fontWeight: FontWeight.w900,
                    color: AppCultureColors.textDark,
                  ),
                ),
                if (c.destinationName.isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      const Icon(
                        Icons.place_rounded,
                        size: 15,
                        color: AppCultureColors.heritageJade,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        c.destinationName,
                        style: const TextStyle(
                          fontSize: 13,
                          color: AppCultureColors.jadeDark,
                        ),
                      ),
                    ],
                  ),
                ],
                if (c.hasPlayableMedia) ...[
                  const SizedBox(height: 18),
                  FilledButton.icon(
                    onPressed: _playMedia,
                    icon: Icon(
                      c.contentType == 'AUDIO'
                          ? Icons.play_circle_fill_rounded
                          : Icons.open_in_new_rounded,
                    ),
                    label: Text(
                      c.contentType == 'AUDIO'
                          ? 'Nghe thuyết minh'
                          : c.contentType == 'VIDEO'
                          ? 'Xem video'
                          : 'Mở nội dung',
                      style: const TextStyle(fontWeight: FontWeight.w800),
                    ),
                    style: FilledButton.styleFrom(
                      backgroundColor: meta.color,
                      minimumSize: const Size.fromHeight(52),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                    ),
                  ),
                ],
                if (c.description.isNotEmpty) ...[
                  const SizedBox(height: 18),
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppCultureColors.rewardBg,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Text(
                      c.description,
                      style: const TextStyle(
                        fontSize: 15,
                        height: 1.55,
                        fontStyle: FontStyle.italic,
                        color: AppCultureColors.rewardText,
                      ),
                    ),
                  ),
                ],
                if (c.contentText.isNotEmpty) ...[
                  const SizedBox(height: 18),
                  Text(
                    c.contentText,
                    style: const TextStyle(
                      fontSize: 16,
                      height: 1.75,
                      color: AppCultureColors.textDark,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
