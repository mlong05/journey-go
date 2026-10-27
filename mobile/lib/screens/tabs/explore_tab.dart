import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../tours/tour_browse_view.dart';

class ExploreTab extends StatefulWidget {
  const ExploreTab({super.key});

  @override
  State<ExploreTab> createState() => _ExploreTabState();
}

class _ExploreTabState extends State<ExploreTab> {
  final TextEditingController _aiChatController = TextEditingController();

  // Mode: 'direct' or 'ai'
  String _activeMode = 'direct';

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
  }

  @override
  void dispose() {
    _aiChatController.dispose();
    super.dispose();
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
              child: _activeMode == 'direct' ? const TourBrowseView() : _buildAiModeView(),
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
