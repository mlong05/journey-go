import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/models/booking_model.dart';
import 'package:mobile/screens/booking/booking_detail_screen.dart';
import 'package:mobile/screens/booking/payment_screen.dart';

/// Regression test cho lỗi "RenderFlex overflowed" ở màn Thanh Toán.
///
/// Nguyên nhân gốc: hàng chứa [mã đơn + tên tour] và [badge đếm ngược] không
/// có ràng buộc bề rộng ⇒ khi tên tour dài (VD "Thanh toan don hang ... -
/// Hội An cổ trong hai ngày") thì tổng bề rộng con vượt quá bề rộng khung
/// (343px) ⇒ Flutter ném `RenderFlex overflowed by 55 pixels on the right`.
///
/// Cách sửa: bọc cột tiêu đề trong `Expanded` + `TextOverflow.ellipsis`,
/// badge đếm ngược giữ bề rộng tự nhiên (có `ConstrainedBox` chặn trần).
BookingModel _longTitleBooking({
  String status = BookingStatus.pendingPayment,
  DateTime? paidAt,
}) {
  return BookingModel(
    id: 53,
    bookingCode: 'JG51-AAC67235329048C497CF',
    tourId: 1,
    tourTitle:
        'Thanh toan don hang JG8034018EBD8A4A68A1 - Hội An cổ trong hai ngày '
        'và trải nghiệm ẩm thực đường phố cùng chuyến tham quan cố đô Hội An '
        'với trải nghiệm trà chè Huế truyền thống lâu đời',
    totalAmount: 580000,
    status: status,
    createdAt: DateTime.now(),
    paymentDeadline: DateTime.now().add(const Duration(minutes: 10)),
    paidAt: paidAt,
    confirmedAt: paidAt,
    completedAt: null,
    cancellationReason: null,
  );
}

void main() {
  /// Bề rộng hẹp nhất phổ biến (iPhone SE / Galaxy S8 ~ 320pt).
  void useSmallScreen(WidgetTester tester) {
    tester.view.physicalSize = const Size(320 * 3, 640 * 3);
    tester.view.devicePixelRatio = 3.0;
    addTearDown(tester.view.reset);
  }

  testWidgets(
    'Màn Thanh Toán: không overflow với tên tour dài + badge đếm ngược',
    (WidgetTester tester) async {
      useSmallScreen(tester);

      await tester.pumpWidget(
        MaterialApp(
          home: PaymentScreen(bookingId: 53, booking: _longTitleBooking()),
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      expect(tester.takeException(), isNull);
      expect(find.textContaining('Hội An'), findsOneWidget);
    },
  );

  testWidgets(
    'Màn Thanh Toán: không overflow khi đơn đã thanh toán (không badge đếm ngược)',
    (WidgetTester tester) async {
      useSmallScreen(tester);

      await tester.pumpWidget(
        MaterialApp(
          home: PaymentScreen(
            bookingId: 53,
            booking: _longTitleBooking(
              status: BookingStatus.confirmed,
              paidAt: DateTime.now(),
            ),
          ),
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'Màn Chi Tiết Đơn: không overflow với tên tour dài',
    (WidgetTester tester) async {
      useSmallScreen(tester);

      await tester.pumpWidget(
        MaterialApp(
          home: BookingDetailScreen(
            bookingId: 53,
            booking: _longTitleBooking(
              status: BookingStatus.confirmed,
              paidAt: DateTime.now(),
            ),
          ),
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      expect(tester.takeException(), isNull);
    },
  );
}
