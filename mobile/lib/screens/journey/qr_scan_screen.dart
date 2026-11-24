import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart' show HapticFeedback;
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

class _QrScanScreenState extends State<QrScanScreen> with WidgetsBindingObserver, TickerProviderStateMixin {
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

  /// Vạch quét chạy lên xuống trong khung.
  late final AnimationController _scanLine =
      AnimationController(vsync: this, duration: const Duration(milliseconds: 1800))..repeat(reverse: true);

  /// Quét / nhập được mã: con dấu ✓ đóng xuống rồi mới đóng màn (để du khách biết đã nhận mã).
  late final AnimationController _stamp =
      AnimationController(vsync: this, duration: const Duration(milliseconds: 420));
  bool _success = false;

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
    _scanLine.dispose();
    _stamp.dispose();
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
    HapticFeedback.mediumImpact();
    setState(() => _success = true);
    _scanLine.stop();
    _stamp.forward();
    Future<void>.delayed(const Duration(milliseconds: 650), () {
      if (mounted) Navigator.of(context).pop(value);
    });
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
            child: IgnorePointer(child: CustomPaint(painter: _ScanOverlayPainter(window, _scanLine, success: _success))),
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
                            color: Colors.white, fontSize: 17, fontWeight: FontWeight.w700)),
                  ),
                  const SizedBox(width: 48),
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
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.14),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(widget.hint,
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w600, height: 1.35)),
                ),
                if (_slowStart && !_manualOpen) ...[
                  const SizedBox(height: 8),
                  const Text('Camera mở chậm? Bạn có thể nhập mã in dưới QR.',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: AppCultureColors.onDarkMuted, fontSize: 12.5)),
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
                child: _manualOpen ? _buildManualPanel() : _buildActionBar(),
              ),
            ),
          ),
          if (_success)
            Positioned.fromRect(
              rect: window,
              child: Center(
                child: ScaleTransition(
                  scale: Tween<double>(begin: 2.2, end: 1).animate(CurvedAnimation(parent: _stamp, curve: Curves.easeOutBack)),
                  child: FadeTransition(
                    opacity: _stamp,
                    child: Container(
                      width: 116,
                      height: 116,
                      decoration: BoxDecoration(
                        color: const Color(0xFF047857),
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white, width: 5),
                        boxShadow: const [BoxShadow(color: Color(0x6634D399), blurRadius: 30, spreadRadius: 6)],
                      ),
                      child: const Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.check_rounded, color: Colors.white, size: 52),
                          Text('ĐÃ QUÉT', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w900, letterSpacing: 1.4)),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  /// Hai nút lớn có chữ: bật đèn flash (chỗ tối) và nhập mã in dưới QR (camera lỗi / mã mờ).
  Widget _buildActionBar() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        _ScanAction(
          icon: _torch ? Icons.flash_on_rounded : Icons.flash_off_rounded,
          label: _torch ? 'Tắt đèn' : 'Đèn flash',
          active: _torch,
          onTap: _toggleTorch,
        ),
        const SizedBox(width: 28),
        _ScanAction(
          icon: Icons.keyboard_rounded,
          label: 'Nhập mã',
          active: _slowStart,
          onTap: () => setState(() => _manualOpen = true),
        ),
      ],
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
                    style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
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
              hintText: 'VD: JGS-3F9A1C7E52B04D18',
              helperText: 'Mã điểm đến bắt đầu bằng JGS-, mã hoạt động bắt đầu bằng JGE-',
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
            child: const Text('Xác nhận mã', style: TextStyle(fontWeight: FontWeight.w700)),
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

/// Nút tròn lớn có chữ ở đáy màn quét (kiểu kính mờ).
class _ScanAction extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool active;
  final VoidCallback onTap;

  const _ScanAction({required this.icon, required this.label, required this.active, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: label,
      child: GestureDetector(
        onTap: onTap,
        behavior: HitTestBehavior.opaque,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: active ? Colors.white : Colors.white.withValues(alpha: 0.16),
                border: Border.all(color: Colors.white.withValues(alpha: 0.35)),
              ),
              child: Icon(icon, size: 28, color: active ? const Color(0xFF0F172A) : Colors.white),
            ),
            const SizedBox(height: 8),
            Text(label, style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w700)),
          ],
        ),
      ),
    );
  }
}

class _ScanOverlayPainter extends CustomPainter {
  final Rect window;
  final Animation<double> line;
  final bool success;

  _ScanOverlayPainter(this.window, this.line, {this.success = false}) : super(repaint: line);

  @override
  void paint(Canvas canvas, Size size) {
    final rrect = RRect.fromRectAndRadius(window, const Radius.circular(24));
    final overlay = Path()
      ..addRect(Offset.zero & size)
      ..addRRect(rrect)
      ..fillType = PathFillType.evenOdd;
    canvas.drawPath(overlay, Paint()..color = Colors.black.withValues(alpha: 0.62));

    // Vạch quét có quầng sáng chạy lên xuống trong khung.
    if (!success) {
      final y = window.top + 14 + (window.height - 28) * Curves.easeInOut.transform(line.value);
      final glow = Rect.fromLTRB(window.left + 16, y - 26, window.right - 16, y);
      canvas.drawRect(
        glow,
        Paint()
          ..shader = LinearGradient(
            begin: line.status == AnimationStatus.reverse ? Alignment.bottomCenter : Alignment.topCenter,
            end: line.status == AnimationStatus.reverse ? Alignment.topCenter : Alignment.bottomCenter,
            colors: [const Color(0x0034D399), const Color(0x4434D399)],
          ).createShader(glow),
      );
      canvas.drawLine(
        Offset(window.left + 16, y),
        Offset(window.right - 16, y),
        Paint()
          ..color = const Color(0xFF34D399)
          ..strokeWidth = 2.5
          ..strokeCap = StrokeCap.round,
      );
    }

    // Bốn góc xanh ngọc sáng.
    final corner = Paint()
      ..color = success ? Colors.white : const Color(0xFF34D399)
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
  bool shouldRepaint(covariant _ScanOverlayPainter old) => old.window != window || old.success != success;
}
