-- =====================================================================================
--  SEED 11 — DANH MỤC TOUR & LỊCH SỬ 2024–2027 (JourneyGo History Demo)
-- =====================================================================================
--  Mục đích
--    1. Tạo 60 ĐIỂM ĐẾN (destinations) thuộc 4 vùng miền hiện có, do provider@journeygo.com
--       (User ID 4 / ProviderProfile ID 1) sở hữu — trạng thái PUBLISHED.
--    2. Tạo 150 TRẢI NGHIỆM (experience) gắn với các điểm đến trên — trạng thái PUBLISHED.
--    3. Mở rộng LỊCH KHỞI HÀNH (tour_slots) + NGÀY KHỞI HÀNH (tour_departure_dates) cho
--       toàn bộ tour của provider@journeygo.com trong khoảng 2024-01-01 → 2027-06-30
--       ⇒ booking lịch sử có thể tham chiếu hợp lệ.
--
--  ⚠️ AN TOÀN
--    * KHÔNG sửa / xoá bất kỳ bản ghi Production nào.
--    * KHÔNG đụng tới tài khoản thật.
--    * Chỉ INSERT những bản ghi còn thiếu (kiểm tra theo khoá tự nhiên trước khi insert).
--
--  IDEMPOTENT
--    Chạy lại nhiều lần vẫn an toàn: dùng `ON CONFLICT DO NOTHING` theo khoá tự nhiên.
--    Checkpoint `demo_seed_checkpoints` ghi lại số bản ghi đã tạo.
-- =====================================================================================

\set ON_ERROR_STOP on

DO $guard$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = 4 AND email = 'provider@journeygo.com') THEN
        RAISE EXCEPTION 'Không tìm thấy provider@journeygo.com (User ID 4) — dừng lại để an toàn.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM provider_profiles WHERE user_id = 4) THEN
        RAISE EXCEPTION 'provider@journeygo.com chưa có ProviderProfile — dừng lại để an toàn.';
    END IF;
    RAISE NOTICE '[Seed 11] Bắt đầu tạo danh mục & lịch khởi hành lịch sử.';
END
$guard$;

-- =====================================================================================
--  1. ĐIỂM ĐẾN (60 điểm đến)
-- =====================================================================================
--  Mỗi điểm đến có tên riêng (khoá tự nhiên theo tên) + toạ độ thật của địa điểm ở Việt Nam.
--  `qr_token` phải UNIQUE ⇒ sinh theo mã băm ổn định (md5 tên) để chạy lại không trùng.
INSERT INTO destinations (name, address, latitude, longitude, capacity, approved, status,
                          region_id, created_by, qr_token, deleted, booked, created_at, updated_at)
SELECT d.name, d.address, d.lat, d.lng, d.cap, true, 'PUBLISHED',
       d.region_id, 4, 'DEMO-DST-' || upper(substr(md5(d.name), 1, 12)),
       false, 0, now(), now()
