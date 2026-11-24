import '../../l10n/locale_controller.dart';
// Model của chuyến đi thực tế (API /journeys): điểm đến, nhiệm vụ, câu hỏi và kết quả.
// Khác với `journey_model.dart` (nhật ký cục bộ), các model ở đây phản ánh đúng dữ liệu backend.

int _int(dynamic v, [int fallback = 0]) {
  if (v is num) return v.toInt();
  return int.tryParse(v?.toString() ?? '') ?? fallback;
}

int? _intOrNull(dynamic v) => v == null ? null : _int(v);

double? _doubleOrNull(dynamic v) {
  if (v is num) return v.toDouble();
  return double.tryParse(v?.toString() ?? '');
}

String _str(dynamic v, [String fallback = '']) => v?.toString() ?? fallback;

List<Map<String, dynamic>> _maps(dynamic v) =>
    v is List ? v.whereType<Map<String, dynamic>>().toList() : const [];

class ProgressStatus {
  static const notStarted = 'NOT_STARTED';
  static const inProgress = 'IN_PROGRESS';
  static const completed = 'COMPLETED';
  static const failed = 'FAILED';
  static const skipped = 'SKIPPED';
  static const noShow = 'NO_SHOW';
}

class JourneyTask {
  final int taskId;
  final String name;
  final String type;
  final int orderIndex;
  final String status;
  final int pointsEarned;
  final int attempts;

  /// Số lượt còn lại (null: backend cũ chưa trả).
  final int? attemptsRemaining;

  /// Đúng hết hay chưa (null: nhiệm vụ không chấm đúng/sai hoặc chưa làm).
  final bool? isCorrect;

  /// Câu đố trả lời từng câu: số câu đã trả lời / tổng số câu (totalQuestions null với loại nhiệm vụ khác).
  final int questionIndex;
  final int? totalQuestions;

  const JourneyTask({
    required this.taskId,
    required this.name,
    required this.type,
    required this.orderIndex,
    required this.status,
    required this.pointsEarned,
    required this.attempts,
    this.attemptsRemaining,
    this.isCorrect,
    this.questionIndex = 0,
    this.totalQuestions,
  });

  factory JourneyTask.fromJson(Map<String, dynamic> j) => JourneyTask(
        taskId: _int(j['taskId']),
        name: _str(j['taskName'], appL10n.tjTask),
        type: _str(j['taskType']),
        orderIndex: _int(j['orderIndex']),
        status: _str(j['status'], ProgressStatus.notStarted),
        pointsEarned: _int(j['pointsEarned']),
        attempts: _int(j['attempts']),
        attemptsRemaining: _intOrNull(j['attemptsRemaining']),
        isCorrect: j['isCorrect'] is bool ? j['isCorrect'] as bool : null,
        questionIndex: _int(j['questionIndex']),
        totalQuestions: _intOrNull(j['totalQuestions']),
      );

  bool get isCompleted => status == ProgressStatus.completed;
  bool get isFailed => status == ProgressStatus.failed;
  bool get isOpen => !isCompleted && !isFailed && status != ProgressStatus.skipped;

  /// Câu đố trả lời từng câu đang làm dở ⇒ danh sách nhiệm vụ hiện "2/3 câu".
  bool get isQuizInProgress {
    final total = totalQuestions;
    return total != null && isOpen && questionIndex > 0 && questionIndex < total;
  }

  /// Hoàn thành và trả lời đúng hết (câu đố chấm theo câu vẫn "hoàn thành" khi sai).
  bool get isPassed => isCompleted && isCorrect != false;
}

class JourneyDestination {
  final int destinationId;
  final String name;
  final int orderIndex;
  final int? experienceId;
  final String status;
  final bool checkedIn;
  final DateTime? checkedInAt;
  final bool badgeAwarded;
  final int tasksCompleted;
  final int totalTasks;
  final List<JourneyTask> tasks;

  const JourneyDestination({
    required this.destinationId,
    required this.name,
    required this.orderIndex,
    required this.experienceId,
    required this.status,
    required this.checkedIn,
    required this.checkedInAt,
    required this.badgeAwarded,
    required this.tasksCompleted,
    required this.totalTasks,
    required this.tasks,
  });

