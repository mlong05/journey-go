import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart' show HapticFeedback;
import 'package:flutter_overlay_window/flutter_overlay_window.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Ô đồng hồ đếm ngược nổi trên màn hình chính của điện thoại (Android, cần quyền "hiển thị trên ứng dụng
/// khác"). Chạy trong một Flutter engine RIÊNG (entry point `overlayMain` ở `main.dart`) ⇒ không dùng được
/// state / bản dịch của app chính: mọi chữ đã dịch + mốc kết thúc được app chính gửi sang qua [OverlayPayload].
///
/// Nút X: hỏi "Ẩn đồng hồ nổi?" ⇒ Ẩn chỉ đóng ô nổi, thời gian VẪN đếm trong app (bong bóng + thông báo).
class OverlayPayload {
  /// Khoá SharedPreferences: app chính ghi trước khi mở ô nổi (ô nổi đọc khi khởi động — phòng khi
  /// tin nhắn `shareData` tới trước lúc ô nổi kịp lắng nghe).
  static const String prefsKey = 'activity_overlay_payload';

  /// Ô nổi gửi về app chính khi du khách bấm "Ẩn" (để không tự mở lại cho hoạt động này).
  static const String dismissedMessage = 'activity_overlay_dismissed';

  /// Kích thước ô nổi (dp).
  static const int compactWidth = 250;
  static const int compactHeight = 68;
  static const int confirmHeight = 172;

  static Map<String, dynamic> build({
    required DateTime endsAt,
    required int totalSeconds,
    required String taskName,
    required String timeUp,
    required String scanQr,
    required String hideTitle,
    required String hideBody,
    required String hide,
    required String cancel,
  }) =>
      {
        'endsAt': endsAt.millisecondsSinceEpoch,
        'total': totalSeconds,
        'name': taskName,
        'timeUp': timeUp,
        'scanQr': scanQr,
        'hideTitle': hideTitle,
        'hideBody': hideBody,
        'hide': hide,
        'cancel': cancel,
      };
}

/// Ứng dụng của ô nổi (gọi từ `overlayMain`).
class ActivityOverlayApp extends StatelessWidget {
  const ActivityOverlayApp({super.key});

  @override
  Widget build(BuildContext context) {
    return const MaterialApp(
      debugShowCheckedModeBanner: false,
      color: Colors.transparent,
      home: Material(type: MaterialType.transparency, child: _OverlayTimer()),
    );
  }
}

class _OverlayTimer extends StatefulWidget {
  const _OverlayTimer();

  @override
  State<_OverlayTimer> createState() => _OverlayTimerState();
}

class _OverlayTimerState extends State<_OverlayTimer> {
  static const _night = Color(0xFF0F172A);
  // Hết giờ: cam đậm — "cần quay lại quét QR ngay", khác hẳn xanh ngọc của nút Check-in (đỏ dễ hiểu nhầm là lỗi)
  static const _timeUp = Color(0xFFEA580C);
  static const _accentBright = Color(0xFF2DD4BF);
  static const _muted = Color(0xFF94A3B8);

  Map<String, dynamic>? _data;
  StreamSubscription<dynamic>? _sub;
  Timer? _tick;
  bool _confirm = false;
  bool _wasDone = false;

  @override
  void initState() {
    super.initState();
    _sub = FlutterOverlayWindow.overlayListener.listen((event) {
      final map = _decode(event);
      if (map != null && mounted) setState(() => _data = map);
    });
    _loadSaved();
    _tick = Timer.periodic(const Duration(milliseconds: 500), (_) => _onTick());
  }

