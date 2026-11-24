// Trang chủ trên điện thoại 360dp: mọi nhãn (danh mục, chủ đề, vùng miền, ngày, giá) nằm trên 1 dòng,
// không phần tử nào tràn/bị cắt ở mép màn hình; riêng tên tour được tối đa 2 dòng.
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/constants/app_theme.dart';
import 'package:mobile/core/models/tour_model.dart';
import 'package:mobile/l10n/app_localizations.dart';
import 'package:mobile/screens/tabs/home/home_sections.dart';

const _screenWidth = 360.0;

/// Số dòng thực tế của đoạn chữ ở bề rộng nó được cấp.
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

/// Hình chữ nhật trên màn hình (tính cả phép thu nhỏ của FittedBox).
Rect _onScreen(RenderParagraph p) => MatrixUtils.transformRect(p.getTransformTo(null), Offset.zero & p.size);

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
      'price': 390000,
      'durationDays': 1,
      'regionName': 'Miền Trung',
      'tourFormat': 'DAY_TRIP',
      'durationMinutes': 210,
      'nextDepartureDate': '2026-11-21',
    });

const _themeNames = [
  'Làng nghề truyền thống',
  'Ẩm thực bản địa',
  'Văn hoá tâm linh',
  'Lễ hội dân gian',
  'Kiến trúc cổ',
  'Di sản thiên nhiên',
  'Nghệ thuật trình diễn',
  'Bảo tàng & lịch sử',
];

Future<void> _pump(WidgetTester tester, Widget child, {double textScale = 1}) async {
  tester.view.physicalSize = const Size(_screenWidth * 3, 2400);
  tester.view.devicePixelRatio = 3;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    MaterialApp(
      theme: AppTheme.light(),
      locale: const Locale('vi'),
      supportedLocales: AppLocalizations.supportedLocales,
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      home: MediaQuery(
        data: MediaQueryData(size: const Size(_screenWidth, 800), textScaler: TextScaler.linear(textScale)),
        child: Scaffold(body: SingleChildScrollView(child: child)),
      ),
    ),
  );
  await tester.pumpAndSettle();
}

/// Mọi đoạn chữ bên trong [of] đều đúng 1 dòng và nằm trọn trong bề ngang màn hình.
void _expectSingleLineInside(WidgetTester tester, Finder of) {
  final texts = find.descendant(of: of, matching: find.byType(RichText));
  expect(texts, findsWidgets);
  for (final e in texts.evaluate()) {
    final p = e.renderObject! as RenderParagraph;
    final text = p.text.toPlainText();
    expect(_lines(p), 1, reason: '"$text" bị xuống dòng');
    expect(p.didExceedMaxLines, isFalse, reason: '"$text" bị cắt');
    final rect = _onScreen(p);
    expect(rect.left >= 0 && rect.right <= _screenWidth + 0.5, isTrue, reason: '"$text" tràn khỏi màn hình: $rect');
  }
}

