import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/models/destination_model.dart';
import '../../core/services/destination_service.dart';
import '../modals/payment_modal.dart';

class ExploreTab extends StatefulWidget {
  const ExploreTab({super.key});

  @override
  State<ExploreTab> createState() => _ExploreTabState();
}

class _ExploreTabState extends State<ExploreTab> {
  final DestinationService _destinationService = DestinationService();
  final TextEditingController _searchController = TextEditingController();
  final TextEditingController _aiChatController = TextEditingController();

  List<DestinationModel> _allRoutes = [];
  bool _isLoading = true;

  // Mode: 'direct' or 'ai'
  String _activeMode = 'direct';

  // Filters for Direct mode
  String _selectedCategory = 'all';
  String _searchQuery = '';

  // AI chat messages
  final List<Map<String, dynamic>> _aiMessages = [
    {
      'isUser': false,
      'text':
          'Xin chào bạn! Mình là Trợ lý AI Di Sản Việt Nam. Hãy chọn gợi ý nhanh bên dưới hoặc nhắn cho mình sở thích, thời gian rảnh để mình lên lịch trình du lịch văn hóa tối ưu nhất nhé! 🏛️✨',
    },
  ];

  final List<String> _aiQuickChips = [
    'Rảnh buổi chiều tại Hà Nội ☕',
    'Thích tự tay làm gốm & chụp ảnh 🏺',
    'Tour di tích lịch sử UNESCO 🏛️',
    'Khám phá Tràng An 1 ngày có chèo thuyền 🚣',
  ];

  @override
  void initState() {
    super.initState();
    _loadRoutes();
  }

  @override
  void dispose() {
    _searchController.dispose();
    _aiChatController.dispose();
    super.dispose();
  }

  Future<void> _loadRoutes() async {
    setState(() => _isLoading = true);
    final list = await _destinationService.getApprovedDestinations();
    if (mounted) {
      setState(() {
        _allRoutes = list;
        _isLoading = false;
      });
    }
  }

  List<DestinationModel> get _filteredRoutes {
    return _allRoutes.where((r) {
      final matchesSearch = _searchQuery.isEmpty ||
          r.name.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          r.address.toLowerCase().contains(_searchQuery.toLowerCase());

      final matchesCategory = _selectedCategory == 'all' ||
          r.category == _selectedCategory ||
          (_selectedCategory == 'free' && r.numericPrice == 0);

      return matchesSearch && matchesCategory;
    }).toList();
  }

  void _sendAiMessage(String query) {
    if (query.trim().isEmpty) return;

    setState(() {
      _aiMessages.add({'isUser': true, 'text': query});
    });
    _aiChatController.clear();

    Future.delayed(const Duration(milliseconds: 600), () {
      if (!mounted) return;

      String aiReply = '';
      final lower = query.toLowerCase();

      if (lower.contains('chiều') || lower.contains('buổi chiều')) {
        aiReply =
            'Lịch trình buổi chiều tại Hà Nội gợi ý:\n1. 14:00: Ghé thăm Di tích Nhà tù Hỏa Lò (1.5h)\n2. 16:00: Dạo quanh Cột Cờ Hà Nội và Hoàng Thành Thăng Long đón hoàng hôn\n3. 18:00: Thưởng thức cà phê trứng phố cổ Nguyễn Hữu Huân ☕';
      } else if (lower.contains('gốm') || lower.contains('bát tràng')) {
        aiReply =
            'Lịch trình trải nghiệm gốm Bát Tràng:\n1. 08:30: Đến chợ gốm và Lò Bầu Cổ\n2. 09:30: Tự tay xoay bàn gốm và nặn bình hoa men rạn\n3. 11:00: Tham quan Trung tâm Tinh hoa Làng nghề Việt 🏺';
      } else if (lower.contains('tràng an') || lower.contains('ninh bình')) {
        aiReply =
            'Tour Tràng An 1 ngày tuyệt đẹp:\n1. 08:00: Xuất phát từ Hà Nội\n2. 10:00: Ngồi thuyền tuyến 3 qua hang Mây, đền Suối Tiên (3h)\n3. 14:00: Viếng thăm Quần thể chùa Bái Đính linh thiêng 🚣';
      } else {
        aiReply =
            'Dựa trên sở thích của bạn, mình đề xuất tuyến "Hành Trình Ngàn Năm Văn Hiến" kết hợp Văn Miếu - Quốc Tử Giám và Hoàng Thành Thăng Long. Tuyến này có điểm check-in GPS nhận +150 điểm thưởng và giải đố nhận huy hiệu độc quyền!';
      }

      setState(() {
        _aiMessages.add({'isUser': false, 'text': aiReply});
      });
    });
  }

