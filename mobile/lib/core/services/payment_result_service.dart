/// Trung tâm xử lý KẾT QUẢ thanh toán cho toàn app (mobile).
///
/// ── Vì sao cần service này? ──
/// Trước đây có NHIỀU nơi cùng lắng nghe deep link `journeygo://payment/return`:
///
///   1. `PaymentScreen` — gọi `POST /payments/return-result`
///   2. `PendingPaymentHost` — gọi `POST /payments/return-result`
///
/// Hậu quả (bug thật):
///   • Cùng một deep link ⇒ **2 request trùng lặp** tới backend.
///   • `PaymentDeepLinkService.init()` bị gọi 2 lần ⇒ `getInitialLink()` chạy 2 lần.
///   • Hai nơi cùng hiện dialog thành công ⇒ khách thấy **2 hộp thoại**.
///
/// ⇒ `PaymentResultService` là **CHỦ DUY NHẤT** sở hữu luồng deep link:
///
///   • Khởi tạo `PaymentDeepLinkService` đúng MỘT lần (idempotent).
///   • Gửi kết quả đã ký lên backend đúng MỘT lần (dedupe theo `vnp_TxnRef`).
///   • Phát kết quả cuối cho mọi màn hình qua [results].
///   • Cấp "quyền hiện dialog" đúng MỘT lần cho mỗi booking ([claimDialog])
///     ⇒ không bao giờ hiện trùng hộp thoại thành công.
///
/// ── Luồng ──
/// ```text
///  VNPay (trình duyệt) ──journeygo://payment/return?vnp_*&vnp_SecureHash──▶
///        │
///        ▼
///  PaymentDeepLinkService ──▶ PaymentResultService
///        │                          │
///        │  có chữ ký?              ├─▶ POST /payments/return-result (backend xác minh)
///        │                          ├─▶ xoá giao dịch đang chờ trong storage
///        │                          └─▶ phát PaymentResultEvent cho các màn hình
///        │  KHÔNG có chữ ký
///        └──────────────────────────▶ phát event "needsSync" ⇒ màn hình tự tra cứu
///                                    (polling + QueryDR — xem PaymentSyncService)
/// ```
library;

import 'dart:async';

import 'package:flutter/foundation.dart';

import '../models/payment_model.dart';
import 'payment_deep_link_service.dart';
import 'payment_service.dart';
import 'token_storage.dart';

/// Một kết quả thanh toán đã đi qua [PaymentResultService].
class PaymentResultEvent {
  /// Id booking liên quan (null nếu chưa xác minh được).
  final int? bookingId;

  /// Id giao dịch trên backend (null nếu chưa xác minh được).
  final int? paymentId;

  /// Mã tham chiếu giao dịch (`vnp_TxnRef`).
  final String? txnRef;

  /// Trạng thái: SUCCESS / FAILED / CANCELLED / UNKNOWN.
  final String status;

  /// Thông điệp tiếng Việt để hiển thị.
  final String message;

  /// Đã có kết quả CUỐI (thành công / thất bại / đã hủy) hay chưa.
  final bool isFinal;

  /// Thanh toán thành công.
  final bool isSuccess;

  /// Cần app TỰ tra cứu (deep link không có chữ ký, hoặc gửi lên backend lỗi).
  ///
  /// Khi true ⇒ màn hình đang chờ nên gọi polling + QueryDR thay vì coi là thất bại.
  final bool needsSync;

  const PaymentResultEvent({
    this.bookingId,
    this.paymentId,
    this.txnRef,
    required this.status,
    this.message = '',
    this.isFinal = false,
    this.isSuccess = false,
    this.needsSync = false,
  });

  /// Sự kiện "hãy tự tra cứu" — chưa có kết quả xác minh nào.
  factory PaymentResultEvent.needsSync({String? txnRef}) => PaymentResultEvent(
        txnRef: txnRef,
        status: 'UNKNOWN',
        message: 'Đang chờ xác nhận thanh toán...',
        needsSync: true,
      );

