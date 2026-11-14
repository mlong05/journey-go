import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/models/forum_model.dart';
import '../common/heritage_motion.dart';
import '../common/live_time.dart';

/// Màu trái tim khi đã thả tim.
const Color _heartColor = Color(0xFFE11D48);

/// Ảnh đại diện tròn; không có ảnh thì hiện chữ cái đầu của tên.
class ForumAvatar extends StatelessWidget {
  final String name;
  final String? url;
  final double size;

  const ForumAvatar({super.key, required this.name, this.url, this.size = 40});

  @override
  Widget build(BuildContext context) {
    final initial = name.trim().isEmpty ? '?' : name.trim().characters.first.toUpperCase();
    final fallback = Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [AppCultureColors.jadeGradientStart, AppCultureColors.jadeGradientEnd],
        ),
        shape: BoxShape.circle,
      ),
      child: Text(
        initial,
        style: TextStyle(
          color: Colors.white,
          fontSize: size * 0.42,
          fontWeight: FontWeight.w700,
        ),
      ),
    );

    if (url == null || url!.isEmpty) return fallback;
    return ClipOval(
      child: Image.network(
        url!,
        width: size,
        height: size,
        fit: BoxFit.cover,
        errorBuilder: (_, _, _) => fallback,
        loadingBuilder: (context, child, progress) => progress == null ? child : fallback,
      ),
    );
  }
}

/// Nhãn trạng thái kiểm duyệt của bài viết.
class ForumStatusChip extends StatelessWidget {
  final ForumPost post;

  const ForumStatusChip({super.key, required this.post});

  @override
  Widget build(BuildContext context) {
    final status = ForumStatus.of(post.status, hidden: post.hidden);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
      decoration: BoxDecoration(
        color: status.color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 6,
            height: 6,
            decoration: BoxDecoration(color: status.color, shape: BoxShape.circle),
          ),
          const SizedBox(width: 5),
          Text(
            status.label,
            style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: status.color),
          ),
        ],
      ),
    );
  }
}

/// Hộp thoại báo cáo bài viết; trả về lý do và mô tả, null nếu hủy.
Future<({String reason, String? description})?> askReportReason(BuildContext context) {
  return showDialog<({String reason, String? description})>(
    context: context,
    builder: (ctx) {
      String selected = ForumReportReason.all.first.code;
      final description = TextEditingController();
      return StatefulBuilder(
        builder: (ctx, setState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
          title: const Text(
            'Báo cáo bài viết',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                RadioGroup<String>(
                  groupValue: selected,
                  onChanged: (v) => setState(() => selected = v ?? selected),
                  child: Column(
                    children: ForumReportReason.all
                        .map(
                          (r) => RadioListTile<String>(
                            value: r.code,
                            title: Text(r.label, style: const TextStyle(fontSize: 13.5)),
                            dense: true,
                            contentPadding: EdgeInsets.zero,
                            activeColor: AppCultureColors.heritageJade,
                          ),
                        )
                        .toList(),
                  ),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: description,
                  maxLength: 500,
                  maxLines: 3,
                  decoration: InputDecoration(
                    labelText: 'Mô tả thêm (không bắt buộc)',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.of(ctx).pop(), child: const Text('Hủy')),
            FilledButton(
              onPressed: () => Navigator.of(ctx).pop((
                reason: selected,
                description: description.text.trim().isEmpty ? null : description.text.trim(),
              )),
              style: FilledButton.styleFrom(backgroundColor: AppCultureColors.error),
              child: const Text('Gửi báo cáo'),
            ),
          ],
        ),
      );
    },
  );
}

/// Hỏi xác nhận trước hành động không hoàn tác được.
Future<bool> confirmAction(
  BuildContext context, {
  required String title,
  required String message,
  String confirmLabel = 'Đồng ý',
  bool destructive = false,
}) async {
  final ok = await showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
      title: Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
      content: Text(message, style: const TextStyle(fontSize: 13.5, height: 1.45)),
      actions: [
        TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: const Text('Hủy')),
        FilledButton(
          onPressed: () => Navigator.of(ctx).pop(true),
          style: FilledButton.styleFrom(
            backgroundColor: destructive ? AppCultureColors.error : AppCultureColors.heritageJade,
          ),
          child: Text(confirmLabel),
        ),
      ],
    ),
  );
  return ok == true;
}

void showForumSnack(BuildContext context, String message) {
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(content: Text(message), behavior: SnackBarBehavior.floating),
  );
}

