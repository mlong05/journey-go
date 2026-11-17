import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/main.dart';

void main() {
  testWidgets('Tourist Auth Screen renders properly smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const JourneyGoTouristApp());

    // Logo thương hiệu là ẢNH (không phải chữ) ⇒ kiểm tra theo widget Image.
    expect(find.byType(Image), findsWidgets);

    // Segmented control: 2 tab "Đăng nhập" / "Tạo tài khoản".
    expect(find.text('Đăng nhập'), findsWidgets);
    expect(find.text('Tạo tài khoản'), findsWidgets);
  });
}
