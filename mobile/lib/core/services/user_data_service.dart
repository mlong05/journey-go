import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/journey_model.dart';
import '../models/ticket_model.dart';

class UserDataService {
  static final UserDataService _instance = UserDataService._internal();
  factory UserDataService() => _instance;
  UserDataService._internal();

  static const String _kUserPointsKey = 'journeygo_user_points';
  static const String _kTimelineKey = 'journeygo_user_timeline';
  static const String _kBadgesKey = 'journeygo_user_badges';
  static const String _kTicketsKey = 'journeygo_user_tickets';
  static const String _kMissionsKey = 'journeygo_active_missions';

  // ===========================================================================
  // 1. ĐIỂM THƯỞNG & HẠNG THÀNH VIÊN
  // ===========================================================================
  Future<int> getUserPoints() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getInt(_kUserPointsKey) ?? 350;
  }

  Future<void> addPoints(int points) async {
    final prefs = await SharedPreferences.getInstance();
    final current = await getUserPoints();
    await prefs.setInt(_kUserPointsKey, current + points);
  }

  String getRankTier(int points) {
    if (points >= 1000) return 'Bạch Kim';
    if (points >= 500) return 'Hạng Vàng';
    if (points >= 200) return 'Hạng Bạc';
    return 'Hạng Đồng';
  }

  // ===========================================================================
  // 2. NHẬT KÝ HÀNH TRÌNH (TIMELINE)
  // ===========================================================================
  Future<List<JourneyTimelineItem>> getTimeline() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_kTimelineKey);
    if (raw != null && raw.isNotEmpty) {
      try {
        final List<dynamic> list = jsonDecode(raw);
        return list.map((e) => JourneyTimelineItem.fromJson(e)).toList();
      } catch (_) {}
    }
    return _getDefaultTimeline();
  }

  Future<void> addTimelineItem(JourneyTimelineItem item) async {
    final current = await getTimeline();
    current.insert(0, item);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      _kTimelineKey,
      jsonEncode(current.map((e) => e.toJson()).toList()),
    );
  }

  List<JourneyTimelineItem> _getDefaultTimeline() {
    return [
      JourneyTimelineItem(
        id: 'checkin_001',
        siteName: 'Văn Miếu - Quốc Tử Giám',
        location: 'Đống Đa, Hà Nội',
        checkinDate: '05/03/2026 - 09:30',
        method: 'QR Code Scan',
        rewardPoints: '+100 pts',
        photoUrl: 'assets/images/vanmieu.png',
        caption: 'Chiêm ngưỡng 82 bia tiến sĩ và lầu Khuê Văn Các trong nắng sớm tinh khôi.',
        lat: 21.0277,
        lng: 105.8351,
      ),
      JourneyTimelineItem(
        id: 'checkin_002',
        siteName: 'Hoàng Thành Thăng Long',
        location: 'Ba Đình, Hà Nội',
        checkinDate: '28/02/2026 - 15:15',
        method: 'GPS Check-in',
        rewardPoints: '+100 pts',
        photoUrl: 'assets/images/thanglong.png',
        caption: 'Ghé thăm cổng Đoan Môn và khu di tích khảo cổ ngàn năm vương triều Đại Việt.',
        lat: 21.0364,
        lng: 105.8353,
      ),
      JourneyTimelineItem(
        id: 'checkin_003',
        siteName: 'Làng Gốm Bát Tràng',
        location: 'Gia Lâm, Hà Nội',
        checkinDate: '15/02/2026 - 11:00',
        method: 'QR Code Scan',
        rewardPoints: '+80 pts',
        photoUrl: 'assets/images/gomsu.png',
        caption: 'Trải nghiệm tự tay chuốt gốm và chiêm ngưỡng lò bầu cổ hơn 100 năm.',
        lat: 20.9785,
        lng: 105.9126,
      ),
    ];
  }

  // ===========================================================================
  // 3. BỘ SƯU TẬP HUY HIỆU DI SẢN
  // ===========================================================================
  Future<List<BadgeItem>> getBadges() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_kBadgesKey);
    if (raw != null && raw.isNotEmpty) {
      try {
        final List<dynamic> list = jsonDecode(raw);
        return list.map((e) => BadgeItem.fromJson(e)).toList();
      } catch (_) {}
    }
    return _getDefaultBadges();
  }

  Future<void> unlockBadge(String badgeId) async {
    final badges = await getBadges();
    for (var i = 0; i < badges.length; i++) {
      if (badges[i].id == badgeId) {
        badges[i] = BadgeItem(
          id: badges[i].id,
          name: badges[i].name,
          imageUrl: badges[i].imageUrl,
          earnedAt: 'Hôm nay',
          category: badges[i].category,
          description: badges[i].description,
          isUnlocked: true,
        );
      }
    }
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      _kBadgesKey,
      jsonEncode(badges.map((e) => e.toJson()).toList()),
    );
  }

  List<BadgeItem> _getDefaultBadges() {
    return [
      BadgeItem(
        id: 'badge_thang_long',
        name: 'Dấu Ấn Thăng Long',
        imageUrl: 'assets/images/thanglong.png',
        earnedAt: '10/01/2026',
        category: 'Lịch sử',
        description: 'Hoàn thành check-in và khám phá cụm di tích Hoàng Thành Thăng Long – Hà Nội.',
        isUnlocked: true,
      ),
      BadgeItem(
        id: 'badge_gom_su',
        name: 'Tinh Hoa Gốm Sứ',
        imageUrl: 'assets/images/gomsu.png',
        earnedAt: '22/01/2026',
        category: 'Làng nghề',
        description: 'Trải nghiệm tự tay nặn gốm tại Lò Bầu Cổ Bát Tràng hơn 700 năm tuổi.',
        isUnlocked: true,
      ),
      BadgeItem(
        id: 'badge_trang_an',
        name: 'Cố Đô Tràng An',
        imageUrl: 'assets/images/trangan.png',
        earnedAt: '14/02/2026',
        category: 'Danh thắng',
        description: 'Chinh phục danh thắng Di sản Kép thế giới Quần thể Tràng An – Ninh Bình.',
        isUnlocked: true,
      ),
      BadgeItem(
        id: 'badge_giai_do',
        name: 'Bậc Thầy Giải Đố',
        imageUrl: 'assets/images/vanmieu.png',
        earnedAt: '01/03/2026',
        category: 'Tri thức',
        description: 'Trả lời chính xác các câu đố lịch sử tại Văn Miếu – Quốc Tử Giám.',
        isUnlocked: true,
      ),
    ];
  }

  // ===========================================================================
  // 4. VÍ VÉ & CHI PHÍ DU LỊCH (TICKETS)
  // ===========================================================================
  Future<List<TicketModel>> getTickets() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_kTicketsKey);
    if (raw != null && raw.isNotEmpty) {
      try {
        final List<dynamic> list = jsonDecode(raw);
        return list.map((e) => TicketModel.fromJson(e)).toList();
      } catch (_) {}
    }
    return _getDefaultTickets();
  }

  Future<void> addTicket(TicketModel ticket) async {
    final current = await getTickets();
    current.insert(0, ticket);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      _kTicketsKey,
      jsonEncode(current.map((e) => e.toJson()).toList()),
    );
  }

  List<TicketModel> _getDefaultTickets() {
    return [
      TicketModel(
        ticketCode: 'VK-2026-089',
        tourName: 'Hành Trình Ngàn Năm Văn Hiến',
        destination: 'Văn Miếu & Hoàng Thành Thăng Long',
        price: '80.000 đ',
        numericPrice: 80000,
        status: 'ACTIVE',
        statusLabel: 'Còn hiệu lực',
        purchaseDate: '10:30 - Hôm nay',
        validDate: '18/09/2026 - 20/09/2026',
        paymentGateway: 'VNPay',
        transactionId: 'VNP-9823419082',
        qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=VIETCULTURE_VK-2026-089_ACTIVE',
        holderName: 'Nguyễn An',
        passengerCount: 1,
        benefits: [
          'Vé vào cổng di tích ưu tiên (không cần xếp hàng đổi vé giấy)',
          'Trợ lý AI thuyết minh cá nhân hóa qua tai nghe',
          'Tham gia giải đố văn hóa tương tác nhận huy hiệu độc quyền',
          'Bảo hiểm du lịch nội địa theo lượt tham quan',
        ],
      ),
      TicketModel(
        ticketCode: 'VK-2026-042',
        tourName: 'Khám Phá Lò Bầu Cổ Bát Tràng',
        destination: 'Bảo tàng Gốm & Làng cổ Bát Tràng',
        price: 'Miễn phí',
        numericPrice: 0,
        status: 'USED',
        statusLabel: 'Đã sử dụng',
        purchaseDate: '08:10 - 05/09/2026',
        validDate: '05/09/2026',
        usedAt: '10:10 - 05/09/2026 tại Cửa Soát Vé Lò Bầu',
        paymentGateway: 'MoMo',
        transactionId: 'MOMO-77123901',
        qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=VIETCULTURE_VK-2026-042_USED',
        holderName: 'Nguyễn An',
        passengerCount: 1,
        benefits: [
          'Vé vào cổng di tích Lò Bầu Cổ',
          'Trợ lý AI thuyết minh quy trình nung gốm 5 màu men',
          'Tham gia giải đố nhận huy hiệu "Tinh Hoa Gốm Sứ"',
        ],
      ),
      TicketModel(
        ticketCode: 'VK-2026-031',
        tourName: 'Dấu Ấn Hoàng Thành Thăng Long',
        destination: 'Khu di tích Trung tâm Hoàng thành Thăng Long',
        price: '50.000 đ',
        numericPrice: 50000,
        status: 'USED',
        statusLabel: 'Đã sử dụng',
        purchaseDate: '13:00 - 12/09/2026',
        validDate: '12/09/2026',
        usedAt: '15:40 - 12/09/2026 tại Cổng Đoan Môn',
        paymentGateway: 'VNPay',
        transactionId: 'VNP-124950821',
        qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=VIETCULTURE_VK-2026-031_USED',
        holderName: 'Nguyễn An',
        passengerCount: 1,
        benefits: [
          'Vé vào cổng di tích khảo cổ 18 Hoàng Diệu & Điện Kính Thiên',
          'Trợ lý AI thuyết minh lịch sử triều đại',
          'Tham gia giải đố nhận huy hiệu "Dấu Ấn Thăng Long"',
        ],
      ),
      TicketModel(
        ticketCode: 'VK-2026-015',
        tourName: 'Tour Đêm Văn Miếu: Tinh Hoa Đạo Học',
        destination: 'Văn Miếu - Quốc Tử Giám',
        price: '120.000 đ',
        numericPrice: 120000,
        status: 'REFUNDED',
        statusLabel: 'Đã hoàn tiền',
        purchaseDate: '19:00 - 28/08/2026',
        validDate: '30/08/2026',
        refundedAt: '10:30 - 29/08/2026',
        paymentGateway: 'MoMo',
        transactionId: 'MOMO-99381200',
        qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=VIETCULTURE_VK-2026-015_REFUNDED',
        holderName: 'Nguyễn An',
        passengerCount: 1,
        benefits: [
          'Vé vào cổng di tích chương trình đêm kết hợp trình diễn 3D Mapping',
          'Trợ lý AI thuyết minh chuyên đề Văn Miếu',
          'Tham gia giải đố nhận huy hiệu đặc biệt',
        ],
      ),
    ];
  }

  // ===========================================================================
  // 6. NHIỆM VỤ ĐANG HOẠT ĐỘNG (ACTIVE MISSIONS)
  // ===========================================================================
  Future<List<ActiveMission>> getMissions() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_kMissionsKey);
    if (raw != null && raw.isNotEmpty) {
      try {
        final List<dynamic> list = jsonDecode(raw);
        return list.map((e) => ActiveMission.fromJson(e)).toList();
      } catch (_) {}
    }
    return _getDefaultMissions();
  }

  Future<void> completeMission(String missionId) async {
    final missions = await getMissions();
    for (var m in missions) {
      if (m.id == missionId) {
        m.isCompleted = true;
      }
    }
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      _kMissionsKey,
      jsonEncode(missions.map((e) => e.toJson()).toList()),
    );
  }

  List<ActiveMission> _getDefaultMissions() {
    return [
      ActiveMission(
        id: 'mission_001',
        siteName: 'Văn Miếu – Quốc Tử Giám',
        title: 'Bí Ẩn Khuê Văn Các',
        rewardPoints: 50,
        question: 'Khuê Văn Các tại Văn Miếu được xây dựng vào thời kỳ nào?',
        options: [
          'A. Thời Lý (Năm 1070)',
          'B. Thời Lê Sơ (Năm 1484)',
          'C. Thời Nguyễn (Năm 1805)',
          'D. Thời Trần (Năm 1253)',
        ],
        correctIndex: 2,
        explanation: 'Khuê Văn Các được Tổng trấn Nguyễn Văn Thành cho khởi công xây dựng vào năm 1805 dưới triều vua Gia Long nhà Nguyễn.',
      ),
      ActiveMission(
        id: 'mission_002',
        siteName: 'Hoàng Thành Thăng Long',
        title: 'Cột Cờ Hà Nội Kỳ Đài',
        rewardPoints: 75,
        question: 'Cột Cờ Hà Nội (Kỳ Đài) được hoàn thành xây dựng vào năm nào?',
        options: [
          'A. Năm 1010',
          'B. Năm 1812',
          'C. Năm 1954',
          'D. Năm 1888',
        ],
        correctIndex: 1,
        explanation: 'Kỳ Đài Hà Nội được xây dựng từ năm 1805 và hoàn thành năm 1812 dưới thời nhà Nguyễn, cao hơn 33 mét.',
      ),
      ActiveMission(
        id: 'mission_003',
        siteName: 'Làng Gốm Bát Tràng',
        title: 'Kỹ Thuật Men Rạn Cổ',
        rewardPoints: 60,
        question: 'Dòng men đặc trưng độc bản chỉ có tại làng gốm Bát Tràng là men gì?',
        options: [
          'A. Men rạn cổ truyền',
          'B. Men sứ pha lê',
          'C. Men cát thô',
          'D. Men huỳnh quang',
        ],
        correctIndex: 0,
        explanation: 'Men rạn là loại men gốm độc đáo được tạo ra bởi sự chênh lệch độ co giữa xương gốm và men, nổi tiếng từ thế kỷ 16.',
      ),
    ];
  }
}
