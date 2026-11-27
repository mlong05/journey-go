import '../models/tour_review_model.dart';
import 'api_client.dart';

/// API đánh giá xác thực (Verified Tour Reviews) cho Mobile.
class TourReviewService {
  static final TourReviewService _instance = TourReviewService._internal();
  factory TourReviewService() => _instance;
  TourReviewService._internal();

  Future<TourReviewPage> getPublicReviews(
    int tourId, {
    int? rating,
    bool hasPhotos = false,
    String sort = 'newest',
    int page = 0,
    int size = 6,
  }) async {
    final query = <String>[
      'sort=$sort',
      'page=$page',
      'size=$size',
      if (rating != null) 'rating=$rating',
      if (hasPhotos) 'hasPhotos=true',
    ].join('&');
    final data = await ApiClient.request('GET', '/tours/$tourId/reviews?$query');
    final items = ApiClient.asList(data).map(TourReviewModel.fromJson).toList();
    final meta = ApiClient.asPageMeta(data);
    final last = meta['last'] == true;
    final total = (meta['totalElements'] is num) ? (meta['totalElements'] as num).toInt() : items.length;
    return TourReviewPage(items: items, hasMore: !last, totalElements: total);
  }

  Future<TourRatingSummaryModel> getTourSummary(int tourId) async {
    final data = await ApiClient.request('GET', '/tours/$tourId/reviews/summary');
    return TourRatingSummaryModel.fromJson(data as Map<String, dynamic>);
  }

  Future<TourReviewEligibilityModel> checkEligibility(int bookingId) async {
    final data = await ApiClient.request('GET', '/tour-reviews/eligibility/$bookingId');
    return TourReviewEligibilityModel.fromJson(data as Map<String, dynamic>);
  }

  Future<TourReviewModel> createReview({
    required int bookingId,
    required int overallRating,
    int? guideRating,
    int? cultureRating,
    int? scheduleRating,
    int? valueRating,
    String? title,
    required String comment,
    List<String> imageUrls = const [],
  }) async {
    final data = await ApiClient.request('POST', '/tour-reviews', body: {
      'bookingId': bookingId,
      'overallRating': overallRating,
      'guideRating': ?guideRating,
      'cultureRating': ?cultureRating,
      'scheduleRating': ?scheduleRating,
      'valueRating': ?valueRating,
      if (title != null && title.trim().isNotEmpty) 'title': title.trim(),
      'comment': comment.trim(),
      'imageUrls': imageUrls,
    });
    return TourReviewModel.fromJson(data as Map<String, dynamic>);
  }

  Future<TourReviewModel> updateReview(
    int reviewId, {
    required int overallRating,
    int? guideRating,
    int? cultureRating,
    int? scheduleRating,
    int? valueRating,
    String? title,
    required String comment,
    List<String> imageUrls = const [],
  }) async {
    final data = await ApiClient.request('PUT', '/tour-reviews/$reviewId', body: {
      'overallRating': overallRating,
      'guideRating': ?guideRating,
      'cultureRating': ?cultureRating,
      'scheduleRating': ?scheduleRating,
      'valueRating': ?valueRating,
      if (title != null && title.trim().isNotEmpty) 'title': title.trim(),
      'comment': comment.trim(),
      'imageUrls': imageUrls,
    });
    return TourReviewModel.fromJson(data as Map<String, dynamic>);
  }

  Future<void> deleteReview(int reviewId) =>
      ApiClient.request('DELETE', '/tour-reviews/$reviewId');

  Future<String> uploadReviewImage(String filePath) =>
      ApiClient.uploadImage(filePath, folder: 'journeygo/reviews');
}
