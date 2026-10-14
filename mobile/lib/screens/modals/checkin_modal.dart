import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/models/destination_model.dart';
import '../../core/models/journey_model.dart';
import '../../core/services/user_data_service.dart';

class CheckInModal extends StatefulWidget {
  final String initialTab; // 'qr' or 'gps'
  final List<DestinationModel> destinations;
  final VoidCallback? onCheckInSuccess;

  const CheckInModal({
    super.key,
    this.initialTab = 'qr',
    required this.destinations,
    this.onCheckInSuccess,
  });

  @override
  State<CheckInModal> createState() => _CheckInModalState();
}

class _CheckInModalState extends State<CheckInModal>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final TextEditingController _qrCodeInput = TextEditingController();
  final UserDataService _userDataService = UserDataService();

  bool _isProcessing = false;
  DestinationModel? _selectedDestination;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(
      length: 2,
      vsync: this,
      initialIndex: widget.initialTab == 'gps' ? 1 : 0,
    );
    if (widget.destinations.isNotEmpty) {
      _selectedDestination = widget.destinations.first;
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    _qrCodeInput.dispose();
    super.dispose();
  }

  Future<void> _handleCheckIn({required bool isQr}) async {
    setState(() => _isProcessing = true);

    await Future.delayed(const Duration(milliseconds: 1000));

    final destination = _selectedDestination ??
        (widget.destinations.isNotEmpty
            ? widget.destinations.first
            : DestinationModel(
                id: 1,
                name: 'Văn Miếu - Quốc Tử Giám',
                address: '58 Quốc Tử Giám, Hà Nội',
                latitude: 21.0277,
                longitude: 105.8351,
                capacity: 5000,
                approved: true,
                deleted: false,
              ));

    // Thêm điểm tích lũy vào tài khoản
    await _userDataService.addPoints(100);

    // Lưu chặng hành trình vào timeline thực tế
    final now = DateTime.now();
    final dateStr =
        '${now.day.toString().padLeft(2, '0')}/${now.month.toString().padLeft(2, '0')}/${now.year} - ${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}';

    final newItem = JourneyTimelineItem(
      id: 'checkin_${now.millisecondsSinceEpoch}',
      siteName: destination.name,
      location: destination.address,
      checkinDate: '$dateStr • Hà Nội',
      method: isQr ? 'QR Code Scan' : 'GPS Check-in',
      rewardPoints: '+100 pts',
      photoUrl: destination.coverImage,
      caption: isQr
          ? 'Quét mã QR tại bia hiện vật và hoàn tất mở khóa tư liệu di sản.'
          : 'Xác thực tọa độ GPS thực địa thành công trong phạm vi di tích.',
      lat: destination.latitude,
      lng: destination.longitude,
    );

    await _userDataService.addTimelineItem(newItem);

    // Mở khóa huy hiệu tương ứng nếu có
    if (destination.name.contains('Thăng Long')) {
      await _userDataService.unlockBadge('badge_thang_long');
    } else if (destination.name.contains('Bát Tràng')) {
      await _userDataService.unlockBadge('badge_gom_su');
    } else if (destination.name.contains('Tràng An')) {
      await _userDataService.unlockBadge('badge_trang_an');
    }

    if (mounted) {
      setState(() => _isProcessing = false);
      Navigator.of(context).pop();

      widget.onCheckInSuccess?.call();

      _showSuccessDialog(destination, isQr);
    }
  }

  void _showSuccessDialog(DestinationModel destination, bool isQr) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        contentPadding: const EdgeInsets.all(24),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                color: AppCultureColors.jadeLight,
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.check_circle_rounded,
                color: AppCultureColors.heritageJade,
                size: 44,
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'Check-in Thành Công!',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w800,
                color: AppCultureColors.textDark,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Bạn đã check-in tại ${destination.name} bằng phương thức ${isQr ? "Quét mã QR" : "Định vị GPS"}.',
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 14,
                color: AppCultureColors.textMuted,
              ),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              decoration: BoxDecoration(
                color: AppCultureColors.rewardBg,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppCultureColors.rewardBorder),
              ),
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.stars_rounded, color: AppCultureColors.gold, size: 24),
                  SizedBox(width: 8),
                  Text(
                    '+100 Điểm Thưởng Di Sản',
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      color: AppCultureColors.rewardText,
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                onPressed: () => Navigator.of(ctx).pop(),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppCultureColors.heritageJade,
                  foregroundColor: Colors.white,
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
                child: const Text(
                  'Tuyệt vời, tiếp tục khám phá',
                  style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
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
      height: MediaQuery.of(context).size.height * 0.82,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: Column(
        children: [
          // Drag handle
          Center(
            child: Container(
              margin: const EdgeInsets.only(top: 12, bottom: 8),
              width: 44,
              height: 5,
              decoration: BoxDecoration(
                color: Colors.grey[300],
                borderRadius: BorderRadius.circular(3),
              ),
            ),
          ),

          // Header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Kích Hoạt Thực Địa Di Sản',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        color: AppCultureColors.textDark,
                      ),
                    ),
                    SizedBox(height: 2),
                    Text(
                      'Xác thực hiện diện tại điểm đến di tích',
                      style: TextStyle(
                        fontSize: 13,
                        color: AppCultureColors.textMuted,
                      ),
                    ),
                  ],
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
          ),

          // Tabs
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              color: AppCultureColors.surfaceSubtle,
              borderRadius: BorderRadius.circular(16),
            ),
            child: TabBar(
              controller: _tabController,
              indicator: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.06),
                    blurRadius: 4,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              indicatorSize: TabBarIndicatorSize.tab,
              dividerColor: Colors.transparent,
              labelColor: AppCultureColors.heritageJade,
              unselectedLabelColor: AppCultureColors.textMuted,
              labelStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
              unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
              tabs: const [
                Tab(
                  icon: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.qr_code_scanner_rounded, size: 20),
                      SizedBox(width: 8),
                      Text('Quét mã QR'),
                    ],
                  ),
                ),
                Tab(
                  icon: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.near_me_rounded, size: 20),
                      SizedBox(width: 8),
                      Text('Định vị GPS'),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Tab views
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildQrTab(),
                _buildGpsTab(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQrTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          // Simulated QR Viewport
          Container(
            height: 220,
            width: double.infinity,
            decoration: BoxDecoration(
              color: const Color(0xFF0F172A),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: AppCultureColors.border),
            ),
            child: Stack(
              alignment: Alignment.center,
              children: [
                // Corner guides
                Container(
                  width: 170,
                  height: 170,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppCultureColors.heritageJade, width: 2.5),
                  ),
                  child: const Center(
                    child: Icon(
                      Icons.qr_code_2_rounded,
                      color: Colors.white24,
                      size: 90,
                    ),
                  ),
                ),
                Positioned(
                  bottom: 12,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                    decoration: BoxDecoration(
                      color: Colors.black.withOpacity(0.6),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.camera_alt_rounded, color: Colors.white70, size: 16),
                        SizedBox(width: 6),
                        Text(
                          'Hướng camera vào mã QR hiện vật',
                          style: TextStyle(color: Colors.white, fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 20),

          // Select site to simulate scan
          Align(
            alignment: Alignment.centerLeft,
            child: Text(
              'Chọn điểm di tích quét mã:',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: Colors.grey[700],
              ),
            ),
          ),
          const SizedBox(height: 8),

          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14),
            decoration: BoxDecoration(
              color: AppCultureColors.surfaceSubtle,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppCultureColors.border),
            ),
            child: DropdownButtonHideUnderline(
              child: DropdownButton<DestinationModel>(
                value: _selectedDestination,
                isExpanded: true,
                items: widget.destinations.map((d) {
                  return DropdownMenuItem<DestinationModel>(
                    value: d,
                    child: Text(
                      d.name,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: AppCultureColors.textDark,
                      ),
                    ),
                  );
                }).toList(),
                onChanged: (val) {
                  if (val != null) {
                    setState(() => _selectedDestination = val);
                  }
                },
              ),
            ),
          ),

          const SizedBox(height: 20),

          SizedBox(
            width: double.infinity,
            height: 52,
            child: ElevatedButton.icon(
              onPressed: _isProcessing ? null : () => _handleCheckIn(isQr: true),
              icon: _isProcessing
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                    )
                  : const Icon(Icons.qr_code_scanner_rounded, size: 22),
              label: Text(
                _isProcessing ? 'Đang xác thực mã QR...' : 'Quét & Nhận +100 Điểm Thưởng',
                style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppCultureColors.heritageJade,
                foregroundColor: Colors.white,
                elevation: 0,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildGpsTab() {
    final destName = _selectedDestination?.name ?? 'Văn Miếu – Quốc Tử Giám';
    final destAddress = _selectedDestination?.address ?? '58 Quốc Tử Giám, Đống Đa, Hà Nội';

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  AppCultureColors.oceanLight,
                  Colors.white,
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: AppCultureColors.oceanBlue.withOpacity(0.3)),
            ),
            child: Column(
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: AppCultureColors.oceanBlue.withOpacity(0.12),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(Icons.location_on_rounded, color: AppCultureColors.oceanBlue, size: 28),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Tọa độ GPS hiện tại',
                            style: TextStyle(
                              fontSize: 12,
                              color: AppCultureColors.textMuted,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: 2),
                          const Text(
                            '21.0277° B, 105.8351° Đ (Hà Nội)',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w800,
                              color: AppCultureColors.textDark,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppCultureColors.border),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.verified_rounded, color: AppCultureColors.heritageJade, size: 20),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Trong phạm vi Geofence (< 100m) tới $destName',
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: AppCultureColors.heritageJade,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 18),

          Align(
            alignment: Alignment.centerLeft,
            child: Text(
              'Điểm đến cần xác thực vị trí:',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: Colors.grey[700],
              ),
            ),
          ),
          const SizedBox(height: 8),

          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14),
            decoration: BoxDecoration(
              color: AppCultureColors.surfaceSubtle,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppCultureColors.border),
            ),
            child: DropdownButtonHideUnderline(
              child: DropdownButton<DestinationModel>(
                value: _selectedDestination,
                isExpanded: true,
                items: widget.destinations.map((d) {
                  return DropdownMenuItem<DestinationModel>(
                    value: d,
                    child: Text(
                      d.name,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: AppCultureColors.textDark,
                      ),
                    ),
                  );
                }).toList(),
                onChanged: (val) {
                  if (val != null) {
                    setState(() => _selectedDestination = val);
                  }
                },
              ),
            ),
          ),

          const SizedBox(height: 24),

          SizedBox(
            width: double.infinity,
            height: 52,
            child: ElevatedButton.icon(
              onPressed: _isProcessing ? null : () => _handleCheckIn(isQr: false),
              icon: _isProcessing
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                    )
                  : const Icon(Icons.near_me_rounded, size: 22),
              label: Text(
                _isProcessing ? 'Đang xác thực tọa độ...' : 'Xác Thực GPS (+100 pts)',
                style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppCultureColors.oceanBlue,
                foregroundColor: Colors.white,
                elevation: 0,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