/// Thẻ bài viết dùng ở bảng tin và "Bài của tôi".
/// Bài dài được rút gọn, bấm "Xem thêm" để mở hết ngay trên thẻ.
class ForumPostCard extends StatefulWidget {
  final ForumPost post;
  final VoidCallback onTap;
  final VoidCallback? onLike;
  final bool showStatus;

  const ForumPostCard({
    super.key,
    required this.post,
    required this.onTap,
    this.onLike,
    this.showStatus = false,
  });

  @override
  State<ForumPostCard> createState() => _ForumPostCardState();
}

class _ForumPostCardState extends State<ForumPostCard> {
  static const int _titleLines = 2;
  static const int _contentLines = 4;

  static const _titleStyle = TextStyle(
    fontSize: 16,
    height: 1.35,
    fontWeight: FontWeight.w700,
    color: AppCultureColors.textDark,
  );
  static const _contentStyle = TextStyle(
    fontSize: 14,
    height: 1.55,
    color: Color(0xFF334155),
  );

  bool _expanded = false;

  /// Đoạn chữ có dài hơn [maxLines] dòng ở bề rộng [width] không.
  bool _exceeds(BuildContext context, String text, TextStyle style, int maxLines, double width) {
    if (text.isEmpty) return false;
    final painter = TextPainter(
      text: TextSpan(text: text, style: style),
      maxLines: maxLines,
      textDirection: Directionality.of(context),
      textScaler: MediaQuery.textScalerOf(context),
    )..layout(maxWidth: width);
    return painter.didExceedMaxLines;
  }

