// Khối thay cho hàng cuộn ngang: chip tab tự xuống hàng (nhãn 1 dòng, không tràn) và album dạng lưới "+N".
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/constants/app_theme.dart';
import 'package:mobile/screens/common/no_clip.dart';

Future<void> _loadNunito() async {
  final loader = FontLoader('Nunito');
  for (final w in ['Regular', 'Medium', 'SemiBold', 'Bold', 'ExtraBold', 'Black']) {
    loader.addFont(rootBundle.load('assets/fonts/Nunito-$w.ttf'));
  }
  await loader.load();
}

const _bookingTabs = [
  'Tất cả (12)',
  'Đã mua (3)',
  'Chờ thanh toán (1)',
  'Đang trải nghiệm (0)',
  'Đã hoàn thành (6)',
  'Đang hoàn tiền (1)',
  'Đã hoàn tiền (1)',
  'Đã hủy/Hết hạn (0)',
];

Future<void> _pump(WidgetTester tester, Widget body, {double textScale = 1}) async {
  tester.view.physicalSize = const Size(360 * 3, 800 * 3);
  tester.view.devicePixelRatio = 3;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(MaterialApp(
    theme: AppTheme.light(),
    builder: (context, child) => MediaQuery(
      data: MediaQuery.of(context).copyWith(textScaler: TextScaler.linear(textScale)),
      child: child!,
    ),
    home: Scaffold(body: body),
  ));
  await tester.pumpAndSettle();
}

void main() {
  setUpAll(_loadNunito);

  for (final scale in [1.0, 1.3]) {
    testWidgets('TabChipWrap ${(scale * 100).round()}%: 8 nhóm hiện đủ, nhãn 1 dòng, không tràn; bấm chip đổi tab',
        (tester) async {
      await _pump(
        tester,
        DefaultTabController(
          length: _bookingTabs.length,
          child: Column(
            children: [
              const TabChipWrap(labels: _bookingTabs),
              Expanded(child: TabBarView(children: [for (final t in _bookingTabs) Center(child: Text('Nội dung $t'))])),
            ],
          ),
        ),
        textScale: scale,
      );
      expect(tester.takeException(), isNull);
      for (final label in _bookingTabs) {
        final p = tester.renderObject<RenderParagraph>(find.text(label));
        final rect = MatrixUtils.transformRect(p.getTransformTo(null), Offset.zero & p.size);
        expect(rect.left >= 0 && rect.right <= 360.5, isTrue, reason: '"$label" tràn: $rect');
        final tp = TextPainter(text: p.text, textDirection: TextDirection.ltr, textScaler: p.textScaler)
          ..layout(maxWidth: p.size.width + 0.5);
        expect(tp.computeLineMetrics().length, 1, reason: '"$label" bị xuống dòng');
        tp.dispose();
      }
      await tester.tap(find.text('Đã hoàn thành (6)'));
      await tester.pumpAndSettle();
      expect(find.text('Nội dung Đã hoàn thành (6)'), findsOneWidget);
    });
  }

  testWidgets('PhotoGridPreview: 3 cột vừa khít bề ngang, tối đa 6 ô, ô cuối "+N"', (tester) async {
    final images = [for (var i = 0; i < 9; i++) 'https://example.com/$i.jpg'];
    int? opened;
    await _pump(
      tester,
      Padding(
        padding: const EdgeInsets.all(16),
        child: PhotoGridPreview(images: images, onOpen: (i) => opened = i),
      ),
    );
    expect(find.text('+3'), findsOneWidget);
    expect(find.byType(GestureDetector), findsNWidgets(6));
    final cells = tester.widgetList<SizedBox>(
      find.descendant(of: find.byType(PhotoGridPreview), matching: find.byType(SizedBox)),
    );
    for (final c in cells.where((c) => c.width != null && c.height != null)) {
      expect(c.width! * 3 + 8 * 2, lessThanOrEqualTo(328 + 0.5), reason: '3 ô + 2 khoảng cách phải vừa 328dp');
    }
    await tester.tap(find.text('+3'));
    expect(opened, 5);
  });
}
