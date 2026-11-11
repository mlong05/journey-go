import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/models/notification_model.dart';
import '../../core/services/notification_service.dart';
import '../booking/bookings_screen.dart';
import '../common/heritage_motion.dart';
import '../common/live_time.dart';
import '../../core/services/api_client.dart';
import '../../core/services/forum_service.dart';
import '../forum/my_posts_screen.dart';
import '../forum/post_detail_screen.dart';
import '../refunds_screen.dart';
import '../rewards/badges_screen.dart';

// ── Kiểu hiển thị theo nhóm (backend: NotificationType.Category) ─────────────

class _CategoryStyle {
  final IconData icon;
  final Color color;
  final Color background;
  final String label;
  const _CategoryStyle(this.icon, this.color, this.background, this.label);
}

const _styles = {
  'BOOKING': _CategoryStyle(Icons.confirmation_number_rounded, AppCultureColors.oceanBlue, AppCultureColors.oceanLight, 'Đặt chỗ'),
  'REFUND': _CategoryStyle(Icons.currency_exchange_rounded, AppCultureColors.amberDark, AppCultureColors.rewardBg, 'Hoàn tiền'),
  'REWARD': _CategoryStyle(Icons.military_tech_rounded, AppCultureColors.amberDark, AppCultureColors.rewardBg, 'Phần thưởng'),
  'APPROVED': _CategoryStyle(Icons.verified_rounded, AppCultureColors.jadeDark, AppCultureColors.jadeLight, 'Đã duyệt'),
  'REJECTED': _CategoryStyle(Icons.error_outline_rounded, Color(0xFFDC2626), Color(0xFFFEE2E2), 'Cần xem lại'),
  'COMMUNITY': _CategoryStyle(Icons.forum_rounded, AppCultureColors.oceanBlue, AppCultureColors.oceanLight, 'Cộng đồng'),
  'FINANCE': _CategoryStyle(Icons.account_balance_wallet_rounded, AppCultureColors.jadeDark, AppCultureColors.jadeLight, 'Tài chính'),
  'REVIEW': _CategoryStyle(Icons.fact_check_rounded, AppCultureColors.oceanBlue, AppCultureColors.oceanLight, 'Thẩm định'),
};

const _fallbackStyle =
    _CategoryStyle(Icons.notifications_rounded, AppCultureColors.jadeDark, AppCultureColors.jadeLight, 'Thông báo');

_CategoryStyle _styleOf(String category) => _styles[category] ?? _fallbackStyle;

String _timeAgo(DateTime? t) {
  if (t == null) return '';
  final diff = DateTime.now().difference(t);
  if (diff.inMinutes < 1) return 'Vừa xong';
  if (diff.inHours < 1) return '${diff.inMinutes} phút trước';
  if (diff.inDays < 1) return '${diff.inHours} giờ trước';
  if (diff.inDays == 1) return 'Hôm qua';
  if (diff.inDays < 7) return '${diff.inDays} ngày trước';
  return '${t.day.toString().padLeft(2, '0')}/${t.month.toString().padLeft(2, '0')}/${t.year}';
}

/// Thông báo có màn đích để mở hay không (thông báo về báo cáo vi phạm thì chỉ đánh dấu đã đọc).
bool _hasTarget(AppNotification n) => const {'BOOKING', 'REFUND', 'BADGE', 'POST'}.contains(n.refType);

/// Bài viết đang công khai: mở thẳng chi tiết bài. Còn lại (bị ẩn / từ chối / cần sửa) mở "Bài viết của tôi".
const _openPostDetailTypes = {'POST_COMMENTED', 'POST_APPROVED', 'POST_RESTORED'};

/// Đánh dấu đã đọc và mở màn liên quan (booking, hoàn tiền, huy hiệu, bài viết).
/// Nhận [NavigatorState] lấy sẵn để vẫn điều hướng được sau khi bảng thông báo đã đóng.
Future<void> openNotificationTarget(NavigatorState navigator, AppNotification n) async {
  NotificationCenter.instance.markRead(n);
  Widget? screen = switch (n.refType) {
    'BOOKING' => const BookingsScreen(),
    'REFUND' => const RefundsScreen(),
    'BADGE' => const BadgesScreen(),
    'POST' => const MyPostsScreen(),
    _ => null,
  };
  if (n.refType == 'POST' && n.refId != null && _openPostDetailTypes.contains(n.type)) {
    try {
      screen = PostDetailScreen(post: await ForumService().getPost(n.refId!));
    } on ApiException {
      // bài không còn xem được: về danh sách bài của tôi
    }
  }
  if (screen != null && navigator.mounted) {
    final target = screen;
    navigator.push(MaterialPageRoute(builder: (_) => target));
  }
}

