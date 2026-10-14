import 'package:flutter/material.dart';
import '../core/constants/app_colors.dart';
import '../core/models/ticket_model.dart';
import '../core/services/user_data_service.dart';

class TicketsScreen extends StatefulWidget {
  const TicketsScreen({super.key});

  @override
  State<TicketsScreen> createState() => _TicketsScreenState();
}

class _TicketsScreenState extends State<TicketsScreen> {
  final UserDataService _userDataService = UserDataService();
  List<TicketModel> _tickets = [];
  bool _isLoading = true;
  String _activeFilter = 'ALL'; // 'ALL', 'ACTIVE', 'USED', 'REFUNDED'

  @override
  void initState() {
    super.initState();
    _loadTickets();
  }

  Future<void> _loadTickets() async {
    setState(() => _isLoading = true);
    final list = await _userDataService.getTickets();
    if (mounted) {
      setState(() {
        _tickets = list;
        _isLoading = false;
      });
    }
  }

  List<TicketModel> get _filteredTickets {
    if (_activeFilter == 'ACTIVE') return _tickets.where((t) => t.isActive).toList();
    if (_activeFilter == 'USED') return _tickets.where((t) => t.isUsed).toList();
    if (_activeFilter == 'REFUNDED') return _tickets.where((t) => t.isRefunded).toList();
    return _tickets;
  }

