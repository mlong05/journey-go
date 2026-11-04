/// Màn Thanh Toán (VNPay) — Mobile.
///
/// ── Luồng ──
///  1. Hiển thị thông tin đơn + đếm ngược 10 phút (theo `booking.paymentDeadline`).
///  2. Tải phương thức thanh toán từ `GET /payments/methods` (3 nhóm VNPay).
///  3. Người dùng chọn phương thức → `POST /payments/bookings/{id}/init?bankCode=`
///     trả về `paymentUrl` (trang VNPay) → mở bằng trình duyệt NGOÀI.
///  4. Poll `GET /payments/{paymentId}` mỗi 2.5s tới khi có kết quả cuối.
///
/// ── Vì sao mở trình duyệt ngoài? ──
///  VNPay chặn iframe ⇒ không thể hiển thị trang thanh toán bên trong WebView của app.
///  Mobile dùng `url_launcher` với `LaunchMode.externalApplication`.
///
/// ── Quy tắc quan trọng ──
///  • `PROCESSING` / `PENDING` là **đang xử lý**, KHÔNG phải lỗi — tuyệt đối không báo thất bại.
///  • Nếu người dùng quay lại app mà kết quả vẫn chưa rõ → gọi `POST /payments/{id}/query`
///    (QueryDR) để xác minh với VNPay trước khi cho phép thử lại.
///  • `paymentId` được nhớ trong `shared_preferences` ⇒ sau khi app bị KILL trong lúc
///    khách đang ở trình duyệt, mở lại app vẫn tra được kết quả thanh toán.
///
/// ── Phương thức thanh toán đang bật ──
///  Hiện chỉ bật **Thẻ nội địa và tài khoản ngân hàng** ({@code DOMESTIC_CARD}).
///  • `QR_APP_WALLET` (VNPay QR): bỏ tạm — Sandbox không cho demo được luồng quét QR
///    trên thiết bị thật, khách phải cài app ngân hàng thật mới quét được.
///  • `INTERNATIONAL_CARD`: bỏ tạm — merchant Sandbox `G46V3SQ0` trả
///    `code=01` "Có lỗi xảy ra trong quá trình xử lý" cho mọi giao dịch thẻ quốc tế
///    (đã kiểm chứng A/B: merchant demo `CTTVNP01` trả `code=00` với cùng thẻ/cùng
///    số tiền ⇒ lỗi thuộc về cấu hình merchant phía VNPay Sandbox).
///  ⇒ Khi VNPay Sandbox sửa xong, chỉ cần bỏ mã trong [_hiddenMethodCodes].
library;

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';

import '../../core/constants/app_colors.dart';
import '../../core/models/booking_model.dart';
import '../../core/services/api_client.dart';
import '../../core/services/booking_service.dart';
import '../../core/services/payment_launcher.dart';
import '../../core/services/payment_result_service.dart';
import '../../core/services/payment_service.dart';
import '../../core/services/payment_sync_service.dart';
import '../../core/services/token_storage.dart';
import 'booking_detail_screen.dart';
import 'payment_success_dialog.dart';

class PaymentScreen extends StatefulWidget {
  final int bookingId;

  /// Booking đã tải sẵn (optional) — tiết kiệm 1 request.
  final BookingModel? booking;

  const PaymentScreen({super.key, required this.bookingId, this.booking});

  @override
  State<PaymentScreen> createState() => _PaymentScreenState();
}

class _PaymentScreenState extends State<PaymentScreen> {
  // ── Cấu hình phương thức thanh toán được phép hiển thị ──────────────────
  //
  // Hiện chỉ bật "Thẻ nội địa và tài khoản ngân hàng" (`DOMESTIC_CARD`).
  // Ẩn 2 nhóm còn lại vì không demo được trên môi trường Sandbox:
  //   • `QR_APP_WALLET`      — luồng quét QR cần app ngân hàng thật.
  //   • `INTERNATIONAL_CARD` — merchant Sandbox trả `code=01` cho mọi giao dịch
  //                            thẻ quốc tế (lỗi cấu hình phía VNPay, không phải
  //                            lỗi tích hợp của app).
  //
  // ⇒ Muốn bật lại: xoá mã tương ứng khỏi tập dưới đây (không cần sửa gì khác).
  static const Set<String> _hiddenMethodCodes = {
    'QR_APP_WALLET',
    'INTERNATIONAL_CARD',
  };

  final BookingService _bookingService = BookingService();
  final PaymentService _paymentService = PaymentService();
  final PaymentLauncher _launcher = PaymentLauncher();
  final PaymentSyncService _syncService = PaymentSyncService();

  BookingModel? _booking;
  PaymentMethodsModel? _methods;
  PaymentModel? _payment;
  PaymentInitModel? _init;

  /// Mã `vnp_BankCode` của phương thức đang chọn (null = chưa chọn).
  String? _selectedBankCode;

  /// Mã phương thức (nhóm) đang chọn — dùng để tô đậm ô radio.
  ///
  /// ⚠️ Tách khỏi [_selectedBankCode] vì nhóm "Thẻ thanh toán quốc tế" có NHIỀU
  /// loại thẻ con (Visa / Mastercard / JCB). Ô radio tô đậm theo NHÓM, còn
  /// `vnp_BankCode` gửi lên VNPay là mã của LOẺI THẺ cụ thể (có thể rỗng).
  String? _selectedMethodCode;

  /// Đang mở danh sách loại thẻ quốc tế không — mặc định thu gọn.
  bool _showIntlBrands = false;

