import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/models/tour_model.dart';
import 'package:mobile/core/models/tour_review_model.dart';

void main() {
  test('TourModel parses averageRating and reviewCount', () {
    final tour = TourModel.fromJson({
      'tourId': 12,
      'title': 'Tour Di Sản Huế',
      'tourType': 'CULTURAL',
      'price': 550000,
      'durationDays': 1,
      'averageRating': 4.8,
      'reviewCount': 24,
    });

    expect(tour.averageRating, 4.8);
    expect(tour.reviewCount, 24);
  });

  test('TourRatingSummaryModel parses star distribution and criteria averages', () {
    final sum = TourRatingSummaryModel.fromJson({
      'tourId': 12,
      'totalReviews': 10,
      'averageRating': 4.6,
      'avgGuideRating': 4.9,
      'avgCultureRating': 4.7,
      'avgScheduleRating': 4.5,
      'avgValueRating': 4.4,
      'starDistribution': {'5': 7, '4': 2, '3': 1, '2': 0, '1': 0},
      'photoReviewCount': 4,
      'repliedCount': 8,
      'replyRate': 80.0,
    });

    expect(sum.totalReviews, 10);
    expect(sum.averageRating, 4.6);
    expect(sum.starDistribution[5], 7);
    expect(sum.starDistribution[1], 0);
    expect(sum.replyRate, 80.0);
  });

  test('TourReviewEligibilityModel parses eligible state and existingReview', () {
    final el = TourReviewEligibilityModel.fromJson({
      'bookingId': 99,
      'tourId': 12,
      'eligible': false,
      'reasonCode': 'TOUR_CUSTOMER_REVIEW_ALREADY_EXISTS',
      'existingReview': {
        'id': 501,
        'bookingId': 99,
        'bookingCode': 'BK-99',
        'tourId': 12,
        'tourTitle': 'Tour Di Sản Huế',
        'reviewerId': 7,
        'reviewerName': 'Minh Anh',
        'overallRating': 5,
        'comment': 'Rất tuyệt vời và đúng lịch trình!',
        'imageUrls': ['https://res.cloudinary.com/demo/image/upload/v1/a.jpg'],
        'verifiedPurchase': true,
        'experienceDate': '2026-11-20',
        'canEdit': true,
      },
    });

    expect(el.eligible, isFalse);
    expect(el.existingReview, isNotNull);
    expect(el.existingReview!.overallRating, 5);
    expect(el.existingReview!.imageUrls.length, 1);
    expect(el.existingReview!.canEdit, isTrue);
  });
}
