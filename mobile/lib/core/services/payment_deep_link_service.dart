/// Xử lý deep link khi VNPay trả người dùng về app.
///
/// ── Bối cảnh ──
///  VNPay redirect về `vnp_ReturnUrl` — một URL WEB (trang return của merchant).
///  Trình duyệt ngoài sẽ mở URL đó, KHÔNG mở app.
///
///  ⇒ Có 2 lớp xử lý:
///    1. **Deep link** (`journeygo://payment/return?...`): nếu Return URL được cấu hình
///       trỏ về scheme này, hệ điều mở app ⇒ app nhận được kết quả ngay.
///       (Cần redirect bằng HTML meta-refresh vì VNPay chỉ chấp nhận URL http/https
///       — xem `PaymentReturnRedirectController`.)
///    2. **Polling + QueryDR** (fallback chắc chắn): app tự tra trạng thái qua API
///       khi quay lại foreground hoặc khi vừa mở lại.
///
/// ── Quy tắc ──
///  • Deep link là TÍN HIỆU, không phải nguồn xác minh ⇒ luôn gọi API để xác nhận.
library;

import 'dart:async';

import 'package:app_links/app_links.dart';
import 'package:flutter/foundation.dart';

/// Kết quả xử lý một deep link thanh toán.
class PaymentDeepLink {
  /// Mã tham chiếu giao dịch (`vnp_TxnRef`) nếu có.
  final String? txnRef;

  /// Toàn bộ query string VNPay gửi về.
  final String queryString;

  /// Toàn bộ tham số VNPay gửi về (kèm `vnp_SecureHash`).
  ///
  /// Gửi lại backend để kiểm tra chữ ký và áp dụng kết quả — nhờ vậy app nhận
  /// được kết quả NGAY mà không cần máy chủ trung gian (ngrok) còn sống.
  final Map<String, String> params;

  const PaymentDeepLink({
    this.txnRef,
    required this.queryString,
    this.params = const {},
  });

  bool get hasTxnRef => txnRef != null && txnRef!.isNotEmpty;

  /// Deep link có mang chữ ký của VNPay không.
  ///
  /// Nếu `true` ⇒ deep link mang kết quả đã ký ⇒ có thể gửi thẳng lên backend.
  bool get hasSignature => (params['vnp_SecureHash'] ?? '').isNotEmpty;
}

/// Lắng nghe deep link trả về từ VNPay.
class PaymentDeepLinkService {
  static final PaymentDeepLinkService _instance = PaymentDeepLinkService._internal();
  factory PaymentDeepLinkService() => _instance;
  PaymentDeepLinkService._internal();

  final AppLinks _appLinks = AppLinks();
  StreamSubscription<Uri>? _subscription;

  /// Kết quả deep link mới nhận được (để app xử lý).
  final StreamController<PaymentDeepLink> _controller =
      StreamController<PaymentDeepLink>.broadcast();

  Stream<PaymentDeepLink> get links => _controller.stream;

  /// Bắt đầu lắng nghe. Gọi 1 lần khi app khởi động.
  Future<void> init() async {
    // Deep link có thể đã được mở TRƯỚC khi app chạy (app bị kill rồi user bấm link).
    try {
      final initial = await _appLinks.getInitialLink();
      if (initial != null) {
        _emit(initial);
      }
    } catch (e) {
      debugPrint('[PaymentDeepLink] Không đọc được deep link ban đầu: $e');
    }

    _subscription ??= _appLinks.uriLinkStream.listen(
          _emit,
          onError: (Object e) => debugPrint('[PaymentDeepLink] Lỗi deep link: $e'),
        );
  }

  void dispose() {
    _subscription?.cancel();
    _subscription = null;
    _controller.close();
  }

  /// Phân tích URI thành {@link PaymentDeepLink} (null nếu không phải deep link thanh toán).
  ///
  /// ── Kết quả thanh toán có trong deep link ──
  /// Khi `vnp_ReturnUrl` là custom scheme, VNPay gửi kèm TOÀN BỘ tham số kết quả
  /// ĐÃ KÝ: `vnp_ResponseCode`, `vnp_TransactionStatus`, `vnp_TransactionNo`,
  /// `vnp_PayDate`, `vnp_SecureHash`… Ta giữ lại toàn bộ để gửi lại backend
  /// (xem `PaymentService.submitReturnResult`) — backend kiểm tra chữ ký rồi áp dụng,
  /// nhờ vậy app KHÔNG cần tunnel (ngrok) và không phụ thuộc lệnh querydr.
  static PaymentDeepLink? parse(Uri? uri) {
    if (uri == null) return null;

    // Chấp nhận cả `journeygo://payment/return` và `journeygo:///payment/return`.
    final isPaymentReturn = uri.host == 'payment' ||
        uri.pathSegments.contains('payment') ||
        uri.path.contains('/payment/return');
    if (!isPaymentReturn) return null;

    return PaymentDeepLink(
      txnRef: uri.queryParameters['vnp_TxnRef'],
      queryString: uri.query,
      params: Map<String, String>.from(uri.queryParameters),
    );
  }

  void _emit(Uri uri) {
    final parsed = parse(uri);
    if (parsed == null) return;
    if (_controller.isClosed) return;
    _controller.add(parsed);
  }
}