  bool _loading = true;
  bool _initializing = false;
  bool _polling = false;
  bool _syncing = false;
  String _error = '';
  String _statusMessage = '';
  Timer? _countdownTimer;

  /// Đã hiện dialog thành công chưa — tránh bật lặp nhiều lần.
  bool _successDialogShown = false;

  /// Theo dõi vòng đời app — poll lại khi quay lại từ trình duyệt VNPay.
  late final PaymentLifecycleWatcher _lifecycleWatcher;

  /// Trung tâm xử lý kết quả thanh toán (chủ sở hữu DUY NHẤT của luồng deep link).
  ///
  /// ⚠️ KHÔNG tự lắng nghe `PaymentDeepLinkService` ở đây — nếu không, deep link
  /// sẽ được xử lý 2 lần (màn này + `PendingPaymentHost`) ⇒ 2 request trùng lặp
  /// và 2 hộp thoại thành công.
  final PaymentResultService _results = PaymentResultService();
  StreamSubscription<PaymentResultEvent>? _resultSub;

  @override
  void initState() {
    super.initState();
    _lifecycleWatcher = PaymentLifecycleWatcher(onResumed: _onAppResumed);
    WidgetsBinding.instance.addObserver(_lifecycleWatcher);
    // Báo cho trung tâm biết màn này đang mở ⇒ màn này (giàu thông tin hơn) được
    // ưu tiên hiện hộp thoại thành công so với `PendingPaymentHost` (generic).
    _results.registerHandler(widget.bookingId);
    _listenResults();
    _load();
  }

  @override
  void dispose() {
    _resultSub?.cancel();
    _results.unregisterHandler(widget.bookingId);
    WidgetsBinding.instance.removeObserver(_lifecycleWatcher);
    _countdownTimer?.cancel();
    super.dispose();
  }

  /// Lắng nghe kết quả thanh toán đã được [PaymentResultService] xác minh.
  void _listenResults() {
    _resultSub = _results.results.listen(_onResult);
  }

  /// Xử lý deep link kết quả thanh toán.
  ///
  /// Deep link mang tham số kết quả ĐÃ KÝ của VNPay ⇒ backend đã xác minh và áp dụng.
  ///
  /// ⚠️ Kết quả do [PaymentResultService] xác minh và gửi lên backend TRƯỚC khi
  /// tới đây ⇒ màn này KHÔNG cần gọi `/return-result` lần nữa.
  Future<void> _onResult(PaymentResultEvent event) async {
    if (!mounted || _successDialogShown) return;

    // Chỉ xử lý kết quả thuộc đúng booking của màn này.
    if (event.bookingId != null && event.bookingId != widget.bookingId) return;

    if (event.needsSync) {
      // Deep link không có chữ ký (hoặc gửi lên backend lỗi) ⇒ fallback sang QueryDR.
      final paymentId = _payment?.id ?? _init?.paymentId;
      if (paymentId != null) await _syncWithVnpay(paymentId);
      return;
    }

    if (!event.isFinal) return;

    if (event.isSuccess) {
      await TokenStorage.clearPendingPayment(widget.bookingId);
      if (!mounted) return;
      setState(() {
        _syncing = false;
        _polling = false;
        _statusMessage = 'Thanh toán thành công!';
      });
      // Đọc lại giao dịch để có đầy đủ thông tin hiển thị.
      final paymentId = _payment?.id ?? _init?.paymentId ?? event.paymentId;
      if (paymentId != null) {
        try {
          final fresh = await _paymentService.getPaymentById(paymentId);
          if (mounted) setState(() => _payment = fresh);
        } catch (_) {
          // Không đọc lại được ⇒ vẫn hiện dialog thành công.
        }
      }
      _showSuccessDialog();
      return;
    }

    // Thất bại / đã hủy.
    await TokenStorage.clearPendingPayment(widget.bookingId);
    if (!mounted) return;
    setState(() {
      _syncing = false;
      _polling = false;
      _statusMessage = '';
      _error = event.message.isNotEmpty
          ? event.message
          : 'Thanh toán không thành công. Bạn có thể thử lại.';
    });
  }

