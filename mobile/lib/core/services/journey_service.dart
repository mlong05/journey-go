import '../models/tour_detail_model.dart' show StopCulture;
import '../models/tour_journey_model.dart';
import 'api_client.dart';

/// Gọi API chuyến đi thực tế: /journeys.
class JourneyService {
  static final JourneyService _instance = JourneyService._internal();
  factory JourneyService() => _instance;
  JourneyService._internal();

  /// POST /journeys. Nếu đã có hành trình đang đi của tour này, backend trả lại chính nó.
  Future<TourJourney> start({required int tourId, int? bookingId}) async {
    final data = await ApiClient.request('POST', '/journeys', body: {
      'tourId': tourId,
      'bookingId': ?bookingId,
    });
    return _journey(data);
  }

  /// GET /journeys/my
  Future<List<TourJourney>> getMine() async {
    final data = await ApiClient.request('GET', '/journeys/my');
    return ApiClient.asList(data).map(TourJourney.fromJson).toList();
  }

  /// GET /journeys/{id}
  Future<TourJourney> getById(int id) async {
    final data = await ApiClient.request('GET', '/journeys/$id');
    return _journey(data);
  }

  /// POST /journeys/{id}/destinations/{destId}/check-in (GPS)
  Future<CheckInResult> checkInGps({
    required int journeyId,
    required int destinationId,
    required double latitude,
    required double longitude,
  }) async {
    final data = await ApiClient.request(
      'POST',
      '/journeys/$journeyId/destinations/$destinationId/check-in',
      body: {'verificationMethod': 'GPS', 'latitude': latitude, 'longitude': longitude},
    );
    if (data is! Map<String, dynamic>) {
      throw const ApiException('Máy chủ trả về kết quả check-in không hợp lệ.');
    }
    return CheckInResult.fromJson(data);
  }

  /// POST /journeys/{id}/destinations/{destId}/check-in (QR)
  Future<CheckInResult> checkInQr({
    required int journeyId,
    required int destinationId,
    required String qrValue,
  }) async {
    final data = await ApiClient.request(
      'POST',
      '/journeys/$journeyId/destinations/$destinationId/check-in',
      body: {'verificationMethod': 'QR', 'qrValue': qrValue},
    );
    if (data is! Map<String, dynamic>) {
      throw const ApiException('Máy chủ trả về kết quả check-in không hợp lệ.');
    }
    return CheckInResult.fromJson(data);
  }

  /// PATCH /journeys/{id}/destinations/{destId}/skip
  Future<void> skipDestination({required int journeyId, required int destinationId}) async {
    await ApiClient.request('PATCH', '/journeys/$journeyId/destinations/$destinationId/skip');
  }

  /// GET /journeys/{id}/destinations/{stopId}/culture: nội dung văn hoá, backend chỉ trả khi đã check-in.
  Future<StopCulture> getCulture({required int journeyId, required int destinationId}) async {
    final data = await ApiClient.request('GET', '/journeys/$journeyId/destinations/$destinationId/culture');
    if (data is! Map<String, dynamic>) {
      throw const ApiException('Máy chủ trả về nội dung văn hóa không hợp lệ.');
    }
    return StopCulture.fromJson(data);
  }

  /// GET /journeys/{id}/tasks/{taskId}/questions. Gửi tọa độ để mở khóa nhiệm vụ cần vị trí.
  Future<TaskContent> getTask({
    required int journeyId,
    required int taskId,
    double? latitude,
    double? longitude,
    String? qrValue,
  }) async {
    // Backend ưu tiên qrValue nếu có; không thì dùng tọa độ.
    final query = (qrValue != null && qrValue.isNotEmpty)
        ? '?qrValue=${Uri.encodeQueryComponent(qrValue)}'
        : (latitude != null && longitude != null)
            ? '?latitude=$latitude&longitude=$longitude'
            : '';
    final data = await ApiClient.request('GET', '/journeys/$journeyId/tasks/$taskId/questions$query');
    if (data is! Map<String, dynamic>) {
      throw const ApiException('Máy chủ trả về nội dung nhiệm vụ không hợp lệ.');
    }
    return TaskContent.fromJson(data);
  }

  /// GET /journeys/{id}/tasks/{taskId}/puzzle-clue
  Future<PuzzleClue> getClue({required int journeyId, required int taskId}) async {
    final data = await ApiClient.request('GET', '/journeys/$journeyId/tasks/$taskId/puzzle-clue');
    if (data is! Map<String, dynamic>) {
      throw const ApiException('Không lấy được manh mối.');
    }
    return PuzzleClue.fromJson(data);
  }

  /// POST /journeys/{id}/tasks/{taskId}/submit
  Future<TaskSubmitResult> submitTask({
    required int journeyId,
    required int taskId,
    required List<AnswerDraft> answers,
    double? latitude,
    double? longitude,
    String? qrValue,
  }) async {
    final data = await ApiClient.request('POST', '/journeys/$journeyId/tasks/$taskId/submit', body: {
      'answers': answers.map((a) => a.toJson()).toList(),
      'latitude': ?latitude,
      'longitude': ?longitude,
      'qrValue': ?qrValue,
    });
    if (data is! Map<String, dynamic>) {
      throw const ApiException('Máy chủ trả về kết quả nộp bài không hợp lệ.');
    }
    return TaskSubmitResult.fromJson(data);
  }

  TourJourney _journey(dynamic data) {
    if (data is! Map<String, dynamic>) {
      throw const ApiException('Máy chủ trả về dữ liệu hành trình không hợp lệ.');
    }
    return TourJourney.fromJson(data);
  }
}