  void _showQrDialog(TicketModel ticket) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        contentPadding: const EdgeInsets.all(24),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Vé Vào Cổng Di Tích',
                  style: TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w800,
                    color: AppCultureColors.textDark,
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.of(ctx).pop(),
                  icon: const Icon(Icons.close_rounded, size: 20),
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppCultureColors.border),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.04),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                children: [
                  Container(
                    width: 180,
                    height: 180,
                    decoration: BoxDecoration(
                      color: AppCultureColors.surfaceSubtle,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.qr_code_2_rounded, size: 140, color: AppCultureColors.textDark),
                          Text(
                            ticket.ticketCode,
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 1.2,
                              color: AppCultureColors.textDark,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    'Đưa mã QR này vào máy quét tại cổng kiểm soát',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 12, color: AppCultureColors.textMuted),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppCultureColors.surfaceSubtle,
                borderRadius: BorderRadius.circular(14),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    ticket.tourName,
                    style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: AppCultureColors.textDark),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Người sở hữu: ${ticket.holderName} (1 vé)',
                    style: const TextStyle(fontSize: 12, color: AppCultureColors.textMuted),
                  ),
                  Text(
                    'Hiệu lực: ${ticket.validDate}',
                    style: const TextStyle(fontSize: 12, color: AppCultureColors.textMuted),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final activeCount = _tickets.where((t) => t.isActive).length;

    return Scaffold(
      backgroundColor: AppCultureColors.background,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18, color: AppCultureColors.textDark),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: const Text(
          'Ví Vé & Chi Phí Du Lịch',
          style: TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.w800,
            color: AppCultureColors.textDark,
          ),
        ),
      ),
      body: _isLoading
          ? const Center(
              child: CircularProgressIndicator(color: AppCultureColors.heritageJade),
            )
          : RefreshIndicator(
              onRefresh: _loadTickets,
              color: AppCultureColors.heritageJade,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Summary Banner
                    Container(
                      padding: const EdgeInsets.all(18),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFF00A86B), Color(0xFF0288D1)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(22),
                        boxShadow: [
                          BoxShadow(
                            color: AppCultureColors.heritageJade.withOpacity(0.25),
                            blurRadius: 14,
                            offset: const Offset(0, 6),
                          ),
                        ],
                      ),
                      child: Column(
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    'Vé điện tử khả dụng',
                                    style: TextStyle(color: Colors.white70, fontSize: 13),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    '$activeCount vé sẵn sàng',
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 22,
                                      fontWeight: FontWeight.w800,
                                    ),
                                  ),
                                ],
                              ),
                              Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: Colors.white.withOpacity(0.18),
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(
                                  Icons.confirmation_number_rounded,
                                  color: Colors.white,
                                  size: 28,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 14),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                            decoration: BoxDecoration(
                              color: Colors.black.withOpacity(0.15),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Row(
                              children: [
                                Icon(Icons.shield_rounded, color: Colors.white70, size: 16),
                                SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    'Bảo hiểm du lịch nội địa tích hợp trong từng mã vé',
                                    style: TextStyle(color: Colors.white, fontSize: 12),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 18),

                    // Filter chips
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: [
                          _buildFilterChip('ALL', 'Tất cả (${_tickets.length})'),
                          const SizedBox(width: 8),
                          _buildFilterChip('ACTIVE', 'Khả dụng ($activeCount)'),
                          const SizedBox(width: 8),
                          _buildFilterChip('USED', 'Đã sử dụng'),
                          const SizedBox(width: 8),
                          _buildFilterChip('REFUNDED', 'Đã hoàn tiền'),
                        ],
                      ),
                    ),

                    const SizedBox(height: 18),

                    // Tickets List
                    if (_filteredTickets.isEmpty)
                      Center(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(vertical: 40),
                          child: Column(
                            children: [
                              Icon(Icons.inbox_rounded, size: 50, color: Colors.grey[400]),
                              const SizedBox(height: 10),
                              const Text(
                                'Không có vé nào trong mục này',
                                style: TextStyle(color: AppCultureColors.textMuted),
                              ),
                            ],
                          ),
                        ),
                      )
                    else
                      ..._filteredTickets.map((ticket) => _buildTicketCard(ticket)),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildFilterChip(String id, String label) {
    final isSelected = _activeFilter == id;

    return GestureDetector(
      onTap: () => setState(() => _activeFilter = id),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? AppCultureColors.heritageJade : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? AppCultureColors.heritageJade : AppCultureColors.border,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 13,
            fontWeight: isSelected ? FontWeight.w700 : FontWeight.w600,
            color: isSelected ? Colors.white : AppCultureColors.textDark,
          ),
        ),
      ),
    );
  }

  Widget _buildTicketCard(TicketModel ticket) {
    Color badgeColor = AppCultureColors.heritageJade;
    Color badgeBg = AppCultureColors.jadeLight;
    if (ticket.isUsed) {
      badgeColor = AppCultureColors.textMuted;
      badgeBg = AppCultureColors.surfaceSubtle;
    } else if (ticket.isRefunded) {
      badgeColor = AppCultureColors.gold;
      badgeBg = AppCultureColors.rewardBg;
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppCultureColors.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      ticket.ticketCode,
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 1,
                        color: AppCultureColors.heritageJade,
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: badgeBg,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        ticket.statusLabel,
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: badgeColor,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Text(
                  ticket.tourName,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    color: AppCultureColors.textDark,
                  ),
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    const Icon(Icons.location_on_outlined, size: 14, color: AppCultureColors.textMuted),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        ticket.destination,
                        style: const TextStyle(fontSize: 13, color: AppCultureColors.textMuted),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Giá: ${ticket.price}',
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppCultureColors.textDark),
                    ),
                    Text(
                      'Cổng: ${ticket.paymentGateway}',
                      style: const TextStyle(fontSize: 13, color: AppCultureColors.textMuted),
                    ),
                  ],
                ),
              ],
            ),
          ),

          // Dashed border separator
          Container(
            height: 1,
            color: AppCultureColors.border,
          ),

          // Action row
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Hiệu lực: ${ticket.validDate}',
                  style: const TextStyle(fontSize: 12, color: AppCultureColors.textMuted),
                ),
                if (ticket.isActive)
                  InkWell(
                    onTap: () => _showQrDialog(ticket),
                    borderRadius: BorderRadius.circular(10),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: AppCultureColors.heritageJade,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Row(
                        children: [
                          Icon(Icons.qr_code_rounded, color: Colors.white, size: 16),
                          SizedBox(width: 6),
                          Text(
                            'Mở mã QR',
                            style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 12),
                          ),
                        ],
                      ),
                    ),
                  )
                else
                  Text(
                    ticket.isUsed ? 'Đã quét qua cổng' : 'Đã hoàn tiền vào ví',
                    style: const TextStyle(fontSize: 12, color: AppCultureColors.textMuted, fontStyle: FontStyle.italic),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
