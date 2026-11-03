import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';

class NotificationDialog extends StatefulWidget {
  final VoidCallback? onAllRead;

  const NotificationDialog({super.key, this.onAllRead});

  @override
  State<NotificationDialog> createState() => _NotificationDialogState();
}

class _NotificationDialogState extends State<NotificationDialog> {
  final List<Map<String, dynamic>> _notifications = [
    {
      'id': 1,
      'title': '🎁 Nhận thưởng Check-in Văn Miếu',
      'desc': 'Bạn đã nhận được +100 điểm di sản khi hoàn thành tương tác trắc nghiệm.',
      'time': '15 phút trước',
      'isUnread': true,
      'tag': 'Điểm thưởng',
      'tagColor': AppCultureColors.heritageJade,
    },
    {
      'id': 2,
      'title': '🏮 Khai mạc Tour Đêm Văn Miếu',
      'desc': 'Chương trình trải nghiệm 3D mapping "Tinh hoa Đạo học" bắt đầu lúc 19:30 tối nay.',
      'time': '1 giờ trước',
      'isUnread': true,
      'tag': 'Sự kiện',
      'tagColor': AppCultureColors.gold,
    },
    {
      'id': 3,
      'title': '🧭 AI gợi ý lộ trình mới cho bạn',
      'desc': 'Khám phá tuyến "Dấu ấn Thăng Long ngàn năm" kết hợp 5 di tích trọng điểm.',
      'time': 'Hôm qua',
      'isUnread': false,
      'tag': 'Gợi ý',
      'tagColor': AppCultureColors.oceanBlue,
    },
  ];

  void _markAllRead() {
    setState(() {
      for (var item in _notifications) {
        item['isUnread'] = false;
      }
    });
    widget.onAllRead?.call();
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Đã đánh dấu tất cả thông báo là đã đọc')),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Drag handle
          Center(
            child: Container(
              margin: const EdgeInsets.only(bottom: 12),
              width: 44,
              height: 5,
              decoration: BoxDecoration(
                color: Colors.grey[300],
                borderRadius: BorderRadius.circular(3),
              ),
            ),
          ),

          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Row(
                children: [
                  Icon(Icons.notifications_active_rounded, color: AppCultureColors.heritageJade, size: 22),
                  SizedBox(width: 8),
                  Text(
                    'Thông Báo Di Sản',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                      color: AppCultureColors.textDark,
                    ),
                  ),
                ],
              ),
              TextButton(
                onPressed: _markAllRead,
                child: const Text(
                  'Đã đọc tất cả',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: AppCultureColors.heritageJade,
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 12),

          ..._notifications.map((n) {
            final isUnread = n['isUnread'] == true;

            return Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: isUnread ? AppCultureColors.jadeLight.withValues(alpha: 0.35) : AppCultureColors.surfaceSubtle,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: isUnread ? AppCultureColors.heritageJade.withValues(alpha: 0.3) : AppCultureColors.border,
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: (n['tagColor'] as Color).withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          n['tag'],
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: n['tagColor'],
                          ),
                        ),
                      ),
                      Text(
                        n['time'],
                        style: const TextStyle(fontSize: 12, color: AppCultureColors.textMuted),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    n['title'],
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w800,
                      color: AppCultureColors.textDark,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    n['desc'],
                    style: const TextStyle(
                      fontSize: 13,
                      color: AppCultureColors.textMuted,
                      height: 1.35,
                    ),
                  ),
                ],
              ),
            );
          }),

          const SizedBox(height: 10),
        ],
      ),
    );
  }
}
