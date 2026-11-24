import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../l10n/locale_controller.dart';

/// Giờ khởi hành, địa điểm tập trung, giờ đón — dùng chung cho mọi ngày khởi hành của tour.
/// Dùng ở màn chi tiết tour và màn chi tiết đơn. Mục nào trống thì ẩn.
class DepartureInfoList extends StatelessWidget {
  final String? departureTime;
  final String? meetingPoint;
  final String? pickupInfo;

  const DepartureInfoList({super.key, this.departureTime, this.meetingPoint, this.pickupInfo});

  static bool hasAny(String? departureTime, String? meetingPoint, String? pickupInfo) =>
      [departureTime, meetingPoint, pickupInfo].any((v) => v != null && v.trim().isNotEmpty);

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final rows = <(IconData, String, String)>[
      if (_has(departureTime)) (Icons.schedule_rounded, l10n.departureTime, departureTime!.trim()),
      if (_has(meetingPoint)) (Icons.place_rounded, l10n.departureMeetingPoint, meetingPoint!.trim()),
      if (_has(pickupInfo)) (Icons.airport_shuttle_rounded, l10n.departurePickup, pickupInfo!.trim()),
    ];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (final (i, (icon, title, text)) in rows.indexed) ...[
          if (i > 0) const Divider(height: 20, color: AppCultureColors.borderLight),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(color: AppCultureColors.jadeLight, borderRadius: BorderRadius.circular(10)),
                child: Icon(icon, size: 18, color: AppCultureColors.heritageJade),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title,
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppCultureColors.textMuted)),
                    const SizedBox(height: 2),
                    SelectableText(
                      text,
                      style: TextStyle(
                        fontSize: icon == Icons.schedule_rounded ? 16 : 14,
                        height: 1.45,
                        fontWeight: icon == Icons.schedule_rounded ? FontWeight.w800 : FontWeight.w500,
                        color: AppCultureColors.textDark,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ],
    );
  }

  static bool _has(String? v) => v != null && v.trim().isNotEmpty;
}
