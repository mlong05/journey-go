import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/models/destination_model.dart';
import '../../core/models/ticket_model.dart';
import '../../core/services/user_data_service.dart';

class PaymentModal extends StatefulWidget {
  final DestinationModel route;
  final VoidCallback? onPaymentSuccess;

  const PaymentModal({
    super.key,
    required this.route,
    this.onPaymentSuccess,
  });

  @override
  State<PaymentModal> createState() => _PaymentModalState();
}

class _PaymentModalState extends State<PaymentModal> {
  final UserDataService _userDataService = UserDataService();
  String _selectedMethod = 'vnpay'; // 'vnpay', 'momo', 'card'
  bool _isProcessing = false;

  void _handlePayment() async {
    setState(() => _isProcessing = true);

    await Future.delayed(const Duration(milliseconds: 1200));

    final now = DateTime.now();
    final randomCode = 'VK-2026-${(now.millisecondsSinceEpoch % 900 + 100)}';
    final dateStr =
        '${now.day.toString().padLeft(2, '0')}/${now.month.toString().padLeft(2, '0')}/${now.year}';

    final gatewayName = _selectedMethod == 'vnpay'
        ? 'VNPay'
        : (_selectedMethod == 'momo' ? 'MoMo' : 'Thẻ Quốc Tế');

    final newTicket = TicketModel(
      ticketCode: randomCode,
      tourName: widget.route.name,
      destination: widget.route.address,
      price: widget.route.ticketPrice,
      numericPrice: widget.route.numericPrice,
      status: 'ACTIVE',
      statusLabel: 'Còn hiệu lực',
      purchaseDate: '$dateStr - ${now.hour}:${now.minute.toString().padLeft(2, '0')}',
      validDate: '$dateStr - 30 ngày',
      paymentGateway: gatewayName,
      transactionId: '${gatewayName.toUpperCase()}-${now.millisecondsSinceEpoch}',
      qrCodeUrl:
          'https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=VIETCULTURE_${randomCode}_ACTIVE',
      holderName: 'Nguyễn An',
      passengerCount: 1,
      benefits: [
        'Vé vào cổng di tích ưu tiên không cần xếp hàng đổi vé giấy',
        'Trợ lý AI thuyết minh cá nhân hóa qua tai nghe',
        'Tham gia giải đố văn hóa tương tác nhận huy hiệu độc quyền',
        'Bảo hiểm du lịch nội địa theo lượt tham quan',
      ],
    );

    await _userDataService.addTicket(newTicket);
    await _userDataService.addPoints(150);

    if (mounted) {
      setState(() => _isProcessing = false);
      Navigator.of(context).pop();

      widget.onPaymentSuccess?.call();

      _showSuccessDialog(newTicket);
    }
  }

