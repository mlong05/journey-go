-- =====================================================================================
--  SEED — 20 TOUR ĐÃ XUẤT BẢN (PUBLISHED), CHƯA CÓ BOOKING / PAYMENT
--
--  Mục đích: nạp dữ liệu tour "đẹp" vào PostgreSQL để test giao diện tìm kiếm /
--  chi tiết tour / đặt tour mà không phải tạo tay.
--
--  Đặc điểm dữ liệu:
--   • 20 tour theo LUỒNG 5 BƯỚC (tour_format khác null ⇒ isWizardTour() = true)
--     → có tour_prices (giá theo loại khách), tour_slots, tour_stops, quiz, trải nghiệm.
--   • status = 'PUBLISHED', approved = true, content_rights_confirmed = true.
--   • Mỗi tour có 1 tour_reviews ở trạng thái 'APPROVED' (đúng như Moderator duyệt thật)
--     + tour_review_history (SUBMITTED → APPROVED) + điểm thưởng đã chốt.
--   • KHÔNG tạo booking / payment / refund / revenue — dữ liệu sạch để test từ đầu.
--
--  IDEMPOTENT: chạy lại nhiều lần vẫn an toàn — tour đã tồn tại (theo title) sẽ bị bỏ qua.
--
--  Cách chạy:
--     psql -h localhost -U postgres -d journeygo_db -f seed_published_tours.sql
--
--  Lưu ý: ảnh dùng placeholder https://picsum.photos/... (URL thật, ảnh thật) —
--  thay bằng URL Cloudinary thật khi cần dùng cho demo chính thức.
-- =====================================================================================

DO $$
DECLARE
    -- Tài khoản đối tác (CONTENT_PROVIDER có hồ sơ provider_profiles đang hoạt động)
    v_provider  bigint;
    -- Kiểm duyệt viên
    v_moderator bigint;

    v_spec     jsonb;
    v_tour     jsonb;
    v_stop     jsonb;
    v_tour_id  bigint;
    v_stop_id  bigint;
    v_qid      bigint;
    v_exp_id   bigint;
    v_review_id bigint;
    v_title    text;
    v_ord      int;
    v_i        int;
    v_j        int;
    v_idx      int;
    v_slot_cap int;
    v_dep      date;
    v_deps     date[] := ARRAY[]::date[];
    v_answers  text[];
    v_correct  text;
BEGIN
    -- ── Chọn tài khoản đối tác & kiểm duyệt viên từ dữ liệu hiện có ──────────────
    SELECT u.id INTO v_provider
    FROM users u
             JOIN roles r ON r.id = u.role_id
             JOIN provider_profiles p ON p.user_id = u.id
    WHERE r.name = 'CONTENT_PROVIDER' AND p.active = TRUE AND u.active = TRUE
    ORDER BY u.id
    LIMIT 1;

    SELECT u.id INTO v_moderator
    FROM users u JOIN roles r ON r.id = u.role_id
    WHERE r.name = 'CONTENT_MODERATOR' AND u.active = TRUE
    ORDER BY u.id
    LIMIT 1;

    IF v_provider IS NULL OR v_moderator IS NULL THEN
        RAISE EXCEPTION 'Thiếu tài khoản CONTENT_PROVIDER hoặc CONTENT_MODERATOR trong DB.';
    END IF;

    -- ── Đặc tả 20 tour ─────────────────────────────────────────────────────────
    v_spec := $json$
