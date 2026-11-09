import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:video_player/video_player.dart';
import 'package:youtube_player_iframe/youtube_player_iframe.dart';
import 'photo.dart';

/// Mã video YouTube (11 ký tự) từ link watch?v=, youtu.be/, shorts/, embed/, live/.
String? youTubeIdOf(String url) => RegExp(
  r'(?:youtu\.be/|youtube(?:-nocookie)?\.com/(?:embed/|v/|shorts/|live/|watch\?(?:.*&)?v=))([\w-]{11})',
).firstMatch(url)?.group(1);

/// Ảnh chờ trước khi phát: khung hình YouTube; video Cloudinary lấy khung hình đầu của chính video.
String? videoPosterOf(String url) {
  final id = youTubeIdOf(url);
  if (id != null) return 'https://img.youtube.com/vi/$id/hqdefault.jpg';
  const marker = '/video/upload/';
  final i = url.indexOf(marker);
  if (url.contains('res.cloudinary.com') && i >= 0) {
    final rest = url
        .substring(i + marker.length)
        .replaceFirst(RegExp(r'\.(mp4|webm|mov)(\?.*)?$', caseSensitive: false), '.jpg');
    return '${url.substring(0, i + marker.length)}so_0/$rest';
  }
  return null;
}

/// Video phát ngay trong app: YouTube qua trình phát nhúng, link MP4 / video tải lên qua video_player.
/// Chỉ tải video khi người dùng bấm phát để màn mở nhanh và không tốn dữ liệu.
class InlineVideo extends StatefulWidget {
  final String url;

  const InlineVideo({super.key, required this.url});

  @override
  State<InlineVideo> createState() => _InlineVideoState();
}

class _InlineVideoState extends State<InlineVideo> {
  YoutubePlayerController? _youTube;
  VideoPlayerController? _video;
  bool _loading = false;
  bool _failed = false;

  late final String? _youTubeId = youTubeIdOf(widget.url);

  @override
  void dispose() {
    _youTube?.close();
    _video?.dispose();
    super.dispose();
  }

  Future<void> _play() async {
    final id = _youTubeId;
    if (id != null) {
      setState(() {
        _youTube = YoutubePlayerController.fromVideoId(
          videoId: id,
          autoPlay: true,
          params: const YoutubePlayerParams(showFullscreenButton: true, strictRelatedVideos: true),
        );
      });
      return;
    }
    final controller = VideoPlayerController.networkUrl(Uri.parse(widget.url));
    setState(() {
      _video = controller;
      _loading = true;
      _failed = false;
    });
    try {
      await controller.initialize();
      controller.addListener(_onTick);
      await controller.play();
      if (mounted) setState(() => _loading = false);
    } catch (_) {
      await controller.dispose();
      if (mounted) {
        setState(() {
          _video = null;
          _loading = false;
          _failed = true;
        });
      }
    }
  }

  void _onTick() {
    if (mounted) setState(() {});
  }

  void _togglePlay() {
    final v = _video;
    if (v == null) return;
    v.value.isPlaying ? v.pause() : v.play();
  }

  @override
  Widget build(BuildContext context) {
    final yt = _youTube;
    final v = _video;
    final Widget child;
    if (yt != null) {
      child = YoutubePlayer(controller: yt, aspectRatio: 16 / 9);
    } else if (v != null && v.value.isInitialized) {
      child = _videoPlayer(v);
    } else if (_failed) {
      child = _failure();
    } else {
      child = _poster();
    }
    final ratio = (v != null && v.value.isInitialized && v.value.aspectRatio > 0) ? v.value.aspectRatio : 16 / 9;
    return ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: AspectRatio(aspectRatio: ratio, child: child),
    );
  }

  Widget _poster() {
    return Semantics(
      button: true,
      label: 'Phát video giới thiệu',
      child: GestureDetector(
        onTap: _loading ? null : _play,
        child: Stack(
          fit: StackFit.expand,
          children: [
            const ColoredBox(color: Colors.black),
            Photo(url: videoPosterOf(widget.url), width: 400),
            const ColoredBox(color: Color(0x40000000)),
            Center(
              child: _loading
                  ? const CircularProgressIndicator(color: Colors.white)
                  : Container(
                      width: 60,
                      height: 60,
                      decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
                      child: const Icon(Icons.play_arrow_rounded, size: 38, color: Colors.black87),
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _videoPlayer(VideoPlayerController v) {
    final playing = v.value.isPlaying;
    return GestureDetector(
      onTap: _togglePlay,
      child: Stack(
        fit: StackFit.expand,
        children: [
          const ColoredBox(color: Colors.black),
          VideoPlayer(v),
          if (!playing)
            const Center(
              child: CircleAvatar(
                radius: 28,
                backgroundColor: Colors.white,
                child: Icon(Icons.play_arrow_rounded, size: 34, color: Colors.black87),
              ),
            ),
          if (v.value.isBuffering) const Center(child: CircularProgressIndicator(color: Colors.white)),
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: VideoProgressIndicator(
              v,
              allowScrubbing: true,
              padding: const EdgeInsets.symmetric(vertical: 6),
              colors: const VideoProgressColors(playedColor: Colors.white, bufferedColor: Colors.white38),
            ),
          ),
        ],
      ),
    );
  }

  Widget _failure() {
    return ColoredBox(
      color: const Color(0xFF1F2328),
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'Không phát được video này trong ứng dụng',
              style: TextStyle(color: Colors.white70, fontSize: 13),
            ),
            TextButton(
              onPressed: () => launchUrl(Uri.parse(widget.url), mode: LaunchMode.externalApplication),
              child: const Text(
                'Mở bằng ứng dụng khác',
                style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
