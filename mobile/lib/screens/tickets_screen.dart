import 'package:flutter/material.dart';
import 'bookings/my_bookings_screen.dart';

/// Ví vé: vé là các booking đã thanh toán (dữ liệu thật từ /bookings/my),
/// cùng đơn chờ thanh toán và lịch sử giao dịch.
class TicketsScreen extends StatelessWidget {
  const TicketsScreen({super.key});

  @override
  Widget build(BuildContext context) => const MyBookingsScreen();
}
