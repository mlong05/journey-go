import 'package:flutter/material.dart';

import '../../screens/tourist_home_screen.dart';

/// Điều hướng về Trang chủ (tab 0 của màn gốc [TouristHomeScreen]).
///
/// ── Vì sao cần hàm này? ──
///  `TouristHomeScreen` là route GỐC của `MaterialApp` ⇒ không thể `push` thêm
///  một bản mới. Muốn "quay về trang chủ" ta phải:
///   1. Pop tất cả route nằm trên (để không quay lại màn đặt tour / checkout),
///   2. Báo cho [TouristHomeScreen] chuyển sang tab Trang chủ.
///
/// ⚠️ Bước 1 dùng `popUntil((route) => route.isFirst)` — luôn dẫn về route gốc.
void returnToHome(BuildContext context, {int tabIndex = 0}) {
  final navigator = Navigator.of(context);
  navigator.popUntil((route) => route.isFirst);
  // Báo màn gốc chuyển tab (nếu màn gốc đã bị thay bằng màn đăng nhập thì bỏ qua).
  TouristHomeScreen.tabRequest.request(tabIndex);
}
