import 'package:flutter/material.dart';
import '../../core/services/api_client.dart';
import '../../core/services/progress_service.dart';
import 'journey_screen.dart';
import '../../l10n/locale_controller.dart';

/// Mở hành trình đang đi của du khách. Nếu chưa có, báo cách bắt đầu (đặt tour trước).
/// [qr] = true mở thẳng màn quét QR để check-in điểm đến hiện tại.
Future<void> openActiveJourney(BuildContext context, {bool qr = false}) async {
  final messenger = ScaffoldMessenger.of(context);
  final navigator = Navigator.of(context);
  try {
    final journey = await ProgressService().getActiveJourney();
    if (journey == null) {
      messenger.showSnackBar(SnackBar(
        content: Text(appL10n.jlNoActiveJourney),
        behavior: SnackBarBehavior.floating,
      ));
      return;
    }
    await navigator.push(
      MaterialPageRoute(builder: (_) => JourneyScreen(journeyId: journey.id, autoQr: qr)),
    );
  } on ApiException catch (e) {
    messenger.showSnackBar(SnackBar(content: Text(e.message), behavior: SnackBarBehavior.floating));
  }
}
