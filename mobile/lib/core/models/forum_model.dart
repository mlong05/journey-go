import 'package:flutter/material.dart';
import 'gamification_model.dart' show formatDate;

DateTime? _parseDate(dynamic value) {
  if (value == null) return null;
  return DateTime.tryParse(value.toString())?.toLocal();
}

int _asInt(dynamic value) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  return int.tryParse(value?.toString() ?? '') ?? 0;
}

int? _asNullableInt(dynamic value) => value == null ? null : _asInt(value);

/// Thời gian dạng "5 phút trước", quá 7 ngày thì hiện ngày tháng.
String timeAgo(DateTime? time) {
  if (time == null) return '';
  final diff = DateTime.now().difference(time);
  if (diff.inMinutes < 1) return 'Vừa xong';
  if (diff.inMinutes < 60) return '${diff.inMinutes} phút trước';
  if (diff.inHours < 24) return '${diff.inHours} giờ trước';
  if (diff.inDays < 7) return '${diff.inDays} ngày trước';
  return formatDate(time);
}

/// Loại tương tác duy nhất của bài viết là thả tim; backend lưu dưới mã LOVE.
const String kHeartReaction = 'LOVE';

/// Lý do báo cáo bài viết (ReportReason).
class ForumReportReason {
  final String code;
  final String label;

  const ForumReportReason(this.code, this.label);

  static const all = <ForumReportReason>[
    ForumReportReason('SPAM', 'Spam hoặc quảng cáo'),
    ForumReportReason('INAPPROPRIATE_CONTENT', 'Nội dung không phù hợp'),
    ForumReportReason('HATE_SPEECH', 'Ngôn từ thù ghét'),
    ForumReportReason('FALSE_INFORMATION', 'Thông tin sai sự thật'),
    ForumReportReason('COPYRIGHT_VIOLATION', 'Vi phạm bản quyền'),
    ForumReportReason('OTHER', 'Lý do khác'),
  ];
}

/// Trạng thái kiểm duyệt của bài viết, kèm nhãn và màu hiển thị.
class ForumStatus {
  final String label;
  final Color color;

  const ForumStatus(this.label, this.color);

  static ForumStatus of(String status, {bool hidden = false}) {
    if (hidden) return const ForumStatus('Đang được xem xét', Color(0xFF64748B));
    switch (status) {
      case 'DRAFT':
        return const ForumStatus('Bản nháp', Color(0xFF64748B));
      case 'PENDING_REVIEW':
        return const ForumStatus('Chờ duyệt', Color(0xFFF59E0B));
      case 'PUBLISHED':
        return const ForumStatus('Đã đăng', Color(0xFF10B981));
      case 'NEEDS_REVISION':
        return const ForumStatus('Cần chỉnh sửa', Color(0xFF0288D1));
      case 'REJECTED':
        return const ForumStatus('Bị từ chối', Color(0xFFEF4444));
      default:
        return ForumStatus(status, const Color(0xFF64748B));
    }
  }
}

class ForumPost {
  final int id;
  final int authorId;
  final String authorName;
  final String? authorAvatarUrl;
  final String title;
  final String content;
  final int? tourId;
  final int? destinationId;
  final String? destinationName;
  final String? tourTitle;
  final String status;
  final String? moderationNote;
  final int likesCount;
  final int commentsCount;
  final bool hidden;
  final String? myReaction;
  final List<String> imageUrls;
  final DateTime? createdAt;

  const ForumPost({
    required this.id,
    required this.authorId,
    required this.authorName,
    this.authorAvatarUrl,
    required this.title,
    required this.content,
    this.tourId,
    this.destinationId,
    this.destinationName,
    this.tourTitle,
    required this.status,
    this.moderationNote,
    required this.likesCount,
    required this.commentsCount,
    required this.hidden,
    this.myReaction,
    required this.imageUrls,
    this.createdAt,
  });

  factory ForumPost.fromJson(Map<String, dynamic> json) {
    final media = json['mediaList'];
    final images = <String>[];
    if (media is List) {
      for (final m in media) {
        if (m is Map && m['mediaType']?.toString() != 'VIDEO') {
          final url = m['mediaUrl']?.toString();
          if (url != null && url.isNotEmpty) images.add(url);
        }
      }
    }
    return ForumPost(
      id: _asInt(json['id']),
      authorId: _asInt(json['authorId']),
      authorName: json['authorName']?.toString() ?? 'Du khách',
      authorAvatarUrl: json['authorAvatarUrl']?.toString(),
      title: json['title']?.toString() ?? '',
      content: json['content']?.toString() ?? '',
      tourId: _asNullableInt(json['tourId']),
      destinationId: _asNullableInt(json['destinationId']),
      destinationName: json['destinationName']?.toString(),
      tourTitle: json['tourTitle']?.toString(),
      status: json['status']?.toString() ?? 'PENDING_REVIEW',
      moderationNote: json['moderationNote']?.toString(),
      likesCount: _asInt(json['likesCount']),
      commentsCount: _asInt(json['commentsCount']),
      hidden: json['hidden'] == true,
      myReaction: json['myReaction']?.toString(),
      imageUrls: images,
      createdAt: _parseDate(json['createdAt']),
    );
  }

  /// Bản sao với số liệu tương tác mới (dùng khi cập nhật ngay trên màn hình).
  ForumPost copyWith({
    int? likesCount,
    int? commentsCount,
    String? myReaction,
    bool clearReaction = false,
  }) {
    return ForumPost(
      id: id,
      authorId: authorId,
      authorName: authorName,
      authorAvatarUrl: authorAvatarUrl,
      title: title,
      content: content,
      tourId: tourId,
      destinationId: destinationId,
      destinationName: destinationName,
      tourTitle: tourTitle,
      status: status,
      moderationNote: moderationNote,
      likesCount: likesCount ?? this.likesCount,
      commentsCount: commentsCount ?? this.commentsCount,
      hidden: hidden,
      myReaction: clearReaction ? null : (myReaction ?? this.myReaction),
      imageUrls: imageUrls,
      createdAt: createdAt,
    );
  }

  /// "Văn Miếu • Hành trình di sản Hà Nội" dùng làm dòng địa điểm của bài.
  String? get placeLine {
    final parts = <String>[
      if (destinationName != null && destinationName!.isNotEmpty) destinationName!,
      if (tourTitle != null && tourTitle!.isNotEmpty) tourTitle!,
    ];
    return parts.isEmpty ? null : parts.join(' • ');
  }

  bool get isPublished => status == 'PUBLISHED' && !hidden;

  /// Người xem đã thả tim bài này.
  bool get isLiked => myReaction != null;
}

class ForumComment {
  final int id;
  final int authorId;
  final String authorName;
  final String? authorAvatarUrl;
  final String content;
  final DateTime? createdAt;

  const ForumComment({
    required this.id,
    required this.authorId,
    required this.authorName,
    this.authorAvatarUrl,
    required this.content,
    this.createdAt,
  });

  factory ForumComment.fromJson(Map<String, dynamic> json) => ForumComment(
        id: _asInt(json['id']),
        authorId: _asInt(json['authorId']),
        authorName: json['authorName']?.toString() ?? 'Du khách',
        authorAvatarUrl: json['authorAvatarUrl']?.toString(),
        content: json['content']?.toString() ?? '',
        createdAt: _parseDate(json['createdAt']),
      );
}

/// Một trang kết quả, `hasMore` cho biết còn trang kế tiếp.
class ForumPage<T> {
  final List<T> items;
  final bool hasMore;

  const ForumPage(this.items, this.hasMore);
}
