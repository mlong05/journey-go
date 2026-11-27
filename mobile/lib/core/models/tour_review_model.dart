int _int(dynamic v, [int fallback = 0]) {
  if (v is int) return v;
  if (v is num) return v.toInt();
  return int.tryParse(v?.toString() ?? '') ?? fallback;
}

int? _intOrNull(dynamic v) {
  if (v == null) return null;
  if (v is num) return v.toInt();
  return int.tryParse(v.toString());
}

double? _doubleOrNull(dynamic v) {
  if (v == null) return null;
  if (v is num) return v.toDouble();
  return double.tryParse(v.toString());
}

String? _textOrNull(dynamic v) {
  final s = v?.toString().trim() ?? '';
  return s.isEmpty ? null : s;
}

DateTime? _dateOrNull(dynamic v) {
  final s = v?.toString().trim() ?? '';
  if (s.isEmpty) return null;
  return DateTime.tryParse(s)?.toLocal();
}

class TourReviewModel {
  final int id;
  final int bookingId;
  final String bookingCode;
  final int tourId;
  final String tourTitle;
  final String? tourCoverImageUrl;
  final int reviewerId;
  final String reviewerName;
  final String? reviewerAvatarUrl;
  final int overallRating;
  final int? guideRating;
  final int? cultureRating;
  final int? scheduleRating;
  final int? valueRating;
  final String? title;
  final String comment;
  final List<String> imageUrls;
  final bool verifiedPurchase;
  final DateTime? experienceDate;
  final String? providerReply;
  final String? providerRepliedByName;
  final DateTime? providerRepliedAt;
  final bool hidden;
  final String? hiddenReason;
  final bool canEdit;
  final DateTime? editedAt;
  final DateTime? createdAt;

  const TourReviewModel({
    required this.id,
    required this.bookingId,
    required this.bookingCode,
    required this.tourId,
    required this.tourTitle,
    this.tourCoverImageUrl,
    required this.reviewerId,
    required this.reviewerName,
    this.reviewerAvatarUrl,
    required this.overallRating,
    this.guideRating,
    this.cultureRating,
    this.scheduleRating,
    this.valueRating,
    this.title,
    required this.comment,
    this.imageUrls = const [],
    this.verifiedPurchase = true,
    this.experienceDate,
    this.providerReply,
    this.providerRepliedByName,
    this.providerRepliedAt,
    this.hidden = false,
    this.hiddenReason,
    this.canEdit = false,
    this.editedAt,
    this.createdAt,
  });

  factory TourReviewModel.fromJson(Map<String, dynamic> j) {
    final rawImgs = j['imageUrls'];
    final imgs = rawImgs is List
        ? rawImgs.map((e) => e.toString().trim()).where((s) => s.startsWith('http')).toList()
        : const <String>[];
    return TourReviewModel(
      id: _int(j['id']),
      bookingId: _int(j['bookingId']),
      bookingCode: j['bookingCode']?.toString() ?? '',
      tourId: _int(j['tourId']),
      tourTitle: j['tourTitle']?.toString() ?? '',
      tourCoverImageUrl: _textOrNull(j['tourCoverImageUrl']),
      reviewerId: _int(j['reviewerId']),
      reviewerName: _textOrNull(j['reviewerName']) ?? 'Du khách',
      reviewerAvatarUrl: _textOrNull(j['reviewerAvatarUrl']),
      overallRating: _int(j['overallRating'], 5),
      guideRating: _intOrNull(j['guideRating']),
      cultureRating: _intOrNull(j['cultureRating']),
      scheduleRating: _intOrNull(j['scheduleRating']),
      valueRating: _intOrNull(j['valueRating']),
      title: _textOrNull(j['title']),
      comment: j['comment']?.toString() ?? '',
      imageUrls: imgs,
      verifiedPurchase: j['verifiedPurchase'] != false,
      experienceDate: _dateOrNull(j['experienceDate']),
      providerReply: _textOrNull(j['providerReply']),
      providerRepliedByName: _textOrNull(j['providerRepliedByName']),
      providerRepliedAt: _dateOrNull(j['providerRepliedAt']),
      hidden: j['hidden'] == true,
      hiddenReason: _textOrNull(j['hiddenReason']),
      canEdit: j['canEdit'] == true,
      editedAt: _dateOrNull(j['editedAt']),
      createdAt: _dateOrNull(j['createdAt']),
    );
  }
}

class TourRatingSummaryModel {
  final int tourId;
  final int totalReviews;
  final double averageRating;
  final double? avgGuideRating;
  final double? avgCultureRating;
  final double? avgScheduleRating;
  final double? avgValueRating;
  final Map<int, int> starDistribution;
  final int photoReviewCount;
  final int repliedCount;
  final double replyRate;

  const TourRatingSummaryModel({
    required this.tourId,
    required this.totalReviews,
    required this.averageRating,
    this.avgGuideRating,
    this.avgCultureRating,
    this.avgScheduleRating,
    this.avgValueRating,
    required this.starDistribution,
    this.photoReviewCount = 0,
    this.repliedCount = 0,
    this.replyRate = 0,
  });

  factory TourRatingSummaryModel.fromJson(Map<String, dynamic> j) {
    final dist = <int, int>{5: 0, 4: 0, 3: 0, 2: 0, 1: 0};
    final rawDist = j['starDistribution'];
    if (rawDist is Map) {
      rawDist.forEach((k, v) {
        final star = int.tryParse(k.toString());
        if (star != null && dist.containsKey(star)) {
          dist[star] = _int(v);
        }
      });
    }
    return TourRatingSummaryModel(
      tourId: _int(j['tourId']),
      totalReviews: _int(j['totalReviews']),
      averageRating: _doubleOrNull(j['averageRating']) ?? 0,
      avgGuideRating: _doubleOrNull(j['avgGuideRating']),
      avgCultureRating: _doubleOrNull(j['avgCultureRating']),
      avgScheduleRating: _doubleOrNull(j['avgScheduleRating']),
      avgValueRating: _doubleOrNull(j['avgValueRating']),
      starDistribution: dist,
      photoReviewCount: _int(j['photoReviewCount']),
      repliedCount: _int(j['repliedCount']),
      replyRate: _doubleOrNull(j['replyRate']) ?? 0,
    );
  }
}

class TourReviewEligibilityModel {
  final int bookingId;
  final int tourId;
  final bool eligible;
  final String? reasonCode;
  final String? reasonMessage;
  final TourReviewModel? existingReview;

  const TourReviewEligibilityModel({
    required this.bookingId,
    required this.tourId,
    required this.eligible,
    this.reasonCode,
    this.reasonMessage,
    this.existingReview,
  });

  factory TourReviewEligibilityModel.fromJson(Map<String, dynamic> j) {
    final existing = j['existingReview'];
    return TourReviewEligibilityModel(
      bookingId: _int(j['bookingId']),
      tourId: _int(j['tourId']),
      eligible: j['eligible'] == true,
      reasonCode: _textOrNull(j['reasonCode']),
      reasonMessage: _textOrNull(j['reasonMessage']),
      existingReview: existing is Map<String, dynamic> ? TourReviewModel.fromJson(existing) : null,
    );
  }
}

class TourReviewPage {
  final List<TourReviewModel> items;
  final bool hasMore;
  final int totalElements;

  const TourReviewPage({
    required this.items,
    required this.hasMore,
    required this.totalElements,
  });
}
