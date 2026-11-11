import 'dart:async';
import 'package:flutter/material.dart';

/// Tự vẽ lại mỗi 30 giây để nhãn thời gian tương đối ("Vừa xong", "5 phút trước"…) luôn đúng
/// trong lúc du khách để yên màn hình, không cần kéo làm mới.
///
/// Dùng: `LiveTime(builder: (_) => Text(timeAgo(post.createdAt)))`.
/// Đồng hồ dừng khi widget rời cây (rời màn hình) nên không tốn pin.
class LiveTime extends StatefulWidget {
  final WidgetBuilder builder;

  const LiveTime({super.key, required this.builder});

  @override
  State<LiveTime> createState() => _LiveTimeState();
}

class _LiveTimeState extends State<LiveTime> {
  static const _tick = Duration(seconds: 30);
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(_tick, (_) {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => widget.builder(context);
}