/// Mở bảng thông báo (dùng ở trang chủ và hồ sơ).
Future<void> showNotificationSheet(BuildContext context) {
  NotificationCenter.instance.refresh();
  return showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (_) => const NotificationDialog(),
  );
}

/// Banner nổi trong app khi có thông báo mới (gọi từ màn chính).
void showIncomingNotification(BuildContext context, AppNotification n) {
  final style = _styleOf(n.category);
  final messenger = ScaffoldMessenger.of(context);
  messenger.hideCurrentSnackBar();
  messenger.showSnackBar(SnackBar(
    behavior: SnackBarBehavior.floating,
    backgroundColor: Colors.white,
    elevation: 8,
    margin: const EdgeInsets.fromLTRB(12, 0, 12, 90),
    padding: const EdgeInsets.fromLTRB(12, 10, 8, 10),
    duration: const Duration(seconds: 5),
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(18),
      side: const BorderSide(color: AppCultureColors.border),
    ),
    content: GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () {
        messenger.hideCurrentSnackBar();
        openNotificationTarget(Navigator.of(context), n);
      },
      child: Row(
        children: [
          _CategoryIcon(style: style, size: 40),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(n.title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        fontSize: 14, fontWeight: FontWeight.w700, color: AppCultureColors.textDark)),
                if (n.body.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(n.body,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 12.5, height: 1.35, color: AppCultureColors.textMuted)),
                ],
              ],
            ),
          ),
          const Icon(Icons.chevron_right_rounded, color: AppCultureColors.textLight),
        ],
      ),
    ),
  ));
}

/// Biểu tượng chuông kèm số chưa đọc, tự cập nhật theo [NotificationCenter].
class NotificationBellIcon extends StatelessWidget {
  final Color color;
  final double size;
  const NotificationBellIcon({super.key, this.color = Colors.white, this.size = 20});

  @override
  Widget build(BuildContext context) {
    final center = NotificationCenter.instance;
    return ListenableBuilder(
      listenable: center,
      builder: (context, _) {
        final count = center.unread;
        return Stack(
          clipBehavior: Clip.none,
          children: [
            Icon(count > 0 ? Icons.notifications_active_rounded : Icons.notifications_none_rounded,
                color: color, size: size),
            if (count > 0)
              Positioned(
                top: -7,
                right: -8,
                child: Container(
                  constraints: const BoxConstraints(minWidth: 17),
                  height: 17,
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFFE11D48),
                    borderRadius: BorderRadius.circular(9),
                    border: Border.all(color: Colors.white, width: 1.5),
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    count > 99 ? '99+' : '$count',
                    style: const TextStyle(
                        color: Colors.white, fontSize: 9.5, fontWeight: FontWeight.w700, height: 1.1),
                  ),
                ),
              ),
          ],
        );
      },
    );
  }
}

/// Bảng thông báo của du khách.
class NotificationDialog extends StatelessWidget {
  const NotificationDialog({super.key});

