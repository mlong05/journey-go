import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/models/forum_model.dart';

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
          fontWeight: FontWeight.w800,
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
        color: status.color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Text(
        status.label,
        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: status.color),
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
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
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
      title: Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
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
class ForumPostCard extends StatelessWidget {
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
  Widget build(BuildContext context) {
    final feedback = (post.status == 'REJECTED' || post.status == 'NEEDS_REVISION') &&
        post.moderationNote != null &&
        post.moderationNote!.isNotEmpty;

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: AppCultureColors.border),
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 0),
              child: Row(
                children: [
                  ForumAvatar(name: post.authorName, url: post.authorAvatarUrl),
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
                            fontSize: 14,
                            fontWeight: FontWeight.w800,
                            color: AppCultureColors.textDark,
                          ),
                        ),
                        const SizedBox(height: 1),
                        Text(
                          [timeAgo(post.createdAt), if (post.placeLine != null) post.placeLine!]
                              .where((e) => e.isNotEmpty)
                              .join(' • '),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontSize: 11.5, color: AppCultureColors.textMuted),
                        ),
                      ],
                    ),
                  ),
                  if (showStatus) ForumStatusChip(post: post),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    post.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 16,
                      height: 1.3,
                      fontWeight: FontWeight.w800,
                      color: AppCultureColors.textDark,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    post.content,
                    maxLines: 4,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 13.5,
                      height: 1.5,
                      color: AppCultureColors.textDark,
                    ),
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
                  color: ForumStatus.of(post.status).color.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Text(
                  'Phản hồi từ kiểm duyệt viên: ${post.moderationNote}',
                  style: TextStyle(
                    fontSize: 12.5,
                    height: 1.4,
                    color: ForumStatus.of(post.status).color,
                  ),
                ),
              ),
            if (post.imageUrls.isNotEmpty) _ForumImages(urls: post.imageUrls),
            const SizedBox(height: 4),
            Padding(
              padding: const EdgeInsets.fromLTRB(8, 0, 8, 8),
              child: Row(
                children: [
                  _ActionButton(
                    onTap: onLike,
                    leading: Icon(
                      post.isLiked ? Icons.favorite_rounded : Icons.favorite_border_rounded,
                      size: 21,
                      color: post.isLiked ? _heartColor : AppCultureColors.textMuted,
                    ),
                    label: '${post.likesCount}',
                    color: post.isLiked ? _heartColor : AppCultureColors.textMuted,
                  ),
                  _ActionButton(
                    onTap: onTap,
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
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        child: Row(
          children: [
            leading,
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: color),
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
        padding: const EdgeInsets.only(top: 12),
        child: _image(urls.first, height: 210),
      );
    }
    final shown = urls.take(3).toList();
    final extra = urls.length - shown.length;
    return Padding(
      padding: const EdgeInsets.only(top: 12),
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
                            fontWeight: FontWeight.w900,
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
    );
  }
}

/// Một lựa chọn (điểm đến hoặc tour) trong hộp chọn.
class ForumOption {
  final int id;
  final String label;

  const ForumOption(this.id, this.label);
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
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
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