  factory JourneyDestination.fromJson(Map<String, dynamic> j) {
    final tasks = _maps(j['tasks']).map(JourneyTask.fromJson).toList()
      ..sort((a, b) => a.orderIndex.compareTo(b.orderIndex));
    return JourneyDestination(
      destinationId: _int(j['destinationId']),
      name: _str(j['destinationName'], appL10n.tjDestination),
      orderIndex: _int(j['orderIndex']),
      experienceId: _intOrNull(j['experienceId']),
      status: _str(j['status'], ProgressStatus.notStarted),
      checkedIn: j['checkedIn'] == true,
      checkedInAt: DateTime.tryParse(_str(j['checkedInAt']))?.toLocal(),
      badgeAwarded: j['badgeAwarded'] == true,
      tasksCompleted: _int(j['tasksCompleted']),
      totalTasks: _int(j['totalTasks'], tasks.length),
      tasks: tasks,
    );
  }

  bool get isDone => status == ProgressStatus.completed || status == ProgressStatus.skipped;
  bool get isCurrent => status == ProgressStatus.inProgress;
  bool get isLocked => status == ProgressStatus.notStarted;
}

class TourJourney {
  final int id;
  final int tourId;
  final int? bookingId;
  final String tourName;
  final String status;
  final int currentOrder;
  final int totalDestinations;
  final List<JourneyDestination> destinations;

  /// Thời điểm đi xong toàn bộ hành trình; null khi chưa xong.
  final DateTime? completedAt;
  final DateTime? startedAt;

  /// Điểm thưởng hoàn thành backend đã cộng (0 khi chưa xong hoặc có điểm đến bị bỏ qua).
  final int completionBonusPoints;

  /// Mức hoàn thành khi đã xong (null khi chưa xong).
  final CompletionRank? completionRank;

  const TourJourney({
    required this.id,
    required this.tourId,
    required this.bookingId,
    required this.tourName,
    required this.status,
    required this.currentOrder,
    required this.totalDestinations,
    required this.destinations,
    this.completedAt,
    this.startedAt,
    this.completionBonusPoints = 0,
    this.completionRank,
  });

  factory TourJourney.fromJson(Map<String, dynamic> j) {
    final dests = _maps(j['destinations']).map(JourneyDestination.fromJson).toList()
      ..sort((a, b) => a.orderIndex.compareTo(b.orderIndex));
    return TourJourney(
      id: _int(j['id']),
      tourId: _int(j['tourId']),
      bookingId: _intOrNull(j['bookingId']),
      tourName: _str(j['tourName'], appL10n.tjJourney),
      status: _str(j['status']),
      currentOrder: _int(j['currentDestinationOrder'], 1),
      totalDestinations: _int(j['totalDestinations'], dests.length),
      destinations: dests,
      completedAt: DateTime.tryParse(_str(j['completedAt']))?.toLocal(),
      startedAt: DateTime.tryParse(_str(j['startedAt']))?.toLocal(),
      completionBonusPoints: _int(j['completionBonusPoints']),
      completionRank: CompletionRank.parse(j['completionRank']),
    );
  }

  bool get isCompleted => status == ProgressStatus.completed;
  int get doneCount => destinations.where((d) => d.isDone).length;
  int get skippedCount => destinations.where((d) => d.status == ProgressStatus.skipped).length;
  double get progress => totalDestinations == 0 ? 0 : doneCount / totalDestinations;

  /// Điểm từ nhiệm vụ (chưa gồm thưởng hoàn thành).
  int get pointsEarned =>
      destinations.fold(0, (s, d) => s + d.tasks.fold(0, (t, task) => t + task.pointsEarned));

  /// Tổng điểm của cả chuyến: điểm nhiệm vụ + thưởng hoàn thành.
  int get totalPoints => pointsEarned + completionBonusPoints;

  List<JourneyTask> get allTasks => [for (final d in destinations) ...d.tasks];
  int get passedTaskCount => allTasks.where((t) => t.isPassed).length;

  /// Thời gian từ lúc bắt đầu tới lúc đi xong (null khi thiếu mốc thời gian).
  Duration? get duration {
    final start = startedAt, end = completedAt;
    if (start == null || end == null || end.isBefore(start)) return null;
    return end.difference(start);
  }
}

