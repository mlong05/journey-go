import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/models/booking_model.dart';
import 'package:mobile/core/models/tour_detail_model.dart';
import 'package:mobile/screens/tours/booking_group_sheet.dart';

/// Regression test cho 4 yêu cầu UI/UX về tour đã mua & form hành khách:
///
///  1. Nút hành động hiện đếm ngược "N ngày nữa lên đường!" khi ngày trải
///     nghiệm còn ở tương lai.
///  2. Form hành khách là accordion (thu gọn / mở ra) — tiêu đề "Hành khách 1".
///  3. Bàn phím không che mất form nhập (sheet né bàn phím theo viewInsets).
void main() {
  /// Ngày trải nghiệm cách [days] ngày nữa (theo giờ Việt Nam như app).
  DateTime futureDate(int days) {
    final now = DateTime.now().toUtc().add(const Duration(hours: 7));
    return DateTime(now.year, now.month, now.day + days);
  }

  BookingModel buildBooking({required int days, DateTime? experienceDate}) {
    final date = experienceDate ?? futureDate(days);
    return BookingModel(
      id: 1,
      bookingCode: 'JG-TEST',
      tourId: 7,
      tourTitle: 'Hội An cổ trong hai ngày',
      experienceDate: date,
      totalAmount: 1500000,
      status: BookingStatus.confirmed,
      createdAt: DateTime.now(),
      paymentDeadline: DateTime.now().add(const Duration(minutes: 10)),
      paidAt: DateTime.now(),
      confirmedAt: DateTime.now(),
      cancellationReason: null,
    );
  }

  TourDetailModel detail() => const TourDetailModel(
        id: 7,
        title: 'Hội An cổ trong hai ngày',
        wizardTour: false,
        price: 1500000,
      );

  group('BookingModel — đếm ngược ngày trải nghiệm', () {
    test('tour chưa tới ngày ⇒ nhãn đếm ngược', () {
      final b = buildBooking(days: 26);
      expect(b.isTourLocked, isTrue);
      expect(b.daysUntilStart, 26);
      expect(b.startJourneyLabel, '26 ngày nữa lên đường!');
    });

    test('tới ngày trải nghiệm ⇒ mở khoá, nhãn "Bắt đầu trải nghiệm"', () {
      final b = buildBooking(days: 0);
      expect(b.isTourLocked, isFalse);
      expect(b.daysUntilStart, 0);
      expect(b.startJourneyLabel, 'Bắt đầu trải nghiệm');
    });

    test('ngày đã qua ⇒ không khoá', () {
      final b = buildBooking(days: -3);
      expect(b.isTourLocked, isFalse);
      expect(b.daysUntilStart, 0);
    });
  });

  group('Sheet đặt tour — accordion hành khách', () {
    testWidgets('tiêu đề "Hành khách 1" hiện, form thu gọn, bấm vào thì mở',
        (tester) async {
      tester.view.physicalSize = const Size(400 * 3, 800 * 3);
      tester.view.devicePixelRatio = 3.0;
      addTearDown(tester.view.reset);

      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: Builder(
            builder: (ctx) => ElevatedButton(
              onPressed: () => showBookingGroupSheet(
                context: ctx,
                detail: detail(),
                experienceDate: '2026-12-07',
                remainingSlots: 5,
                accountEmail: 'khach@example.com',
              ),
              child: const Text('open'),
            ),
          ),
        ),
      ));

      await tester.tap(find.text('open'));
      await tester.pumpAndSettle();

      // Tiêu đề accordion của hành khách đầu tiên.
      expect(find.text('Hành khách 1'), findsOneWidget);

      // Form đang thu gọn ⇒ chưa thấy ô nhập họ tên.
      expect(find.widgetWithText(TextField, 'Họ và tên *'), findsNothing);

      // Bấm tiêu đề ⇒ form mở ra.
      await tester.tap(find.text('Hành khách 1'));
      await tester.pumpAndSettle();

      expect(find.widgetWithText(TextField, 'Họ và tên *'), findsOneWidget);
      expect(find.widgetWithText(TextField, 'Ngày sinh *'), findsOneWidget);
      expect(find.widgetWithText(TextField, 'Email *'), findsOneWidget);
    });

    testWidgets('thêm hành khách thứ 2 ⇒ có tiêu đề "Hành khách 2"',
        (tester) async {
      tester.view.physicalSize = const Size(400 * 3, 900 * 3);
      tester.view.devicePixelRatio = 3.0;
      addTearDown(tester.view.reset);

      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: Builder(
            builder: (ctx) => ElevatedButton(
              onPressed: () => showBookingGroupSheet(
                context: ctx,
                detail: detail(),
                experienceDate: '2026-12-07',
                remainingSlots: 5,
                accountEmail: 'khach@example.com',
              ),
              child: const Text('open'),
            ),
          ),
        ),
      ));

      await tester.tap(find.text('open'));
      await tester.pumpAndSettle();

      // Nút "+" của nhóm "Người lớn".
      final plusButtons = find.byIcon(Icons.add_rounded);
      expect(plusButtons, findsWidgets);
      await tester.tap(plusButtons.first);
      await tester.pumpAndSettle();

      expect(find.text('Hành khách 2'), findsOneWidget);
    });
  });
}