  Future<void> _loadSaved() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final map = _decode(prefs.getString(OverlayPayload.prefsKey));
      if (map != null && mounted && _data == null) setState(() => _data = map);
    } catch (_) {}
  }

  Map<String, dynamic>? _decode(dynamic raw) {
    try {
      if (raw is Map) return Map<String, dynamic>.from(raw);
      if (raw is String) return Map<String, dynamic>.from(jsonDecode(raw) as Map);
    } catch (_) {}
    return null;
  }

  int get _secondsLeft {
    final ms = (_data?['endsAt'] as num?)?.toInt();
    if (ms == null) return 0;
    final left = DateTime.fromMillisecondsSinceEpoch(ms).difference(DateTime.now()).inMilliseconds;
    return left <= 0 ? 0 : (left / 1000).ceil();
  }

  void _onTick() {
    if (!mounted || _data == null) return;
    final done = _secondsLeft == 0;
    // Hết giờ khi đang ở màn hình chính ⇒ rung để du khách biết quay lại quét QR
    if (done && !_wasDone) HapticFeedback.heavyImpact();
    _wasDone = done;
    setState(() {});
  }

  @override
  void dispose() {
    _sub?.cancel();
    _tick?.cancel();
    super.dispose();
  }

  String _text(String key) => _data?[key]?.toString() ?? '';

  String _mmss(int seconds) =>
      '${(seconds ~/ 60).toString().padLeft(2, '0')}:${(seconds % 60).toString().padLeft(2, '0')}';

  Future<void> _askHide() async {
    setState(() => _confirm = true);
    await FlutterOverlayWindow.resizeOverlay(OverlayPayload.compactWidth, OverlayPayload.confirmHeight, false);
  }

  Future<void> _cancelHide() async {
    setState(() => _confirm = false);
    await FlutterOverlayWindow.resizeOverlay(OverlayPayload.compactWidth, OverlayPayload.compactHeight, true);
  }

  Future<void> _hide() async {
    await FlutterOverlayWindow.shareData(OverlayPayload.dismissedMessage);
    await FlutterOverlayWindow.closeOverlay();
  }

  @override
  Widget build(BuildContext context) {
    if (_data == null) return const SizedBox.shrink();
    return _confirm ? _buildConfirm() : _buildCompact();
  }

  Widget _buildCompact() {
    final left = _secondsLeft;
    final done = left == 0;
    final total = ((_data?['total'] as num?)?.toInt() ?? 0).clamp(1, 1 << 30);
    final progress = done ? 1.0 : 1 - (left / total).clamp(0.0, 1.0);
    return Container(
      height: OverlayPayload.compactHeight.toDouble(),
      padding: const EdgeInsets.fromLTRB(8, 8, 6, 8),
      decoration: BoxDecoration(
        color: done ? _timeUp : _night,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        children: [
          SizedBox(
            width: 44,
            height: 44,
            child: Stack(
              alignment: Alignment.center,
              children: [
                SizedBox(
                  width: 44,
                  height: 44,
                  child: CircularProgressIndicator(
                    value: progress,
                    strokeWidth: 3.5,
                    backgroundColor: Colors.white.withValues(alpha: 0.15),
                    valueColor: AlwaysStoppedAnimation(done ? Colors.white : _accentBright),
                  ),
                ),
                Icon(done ? Icons.qr_code_scanner_rounded : Icons.timer_outlined, size: 20, color: Colors.white),
              ],
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  done ? _text('timeUp') : _mmss(left),
                  maxLines: 1,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    fontFeatures: [FontFeature.tabularFigures()],
                    height: 1.1,
                  ),
                ),
                Text(
                  done ? _text('scanQr') : _text('name'),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: done ? Colors.white.withValues(alpha: 0.9) : _muted,
                    fontSize: 11.5,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
          // Nút X: hỏi lại trước khi ẩn (thời gian vẫn đếm trong app)
          Material(
            color: Colors.white.withValues(alpha: 0.14),
            shape: const CircleBorder(),
            child: InkWell(
              customBorder: const CircleBorder(),
              onTap: _askHide,
              child: const SizedBox(
                width: 34,
                height: 34,
                child: Icon(Icons.close_rounded, size: 18, color: Colors.white),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildConfirm() {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 14, 12, 10),
      decoration: BoxDecoration(color: _night, borderRadius: BorderRadius.circular(22)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            _text('hideTitle'),
            style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 6),
          Text(
            _text('hideBody'),
            style: const TextStyle(color: _muted, fontSize: 12.5, height: 1.4),
          ),
          const Spacer(),
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              TextButton(
                onPressed: _cancelHide,
                style: TextButton.styleFrom(foregroundColor: Colors.white),
                child: Text(_text('cancel')),
              ),
              const SizedBox(width: 4),
              FilledButton(
                onPressed: _hide,
                style: FilledButton.styleFrom(backgroundColor: _accentBright, foregroundColor: _night),
                child: Text(_text('hide'), style: const TextStyle(fontWeight: FontWeight.w800)),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
