// Thân trang chi tiết tour 5 bước: ảnh đầu trang, thanh tab dính, dòng thời gian lịch trình.
// Kiểm tra dựng được ở màn 360dp (cỡ chữ 100% / 130%) không lỗi bố cục, và bấm tab thì cuộn tới mục.
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/constants/app_theme.dart';
import 'package:mobile/core/models/tour_detail_model.dart';
import 'package:mobile/l10n/app_localizations.dart';
import 'package:mobile/screens/tours/tour_detail_sections.dart';

TourDetailModel _detail({int days = 1}) => TourDetailModel.fromJson({
      'tourId': 7,
      'title': 'Một ngày làm nghệ nhân gốm Thanh Hà và dạo phố cổ Hội An',
      'wizardTour': true,
      'durationDays': days,
      'region': {'id': 2, 'name': 'Miền Trung'},
      'description': 'Ngồi bên bàn xoay cùng thợ gốm, nặn chiếc bình đầu tiên. ' * 6,
      'highlights': ['Tự tay nặn gốm', 'Nghe nghệ nhân kể chuyện làng nghề'],
      'itinerary': [
        for (var d = 1; d <= days; d++)
          {
            'dayNumber': d,
            'title': 'Làng gốm Thanh Hà',
            'mainActivity': 'Học nặn gốm cùng nghệ nhân',
            'content': 'Sáng: đón khách tại phố cổ.\nChiều: thực hành bàn xoay.\nTối: tự do khám phá ẩm thực. ' * 3,
          },
      ],
      'stops': [
        {'id': 1, 'sequenceOrder': 1, 'name': 'Làng gốm Thanh Hà'},
        {'id': 2, 'sequenceOrder': 2, 'name': 'Chùa Cầu'},
      ],
      'price': 450000,
      'prices': [
        {'guestType': 'ADULT', 'label': 'Người lớn', 'ageRange': 'Từ 12 tuổi', 'price': 450000},
      ],
      'cancellationPolicy': 'Hủy trước 48 giờ được hoàn 100%.',
    });

Future<void> _pump(WidgetTester tester, TourDetailModel detail, {double textScale = 1, String lang = 'vi'}) async {
  tester.view.physicalSize = const Size(360 * 3, 760 * 3);
  tester.view.devicePixelRatio = 3;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    MaterialApp(
      theme: AppTheme.light(),
      locale: Locale(lang),
      supportedLocales: AppLocalizations.supportedLocales,
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      home: MediaQuery(
        data: MediaQueryData(size: const Size(360, 760), textScaler: TextScaler.linear(textScale)),
        child: Scaffold(body: TourWizardDetailBody(detail: detail)),
      ),
    ),
  );
  await tester.pumpAndSettle();
}

Future<void> _loadNunito() async {
  final loader = FontLoader('Nunito');
  for (final w in ['Regular', 'Medium', 'SemiBold', 'Bold', 'ExtraBold', 'Black']) {
    loader.addFont(rootBundle.load('assets/fonts/Nunito-$w.ttf'));
  }
  await loader.load();
}

void main() {
  setUpAll(_loadNunito);

  for (final scale in [1.0, 1.3]) {
    for (final days in [1, 3]) {
      testWidgets('cỡ chữ ${(scale * 100).round()}%, tour $days ngày: dựng không lỗi, có tab + lịch trình',
          (tester) async {
        await _pump(tester, _detail(days: days), textScale: scale);
        expect(tester.takeException(), isNull);
        expect(find.text('Giới thiệu'), findsWidgets);
        expect(find.text('Lịch trình'), findsOneWidget, reason: 'tab Lịch trình');

        // Bấm tab "Lưu ý" (thanh tab cuộn ngang, có thể phải kéo mới thấy) ⇒ cuộn xuống, mục chính sách hiện ra
        final tabs = tester.state<ScrollableState>(find.descendant(
          of: find.ancestor(of: find.text('Điểm dừng'), matching: find.byType(SingleChildScrollView)),
          matching: find.byType(Scrollable),
        ));
        tabs.position.jumpTo(tabs.position.maxScrollExtent);
        await tester.pumpAndSettle();
        await tester.tap(find.text('Lưu ý'));
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
        expect(find.text('Thông tin cần lưu ý').hitTestable(), findsOneWidget);
      });
    }

    for (final lang in ['en', 'ja']) {
      testWidgets('cỡ chữ ${(scale * 100).round()}%, ngôn ngữ $lang: chữ dịch không làm vỡ bố cục', (tester) async {
        await _pump(tester, _detail(days: 3), textScale: scale, lang: lang);
        expect(tester.takeException(), isNull);
        final l10n = lookupAppLocalizations(Locale(lang));
        expect(find.text(l10n.tdTabItinerary), findsOneWidget);
        expect(find.text(l10n.guestAdult), findsOneWidget, reason: 'nhãn loại khách dịch theo guestType');
      });
    }
  }
}
