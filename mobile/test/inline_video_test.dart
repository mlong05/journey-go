import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/screens/common/inline_video.dart';

void main() {
  test('reads YouTube ids from common link forms', () {
    for (final url in [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://youtu.be/dQw4w9WgXcQ?t=10',
      'https://www.youtube.com/shorts/dQw4w9WgXcQ',
      'https://www.youtube.com/watch?feature=share&v=dQw4w9WgXcQ',
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
    ]) {
      expect(youTubeIdOf(url), 'dQw4w9WgXcQ', reason: url);
    }
    expect(youTubeIdOf('https://res.cloudinary.com/demo/video/upload/v1/a.mp4'), isNull);
  });

  test('builds posters for YouTube and Cloudinary videos', () {
    expect(videoPosterOf('https://youtu.be/dQw4w9WgXcQ'), 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
    expect(
      videoPosterOf('https://res.cloudinary.com/demo/video/upload/v1/journeygo/tours/videos/a.mp4'),
      'https://res.cloudinary.com/demo/video/upload/so_0/v1/journeygo/tours/videos/a.jpg',
    );
    expect(videoPosterOf('https://example.com/a.mp4'), isNull);
  });
}
