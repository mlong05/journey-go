import 'package:flutter/foundation.dart' show ValueListenable;
import 'package:flutter/material.dart';
import '../common/tab_refresh.dart';
import '../tours/my_tours_view.dart';
import '../tours/tour_list_screen.dart';
import '../../l10n/locale_controller.dart';

/// Tab "Chuyến đi": tour đã mua, hành trình đang đi và đã hoàn thành.
/// Nội dung là màn "Tour của tôi" sẵn có, giữ nguyên logic vé và hành trình.
///
/// Vé ở đây là vé THẬT: đơn đặt tour đã thanh toán qua VNPay (xem `BookingService`).
class TripsTab extends StatefulWidget {
  final ValueListenable<int>? selectedTab;

  const TripsTab({super.key, this.selectedTab});

  @override
  State<TripsTab> createState() => _TripsTabState();
}

class _TripsTabState extends State<TripsTab> with RefreshOnTabReturn {
  @override
  ValueListenable<int>? get selectedTab => widget.selectedTab;

  @override
  int get tabIndex => 1;

  /// Tăng mỗi lần quay lại tab để danh sách chuyến đi tải lại.
  int _refreshToken = 0;

  @override
  void onTabReturn() {
    setState(() => _refreshToken++);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: TripsPalette.background,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: EdgeInsets.fromLTRB(18, 16, 18, 4),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    context.l10n.tripsTitle,
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -0.4,
                      color: TripsPalette.ink,
                    ),
                  ),
                  SizedBox(height: 2),
                  Text(
                    context.l10n.tripsSubtitle,
                    style: TextStyle(fontSize: 13, color: TripsPalette.muted),
                  ),
                ],
              ),
            ),
            Expanded(
              child: MyToursView(
                refreshToken: _refreshToken,
                onExplore: () => openTourList(context),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