/// Mức hoàn thành hành trình (backend: Journey.completionRank()).
enum CompletionRank {
  /// Đủ mọi điểm đến, mọi nhiệm vụ đều đúng hết.
  perfect,

  /// Đủ mọi điểm đến nhưng có nhiệm vụ trả lời sai hoặc hết lượt.
  completed,

  /// Có điểm đến bị bỏ qua.
  partial;

  static CompletionRank? parse(dynamic v) => switch (v?.toString().toUpperCase()) {
        'PERFECT' => CompletionRank.perfect,
        'COMPLETED' => CompletionRank.completed,
        'PARTIAL' => CompletionRank.partial,
        _ => null,
      };
}

/// Kết quả check-in điểm đến, kèm huy hiệu di sản nếu được cấp.
class CheckInResult {
  final bool success;
  final String message;
  final int? distanceMeters;
  final bool badgeAwarded;
  final String? badgeName;
  final String? badgeIconUrl;

  /// Điểm đến đã check-in từ trước: không check-in lại, chỉ báo cho du khách.
  final bool alreadyCheckedIn;

  const CheckInResult({
    required this.success,
    required this.message,
    required this.distanceMeters,
    required this.badgeAwarded,
    required this.badgeName,
    required this.badgeIconUrl,
    this.alreadyCheckedIn = false,
  });

  factory CheckInResult.fromJson(Map<String, dynamic> j) => CheckInResult(
        success: j['success'] == true,
        message: _str(j['message']),
        distanceMeters: _intOrNull(j['distanceMeters']),
        badgeAwarded: j['badgeAwarded'] == true,
        badgeName: j['badgeName']?.toString(),
        badgeIconUrl: j['badgeIconUrl']?.toString(),
        alreadyCheckedIn: j['alreadyCheckedIn'] == true,
      );
}

class QuestionOption {
  final int id;
  final String content;

  /// Câu chọn ảnh: ảnh của đáp án.
  final String? imageUrl;

  const QuestionOption({required this.id, required this.content, this.imageUrl});

  factory QuestionOption.fromJson(Map<String, dynamic> j) => QuestionOption(
        id: _int(j['id']),
        content: _str(j['content']),
        imageUrl: (j['imageUrl']?.toString().trim().isEmpty ?? true) ? null : j['imageUrl'].toString(),
      );
}

class MatchOption {
  final int key;
  final String content;

  const MatchOption({required this.key, required this.content});

  factory MatchOption.fromJson(Map<String, dynamic> j) => MatchOption(
        key: _int(j['key']),
        content: _str(j['content']),
      );
}

class MatchPair {
  final int leftId;
  final int rightKey;

  const MatchPair({required this.leftId, required this.rightKey});

  factory MatchPair.fromJson(Map<String, dynamic> j) => MatchPair(
        leftId: _int(j['leftId']),
        rightKey: _int(j['rightKey']),
      );

  Map<String, dynamic> toJson() => {'leftId': leftId, 'rightKey': rightKey};
}

class TaskQuestion {
  final int id;
  final String content;
  final String type; // MULTIPLE_CHOICE | TEXT | IMAGE_CHOICE | ORDERING | NUMBER | MATCHING
  final List<QuestionOption> options;

  /// Câu đoán số: khoảng thanh trượt.
  final int? numberMin;
  final int? numberMax;

  /// Câu nối cột: các mục cột B đã xáo trộn.
  final List<MatchOption> matchOptions;

  const TaskQuestion({
    required this.id,
    required this.content,
    required this.type,
    required this.options,
    this.numberMin,
    this.numberMax,
    this.matchOptions = const [],
  });

  factory TaskQuestion.fromJson(Map<String, dynamic> j) {
    final opts = _maps(j['options']).toList()
      ..sort((a, b) => _int(a['orderIndex']).compareTo(_int(b['orderIndex'])));
    return TaskQuestion(
      id: _int(j['id']),
      content: _str(j['content']),
      type: _str(j['questionType'], 'MULTIPLE_CHOICE'),
      // Câu xếp thứ tự: giữ nguyên thứ tự server đã xáo trộn (orderIndex = null).
      options: (j['questionType'] == 'ORDERING' ? _maps(j['options']) : opts).map(QuestionOption.fromJson).toList(),
      numberMin: _intOrNull(j['numberMin']),
      numberMax: _intOrNull(j['numberMax']),
      matchOptions: _maps(j['matchOptions']).map(MatchOption.fromJson).toList(),
    );
  }

