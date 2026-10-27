import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';

/// AppBar dùng chung cho các màn hình điểm thưởng & voucher.
AppBar buildRewardsAppBar(BuildContext context, String title, {List<Widget>? actions}) {
  return AppBar(
    backgroundColor: Colors.white,
    elevation: 0,
    centerTitle: true,
    leading: IconButton(
      icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18, color: AppCultureColors.textDark),
      onPressed: () => Navigator.of(context).maybePop(),
      tooltip: 'Quay lại',
    ),
    title: Text(
      title,
      style: const TextStyle(
        fontSize: 16,
        fontWeight: FontWeight.w800,
        color: AppCultureColors.textDark,
      ),
    ),
    actions: actions,
    bottom: PreferredSize(
      preferredSize: const Size.fromHeight(1),
      child: Container(height: 1, color: AppCultureColors.border),
    ),
  );
}

/// Trạng thái rỗng / lỗi, kèm nút thử lại nếu có [onRetry].
class RewardsMessageView extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? message;
  final VoidCallback? onRetry;

  const RewardsMessageView({
    super.key,
    required this.icon,
    required this.title,
    this.message,
    this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: const BoxDecoration(
                color: AppCultureColors.surfaceSubtle,
                shape: BoxShape.circle,
              ),
              child: Icon(icon, size: 30, color: AppCultureColors.textMuted),
            ),
            const SizedBox(height: 14),
            Text(
              title,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w800,
                color: AppCultureColors.textDark,
              ),
            ),
            if (message != null) ...[
              const SizedBox(height: 6),
              Text(
                message!,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 12.5,
                  height: 1.4,
                  color: AppCultureColors.textMuted,
                ),
              ),
            ],
            if (onRetry != null) ...[
              const SizedBox(height: 16),
              OutlinedButton.icon(
                onPressed: onRetry,
                icon: const Icon(Icons.refresh_rounded, size: 18),
                label: const Text('Thử lại'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppCultureColors.heritageJade,
                  side: const BorderSide(color: AppCultureColors.heritageJade),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Khung xương (skeleton) cho danh sách đang tải.
class RewardsSkeletonList extends StatelessWidget {
  final int count;
  final double itemHeight;

  const RewardsSkeletonList({super.key, this.count = 4, this.itemHeight = 92});

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      physics: const NeverScrollableScrollPhysics(),
      padding: const EdgeInsets.all(16),
      itemCount: count,
      separatorBuilder: (_, _) => const SizedBox(height: 12),
      itemBuilder: (_, _) => Container(
        height: itemHeight,
        decoration: BoxDecoration(
          color: AppCultureColors.surfaceSubtle,
          borderRadius: BorderRadius.circular(18),
        ),
      ),
    );
  }
}

/// Hộp thoại hiển thị mã voucher vừa đổi và cho phép sao chép.
Future<void> showCopyableCodeDialog(
  BuildContext context, {
  required String title,
  required String code,
  String? subtitle,
}) {
  return showDialog<void>(
    context: context,
    builder: (ctx) => AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
      title: Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (subtitle != null) ...[
            Text(subtitle, style: const TextStyle(fontSize: 13, color: AppCultureColors.textMuted)),
            const SizedBox(height: 12),
          ],
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: BoxDecoration(
              color: AppCultureColors.jadeLight,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppCultureColors.heritageJade.withValues(alpha: 0.3)),
            ),
            child: SelectableText(
              code,
              style: const TextStyle(
                fontFamily: 'monospace',
                fontSize: 15,
                fontWeight: FontWeight.w800,
                letterSpacing: 0.6,
                color: AppCultureColors.jadeDark,
              ),
            ),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(ctx).pop(),
          child: const Text('Đóng'),
        ),
      ],
    ),
  );
}