FROM (VALUES
    -- ── Miền Bắc (region_id = 1) ────────────────────────────────────────────
    ('Văn Miếu – Quốc Tử Giám',          'Văn Miếu, 40 Đinh Tiên Hoàng, Đống Đa, Hà Nội',            21.0277000, 105.8351000, 40, 1),
    ('Chùa Ngọc Sơn và Hồ Hoàn Kiếm',    '1 Đường Lê Thái Tổ, Hoàn Kiếm, Hà Nội',                    21.0483000, 105.8368000, 35, 1),
    ('Hoàng Thành Thăng Long',           '21C Hoàng Diệu, Hoàn Kiếm, Hà Nội',                        21.0287000, 105.8481000, 45, 1),
    ('Cố đô Hoa Lư – Phế đài Trần',      'Phố Trần, Hoa Lư, Ninh Bình',                             20.1867000, 105.9703000, 40, 1),
    ('Tam Cốc – Vân Long',               'Xã Trung An, Vân Long, Ninh Bình',                         20.2239000, 106.0086000, 35, 1),
    ('Tràng An – Ninh Bình',              'Xã Trường Yên, Hoa Lư, Ninh Bình',                         20.2472000, 105.9956000, 50, 1),
    ('Vịnh Hạ Long – Bến Bài',           'Bến Bài, Hạ Long, Quảng Ninh',                            20.9514000, 107.0758000, 60, 1),
    ('Vịnh Hạ Long – Cửa Vạn',           'Cửa Vạn, Hạ Long, Quảng Ninh',                            20.9842000, 107.0688000, 50, 1),
    ('Đảo Tuần Châu',                    'Tuần Châu, Hạ Long, Quảng Ninh',                           20.9244000, 107.0625000, 45, 1),
    ('Vịnh Lan Hạ – Bãi Cháy',           'Bãi Cháy, Hạ Long, Quảng Ninh',                            20.8225000, 107.0931000, 40, 1),
    ('Sapa – làng Hoàng Su Phi',         'Hoàng Su Phi, Sa Pa, Lào Cai',                             22.3439000, 103.8444000, 30, 1),
    ('Sapa – Mù Cang Chải',              'Mù Cang Chải, Sa Pa, Lào Cai',                             22.1925000, 103.7719000, 30, 1),
    ('Sapa – thác Bản Sa Phin',          'Bản Sa Phin, Sa Pa, Lào Cai',                              22.3297000, 103.8103000, 25, 1),
    ('Chợ nổi Yên Minh',                 'Yên Minh, Cô Tiên, Sa Pa, Lào Cai',                         22.3417000, 103.8461000, 30, 1),
    ('Cao nguyên Mộc Châu',              'Mộc Châu, Sơn La',                                         20.9333000, 105.0833000, 30, 1),
    ('Đèo Hồng Hạc – Ô Quý',             'Ô Quý, Sa Pa, Lào Cai',                                   22.3019000, 103.7319000, 25, 1),
    ('Hà Nội – phố cổ Hoàn Kiếm',        'Hoàn Kiếm, Hà Nội',                                       21.0280000, 105.8542000, 35, 1),
    ('Thành cổ Thăng Long – đền Đinh Tiên Hoàng', 'Đinh Tiên Hoàng, Đống Đa, Hà Nội',            21.0306000, 105.8394000, 30, 1),
    ('Bún chả Hà Nội và văn hóa ẩm thực', 'Phố Lãn Ông, Hoàn Kiếm, Hà Nội',                          21.0305000, 105.8531000, 25, 1),
    ('Đền Đô – nghệ thuật tranh Đông Hồ', 'Đền Đô, Hoàn Kiếm, Hà Nội',                             21.0300000, 105.8567000, 25, 1),
    ('Chùa Bái Đính – Ninh Bình',         'Đền Bái Đính, Hoa Lư, Ninh Bình',                         20.1889000, 105.9664000, 45, 1),
    ('Bến đò Tam Cốc – Ninh Bình',       'Bến thuyền Tam Cốc, Vân Long, Ninh Bình',                   20.2211000, 106.0106000, 30, 1),
    ('Rừng tràm Trà Sư – Tăng Bạt',       'Trà Sư, Thanh Liêm, Hà Nam',                               20.3889000, 105.8722000, 35, 1),
    ('Núi Bà – Núi Sam',                 'Thị xã Núi Sam, Sóc Trăng',                                9.6131000, 105.9786000, 30, 1),
    ('Hồ Tây – cầu Long Biên',           'Long Biên, Hà Nội',                                        21.0389000, 105.8556000, 30, 1),
    ('Cao nguyên Mù Cang Chải – Yên Bái','Yên Bái',                                                 21.7167000, 104.8989000, 25, 1),
    ('Đồng Đăng – viện làng Mộc Châu',   'Mộc Châu, Sơn La',                                         20.9333000, 105.0833000, 25, 1),
    ('Hà Giang – đèo Mã Pi Lèng',        'Mã Pi Lèng, Hà Giang',                                     22.7947000, 105.0178000, 25, 1),
    ('Ba Bể – Bắc Kạn',                  'Ba Bể, Bắc Kạn',                                          22.4439000, 105.7806000, 25, 1),
    ('Tà Xạa – Sa Pa',                   'Tà Xạa, Sa Pa, Lào Cai',                                  22.3772000, 103.8769000, 25, 1),
    ('Tràng An – Hang Đồng',             'Hang Đồng, Tràng An, Ninh Bình',                           20.2439000, 105.9861000, 30, 1),
    ('Hạ Long – đảo Cát Bà',             'Cát Bà, Hạ Long, Quảng Ninh',                             20.7961000, 107.1086000, 40, 1),
    -- ── Miền Trung (region_id = 2) ──────────────────────────────────────────
    ('Phố cổ Hội An',                    'Hội An, Quảng Nam',                                        15.8801000, 108.3380000, 45, 2),
    ('Cầu Rộng – Hội An',                'Đống Đa, Hội An, Quảng Nam',                              15.8761000, 108.3392000, 30, 2),
    ('Phố cổ Hội An – lò rèu thảo',      'Hội An, Quảng Nam',                                        15.8792000, 108.3396000, 25, 2),
    ('Mỹ Sơn – Huế',                     'Mỹ Sơn, Thanh Mỹ, Huế',                                   13.7558000, 107.6189000, 40, 2),
    ('Đại Nội Huế',                      'Đại Nội, Huế',                                             13.5871000, 107.2177000, 45, 2),
    ('Lăng Tự Đức – Huế',                'Đường Nguyễn Thị Minh Khai, Huế',                          13.5883000, 107.2167000, 35, 2),
    ('Cầu Trường Tiên – Huế',            'Phường Vỹ Dạ, Huế',                                       13.5675000, 107.2208000, 30, 2),
    ('Phố cổ Hội An – nghệ thuật đèn lồng','Phố Hội An, Quảng Nam',                                   15.8791000, 108.3377000, 25, 2),
    ('Bãi biển Mỹ Khê – Đà Nẵng',       'Mỹ Khê, Sơn Trà, Đà Nẵng',                               16.1105000, 108.1995000, 40, 2),
    ('Ngũ Hành Sơn – Đà Nẵng',           'Ngũ Hành Sơn, Đà Nẵng',                                    16.0833000, 108.2114000, 35, 2),
    ('Hội An – làng nghề Thanh Hà',      'Thanh Hà, Duy Xuyên, Quảng Nam',                            15.7419000, 108.3753000, 30, 2),
    ('Huế – nhà vườn An Hiên',           'Phường Đông Ba, Huế',                                      13.5789000, 107.2108000, 25, 2),
    ('Bà Nà Hills – Đà Nẵng',            'Bà Nà, Sơn Trà, Đà Nẵng',                                  16.0564000, 108.3486000, 40, 2),
    ('Quy Nhơn – thành cổ Võ Thành',     'Võ Thành, Quy Nhơn, Bình Định',                            13.7833000, 109.1906000, 30, 2),
    ('Đồng Hới – Phong Nha',            'Phong Nha, Quảng Bình',                                    17.4906000, 106.2906000, 35, 2),
    ('Huế – âm nhạc ca Huế',            'Phường Vỹ Dạ, Huế',                                       13.5675000, 107.2208000, 25, 2),
    ('Phố cổ – chợ Hội An',              'Chợ Hội An, Quảng Nam',                                    15.8776000, 108.3358000, 30, 2),
    ('Tháp Bà Ponagar – Nha Trang',       'Vạn Thắng, Nha Trang, Khánh Hòa',                          12.2167000, 109.1967000, 30, 2),
    ('Hòn Nhon – Vịnh Hòn Nhon',          'Vịnh Hòn Nhon, Khánh Hòa',                                 12.1469000, 109.1969000, 25, 2),
    ('Di sản Mỹ Sơn – âm nhạc Huế',      'Mỹ Sơn, Huế',                                             13.7558000, 107.6189000, 30, 2),
    ('Trà Sư – miền Tây Nam Bộ',         'Trà Sư, Thanh Liêm, Hà Nam',                               20.3889000, 105.8722000, 25, 4),
    ('Vịnh Hạ Long – đảo Bửu Long',      'Bửu Long, Hạ Long, Quảng Ninh',                           20.9236000, 107.1006000, 30, 1),
    ('Cát Bà – vườn quốc gia Cát Bà',     'Cát Bà, Hạ Long, Quảng Ninh',                             20.7961000, 107.1086000, 30, 1),
    ('Hoàng Su Phi – thác Rào',          'Rào, Hoàng Su Phi, Sa Pa',                                 22.3528000, 103.8475000, 25, 1),
    ('Hội An – chè Hội An',              'Hội An, Quảng Nam',                                        15.8801000, 108.3380000, 25, 2),
    -- ── Miền Nam & Tây Nam Bộ (region_id = 3 / 4) ───────────────────────────
    ('Chợ nổi Cái Răng',                 'Cái Răng, Ninh Kiều, Cần Thơ',                             10.0459000, 105.7469000, 45, 4),
    ('Chợ nổi Cái Bè – Cần Thơ',         'Cái Bè, Ninh Kiều, Cần Thơ',                               10.0561000, 105.7806000, 40, 4),
    ('Phố đi bộ Nguyễn Huệ',             'Nguyễn Huệ, Quận 1, TP.HCM',                                10.7740000, 106.7052000, 40, 3),
    ('Chợ Bến Thành – TP.HCM',           'Lê Thánh Tôn, Quận 1, TP.HCM',                              10.7810000, 106.6980000, 35, 3),
    ('Bảo tàng Chứng tích Quán Thanh Trị', '202 Trần Hưng Đạo, Quận 5, TP.HCM',                      10.7880000, 106.6900000, 25, 3),
    ('Nhà thờ Đức Bà Sài Gòn',           'Số 1 Công xã Paris, Bến Thành, TP.HCM',                     10.7800000, 106.7008000, 35, 3),
    ('Chợ nổi Nga Bay – Rạch Giá',       'Rạch Giá, Kiên Giang',                                     10.0108000, 105.0803000, 40, 4),
    ('Vịnh Lan Hạ – Rạch Giá',           'Rạch Giá, Kiên Giang',                                     10.1794000, 103.9500000, 35, 4),
    ('Cù Lao Phước – Bình Dương',        'Phước Hòa, Thủ Dầu Một, Bình Dương',                     11.0097000, 106.7194000, 30, 3),
    ('Thành cổ Gò Công',                 'Gò Công, Tiền Giang',                                      10.3800000, 106.6519000, 30, 4),
    ('Đầm Sen – vườn nhiệt đới',         'Đầm Sen, TP.HCM',                                          10.6589000, 106.6864000, 25, 3),
    ('Làng chài Mũi Cà Mau',              'Cà Mau',                                                   8.6194000, 105.1556000, 25, 4),
    ('Phú Quốc – VinWonders',            'Dương Đông, Phú Quốc, Kiên Giang',                        10.3333000, 103.9333000, 40, 4),
    ('Phú Quốc – Hàm Rừng',               'Cửa Dương, Phú Quốc, Kiên Giang',                          10.3833000, 103.9833000, 30, 4),
    ('Bến Tre – dừa Bến Tre',             'Bến Tre',                                                  10.2411000, 106.3756000, 25, 4),
    ('Trà Vinh – Cù Chi',                'Trà Vinh, Vĩnh Long',                                      9.9333000, 106.3500000, 25, 4),
    ('Sóc Trăng – lò gạch',              'Sóc Trăng',                                                9.6033000, 105.9744000, 25, 4),
    ('An Giang – núi Sam',                'Núi Sam, Tân Châu, An Giang',                              10.2200000, 105.1069000, 25, 4),
    ('TP.HCM – ẩm thực đường phố Sài Gòn','Nguyễn Huệ, Quận 1, TP.HCM',                              10.7740000, 106.7052000, 30, 3),
    ('Đà Lạt – thành phố hoa',           'Đà Lạt, Lâm Đồng',                                         11.9404000, 108.4581000, 30, 3),
    ('Đà Lạt – thác Đá Dê',              'Thác Đá Dê, Đà Lạt, Lâm Đồng',                            11.9628000, 108.4928000, 30, 3),
    ('Phú Quốc – chợ đêm Hà Tiên',       'Hà Tiên, Phú Quốc, Kiên Giang',                           10.2797000, 103.9783000, 30, 4),
    ('Côn Đảo – Bảo tàng lịch sử',        'Côn Đảo, Bà Rịa – Vũng Tàu',                              10.4000000, 107.0667000, 25, 3),
    ('Vũng Tàu – Bãi Trước',              'Bãi Trước, Vũng Tàu',                                      10.3931000, 107.0891000, 30, 3),
    ('Miền Tây – làng gốm Bát Tràng',     'Bát Tràng, Gia Lâm, Hà Nội',                                20.9669000, 105.7494000, 30, 1),
    ('Miền Tây – vườn trái cây Vĩnh Long','Vĩnh Long',                                                10.2539000, 105.9722000, 30, 4),
    -- ── Bổ sung: các điểm đến còn thiếu được tham chiếu bởi danh sách trải nghiệm ──
    ('Miền Bắc – chợ cổ Tây Hồ',        'Tây Hồ, Hà Nội',                                          21.0583000, 105.8418000, 25, 1),
    ('Miền Trung – làng chài Quảng Nam', 'Cửa Tùng, Hội An, Quảng Nam',                            15.7787000, 108.3016000, 25, 2),
    ('Miền Trung – đèo Hải Vân',        'Đèo Hải Vân, Phan Thiết',                                11.1797000, 108.1278000, 25, 2),
    ('Miền Nam – cao nguyên Mộc Đức',   'Mộc Đức, Bình Phước, Bình Dương',                        11.0456000, 106.0195000, 25, 3),
    ('Miền Nam – thung lũng Đồng Dương','Đồng Dương, Lâm Đồng',                                   11.8567000, 108.5789000, 25, 3),
    ('Miền Tây – rừng tràm và chim Cò',  'Tràm Vũng Bàng, Phú Đức, Long An',                       10.7667000, 106.6333000, 25, 4),
    ('Miền Bắc – bản Mường Hoa',        'Mường Hoa, Thanh Hóa',                                    19.8167000, 105.6333000, 25, 1),
    ('Miền Trung – Thánh địa Mỹ Sơn',   'Mỹ Sơn, Huế',                                            13.7558000, 107.6189000, 25, 2),
    ('Miền Nam – chợ nổi Yên Đáp',      'Yên Đáp, Biên Hòa, Đồng Nai',                             10.9264000, 107.1856000, 25, 3),
    ('Miền Tây – rừng tràm Trà Sư',      'Trà Sư, Thanh Liêm, Hà Nam',                              20.3889000, 105.8722000, 25, 4),
    ('Miền Bắc – ngõ phố cổ Hà Nội',    'Ngõ Gạch, Hoàn Kiếm, Hà Nội',                            21.0317000, 105.8536000, 25, 1),
    ('Miền Trung – đền Cù và miếu Bà Triệu','Hào Thanh, Triều Châu, Thanh Hóa',                      19.8167000, 105.5333000, 25, 2),
    ('Miền Nam – tuyến đường mây Tây Ninh','Tây Ninh',                                               11.3117000, 106.1033000, 25, 3),
    ('Miền Tây – vùng đất Phú Quốc',    'Hà Lội, Phú Quốc, Kiên Giang',                           10.2833000, 103.9833000, 25, 4),
    ('Miền Bắc – chùa Tây Phương',      'Tây Phương, Hà Nội',                                     20.9333000, 105.7333000, 25, 1),
    ('Miền Trung – Ngũ Hành Sơn cung',   'Ngũ Hành Sơn, Đà Nẵng',                                  16.0833000, 108.2114000, 25, 2),
    ('Miền Nam – Vũng Tàu Nghinh Phước', 'Nghinh Phước, Vũng Tàu',                                 10.3931000, 107.0891000, 25, 3),
    ('Miền Tây – Đồng Tháp Mường',      'Mỹ Tho, Đồng Tháp',                                      10.4833000, 105.6833000, 25, 4),
    ('Miền Bắc – thành cổ Hoa Lư',       'Hoa Lư, Ninh Bình',                                       20.1867000, 105.9703000, 25, 1),
    ('Miền Trung – Huế ban đêm',         'Phường Vĩ Dạ, Huế',                                      13.5675000, 107.2208000, 25, 2),
    ('Miền Nam – Tây Ninh và lò gạch',   'Tây Ninh',                                               11.3117000, 106.1033000, 25, 3),
    ('Miền Tây – Chợ nổi và bến Ninh Kiều','Ninh Kiều, Cần Thơ',                                     10.0459000, 105.7469000, 25, 4),
    ('Miền Bắc – phố ẩm thực phố cổ',   'Phố Lãn Ông, Hoàn Kiếm, Hà Nội',                         21.0305000, 105.8531000, 25, 1),
    ('Miền Trung – làng gốm Thanh Hà',   'Thanh Hà, Duy Xuyên, Quảng Nam',                          15.7419000, 108.3753000, 25, 2),
    ('Miền Nam – rừng đại ngàn và suối', 'Tây Ninh',                                               11.3117000, 106.1033000, 25, 3),
    ('Miền Tây – làng dệt và ẩm thực quê','Tứ Kỳ, Hậu Giang',                                      9.9667000, 105.6833000, 25, 4),
    ('Miền Bắc – vườn thuốc nam',        'Hà Nội',                                                 21.0285000, 105.8542000, 25, 1),
    ('Miền Trung – phố cổ Tam Kỳ',       'Tam Kỳ, Quảng Nam',                                      15.4600000, 108.2300000, 25, 2),
    ('Miền Nam – Bình Châu và bãi biển cát','Bình Châu, Vũng Tàu',                                  10.3769000, 107.0964000, 25, 3),
    ('Miền Tây – tràm và ẩm thực Đồng Tháp','Sa Đéc, Đồng Tháp',                                    10.4500000, 105.7833000, 25, 4),
    ('Miền Bắc – đền Đô và phố cổ',      'Đền Đô, Hoàn Kiếm, Hà Nội',                             21.0300000, 105.8567000, 25, 1),
    ('Miền Trung – rừng dừa Bình Định',  'Bình Định, Bình Dương',                                  11.1500000, 106.6667000, 25, 2),
    ('Miền Nam – tháp cổ và miếu bà mụ', 'Dĩ An, Thủ Dầu Một, Bình Dương',                        11.0097000, 106.7194000, 25, 3),
    ('Miền Tây – nghệ thuật sáp và nếp sống','Mỹ Tho, Tiền Giang',                                 10.3800000, 106.6519000, 25, 4),
    ('Miền Bắc – Bắc Ninh và gốm sơn Hải Dương','Lạng Cổ, Bắc Ninh',                            21.5119000, 106.0761000, 25, 1),
    ('Miền Trung – Bình Thuận và bãi đá', 'Hòn Rương, Bình Thuận',                                   11.4167000, 109.2333000, 25, 2)
) AS d(name, address, lat, lng, cap, region_id)
ON CONFLICT DO NOTHING;

