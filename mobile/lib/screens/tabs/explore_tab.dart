import 'package:flutter/foundation.dart' show ValueListenable;
import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/services/area_service.dart';
import '../common/heritage_motion.dart';
import '../common/tab_refresh.dart';
import '../tours/my_tours_view.dart';
import '../tours/tour_browse_view.dart';

class ExploreTab extends StatefulWidget {
  final ValueListenable<int>? selectedTab;

  const ExploreTab({super.key, this.selectedTab});

  @override
  State<ExploreTab> createState() => _ExploreTabState();
}

class _ExploreTabState extends State<ExploreTab> with RefreshOnTabReturn {

  @override
  ValueListenable<int>? get selectedTab => widget.selectedTab;

  @override
  int get tabIndex => 1;

  @override
  void onTabReturn() => setState(() => _refreshToken++);

  /// Tăng mỗi lần quay lại tab để trang Khám phá / Tour của tôi tải lại dữ liệu.
  int _refreshToken = 0;
  final TextEditingController _aiChatController = TextEditingController();

  // Trang đang mở: 'direct' (khám phá tour), 'mine' (tour đã mua) hoặc 'ai'
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
    _loadArea();
  }

  /// Tỉnh/thành du khách đang đứng (GPS + Goong); null thì ẩn nhãn vị trí.
  String? _area;

  Future<void> _loadArea() async {
    final area = await AreaService.currentProvince();
    if (mounted && area != null) setState(() => _area = area);
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
              child: AnimatedSwitcher(
                duration: reduceMotion(context) ? Duration.zero : const Duration(milliseconds: 260),
                transitionBuilder: (child, anim) => FadeTransition(
                  opacity: anim,
                  child: SlideTransition(
                    position: Tween(begin: const Offset(0, 0.03), end: Offset.zero).animate(anim),
                    child: child,
                  ),
                ),
                child: KeyedSubtree(
                  key: ValueKey(_activeMode),
                  child: switch (_activeMode) {
                    'mine' => MyToursView(
                      refreshToken: _refreshToken,
                      onExplore: () => setState(() => _activeMode = 'direct'),
                    ),
                    'ai' => _buildAiModeView(),
                    _ => TourBrowseView(refreshToken: _refreshToken),
                  },
                ),
              ),
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
        children: [
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ShimmerText(
                  'Lộ Trình Du Lịch Văn Hóa',
                  shine: AppCultureColors.gold,
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: AppCultureColors.textDark,
                  ),
                ),
                SizedBox(height: 2),
                Text(
                  'Khám phá di sản Việt Nam thông minh',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(fontSize: 12, color: AppCultureColors.textMuted),
                ),
              ],
            ),
          ),
          // Tỉnh/thành theo GPS; chưa biết thì không hiện
          if (_area != null)
            Container(
              constraints: const BoxConstraints(maxWidth: 140),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: AppCultureColors.oceanLight,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppCultureColors.oceanBlue.withValues(alpha: 0.2)),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.location_on_rounded, size: 14, color: AppCultureColors.oceanBlue),
                  const SizedBox(width: 4),
                  Flexible(
                    child: Text(
                      _area!,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: AppCultureColors.oceanBlue,
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

  static const _modes = <({String id, String label, IconData icon, Color color})>[
    (id: 'direct', label: 'Khám phá', icon: Icons.travel_explore_rounded, color: AppCultureColors.heritageJade),
    (id: 'mine', label: 'Tour của tôi', icon: Icons.confirmation_number_rounded, color: AppCultureColors.amberDark),
    (id: 'ai', label: 'AI gợi ý', icon: Icons.auto_awesome_rounded, color: Color(0xFFD946EF)),
  ];

  /// Ba trang của tab: viên chọn trắng trượt theo mục đang chọn.
  Widget _buildModeSelector() {
    final index = _modes.indexWhere((m) => m.id == _activeMode);
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      padding: const EdgeInsets.all(4),
      height: 48,
      decoration: BoxDecoration(
        color: AppCultureColors.surfaceSubtle,
        borderRadius: BorderRadius.circular(16),
      ),
      // expand: hàng chữ cao bằng cả khung để chữ nằm giữa theo chiều dọc, khớp với viên chọn
      child: Stack(
        fit: StackFit.expand,
        children: [
          AnimatedAlign(
            alignment: Alignment(-1 + index * 1.0, 0),
            duration: reduceMotion(context) ? Duration.zero : const Duration(milliseconds: 280),
            curve: Curves.easeOutCubic,
            child: FractionallySizedBox(
              widthFactor: 1 / _modes.length,
              heightFactor: 1,
              child: Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: [
                    BoxShadow(color: Colors.black.withValues(alpha: 0.07), blurRadius: 6, offset: const Offset(0, 2)),
                  ],
                ),
              ),
            ),
          ),
          Row(
            children: [
              for (final m in _modes)
                Expanded(
                  child: GestureDetector(
                    behavior: HitTestBehavior.opaque,
                    onTap: () => setState(() => _activeMode = m.id),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(m.icon, size: 17, color: _activeMode == m.id ? m.color : AppCultureColors.textMuted),
                        const SizedBox(width: 5),
                        Flexible(
                          child: AnimatedDefaultTextStyle(
                            duration: const Duration(milliseconds: 200),
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: _activeMode == m.id ? FontWeight.w700 : FontWeight.w500,
                              color: _activeMode == m.id ? m.color : AppCultureColors.textMuted,
                            ),
                            child: Text(m.label, maxLines: 1, overflow: TextOverflow.ellipsis),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
            ],
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
                        color: Colors.black.withValues(alpha: 0.03),
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