  void _showSuccessDialog(TicketModel ticket) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        contentPadding: const EdgeInsets.all(24),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 68,
              height: 68,
              decoration: const BoxDecoration(
                color: AppCultureColors.jadeLight,
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.check_circle_rounded,
                color: AppCultureColors.heritageJade,
                size: 42,
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'Thanh Toán Thành Công!',
              style: TextStyle(
                fontSize: 19,
                fontWeight: FontWeight.w800,
                color: AppCultureColors.textDark,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Mã vé: ${ticket.ticketCode}\nĐã thêm vé điện tử vào Ví của bạn.',
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 13,
                color: AppCultureColors.textMuted,
                height: 1.4,
              ),
            ),
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(
                color: AppCultureColors.rewardBg,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppCultureColors.rewardBorder),
              ),
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.stars_rounded, color: AppCultureColors.gold, size: 20),
                  SizedBox(width: 6),
                  Text(
                    '+150 Điểm Thưởng Di Sản',
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      color: AppCultureColors.rewardText,
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 22),
            SizedBox(
              width: double.infinity,
              height: 46,
              child: ElevatedButton(
                onPressed: () => Navigator.of(ctx).pop(),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppCultureColors.heritageJade,
                  foregroundColor: Colors.white,
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
                child: const Text(
                  'Hoàn tất',
                  style: TextStyle(fontWeight: FontWeight.w700),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Drag handle
          Center(
            child: Container(
              margin: const EdgeInsets.only(bottom: 12),
              width: 44,
              height: 5,
              decoration: BoxDecoration(
                color: Colors.grey[300],
                borderRadius: BorderRadius.circular(3),
              ),
            ),
          ),

          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Xác Nhận & Mở Khóa Lộ Trình',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  color: AppCultureColors.textDark,
                ),
              ),
              IconButton(
                onPressed: () => Navigator.of(context).pop(),
                icon: const Icon(Icons.close_rounded, color: AppCultureColors.textMuted),
                style: IconButton.styleFrom(
                  backgroundColor: AppCultureColors.surfaceSubtle,
                ),
              ),
            ],
          ),

          const SizedBox(height: 14),

          // Route brief card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppCultureColors.surfaceSubtle,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: AppCultureColors.border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  widget.route.name,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    color: AppCultureColors.textDark,
                  ),
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    const Icon(Icons.location_on_outlined, size: 16, color: AppCultureColors.textMuted),
                    const SizedBox(width: 4),
                    Text(
                      widget.route.address,
                      style: const TextStyle(fontSize: 13, color: AppCultureColors.textMuted),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                const Divider(height: 1),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Tổng chi phí:',
                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppCultureColors.textDark),
                    ),
                    Text(
                      widget.route.ticketPrice,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        color: AppCultureColors.heritageJade,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          const SizedBox(height: 18),

          const Text(
            'Phương thức thanh toán:',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: AppCultureColors.textDark,
            ),
          ),
          const SizedBox(height: 10),

          // Methods
          _buildMethodTile(
            id: 'vnpay',
            title: 'Ví VNPAY / Ứng dụng ngân hàng',
            subtitle: 'Quét mã VNPAY-QR tiện lợi và nhanh chóng',
            icon: Icons.account_balance_wallet_rounded,
            iconColor: AppCultureColors.oceanBlue,
          ),
          const SizedBox(height: 8),
          _buildMethodTile(
            id: 'momo',
            title: 'Ví điện tử MoMo',
            subtitle: 'Liên kết ví thanh toán tự động trong 1 chạm',
            icon: Icons.payments_rounded,
            iconColor: const Color(0xFFA50064),
          ),
          const SizedBox(height: 8),
          _buildMethodTile(
            id: 'card',
            title: 'Thẻ ATM nội địa / Visa, Mastercard',
            subtitle: 'Cổng thanh toán bảo mật tiêu chuẩn quốc tế',
            icon: Icons.credit_card_rounded,
            iconColor: AppCultureColors.heritageJade,
          ),

          const SizedBox(height: 22),

          // Action Button
          SizedBox(
            width: double.infinity,
            height: 52,
            child: ElevatedButton(
              onPressed: _isProcessing ? null : _handlePayment,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppCultureColors.heritageJade,
                foregroundColor: Colors.white,
                elevation: 0,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
              child: _isProcessing
                  ? const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                        ),
                        SizedBox(width: 12),
                        Text(
                          'Đang xử lý giao dịch an toàn...',
                          style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                        ),
                      ],
                    )
                  : Text(
                      widget.route.numericPrice > 0
                          ? 'Thanh toán ${widget.route.ticketPrice} để mở khóa'
                          : 'Nhận vé miễn phí ngay',
                      style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
                    ),
            ),
          ),
          const SizedBox(height: 10),
        ],
      ),
    );
  }

  Widget _buildMethodTile({
    required String id,
    required String title,
    required String subtitle,
    required IconData icon,
    required Color iconColor,
  }) {
    final isSelected = _selectedMethod == id;

    return InkWell(
      onTap: () => setState(() => _selectedMethod = id),
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: isSelected ? AppCultureColors.jadeLight.withOpacity(0.4) : Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isSelected ? AppCultureColors.heritageJade : AppCultureColors.border,
            width: isSelected ? 1.8 : 1,
          ),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: iconColor.withOpacity(0.12),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: iconColor, size: 22),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: AppCultureColors.textDark,
                    ),
                  ),
                  Text(
                    subtitle,
                    style: const TextStyle(fontSize: 12, color: AppCultureColors.textMuted),
                  ),
                ],
              ),
            ),
            Radio<String>(
              value: id,
              groupValue: _selectedMethod,
              activeColor: AppCultureColors.heritageJade,
              onChanged: (val) {
                if (val != null) setState(() => _selectedMethod = val);
              },
            ),
          ],
        ),
      ),
    );
  }
}
