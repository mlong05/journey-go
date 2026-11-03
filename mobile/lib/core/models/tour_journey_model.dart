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

  const JourneyTask({
    required this.taskId,
    required this.name,
    required this.type,
    required this.orderIndex,
    required this.status,
    required this.pointsEarned,
    required this.attempts,
  });

  factory JourneyTask.fromJson(Map<String, dynamic> j) => JourneyTask(
        taskId: _int(j['taskId']),
        name: _str(j['taskName'], 'Nhiệm vụ'),
        type: _str(j['taskType']),
        orderIndex: _int(j['orderIndex']),
        status: _str(j['status'], ProgressStatus.notStarted),
        pointsEarned: _int(j['pointsEarned']),
        attempts: _int(j['attempts']),
      );

  bool get isCompleted => status == ProgressStatus.completed;
  bool get isFailed => status == ProgressStatus.failed;
  bool get isOpen => !isCompleted && !isFailed && status != ProgressStatus.skipped;
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
      name: _str(j['destinationName'], 'Điểm đến'),
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
  });

  factory TourJourney.fromJson(Map<String, dynamic> j) {
    final dests = _maps(j['destinations']).map(JourneyDestination.fromJson).toList()
      ..sort((a, b) => a.orderIndex.compareTo(b.orderIndex));
    return TourJourney(
      id: _int(j['id']),
      tourId: _int(j['tourId']),
      bookingId: _intOrNull(j['bookingId']),
      tourName: _str(j['tourName'], 'Hành trình'),
      status: _str(j['status']),
      currentOrder: _int(j['currentDestinationOrder'], 1),
      totalDestinations: _int(j['totalDestinations'], dests.length),
      destinations: dests,
      completedAt: DateTime.tryParse(_str(j['completedAt']))?.toLocal(),
    );
  }

  bool get isCompleted => status == ProgressStatus.completed;
  int get doneCount => destinations.where((d) => d.isDone).length;
  double get progress => totalDestinations == 0 ? 0 : doneCount / totalDestinations;
  int get pointsEarned =>
      destinations.fold(0, (s, d) => s + d.tasks.fold(0, (t, task) => t + task.pointsEarned));
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

  const QuestionOption({required this.id, required this.content});

  factory QuestionOption.fromJson(Map<String, dynamic> j) =>
      QuestionOption(id: _int(j['id']), content: _str(j['content']));
}

class TaskQuestion {
  final int id;
  final String content;
  final String type; // MULTIPLE_CHOICE | TEXT
  final List<QuestionOption> options;

  const TaskQuestion({
    required this.id,
    required this.content,
    required this.type,
    required this.options,
  });

  factory TaskQuestion.fromJson(Map<String, dynamic> j) {
    final opts = _maps(j['options']).toList()
      ..sort((a, b) => _int(a['orderIndex']).compareTo(_int(b['orderIndex'])));
    return TaskQuestion(
      id: _int(j['id']),
      content: _str(j['content']),
      type: _str(j['questionType'], 'MULTIPLE_CHOICE'),
      options: opts.map(QuestionOption.fromJson).toList(),
    );
  }

  bool get isText => type == 'TEXT';
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
        name: _str(j['name'], 'Trạm kế tiếp'),
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
  });

  factory TaskContent.fromJson(Map<String, dynamic> j) {
    final station = j['station'];
    return TaskContent(
      taskId: _int(j['taskId']),
      name: _str(j['taskName'], 'Nhiệm vụ'),
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
    );
  }

  bool get isCompleted => status == ProgressStatus.completed;
  bool get isFailed => status == ProgressStatus.failed;
  bool get isFinished => isCompleted || isFailed;
}

/// Một câu trả lời gửi lên: trắc nghiệm dùng [answerId], tự luận dùng [text].
class AnswerDraft {
  final int questionId;
  final int? answerId;
  final String? text;

  const AnswerDraft({required this.questionId, this.answerId, this.text});

  Map<String, dynamic> toJson() => {
        'questionId': questionId,
        'answerId': ?answerId,
        'text': ?text,
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
      );

  bool get completed => status == ProgressStatus.completed;
  bool get exhausted => status == ProgressStatus.failed || attemptsRemaining <= 0;
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
