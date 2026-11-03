/// Nội dung văn hóa đã duyệt của điểm đến (API /destinations/{id}/contents).
class CulturalContentModel {
  final int id;
  final int destinationId;
  final String destinationName;
  final String title;
  final String contentType; // AUDIO | VIDEO | STORY | ARTICLE | IMAGE | 3D_VR
  final int sequenceOrder;
  final String description;
  final String contentText;
  final String mediaUrl;
  final int? duration; // giây
  final List<String> imageUrls; // thư viện ảnh kèm nội dung

  const CulturalContentModel({
    required this.id,
    required this.destinationId,
    required this.destinationName,
    required this.title,
    required this.contentType,
    required this.sequenceOrder,
    required this.description,
    required this.contentText,
    required this.mediaUrl,
    required this.duration,
    this.imageUrls = const [],
  });

  factory CulturalContentModel.fromJson(Map<String, dynamic> j) {
    int asInt(dynamic v) => v is num ? v.toInt() : int.tryParse(v?.toString() ?? '') ?? 0;
    return CulturalContentModel(
      id: asInt(j['id']),
      destinationId: asInt(j['destinationId']),
      destinationName: j['destinationName']?.toString() ?? '',
      title: j['title']?.toString() ?? '',
      contentType: j['contentType']?.toString() ?? 'ARTICLE',
      sequenceOrder: asInt(j['sequenceOrder']),
      description: j['description']?.toString() ?? '',
      contentText: j['contentText']?.toString() ?? '',
      mediaUrl: j['mediaUrl']?.toString() ?? '',
      duration: j['duration'] == null ? null : asInt(j['duration']),
      imageUrls: (j['imageUrls'] as List?)
              ?.map((e) => e?.toString() ?? '')
              .where((u) => u.startsWith('http'))
              .toList() ??
          const [],
    );
  }

  /// Mã video YouTube nếu mediaUrl là link YouTube.
  String? get youTubeId => RegExp(
        r'(?:youtu\.be/|youtube\.com/(?:embed/|v/|watch\?v=|watch\?.+&v=|shorts/))([\w-]{11})',
      ).firstMatch(mediaUrl)?.group(1);

  bool get isVideo =>
      youTubeId != null ||
      RegExp(r'\.(mp4|webm|mov)(\?.*)?$', caseSensitive: false).hasMatch(mediaUrl) ||
      mediaUrl.contains('/video/upload/');

  /// Ảnh đại diện: ảnh media (nội dung cũ) hoặc ảnh đầu tiên trong thư viện.
  String? get coverImage =>
      hasImage ? mediaUrl : (imageUrls.isNotEmpty ? imageUrls.first : null);

  /// Toàn bộ ảnh để xem: ảnh media cũ (nếu có) + thư viện ảnh.
  List<String> get galleryImages =>
      [if (hasImage) mediaUrl, ...imageUrls.where((u) => u != mediaUrl)];

  /// Ảnh xem trước của video (YouTube có sẵn ảnh thu nhỏ).
  String? get videoThumbnail =>
      youTubeId != null ? 'https://img.youtube.com/vi/$youTubeId/hqdefault.jpg' : coverImage;

  /// Cách hiển thị media: image (xem trong app) hoặc playable (mở trình phát ngoài).
  bool get hasImage =>
      RegExp(r'\.(jpe?g|png|gif|webp|avif)(\?.*)?$', caseSensitive: false).hasMatch(mediaUrl) ||
      mediaUrl.contains('/image/upload/');

  bool get hasPlayableMedia => mediaUrl.startsWith('http') && !hasImage;

  String get durationLabel {
    final d = duration;
    if (d == null || d <= 0) return '';
    final m = d ~/ 60;
    final s = d % 60;
    return m > 0 ? '$m phút${s > 0 ? ' $s giây' : ''}' : '$s giây';
  }
}