  bool get isText => type == 'TEXT';
  bool get isImageChoice => type == 'IMAGE_CHOICE';
  bool get isOrdering => type == 'ORDERING';
  bool get isNumber => type == 'NUMBER' && numberMin != null && numberMax != null && numberMax! > numberMin!;
  bool get isMatching => type == 'MATCHING' && options.isNotEmpty && matchOptions.isNotEmpty;

  /// App chưa biết dạng câu này (server mới hơn app) ⇒ nhắc cập nhật thay vì hiện sai.
  bool get isUnsupported =>
      !const {'MULTIPLE_CHOICE', 'TEXT', 'IMAGE_CHOICE', 'ORDERING', 'NUMBER', 'MATCHING'}.contains(type) ||
      (type == 'NUMBER' && !isNumber) ||
      (type == 'MATCHING' && !isMatching);
}

class TaskStation {
  final String name;
  final double? latitude;
  final double? longitude;
  final int? radiusMeters;

  const TaskStation({
    required this.name,
    required this.latitude,
    required this.longitude,
    required this.radiusMeters,
  });

  factory TaskStation.fromJson(Map<String, dynamic> j) => TaskStation(
        name: _str(j['name'], appL10n.jsNextStop),
        latitude: _doubleOrNull(j['latitude']),
        longitude: _doubleOrNull(j['longitude']),
        radiusMeters: _intOrNull(j['radiusMeters']),
      );
}

/// Nội dung một nhiệm vụ cho du khách (không bao giờ có đáp án đúng).
class TaskContent {
  final int taskId;
  final String name;
  final String type;
  final String description;
  final int pointsReward;
  final int maxAttempts;
  final int attempts;
  final int attemptsRemaining;
  final String status;
  final bool requiresLocation;
  final bool sequential;
  final int questionIndex;
  final int totalQuestions;
  final bool unlocked;
  final TaskStation? station;

  /// Mọi trạm theo thứ tự câu hỏi (nhiệm vụ cần vị trí). Trạm chưa tới lượt không có tọa độ.
  final List<TaskStation> stations;
  final int? distanceMeters;
  final List<TaskQuestion> questions;

  /// Hoạt động thực địa (tour 5 bước): đếm ngược bao lâu (giây) trước khi được quét QR; null = không đếm.
  final int? durationSeconds;

  /// Câu hỏi chỉ mở khi quét đúng mã QR tại điểm (tới nơi bằng GPS thôi chưa đủ).
  final bool qrRequired;

  /// Nộp một lần, đúng câu nào cộng điểm câu đó (câu đố tour 5 bước).
  final bool perQuestionPoints;

  /// Câu đố trả lời từng câu đang làm dở: số câu đã đúng + điểm tạm (null khi chưa trả lời câu nào).
  final int? correctCount;
  final int? pointsSoFar;

  const TaskContent({
    required this.taskId,
    required this.name,
    required this.type,
    required this.description,
    required this.pointsReward,
    required this.maxAttempts,
    required this.attempts,
    required this.attemptsRemaining,
    required this.status,
    required this.requiresLocation,
    required this.sequential,
    required this.questionIndex,
    required this.totalQuestions,
    required this.unlocked,
    required this.station,
    this.stations = const [],
    required this.distanceMeters,
    required this.questions,
    this.durationSeconds,
    this.qrRequired = false,
    this.perQuestionPoints = false,
    this.correctCount,
    this.pointsSoFar,
  });

