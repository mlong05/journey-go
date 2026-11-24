// Màn "Xem tour theo ngày": chọn ngày trên lịch → hiện các tour khởi hành ngày đó;
// nhãn trên lịch và thẻ tour không xuống dòng / tràn ở màn hình 360dp.
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/constants/app_theme.dart';
import 'package:mobile/core/models/departure_model.dart';
import 'package:mobile/core/models/tour_model.dart';
import 'package:mobile/screens/tours/tour_calendar_screen.dart';

Future<void> _loadNunito() async {
  final loader = FontLoader('Nunito');
  for (final w in ['Regular', 'Medium', 'SemiBold', 'Bold', 'ExtraBold', 'Black']) {
    loader.addFont(rootBundle.load('assets/fonts/Nunito-$w.ttf'));
  }
  await loader.load();
}

TourModel _tour(int id, String title) => TourModel.fromJson({
      'tourId': id,
      'title': title,
      'tourType': 'CULTURAL',
      'price': 350000,
      'durationDays': 2,
      'durationNights': 1,
      'regionName': 'Đông Nam Bộ',
      'tourFormat': 'MULTI_DAY',
    });

List<DepartureDay> _fakeDays(DateTime today) {
  final d1 = today.add(const Duration(days: 2));
  final d2 = today.add(const Duration(days: 5));
  return [
    DepartureDay(date: d1, tours: [
      TourDeparture(tour: _tour(1, 'Một ngày làm nghệ nhân gốm Thanh Hà'), capacity: 20, remaining: 12, available: true),
      TourDeparture(tour: _tour(2, 'Phố cổ Hội An: Chùa cổ Tấn Ký và hội quán'), capacity: 10, remaining: 3, available: true),
    ]),
    DepartureDay(date: d2, tours: [
      TourDeparture(tour: _tour(3, 'Đà Lạt chậm: Ga cổ, làng K\'Ho và đồi chè'), capacity: 8, remaining: 0, available: false),
    ]),
  ];
}

Future<void> _pump(WidgetTester tester, {double textScale = 1}) async {
  tester.view.physicalSize = const Size(360 * 3, 800 * 3);
  tester.view.devicePixelRatio = 3;
  addTearDown(tester.view.reset);
  final today = DateUtils.dateOnly(DateTime.now());
  await tester.pumpWidget(
    MaterialApp(
      theme: AppTheme.light(),
      builder: (context, child) => MediaQuery(
        data: MediaQuery.of(context).copyWith(textScaler: TextScaler.linear(textScale)),
        child: child!,
      ),
      home: TourCalendarScreen(loader: () async => _fakeDays(today)),
    ),
  );
  await tester.pumpAndSettle();
}

int _lines(RenderParagraph p) {
  final tp = TextPainter(
    text: p.text,
    textDirection: TextDirection.ltr,
    textScaler: p.textScaler,
    maxLines: p.maxLines,
    ellipsis: p.maxLines == null ? null : '…',
  )..layout(maxWidth: p.size.width + 0.5);
  final n = tp.computeLineMetrics().length;
  tp.dispose();
  return n;
}

void main() {
  setUpAll(_loadNunito);

  testWidgets('chọn sẵn ngày gần nhất có tour và liệt kê tour của ngày đó (còn chỗ trước)', (tester) async {
    await _pump(tester);
    expect(tester.takeException(), isNull);
    expect(find.text('2 tour'), findsWidgets); // ô ngày + nhãn đếm của ngày đang chọn
    expect(find.text('Một ngày làm nghệ nhân gốm Thanh Hà'), findsOneWidget);
    expect(find.text('Còn 12 chỗ'), findsOneWidget);
    expect(find.text('Còn 3 chỗ'), findsOneWidget);
  });

  testWidgets('bấm ngày khác thì đổi danh sách; tour hết chỗ hiện "Hết chỗ"', (tester) async {
    await _pump(tester);
    final d2 = DateUtils.dateOnly(DateTime.now()).add(const Duration(days: 5));
    final today = DateUtils.dateOnly(DateTime.now());
    if (d2.month != today.month) {
      await tester.tap(find.byTooltip('Tháng sau'));
      await tester.pumpAndSettle();
    }
    await tester.tap(find.text('${d2.day}').last);
    await tester.pumpAndSettle();
    expect(find.text('Hết chỗ'), findsWidgets);
    expect(find.textContaining('Đà Lạt chậm'), findsOneWidget);
    expect(find.text('Một ngày làm nghệ nhân gốm Thanh Hà'), findsNothing);
  });

  for (final scale in [1.0, 1.3]) {
    testWidgets('cỡ chữ ${(scale * 100).round()}%: nhãn 1 dòng (tên tour ≤ 2 dòng), không tràn ngang', (tester) async {
      await _pump(tester, textScale: scale);
      expect(tester.takeException(), isNull, reason: 'không được tràn (RenderFlex overflow)');
      for (final e in find.byType(RichText).evaluate()) {
        final p = e.renderObject! as RenderParagraph;
        if (!p.attached || p.size.isEmpty) continue;
        final text = p.text.toPlainText();
        if (text.trim().isEmpty) continue;
        final isTitle = text.startsWith('Một ngày') || text.startsWith('Phố cổ') || text.startsWith('Đà Lạt');
        expect(_lines(p), lessThanOrEqualTo(isTitle ? 2 : 1), reason: '"$text" bị xuống dòng');
        final rect = MatrixUtils.transformRect(p.getTransformTo(null), Offset.zero & p.size);
        expect(rect.right <= 360.5, isTrue, reason: '"$text" tràn khỏi màn hình: $rect');
      }
    });
  }
}
