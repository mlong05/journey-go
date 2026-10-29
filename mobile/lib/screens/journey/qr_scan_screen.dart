import 'dart:async';
import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../../core/constants/app_colors.dart';

/// Quét mã QR tại trạm / điểm đến. Pop với chuỗi quét được (hoặc mã nhập tay), `null` nếu hủy.
///
/// Tự quản lý vòng đời camera theo mẫu của mobile_scanner (autoStart: false): khởi động trong
/// initState, dừng khi app inactive (kể cả lúc hộp xin quyền camera hiện lên), chạy lại khi resumed.
/// Nếu để thư viện tự khởi động trong khi màn hình cấp controller riêng, camera có thể kẹt ở màn đen.
class QrScanScreen extends StatefulWidget {
  final String title;
  final String hint;

  const QrScanScreen({
    super.key,
    this.title = 'Quét mã QR',
    this.hint = 'Đưa mã QR tại điểm đến vào khung',
  });

  @override
  State<QrScanScreen> createState() => _QrScanScreenState();
}

class _QrScanScreenState extends State<QrScanScreen> with WidgetsBindingObserver {
  final MobileScannerController _controller = MobileScannerController(
    autoStart: false,
    formats: const [BarcodeFormat.qrCode],
    detectionSpeed: DetectionSpeed.noDuplicates,
  );
  // Ô nhập tay nằm ngay trong màn hình (không mở hộp thoại riêng) và chỉ bị hủy cùng màn hình.
  final TextEditingController _manualController = TextEditingController();

  StreamSubscription<BarcodeCapture>? _subscription;
  bool _handled = false;
  bool _torch = false;
  bool _manualOpen = false;
  bool _slowStart = false;
  Timer? _slowTimer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _subscription = _controller.barcodes.listen(_onDetect);
    unawaited(_controller.start());
    // Camera chưa lên sau vài giây: gợi ý nhập mã tay thay vì để màn đen.
    _slowTimer = Timer(const Duration(seconds: 6), () {
      if (mounted && !_controller.value.isRunning) setState(() => _slowStart = true);
    });
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // Hộp xin quyền camera cũng làm app inactive; khi chưa có quyền thì để controller tự xử lý.
    if (!_controller.value.hasCameraPermission) return;
    switch (state) {
      case AppLifecycleState.detached:
      case AppLifecycleState.hidden:
      case AppLifecycleState.paused:
        return;
      case AppLifecycleState.resumed:
        _subscription ??= _controller.barcodes.listen(_onDetect);
        unawaited(_controller.start());
      case AppLifecycleState.inactive:
        unawaited(_subscription?.cancel());
        _subscription = null;
        unawaited(_controller.stop());
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _slowTimer?.cancel();
    unawaited(_subscription?.cancel());
    _subscription = null;
    _manualController.dispose();
    super.dispose();
    unawaited(_controller.dispose());
  }

  void _finish(String value) {
    if (_handled || !mounted) return;
    _handled = true;
    unawaited(_subscription?.cancel());
    _subscription = null;
    unawaited(_controller.stop());
    FocusManager.instance.primaryFocus?.unfocus();
    Navigator.of(context).pop(value);
  }

  void _onDetect(BarcodeCapture capture) {
    final value = capture.barcodes
        .map((b) => b.rawValue)
        .whereType<String>()
        .map((v) => v.trim())
        .firstWhere((v) => v.isNotEmpty, orElse: () => '');
    if (value.isNotEmpty) _finish(value);
  }

  void _submitManual() {
    final value = _manualController.text.trim();
    if (value.isNotEmpty) _finish(value);
  }