  // ── Tải dữ liệu ───────────────────────────────────────────────────────────
  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = '';
    });

    // ① Booking — tải trước. Nếu lỗi ⇒ hiện màn hình lỗi (không có gì để thanh toán).
    BookingModel booking;
    try {
      booking = widget.booking ?? await _bookingService.getBookingById(widget.bookingId);
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.message;
        _loading = false;
      });
      return;
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _error = 'Không thể tải thông tin thanh toán.';
        _loading = false;
      });
      return;
    }

    if (!mounted) return;
    setState(() {
      _booking = booking;
      _loading = false;
    });
    _startCountdown();
    _checkPendingPayment();

    // ② Danh sách phương thức thanh toán — tải SAU, lỗi ở đây KHÔNG được làm
    //    mất thẻ đơn (vì lỗi mạng tạm thời rất hay xảy ra khi vừa quay lại
    //    từ trình duyệt thanh toán). Thẻ đơn vẫn hiển thị + hiện cảnh báo.
    try {
      final methods = await _paymentService.getPaymentMethods();
      if (!mounted) return;
      setState(() {
        _methods = methods;
        _autoSelectMethod(methods);
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _error = e.message);
    } catch (_) {
      if (!mounted) return;
      setState(() => _error = 'Không thể tải phương thức thanh toán.');
    }
  }

  /// Tự chọn phương thức đầu tiên đang được bật khi màn hình vừa mở.
  ///
  /// ⚠️ Bắt buộc: nếu `_selectedBankCode` còn null ⇒ backend KHÔNG gửi tham số
  /// `vnp_BankCode` ⇒ VNPay hiện trang CHỌN phương thức (gồm cả QR và thẻ quốc tế —
  /// những phương thức đang bị ẩn trên app). Chọn sẵn phương thức được phép giúp
  /// `vnp_BankCode` luôn khớp với những gì app hiển thị.
  ///
  /// Với nhóm "Thẻ nội địa và tài khoản ngân hàng", app gửi mã NHÓM (`VNBANK`)
  /// chứ không phải mã ngân hàng cụ thể: đã kiểm chứng trên Sandbox rằng `VNBANK`
  /// mở trang web chỉ có ĐÚNG 1 mục "Thẻ nội địa và tài khoản ngân hàng" (không
  /// có QR, không có thẻ quốc tế) rồi khách chọn ngân hàng ngay trên trang web
  /// VNPay. Như vậy app không cần hiện danh sách ngân hàng.
  ///
  /// Không ghi đè lựa chọn của người dùng nếu đã có (ví dụ app được khôi phục).
  void _autoSelectMethod(PaymentMethodsModel methods) {
    if (_selectedMethodCode != null) return;

    final visible = methods.methods
        .where((m) => !_hiddenMethodCodes.contains(m.code))
        .toList();
    if (visible.isEmpty) return;

    final method = visible.first;
    _selectedMethodCode = method.code;
    if (method.code == 'INTERNATIONAL_CARD') {
      // Nhóm thẻ quốc tế có danh sách loại thẻ con ⇒ mở ra cho khách chọn.
      _showIntlBrands = true;
      final brands = _intlBrands;
      _selectedBankCode =
          brands.isNotEmpty ? brands.first.bankCode : method.bankCode;
    } else {
      // Gửi MÃ NHÓM (`VNBANK`) ⇒ trang web chỉ hiện 1 mục "Thẻ nội địa",
      // khách chọn ngân hàng ngay trên trang web VNPay.
      _selectedBankCode = method.bankCode ?? method.code;
    }
  }

  /// Kiểm tra giao dịch đang chờ đã lưu (khôi phục sau khi app bị kill).
  ///
  /// Gọi sau khi màn hình hiện: nếu app bị kill trong lúc khách thanh toán ở trình duyệt,
  /// lúc mở lại app ta biết `paymentId` và tra được kết quả.
  Future<void> _checkPendingPayment() async {
    final pending = await TokenStorage.getPendingPayment(widget.bookingId);
    if (pending == null) return;

    final paymentId = pending['paymentId'];
    if (paymentId is! int) return;

    final result = await _syncService.sync(paymentId);
    if (!mounted) return;

    if (result.isSuccess) {
      setState(() {
        _payment = result.payment;
        _statusMessage = 'Thanh toán thành công!';
      });
      _showSuccessDialog();
      return;
    }

    if (result.isFinal) {
      setState(() {
        _payment = result.payment;
        _statusMessage = '';
        _error = result.message;
      });
    }
    // Còn đang xử lý → im lặng, tiếp tục chờ người dùng bấm thanh toán lại.
  }

  /// Đếm ngược theo `paymentDeadline` (10 phút từ lúc tạo đơn).
  void _startCountdown() {
    _countdownTimer?.cancel();
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      setState(() {});
      final booking = _booking;
      if (booking != null && booking.isPendingPayment && !booking.isPaymentWindowOpen) {
        _countdownTimer?.cancel();
        _onDeadlineExceeded();
      }
    });
  }

  void _onDeadlineExceeded() {
    if (_polling) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Đã hết thời hạn thanh toán 10 phút. Vui lòng đặt lại tour.'),
        behavior: SnackBarBehavior.floating,
      ),
    );
    Navigator.of(context).pop(false);
  }

  // ── Thanh toán ────────────────────────────────────────────────────────────
  Future<void> _handlePay() async {
    final booking = _booking;
    if (booking == null) return;

    if (!booking.isPaymentWindowOpen) {
      _onDeadlineExceeded();
      return;
    }

    // Đã khởi tạo giao dịch trong phiên này → KHÔNG tạo giao dịch mới
    // (backend sẽ trả 409 PAYMENT_NOT_RETRYABLE). Chỉ mở lại / đồng bộ.
    if (_init != null) {
      // Đang chờ kết quả ⇒ nút bấm = kiểm tra kết quả (QueryDR).
      if (_polling) {
        final paymentId = _payment?.id ?? _init?.paymentId;
        if (paymentId != null) await _syncWithVnpay(paymentId);
        return;
      }
      await _continueWithExistingPayment();
      return;
    }

    setState(() {
      _initializing = true;
      _error = '';
      _statusMessage = 'Đang khởi tạo giao dịch...';
    });

    try {
      final init = await _paymentService.initiatePayment(
        booking.id,
        bankCode: _selectedBankCode,
      );

      if (!mounted) return;

      // Nhớ giao dịch đang chờ ⇒ khôi phục được sau khi app bị kill.
      await TokenStorage.savePendingPayment(
        bookingId: booking.id,
        paymentId: init.paymentId,
        paymentUrl: init.paymentUrl,
      );

      setState(() {
        _init = init;
        _initializing = false;
        _statusMessage = '';
      });

      await _continueWithExistingPayment();
    } on ApiException catch (e) {
      if (!mounted) return;

      // 409 PAYMENT_NOT_RETRYABLE: lần thử trước chưa rõ kết quả →
      // phải QueryDR xác minh trước khi cho phép thử lại.
      if (e.code == 'PAYMENT_NOT_RETRYABLE') {
        await _resolveUnknownAttempt(booking.id);
        return;
      }

      setState(() {
        _initializing = false;
        _statusMessage = '';
        _error = e.message;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _initializing = false;
        _statusMessage = '';
        _error = 'Không thể khởi tạo thanh toán. Vui lòng thử lại.';
      });
    }
  }

  /// Mở trang thanh toán (hoặc hiện QR) cho giao dịch đã khởi tạo, rồi bắt đầu poll.
  Future<void> _continueWithExistingPayment() async {
    final init = _init;
    final booking = _booking;
    if (init == null || booking == null) return;

    // Phương thức QR: hiển thị mã QR trong app, KHÔNG tự mở trình duyệt.
    // (Sandbox chưa hỗ trợ quét QR — khách dùng app thật sẽ quét mã này.)
    if (_isQrSelected) {
      setState(() => _statusMessage = 'Quét mã QR để hoàn tất thanh toán.');
      _startPolling(init.paymentId, booking.paymentDeadline);
      return;
    }

    final opened = await _launcher.openPaymentUrl(init.paymentUrl);
    if (!opened) {
      if (!mounted) return;
      setState(() {
        _statusMessage = '';
        _error = 'Không thể mở trang thanh toán. Vui lòng kiểm tra trình duyệt.';
      });
      return;
    }

    // Đã mở trình duyệt — bắt đầu poll.
    await _startPolling(init.paymentId, booking.paymentDeadline);
  }

  /// Lần thử trước chưa rõ kết quả → QueryDR để xác minh trước khi cho thử lại.
  Future<void> _resolveUnknownAttempt(int bookingId) async {
    try {
      final payments =
          await _paymentService.getPaymentsByBooking(bookingId, page: 0, size: 1);
      if (payments.isEmpty) {
        if (!mounted) return;
        setState(() {
          _initializing = false;
          _statusMessage = '';
          _error = 'Chưa xác minh được kết quả giao dịch trước. Vui lòng thử lại sau.';
        });
        return;
      }

      final last = payments.first;
      final result = await _syncService.sync(last.id);

      if (!mounted) return;
      if (result.isSuccess) {
        setState(() {
          _initializing = false;
          _payment = result.payment;
          _statusMessage = 'Thanh toán thành công!';
        });
        _showSuccessDialog();
        return;
      }

      if (result.isFinal) {
        setState(() {
          _initializing = false;
          _payment = result.payment;
          _statusMessage = '';
          _error = result.message;
        });
        return;
      }

      // Vẫn chưa xác minh được ⇒ cho khách CHỌN: thử lại thanh toán, hoặc kiểm tra lại sau.
      //
      // ── Vì sao KHÔNG chặn vô điều kiện? ──
      // QueryDR trên VNPay Sandbox luôn trả `vnp_ResponseCode=99` ⇒ nếu chặn, khách
      // KHÔNG BAO GIỜ thanh toán lại được dù booking vẫn còn trong hạn 10 phút
      // (dead-end). Mỗi lần thử có `txnRef` riêng nên không gây trùng tiền; nếu
      // giao dịch cũ thực sự thành công thì backend tự đánh dấu DUPLICATE và
      // chuyển khoản tiền dư sang quy trình hoàn tiền/đối soát.
      if (!mounted) return;
      setState(() {
        _initializing = false;
        _statusMessage = '';
        _error = 'Chưa xác minh được kết quả giao dịch trước. Nếu bạn chưa thanh toán, '
            'bạn có thể thử lại ngay; nếu đã thanh toán, hãy kiểm tra lại sau ít phút.';
      });
      _offerRetry(bookingId);
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _initializing = false;
        _statusMessage = '';
        _error = 'Chưa xác minh được kết quả giao dịch trước. Vui lòng thử lại sau.';
      });
      _offerRetry(bookingId);
    }
  }

  /// Hỏi khách có muốn thử lại thanh toán hay không.
  ///
  /// Nếu khách chọn "Thử lại" ⇒ xoá giao dịch đang chờ trong phiên này để lần bấm
  /// kế tiếp tạo giao dịch MỚI (backend sẽ cho phép vì booking còn trong hạn).
  Future<void> _offerRetry(int bookingId) async {
    if (!mounted) return;
    final retry = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Thanh toán lại?'),
        content: const Text(
          'Hệ thống chưa xác minh được kết quả giao dịch trước.\n\n'
          '• Nếu bạn CHƯA thanh toán: bạn có thể thử lại ngay với thời hạn còn lại.\n'
          '• Nếu bạn ĐÃ thanh toán: vui lòng chọn "Kiểm tra lại" để hệ thống đồng bộ '
          'kết quả, tránh thanh toán trùng.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Kiểm tra lại'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Thử lại'),
          ),
        ],
      ),
    );

    if (retry != true || !mounted) return;

    // Cho phép tạo giao dịch mới: xoá giao dịch đang chờ trong phiên này.
    setState(() {
      _init = null;
      _payment = null;
      _polling = false;
      _syncing = false;
      _error = '';
      _statusMessage = '';
    });
    await TokenStorage.clearPendingPayment(bookingId);
  }

  /// Poll trạng thái giao dịch mỗi 2.5 giây.
  Future<void> _startPolling(int paymentId, DateTime? deadline) async {
    if (_polling) return;
    setState(() {
      _polling = true;
      _statusMessage = 'Đang chờ kết quả thanh toán...';
    });

    try {
      final result = await _launcher.watchPaymentStatus(
        paymentId,
        deadline: deadline?.toIso8601String(),
        onTick: (payment) {
          if (!mounted) return;
          setState(() => _payment = payment);
        },
      );

      if (!mounted) return;

      if (result.isSuccess) {
        await TokenStorage.clearPendingPayment(widget.bookingId);
        if (!mounted) return;
        setState(() {
          _polling = false;
          _statusMessage = 'Thanh toán thành công!';
        });
        _showSuccessDialog();
        return;
      }

      if (result.isDeadlineExceeded) {
        setState(() {
          _polling = false;
          _statusMessage = '';
        });
        _onDeadlineExceeded();
        return;
      }

      // Có kết quả cuối nhưng không thành công → cho phép thử lại.
      await TokenStorage.clearPendingPayment(widget.bookingId);
      if (!mounted) return;
      setState(() {
        _polling = false;
        _statusMessage = '';
        _error = result.message?.isNotEmpty == true
            ? result.message!
            : 'Thanh toán không thành công. Bạn có thể thử lại.';
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _polling = false;
        _statusMessage = '';
        _error = 'Không thể kiểm tra trạng thái thanh toán. Vui lòng thử lại.';
      });
    }
  }

  // ── Đồng bộ khi quay lại từ trình duyệt ──────────────────────────────────

  /// Gọi khi app quay lại foreground (từ trình duyệt VNPay).
  void _onAppResumed() {
    if (_successDialogShown) return;
    final paymentId = _payment?.id ?? _init?.paymentId;
    if (paymentId == null) {
      // Chưa có paymentId trong bộ nhớ → thử nhớ trong storage (app có thể đã bị kill).
      _checkPendingPayment();
      return;
    }
    _syncWithVnpay(paymentId);
  }

  /// Gọi QueryDR để xác minh kết quả khi người dùng quay lại app từ trình duyệt.
  Future<void> _syncWithVnpay(int paymentId) async {
    if (_syncing) return;
    setState(() {
      _syncing = true;
      _statusMessage = 'Đang kiểm tra kết quả thanh toán...';
    });

    try {
      final result = await _syncService.sync(paymentId);
      if (!mounted) return;

      if (result.isSuccess) {
        await TokenStorage.clearPendingPayment(widget.bookingId);
        if (!mounted) return;
        setState(() {
          _payment = result.payment;
          _syncing = false;
          _statusMessage = 'Thanh toán thành công!';
        });
        _showSuccessDialog();
        return;
      }

      if (result.isFinal) {
        await TokenStorage.clearPendingPayment(widget.bookingId);
        if (!mounted) return;
        setState(() {
          _payment = result.payment;
          _syncing = false;
          _statusMessage = '';
          _error = result.message;
        });
        return;
      }

      // Chưa xác minh được ⇒ vẫn đang xử lý, KHÔNG báo lỗi.
      setState(() {
        _payment = result.payment;
        _syncing = false;
        _statusMessage = _polling ? '' : 'Đang chờ kết quả thanh toán...';
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _syncing = false;
        _statusMessage = '';
      });
    }
  }

  /// Hiện hộp thoại "Thanh toán thành công".
  ///
  /// ⚠️ Quyền hiện hộp thoại được xin ở ĐÂY (đồng bộ) — mọi đường dẫn tới
  /// thành công đều gọi hàm này ⇒ chỉ MỘT hộp thoại cho mỗi booking, và màn này
  /// ( giàu thông tin hơn ) được ưu tiên so với `PendingPaymentHost` (generic).
  void _showSuccessDialog() {
    if (_successDialogShown) return;

    // Không có quyền ⇒ nơi khác đã hiện hộp thoại ⇒ im lặng, không hiện trùng.
    if (!_results.claimDialog(widget.bookingId)) return;
    _successDialogShown = true;

    showPaymentSuccessDialog(
      context,
      bookingCode: _booking?.bookingCode ?? '#${_booking?.id}',
      amount: _booking?.totalAmount ?? 0,
      onViewBooking: () {
        if (!mounted) return;
        // ⚠️ KHÔNG dùng `Navigator.pop()`: hành động đó chỉ quay về màn TRƯỚC ĐÓ
        // (màn chọn phương thức thanh toán) ⇒ khách thấy vẫn đang ở trang booking,
        // tưởng như nút bấm không hoạt động.
        //
        // ⇒ `pushReplacement` thay thế màn PaymentScreen bằng BookingDetailScreen
        // ⇒ stack sạch: không còn quay lại được màn thanh toán đã hoàn tất.
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(
            builder: (_) => BookingDetailScreen(bookingId: widget.bookingId),
          ),
        );
      },
    );
  }

  // ── UI ────────────────────────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    final booking = _booking;

    return Scaffold(
      backgroundColor: AppCultureColors.background,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded,
              size: 18, color: AppCultureColors.textDark),
          onPressed: () => Navigator.of(context).pop(false),
        ),
        title: const Text(
          'Thanh Toán',
          style: TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.w800,
            color: AppCultureColors.textDark,
          ),
        ),
      ),
      body: _loading
          ? const Center(
              child: CircularProgressIndicator(color: AppCultureColors.heritageJade),
            )
          : _error.isNotEmpty && booking == null
              ? _buildErrorState()
              : _buildContent(booking),
    );
  }

  Widget _buildErrorState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline_rounded,
                size: 46, color: AppCultureColors.error),
            const SizedBox(height: 12),
            Text(
              _error,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 13, color: AppCultureColors.textMuted),
            ),
            const SizedBox(height: 18),
            ElevatedButton.icon(
              onPressed: _load,
              icon: const Icon(Icons.refresh_rounded, size: 18),
              label: const Text('Thử lại'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppCultureColors.heritageJade,
                foregroundColor: Colors.white,
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Phương thức đang chọn có phải "Ứng dụng ngân hàng & Ví điện tử" (QR) không.
  bool get _isQrSelected => _selectedBankCode == 'VNPAYQR';

  /// Đang ở nhóm "Thẻ thanh toán quốc tế" không.
  bool get _isInternationalSelected =>
      _selectedMethodCode == 'INTERNATIONAL_CARD';

  /// Danh sách loại thẻ quốc tế (Visa / Mastercard / JCB / UnionPay / Amex).
  ///
  /// Lấy từ `bankGroups` của API `GET /payments/methods` — nhóm có
  /// `methodCode == 'INTERNATIONAL_CARD'`, tức `bank_type = 3` của VNPay.
  List<PaymentBank> get _intlBrands {
    final groups = _methods?.bankGroups ?? const <PaymentBankGroup>[];
    for (final g in groups) {
      if (g.methodCode == 'INTERNATIONAL_CARD') return g.banks;
    }
    return const [];
  }

  /// QR chỉ hiển thị khi: đã chọn phương thức QR VÀ đã khởi tạo giao dịch (có URL).
  bool get _showQr {
    if (!_isQrSelected) return false;
    final url = _init?.paymentUrl;
    return url != null && url.isNotEmpty;
  }

  Widget _buildContent(BookingModel? booking) {
    if (booking == null) return const SizedBox.shrink();

    // Chỉ hiện phương thức được phép (xem [_hiddenMethodCodes]).
    final methods = (_methods?.methods ?? const <PaymentMethodOption>[])
        .where((m) => !_hiddenMethodCodes.contains(m.code))
        .toList();

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
      children: [
        // ── Thẻ đơn ──
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF00A86B), Color(0xFF0288D1)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(22),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  // Tiêu đề tour có thể rất dài ⇒ bọc Expanded + ellipsis để Row
                  // không bị RenderFlex overflow khi đi kèm badge đếm ngược.
                  // Badge đếm ngược là chuỗi ngắn (mm:ss) nên để ở dạng child
                  // thường + giới hạn bề rộng, còn tiêu đề chiếm toàn bộ phần
                  // còn lại (Expanded) ⇒ không bị cắt cụt oan.
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          booking.bookingCode.isEmpty
                              ? 'Đơn #${booking.id}'
                              : booking.bookingCode,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: Colors.white70,
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 1,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          booking.tourTitle.isEmpty
                              ? 'Tour trải nghiệm'
                              : booking.tourTitle,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 17,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (booking.isPendingPayment) ...[
                    const SizedBox(width: 12),
                    // Badge là chuỗi ngắn (mm:ss) nên để ở dạng child thường để
                    // nó giữ bề rộng tự nhiên; ConstrainedBox chặn trường hợp
                    // nội dung dài bất ngờ (mm:ss không bao giờ vượt 5 ký tự).
                    ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 110),
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.22),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          booking.countdownText,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 14,
                            fontWeight: FontWeight.w900,
                            fontFeatures: [FontFeature.tabularFigures()],
                          ),
                        ),
                      ),
                    ),
                  ],
                ],
              ),
              const SizedBox(height: 14),
              const Divider(color: Colors.white24, height: 1),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Ngày trải nghiệm',
                          style: TextStyle(color: Colors.white.withValues(alpha: 0.75), fontSize: 11.5),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          booking.formattedExperienceDate.isEmpty
                              ? '—'
                              : booking.formattedExperienceDate,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 160),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          'Tổng thanh toán',
                          style: TextStyle(color: Colors.white.withValues(alpha: 0.75), fontSize: 11.5),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          booking.formattedTotal,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          textAlign: TextAlign.end,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 15,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),            ],
          ),
        ),

        // ── Phương thức thanh toán ──
        const SizedBox(height: 18),
        const Text(
          'Phương thức thanh toán',
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w800,
            color: AppCultureColors.textDark,
          ),
        ),
        const SizedBox(height: 10),

        if (methods.isEmpty)
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppCultureColors.surfaceSubtle,
              borderRadius: BorderRadius.circular(14),
            ),
            child: const Text(
              'Không tải được phương thức thanh toán. Bạn vẫn có thể thử lại.',
              style: TextStyle(fontSize: 12.5, color: AppCultureColors.textMuted),
            ),
          )
        else
          // `RadioGroup` quản lý giá trị chung của các ô radio (mã phương thức).
          // Nhóm "Thẻ thanh toán quốc tế" có thêm danh sách loại thẻ con bên dưới —
          // các lựa chọn con này dùng icon riêng, không dùng `Radio` widget.
          RadioGroup<String>(
            groupValue: _selectedMethodCode,
            onChanged: (v) {
              // Đã khởi tạo giao dịch ⇒ KHÔNG cho đổi phương thức
              // (giao dịch đã gửi đi với phương thức cũ).
              if (_init != null || v == null) return;
              final method = methods.firstWhere(
                (m) => m.code == v,
                orElse: () => methods.first,
              );
              setState(() {
                _selectedMethodCode = v;
                if (method.code == 'INTERNATIONAL_CARD') {
                  // Mở danh sách loại thẻ để khách chọn (giống UI Sandbox).
                  _showIntlBrands = true;
                  // Mặc định chọn loại thẻ đầu tiên nếu khách chưa chọn.
                  final brands = _intlBrands;
                  if (_selectedBankCode == null ||
                      !brands.any((b) => b.bankCode == _selectedBankCode)) {
                    _selectedBankCode =
                        brands.isNotEmpty ? brands.first.bankCode : null;
                  }
                } else {
                  // Nhóm "Thẻ nội địa": gửi MÃ NHÓM (`VNBANK`) ⇒ trang web chỉ hiện
                  // 1 mục "Thẻ nội địa và tài khoản ngân hàng", khách chọn ngân hàng
                  // ngay trên trang web VNPay (không cần hiện danh sách trên app).
                  _selectedBankCode = method.bankCode ?? method.code;
                }
                // Đổi phương thức ⇒ QR cũ không còn đúng ⇒ ẩn đi.
                if (_selectedBankCode != 'VNPAYQR') {
                  _init = null;
                }
              });
            },
            child: Column(
              children: methods.map(_buildMethodTile).toList(),
            ),
          ),

        // ── QR thanh toán (CHỈ hiện khi chọn phương thức QR) ──
        if (_showQr) ...[
          const SizedBox(height: 18),
          _buildQrCard(),
        ],

        // ── Trạng thái poll ──
        if (_statusMessage.isNotEmpty) ...[
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppCultureColors.oceanLight,
              borderRadius: BorderRadius.circular(14),
            ),
            child: Row(
              children: [
                const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: AppCultureColors.oceanBlue,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    _statusMessage,
                    style: const TextStyle(
                      fontSize: 12.5,
                      color: AppCultureColors.oceanDark,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                // Nút kiểm tra thủ công — hữu ích khi người dùng vừa quay lại app.
                if (!_polling && !_syncing)
                  TextButton(
                    onPressed: () {
                      final paymentId = _payment?.id ?? _init?.paymentId;
                      if (paymentId != null) _syncWithVnpay(paymentId);
                    },
                    style: TextButton.styleFrom(
                      foregroundColor: AppCultureColors.oceanDark,
                      padding: const EdgeInsets.symmetric(horizontal: 10),
                      minimumSize: const Size(0, 32),
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                    child: const Text(
                      'Kiểm tra lại',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
                    ),
                  ),
              ],
            ),
          ),
        ],

        if (_error.isNotEmpty) ...[
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFFFEF2F2),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFFFECACA)),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.error_outline_rounded,
                    size: 16, color: AppCultureColors.error),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    _error,
                    style: const TextStyle(
                      fontSize: 12.5,
                      color: Color(0xFF991B1B),
                      height: 1.35,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],

        // ── Nút thanh toán ──
        const SizedBox(height: 22),
        SizedBox(
          width: double.infinity,
          height: 52,
          child: ElevatedButton.icon(
            onPressed: (_initializing || _syncing || !booking.isPaymentWindowOpen)
                ? null
                : _handlePay,
            icon: (_initializing || _syncing)
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : const Icon(Icons.account_balance_wallet_rounded, size: 20),
            label: Text(
              _initializing
                  ? 'Đang khởi tạo...'
                  : _syncing
                      ? 'Đang kiểm tra...'
                      : _polling
                          ? 'Kiểm tra kết quả thanh toán'
                          : 'Thanh toán ${booking.formattedTotal}',
              style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
            ),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppCultureColors.heritageJade,
              foregroundColor: Colors.white,
              disabledBackgroundColor: AppCultureColors.border,
              disabledForegroundColor: AppCultureColors.textMuted,
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
            ),
          ),
        ),
        const SizedBox(height: 12),
        const Text(
          'Bạn có 10 phút để hoàn tất thanh toán. Trang VNPay sẽ mở bằng trình duyệt.',
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 11.5, color: AppCultureColors.textLight),
        ),
      ],
    );
  }

  Widget _buildQrCard() {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppCultureColors.border),
      ),
      child: Column(
        children: [
          const Text(
            'Quét mã để thanh toán',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w800,
              color: AppCultureColors.textDark,
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            'Mở ứng dụng ngân hàng hoặc ví điện tử hỗ trợ VNPay-QR để quét mã này.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 11.5, color: AppCultureColors.textMuted),
          ),
          const SizedBox(height: 14),
          QrImageView(
            data: _init!.paymentUrl!,
            version: QrVersions.auto,
            size: 180,
            backgroundColor: Colors.white,
            eyeStyle: const QrEyeStyle(
              eyeShape: QrEyeShape.square,
              color: AppCultureColors.textDark,
            ),
            dataModuleStyle: const QrDataModuleStyle(
              dataModuleShape: QrDataModuleShape.square,
              color: AppCultureColors.textDark,
            ),
          ),
        ],
      ),
    );
  }

  /// Icon đại diện cho từng phương thức thanh toán.
  IconData _methodIcon(String code) {
    switch (code) {
      case 'QR_APP_WALLET':
        return Icons.qr_code_scanner_rounded;
      case 'DOMESTIC_CARD':
        return Icons.account_balance_rounded;
      case 'INTERNATIONAL_CARD':
        return Icons.credit_card_rounded;
      default:
        return Icons.account_balance_wallet_rounded;
    }
  }

  Widget _buildMethodTile(PaymentMethodOption method) {
    // Nhóm thẻ quốc tế: `bankCode` mặc định là "VISA" nhưng khách có thể chọn
    // loại thẻ cụ thể (Visa/Mastercard/JCB…) ⇒ `vnp_BankCode` gửi lên VNPay phải là
    // mã của loại thẻ, không phải mã nhóm.
    //
    // Nhóm thẻ nội địa: app gửi mã NHÓM (`VNBANK`) ⇒ trang web VNPay chỉ hiện
    // 1 mục "Thẻ nội địa và tài khoản ngân hàng", khách chọn ngân hàng trên web.
    final isInternational = method.code == 'INTERNATIONAL_CARD';
    final isSelected = _selectedMethodCode == method.code;
    final isExpanded = isInternational && isSelected && _showIntlBrands;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isSelected ? AppCultureColors.heritageJade : AppCultureColors.border,
              width: isSelected ? 1.8 : 1,
            ),
          ),
          child: InkWell(
            onTap: _init != null
                ? null
                : () => setState(() {
                      _selectedMethodCode = method.code;
                      if (isInternational) {
                        // Mở danh sách loại thẻ để khách chọn (giống UI Sandbox).
                        _showIntlBrands = true;
                        // Mặc định chọn loại thẻ đầu tiên nếu khách chưa chọn.
                        final brands = _intlBrands;
                        if (_selectedBankCode == null ||
                            !brands.any((b) => b.bankCode == _selectedBankCode)) {
                          _selectedBankCode =
                              brands.isNotEmpty ? brands.first.bankCode : null;
                        }
                      } else {
                        // Gửi MÃ NHÓM (`VNBANK`) ⇒ trang web chỉ hiện 1 mục
                        // "Thẻ nội địa và tài khoản ngân hàng".
                        _selectedBankCode = method.bankCode ?? method.code;
                      }
                      // Đổi phương thức ⇒ QR cũ không còn đúng ⇒ ẩn đi.
                      if (_selectedBankCode != 'VNPAYQR') {
                        _init = null;
                      }
                    }),
            borderRadius: BorderRadius.circular(16),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(9),
                    decoration: BoxDecoration(
                      color: AppCultureColors.jadeLight,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(
                      _methodIcon(method.code),
                      size: 20,
                      color: AppCultureColors.heritageJade,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          method.label,
                          style: const TextStyle(
                            fontSize: 13.5,
                            fontWeight: FontWeight.w800,
                            color: AppCultureColors.textDark,
                          ),
                        ),
                        if (isInternational && isSelected) ...[
                          const SizedBox(height: 2),
                          Text(
                            _selectedBankCode == null
                                ? 'Chọn loại thẻ (Visa, Mastercard, JCB…)'
                                : 'Loại thẻ: ${_intlBrandLabel(_selectedBankCode!)}',
                            style: const TextStyle(
                              fontSize: 11.5,
                              color: AppCultureColors.textMuted,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                  if (isInternational)
                    Icon(
                      isExpanded
                          ? Icons.keyboard_arrow_up_rounded
                          : Icons.keyboard_arrow_down_rounded,
                      size: 20,
                      color: AppCultureColors.textMuted,
                    ),
                  // Ô radio của nhóm phương thức — giá trị được quản lý bởi
                  // `RadioGroup` bao quanh (xem build()).
                  Radio<String>(
                    value: method.code,
                  ),
                ],
              ),
            ),
          ),
        ),

        // ── Danh sách loại thẻ quốc tế (chỉ hiện khi nhóm thẻ quốc tế được mở) ──
        if (isExpanded && isInternational) _buildIntlBrandList(),
      ],
    );
  }

  /// Danh sách loại thẻ quốc tế (Visa / Mastercard / JCB / UnionPay / Amex).
  Widget _buildIntlBrandList() {
    final brands = _intlBrands;

    if (brands.isEmpty) {
      return Padding(
        padding: const EdgeInsets.fromLTRB(14, 0, 14, 10),
        child: Text(
          'Không tải được danh sách loại thẻ. Bạn vẫn có thể thanh toán bằng thẻ quốc tế.',
          style: const TextStyle(fontSize: 11.5, color: AppCultureColors.textMuted),
        ),
      );
    }
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.fromLTRB(12, 6, 12, 10),
      decoration: BoxDecoration(
        color: AppCultureColors.jadeLight,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Padding(
            padding: EdgeInsets.fromLTRB(2, 6, 0, 8),
            child: Text(
              'Chọn loại thẻ',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w800,
                color: AppCultureColors.textDark,
              ),
            ),
          ),
          ...brands.map((b) {
            final isOn = _isInternationalSelected && _selectedBankCode == b.bankCode;
            return InkWell(
              onTap: _init != null
                  ? null
                  : () => setState(() {
                        _selectedBankCode = b.bankCode;
                        _init = null;
                      }),
              borderRadius: BorderRadius.circular(10),
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 9, horizontal: 4),
                child: Row(
                  children: [
                    Icon(
                      isOn
                          ? Icons.radio_button_checked_rounded
                          : Icons.radio_button_unchecked_rounded,
                      size: 18,
                      color: isOn
                          ? AppCultureColors.heritageJade
                          : AppCultureColors.textMuted,
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        b.bankName.isEmpty ? b.bankCode : b.bankName,
                        style: TextStyle(
                          fontSize: 12.5,
                          fontWeight: isOn ? FontWeight.w700 : FontWeight.w500,
                          color: AppCultureColors.textDark,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            );
          }),
        ],
      ),
    );
  }

  /// Tên hiển thị của loại thẻ quốc tế theo mã `bankCode`.
  String _intlBrandLabel(String bankCode) {
    for (final b in _intlBrands) {
      if (b.bankCode == bankCode) {
        return b.bankName.isEmpty ? bankCode : b.bankName;
      }
    }
    return bankCode;
  }

}
