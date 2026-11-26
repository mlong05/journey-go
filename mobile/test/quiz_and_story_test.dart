import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/models/tour_detail_model.dart';
import 'package:mobile/core/models/tour_journey_model.dart';

void main() {
  group('Nội dung văn hoá điểm dừng (StopCulture & Xưa–Nay)', () {
    test('đọc đủ ảnh tư liệu, hiện vật và lọc cặp ảnh xưa–nay hợp lệ', () {
      final culture = StopCulture.fromJson({
        'stopId': 1,
        'sequenceOrder': 1,
        'name': 'Dinh Độc Lập',
        'shortDescription': 'Di tích quốc gia đặc biệt.',
        'culturalContent': 'Đoạn giới thiệu văn hoá.',
        'culturalImages': ['https://img/1.jpg', 'https://img/2.jpg'],
        'artifacts': [
          {'name': 'Xe tăng 390', 'imageUrl': 'https://img/tank.jpg'},
        ],
      });

      expect(culture.isEmpty, isFalse);
      expect(culture.culturalImages, ['https://img/1.jpg', 'https://img/2.jpg']);
      expect(culture.artifacts.single.name, 'Xe tăng 390');
    });

    test('không có nội dung thì isEmpty = true', () {
      final culture = StopCulture.fromJson({'stopId': 1, 'sequenceOrder': 1, 'name': 'Trạm'});
      expect(culture.isEmpty, isTrue);
    });
  });

  group('Dạng câu hỏi mới', () {
    test('câu xếp thứ tự giữ nguyên thứ tự server đã xáo trộn', () {
      final q = TaskQuestion.fromJson({
        'id': 1,
        'content': 'Xếp các mốc',
        'questionType': 'ORDERING',
        'options': [
          {'id': 33, 'content': 'C', 'orderIndex': null},
          {'id': 31, 'content': 'A', 'orderIndex': null},
          {'id': 32, 'content': 'B', 'orderIndex': null},
        ],
      });
      expect(q.isOrdering, isTrue);
      expect(q.options.map((o) => o.id), [33, 31, 32]);
    });

    test('câu đoán số, nối cột và dạng lạ kiểm tra hợp lệ đúng', () {
      final number = TaskQuestion.fromJson({
        'id': 2,
        'content': 'Năm nào?',
        'questionType': 'NUMBER',
        'numberMin': 1950,
        'numberMax': 1980,
      });
      expect(number.isNumber, isTrue);
      expect(number.isUnsupported, isFalse);

      final matching = TaskQuestion.fromJson({
        'id': 5,
        'content': 'Nối chất liệu với màu sắc',
        'questionType': 'MATCHING',
        'options': [
          {'id': 101, 'content': 'Vỏ sò điệp', 'imageUrl': 'https://img/so-diep.jpg', 'orderIndex': 0},
          {'id': 102, 'content': 'Lá chàm', 'orderIndex': 1},
        ],
        'matchOptions': [
          {'key': 1, 'content': 'Màu xanh'},
          {'key': 0, 'content': 'Màu trắng óng ánh'},
        ],
      });
      expect(matching.isMatching, isTrue);
      expect(matching.isUnsupported, isFalse);
      expect(matching.options.first.imageUrl, 'https://img/so-diep.jpg');
      expect(matching.matchOptions.map((m) => m.key), [1, 0]);

      expect(TaskQuestion.fromJson({'id': 3, 'content': '?', 'questionType': 'NUMBER'}).isUnsupported, isTrue);
      expect(TaskQuestion.fromJson({'id': 6, 'content': '?', 'questionType': 'MATCHING'}).isUnsupported, isTrue);
      expect(TaskQuestion.fromJson({'id': 4, 'content': '?', 'questionType': 'AR_SCAN'}).isUnsupported, isTrue);
    });

    test('bài làm gửi đúng trường theo dạng câu', () {
      expect(
        const AnswerDraft(questionId: 1, answerIds: [31, 32]).toJson(),
        {'questionId': 1, 'answerIds': [31, 32]},
      );
      expect(
        const AnswerDraft(questionId: 2, numberValue: 1966).toJson(),
        {'questionId': 2, 'numberValue': 1966},
      );
      expect(
        const AnswerDraft(
          questionId: 5,
          matches: [MatchPair(leftId: 101, rightKey: 0), MatchPair(leftId: 102, rightKey: 1)],
        ).toJson(),
        {
          'questionId': 5,
          'matches': [
            {'leftId': 101, 'rightKey': 0},
            {'leftId': 102, 'rightKey': 1},
          ],
        },
      );
    });

    test('đọc phần xem lại có thứ tự đúng / số đúng / cặp nối đúng', () {
      final r = TaskSubmitResult.fromJson({
        'status': 'IN_PROGRESS',
        'review': [
          {'questionId': 1, 'correct': false, 'correctOrder': [31, 32, 33], 'explanation': 'Vì…'},
          {'questionId': 2, 'correct': true, 'correctNumber': 1966},
          {
            'questionId': 5,
            'correct': false,
            'correctMatches': [
              {'leftId': 101, 'rightKey': 0},
              {'leftId': 102, 'rightKey': 1},
            ],
          },
        ],
      });
      expect(r.review[0].correctOrder, [31, 32, 33]);
      expect(r.review[0].explanation, 'Vì…');
      expect(r.review[1].correctNumber, 1966);
      expect(r.review[2].correctMatches.length, 2);
      expect(r.review[2].correctMatches.first.leftId, 101);
      expect(r.review[2].correctMatches.first.rightKey, 0);
    });
  });
}