  Future<void> _toggleTorch() async {
    try {
      await _controller.toggleTorch();
      if (mounted) setState(() => _torch = !_torch);
    } catch (_) {
      // Thiết bị không có đèn flash: bỏ qua.
    }
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.sizeOf(context);
    final box = size.width * 0.68;
    final window = Rect.fromCenter(
      center: Offset(size.width / 2, size.height * 0.4),
      width: box,
      height: box,
    );

    return Scaffold(
      backgroundColor: Colors.black,
      resizeToAvoidBottomInset: true,
      body: Stack(
        children: [
          Positioned.fill(
            child: MobileScanner(
              controller: _controller,
              scanWindow: window,
              placeholderBuilder: (_) => const ColoredBox(
                color: Colors.black,
                child: Center(child: CircularProgressIndicator(color: AppCultureColors.heritageJade)),
              ),
              errorBuilder: (context, error) => _CameraProblem(
                message: error.errorCode == MobileScannerErrorCode.permissionDenied
                    ? 'Ứng dụng chưa được cấp quyền camera. Hãy cấp quyền trong Cài đặt, hoặc nhập mã thủ công bên dưới.'
                    : 'Không mở được camera. Bạn có thể nhập mã thủ công bên dưới.',
              ),
            ),
          ),
          // Lớp tối với khung ngắm trong suốt.
          Positioned.fill(
            child: IgnorePointer(child: CustomPaint(painter: _ScanOverlayPainter(window))),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              child: Row(
                children: [
                  IconButton(
                    onPressed: () => Navigator.of(context).pop(),
                    icon: const Icon(Icons.close_rounded, color: Colors.white, size: 26),
                  ),
                  Expanded(
                    child: Text(widget.title,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                            color: Colors.white, fontSize: 17, fontWeight: FontWeight.w800)),
                  ),
                  IconButton(
                    onPressed: _toggleTorch,
                    icon: Icon(_torch ? Icons.flash_on_rounded : Icons.flash_off_rounded,
                        color: Colors.white, size: 24),
                  ),
                ],
              ),
            ),
          ),
          Positioned(
            left: 24,
            right: 24,
            top: window.bottom + 24,
            child: Column(
              children: [
                Text(widget.hint,
                    textAlign: TextAlign.center,
                    style: const TextStyle(color: Colors.white, fontSize: 14.5, height: 1.4)),
                if (_slowStart && !_manualOpen) ...[
                  const SizedBox(height: 8),
                  const Text('Camera mở chậm? Bạn có thể nhập mã in dưới QR.',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Colors.white70, fontSize: 12.5)),
                ],
              ],
            ),
          ),
          Align(
            alignment: Alignment.bottomCenter,
            child: SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
                child: _manualOpen ? _buildManualPanel() : _buildManualButton(),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildManualButton() {
    return TextButton.icon(
      onPressed: () => setState(() => _manualOpen = true),
      icon: const Icon(Icons.keyboard_rounded, color: Colors.white70, size: 18),
      label: const Text('Nhập mã thủ công', style: TextStyle(color: Colors.white70)),
    );
  }

  Widget _buildManualPanel() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Expanded(
                child: Text('Nhập mã in dưới QR',
                    style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
              ),
              IconButton(
                visualDensity: VisualDensity.compact,
                onPressed: () {
                  FocusManager.instance.primaryFocus?.unfocus();
                  setState(() => _manualOpen = false);
                },
                icon: const Icon(Icons.close_rounded, size: 20),
              ),
            ],
          ),
          const SizedBox(height: 6),
          TextField(
            controller: _manualController,
            autofocus: true,
            textCapitalization: TextCapitalization.characters,
            textInputAction: TextInputAction.done,
            onSubmitted: (_) => _submitManual(),
            decoration: InputDecoration(
              hintText: 'VD: JGD-3F9A1C7E52B04D18',
              filled: true,
              fillColor: AppCultureColors.surfaceSubtle,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide.none,
              ),
            ),
          ),
          const SizedBox(height: 12),
          FilledButton(
            onPressed: _submitManual,
            style: FilledButton.styleFrom(
              backgroundColor: AppCultureColors.heritageJade,
              minimumSize: const Size.fromHeight(48),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            ),
            child: const Text('Xác nhận mã', style: TextStyle(fontWeight: FontWeight.w800)),
          ),
        ],
      ),
    );
  }
}

class _CameraProblem extends StatelessWidget {
  final String message;

  const _CameraProblem({required this.message});

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: Colors.black,
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.no_photography_rounded, color: Colors.white54, size: 56),
              const SizedBox(height: 16),
              Text(message,
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Colors.white, height: 1.5)),
            ],
          ),
        ),
      ),
    );
  }
}

class _ScanOverlayPainter extends CustomPainter {
  final Rect window;

  _ScanOverlayPainter(this.window);

  @override
  void paint(Canvas canvas, Size size) {
    final rrect = RRect.fromRectAndRadius(window, const Radius.circular(24));
    final overlay = Path()
      ..addRect(Offset.zero & size)
      ..addRRect(rrect)
      ..fillType = PathFillType.evenOdd;
    canvas.drawPath(overlay, Paint()..color = Colors.black.withValues(alpha: 0.62));

    // Bốn góc ngọc di sản.
    final corner = Paint()
      ..color = AppCultureColors.heritageJade
      ..style = PaintingStyle.stroke
      ..strokeWidth = 5
      ..strokeCap = StrokeCap.round;
    const len = 34.0;
    final r = window;
    void c(Offset a, Offset b, Offset c2) {
      canvas.drawPath(
        Path()
          ..moveTo(a.dx, a.dy)
          ..lineTo(b.dx, b.dy)
          ..lineTo(c2.dx, c2.dy),
        corner,
      );
    }

    c(r.topLeft + const Offset(0, len), r.topLeft, r.topLeft + const Offset(len, 0));
    c(r.topRight + const Offset(-len, 0), r.topRight, r.topRight + const Offset(0, len));
    c(r.bottomLeft + const Offset(0, -len), r.bottomLeft, r.bottomLeft + const Offset(len, 0));
    c(r.bottomRight + const Offset(-len, 0), r.bottomRight, r.bottomRight + const Offset(0, -len));
  }

  @override
  bool shouldRepaint(covariant _ScanOverlayPainter old) => old.window != window;
}
