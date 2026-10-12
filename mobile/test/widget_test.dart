import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/main.dart';

void main() {
  testWidgets('Tourist Auth Screen renders properly smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const JourneyGoTouristApp());
    expect(find.text('journey go'), findsOneWidget);
    expect(find.text('Đăng nhập'), findsWidgets);
    expect(find.text('Tạo tài khoản'), findsOneWidget);
  });
}