  /// Chuyển từ kết quả backend ([PaymentReturnResult]) sang sự kiện.
  factory PaymentResultEvent.fromReturnResult(PaymentReturnResult r) =>
      PaymentResultEvent(
        bookingId: r.bookingId,
        paymentId: r.paymentId,
        txnRef: r.txnRef,
        status: r.status,
        message: r.message,
        isFinal: r.isFinal,
        isSuccess: r.isSuccess,
      );
}

/// Chủ sở hữu DUY NHẤT của luồng deep link thanh toán trong toàn app.
class PaymentResultService {
  static final PaymentResultService _instance = PaymentResultService._internal();
  factory PaymentResultService() => _instance;
  PaymentResultService._internal();

  final PaymentDeepLinkService _deepLinks = PaymentDeepLinkService();
  final PaymentService _payments = PaymentService();

  StreamSubscription<PaymentDeepLink>? _linkSub;

  /// Đã khởi tạo rồi ⇒ không init lại (tránh `getInitialLink()` chạy nhiều lần).
  bool _initialized = false;

  /// `vnp_TxnRef` đã xử lý xong ⇒ không gửi lại backend.
  final Set<String> _handledTxnRefs = <String>{};

  /// `vnp_TxnRef` đang gửi ⇒ chặn gửi trùng (deep link tới 2 lần liên tiếp).
  final Set<String> _inFlightTxnRefs = <String>{};

  /// Kết quả chưa được "nhận" ⇒ phát lại cho listener đến sau.
  final List<PaymentResultEvent> _replay = <PaymentResultEvent>[];

  /// Khoá "đã hiện hộp thoại" theo booking ⇒ không hiện trùng.
  final Set<int> _dialogClaimed = <int>{};

  /// Các màn hình ĐANG MỞ cho một booking (VD `PaymentScreen`, `BookingCheckoutScreen`).
  ///
  /// ⇒ Khi có màn trong-app đang mở, màn đó (giàu thông tin hơn: mã đơn, số tiền)
  /// được ưu tiên hiện hộp thoại; `PendingPaymentHost` (bọc toàn app) nhường.
  final Set<int> _activeHandlers = <int>{};

  /// Đăng ký màn hình đang xử lý thanh toán cho [bookingId].
  ///
  /// Gọi trong `initState`, và [unregisterHandler] trong `dispose`.
  void registerHandler(int bookingId) => _activeHandlers.add(bookingId);

  /// Bỏ đăng ký màn hình (VD màn đã bị đóng).
  void unregisterHandler(int bookingId) => _activeHandlers.remove(bookingId);

  /// Màn hình nào đang mở cho [bookingId]?
  bool hasActiveHandler(int bookingId) => _activeHandlers.contains(bookingId);

  StreamController<PaymentResultEvent>? _controller;

  /// Controller broadcast — phát lại các kết quả chưa được nhận khi có listener.
  StreamController<PaymentResultEvent> get _streamController {
    return _controller ??= StreamController<PaymentResultEvent>.broadcast(
      onListen: _flushReplay,
    );
  }

  /// Kết quả thanh toán (đã xác minh) cho mọi màn hình.
  Stream<PaymentResultEvent> get results => _streamController.stream;

  /// Khởi tạo — gọi 1 lần khi app khởi động (TRƯỚC `runApp`).
  ///
  /// Phải gọi sớm để bắt được deep link mở app khi app vừa được khởi động lại
  /// (app bị hệ điều kill trong lúc khách đang ở trình duyệt VNPay).
  Future<void> init() async {
    if (_initialized) return;
    _initialized = true;

    try {
      await _deepLinks.init();
      _linkSub = _deepLinks.links.listen(_handleLink);
    } catch (e) {
      debugPrint('[PaymentResult] Không lắng nghe được deep link: $e');
    }
  }

  void dispose() {
    _linkSub?.cancel();
    _linkSub = null;
    _controller?.close();
    _controller = null;
  }