void main() {
  setUpAll(_loadNunito);

  for (final scale in [1.0, 1.3]) {
    group('cỡ chữ ${(scale * 100).round()}%', () {
      testWidgets('4 nút danh mục chia đều, nhãn 1 dòng', (tester) async {
        await _pump(
          tester,
          HomeCategoryRow(
            items: [
              (icon: Icons.wb_sunny_rounded, label: 'Trong ngày', colors: HomeCategoryColors.teal, onTap: () {}),
              (icon: Icons.nights_stay_rounded, label: 'Nhiều ngày', colors: HomeCategoryColors.blue, onTap: () {}),
              (icon: Icons.event_rounded, label: 'Theo ngày', colors: HomeCategoryColors.orange, onTap: () {}),
              (icon: Icons.local_offer_rounded, label: 'Ưu đãi', colors: HomeCategoryColors.violet, onTap: () {}),
            ],
          ),
          textScale: scale,
        );
        expect(tester.takeException(), isNull);
        _expectSingleLineInside(tester, find.byType(HomeCategoryRow));
      });

      for (final lang in ['en', 'ja']) {
        testWidgets('4 nút danh mục ($lang): nhãn dịch vẫn 1 dòng', (tester) async {
          final l10n = lookupAppLocalizations(Locale(lang));
          await _pump(
            tester,
            HomeCategoryRow(
              items: [
                (icon: Icons.wb_sunny_rounded, label: l10n.homeCatDayTrip, colors: HomeCategoryColors.teal, onTap: () {}),
                (icon: Icons.nights_stay_rounded, label: l10n.homeCatMultiDay, colors: HomeCategoryColors.blue, onTap: () {}),
                (icon: Icons.event_rounded, label: l10n.homeCatByDate, colors: HomeCategoryColors.orange, onTap: () {}),
                (icon: Icons.local_offer_rounded, label: l10n.homeCatDeals, colors: HomeCategoryColors.violet, onTap: () {}),
              ],
            ),
            textScale: scale,
          );
          expect(tester.takeException(), isNull);
          _expectSingleLineInside(tester, find.byType(HomeCategoryRow));
        });
      }

      testWidgets('chip chủ đề: tên 1 dòng, không chip nào bị cắt, vừa đúng 2 hàng, dư gom vào "+N"', (tester) async {
        await _pump(
          tester,
          CatalogChipWrap(
            sheetTitle: 'Tất cả chủ đề',
            moreLabel: 'chủ đề',
            items: [
              for (final n in _themeNames) (label: n, trailing: null, photo: (url: null, credit: null), onTap: () {}),
            ],
          ),
          textScale: scale,
        );
        expect(tester.takeException(), isNull);
        _expectSingleLineInside(tester, find.byType(CatalogChipWrap));
        // 2 hàng chip cao 40 + khoảng cách 8
        expect(tester.getSize(find.byType(Wrap)).height, lessThanOrEqualTo(2 * 40 + 8 + 0.5));
        expect(find.textContaining('chủ đề'), findsOneWidget, reason: 'phải có chip "+N chủ đề" cho phần dư');
      });

      testWidgets('dải "Tour nổi bật": thẻ dọc không tràn', (tester) async {
        await _pump(
          tester,
          HomeFeaturedStrip(
            onOpen: (_) {},
            tours: [
              _tour(1, 'Một ngày làm nghệ nhân gốm Thanh Hà'),
              _tour(2, 'Phố cổ Hội An: Chùa cổ Tấn Ký và hội quán'),
            ],
          ),
          textScale: scale,
        );
        expect(tester.takeException(), isNull, reason: 'không được tràn (RenderFlex overflow)');
      });

      testWidgets('thẻ tour: tên tối đa 2 dòng, ngày + giá 1 dòng, không tràn', (tester) async {
        await _pump(
          tester,
          TourRowList(
            showDate: true,
            onOpen: (_) {},
            tours: [
              _tour(1, 'Một ngày làm nghệ nhân gốm Thanh Hà'),
              _tour(2, 'Phố cổ Hội An: Chùa cổ Tấn Ký và hội quán'),
            ],
          ),
          textScale: scale,
        );
        expect(tester.takeException(), isNull, reason: 'không được tràn (RenderFlex overflow)');
        for (final e in find.descendant(of: find.byType(TourRow), matching: find.byType(RichText)).evaluate()) {
          final p = e.renderObject! as RenderParagraph;
          final text = p.text.toPlainText();
          final isTitle = text.startsWith('Một ngày') || text.startsWith('Phố cổ');
          expect(_lines(p), lessThanOrEqualTo(isTitle ? 2 : 1), reason: '"$text"');
          // Cỡ chữ mặc định: tên tour thực tế phải hiện TRỌN trong 2 dòng, không bị "…"
          if (scale == 1.0) expect(p.didExceedMaxLines, isFalse, reason: '"$text" bị cắt');
          final rect = _onScreen(p);
          expect(rect.right <= _screenWidth + 0.5, isTrue, reason: '"$text" tràn: $rect');
        }
      });
    });
  }
}