  factory TaskContent.fromJson(Map<String, dynamic> j) {
    final station = j['station'];
    return TaskContent(
      taskId: _int(j['taskId']),
      name: _str(j['taskName'], appL10n.tjTask),
      type: _str(j['taskType']),
      description: _str(j['description']),
      pointsReward: _int(j['pointsReward']),
      maxAttempts: _int(j['maxAttempts'], 3),
      attempts: _int(j['attempts']),
      attemptsRemaining: _int(j['attemptsRemaining']),
      status: _str(j['status'], ProgressStatus.notStarted),
      requiresLocation: j['requiresLocation'] == true,
      sequential: j['sequential'] == true,
      questionIndex: _int(j['questionIndex']),
      totalQuestions: _int(j['totalQuestions']),
      unlocked: j['unlocked'] == true,
      station: station is Map<String, dynamic> ? TaskStation.fromJson(station) : null,
      stations: _maps(j['stations']).map(TaskStation.fromJson).toList(),
      distanceMeters: _intOrNull(j['distanceMeters']),
      questions: _maps(j['questions']).map(TaskQuestion.fromJson).toList(),
      durationSeconds: _intOrNull(j['durationSeconds']),
      qrRequired: j['qrRequired'] == true,
      perQuestionPoints: j['perQuestionPoints'] == true,
      correctCount: _intOrNull(j['correctCount']),
      pointsSoFar: _intOrNull(j['pointsSoFar']),
    );
  }

  bool get isCompleted => status == ProgressStatus.completed;
  bool get isFailed => status == ProgressStatus.failed;
  bool get isFinished => isCompleted || isFailed;

  /// Câu đố trả lời từng câu: đã trả lời ít nhất 1 câu và chưa xong ⇒ "Tiếp tục từ câu N".
  bool get isInProgressQuiz =>
      perQuestionPoints && !requiresLocation && !isFinished && questionIndex > 0 && questionIndex < totalQuestions;
}

/// Một câu trả lời gửi lên: trắc nghiệm / chọn ảnh dùng [answerId], tự luận dùng [text],
/// xếp thứ tự dùng [answerIds] (theo thứ tự đã xếp), đoán số dùng [numberValue], nối cột dùng [matches].
class AnswerDraft {
  final int questionId;
  final int? answerId;
  final String? text;
  final List<int>? answerIds;
  final int? numberValue;
  final List<MatchPair>? matches;

  const AnswerDraft({
    required this.questionId,
    this.answerId,
    this.text,
    this.answerIds,
    this.numberValue,
    this.matches,
  });

  Map<String, dynamic> toJson() => {
        'questionId': questionId,
        'answerId': ?answerId,
        'text': ?text,
        'answerIds': ?answerIds,
        'numberValue': ?numberValue,
        if (matches != null) 'matches': matches!.map((m) => m.toJson()).toList(),
      };
}

/// Kết quả nộp bài. Với nhiệm vụ tuần tự: [lastAnswerCorrect] cho biết câu vừa nộp đúng hay sai.
class TaskSubmitResult {
  final String status;
  final int pointsEarned;
  final int attempts;
  final int maxAttempts;
  final int attemptsRemaining;
  final int totalQuestions;
  final int correctCount;
  final int questionIndex;
  final bool? lastAnswerCorrect;

  /// Xem lại từng câu (chỉ có khi backend cho phép lộ đáp án: đã xong / hết lượt / câu vừa đúng).
  final List<QuestionReview> review;

  const TaskSubmitResult({
    required this.status,
    required this.pointsEarned,
    required this.attempts,
    required this.maxAttempts,
    required this.attemptsRemaining,
    required this.totalQuestions,
    required this.correctCount,
    required this.questionIndex,
    required this.lastAnswerCorrect,
    this.review = const [],
  });

  factory TaskSubmitResult.fromJson(Map<String, dynamic> j) => TaskSubmitResult(
        status: _str(j['status']),
        pointsEarned: _int(j['pointsEarned']),
        attempts: _int(j['attempts']),
        maxAttempts: _int(j['maxAttempts'], 3),
        attemptsRemaining: _int(j['attemptsRemaining']),
        totalQuestions: _int(j['totalQuestions']),
        correctCount: _int(j['correctCount']),
        questionIndex: _int(j['questionIndex']),
        lastAnswerCorrect: j['lastAnswerCorrect'] is bool ? j['lastAnswerCorrect'] as bool : null,
        review: _maps(j['review']).map(QuestionReview.fromJson).toList(),
      );

  bool get completed => status == ProgressStatus.completed;
  bool get exhausted => status == ProgressStatus.failed || attemptsRemaining <= 0;
}

/// Một câu trong phần xem lại sau khi nộp.
class QuestionReview {
  final int questionId;
  final bool correct;

  /// Trắc nghiệm: id đáp án đúng.
  final int? correctAnswerId;

  /// Tự luận: một đáp án được chấp nhận.
  final String? correctText;
  final String? explanation;