  /// Nhận một deep link từ VNPay.
  Future<void> _handleLink(PaymentDeepLink link) async {
    // Không có chữ ký ⇒ KHÔNG thể xác minh ở đây.
    // Báo cho màn hình đang chờ tự tra cứu (polling + QueryDR).
    if (!link.hasSignature) {
      _emit(PaymentResultEvent.needsSync(txnRef: link.txnRef));
      return;
    }

    final txnRef = link.txnRef;
    if (txnRef != null && txnRef.isNotEmpty) {
      if (_handledTxnRefs.contains(txnRef)) return; // đã xử lý rồi
      if (_inFlightTxnRefs.contains(txnRef)) return; // đang xử lý
      _inFlightTxnRefs.add(txnRef);
    }

    try {
      final result = await _payments.submitReturnResult(link.params);
      if (txnRef != null && txnRef.isNotEmpty) {
        _handledTxnRefs.add(txnRef);
      }

      final event = PaymentResultEvent.fromReturnResult(result);

      // Giao dịch đã có kết quả cuối ⇒ xoá khỏi danh sách "đang chờ".
      if (event.isFinal && event.bookingId != null) {
        await TokenStorage.clearPendingPayment(event.bookingId!);
      }

      _emit(event);
    } catch (e) {
      debugPrint('[PaymentResult] Gửi kết quả lên backend lỗi: $e');
      // Không xác minh được ⇒ KHÔNG coi là thất bại: báo cho app tự tra cứu.
      _emit(PaymentResultEvent.needsSync(txnRef: link.txnRef));
    } finally {
      if (txnRef != null && txnRef.isNotEmpty) {
        _inFlightTxnRefs.remove(txnRef);
      }
    }
  }

  /// Phát sự kiện.
  ///
  /// ⚠️ Chỉ giữ lại trong [_replay] khi CHƯA có listener — nếu luôn giữ lại thì
  /// listener đến sau (VD `PaymentScreen` mở sau `PendingPaymentHost`) sẽ nhận
  /// lại kết quả cũ ⇒ bật lặp.
  void _emit(PaymentResultEvent event) {
    final controller = _controller;
    final hasListener = controller != null && !controller.isClosed && controller.hasListener;

    if (!hasListener) {
      // Chưa ai nghe ⇒ giữ lại, phát lại khi có listener đầu tiên.
      _replay.add(event);
      return;
    }

    controller.add(event);
  }

  /// Phát lại các kết quả chưa được "nhận" khi có listener đầu tiên.
  ///
  /// Cần cho trường hợp: deep link tới lúc app CHƯA đăng nhập ⇒ app chỉ gửi
  /// `/return-result` được (endpoint public) nhưng chưa có ai hiện hộp thoại;
  /// sau khi khách đăng nhập, kết quả vẫn phải hiện được.
  void _flushReplay() {
    if (_replay.isEmpty) return;
    final pending = List<PaymentResultEvent>.from(_replay);
    _replay.clear();

    final controller = _controller;
    if (controller == null || controller.isClosed) return;

    scheduleMicrotask(() {
      if (controller.isClosed) return;
      for (final event in pending) {
        controller.add(event);
      }
    });
  }

  /// "Nhận" quyền hiện hộp thoại thành công cho một booking.
  ///
  /// Trả về `true` cho LẦN GỌI ĐẦU TIÊN ⇒ chỉ một nơi hiện hộp thoại.
  ///
  /// ⚠️ Nếu có màn hình trong-app đang mở cho booking này ⇒ màn đó được ưu tiên
  /// (hộp thoại giàu thông tin hơn) ⇒ trả về `false` cho các nơi khác.
  bool claimDialog(int bookingId) {
    if (_dialogClaimed.contains(bookingId)) return false;
    _dialogClaimed.add(bookingId);
    return true;
  }

  /// Nhả quyền hiện hộp thoại (VD: hộp thoại bị đóng do lỗi).
  void releaseDialog(int bookingId) => _dialogClaimed.remove(bookingId);
}
