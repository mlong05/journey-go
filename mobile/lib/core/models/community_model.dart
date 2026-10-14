class CommunityComment {
  final String id;
  final String author;
  final String avatar;
  final String text;
  final String time;

  CommunityComment({
    required this.id,
    required this.author,
    required this.avatar,
    required this.text,
    required this.time,
  });

  factory CommunityComment.fromJson(Map<String, dynamic> json) {
    return CommunityComment(
      id: json['id']?.toString() ?? '',
      author: json['author']?.toString() ?? 'Du khách',
      avatar: json['avatar']?.toString() ?? '',
      text: json['text']?.toString() ?? '',
      time: json['time']?.toString() ?? 'Vừa xong',
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'author': author,
    'avatar': avatar,
    'text': text,
    'time': time,
  };
}

class CommunityPost {
  final String id;
  final String authorName;
  final String authorAvatar;
  final String authorBadge;
  final String createdAt;
  final String location;
  final double rating;
  final String ratingLabel;
  final String content;
  final String? image;
  final String? imageCaption;
  final String category; // 'all', 'checkin', 'review', 'tips'
  int likesCount;
  bool isLiked;
  int commentsCount;
  int sharesCount;
  List<CommunityComment> comments;

  CommunityPost({
    required this.id,
    required this.authorName,
    required this.authorAvatar,
    required this.authorBadge,
    required this.createdAt,
    required this.location,
    required this.rating,
    required this.ratingLabel,
    required this.content,
    this.image,
    this.imageCaption,
    required this.category,
    required this.likesCount,
    this.isLiked = false,
    required this.commentsCount,
    this.sharesCount = 0,
    List<CommunityComment>? comments,
  }) : comments = comments ?? [];

  factory CommunityPost.fromJson(Map<String, dynamic> json) {
    return CommunityPost(
      id: json['id']?.toString() ?? '',
      authorName: json['authorName']?.toString() ?? (json['author']?['name']?.toString() ?? 'Du khách'),
      authorAvatar: json['authorAvatar']?.toString() ?? (json['author']?['avatar']?.toString() ?? ''),
      authorBadge: json['authorBadge']?.toString() ?? (json['author']?['badge']?.toString() ?? 'Thành viên'),
      createdAt: json['createdAt']?.toString() ?? 'Vừa xong',
      location: json['location']?.toString() ?? 'Di tích lịch sử',
      rating: json['rating'] is num ? (json['rating'] as num).toDouble() : double.tryParse(json['rating']?.toString() ?? '5.0') ?? 5.0,
      ratingLabel: json['ratingLabel']?.toString() ?? 'Tuyệt vời',
      content: json['content']?.toString() ?? '',
      image: json['image']?.toString(),
      imageCaption: json['imageCaption']?.toString(),
      category: json['category']?.toString() ?? 'checkin',
      likesCount: json['likesCount'] is num ? (json['likesCount'] as num).toInt() : int.tryParse(json['likesCount']?.toString() ?? '0') ?? 0,
      isLiked: json['isLiked'] == true,
      commentsCount: json['commentsCount'] is num ? (json['commentsCount'] as num).toInt() : int.tryParse(json['commentsCount']?.toString() ?? '0') ?? 0,
      sharesCount: json['sharesCount'] is num ? (json['sharesCount'] as num).toInt() : int.tryParse(json['sharesCount']?.toString() ?? '0') ?? 0,
      comments: (json['comments'] as List<dynamic>?)
              ?.map((c) => CommunityComment.fromJson(c as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'authorName': authorName,
    'authorAvatar': authorAvatar,
    'authorBadge': authorBadge,
    'createdAt': createdAt,
    'location': location,
    'rating': rating,
    'ratingLabel': ratingLabel,
    'content': content,
    'image': image,
    'imageCaption': imageCaption,
    'category': category,
    'likesCount': likesCount,
    'isLiked': isLiked,
    'commentsCount': commentsCount,
    'sharesCount': sharesCount,
    'comments': comments.map((c) => c.toJson()).toList(),
  };
}