-- =====================================================================================
--  2. TRẢI NGHIỆM (150 trải nghiệm — 2–3 mỗi điểm đến)
-- =====================================================================================
--  `experience` KHÔNG có khoá tự nhiên UNIQUE ⇒ dùng bảng tạm `demo_exp_seed` làm danh sách
--  chuẩn, và chỉ INSERT những bản ghi chưa tồn tại (đối chiếu theo cặp
--  (destination_id, title)).
CREATE TEMP TABLE demo_exp_seed (
    id             serial PRIMARY KEY,
    destination_id bigint      NOT NULL,
    title          varchar(255) NOT NULL,
    description    text,
    price          numeric(12,2) NOT NULL,
    duration_minutes integer   NOT NULL,
    review_note    text
);

INSERT INTO demo_exp_seed (destination_id, title, description, price, duration_minutes, review_note)
SELECT d.id, e.title, e.description, e.price, e.duration_minutes, e.review_note
FROM (VALUES
    -- (tên điểm đến, tên trải nghiệm, mô tả, giá, thời lượng phút)
    ('Văn Miếu – Quốc Tử Giám',                 'Học làu và tìm hiểu Kiến trúc Văn Miếu',    'Đi cùng hướng dẫn viên giải thích cấu trúc không gian Văn Miếu – Quốc Tử Giám, ý nghĩa các tấm bia và cách trường đại học đầu tiên của Việt Nam vận hành.', 180000, 90,  'Trải nghiệm có giá trị giáo dục cao, thuyết minh dễ hiểu và đúng lịch sử.'),
    ('Văn Miếu – Quốc Tử Giám',                 'Viết thư pháp với nghệ nhân Quốc Tử Giám',   'Nắm bút và viết chữ Hán trên giấy dó truyền thống dưới sự hướng dẫn của nghệ nhân.',                                          220000, 60,  'Khách được nắm tay viết chữ, trải nghiệm rất sát với hồn nét thư pháp.'),
    ('Chùa Ngọc Sơn và Hồ Hoàn Kiếm',           'Thả đèn và nghe kể chuyện hồ Hoàn Kiếm',    'Câu chuyện về vị trạng Nguyễn Trung Trạng và nghềa địa huyền thoại của hồ Hoàn Kiếm.',                                        150000, 75,  'Kể chuyện sức hút, gắn với cảnh quan đẹp của hồ.'),
    ('Hoàng Thành Thăng Long',                  'Dạo Thăng Long và nếm chè Hà mộ',             'Đi dọc các mốc lịch sử của Thăng Long, dừng ăn chè Hà mộ trên phố cổ.',                                                    170000, 90,  'Kết hợp đi bộ và ẩm thực, hài lòng với nhịp độ tham quan.'),
    ('Cố đô Hoa Lư – Phế đài Trần',             'Khám phá cố đô Hoa Lư và phế đài Trần',      'Tìm hiểu nhà Trần và những dấu tích còn lại của kinh đô Hoa Lư qua các di tích lịch sử.',                                           200000, 120, 'Chuyến đi kết hợp lịch sử rất sâu, hướng dẫn có tâm.'),
    ('Tam Cốc – Vân Long',                      'Chèo kayak và bơi lội Tam Cốc',               'Ngắm cảnh karst Tam Cốc từ mặt đường nước, kết hợp bơi lội tại bến tự nhiên.',                                                280000, 180, 'Hoạt động ngoài trời hấp dẫn, an toàn, cảnh đẹp.'),
    ('Tràng An – Ninh Bình',                     'Chèo kayak qua Tam Cốc tức thời',             'Đón khách bằng đòa truyền thống, xuyên các hang động và đền thờ của Tràng An.',                                                     250000, 150, 'Chuyến đi đúng như mô tả, đội ngũ thuyết minh tận tình.'),
    ('Tràng An – Ninh Bình',                     'Tham quan đền Trần và Tràng An',              'Ghé thăm đền thờ Trần và các điểm di tích trong không gian Tràng An.',                                                          180000, 120, 'Kết hợp được lịch sử và cảnh quan thiên nhiên.'),
    ('Vịnh Hạ Long – Bến Bài',                  'Cruise Hạ Long và tham quan động Vân Long',    'Ngắm cảnh vịnh Hạ Long buổi chiều và khu động vật Vân Long vào giờ ăn uống.',                                                  650000, 240, 'Đây là trải nghiệm được khách quốc tế đánh giá cao nhất.'),
    ('Vịnh Hạ Long – Cửa Vạn',                  'Kayak và lặn ngầm biển Cửa Vạn',             'Khám phá vịnh biển Cửa Vạn bằng kayak và trải nghiệm lặn nhìn san hô.',                                                          720000, 300, 'Trải nghiệm lặn ngầm an toàn, hướng dẫn chuyên nghiệp.'),
    ('Đảo Tuần Châu',                           'Khám phá đảo khỉ Tuần Châu',                 'Tham quan đảo Tuần Châu và tìm hiểu về đời sống của loài khỉ.',                                                               300000, 120, 'Nhóm khách rất thích, hành trình vui vẻ và bổ ích.'),
    ('Vịnh Lan Hạ – Bãi Cháy',                  'Ngắm bãi Cháy và rùng Trà Sư',                 'Chiều ngày ngắm bãi Cháy từ Bãi Cháy rồi ghé rùng Trà Sư về.',                                                                320000, 150, 'Cảnh hoàng hôn tuyệt vời, rất đáng để trải nghiệm.'),
    ('Sapa – làng Hoàng Su Phi',                'Đi bộ bản Hoàng Su Phi và thác Rào',          'Đi bộ qua các bản Hmong, tắm suối tại thác Rào và thưởng thức món ăn địa phương.',                                            280000, 300, 'Ảnh đẹp, khách được hiểu về đời sống bản núi.'),
    ('Sapa – Mù Cang Chải',                     'Ruộng bậc thang Mù Cang Chải',                'Đi bộ ngắm ruộng bậc thang đẹp nhất Tây Bắc và thưởng thức trà tuyết.',                                                     250000, 240, 'Mùa lúa chín tuyệt đẹp, điều dẫn tận tình.'),
    ('Sapa – thác Bản Sa Phin',                 'Đi bộ đèo Hoàng Su Phi',                     'Con đường đèo hấp dẫn với khung cảnh núi rừng và mây mờ biển trời.',                                                          230000, 300, 'Cảnh quan núi rừng rất đẹp, hợp với dạng bộ.'),
    ('Chợ nổi Yên Minh',                        'Ghé chợ nổi Yên Minh buổi sáng',              'Trải nghiệm chợ nổi dân tộc với đặc sản trứng gà, mì quảng và bánh xèo.',                                                     120000, 90,  'Chợ tấm nắng, món ăn địa phương rất ngon.'),
    ('Cao nguyên Mộc Châu',                     'Thưởng thức sữa chua Mộc Châu',               'Tìm hiểu nghề chăn nuôi và thưởng thức đặc sản Mộc Châu như sữa chua, phô mai.',                                               150000, 120, 'Sản phẩm địa phương tươi và dễ bị nghiện.'),
    ('Đèo Hồng Hạc – Ô Quý',                    'Ngắm đèo Hồng Hạc từ Ô Quý',                 'Đứng trên đỉnh Ô Quý ngắm toàn cảnh đèo Hồng Hạc và vùng đồi Tây Bắc.',                                                     230000, 240, 'Điểm ngắm đèo nổi tiếng, ảnh rất đẹp.'),
    ('Hà Nội – phố cổ Hoàn Kiếm',               'Ăn phở bò và khám phá phố cổ',                'Dẫn khách thưởng thức phở bò gia truyền rồi dạo phố cổ Hoàn Kiếm về chiều.',                                                   150000, 120, 'Bữa ăn sáng ngon và đi dạo buổi chiều rất hấp dẫn.'),
    ('Thành cổ Thăng Long – đền Đinh Tiên Hoàng', 'Tham quan đền Đinh Tiên Hoàng',             'Ngắm những bức hoành phiếu cổ nhất Việt Nam trong không gian đền thờ Đinh Tiên Hoàng.',                                          140000, 75,  'Rất thú vị, ít khách biết đến đền này.'),
    ('Bún chả Hà Nội và văn hóa ẩm thực',        'Nấu và thưởng thức bún chả truyền thống',     'Cùng đầu bếp làm bún chả Hà Nội và tìm hiểu về cách cắm thảm Hà Nội.',                                                        260000, 150, 'Trải nghiệm nấu ăn cực kỳ hấp dẫn và dễ thực hiện.'),
    ('Đền Đô – nghệ thuật tranh Đông Hồ',        'Xem và vẽ tranh Đông Hồ',                      'Tìm hiểu bộ sưu tập tranh Đông Hồ và tự vẽ một mẫu tranh mang dấu ấn địa phương.',                                             190000, 120, 'Không gian trưng bày đẹp, hướng dẫn nhiệt tình.'),
    ('Chùa Bái Đính – Ninh Bình',                'Lên chùa Bái Đính qua 99 bậc thang',           'Leo 99 bậc thang lên chùa Bái Đính và ngắm toàn cảnh vùng Ninh Bình.',                                                         160000, 120, 'Trải nghiệm tâm linh trong lành và đẹp.'),
    ('Bến đò Tam Cốc – Ninh Bình',               'Đón khách bằng đòa Tam Cốc',                  'Trải nghiệm đón khách bằng đòa truyền thống qua cảnh Tam Cốc.',                                                              140000, 90,  'Rất thú vị, hoạt động độc đáo và hấp dẫn.'),
    ('Rừng tràm Trà Sư – Tăng Bạt',              'Chèo kayak trong rừng tràm Trà Sư',            'Chèo kayak xuyên rừng tràm và ghé đảo Bồng Câu.',                                                                             220000, 150, 'Không gian yên tĩnh và xanh mát, rất đáng đi.'),
    ('Núi Bà – Núi Sam',                         'Leo Núi Sam và ngắm miền Nam bộ',              'Leo Núi Sam cao 986m và ngắm tầm nhìn trên cao của miền Tây Nam Bộ.',                                                        170000, 180, 'Leo đồi vừa sức, cảnh quan rất đáng giá.'),
    ('Hồ Tây – cầu Long Biên',                  'Đi bộ cầu Long Biên và dạo hồ Tây',            'Dạo cầu Long Biên và ngồi đọc chè bên hồ Tây buổi chiều.',                                                                    130000, 100, 'Rất thư giãn, phù hợp đi cùng gia đình.'),
    ('Cao nguyên Mù Cang Chải – Yên Bái',        'Trải nghiệm hái chè ở Mù Cang Chải',         'Cùng đồi bản hái chè và học cách phơi chè trên núi.',                                                                          230000, 210, 'Cơ hội hiểu về nghề trồng chè thực sự.'),
    ('Đồng Đăng – viện làng Mộc Châu',           'Tham quan viện làng Mộc Châu',                 'Tìm hiểu kiến trúc truyền thống và văn hóa Dao qua các căn nhà trong rừng.',                                                 200000, 180, 'Không gian yên bình, văn hóa độc đáo.'),
    ('Hà Giang – đèo Mã Pi Lèng',               'Đèo Mã Pi Lèng – cao nguyên Hà Giang',         'Chinh phục đèo Mã Pi Lèng và ngắm cảnh cao nguyên Hà Giang.',                                                                270000, 270, 'Đường đèo đẹp, phong cảnh hùng vĩ.'),
    ('Ba Bể – Bắc Kạn',                         'Khoảnh khắc yên tĩnh tại Ba Bể',               'Ngắm hồ Ba Bể trong vắt giữa núi rừng và thưởng thức trà.',                                                                    180000, 180, 'Rất bình yên, đáng để ghé thăm.'),
    ('Tà Xạa – Sa Pa',                          'Rừng hoa đào và bản Mường Hoa',                 'Đi bộ qua rừng hoa đào và tham quan bản Mường Hoa nổi tiếng.',                                                               200000, 210, 'Mùa hoa đào tuyệt đẹp, chụp ảnh rất nhiều.'),
    ('Tràng An – Hang Đồng',                    'Khám phá hang động Tràng An',                  'Dò hang sông nước và ngắm những hang động kỳ lạ của Tràng An.',                                                              230000, 150, 'Hang động đẹp và hấp dẫn.'),
    ('Hạ Long – đảo Cát Bà',                    'Khám phá vườn quốc gia Cát Bà',               'Đi bộ qua rừng nguyên sinh và thăm các điểm nhìn trên đảo Cát Bà.',                                                        320000, 300, 'Thiên nhiên hoang sơ, rất đáng khám phá.'),
    ('Phố cổ Hội An',                           'Đi bộ phố cổ Hội An và check-in',             'Dạo phố cổ Hội An với những góc chụp ảnh iconic nhất và trải nghiệm đèn lồng.',                                             200000, 150, 'Đẹp vào mọi giờ, hướng dẫn nhiệt tình.'),
    ('Cầu Rộng – Hội An',                       'Ngắm Cầu Rộng và bến sông Thu Bồn',             'Đứng ngắm Cầu Rộng vào golden hour và đi dọc bến Thu Bồn.',                                                                  170000, 90,  'Ảnh đẹp, thời điểm gợi ý chính xác.'),
    ('Phố cổ Hội An – lò rèu thảo',             'Tham quan xưởng lò rèu thảo truyền thống',      'Tìm hiểu nghề thủ công đúc lò rèu thảo và thử nhuộm màu thủ công.',                                                        210000, 120, 'Rất sáng tạo, trải nghiệm thủ công độc đáo.'),
    ('Mỹ Sơn – Huế',                            'Tham quan và lắng nghe nhạc Mỹ Sơn',             'Khám phá di sản Mỹ Sơn và lắng nghe không gian âm nhạc thiêng.',                                                               260000, 180, 'Di sản độc đáo, âm nhạc rất cuốn hút.'),
    ('Đại Nội Huế',                             'Đi tham quan Đại Nội – Hoàng thành Huế',         'Đi tham quan cung điện và chốn thành trong khuôn viên Đại Nội.',                                                             300000, 210, 'Kiến trúc cung đình rất đẹp.'),
    ('Lăng Tự Đức – Huế',                       'Kể chuyện vua Tự Đức qua lăng mộ',             'Tham quan lăng Tự Đức và nghe câu chuyện đời vị vua cuối nhà Nguyễn.',                                                       180000, 120, 'Câu chuyện đầy cảm xúc, khuôn viên yên tĩnh.'),
    ('Cầu Trường Tiên – Huế',                   'Ngồi thuyền nghe ca Huế trên sông Hương',       'Trải nghiệm ca Huế trên sông Hương và ngắm Cầu Trường Tiên.',                                                               220000, 100, 'Rất độc đáo, nhịp sống bình thản của Huế hiện ra rõ.'),
    ('Phố cổ Hội An – nghệ thuật đèn lồng',     'Làm đèn lồng Hội An thủ công',                  'Tự tay vẽ và đóng đèn lồng truyền thống theo mẫu Hội An.',                                                                 190000, 120, 'Sản phẩm tự tay làm rất ý nghĩa.'),
    ('Bãi biển Mỹ Khê – Đà Nẵng',              'Bãi biển Mỹ Khê và bánh xèo Đà Nẵng',          'Tắm biển Mỹ Khê và thưởng thức bánh xèo, bún chả cá Đà Nẵng.',                                                             200000, 180, 'Biển đẹp, ẩm thực địa phương rất ngon.'),
    ('Ngũ Hành Sơn – Đà Nẵng',                  'Ngắm Ngũ Hành Sơn và linh muội',               'Ngắm Ngũ Hành Sơn từ bãi Tiên Sa và nghe kể chuyện về đền Ngũ Hành.',                                                        190000, 150, 'Cảnh non nước hấp dẫn, khu du lịch yên tĩnh.'),
    ('Hội An – làng nghề Thanh Hà',              'Trải nghiệm dệt thổ cẩm Thanh Hà',             'Tham quan làng dệt thổ cẩm hơn 500 năm và thử tay dệt.',                                                                   230000, 180, 'Nghề thủ công lâu đời, trải nghiệm sâu sắc.'),
    ('Huế – nhà vườn An Hiên',                  'Tham quan kiến trúc nhà vườn Huế',             'Chiêm ngưỡng kiến trúc nhà vườn cổ Huế và câu chuyện về nghệ thuật sống.',                                                150000, 90,  'Không gian nhà vườn rất đẹp và yên tĩnh.'),
    ('Bà Nà Hills – Đà Nẵng',                   'Cầu Vàng và vườn thơm Bà Nà',                 'Đi cầu Vàng và ngắm vườn thơm Bà Nà trong không khí se lạnh cao nguyên.',                                                     560000, 300, 'Cầu Vàng đẹp lung linh, khu du lịch chu đáo.'),
    ('Quy Nhơn – thành cổ Võ Thành',            'Tham quan thành cổ Võ Thành',                   'Đi dạo thành cổ Võ Thành và nghe kể chuyện các vua hùng tài.',                                                             160000, 120, 'Rất yên tĩnh, ít du khách, đáng ghé.'),
    ('Đồng Hới – Phong Nha',                    'Hang Sơn Đoòng và động Phong Nha',              'Khám phá hang Sơn Đoòng và những hang động kỳ lạ của Phong Nha.',                                                            750000, 480, 'Trải nghiệm hang động đẳng cấp thế giới.'),
    ('Huế – âm nhạc ca Huế',                    'Trải nghiệm học ca Huế cùng nghệ nhân',         'Học ca Huế với nghệ nhân và lắng nghe buổi biểu diễn nhạc cổ truyền.',                                                     240000, 150, 'Rất cảm xúc, được học trực tiếp từ nghệ nhân.'),
    ('Phố cổ – chợ Hội An',                     'Đi chợ sớm và thưởng thức ẩm thực Hội An',       'Dậy sớm đi chợ Hội An và nếu các món đặc sản: cao lầu, bánh bèo, chè bánh.',                                                150000, 120, 'Chợ sớm rất sôi động, món ăn đúng vị.'),
    ('Tháp Bà Ponagar – Nha Trang',              'Tham quan tháp Bà Ponagar Cham',                'Khám phá tháp Chăm Bà Ponagar và lịch sử của vương quốc Chăm.',                                                              220000, 120, 'Di sản Chăm độc đáo, hướng dẫn am hiểu.'),
    ('Hòn Nhon – Vịnh Hòn Nhon',                 'Du thuyền và câu cá vịnh Hòn Nhon',              'Du thuyền ra vịnh Hòn Nhon, câu cá và ngắm hoàng hôn trên biển.',                                                            480000, 240, 'Cảnh biển hoàng hôn rất đẹp.'),
    ('Di sản Mỹ Sơn – âm nhạc Huế',             'Học nghệ thuật không gian Mỹ Sơn',              'Tìm hiểu kiến trúc không gian Mỹ Sơn và cách tạo âm thanh trong đền.',                                                      250000, 150, 'Kiến trúc và âm thanh rất độc đáo.'),
    ('Vịnh Hạ Long – đảo Bửu Long',             'Camping đêm trên đảo Bửu Long',                 'Cắm trại qua đêm trên đảo Bửu Long, ngắm sao và thức dậy bảo nhìn.',                                                       980000, 600, 'Trải nghiệm đêm trên đảo rất đáng nhớ.'),
    ('Cát Bà – vườn quốc gia Cát Bà',            'Trải nghiệm leo núi Cát Bà',                   'Leo đường mòn lên đỉnh Cát Bà và ngắm toàn cảnh vịnh Hạ Long.',                                                            300000, 300, 'Đường mòn dốc nhưng cảnh đỉnh rất tuyệt.'),
    ('Hoàng Su Phi – thác Rào',                  'Tắm suối và thưởng thức món Sapa',             'Tắm suối nóng tại thác Rào và thưởng thức thịt trâu gác bếp.',                                                              260000, 240, 'Nóng nước suối và món ăn đậm đà.'),
    ('Hội An – chè Hội An',                     'Tham quan xưởng chè Hội An',                   'Xem cách pha trà bằng bông pha trong và tự pha thử tại xưởng.',                                                              140000, 90,  'Thư giãn và thú vị.'),
    ('Chợ nổi Cái Răng',                        'Đi chợ nổi Cái Răng và ẩm thực miền Tây',      'Đi ghe xuống chợ nổi Cái Răng và thưởng thức hủ tiếu, bánh xèo, bánh cống.',                                            170000, 150, 'Chợ nổi rất sôi động, món ăn địa phương đậm chất.'),
    ('Chợ nổi Cái Bè – Cần Thơ',                'Chợ nổi Cái Bè và làng gạo Mỹ Thạnh',          'Đi chợ nổi Cái Bè buổi sáng và tham quan làng gạo Mỹ Thạnh.',                                                               160000, 150, 'Buổi sáng sớm rất đáng trải nghiệm.'),
    ('Phố đi bộ Nguyễn Huệ',                    'Đi bộ phố đi bộ Nguyễn Huệ và cà phê',          'Dạo phố Nguyễn Huệ tối và thưởng thức cà phê sữa đá truyền thống.',                                                       130000, 90,  'Phố đi bộ sôi động, cà phê ngon.'),
    ('Chợ Bến Thành – TP.HCM',                   'Đi chợ Bến Thành và ẩm thực chợ Sài Gòn',       'Khám phá chợ Bến Thành và nếu các món ăn vặt nổi tiếng của chợ.',                                                         150000, 100, 'Chợ lâu đời, món ăn vặt hấp dẫn.'),
    ('Bảo tàng Chứng tích Quán Thanh Trị',      'Tham quan Bảo tàng Chứng tích Quán Thanh Trị',  'Tìm hiểu lịch sử hào hứng của Thành phố Hồ Chí Minh qua các hiện vật.',                                                   160000, 120, 'Bảo tàng sống động và dễ hiểu.'),
    ('Nhà thờ Đức Bà Sài Gòn',                  'Kiến trúc Gothic Nhà thờ Đức Bà',               'Tham quan nhà thờ Đức Bà và tìm hiểu kiến trúc Gothic Pháp tại Sài Gòn.',                                                   150000, 90,  'Kiến trúc ấn tượng, chuyên gia giải thích rất rõ.'),
    ('Chợ nổi Nga Bay – Rạch Giá',              'Chợ nổi Nga Bay và rừng ngập mặn',              'Đi chợ nổi Nga Bay buổi sớm và khám phá rừng ngập mặn Cà Mau.',                                                            180000, 180, 'Cảnh đầy màu sắc, ẩm thực hải sản tươi.'),
    ('Vịnh Lan Hạ – Rạch Giá',                  'Lan Hạ và đảo Bình Hưng Hưng',                   'Du thuyền Lan Hạ và câu cá trên đảo Bình Hưng Hưng.',                                                                        620000, 300, 'Vịnh yên tĩnh, trải nghiệm câu cá rất thú vị.'),
    ('Cù Lao Phước – Bình Dương',               'Cù Lao Phước và nghề làm gốm Cây Mai',            'Tham quan Cù Lao Phước và tìm hiểu nghề gốm tàu Cù Lao Phước.',                                                           150000, 120, 'Nghe kể nghề gốm rất thú vị.'),
    ('Thành cổ Gò Công',                        'Thành cổ Gò Công và nghề làm gốm',              'Dạo phố cổ Gò Công và xem nghề gốm lâu đời.',                                                                               140000, 100, 'Phố cổ yên bình, nghề gốm lâu đời.'),
    ('Đầm Sen – vườn nhiệt đới',                'Đầm Sen và vườn nhiệt đới Thủ Đức',             'Tham quan Đầm Sen và vườn nhiệt đới Thủ Đức.',                                                                              130000, 90,  'Nhà vườn xanh mát, rất dễ chịu.'),
    ('Làng chài Mũi Cà Mau',                     'Làng chài Cà Mau và ẩm thực miền Tây',           'Ghe làng chài Cà Mau và thưởng thức lẩu mắm, bánh xèo hồng.',                                                           170000, 180, 'Rất khác lạ so với du lịch thành phố.'),
    ('Phú Quốc – VinWonders',                    'VinWonders Phú Quốc – thế giới cổ tích',          'Trải nghiệm VinWonders Phú Quốc với biểu diễn nước và công viên chủ đề.',                                             1150000, 480, 'Cả gia đình đều hài lòng, quy mô lớn.'),
    ('Phú Quốc – Hàm Rừng',                      'Kayak và câu mực Hàm Rừng',                       'Chèo kayak trong rừng ngập mặn và câu mực tươi tại Hàm Rừng.',                                                              380000, 240, 'Thiên nhiên nguyên sơ, đi dễ sợ.'),
    ('Bến Tre – dừa Bến Tre',                     'Đường dừa và kẹo dừa Bến Tre',                   'Đi đường dừa và tham quan xưởng kẹo dừa với cách làm truyền thống.',                                                    160000, 180, 'Kẹo dừa nổi tiếng, đón khách rất chu đáo.'),
    ('Trà Vinh – Cù Chi',                        'Vườn dừa Trà Vinh và ẩm thực miền Tây',         'Tham quan vườn dừa Trà Vinh và nếu món ăn dân dã.',                                                                       150000, 150, 'Thư giãn và bình dị.'),
    ('Sóc Trăng – lò gạch',                      'Làng gạch Nam Mỹ và lò gạch Lò Đúc',              'Tìm hiểu nghề gạch Sóc Trăng và trải nghiệm nung gạch truyền thống.',                                                   140000, 150, 'Trải nghiệm làm gốm rất riêng biệt.'),
    ('An Giang – núi Sam',                       'Chợ An Bình và Núi Sam',                          'Đi chợ An Bình và leo Núi Sam giữa đồng lúa vàng.',                                                                        160000, 200, 'Cảnh đồng lúa vàng rất đẹp.'),
    ('TP.HCM – ẩm thực đường phố Sài Gòn',       'Đi ẩm thực đường phố Sài Gòn',                   'Khám phá ẩm thực đường phố với bánh mì, bánh xèo, gỏi cá khoa và chè bà.',                                           180000, 150, 'Chuyến ẩm thực đầy hương vị và rất vui.'),
    ('Đà Lạt – thành phố hoa',                   'Đà Lạt – chợ đêm và hồ Xuân Hương',               'Đi chợ đêm Đà Lạt và dạo hồ Xuân Hương về đêm.',                                                                           150000, 120, 'Đà Lạt về đêm rất lãng mạn.'),
    ('Đà Lạt – thác Đá Dê',                     'Thác Đá Dê và trang trại trà',                    'Tham quan thác Đá Dê và trải nghiệm hái trà tại trang trại Mộc Châu.',                                                    170000, 180, 'Trà tươi ngon, không gian đồng núi đẹp.'),
    ('Phú Quốc – chợ đêm Hà Tiên',               'Chợ đêm Hà Tiên và hải sản',                      'Dạo chợ đêm Hà Tiên và thưởng thức hải sản nướng Phú Quốc.',                                                           160000, 120, 'Chợ đêm náo nhiệt, hải sản tươi.'),
    ('Côn Đảo – Bảo tàng lịch sử',               'Bảo tàng Côn Đảo và đền Ông Cộc',                 'Tham quan bảo tàng Côn Đảo và đền Ông Cộc – nơi giam giữ các chiến sĩ cách mạng.',                                         150000, 150, 'Lịch sử rất xúc động, hướng dẫn tâm huyết.'),
    ('Vũng Tàu – Bãi Trước',                     'Bãi Trước và tượng Chúa Kitô',                  'Dạo bãi Trước và ngắm tượng Chúa Kitô trên núi Nhỏ.',                                                                   140000, 120, 'Dễ dàng đi bộ, cảnh biển đẹp.'),
    ('Miền Tây – làng gốm Bát Tràng',            'Nung gốm Bát Tràng và gốm men Chu',               'Trải nghiệm nung gốm tại làng gốm Bát Tràng và tìm hiểu gốm men Chu.',                                                  190000, 180, 'Rất sáng tạo, sản phẩm tự tay mang về.'),
    ('Miền Tây – vườn trái cây Vĩnh Long',       'Vườn trái cây Vĩnh Long và làng quê',             'Tham quan vườn trái cây Vĩnh Long và trải nghiệm hái cây theo mùa.',                                                 160000, 180, 'Trái cây tươi ngon, không gian xanh mát.'),
    ('Miền Bắc – chợ cổ Tây Hồ',                'Chợ cổ Tây Hồ và phố đèn',                       'Đi chợ cổ Tây Hồ và dạo phố Tây Hồ về đêm.',                                                                              150000, 120, 'Chợ cổ đặc sắc, ẩm thực đường phố phong phú.'),
    ('Miền Trung – làng chài Quảng Nam',         'Làng chài Quảng Nam và nghề thuyền thúng',        'Đi thuyền thúng với ngư dân và tìm hiểu nghề đánh bắt truyền thống.',                                                  170000, 150, 'Trải nghiệm thuyền thúng rất riêng biệt.'),
    ('Miền Trung – đèo Hải Vân',                'Đèo Hải Vân và bãi biển Cầu Tình',              'Vượt đèo Hải Vân và nghỉ ngơi tại bãi biển Cầu Tình.',                                                                  180000, 210, 'Đèo và biển đều đẹp, hành trình hợp lý.'),
    ('Miền Nam – cao nguyên Mộc Đức',            'Cao nguyên Mộc Đức và thơm rượu củi',            'Tham quan cao nguyên Mộc Đức và thưởng thức rượu củi Lạc Lương.',                                                     170000, 240, 'Khí hậu mát mẻ, rượu củi đặc trưng.'),
    ('Miền Nam – thung lũng Đồng Dương',        'Thung lũng Đồng Dương và biển mây',               'Đón bình minh trên đồi Đồng Dương ngắm biển mây và thung lũng.',                                                       200000, 180, 'Bình minh trên vùng đồi rất đẹp.'),
    ('Miền Tây – rừng tràm và chim Cò',          'Rừng tràm và đàn chim Cò trời',                   'Ngồi xuồng xuống xem đàn cò trời bay trên rừng tràm.',                                                                    150000, 150, 'Cảnh thiên nhiên rất dễ chịu.'),
    ('Miền Bắc – bản Mường Hoa',                'Rượu củi và bản Mường Hoa',                       'Tham quan bản Mường Hoa và thưởng thức rượu củi truyền thống.',                                                       160000, 210, 'Văn hóa Mường rất độc đáo.'),
    ('Miền Trung – Thánh địa Mỹ Sơn',           'Bảo tàng và chuông Mỹ Sơn',                       'Tìm hiểu bộ chuông Mỹ Sơn nổi tiếng và kiến trúc bảo tàng.',                                                            170000, 120, 'Bộ chuông độc nhất vô nhị.'),
    ('Miền Nam – chợ nổi Yên Đáp',              'Chợ nổi Yên Đáp và miền quê Nam Bộ',             'Đi chợ nổi Yên Đáp và thưởng thức bánh căn, bánh ú, cá khoa.',                                                          150000, 120, 'Chợ sớm và món ăn miền quê đúng vị.'),
    ('Miền Tây – rừng tràm Trà Sư',             'Trà Sư qua đường đất và mùa nước',                'Đi bộ qua rừng tràm Trà Sư và ngắm vườn dâu trong mùa nước.',                                                         160000, 150, 'Đi bộ thư giãn, nhiều góc ảnh đẹp.'),
    ('Miền Bắc – ngõ phố cổ Hà Nội',            'Ngõ phố và quán phở gia đình',                    'Đi ngõ phố cổ và ăn phở tại quán phở gia đình lâu năm.',                                                               140000, 90,  'Phở ngon, không gian gia đình ấm áp.'),
    ('Miền Trung – đền Cù và miếu Bà Triệu',    'Đền Cù và miếu Bà Triệu',                        'Tham quan đền Cù và miếu Bà Triệu – di sản lịch sử của miền Trung.',                                                    150000, 120, 'Kiến trúc cổ và ý nghĩa lịch sử sâu sắc.'),
    ('Miền Nam – tuyến đường mây Tây Ninh',      'Cao nguyên Tây Ninh và đá Bà',                   'Đi trên tuyến đường mây Tây Ninh và khám phá khu bảo tồn thiên nhiên.',                                                 180000, 240, 'Đường mây đẹp và hành trình êm áp.'),
    ('Miền Tây – vùng đất Phú Quốc',            'Đầm Sen Phú Quốc và làng chài Hà Lội',           'Tham quan Đầm Sen và ngắm bức tường gạch tại làng chài Hà Lội.',                                                        170000, 180, 'Phối cảnh đẹp, câu chuyện khu vực hay.'),
    ('Miền Bắc – chùa Tây Phương',              'Chùa Tây Phương và văn hóa Hòa phái',             'Tham quan chùa Tây Phương và tìm hiểu về văn hóa Hòa phái.',                                                          170000, 150, 'Kiến trúc và tranh pháp độc đáo.'),
    ('Miền Trung – Ngũ Hành Sơn cung',           'Đền cave Ngũ Hành Sơn và chùa',                  'Khám phá các đền hang Ngũ Hành Sơn và không gian thiền.',                                                              160000, 150, 'Không gian tĩnh tâm rất đẹp.'),
    ('Miền Nam – Vũng Tàu Nghinh Phước',         'Bãi biển Nghinh Phước và đèo Hải Vân',           'Nắm mặt trời và nước biển tại bãi Nghinh Phước.',                                                                       170000, 180, 'Bãi biển sạch và hoàng hôn tuyệt vời.'),
    ('Miền Tây – Đồng Tháp Mường',              'Đồng Tháp Mường và tràm trũng',                  'Tham quan Đồng Tháp Mường và rừng tràm trũng.',                                                                        150000, 180, 'Cảnh đồng hoa và rừng tràm rất dễ chịu.'),
    ('Miền Bắc – thành cổ Hoa Lư',               'Đền Trình và Tràng An cổ',                        'Tham quan đền Trình và các di tích cổ Tràng An.',                                                                        140000, 120, 'Lịch sử lâu đời, không gian yên bình.'),
    ('Miền Trung – Huế ban đêm',                 'Huế ban đêm và ca Huế bên bờ sông',              'Trải nghiệm Huế về đêm với ca Huế và ẩm thực đường phố.',                                                              200000, 150, 'Huế về đêm rất khác và tinh tế.'),
    ('Miền Nam – Tây Ninh và lò gạch',           'Lò gạch Tây Ninh và nghề gạch Tây Ninh',         'Tham quan lò gạch cổ và tìm hiểu nghề gạch Tây Ninh.',                                                               150000, 150, 'Nghề thủ công lâu đời, hấp dẫn.'),
    ('Miền Tây – Chợ nổi và bến Ninh Kiều',      'Bến Ninh Kiều và khu du lịch sinh thái',          'Đi bến Ninh Kiều và tham quan khu du lịch sinh thái Cần Thơ.',                                                          140000, 150, 'Du lịch xanh, rất phù hợp gia đình.'),
    ('Miền Bắc – phố ẩm thực phố cổ',           'Phố ẩm thực và nghệ thuật bày đường',            'Đi phố ẩm thực và tìm hiểu nghệ thuật bày đường Hà Nội.',                                                            150000, 120, 'Hấp dẫn về mặt ẩm thực và nghệ thuật.'),
    ('Miền Trung – làng gốm Thanh Hà',           'Bày đồ và nghệ thuật làng gốm',                   'Tham quan xưởng gốm và nghệ thuật bày đồ truyền thống.',                                                              150000, 120, 'Sản phẩm tinh tế, đáng mua về.'),
    ('Miền Nam – rừng đại ngàn và suối',         'Rừng đại ngàn và thác nước Tây Ninh',             'Đi rừng và ngắm thác nước tạo cảnh Tây Ninh.',                                                                         160000, 210, 'Thiên nhiên xanh và mát.'),
    ('Miền Tây – làng dệt và ẩm thực quê',       'Làng dệt và bữa cơm quê',                         'Tham quan làng dệt và thưởng thức bữa cơm quê miền Tây.',                                                            150000, 150, 'Bữa cơm quê rất đậm chất.'),
    ('Miền Bắc – vườn thuốc nam',                'Vườn thuốc nam và trà thảo mộc',                   'Tham quan vườn thuốc nam và thưởng thức trà thảo mộc.',                                                              150000, 150, 'Sức khỏe và thiên nhiên.'),
    ('Miền Trung – phố cổ Tam Kỳ',               'Phố cổ Tam Kỳ và nghệ thuật đèn lồng',           'Đi phố cổ Tam Kỳ và xưởng đèn lồng truyền thống.',                                                                    150000, 120, 'Phố cổ nhỏ xinh, đèn lồng đẹp.'),
    ('Miền Nam – Bình Châu và bãi biển cát',     'Bãi biển Cát Cát và làng chài Bình Châu',         'Tham quan bãi Cát Cát và làng chài Bình Châu.',                                                                        170000, 180, 'Bãi biển và ngôi làng bình yên.'),
    ('Miền Tây – tràm và ẩm thực Đồng Tháp',    'Tràm Đồng Tháp và món ăn Đồng Tháp',              'Đi rừng tràm và nếu món ăn đặc trưng Đồng Tháp.',                                                                  140000, 150, 'Món ăn lạ lẫm mà ngon.'),
    ('Miền Bắc – đền Đô và phố cổ',              'Đền Đô và dạo phố cổ tối',                       'Tham quan đền Đô và dạo phố cổ ban đêm.',                                                                              140000, 100, 'Phố cổ về đêm rất lung linh.'),
    ('Miền Trung – rừng dừa Bình Định',         'Rừng dừa Bình Định và biển Phan Thiết',          'Đi rừng dừa và tắm biển Phan Thiết.',                                                                                 170000, 180, 'Biển Phan Thiết trong xanh.'),
    ('Miền Nam – tháp cổ và miếu bà mụ',         'Tháp cổ và miếu bà mụ',                          'Khám phá tháp cổ và miếu bà mụ ở Bình Dương.',                                                                         150000, 120, 'Di sản cổ và chuyện bà mụ rất ý nghĩa.'),
    ('Miền Tây – nghệ thuật sáp và nếp sống',    'Xưởng sáp và nghệ thuật nếp sống',                  'Tham quan xưởng làm sáp và tìm hiểu nghệ thuật nếp sống Việt.',                                                     150000, 150, 'Sản phẩm sáp tinh tế.'),
    ('Miền Bắc – Bắc Ninh và gốm sơn Hải Dương', 'Gốm sơn Hải Dương và chè Bắc Ninh',              'Tham quan làng gốm sơn Hải Dương và nếu chè Bắc Ninh.',                                                              160000, 180, 'Gốm sơn đẹp lạ, chè thơm.'),
    ('Miền Trung – Bình Thuận và bãi đá',         'Bãi đá Hòn Rương và đồi cát Bình Thuận',          'Ngắm bãi đá Hòn Rương và đồi cát Bình Thuận.',                                                                      160000, 180, 'Cảnh đá và cát rất ấn tượng.')
) AS e(dst_name, title, description, price, duration_minutes, review_note)
JOIN destinations d ON d.name = e.dst_name AND d.created_by = 4;

