import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart' show RenderRepaintBoundary;
import 'package:share_plus/share_plus.dart';

import '../../core/constants/app_colors.dart';
import '../../core/models/tour_journey_model.dart';
import '../common/photo.dart';
import 'heritage_passport.dart';
import '../../l10n/locale_controller.dart';

/// Thẻ chia sẻ khi xong hành trình: ảnh dọc kiểu story (9:16) gồm ảnh tour, điểm, số trạm, thử thách
/// và các dấu ấn di sản — xem trước rồi chia sẻ lên mạng xã hội dưới dạng ảnh PNG.
Future<void> showJourneyShareSheet(BuildContext context, {required TourJourney journey, String? coverImage}) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: AppCultureColors.background,
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(28))),
    builder: (_) => _ShareSheet(journey: journey, coverImage: coverImage),
  );
}

class _ShareSheet extends StatefulWidget {
  final TourJourney journey;
  final String? coverImage;
  const _ShareSheet({required this.journey, required this.coverImage});

  @override
  State<_ShareSheet> createState() => _ShareSheetState();
}

class _ShareSheetState extends State<_ShareSheet> {
  final GlobalKey _cardKey = GlobalKey();
  bool _busy = false;

  Future<void> _share() async {
    final boundary = _cardKey.currentContext?.findRenderObject() as RenderRepaintBoundary?;
    if (boundary == null) return;
    setState(() => _busy = true);
    try {
      final image = await boundary.toImage(pixelRatio: 3);
      final data = await image.toByteData(format: ui.ImageByteFormat.png);
      if (data == null) throw StateError(appL10n.shareImageFailed);
      final j = widget.journey;
      await SharePlus.instance.share(ShareParams(
        files: [XFile.fromData(data.buffer.asUint8List(), mimeType: 'image/png', name: 'journeygo-hanh-trinh.png')],
        text: appL10n.shareText(j.tourName, j.totalPoints, j.doneCount - j.skippedCount, j.totalDestinations),
        subject: appL10n.shareSubject,
      ));
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(appL10n.shareFailed), behavior: SnackBarBehavior.floating),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final maxH = MediaQuery.sizeOf(context).height * 0.62;
    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(color: AppCultureColors.decorative, borderRadius: BorderRadius.circular(4)),
            ),
            const SizedBox(height: 14),
            Text(appL10n.sumShare,
                style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: AppCultureColors.textDark)),
            const SizedBox(height: 14),
            ConstrainedBox(
              constraints: BoxConstraints(maxHeight: maxH),
              child: AspectRatio(
                aspectRatio: 9 / 16,
                child: FittedBox(
                  child: RepaintBoundary(
                    key: _cardKey,
                    child: JourneyShareCard(journey: widget.journey, coverImage: widget.coverImage),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              height: 52,
              child: FilledButton.icon(
                onPressed: _busy ? null : _share,
                icon: _busy
                    ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Icon(Icons.ios_share_rounded, size: 20),
                label: Text(appL10n.shareImage, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                style: FilledButton.styleFrom(
                  backgroundColor: AppCultureColors.heritageJade,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Thẻ thành tích 360×640 (logic px) — xuất ảnh ở 3× ⇒ 1080×1920, đúng khổ story.
class JourneyShareCard extends StatelessWidget {
  final TourJourney journey;
  final String? coverImage;
  const JourneyShareCard({super.key, required this.journey, this.coverImage});

  @override
  Widget build(BuildContext context) {
    final dests = [...journey.destinations]..sort((a, b) => a.orderIndex.compareTo(b.orderIndex));
    final stamped = dests.where((d) => d.checkedIn).toList();
    final shown = stamped.take(6).toList();
    final rank = switch (journey.completionRank) {
      CompletionRank.perfect => appL10n.shareRankPerfect,
      CompletionRank.partial => appL10n.shareRankPartial,
      _ => appL10n.shareRankDone,
    };
    return SizedBox(
      width: 360,
      height: 640,
      child: DecoratedBox(
        decoration: const BoxDecoration(color: Color(0xFF0F172A)),
        child: Stack(
          children: [
            Positioned(
              left: 0,
              right: 0,
              top: 0,
              height: 300,
              child: Photo(url: coverImage, width: 360, semanticLabel: journey.tourName),
            ),
            const Positioned(
              left: 0,
              right: 0,
              top: 0,
              height: 300,
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [Color(0x330F172A), Color(0x000F172A), Color(0xFF0F172A)],
                    stops: [0, 0.45, 1],
                  ),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(22, 22, 22, 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: const Color(0xCC0F172A),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: const Text('JourneyGo',
                        style: TextStyle(color: Colors.white, fontSize: 12.5, fontWeight: FontWeight.w900, letterSpacing: 0.4)),
                  ),
                  const Spacer(flex: 5),
                  Text(rank,
                      style: const TextStyle(
                          color: Color(0xFF2DD4BF), fontSize: 11.5, fontWeight: FontWeight.w900, letterSpacing: 1.6)),
                  const SizedBox(height: 6),
                  Text(
                    journey.tourName,
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: Colors.white, fontSize: 24, height: 1.2, fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      _stat('${journey.totalPoints}', appL10n.shareStatPoints, const Color(0xFFFACC15)),
                      const SizedBox(width: 8),
                      _stat('${journey.doneCount - journey.skippedCount}/${journey.totalDestinations}', appL10n.shareStatStops, const Color(0xFF2DD4BF)),
                      const SizedBox(width: 8),
                      _stat('${journey.passedTaskCount}/${journey.allTasks.length}', appL10n.shareStatChallenges, const Color(0xFFA5B4FC)),
                    ],
                  ),
                  const SizedBox(height: 18),
                  if (shown.isNotEmpty)
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 8),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Column(
                        children: [
                          Text(appL10n.shareStamps(stamped.length),
                              style: const TextStyle(
                                  fontSize: 10.5, fontWeight: FontWeight.w900, letterSpacing: 1.2, color: Color(0xFF475569))),
                          const SizedBox(height: 10),
                          Wrap(
                            spacing: 6,
                            runSpacing: 6,
                            alignment: WrapAlignment.center,
                            children: [
                              for (final d in shown)
                                HeritageStamp(order: d.orderIndex, name: d.name, date: d.checkedInAt, stamped: true, size: 66),
                            ],
                          ),
                        ],
                      ),
                    ),
                  const Spacer(flex: 2),
                  Text(appL10n.shareFooter,
                      style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11.5, fontWeight: FontWeight.w600)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  static Widget _stat(String value, String label, Color color) => Expanded(
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(color: const Color(0xFF1E293B), borderRadius: BorderRadius.circular(14)),
          child: Column(
            children: [
              Text(value, style: TextStyle(color: color, fontSize: 20, fontWeight: FontWeight.w900)),
              const SizedBox(height: 2),
              Text(label, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11.5, fontWeight: FontWeight.w600)),
            ],
          ),
        ),
      );
}