[
  {
    "title": "Hoa Lư cố đô – Tam Cốc huyền thoại",
    "type": "ECOTOURISM", "format": "MULTI_DAY",
    "region": 1, "theme": 2, "days": 2, "nights": 1, "minutes": null,
    "capacity": 20, "adult": 1200000, "child": 600000, "toddler": 150000,
    "desc": "Hai ngày quay về kinh đô đầu tiên của nhà Trần, nơi thung lũng sông Ninh Bình mở ra những dòng sông xanh biếc và những vách núi khoét sâu nghìn năm.",
    "highlights": [
      "Thuyền 3 cửa qua các hang động ngầm của Tam Cốc",
      "Tham quan đền Trình – nơi thờ Đinh Bộ Lĩnh",
      "Cảnh quan đồng ruộng và vịnh đầm trên đất Ninh Bình"
    ],
    "stops": [
      {"n": "Cố đô Hoa Lư", "d": "Thành cổ nhà Trần giữa lòng núi, nơi những đền thờ và cung điện còn giữ nguyên vẻ cổ.", "f": "Kiến trúc đền thờ thời Trần còn nguyên vẹn giữa núi", "lat": 20.0500, "lng": 105.9500},
      {"n": "Khu du lịch Tam Cốc", "d": "Ba dòng sông uốn lượn ăn vào lòng vách đá vôi, tạo nên những hang động thông tới tận nơi.", "f": "Ba dòng sông và hệ thống hang động ngầm dưới lòng đá vôi", "lat": 20.0620, "lng": 105.9620},
      {"n": "Đền Trình", "d": "Ngôi đền thờ Đinh Tiên Hoàng và Lê Thái Tổ trên đỉnh núi Hoa Lư.", "f": "Ngôi đền thờ Đinh Tiên Hoàng và Lê Thái Tổ trên đỉnh núi", "lat": 20.0740, "lng": 105.9400}
    ]
  },
  {
    "title": "Phố cổ Hà Nội và Văn Miếu Quốc Tử Giám",
    "type": "HISTORICAL", "format": "DAY_TRIP",
    "region": 1, "theme": 1, "days": 1, "nights": 0, "minutes": 300,
    "capacity": 25, "adult": 450000, "child": 250000, "toddler": 80000,
    "desc": "Một ngày đi qua hai mốc lịch sử lớn của Hà Nội: những con phố cổ và trường đại học đầu tiên của đất nước.",
    "highlights": [
      "Dạo phố cổ Hoàn Kiếm với 36 phố phường và 40 di tích lịch sử",
      "Chiêm ngắm 107 môn xuất tại Văn Miếu Quốc Tử Giám",
      "Ăn phở và bánh cuốn đường vỉa hè như người Hà Nội gốc"
    ],
    "stops": [
      {"n": "Phố cổ Hoàn Kiếm", "d": "Những con phố nhỏ lát đá của khu phố 36 phố, đầy chuyện kể về hành trình thăng long.", "f": "Mạng lưới 36 phố cổ với 40 di tích lịch sử được bảo tồn", "lat": 21.0280, "lng": 105.8500},
      {"n": "Văn Miếu Quốc Tử Giám", "d": "Trường đại học đầu tiên của Việt Nam, nơi học viện chương và sử chép của triều Nguyễn từng đào tạo.", "f": "Trường đại học đầu tiên của Việt Nam với 107 môn xuất", "lat": 21.0277, "lng": 105.8351},
      {"n": "Hỏa Lò và hồ Hoàn Kiếm", "d": "Cây đa bao năm bên hồ Tây, nơi huyền thoại về Đinh Tiên Hoàng và công chúa Tiên Dung đã trở thành ca dao.", "f": "Cây đa thiêng bao năm bên hồ Hoàn Kiếm với ca dao ngàn năm", "lat": 21.0483, "lng": 105.8368}
    ]
  },
  {
    "title": "Sa Pa – mảnh đất trên mây",
    "type": "MOUNTAIN", "format": "MULTI_DAY",
    "region": 1, "theme": 2, "days": 3, "nights": 2, "minutes": null,
    "capacity": 15, "adult": 2100000, "child": 1050000, "toddler": 250000,
    "desc": "Ba ngày trên vùng đất cao nguyên phía tây Bắc Bộ, nơi ruộng bậc thang tựa sóng và đồng trẩ Tày vẫn giữ nếp nhà sàn truyền thống.",
    "highlights": [
      "Chinh phục đỉnh Fansipan – đỉnh núi cao nhất Việt Nam",
      "Dạo thung lũng Hoàng Su Phì giữa ruộng bậc thang vàng ươm",
      "Ghé thăm nhà sàn và bảo tàng chè Tày ở bản Mường Hoa"
    ],
    "stops": [
      {"n": "Chợ nổi Tày Sa Pa", "d": "Chợ phiên đầu tuần trên đỉnh thị trấn, nơi người Tày, H'mông và Kinh mua bán những sản vật tươi.", "f": "Chợ phiên của đồng bào Tày, H'mông với sản vật tươi mỗi sáng thứ hai", "lat": 22.3364, "lng": 103.8438},
      {"n": "Đỉnh Fansipan", "d": "Đỉnh núi cao nhất Việt Nam, nơi khí lạnh và mây trắng biển mơ trên độ cao 3.143 m.", "f": "Đỉnh núi cao nhất Việt Nam ở độ cao 3.143 mét", "lat": 22.3030, "lng": 103.7710},
      {"n": "Thác Bạc Sa Pa", "d": "Thác nước đổ từ độ cao trên tuyến đường Bản Hạ – thác Bạc, phong cảnh hùng vĩ giữa rừng núi.", "f": "Thác nước đổ từ độ cao trên tuyến đường Bản Hạ", "lat": 22.3650, "lng": 103.8480}
    ]
  },
  {
    "title": "Hạ Long – vịnh biển trong lòng đá",
    "type": "ECOTOURISM", "format": "DAY_TRIP",
    "region": 1, "theme": 3, "days": 1, "nights": 0, "minutes": 420,
    "capacity": 30, "adult": 950000, "child": 500000, "toddler": 120000,
    "desc": "Một ngày trên vịnh Hạ Long – Di sản Thiên nhiên Thế giới – nơi hàng nghìn đảo đá vươn lên từ làng biển trong sương.",
    "highlights": [
      "Du thuyền tham quan hàng trăm đảo đá kỳ lạ",
      "Kayak tự do trong vịnh Lan Hạ",
      "Trải nghiệm nấu ăn trên thuyền với hải sản tươi"
    ],
    "stops": [
      {"n": "Vịnh Hạ Long", "d": "Di sản Thiên nhiên Thế giới UNESCO với hơn 1.600 đảo đá vôi và hàng trăm hang ngầm.", "f": "Hơn 1.600 đảo đá vôi và hàng trăm hang ngầm", "lat": 20.9100, "lng": 107.1839},
      {"n": "Đảo Cát Bà", "d": "Đảo lớn nhất vịnh Hạ Long, nơi có động Đều Tiên và động Thiên Cầm.", "f": "Hệ thống động kỳ ngạo và động thiên nhiên Cát Bà", "lat": 20.8200, "lng": 107.1000},
      {"n": "Bãi tắm Bãi Cháy", "d": "Bãi biển đá cuội hiếm có giữa vịnh biển, thích hợp để ngắm bình minh trên biển.", "f": "Bãi biển đá cuội hiếm có nằm giữa lòng vịnh", "lat": 20.9050, "lng": 107.0900}
    ]
  },
  {
    "title": "Đồng Văn – cao nguyên đá và tranh Bazan",
    "type": "GASTRONOMY", "format": "MULTI_DAY",
    "region": 1, "theme": 3, "days": 2, "nights": 1, "minutes": null,
    "capacity": 16, "adult": 1350000, "child": 700000, "toddler": 180000,
    "desc": "Hai ngày trên Cao nguyên Đồng Văn – Cần Thơ, nơi đá xám địa tầng và tranh Bazan kể một câu chuyện về văn hóa Tày vùng cao.",
    "highlights": [
      "Ngắm thápng Pù Luông – thápng gió giữa cao nguyên",
      "Đi bộ phố cổ Đồng Văn và tham quan nhà trình Tày",
      "Thưởng thức món phở thịt chó và mận hậu giòn ngon đặc sản Cao Bằng"
    ],
    "stops": [
      {"n": "Phố cổ Đồng Văn", "d": "Những mái nhà đá xám san sát nhau dọc con đường nhỏ, mang vẻ đặc sắc của thị trấn nguyên bản.", "f": "Kiến trúc nhà đá xám đặc trưng của thị trấn nguyên bản", "lat": 23.3667, "lng": 104.9667},
      {"n": "Đèo Bảo Lạc", "d": "Vùng đất thiêng của người Cao Lan với những đứng đá và tập tục thờ cúng.", "f": "Vùng đất thiêng của người Cao Lan với đứng đá và tập tục thờ cúng", "lat": 22.8300, "lng": 105.1400},
      {"n": "Bảo tàng tranh Bazan", "d": "Không gian trưng bày nét vẽ sơn mài của dân tộc Tày với chất cỏ cây, nhựa cây và mực.", "f": "Nét tranh sơn mài dùng cỏ cây, nhựa cây và mực truyền thống", "lat": 23.3740, "lng": 104.9740}
    ]
  },
  {
    "title": "Ninh Bình – thủy triều và lò gốm Bát Tràng",
    "type": "CULTURAL", "format": "DAY_TRIP",
    "region": 1, "theme": 2, "days": 1, "nights": 0, "minutes": 360,
    "capacity": 24, "adult": 780000, "child": 400000, "toddler": 100000,
    "desc": "Một ngày nối ba câu chuyện: núi chúa Yên Tử, vùng đồng bằng ngập nước và làng gốm hơn nghìn năm tuổi.",
    "highlights": [
      "Ngắm cảnh non nước và thung lũng Tràng An từ trên thuyền",
      "Ném gốm cùng nghệ nhân tại làng gốm Bát Tràng",
      "Tham quan vườn quốc gia Vân Long trên đảo chim"
    ],
    "stops": [
      {"n": "Núi Yên Tử", "d": "Đỉnh núi thiêng với đền thờ Trần Hưng Đạo, biểu tượng của lòng yêu nước và nghĩa khí.", "f": "Đỉnh núi thiêng có đền thờ Trần Hưng Đạo", "lat": 20.2540, "lng": 105.9760},
      {"n": "Làng gốm Bát Tràng", "d": "Cái nôi của nghề gốm Việt Nam, nơi đất nung và nước lửa tạo nên những mảnh men lam rực rỡ.", "f": "Cái nôi của nghề gốm Việt Nam với men lam đặc trưng", "lat": 20.9785, "lng": 105.9126},
      {"n": "Vườn quốc gia Vân Long", "d": "Vùng đất ngập nước với hàng nghìn đảo xanh và những đàn chim trú ẩn trong rừng ngập.", "f": "Vùng đất ngập nước với đàn chim trú ẩn trong rừng", "lat": 20.2270, "lng": 105.9100}
    ]
  },
  {
    "title": "Huế – cố đô của nhà Nguyễn",
    "type": "HISTORICAL", "format": "MULTI_DAY",
    "region": 2, "theme": 1, "days": 3, "nights": 2, "minutes": null,
    "capacity": 18, "adult": 2400000, "child": 1200000, "toddler": 300000,
    "desc": "Ba ngày đi qua ba thế kỷ của cố đô Huế, nơi kiến trúc phong thuỷ Đông hòa với dòng sông Hương và nhã nhạc cung đình.",
    "highlights": [
      "Dạo Đại Nội – kinh thành, hoàng thành và tử cấm thành",
      "Nghe ca Huế và thưởng thức nghệ thuật ca trùm Thang Long",
      "Tham quan các lăng tẩm vua và chùa Thiên Mụ bên dòng sông Hương"
    ],
    "stops": [
      {"n": "Đại Nội Huế", "d": "Quần thể kiến trúc cung đình trung tâm của cố đô, gồm kinh thành, hoàng thành và tử cấm thành.", "f": "Quần thể ba vòng thành lồng vào nhau của triều đình nhà Nguyễn", "lat": 16.0544, "lng": 107.2020},
      {"n": "Chùa Thiên Mụ", "d": "Ngôi chùa cổ nhất Huế với chiếc tháp Phước Duyên cao 21 m và cây phượng già hơn 300 năm.", "f": "Chiếc tháp Phước Duyên 21 mét và cây phượng hơn 300 năm tuổi", "lat": 16.0620, "lng": 107.1890},
      {"n": "Lăng Tự Đức", "d": "Lăng điện của vua Tự Đức – vị vua cuối cùng nhà Nguyễn, nơi ông sống và ngồi thiền suốt 10 năm.", "f": "Lăng điện của vị vua cuối cùng triều Nguyễn", "lat": 16.0580, "lng": 107.1930}
    ]
  },
  {
    "title": "Hội An – phố cổ và nghề dệt nước",
    "type": "CULTURAL", "format": "DAY_TRIP",
    "region": 2, "theme": 2, "days": 1, "nights": 0, "minutes": 300,
    "capacity": 22, "adult": 620000, "child": 320000, "toddler": 90000,
    "desc": "Một ngày chậm rãi bên dòng sông Hoài, nơi những mái ngói cong và đèn lồng cổ tự bắt đầu thắp lên lúc hoàng hôn.",
    "highlights": [
      "Đi bộ phố cổ Hội An và ngắm cầu Cầu Nhật cầu gốm",
      "Tham quan làng dệt truyền thống và dệt tay ở Trà Quế",
      "Thưởng thức cao lầu, bánh bèo và chè bắp đêm"
    ],
    "stops": [
      {"n": "Phố cổ Hội An", "d": "Những ngôi nhà cổ trên bờ sông Hoài với cửa gỗ, hiên trầm và những chiếc đèn lồng đỏ.", "f": "Kiến trúc nhà cổ ven sông Hoài với những chiếc đèn lồng đỏ", "lat": 15.8801, "lng": 108.3380},
      {"n": "Chùa Cầu", "d": "Cầu gốm kiểu Nhật nằm giữa dòng sông Thu Bồn, nơi người Hội An gọi là Cầu Cảm Hứng.", "f": "Cầu gốm kiểu Nhật giữa dòng sông Thu Bồn", "lat": 15.8790, "lng": 108.3430},
      {"n": "Làng dệt Trà Quế", "d": "Làng dệt nước mộc nổi tiếng của Hội An, nơi dệt thủ công ra những tấm lụa mỏng như mây.", "f": "Nghề dệt thủ công tạo ra những tấm lụa mỏng như mây", "lat": 15.8990, "lng": 108.2900}
    ]
  },
  {
    "title": "Phong Nha – hang động và rừng quốc gia",
    "type": "ADVENTURE", "format": "MULTI_DAY",
    "region": 2, "theme": 2, "days": 2, "nights": 1, "minutes": null,
    "capacity": 18, "adult": 1450000, "child": 750000, "toddler": 190000,
    "desc": "Hai ngày giữa vùng đất karst, nơi những hang động kỳ vĩ nằm dưới lớp đá vôi dày và rừng phòng chống Ke Bàng vẫn còn nguyên.",
    "highlights": [
      "Khám phá hang Sơn Đoòng và hang nước hang Nơm",
      "Đi bộ rừng phòng chống Ke Bàng và đến đảo Cồi Cỏi",
      "Trải nghiệm chèo thuyền kayak trên sông Đuồng"
    ],
    "stops": [
      {"n": "Hang Sơn Đoòng", "d": "Hang động lớn nhất thế giới, nơi có cả rừng cây, dòng sông ngầm và những đám mây mọc bên trong hang.", "f": "Hang động lớn nhất thế giới có rừng cây và sông ngầm bên trong", "lat": 17.7550, "lng": 106.2870},
      {"n": "Bãi đá Hòn Chồng", "d": "Bãi đá vôi đầy thú vị nằm giữa sông, nơi nước rào đá tạo nên những vũng nước xanh trong.", "f": "Bãi đá vôi giữa sông với những vũng nước xanh trong", "lat": 17.7460, "lng": 106.3760},
      {"n": "Vườn quốc gia Phong Nha – Ke Bàng", "d": "Rừng nhiệt đới nguyên sinh trên núi karst, nơi có hàng trăm loài chim và thú hoang.", "f": "Rừng nhiệt đới nguyên sinh trên núi karst với hàng trăm loài chim", "lat": 17.6000, "lng": 106.2500}
    ]
  },
  {
    "title": "Đà Nẵng – cầu vàng và bán đảo Sơn Trà",
    "type": "BEACH", "format": "DAY_TRIP",
    "region": 2, "theme": 2, "days": 1, "nights": 0, "minutes": 300,
    "capacity": 25, "adult": 650000, "child": 350000, "toddler": 100000,
    "desc": "Một ngày nắng của Đà Nẵng: cầu Rồng thở phun lửa, bãi biển Mỹ Khê và đường mây trên đỉnh Sơn Trà.",
    "highlights": [
      "Ngắm biểu diễn lửa và nước của cầu Rồng vào 9 giờ tối",
      "Tắm biển tại bãi Mỹ Khê – bãi biển được Forbes chọn",
      "Lên đỉnh Sơn Trà ngắm toàn cảnh thành phố"
    ],
    "stops": [
      {"n": "Cầu Rồng", "d": "Cầu thép dài 125 m nối hai bờ sông Hàn, biểu tượng mới của Đà Nẵng.", "f": "Cầu thép dài 125 mét nối hai bờ sông Hàn", "lat": 16.0544, "lng": 108.2020},
      {"n": "Bãi biển Mỹ Khê", "d": "Bãi cát vàng được Forbes bình chọn là bãi biển quyến rũ nhất hành tinh.", "f": "Bãi cát vàng được Forbes bình chọn là bãi biển đẹp nhất thế giới", "lat": 16.0630, "lng": 108.2200},
      {"n": "Chùa Linh Ứng và Sơn Trà", "d": "Ngôi chùa Bảo Thiên trên đỉnh bán đảo, nơi có tượng Phật Bà Tây cao 27 m.", "f": "Ngôi chùa Bảo Thiên với tượng Phật Bà Tây cao 27 mét", "lat": 16.1090, "lng": 108.2280}
    ]
  },
  {
    "title": "Mỹ Sơn – dòng chảy kiến trúc Champa",
    "type": "HISTORICAL", "format": "DAY_TRIP",
    "region": 2, "theme": 1, "days": 1, "nights": 0, "minutes": 300,
    "capacity": 20, "adult": 520000, "child": 280000, "toddler": 80000,
    "desc": "Một ngày giữa thung lũng Bờ Yêu, nơi những tháp gạch Cham vẫn đứng vững sau hơn mười thế kỷ và là Di sản Thế giới.",
    "highlights": [
      "Tham quan 11 nhóm tháp Cham còn lại trong thung lũng Bờ Yêu",
      "Nghe thuyền thuyết về vị linh hồng và vùng đất linh thiêng",
      "Xem trình diễn lửa và trò đùa cũ của người Chăm"
    ],
    "stops": [
      {"n": "Thung lũng Mỹ Sơn", "d": "Thung lũng với 11 nhóm tháp gạch, trong đó nhóm A và H là tiêu biểu nhất.", "f": "11 nhóm tháp gạch Cham còn lại trong thung lũng Bờ Yêu", "lat": 15.6600, "lng": 108.1200},
      {"n": "Bảo tàng Chăm Đà Nẵng", "d": "Nơi trưng bày hơn 300 hiện vật Cham gồm linga, tượng thần và đồ gốm thời.", "f": "Bộ sưu tập hơn 300 hiện vật Chăm gồm linga và đồ gốm thời", "lat": 16.0560, "lng": 108.2060},
      {"n": "Làng Chăm Mỹ Sơn", "d": "Ngôi làng của người Chăm Mỹ Sơn, nơi nghệ thuật sơn mài và dệt thổ còn sống trong đời thường.", "f": "Ngôi làng Chăm Mỹ Sơn với nghệ thuật sơn mài và dệt thổ", "lat": 15.6700, "lng": 108.1150}
    ]
  },
  {
    "title": "Mì Quảng, bún bò Huế và cao lầu Hội An",
    "type": "GASTRONOMY", "format": "DAY_TRIP",
    "region": 2, "theme": 3, "days": 1, "nights": 0, "minutes": 300,
    "capacity": 16, "adult": 480000, "child": 250000, "toddler": 70000,
    "desc": "Một ngày ăn đi ba vùng miền, từ mì Quảng nước dập của Quảng Nam đến bún bò Huế và chiếc cao lầu Hội An.",
    "highlights": [
      "Nếm thử mì Quảng đúng gu vị Quảng Nam",
      "Đi tìm quán bún bò Huế trong hẻm nhỏ ven sông Hương",
      "Trải nghiệm làm cao lầu và nước mắm truyền thống"
    ],
    "stops": [
      {"n": "Phố ẩm thực Huế", "d": "Những quán bún bò, bánh bèo và chè bắp gia truyền dọc các con đường nhỏ.", "f": "Hàng quán bún bò và bánh bèo gia truyền dọc phố Huế", "lat": 16.0500, "lng": 107.1900},
      {"n": "Phố ẩm thực Quảng Nam", "d": "Nơi mì Quảng được nấu trên vỉ nước với mì sợi và nước dập thơm lừng.", "f": "Mì Quảng nấu trên vỉ nước với nước dập thơm lừng", "lat": 15.8700, "lng": 108.3800},
      {"n": "Phố ẩm thực Hội An", "d": "Cao lầu, mì Quảng, bánh mì và nước mắm truyền thống bày bán trên phố cổ.", "f": "Cao lầu và nước mắm truyền thống bày bán trên phố cổ", "lat": 15.8810, "lng": 108.3370}
    ]
  },
  {
    "title": "Nha Trang – vinh biển và tháp Chàm",
    "type": "ECOTOURISM", "format": "MULTI_DAY",
    "region": 2, "theme": 2, "days": 2, "nights": 1, "minutes": null,
    "capacity": 20, "adult": 1250000, "child": 650000, "toddler": 160000,
    "desc": "Hai ngày ở vịnh biển Nha Trang, nơi tháp Ponagar của người Cham đứng cạnh bãi biển và những đảo ngoài khơi.",
    "highlights": [
      "Tham quan khu tháp Cham Ponagar – Pa Nagar",
      "Lặn ngắm san hô ở vịnh Nha Trang",
      "Trải nghiệm lên thuyền câu cá và ăn hải sản ngoài khơi"
    ],
    "stops": [
      {"n": "Tháp Bà Ponagar", "d": "Tháp Cham gốm được xây từ thế kỷ IV, nằm ngay giữa đô thị Nha Trang.", "f": "Tháp gốm Cham thế kỷ IV nằm ngay giữa đô thị", "lat": 12.2220, "lng": 109.1960},
      {"n": "Hòn Tre", "d": "Hòn đảo nhỏ giữa vịnh với bãi biển êm, nơi thuyền câu và ăn hải sản tấm sáng.", "f": "Hòn đảo nhỏ với bãi biển êm và thuyền câu ăn hải sản", "lat": 12.2100, "lng": 109.2150},
      {"n": "Viện Hải Thương Học", "d": "Bảo tàng sinh học biển với mẫu vật quý hiếm từ các vùng biển Việt Nam.", "f": "Bảo tàng sinh học biển với mẫu vật quý hiếm các vùng biển", "lat": 12.2380, "lng": 109.1960}
    ]
  },
  {
    "title": "Sài Gòn – chốn ăn ngon phố thị",
    "type": "CULTURAL", "format": "MULTI_DAY",
    "region": 3, "theme": 3, "days": 3, "nights": 2, "minutes": null,
    "capacity": 22, "adult": 1650000, "child": 850000, "toddler": 200000,
    "desc": "Ba ngày trong thành phố không ngừng chuyển động, từ chợ Bến Thành đến những căn xe đẩy bán bánh mì nước ốt lúc rạng sáng.",
    "highlights": [
      "Dạo chợ Bến Thành và khu chợ Bình Tây với hàng trăm món ăn",
      "Đi ăn sáng bánh mì ốt, hủ tiếu và bánh cuốn trên xe đẩy",
      "Tham quan Bảo tàng Chứng tích lịch sử và Nhà thờ Đức Bà"
    ],
    "stops": [
      {"n": "Chợ Bến Thành", "d": "Biểu tượng của Sài Gòn với mái vòm giống lời vòng sóng, quanh năm kín người.", "f": "Chợ lớn bậc nhất thành phố với mái vòm hình lời sóng", "lat": 10.7780, "lng": 106.6970},
      {"n": "Bảo tàng Chứng tích lịch sử", "d": "Ngôi nhà Bạch Đằng lịch sử nơi diễn ra Hội nghị Bạch Đằng năm 1975.", "f": "Ngôi nhà lịch sử nơi diễn ra Hội nghị Bạch Đằng", "lat": 10.7820, "lng": 106.6920},
      {"n": "Khu phố ẩm thực Bình Tây", "d": "Một sân chợ đêm với hàng trăm gian hàng bán đặc sản và đồ ăn vặt đường phố.", "f": "Sân chợ đêm với hàng trăm gian hàng đặc sản", "lat": 10.7560, "lng": 106.6890}
    ]
  },
  {
    "title": "Cần Thơ – miền Tây sông nước",
    "type": "GASTRONOMY", "format": "DAY_TRIP",
    "region": 3, "theme": 3, "days": 1, "nights": 0, "minutes": 300,
    "capacity": 18, "adult": 720000, "child": 380000, "toddler": 100000,
    "desc": "Một ngày trên sông Cù Lao Giêng, nơi chợ nổi Cái Răng, lò gốm Thanh Hà và những món bánh nước miền Tây tụ họp.",
    "highlights": [
      "Đi chợ nổi Cái Răng lúc 5 giờ sáng",
      "Ném gốm tại lò gốm Thanh Hà hơn 100 năm tuổi",
      "Thưởng thức bánh xèo, bánh cống và bánh bò ướt miền Tây"
    ],
    "stops": [
      {"n": "Chợ nổi Cái Răng", "d": "Chợ nổi lớn nhất miền Tây, nơi thuyền chài lênh đengh và giao thương ngay trên sông.", "f": "Chợ nổi lớn nhất miền Tây với thuyền giao thương trên sông", "lat": 10.0560, "lng": 105.7880},
      {"n": "Lò gốm Thanh Hà", "d": "Lò gốm cổ hơn 100 năm vẫn nung bằng củi, cho ra những sản phẩm men rám nổi bật.", "f": "Lò gốm cổ hơn 100 năm vẫn nung bằng củi", "lat": 10.0520, "lng": 105.7200},
      {"n": "Bến Ninh Kiệt", "d": "Bến sông sầm uất nơi bán cá, tôm cua và trái cây miền Tây trực tiếp từ thuyền.", "f": "Bến sông sầm uất bán hải sản và trái cây miền Tây", "lat": 10.0340, "lng": 105.7860}
    ]
  },
  {
    "title": "Đà Lạt – thành phố ngàn hoa",
    "type": "ECOTOURISM", "format": "MULTI_DAY",
    "region": 3, "theme": 2, "days": 3, "nights": 2, "minutes": null,
    "capacity": 20, "adult": 1500000, "child": 780000, "toddler": 190000,
    "desc": "Ba ngày trong cao nguyên Lâm Viên, nơi sương mù quấn lấy đồi chè và những biệt thự cổ kiểu Pháp.",
    "highlights": [
      "Chèo kayak trên hồ Tuyền Tùng giữa sương mù",
      "Tham quan đồi chè Trà Bom và thung lũng Tà Lê",
      "Điểm danh những biệt thự cổ và chợ đêm Đà Lạt"
    ],
    "stops": [
      {"n": "Thung lũng Tà Lê", "d": "Cao nguyên đồi chè uốn lượn nơi có thể đi bộ và ngắm mây ở độ cao 1.500 m.", "f": "Cao nguyên đồi chè uốn lượn ở độ cao 1.500 mét", "lat": 11.8800, "lng": 108.4900},
      {"n": "Hồ Tuyền Tùng", "d": "Hồ nước nhân tạo với rừng thông bao quanh, nơi có trải nghiệm chèo kayak buổi sớm.", "f": "Hồ nước nhân tạo giữa rừng thông với trải nghiệm kayak", "lat": 11.9350, "lng": 108.4500},
      {"n": "Đồi chè Trà Bom", "d": "Đồi chè trên đỉnh cao với quán trà vườn nhìn xuống thung lũng mây.", "f": "Đồi chè trên đỉnh cao với quán trà vườn", "lat": 11.9100, "lng": 108.5350}
    ]
  },
  {
    "title": "Côn Đảo – bí mật vùng biển xanh",
    "type": "ADVENTURE", "format": "MULTI_DAY",
    "region": 3, "theme": 2, "days": 2, "nights": 1, "minutes": null,
    "capacity": 12, "adult": 1900000, "child": 950000, "toddler": 240000,
    "desc": "Hai ngày trên đảo Côn Sơn, nơi nhà tù Pháp, rừng quốc gia Côn Đảo và những bãi biển hoang sơ cùng tồn tại.",
    "highlights": [
      "Tham quan nhà tù Côn Đảo và bảo tàng chiến tranh",
      "Lặn ngắm rạn san hô tại Hòn Bảy Cạnh",
      "Ngắm rùng tràm Côn Đảo và bãi biển An Bình"
    ],
    "stops": [
      {"n": "Bảo tàng Côn Sơn", "d": "Di tích nhà tù Pháp và bảo tàng lịch sử chiến tranh nằm trong khu nghỉ dưỡng Nam Dương.", "f": "Di tích nhà tù Pháp và bảo tàng lịch sử chiến tranh", "lat": 10.5260, "lng": 107.2200},
      {"n": "Hòn Bảy Cạnh", "d": "Vùng biển lặng với rạn san hô đầy màu sắc, điểm lặn nổi tiếng quanh đảo.", "f": "Vùng biển lặng với rạn san hô đầy màu sắc", "lat": 10.4400, "lng": 107.2300},
      {"n": "Rừng quốc gia Côn Đảo", "d": "Rừng ngập mặn trên đảo với hệ động vật hoang dã như gấu rừng Côn Đảo.", "f": "Rừng ngập mặn với hệ động vật hoang dã gấu rừng Côn Đảo", "lat": 10.5350, "lng": 107.1950}
    ]
  },
  {
    "title": "Phú Quốc – hoàng hôn và làng chài",
    "type": "BEACH", "format": "MULTI_DAY",
    "region": 3, "theme": 2, "days": 3, "nights": 2, "minutes": null,
    "capacity": 22, "adult": 1850000, "child": 950000, "toddler": 240000,
    "desc": "Ba ngày ở hòn đảo ngọc, nơi bãi Sao cát trắng và những làng chài ven biển vẫn giữ nếp sống nguyên bản.",
    "highlights": [
      "Ngắm hoàng hôn tại bãi Sao và bãi Vườn Tre",
      "Tham quan vườn quốc gia Phú Quốc và làng chài Hàm Ninh",
      "Trải nghiệm lặn ngầm và câu cá đầu sáng"
    ],
    "stops": [
      {"n": "Bãi Sao", "d": "Bãi biển cát trắng dài hơn 4 km, nơi hoàng hôn đổ màu cam đào trên mặt biển.", "f": "Bãi biển cát trắng dài hơn 4 kilomet", "lat": 10.1900, "lng": 103.8700},
      {"n": "Vườn quốc gia Phú Quốc", "d": "Khu bảo tồn thiên nhiên với rừng nguyên sinh và các loài động vật quý hiếm.", "f": "Khu bảo tồn thiên nhiên với rừng nguyên sinh và loài quý hiếm", "lat": 10.3200, "lng": 104.0200},
      {"n": "Làng chài Hàm Ninh", "d": "Làng chài ngoài khơi yên bình nơi du khách vẫn ăn cơm tàu cùng ngư dân.", "f": "Làng chài ngoài khơi yên bình ăn cơm tàu cùng ngư dân", "lat": 10.3400, "lng": 104.0200}
    ]
  },
  {
    "title": "Rừng tràm Trà Sư – xứ sen",
    "type": "ECOTOURISM", "format": "MULTI_DAY",
    "region": 3, "theme": 2, "days": 2, "nights": 1, "minutes": null,
    "capacity": 16, "adult": 980000, "child": 520000, "toddler": 130000,
    "desc": "Hai ngày giữa vùng đồng bằng An Giang, nơi rừng tràm Trà Sư chanh sương và đầm Thị Tường mở ra trước mắt.",
    "highlights": [
      "Đi xuồng ba tàu vào rừng tràm Trà Sư",
      "Ngắm đầm Thị Tường vào lúc bình minh",
      "Tham quan U Minh Hạ và rừng tràm lớn nhất Đồng bằng sông Cửu Long"
    ],
    "stops": [
      {"n": "Rừng tràm Trà Sư", "d": "Rừng tràm rộng hơn 1.200 ha nơi du khách ngồi xuồng ba tàu len lỏi qua từng nhánh tràm.", "f": "Rừng tràm rộng hơn 1.200 héctar đi bằng ba tàu", "lat": 10.4500, "lng": 105.2500},
      {"n": "Đầm Thị Tường", "d": "Vùng đất ngập nước rộng lớn nơi mỗi sớm có những chiếc xuồng câu lưới trôi trên mặt nước.", "f": "Vùng đất ngập nước rộng lớn với xuồng câu lưới mờ sương", "lat": 10.4300, "lng": 105.2700},
      {"n": "U Minh Hạ", "d": "Vùng rừng tràm rộng lớn thuộc vùng đất ngập nước lớn nhất Đồng bằng sông Cửu Long.", "f": "Vùng rừng tràm rộng lớn thuộc vùng đất ngập nước lớn nhất", "lat": 10.3000, "lng": 105.0800}
    ]
  },
  {
    "title": "Bến Tre – xứ dừa xứ mè",
    "type": "CULTURAL", "format": "DAY_TRIP",
    "region": 3, "theme": 3, "days": 1, "nights": 0, "minutes": 300,
    "capacity": 20, "adult": 560000, "child": 300000, "toddler": 85000,
    "desc": "Một ngày ở xứ dừa Bến Tre, nơi kẹo dừa, nước mắm và những chiếc ghe ba lá nằm nghiêng bên kênh rừng dừa.",
    "highlights": [
      "Tham quan lò kẹo dừa truyền thống và thử nếm kẹo",
      "Đi xuồng ba lá qua rừng dừa nước Cầu Xảo",
      "Tham quan làng nước mắm Phú Phụng và kho hải sản"
    ],
    "stops": [
      {"n": "Lò kẹo dừa Bến Tre", "d": "Nơi kẹo được nấu trong lò củi cổ và vỏ dừa được đốt để sấy nước mắm.", "f": "Nghề nấu kẹo dừa trong lò củi cổ và đốt vỏ dừa sấy nước mắm", "lat": 10.2400, "lng": 106.3700},
      {"n": "Rừng dừa Bến Tre", "d": "Cánh rừng dừa xanh mướt bao quanh những con kênh nước tĩnh lặng.", "f": "Cánh rừng dừa bao quanh những con kênh nước tĩnh lặng", "lat": 10.2600, "lng": 106.4000},
      {"n": "Làng nước mắm Phú Phụng", "d": "Các nhà tạm hương dầu đứng san sát ven kênh, nơi nước mắm được ủ chượp trong những bình gốm lớn.", "f": "Những bình gốm lớn ủ chượp nước mắm ven kênh", "lat": 10.2250, "lng": 106.3900}
    ]
  }
]
$json$;

    -- ═══════════════════════════════════════════════════════════════════════════
    --  Vòng lặp từng tour
    -- ═══════════════════════════════════════════════════════════════════════════
    FOR v_tour IN SELECT * FROM jsonb_array_elements(v_spec) LOOP
        v_title := v_tour ->> 'title';

        -- Bỏ qua nếu tour đã tồn tại (idempotent)
        CONTINUE WHEN EXISTS (SELECT 1 FROM tours WHERE title = v_title);

        v_slot_cap := (v_tour ->> 'capacity')::int;

        -- Lịch khởi hành: 6 ngày, mỗi tuần một lần, bắt đầu từ 20 ngày sau
        v_deps := ARRAY[]::date[];
        FOR v_i IN 1..6 LOOP
            v_dep := (CURRENT_DATE + (19 + v_i * 7));
            v_deps := v_deps || v_dep;
        END LOOP;

        -- ── 1. Insert tour ─────────────────────────────────────────────────────
        INSERT INTO tours (
            title, tour_type, duration_days, start_date, end_date, approved, status,
            cover_image_url, deleted, created_by, created_at, updated_at,
            tour_format, duration_minutes, duration_nights, region_id, theme_id,
            description, price_includes, price_excludes, force_majeure, refund_policy,
            contact_info, cancellation_policy, max_guests_per_slot,
            content_rights_confirmed, version_number, submitted_at, published_at
        )
        VALUES (
            v_title,
            v_tour ->> 'type',
            (v_tour ->> 'days')::int,
            v_deps[1],
            v_deps[1] + ((v_tour ->> 'nights')::int),
            TRUE,
            'PUBLISHED',
            'https://picsum.photos/seed/jg' || substr(md5(v_title), 1, 8) || '/1200/800',
            FALSE,
            v_provider,
            NOW(),
            NOW(),
            v_tour ->> 'format',
            (v_tour ->> 'minutes')::int,
            (v_tour ->> 'nights')::int,
            (v_tour ->> 'region')::int,
            (v_tour ->> 'theme')::int,
            v_tour ->> 'desc',
            'Vé tham quan, hướng dẫn viên chuyên nghiệp, nước uống trong suốt hành trình, vé thuyền/xe đưa đón nội thành theo lịch trình.',
            'Chi phí ăn uống ngoài lịch trình, quà lưu niệm, phí tham quan bổ sung, tiền tip cho hướng dẫn viên.',
            'Trường hợp thiên tai, dịch bệnh hoặc thay đổi lịch trình do điều kiện khách quan, bên tổ chức sẽ thông báo và đề xuất phương án thay thế.',
            'Hoàn tiền 100% nếu hủy trước 7 ngày; hoàn 50% nếu hủy trước 3 ngày; hoàn 30% nếu hủy trong vòng 24 giờ trước chuyến đi.',
            'Hotline: 0900 000 000 – Email: booking@journeygo.com',
            'Hủy miễn phí trước 7 ngày kể từ ngày khởi hành. Trong 3 ngày trước chuyến đi, mỗi người khách được hoàn 50% giá vé.',
            v_slot_cap,
            TRUE,
            1,
            NOW() - INTERVAL '10 days',
            NOW() - INTERVAL '9 days'
        )
        RETURNING tour_id INTO v_tour_id;

        -- ── 2. Bảng giá theo loại khách ───────────────────────────────────────
        INSERT INTO tour_prices (tour_id, guest_type, price, counts_toward_slot) VALUES
            (v_tour_id, 'ADULT',   (v_tour ->> 'adult')::numeric,   TRUE),
            (v_tour_id, 'CHILD',   (v_tour ->> 'child')::numeric,   TRUE),
            (v_tour_id, 'TODDLER', (v_tour ->> 'toddler')::numeric, FALSE),
            (v_tour_id, 'INFANT',  0,                               FALSE);

        -- ── 3. Điểm nổi bật (3–5) ─────────────────────────────────────────────
        INSERT INTO tour_highlights (tour_id, position, content)
        SELECT v_tour_id,
               (t.ord - 1)::int,
               t.txt
        FROM jsonb_array_elements_text(v_tour -> 'highlights') WITH ORDINALITY AS t(txt, ord);

        -- ── 4. Ảnh tour (5 ảnh; ảnh bìa nằm trong danh sách) ──────────────────
        FOR v_idx IN 0..4 LOOP
            INSERT INTO tour_images (tour_id, position, image_url)
            VALUES (v_tour_id, v_idx,
                    'https://picsum.photos/seed/jg' || substr(md5(v_title), 1, 8)
                        || '-' || v_idx || '/1200/800');
        END LOOP;

        -- ── 5. Lịch trình theo ngày ───────────────────────────────────────────
        FOR v_idx IN 1..(v_tour ->> 'days')::int LOOP
            INSERT INTO tour_itinerary_days (tour_id, position, title, main_activity, content, day_number)
            SELECT v_tour_id,
                   v_idx - 1,
                   s.val ->> 'n',
                   s.val ->> 'f',
                   'Buổi ' || v_idx || ': ' || COALESCE(s.val ->> 'f', '') || E'\n'
                     || '- Dẫn chuyện và thuyết minh tại điểm đến bằng hướng dẫn viên bản địa' || E'\n'
                     || '- Trải nghiệm hoạt động thực tế và nhiệm vụ tương tác tại checkpoint' || E'\n'
                     || '- Thời gian nghỉ chơi tự do và chụp ảnh',
                   v_idx
            FROM jsonb_array_elements(v_tour -> 'stops') WITH ORDINALITY AS s(val, ord)
            WHERE s.ord = v_idx;
        END LOOP;

        -- ── 6. Điểm đến + quiz + trải nghiệm thực tế ──────────────────────────
        FOR v_ord IN 1..jsonb_array_length(v_tour -> 'stops') LOOP
            SELECT s.val INTO v_stop
            FROM jsonb_array_elements(v_tour -> 'stops') WITH ORDINALITY AS s(val, ord)
            WHERE s.ord = v_ord;

            INSERT INTO tour_stops (tour_id, sequence_order, name, short_description, guest_note,
                                    image_url, cultural_content, created_at, updated_at)
            VALUES (
                v_tour_id,
                v_ord,
                v_stop ->> 'n',
                v_stop ->> 'd',
                'Hãy đến sớm 10 phút để kịp thời gian check-in tại checkpoint của hoạt động trải nghiệm.',
                'https://picsum.photos/seed/jg' || substr(md5(v_stop ->> 'n'), 1, 8) || '/900/600',
                E'Chào mừng bạn đến ' || (v_stop ->> 'n') || E' trong hành trình "' || v_title || E'".\n\n'
                || E'Nơi đây giữ trọn vẻ đẹp cổ truyền mà người dân bản địa vẫn gìn giữ hằng ngày. '
                || E'Từng mái ngói, từng tầng bậc đá đều mang một câu chuyện riêng, được truyền lại qua '
                || E'những thế hệ kể tục.\n\n'
                || E'Hãy chậm nhịp lại, quan sát kỹ từng chi tiết và lắng nghe câu chuyện của người dân bản địa. '
                || E'Đặc biệt là ' || (v_stop ->> 'f') || E' – đó là nét đặc trưng mà bạn sẽ được '
                || E'tự khám phá trong phần trải nghiệm thực tế ngay sau đây.',
                NOW(),
                NOW()
            )
            RETURNING id INTO v_stop_id;

            -- Ảnh văn hóa của điểm đến
            INSERT INTO tour_stop_cultural_images (stop_id, position, image_url)
            VALUES (v_stop_id, 0,
                    'https://picsum.photos/seed/jgc' || substr(md5(v_stop ->> 'n'), 1, 8) || '/900/600');

            -- Cổ vật
            INSERT INTO tour_stop_artifacts (stop_id, sequence_order, name, image_url, short_description)
            VALUES (v_stop_id, 1,
                    'Cổ vật tại ' || (v_stop ->> 'n'),
                    'https://picsum.photos/seed/jga' || substr(md5(v_stop ->> 'n'), 1, 8) || '/600/400',
                    'Tư liệu quý về ' || (v_stop ->> 'n') || ' được đối tác sưu tầm và ghi chú tại chỗ.');

            -- ── Quiz: 2 câu trắc nghiệm, 4 đáp án, đúng 1 ───────────────────────
            FOR v_j IN 1..2 LOOP
                IF v_j = 1 THEN
                    v_answers := ARRAY[
                        v_stop ->> 'f',
                        'Một hoạt động du lịch thương mại được tổ chức định kỳ',
                        'Một loại hình lưu trú mới được mở gần đây',
                        'Một sự kiện âm nhạc quốc tế tổ chức tại đây'
                    ];
                ELSE
                    v_answers := ARRAY[
                        'Trải nghiệm thực tế tại ' || (v_stop ->> 'n')
                            || ' với hướng dẫn viên bản địa',
                        'Một bài thuyết trình chỉ dẫn thuần lý thuyết',
                        'Một chương trình mua sắm trong trung tâm thương mại',
                        'Một buổi tập luyện thể thao không liên quan đến điểm đến'
                    ];
                END IF;

                INSERT INTO tour_stop_questions (stop_id, experience_id, kind, sequence_order,
                                                 content, points_reward, question_type, reference_answer)
                VALUES (
                    v_stop_id, NULL, 'QUIZ', v_j,
                    CASE WHEN v_j = 1
                         THEN 'Điểm nổi bật nhất của ' || (v_stop ->> 'n') || ' là gì?'
                         ELSE 'Trong hành trình tại ' || (v_stop ->> 'n')
                              || ', hoạt động nào dành riêng cho du khách trải nghiệm tại chỗ?'
                    END,
                    10,
                    'MULTIPLE_CHOICE',
                    NULL
                )
                RETURNING id INTO v_qid;

                -- 4 đáp án, đúng 1
                FOR v_idx IN 1..4 LOOP
                    INSERT INTO tour_stop_answers (question_id, sequence_order, content, is_correct)
                    VALUES (v_qid, v_idx, v_answers[v_idx], v_idx = 1);
                END LOOP;
            END LOOP;

            -- ── Trải nghiệm thực tế + 1 câu hỏi nhập chữ ─────────────────────
            INSERT INTO tour_stop_experiences (stop_id, sequence_order, activity_name,
                                               checkpoint_latitude, checkpoint_longitude,
                                               radius_meters, duration_seconds, points_reward, qr_token)
            VALUES (
                v_stop_id, 1,
                'Trải nghiệm tương tác tại ' || (v_stop ->> 'n'),
                (v_stop ->> 'lat')::numeric,
                (v_stop ->> 'lng')::numeric,
                60,
                180,
                50,
                'JGE-' || upper(substr(md5(v_tour_id::text || v_stop_id::text || 'exp'), 1, 16))
            )
            RETURNING id INTO v_exp_id;

            INSERT INTO tour_stop_questions (stop_id, experience_id, kind, sequence_order,
                                             content, points_reward, question_type, reference_answer)
            VALUES (
                NULL, v_exp_id, 'POST_EXPERIENCE', 1,
                'Sau khi trải nghiệm tại ' || (v_stop ->> 'n')
                || ', hãy mô tả điều gì đã khiến bạn ấn tượng nhất về nơi đây?',
                NULL,
                'TEXT',
                'Tôi ấn tượng nhất về ' || (v_stop ->> 'f')
            );
        END LOOP;

        -- ── 7. Ngày khởi hành + slot mở bán ───────────────────────────────────
        FOREACH v_dep IN ARRAY v_deps LOOP
            INSERT INTO tour_departure_dates (tour_id, departure_date)
            VALUES (v_tour_id, v_dep);

            INSERT INTO tour_slots (tour_id, slot_date, capacity, booked_count, status, created_at)
            VALUES (v_tour_id, v_dep, v_slot_cap, 0, 'OPEN', NOW());
        END LOOP;

        -- ── 8. Lịch sử kiểm duyệt (đã duyệt) ─────────────────────────────────
        INSERT INTO tour_reviews (tour_id, status, submitted_at, reviewed_at, reviewer_id,
                                  tour_version, decision_note,
                                  crit_interactive, crit_local_expertise, crit_storytelling,
                                  crit_cultural_ratio, crit_authentic_media)
        VALUES (v_tour_id, 'APPROVED',
                NOW() - INTERVAL '10 days', NOW() - INTERVAL '9 days', v_moderator,
                1, 'Nội dung đầy đủ, hình ảnh thật, trải nghiệm có checkpoint hợp lệ.',
                TRUE, TRUE, TRUE, TRUE, TRUE)
        RETURNING id INTO v_review_id;

        INSERT INTO tour_review_history (review_id, action, created_at, actor_id, note,
                                         from_status, to_status, tour_version)
        VALUES
            (v_review_id, 'SUBMITTED', NOW() - INTERVAL '10 days', v_provider,
             'Đối tác gửi duyệt tour', 'DRAFT', 'PENDING_REVIEW', 1),
            (v_review_id, 'APPROVED', NOW() - INTERVAL '9 days', v_moderator,
             'Nội dung đầy đủ, hình ảnh thật, trải nghiệm có checkpoint hợp lệ.',
             'PENDING_REVIEW', 'PUBLISHED', 1);
    END LOOP;

    RAISE NOTICE 'Hoàn tất seed 20 tour đã xuất bản.';
END $$;