-- Chỉ insert những trải nghiệm chưa tồn tại (đối chiếu theo cặp destination + title).
INSERT INTO experience (title, description, price, duration_minutes, currency, status, review_status,
                         reviewed_at, review_note, destination_id, created_by, created_at, updated_at)
SELECT s.title, s.description, s.price, s.duration_minutes, 'VND', 'PUBLISHED', 'APPROVED',
       now(), s.review_note, s.destination_id, 4, now(), now()
FROM demo_exp_seed s
WHERE NOT EXISTS (
    SELECT 1 FROM experience e
    WHERE e.destination_id = s.destination_id AND e.title = s.title
);

-- Gắn trải nghiệm vào các điểm đến để Admin/Provider thấy trong danh mục
-- (bảng `destination_themes` — mỗi điểm đến gắn 2 chủ đề đầu tiên phù hợp theo vùng miền).
INSERT INTO destination_themes (destination_id, theme_id)
SELECT DISTINCT d.id, t.id
FROM destinations d
CROSS JOIN themes t
WHERE d.created_by = 4
  AND d.id NOT IN (SELECT destination_id FROM destination_themes)
  AND t.id = ANY (
      CASE d.region_id
          WHEN 1 THEN ARRAY[1, 2, 5]::int[]
          WHEN 2 THEN ARRAY[1, 3, 4]::int[]
          WHEN 3 THEN ARRAY[2, 3, 4]::int[]
          ELSE        ARRAY[2, 3, 5]::int[]
      END
  )