  void _openPaymentModal(DestinationModel route) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => PaymentModal(route: route),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppCultureColors.background,
      body: SafeArea(
        child: Column(
          children: [
            // Top Bar
            _buildTopBar(),

            // Mode Selector: Tìm trực tiếp vs AI Lập Tour
            _buildModeSelector(),

            // Main Content Area
            Expanded(
              child: _activeMode == 'direct' ? _buildDirectModeView() : _buildAiModeView(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTopBar() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          const Row(
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Lộ Trình Du Lịch Văn Hóa',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                      color: AppCultureColors.textDark,
                    ),
                  ),
                  SizedBox(height: 2),
                  Text(
                    'Khám phá di sản Việt Nam thông minh',
                    style: TextStyle(fontSize: 12, color: AppCultureColors.textMuted),
                  ),
                ],
              ),
            ],
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: AppCultureColors.oceanLight,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppCultureColors.oceanBlue.withOpacity(0.2)),
            ),
            child: const Row(
              children: [
                Icon(Icons.location_on_rounded, size: 14, color: AppCultureColors.oceanBlue),
                SizedBox(width: 4),
                Text(
                  'Hà Nội',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: AppCultureColors.oceanBlue,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildModeSelector() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: AppCultureColors.surfaceSubtle,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          Expanded(
            child: GestureDetector(
              onTap: () => setState(() => _activeMode = 'direct'),
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 10),
                decoration: BoxDecoration(
                  color: _activeMode == 'direct' ? Colors.white : Colors.transparent,
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: _activeMode == 'direct'
                      ? [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.06),
                            blurRadius: 4,
                            offset: const Offset(0, 2),
                          ),
                        ]
                      : null,
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.search_rounded,
                      size: 18,
                      color: _activeMode == 'direct' ? AppCultureColors.oceanBlue : AppCultureColors.textMuted,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      'Tìm trực tiếp',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: _activeMode == 'direct' ? AppCultureColors.oceanBlue : AppCultureColors.textMuted,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          Expanded(
            child: GestureDetector(
              onTap: () => setState(() => _activeMode = 'ai'),
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 10),
                decoration: BoxDecoration(
                  color: _activeMode == 'ai' ? Colors.white : Colors.transparent,
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: _activeMode == 'ai'
                      ? [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.06),
                            blurRadius: 4,
                            offset: const Offset(0, 2),
                          ),
                        ]
                      : null,
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.auto_awesome_rounded,
                      size: 18,
                      color: _activeMode == 'ai' ? const Color(0xFFD946EF) : AppCultureColors.textMuted,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      'AI Lập Tour',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: _activeMode == 'ai' ? const Color(0xFFD946EF) : AppCultureColors.textMuted,
                      ),
                    ),
                    const SizedBox(width: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFDF2F8),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: const Text(
                        'AI',
                        style: TextStyle(
                          fontSize: 9,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFFD946EF),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDirectModeView() {
    return Column(
      children: [
        // Search bar
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
          child: TextField(
            controller: _searchController,
            onChanged: (val) => setState(() => _searchQuery = val),
            decoration: InputDecoration(
              hintText: 'Tìm Văn Miếu, Bát Tràng, Tràng An...',
              hintStyle: const TextStyle(fontSize: 13, color: AppCultureColors.textLight),
              prefixIcon: const Icon(Icons.search_rounded, color: AppCultureColors.textMuted, size: 20),
              filled: true,
              fillColor: Colors.white,
              contentPadding: const EdgeInsets.symmetric(vertical: 12),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: const BorderSide(color: AppCultureColors.border),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: const BorderSide(color: AppCultureColors.border),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: const BorderSide(color: AppCultureColors.oceanBlue, width: 1.5),
              ),
            ),
          ),
        ),

        // Filter chips horizontal list
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
          child: Row(
            children: [
              _buildCategoryChip('all', 'Tất cả'),
              const SizedBox(width: 8),
              _buildCategoryChip('history', 'Di tích lịch sử'),
              const SizedBox(width: 8),
              _buildCategoryChip('craft', 'Làng nghề'),
              const SizedBox(width: 8),
              _buildCategoryChip('scenery', 'Danh thắng di sản'),
              const SizedBox(width: 8),
              _buildCategoryChip('free', 'Miễn phí vé'),
            ],
          ),
        ),

        // Count status & sort indicator
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Tìm thấy ${_filteredRoutes.length} lộ trình di sản',
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: AppCultureColors.textMuted,
                ),
              ),
              const Row(
                children: [
                  Icon(Icons.near_me_outlined, size: 14, color: AppCultureColors.oceanBlue),
                  SizedBox(width: 4),
                  Text(
                    'Sắp xếp theo gợi ý',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: AppCultureColors.oceanBlue,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),

        // Routes list
        Expanded(
          child: _isLoading
              ? const Center(child: CircularProgressIndicator(color: AppCultureColors.heritageJade))
              : ListView.builder(
                  padding: const EdgeInsets.only(left: 16, right: 16, bottom: 90),
                  itemCount: _filteredRoutes.length,
                  itemBuilder: (context, idx) {
                    final route = _filteredRoutes[idx];
                    return _buildFullRouteCard(route);
                  },
                ),
        ),
      ],
    );
  }

  Widget _buildCategoryChip(String id, String label) {
    final isSelected = _selectedCategory == id;

    return GestureDetector(
      onTap: () => setState(() => _selectedCategory = id),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? AppCultureColors.oceanBlue : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? AppCultureColors.oceanBlue : AppCultureColors.border,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: isSelected ? FontWeight.w700 : FontWeight.w600,
            color: isSelected ? Colors.white : AppCultureColors.textDark,
          ),
        ),
      ),
    );
  }

  Widget _buildFullRouteCard(DestinationModel route) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
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
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Cover photo with price, duration, rating pills
          SizedBox(
            height: 170,
            width: double.infinity,
            child: Stack(
              fit: StackFit.expand,
              children: [
                ClipRRect(
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(21)),
                  child: Image.asset(route.coverImage, fit: BoxFit.cover),
                ),
                // Gradient for text legibility
                Container(
                  decoration: BoxDecoration(
                    borderRadius: const BorderRadius.vertical(top: Radius.circular(21)),
                    gradient: LinearGradient(
                      colors: [Colors.black.withOpacity(0.3), Colors.transparent, Colors.black.withOpacity(0.75)],
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                    ),
                  ),
                ),
                // Top Left Badges: Price & Duration
                Positioned(
                  top: 10,
                  left: 10,
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(
                          color: route.numericPrice > 0 ? Colors.white : AppCultureColors.heritageJade,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(
                          route.ticketPrice,
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w800,
                            color: route.numericPrice > 0 ? AppCultureColors.textDark : Colors.white,
                          ),
                        ),
                      ),
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                        decoration: BoxDecoration(
                          color: Colors.black.withOpacity(0.65),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.schedule_rounded, color: Colors.white, size: 12),
                            const SizedBox(width: 4),
                            Text(
                              route.duration,
                              style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                // Top Right Rating
                Positioned(
                  top: 10,
                  right: 10,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.92),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.star_rounded, color: AppCultureColors.gold, size: 14),
                        const SizedBox(width: 2),
                        Text(
                          '${route.rating}',
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800),
                        ),
                      ],
                    ),
                  ),
                ),
                // Bottom Title & Location
                Positioned(
                  bottom: 12,
                  left: 14,
                  right: 14,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.location_on_rounded, size: 13, color: Colors.white70),
                          const SizedBox(width: 4),
                          Text(
                            route.address.split(',').last.trim(),
                            style: const TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.w600),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            route.rewardPoints,
                            style: const TextStyle(color: AppCultureColors.rewardBorder, fontSize: 11, fontWeight: FontWeight.w800),
                          ),
                        ],
                      ),
                      const SizedBox(height: 2),
                      Text(
                        route.name,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Khám phá trái tim lịch sử với không gian kiến trúc văn hóa và vương triều Đại Việt ngàn năm.',
                  style: const TextStyle(fontSize: 13, color: AppCultureColors.textMuted, height: 1.35),
                ),

                const SizedBox(height: 14),

                // Stops container
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: AppCultureColors.surfaceSubtle,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'TRẠM DỪNG CHÂN THỰC TẾ (${route.stops.length} ĐIỂM ĐẾN)',
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.8,
                          color: AppCultureColors.oceanBlue,
                        ),
                      ),
                      const SizedBox(height: 10),
                      ...route.stops.map((stop) {
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: Row(
                            children: [
                              Container(
                                width: 20,
                                height: 20,
                                decoration: const BoxDecoration(
                                  color: AppCultureColors.oceanBlue,
                                  shape: BoxShape.circle,
                                ),
                                child: Center(
                                  child: Text(
                                    '${stop.order}',
                                    style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w800),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  stop.name,
                                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppCultureColors.textDark),
                                ),
                              ),
                              Text(
                                stop.duration,
                                style: const TextStyle(fontSize: 12, color: AppCultureColors.textMuted),
                              ),
                            ],
                          ),
                        );
                      }),
                    ],
                  ),
                ),

                const SizedBox(height: 14),

                // CTA Button
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton(
                    onPressed: () => _openPaymentModal(route),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: route.numericPrice > 0 ? AppCultureColors.oceanBlue : AppCultureColors.heritageJade,
                      foregroundColor: Colors.white,
                      elevation: 0,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    child: Text(
                      route.numericPrice > 0
                          ? 'Thanh toán ${route.ticketPrice} để mở khóa >'
                          : 'Khám phá miễn phí ngay >',
                      style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAiModeView() {
    return Column(
      children: [
        // AI Chat Messages List
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: _aiMessages.length,
            itemBuilder: (context, idx) {
              final msg = _aiMessages[idx];
              final isUser = msg['isUser'] == true;

              return Align(
                alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
                child: Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.all(14),
                  constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.8),
                  decoration: BoxDecoration(
                    color: isUser ? const Color(0xFFD946EF) : Colors.white,
                    borderRadius: BorderRadius.circular(18),
                    border: isUser ? null : Border.all(color: AppCultureColors.border),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.03),
                        blurRadius: 6,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Text(
                    msg['text'],
                    style: TextStyle(
                      fontSize: 14,
                      color: isUser ? Colors.white : AppCultureColors.textDark,
                      height: 1.4,
                    ),
                  ),
                ),
              );
            },
          ),
        ),

        // Quick Suggestion Chips
        SizedBox(
          height: 38,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: _aiQuickChips.length,
            itemBuilder: (context, idx) {
              final chip = _aiQuickChips[idx];
              return GestureDetector(
                onTap: () => _sendAiMessage(chip),
                child: Container(
                  margin: const EdgeInsets.only(right: 8),
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFDF4FF),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFF0ABFC)),
                  ),
                  child: Text(
                    chip,
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFFC026D3)),
                  ),
                ),
              );
            },
          ),
        ),

        const SizedBox(height: 10),

        // Chat input bar
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          decoration: const BoxDecoration(
            color: Colors.white,
            border: Border(top: BorderSide(color: AppCultureColors.border)),
          ),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _aiChatController,
                  onSubmitted: _sendAiMessage,
                  decoration: InputDecoration(
                    hintText: 'Nhắn cho AI: Điểm bạn muốn đến, thời gian...',
                    hintStyle: const TextStyle(fontSize: 13, color: AppCultureColors.textLight),
                    filled: true,
                    fillColor: AppCultureColors.surfaceSubtle,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(20),
                      borderSide: const BorderSide(color: AppCultureColors.border),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(20),
                      borderSide: const BorderSide(color: AppCultureColors.border),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(20),
                      borderSide: const BorderSide(color: Color(0xFFD946EF), width: 1.5),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              IconButton(
                onPressed: () => _sendAiMessage(_aiChatController.text),
                icon: const Icon(Icons.send_rounded, color: Color(0xFFD946EF)),
                style: IconButton.styleFrom(
                  backgroundColor: const Color(0xFFFDF4FF),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
