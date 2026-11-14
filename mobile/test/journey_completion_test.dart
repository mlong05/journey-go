import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/models/tour_journey_model.dart';
import 'package:mobile/screens/journey/journey_summary_screen.dart';

/// Hành trình đã xong: 1 điểm đến, câu đố sai một phần (vẫn COMPLETED) + hoạt động đúng hết.
Map<String, dynamic> _completedJson({String rank = 'COMPLETED', int bonus = 50}) => {
  'id': 50,
  'tourId': 1,
  'tourName': 'Hà Nội ngàn năm',
  'status': 'COMPLETED',
  'totalDestinations': 1,
  'startedAt': '2026-11-09T08:00:00Z',
  'completedAt': '2026-11-09T09:30:00Z',
  'completionBonusPoints': bonus,
  'completionRank': rank,
  'destinations': [
    {
      'destinationId': 7,
      'destinationName': 'Văn Miếu',
      'orderIndex': 1,
      'status': 'COMPLETED',
      'checkedIn': true,
      'tasksCompleted': 2,
      'totalTasks': 2,
      'tasks': [
        {'taskId': -7, 'taskName': 'Câu đố', 'taskType': 'QUIZ', 'orderIndex': 1, 'status': 'COMPLETED', 'pointsEarned': 10, 'isCorrect': false},
        {'taskId': 5, 'taskName': 'Tìm bia', 'taskType': 'REAL_WORLD', 'orderIndex': 2, 'status': 'COMPLETED', 'pointsEarned': 20, 'isCorrect': true},
      ],
    },
  ],
};

void main() {
  test('reads completion rank, bonus and passed tasks', () {
    final j = TourJourney.fromJson(_completedJson());

    expect(j.completionRank, CompletionRank.completed);
    expect(j.pointsEarned, 30);
    expect(j.totalPoints, 80);
    // Câu đố sai một phần vẫn "hoàn thành" nhưng không tính là đạt trọn
    expect(j.passedTaskCount, 1);
    expect(j.duration, const Duration(minutes: 90));
  });

  test('journey in progress has no rank or bonus', () {
    final j = TourJourney.fromJson({..._completedJson(), 'status': 'IN_PROGRESS', 'completionRank': null, 'completionBonusPoints': 0});

    expect(j.completionRank, isNull);
    expect(j.totalPoints, j.pointsEarned);
  });

  testWidgets('summary screen shows rank, totals and bonus', (tester) async {
    final journey = TourJourney.fromJson(_completedJson(rank: 'PERFECT'));
    await tester.pumpWidget(MaterialApp(home: JourneySummaryScreen(journey: journey)));
    await tester.pumpAndSettle();

    expect(find.text('Hoàn thành trọn vẹn'), findsOneWidget);
    expect(find.text('80'), findsOneWidget);
    expect(find.text('1/2'), findsOneWidget);
    await tester.scrollUntilVisible(find.textContaining('+50 điểm'), 200, scrollable: find.byType(Scrollable).first);
    expect(find.textContaining('+50 điểm'), findsOneWidget);
  });

  testWidgets('summary explains missing bonus when a destination was skipped', (tester) async {
    final journey = TourJourney.fromJson(_completedJson(rank: 'PARTIAL', bonus: 0));
    await tester.pumpWidget(MaterialApp(home: JourneySummaryScreen(journey: journey)));
    await tester.pumpAndSettle();

    expect(find.text('Đã đi hết hành trình'), findsOneWidget);
    await tester.scrollUntilVisible(find.textContaining('Không có thưởng hoàn thành'), 200, scrollable: find.byType(Scrollable).first);
    expect(find.textContaining('Không có thưởng hoàn thành'), findsOneWidget);
  });
}