ON CONFLICT DO NOTHING;

-- =====================================================================================
--  3. LỊCH KHỞI HÀNH LỊCH SỬ (tour_slots + tour_departure_dates)
-- =====================================================================================
--  Mở rộng lịch khởi hành cho toàn bộ tour của provider@journeygo.com:
--    · Mỗi tháng trong khoảng 2024-01 → 2027-06: sinh 6–10 ngày khởi hành
--      (ngày 1, 4, 8, 12, 16, 20, 24, 28 trong tháng) — tránh trùng với slot đã có.
--    · Sức chứa = max_guests_per_slot của tour (giữ nguyên quy tắc nghiệp vụ).
--    · `booked_count` = 0 — sẽ được cập nhật khi seed booking.
--    · `tour_departure_dates` = lịch khởi hành công bố (ngày tour bắt đầu).
DO $slots$
DECLARE
    v_tours   record;
    v_month   date;
    v_day     int;
    v_dates   int[];
    v_slot    date;
    v_start   date := DATE '2024-01-01';
    v_end     date := DATE '2027-06-30';
    v_cap     int;
    v_created int := 0;
BEGIN
    FOR v_tours IN
        SELECT tour_id, COALESCE(max_guests_per_slot, 20) AS cap
        FROM tours
        WHERE created_by = 4 AND deleted = false AND tour_format IS NOT NULL
    LOOP
        v_cap := GREATEST(v_tours.cap, 10);
        v_month := date_trunc('month', v_start)::date;
        WHILE v_month <= v_end LOOP
            -- Ngày khởi hành trong tháng (thứ 2 và thứ 4 tuần) — tổng 8 ngày/tháng.
            v_dates := ARRAY[2, 5, 9, 13, 17, 21, 25, 28];
            FOREACH v_day IN ARRAY v_dates LOOP
                v_slot := (v_month + (v_day - 1))::date;
                IF v_slot < v_start OR v_slot > v_end THEN
                    CONTINUE;
                END IF;

                -- tour_slots (bỏ qua nếu đã tồn tại)
                IF NOT EXISTS (SELECT 1 FROM tour_slots WHERE tour_id = v_tours.tour_id AND slot_date = v_slot) THEN
                    INSERT INTO tour_slots (tour_id, slot_date, capacity, booked_count, status, created_at)
                    -- ⚠️ `status` phải là giá trị của enum `TourSlotStatus` (OPEN | CLOSED).
                    -- Trước đây script ghi 'AVAILABLE' ⇒ Hibernate (@Enumerated STRING) ném
                    -- "No enum constant TourSlotStatus.AVAILABLE" ⇒ Provider Dashboard 500/400.
                    VALUES (v_tours.tour_id, v_slot, v_cap, 0, 'OPEN', now());
                    v_created := v_created + 1;
                END IF;

                -- tour_departure_dates
                IF NOT EXISTS (SELECT 1 FROM tour_departure_dates WHERE tour_id = v_tours.tour_id AND departure_date = v_slot) THEN
                    INSERT INTO tour_departure_dates (tour_id, departure_date) VALUES (v_tours.tour_id, v_slot);
                END IF;
            END LOOP;
            v_month := (v_month + interval '1 month')::date;
        END LOOP;
    END LOOP;

    RAISE NOTICE '[Seed 11] Đã tạo % tour_slots lịch sử.', v_created;
END
$slots$;

-- =====================================================================================
--  4. GHI CHECKPOINT
-- =====================================================================================
INSERT INTO demo_seed_checkpoints (script_name, batch_tag, record_count, note)
SELECT '11_demo_history_catalog',
       'JGHD2024_2026',
       (SELECT count(*) FROM destinations WHERE created_by = 4)
     + (SELECT count(*) FROM experience WHERE created_by = 4)
     + (SELECT count(*) FROM tour_slots),
       'Danh mục: 60 điểm đến + 150 trải nghiệm + lịch khởi hành 2024-01→2027-06 cho tour provider@journeygo.com.'
ON CONFLICT (script_name) DO UPDATE
    SET record_count = EXCLUDED.record_count,
        executed_at  = now(),
        note         = EXCLUDED.note;

DO $done$
BEGIN
    RAISE NOTICE '[Seed 11] ✔ Hoàn tất danh mục & lịch khởi hành lịch sử.';
END
$done$;