  @override
  Widget build(BuildContext context) {
    final center = NotificationCenter.instance;
    final maxHeight = MediaQuery.sizeOf(context).height * 0.82;
    return Container(
      constraints: BoxConstraints(maxHeight: maxHeight),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(26)),
      ),
      child: ListenableBuilder(
        listenable: center,
        builder: (context, _) {
          final items = center.items;
          return Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const SizedBox(height: 10),
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(color: AppCultureColors.border, borderRadius: BorderRadius.circular(2)),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 10, 8, 6),
                child: Row(
                  children: [
                    const Text(
                      'Thông báo',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: AppCultureColors.textDark),
                    ),
                    if (center.unread > 0) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFFE4E6),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text('${center.unread} mới',
                            style: const TextStyle(
                                fontSize: 11.5, fontWeight: FontWeight.w700, color: Color(0xFFBE123C))),
                      ),
                    ],
                    const Spacer(),
                    if (center.unread > 0)
                      TextButton.icon(
                        onPressed: center.markAllRead,
                        icon: const Icon(Icons.done_all_rounded, size: 18),
                        label: const Text('Đọc tất cả'),
                        style: TextButton.styleFrom(foregroundColor: AppCultureColors.jadeDark),
                      ),
                    IconButton(
                      onPressed: () => Navigator.of(context).pop(),
                      icon: const Icon(Icons.close_rounded),
                      color: AppCultureColors.textMuted,
                      tooltip: 'Đóng',
                    ),
                  ],
                ),
              ),
              const Divider(height: 1, color: AppCultureColors.borderLight),
              Flexible(
                child: center.loading && items.isEmpty
                    ? const Padding(
                        padding: EdgeInsets.all(40),
                        child: CircularProgressIndicator(color: AppCultureColors.heritageJade),
                      )
                    : items.isEmpty
                        ? const _EmptyState()
                        : ListView.separated(
                            shrinkWrap: true,
                            padding: EdgeInsets.fromLTRB(12, 8, 12, 16 + MediaQuery.paddingOf(context).bottom),
                            itemCount: items.length + (center.hasMore ? 1 : 0),
                            separatorBuilder: (_, _) => const SizedBox(height: 6),
                            itemBuilder: (context, i) {
                              if (i == items.length) return const _LoadMoreButton();
                              final n = items[i];
                              return _NotificationTile(
                                n: n,
                                onTap: () {
                                  final navigator = Navigator.of(context);
                                  // Có màn đích thì đóng bảng rồi mở màn đó; không có thì chỉ đánh dấu đã đọc
                                  if (_hasTarget(n)) navigator.pop();
                                  openNotificationTarget(navigator, n);
                                },
                              );
                            },
                          ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _NotificationTile extends StatelessWidget {
  final AppNotification n;
  final VoidCallback onTap;
  const _NotificationTile({required this.n, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final style = _styleOf(n.category);
    return Material(
      color: n.read ? Colors.white : AppCultureColors.jadeLight.withValues(alpha: 0.55),
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(10, 12, 12, 12),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _CategoryIcon(style: style),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Text(
                            n.title,
                            style: TextStyle(
                              fontSize: 14.5,
                              height: 1.3,
                              fontWeight: n.read ? FontWeight.w600 : FontWeight.w700,
                              color: AppCultureColors.textDark,
                            ),
                          ),
                        ),
                        if (!n.read)
                          Container(
                            margin: const EdgeInsets.only(left: 6, top: 5),
                            width: 8,
                            height: 8,
                            decoration: const BoxDecoration(color: Color(0xFFE11D48), shape: BoxShape.circle),
                          ),
                      ],
                    ),
                    if (n.body.isNotEmpty) ...[
                      const SizedBox(height: 3),
                      Text(
                        n.body,
                        maxLines: 3,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 13, height: 1.4, color: AppCultureColors.textMuted),
                      ),
                    ],
                    const SizedBox(height: 6),
                    LiveTime(
                      builder: (_) => Text(
                        '${style.label} · ${_timeAgo(n.createdAt)}',
                        style: const TextStyle(fontSize: 11.5, color: AppCultureColors.textLight),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CategoryIcon extends StatelessWidget {
  final _CategoryStyle style;
  final double size;
  const _CategoryIcon({required this.style, this.size = 42});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(color: style.background, borderRadius: BorderRadius.circular(size * 0.33)),
      child: Icon(style.icon, color: style.color, size: size * 0.5),
    );
  }
}

class _LoadMoreButton extends StatefulWidget {
  const _LoadMoreButton();

  @override
  State<_LoadMoreButton> createState() => _LoadMoreButtonState();
}

class _LoadMoreButtonState extends State<_LoadMoreButton> {
  bool _busy = false;

  Future<void> _load() async {
    setState(() => _busy = true);
    try {
      await NotificationCenter.instance.loadMore();
    } catch (_) {
      // giữ danh sách hiện có
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: TextButton(
        onPressed: _busy ? null : _load,
        style: TextButton.styleFrom(foregroundColor: AppCultureColors.textMuted),
        child: _busy
            ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
            : const Text('Xem thông báo cũ hơn'),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(20, 24, 20, 32 + MediaQuery.paddingOf(context).bottom),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox(
            width: 110,
            height: 110,
            child: Stack(
              alignment: Alignment.center,
              children: [
                SlowSpin(child: DrumMotif(size: 110, color: AppCultureColors.heritageJade.withValues(alpha: 0.22))),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
                  child: const Icon(Icons.notifications_none_rounded, size: 32, color: AppCultureColors.jadeDark),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          const Text(
            'Chưa có thông báo',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: AppCultureColors.textDark),
          ),
          const SizedBox(height: 6),
          const Text(
            'Kết quả thanh toán, hoàn tiền, huy hiệu và bài viết của bạn sẽ hiện ở đây.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 13, height: 1.45, color: AppCultureColors.textMuted),
          ),
        ],
      ),
    );
  }
}