  @override
  Widget build(BuildContext context) {
    final post = widget.post;
    final status = ForumStatus.of(post.status, hidden: post.hidden);
    final feedback = (post.status == 'REJECTED' || post.status == 'NEEDS_REVISION') &&
        post.moderationNote != null &&
        post.moderationNote!.isNotEmpty;

    return Pressable(
      onTap: widget.onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(22),
          border: Border.all(color: AppCultureColors.border),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF0F172A).withValues(alpha: 0.04),
              blurRadius: 14,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Vạch màu trạng thái ở "Bài của tôi"
            if (widget.showStatus) Container(height: 3, color: status.color.withValues(alpha: 0.7)),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 14, 14, 0),
              child: Row(
                children: [
                  _AvatarRing(child: ForumAvatar(name: post.authorName, url: post.authorAvatarUrl, size: 40)),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          post.authorName,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 14.5,
                            fontWeight: FontWeight.w600,
                            color: AppCultureColors.textDark,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Row(
                          children: [
                            const Icon(Icons.schedule_rounded, size: 12, color: AppCultureColors.textLight),
                            const SizedBox(width: 4),
                            Flexible(
                              child: LiveTime(
                                builder: (_) => Text(
                                  timeAgo(post.createdAt),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(fontSize: 12, color: AppCultureColors.textMuted),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  if (widget.showStatus) ForumStatusChip(post: post),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
              child: LayoutBuilder(
                builder: (context, box) {
                  final long = _exceeds(context, post.title, _titleStyle, _titleLines, box.maxWidth) ||
                      _exceeds(context, post.content, _contentStyle, _contentLines, box.maxWidth);
                  final open = _expanded || !long;
                  return AnimatedSize(
                    duration: const Duration(milliseconds: 260),
                    curve: Curves.easeOutCubic,
                    alignment: Alignment.topCenter,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (post.title.isNotEmpty)
                          Text(
                            post.title,
                            maxLines: open ? null : _titleLines,
                            overflow: open ? null : TextOverflow.ellipsis,
                            style: _titleStyle,
                          ),
                        if (post.content.isNotEmpty) ...[
                          const SizedBox(height: 6),
                          Text(
                            post.content,
                            maxLines: open ? null : _contentLines,
                            overflow: open ? null : TextOverflow.ellipsis,
                            style: _contentStyle,
                          ),
                        ],
                        if (long)
                          GestureDetector(
                            behavior: HitTestBehavior.opaque,
                            onTap: () => setState(() => _expanded = !_expanded),
                            child: Padding(
                              padding: const EdgeInsets.only(top: 6, bottom: 2),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text(
                                    _expanded ? 'Thu gọn' : 'Xem thêm',
                                    style: const TextStyle(
                                      fontSize: 13.5,
                                      fontWeight: FontWeight.w600,
                                      color: AppCultureColors.heritageJade,
                                    ),
                                  ),
                                  AnimatedRotation(
                                    turns: _expanded ? 0.5 : 0,
                                    duration: const Duration(milliseconds: 260),
                                    child: const Icon(Icons.keyboard_arrow_down_rounded,
                                        size: 18, color: AppCultureColors.heritageJade),
                                  ),
                                ],
                              ),
                            ),
                          ),
                      ],
                    ),
                  );
                },
              ),
            ),
            if (post.destinationName?.isNotEmpty == true || post.tourTitle?.isNotEmpty == true)
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 10, 16, 0),
                child: Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: [
                    if (post.destinationName?.isNotEmpty == true)
                      _PlaceChip(
                        icon: Icons.place_rounded,
                        text: post.destinationName!,
                        color: AppCultureColors.jadeDark,
                        background: AppCultureColors.jadeLight,
                      ),
                    if (post.tourTitle?.isNotEmpty == true)
                      _PlaceChip(
                        icon: Icons.route_rounded,
                        text: post.tourTitle!,
                        color: AppCultureColors.oceanDark,
                        background: AppCultureColors.oceanLight,
                      ),
                  ],
                ),
              ),
            if (feedback)
              Container(
                width: double.infinity,
                margin: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: status.color.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(14),
                  border: Border(left: BorderSide(color: status.color, width: 3)),
                ),
                child: Text(
                  'Phản hồi từ kiểm duyệt viên: ${post.moderationNote}',
                  style: TextStyle(fontSize: 12.5, height: 1.45, color: status.color),
                ),
              ),
            if (post.imageUrls.isNotEmpty) _ForumImages(urls: post.imageUrls),
            Padding(
              padding: const EdgeInsets.fromLTRB(6, 6, 6, 6),
              child: Row(
                children: [
                  _HeartButton(liked: post.isLiked, count: post.likesCount, onTap: widget.onLike),
                  _ActionButton(
                    onTap: widget.onTap,
                    leading: const Icon(Icons.chat_bubble_outline_rounded,
                        size: 19, color: AppCultureColors.textMuted),
                    label: '${post.commentsCount}',
                    color: AppCultureColors.textMuted,
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

/// Viền gradient ngọc quanh ảnh đại diện.
class _AvatarRing extends StatelessWidget {
  final Widget child;

  const _AvatarRing({required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(2),
      decoration: const BoxDecoration(
        shape: BoxShape.circle,
        gradient: LinearGradient(
          colors: [AppCultureColors.jadeGradientStart, AppCultureColors.gold],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Container(
        padding: const EdgeInsets.all(1.5),
        decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
        child: child,
      ),
    );
  }
}

/// Nhãn điểm đến / tour gắn với bài; tên dài thì cắt "…".
class _PlaceChip extends StatelessWidget {
  final IconData icon;
  final String text;
  final Color color;
  final Color background;

  const _PlaceChip({
    required this.icon,
    required this.text,
    required this.color,
    required this.background,
  });

  @override
  Widget build(BuildContext context) {
    return ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 240),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
        decoration: BoxDecoration(color: background, borderRadius: BorderRadius.circular(20)),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 13, color: color),
            const SizedBox(width: 4),
            Flexible(
              child: Text(
                text,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: color),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Nút tim nảy lên khi thả tim, số đếm trượt khi đổi.
class _HeartButton extends StatefulWidget {
  final bool liked;
  final int count;
  final VoidCallback? onTap;

  const _HeartButton({required this.liked, required this.count, required this.onTap});

  @override
  State<_HeartButton> createState() => _HeartButtonState();
}

class _HeartButtonState extends State<_HeartButton> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 420),
  );
  late final Animation<double> _scale = TweenSequence([
    TweenSequenceItem(tween: Tween(begin: 1.0, end: 1.4), weight: 40),
    TweenSequenceItem(tween: Tween(begin: 1.4, end: 0.9), weight: 30),
    TweenSequenceItem(tween: Tween(begin: 0.9, end: 1.0), weight: 30),
  ]).animate(CurvedAnimation(parent: _c, curve: Curves.easeOut));

  @override
  void didUpdateWidget(_HeartButton old) {
    super.didUpdateWidget(old);
    if (widget.liked && !old.liked && !reduceMotion(context)) _c.forward(from: 0);
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final color = widget.liked ? _heartColor : AppCultureColors.textMuted;
    return _ActionButton(
      onTap: widget.onTap,
      leading: ScaleTransition(
        scale: _scale,
        child: Icon(
          widget.liked ? Icons.favorite_rounded : Icons.favorite_border_rounded,
          size: 21,
          color: color,
        ),
      ),
      label: '${widget.count}',
      color: color,
    );
  }
}

class _ActionButton extends StatelessWidget {
  final VoidCallback? onTap;
  final Widget leading;
  final String label;
  final Color color;

  const _ActionButton({
    required this.onTap,
    required this.leading,
    required this.label,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(14),
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        child: Row(
          children: [
            leading,
            const SizedBox(width: 6),
            AnimatedSwitcher(
              duration: const Duration(milliseconds: 220),
              transitionBuilder: (child, anim) => FadeTransition(
                opacity: anim,
                child: SlideTransition(
                  position: Tween(begin: const Offset(0, 0.4), end: Offset.zero).animate(anim),
                  child: child,
                ),
              ),
              child: Text(
                label,
                key: ValueKey(label),
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: color),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ForumImages extends StatelessWidget {
  final List<String> urls;

  const _ForumImages({required this.urls});

  Widget _image(String url, {double? height}) {
    return Image.network(
      url,
      height: height,
      width: double.infinity,
      fit: BoxFit.cover,
      errorBuilder: (_, _, _) => Container(
        height: height,
        color: AppCultureColors.surfaceSubtle,
        alignment: Alignment.center,
        child: const Icon(Icons.broken_image_outlined, color: AppCultureColors.textLight),
      ),
      loadingBuilder: (context, child, progress) => progress == null
          ? child
          : Container(height: height, color: AppCultureColors.surfaceSubtle),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (urls.length == 1) {
      return Padding(
        padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(16),
          child: _image(urls.first, height: 210),
        ),
      );
    }
    final shown = urls.take(3).toList();
    final extra = urls.length - shown.length;
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: SizedBox(
          height: 150,
          child: Row(
            children: [
              for (var i = 0; i < shown.length; i++) ...[
                if (i > 0) const SizedBox(width: 2),
                Expanded(
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      _image(shown[i], height: 150),
                      if (i == shown.length - 1 && extra > 0)
                        Container(
                          color: Colors.black.withValues(alpha: 0.45),
                          alignment: Alignment.center,
                          child: Text(
                            '+$extra',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 22,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

/// Một lựa chọn (điểm đến hoặc tour) trong hộp chọn. [note]: dòng phụ nổi bật, vd "Bạn đã tham gia".
class ForumOption {
  final int id;
  final String label;
  final String? note;

  const ForumOption(this.id, this.label, {this.note});
}

/// Hộp chọn một mục từ danh sách tải từ API.
/// Trả về mục được chọn, hoặc mục có id âm khi người dùng bấm "Bỏ chọn", null nếu đóng hộp.
Future<ForumOption?> showForumOptionPicker(
  BuildContext context, {
  required String title,
  required Future<List<ForumOption>> Function() loader,
}) {
  return showModalBottomSheet<ForumOption>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.white,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(22)),
    ),
    builder: (ctx) => SizedBox(
      height: MediaQuery.of(ctx).size.height * 0.6,
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 18, 12, 6),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    title,
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                  ),
                ),
                TextButton(
                  onPressed: () => Navigator.of(ctx).pop(const ForumOption(-1, '')),
                  child: const Text('Bỏ chọn'),
                ),
              ],
            ),
          ),
          Expanded(
            child: FutureBuilder<List<ForumOption>>(
              future: loader(),
              builder: (context, snapshot) {
                if (snapshot.connectionState != ConnectionState.done) {
                  return const Center(child: CircularProgressIndicator(strokeWidth: 2.4));
                }
                final items = snapshot.data ?? const <ForumOption>[];
                if (snapshot.hasError || items.isEmpty) {
                  return Center(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Text(
                        snapshot.hasError
                            ? 'Không tải được danh sách. Vui lòng thử lại sau.'
                            : 'Chưa có mục nào để chọn.',
                        textAlign: TextAlign.center,
                        style: const TextStyle(color: AppCultureColors.textMuted),
                      ),
                    ),
                  );
                }
                return ListView.separated(
                  padding: const EdgeInsets.only(bottom: 16),
                  itemCount: items.length,
                  separatorBuilder: (_, _) =>
                      const Divider(height: 1, color: AppCultureColors.borderLight),
                  itemBuilder: (_, i) => ListTile(
                    title: Text(items[i].label, style: const TextStyle(fontSize: 14)),
                    subtitle: items[i].note == null
                        ? null
                        : Row(
                            children: [
                              const Icon(Icons.verified_rounded, size: 14, color: AppCultureColors.heritageJade),
                              const SizedBox(width: 4),
                              Text(
                                items[i].note!,
                                style: const TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                  color: AppCultureColors.heritageJade,
                                ),
                              ),
                            ],
                          ),
                    onTap: () => Navigator.of(ctx).pop(items[i]),
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