  /// Xếp thứ tự: id các mục theo thứ tự đúng.
  final List<int> correctOrder;

  /// Đoán số: đáp án đúng.
  final int? correctNumber;

  /// Nối cột: các cặp đúng (leftId → rightKey).
  final List<MatchPair> correctMatches;

  const QuestionReview({
    required this.questionId,
    required this.correct,
    this.correctAnswerId,
    this.correctText,
    this.explanation,
    this.correctOrder = const [],
    this.correctNumber,
    this.correctMatches = const [],
  });

  factory QuestionReview.fromJson(Map<String, dynamic> j) => QuestionReview(
        questionId: _int(j['questionId']),
        correct: j['correct'] == true,
        correctAnswerId: _intOrNull(j['correctAnswerId']),
        correctText: (j['correctText']?.toString().trim().isEmpty ?? true) ? null : j['correctText'].toString(),
        explanation: (j['explanation']?.toString().trim().isEmpty ?? true) ? null : j['explanation'].toString(),
        correctOrder: j['correctOrder'] is List ? (j['correctOrder'] as List).map(_int).toList() : const [],
        correctNumber: _intOrNull(j['correctNumber']),
        correctMatches: _maps(j['correctMatches']).map(MatchPair.fromJson).toList(),
      );
}

class PuzzleClue {
  final String clue;
  final double? targetLatitude;
  final double? targetLongitude;
  final int radiusMeters;

  const PuzzleClue({
    required this.clue,
    required this.targetLatitude,
    required this.targetLongitude,
    required this.radiusMeters,
  });

  factory PuzzleClue.fromJson(Map<String, dynamic> j) => PuzzleClue(
        clue: _str(j['clue']),
        targetLatitude: _doubleOrNull(j['targetLatitude']),
        targetLongitude: _doubleOrNull(j['targetLongitude']),
        radiusMeters: _int(j['targetRadiusMeters'], 50),
      );
}

/// Nhiệm vụ đang chờ làm ở trang chủ, lấy từ hành trình thật của du khách.
class JourneyMission {
  final int journeyId;
  final int taskId;
  final String title;
  final String siteName;
  final bool isCompleted;

  const JourneyMission({
    required this.journeyId,
    required this.taskId,
    required this.title,
    required this.siteName,
    required this.isCompleted,
  });
}

/// Một checkpoint hoạt động thực địa trên bản đồ trạm (`GET /journeys/{id}/destinations/{destId}/checkpoints`).
class StopCheckpoint {
  final int taskId;
  final String name;
  final int orderIndex;
  final double latitude;
  final double longitude;
  final int radiusMeters;

  const StopCheckpoint({
    required this.taskId,
    required this.name,
    required this.orderIndex,
    required this.latitude,
    required this.longitude,
    required this.radiusMeters,
  });

  static StopCheckpoint? fromJson(Map<String, dynamic> j) {
    final lat = _doubleOrNull(j['latitude']);
    final lng = _doubleOrNull(j['longitude']);
    if (lat == null || lng == null) return null;
    return StopCheckpoint(
      taskId: _int(j['taskId']),
      name: _str(j['name'], appL10n.tjActivity),
      orderIndex: _int(j['orderIndex']),
      latitude: lat,
      longitude: lng,
      radiusMeters: _int(j['radiusMeters'], 50),
    );
  }
}

/// Bản đồ checkpoint của một trạm: vùng check-in của điểm đến + vị trí các hoạt động thực địa.
class StopCheckpoints {
  final double? latitude;
  final double? longitude;
  final int? checkInRadiusMeters;
  final List<StopCheckpoint> checkpoints;

  const StopCheckpoints({this.latitude, this.longitude, this.checkInRadiusMeters, this.checkpoints = const []});

  factory StopCheckpoints.fromJson(Map<String, dynamic> j) => StopCheckpoints(
        latitude: _doubleOrNull(j['latitude']),
        longitude: _doubleOrNull(j['longitude']),
        checkInRadiusMeters: _intOrNull(j['checkInRadiusMeters']),
        checkpoints: _maps(j['checkpoints']).map(StopCheckpoint.fromJson).nonNulls.toList(),
      );

  bool get hasStopLocation => latitude != null && longitude != null;
}
