import '../models/forum_model.dart';
import 'api_client.dart';

/// Gọi API cộng đồng (/api/v1/community) cho Diễn đàn.
class ForumService {
  static final ForumService _instance = ForumService._internal();
  factory ForumService() => _instance;
  ForumService._internal();

  static const String _base = '/community';

  ForumPage<ForumPost> _postPage(dynamic data) {
    final posts = ApiClient.asList(data).map(ForumPost.fromJson).toList();
    final last = data is Map ? data['last'] == true : true;
    return ForumPage(posts, !last);
  }

  /// GET /community/posts: bảng tin (chỉ bài đã duyệt), lọc theo điểm đến hoặc tour.
  Future<ForumPage<ForumPost>> getFeed({
    int page = 0,
    int size = 10,
    int? destinationId,
    int? tourId,
  }) async {
    final query = <String>[
      'page=$page',
      'size=$size',
      if (destinationId != null) 'destinationId=$destinationId',
      if (tourId != null) 'tourId=$tourId',
    ].join('&');
    return _postPage(await ApiClient.request('GET', '$_base/posts?$query'));
  }

  /// GET /community/posts/my: mọi bài của tôi, kể cả nháp và chờ duyệt.
  Future<ForumPage<ForumPost>> getMyPosts({int page = 0, int size = 20}) async {
    return _postPage(await ApiClient.request('GET', '$_base/posts/my?page=$page&size=$size'));
  }

  /// GET /community/posts/{id}
  Future<ForumPost> getPost(int id) async {
    final data = await ApiClient.request('GET', '$_base/posts/$id');
    return ForumPost.fromJson(data as Map<String, dynamic>);
  }

  /// POST /community/posts: `saveAsDraft` true thì lưu nháp, false thì gửi duyệt ngay.
  Future<ForumPost> createPost({
    required String title,
    required String content,
    int? destinationId,
    int? tourId,
    List<String> mediaUrls = const [],
    bool saveAsDraft = false,
  }) async {
    final data = await ApiClient.request('POST', '$_base/posts', body: {
      'title': title,
      'content': content,
      'destinationId': destinationId,
      'tourId': tourId,
      'mediaUrls': mediaUrls,
      'saveAsDraft': saveAsDraft,
    });
    return ForumPost.fromJson(data as Map<String, dynamic>);
  }

  /// PUT /community/posts/{id}: bài đã đăng mà sửa sẽ quay lại chờ duyệt.
  Future<ForumPost> updatePost(
    int id, {
    required String title,
    required String content,
    List<String> mediaUrls = const [],
  }) async {
    final data = await ApiClient.request('PUT', '$_base/posts/$id', body: {
      'title': title,
      'content': content,
      'mediaUrls': mediaUrls,
    });
    return ForumPost.fromJson(data as Map<String, dynamic>);
  }

  /// POST /community/posts/{id}/submit: gửi duyệt bài nháp, bị từ chối hoặc cần chỉnh sửa.
  Future<ForumPost> submitPost(int id) async {
    final data = await ApiClient.request('POST', '$_base/posts/$id/submit');
    return ForumPost.fromJson(data as Map<String, dynamic>);
  }

  /// DELETE /community/posts/{id}
  Future<void> deletePost(int id) => ApiClient.request('DELETE', '$_base/posts/$id');

  /// POST /community/posts/{id}/react: thả tim hoặc bỏ tim, trả về tổng số tim mới của bài.
  Future<int> toggleHeart(int postId) async {
    final data = await ApiClient.request(
      'POST',
      '$_base/posts/$postId/react',
      body: {'reactionType': kHeartReaction},
    );
    return data is num ? data.toInt() : int.tryParse('$data') ?? 0;
  }

  /// GET /community/posts/{id}/comments
  Future<ForumPage<ForumComment>> getComments(int postId, {int page = 0, int size = 20}) async {
    final data = await ApiClient.request(
      'GET',
      '$_base/posts/$postId/comments?page=$page&size=$size',
    );
    final comments = ApiClient.asList(data).map(ForumComment.fromJson).toList();
    final last = data is Map ? data['last'] == true : true;
    return ForumPage(comments, !last);
  }

  /// POST /community/posts/{id}/comments
  Future<ForumComment> addComment(int postId, String content) async {
    final data = await ApiClient.request(
      'POST',
      '$_base/posts/$postId/comments',
      body: {'content': content},
    );
    return ForumComment.fromJson(data as Map<String, dynamic>);
  }

  /// DELETE /community/comments/{id}
  Future<void> deleteComment(int commentId) =>
      ApiClient.request('DELETE', '$_base/comments/$commentId');

  /// POST /community/posts/{id}/report
  Future<void> reportPost(int postId, String reason, {String? description}) async {
    await ApiClient.request('POST', '$_base/posts/$postId/report', body: {
      'reason': reason,
      if (description != null && description.trim().isNotEmpty) 'description': description.trim(),
    });
  }
}
