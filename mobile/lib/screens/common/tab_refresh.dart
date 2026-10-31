import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';

/// Tab trong khung chính luôn được giữ trong bộ nhớ, nên dữ liệu không tự cập nhật khi quay lại.
/// Mixin này gọi [onTabReturn] mỗi khi du khách chuyển sang lại tab [tabIndex].
mixin RefreshOnTabReturn<T extends StatefulWidget> on State<T> {
  /// Tab đang được chọn ở thanh điều hướng; null khi màn hình không nằm trong khung tab.
  ValueListenable<int>? get selectedTab;

  int get tabIndex;

  /// Làm mới dữ liệu nhẹ nhàng (giữ nội dung cũ trong lúc tải).
  void onTabReturn();

  int? _lastTab;

  @override
  void initState() {
    super.initState();
    _lastTab = selectedTab?.value;
    selectedTab?.addListener(_handleTabChange);
  }

  @override
  void dispose() {
    selectedTab?.removeListener(_handleTabChange);
    super.dispose();
  }

  void _handleTabChange() {
    final current = selectedTab!.value;
    if (current == tabIndex && _lastTab != tabIndex && mounted) onTabReturn();
    _lastTab = current;
  }
}
