/// Test cho [PaymentResultService] — trung tâm xử lý kết quả thanh toán.
///
/// ── Vì sao cần test này? ──
/// Trước đây có NHIỀU nơi cùng lắng nghe deep link `journeygo://payment/return`:
///
///   1. `PaymentScreen`      → gọi `POST /payments/return-result`
///   2. `PendingPaymentHost` → gọi `POST /payments/return-result`
///
/// ⇒ Cùng một deep link sinh ra 2 request trùng lặp và 2 hộp thoại thành công.
///
/// ⇒ `PaymentResultService` gom về một chỗ + dedupe theo `vnp_TxnRef` +
/// `claimDialog` ⇒ mỗi booking chỉ hiện MỘT hộp thoại.
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/models/payment_model.dart';
import 'package:mobile/core/services/payment_deep_link_service.dart';
import 'package:mobile/core/services/payment_result_service.dart';

void main() {
  group('PaymentDeepLinkService.parse', () {
    test('nhận deep link journeygo://payment/return kèm tham số đã ký', () {
      final link = PaymentDeepLinkService.parse(
        Uri.parse(
          'journeygo://payment/return'
          '?vnp_Amount=580000'
          '&vnp_ResponseCode=00'
          '&vnp_TransactionStatus=00'
          '&vnp_TxnRef=JG8034018EBD8A4A68A1'
          '&vnp_SecureHash=abc123def456',
        ),
      );

      expect(link, isNotNull);
      expect(link!.txnRef, 'JG8034018EBD8A4A68A1');
      expect(link.hasSignature, isTrue);
      expect(link.params['vnp_ResponseCode'], '00');
      expect(link.params['vnp_Amount'], '580000');
    });

    test('deep link KHÔNG có chữ ký ⇒ hasSignature = false', () {
      final link = PaymentDeepLinkService.parse(
        Uri.parse('journeygo://payment/return?vnp_TxnRef=JG123'),
      );

      expect(link, isNotNull);
      expect(link!.hasSignature, isFalse);
      expect(link.hasTxnRef, isTrue);
    });

    test('bỏ qua URI không phải deep link thanh toán', () {
      expect(PaymentDeepLinkService.parse(Uri.parse('https://example.com/tours/1')), isNull);
      expect(PaymentDeepLinkService.parse(Uri.parse('journeygo://profile/settings')), isNull);
      expect(PaymentDeepLinkService.parse(null), isNull);
    });
  });

  group('PaymentResultEvent', () {
    test('needsSync: chưa xác minh được ⇒ KHÔNG phải thất bại', () {
      final event = PaymentResultEvent.needsSync(txnRef: 'JG123');

      expect(event.needsSync, isTrue);
      expect(event.isFinal, isFalse);
      expect(event.isSuccess, isFalse);
    });

    test('fromReturnResult: map đúng trạng thái từ backend', () {
      final event = PaymentResultEvent.fromReturnResult(
        const PaymentReturnResult(
          status: 'SUCCESS',
          bookingId: 53,
          paymentId: 76,
          txnRef: 'JG8034018EBD8A4A68A1',
          message: 'Thanh toán thành công',
        ),
      );

      expect(event.isSuccess, isTrue);
      expect(event.isFinal, isTrue);
      expect(event.bookingId, 53);
      expect(event.paymentId, 76);
      expect(event.needsSync, isFalse);
    });
  });

  group('PaymentResultService.claimDialog', () {
    // ⚠️ `PaymentResultService` là SINGLETON ⇒ trạng thái "đã claim" dùng chung
    // giữa các test. Vì vậy mỗi test dùng bookingId RIÊNG.

    test('chỉ nơi ĐẦU TIÊN được quyền hiện hộp thoại', () {
      final service = PaymentResultService();

      expect(service.claimDialog(9001), isTrue);
      expect(service.claimDialog(9001), isFalse);
      expect(service.claimDialog(9001), isFalse);
    });

    test('booking khác ⇒ quyền riêng', () {
      final service = PaymentResultService();

      expect(service.claimDialog(9002), isTrue);
      expect(service.claimDialog(9003), isTrue);
      expect(service.claimDialog(9003), isFalse);
    });

    test('releaseDialog cho phép hiện lại', () {
      final service = PaymentResultService();

      expect(service.claimDialog(9004), isTrue);
      service.releaseDialog(9004);
      expect(service.claimDialog(9004), isTrue);
    });
  });
}
