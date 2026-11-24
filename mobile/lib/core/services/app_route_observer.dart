import 'package:flutter/widgets.dart';

/// RouteObserver dùng chung (gắn vào `MaterialApp.navigatorObservers`).
///
/// Màn hình cần làm mới khi được hiện lại (người dùng bấm quay về từ màn phía trên) thì
/// `mixin RouteAware`, đăng ký trong `didChangeDependencies` và làm mới ở `didPopNext`.
/// Ví dụ: Trang chủ tải lại thanh "Bạn có đơn chờ thanh toán" sau khi khách thoát màn thanh toán.
final RouteObserver<ModalRoute<void>> appRouteObserver = RouteObserver<ModalRoute<void>>();
