-- =====================================================================================
--  SEED — 5 TOUR THẬT ĐÃ XUẤT BẢN (dữ liệu tham quan có thật, ảnh chụp thật)
--
--  • Địa điểm, sự kiện, niên đại lấy theo Wikipedia tiếng Việt / tiếng Anh (tháng 11/2026).
--  • Ảnh lấy từ Wikimedia Commons: chỉ dùng ảnh JPEG có dữ liệu EXIF máy ảnh (ảnh chụp thật),
--    không thuộc danh mục ảnh tạo bằng AI. Giấy phép CC BY / CC BY-SA / CC0 / Public domain —
--    khi hiển thị công khai cần ghi nguồn theo danh sách cuối header.
--  • Tour trong ngày (DAY_TRIP), status PUBLISHED, đã có tour_reviews APPROVED + lịch sử duyệt.
--  • Lịch khởi hành: thứ Bảy, Chủ nhật trong 6 tuần kể từ ngày chạy script.
--  • Toạ độ checkpoint: Chùa Cầu, Thiên Mụ, Văn Miếu, Ngọc Sơn theo Wikipedia; các điểm còn lại
--    là toạ độ gần đúng nên bán kính để rộng hơn (200–400 m).
--  • IDEMPOTENT: tour trùng tên (chưa xoá) sẽ được bỏ qua.
--
--  Cách chạy:
--     psql -h localhost -U postgres -d journeygo_db -f seed_real_tours.sql
--
--  Nguồn ảnh (Wikimedia Commons):
--   • 2024 Hội An - Japanese Covered Bridge (Chùa Cầu) after renovation - img 11.jpg — Chainwit. — CC BY 4.0
--   • 2024-12-20 Hoi An Old Town at night 4.jpg — Alexkom000 — CC BY 4.0
--   • Bat Trang communal house (2018) 01.jpg — Donald Trung — CC BY-SA 4.0
--   • Bat Trang communal house (2018) 05.jpg — Donald Trung — CC BY-SA 4.0
--   • Bat Trang communal house (2018) 08.jpg — Donald Trung — CC BY-SA 4.0
--   • Bát Tràng DSC 0096.JPG — Greenknight dv — CC BY-SA 4.0
--   • Bát Tràng DSC 0097.JPG — Greenknight dv — CC BY-SA 4.0
--   • Bát Tràng DSC 0098.JPG — Greenknight dv — CC BY-SA 4.0
--   • Cai Rang Floating Market 1.jpg — Christophe95 — CC BY-SA 4.0
--   • Cai Rang Floating Market 3.jpg — Christophe95 — CC BY-SA 4.0
--   • Cai Rang Floating Market 4.jpg — Christophe95 — CC BY-SA 4.0
--   • Cai Rang Floating Market 5.jpg — Christophe95 — CC BY-SA 4.0
--   • Constellation of Literature pavilion - Temple of Literature, Hanoi - DSC04557.JPG — Daderot — CC0
--   • Constellation of Literature pavilion (Temple of Literature, Hanoi).jpg — Christophe95 — CC BY-SA 4.0
--   • DSC1051 -Vecchia casa di Tan Ky.jpg — YukioSanjo — CC BY-SA 4.0
--   • DSC1057 -Vecchia casa di Tan Ky.jpg — YukioSanjo — CC BY-SA 4.0
--   • First courtyard - Temple of Literature, Hanoi - DSC04546.JPG — Daderot — CC0
--   • Fujian Assembly Hall Hoi An 7.jpg — Christophe95 — CC BY-SA 4.0
--   • Hanoi - Ngoc Son Temple.jpg — P. Hughes — CC BY 4.0
--   • Hội An 2024 - Fujian Assembly Hall (Hội quán Phúc Kiến , 會安福建會館) - img 01.jpg — Chainwit. — CC BY 4.0
--   • Hội An, Chùa Cầu, 2020-01 CN-02.jpg — Steffen Schmitz — CC BY-SA 4.0
--   • Hội An, Chùa Cầu, 2020-01 CN-03.jpg — Steffen Schmitz — CC BY-SA 4.0
--   • Hội An, Fujian Assembly Hall, 2020-01 CN-01.jpg — Steffen Schmitz — CC BY-SA 4.0
--   • Huế (2024) - Meridian Gate - Ngọ Môn (Hoàng thành Huế) - img 02.jpg — Chainwit. — CC BY 4.0
--   • Hue Vietnam Thien-Mu-Temple-and-Pagoda-01.jpg — CEphoto, Uwe Aranas — CC BY-SA 3.0
--   • Hue Vietnam Thien-Mu-Temple-and-Pagoda-04.jpg — CEphoto, Uwe Aranas — CC BY-SA 3.0
--   • Meridian Gate, Hue (I).jpg — This Photo was taken by Supanut Arunoprayote. Feel free to use any of my images, but please mention me as the author and may send me a message. (สามารถใช้ภาพได้อิสระ แต่กรุณาใส่เครดิตผู้ถ่ายและอาจส่งข้อความบอกกล่าวด้วย) Please do not upload an updated image here without consultation with the Author. The author would like to make corrections only at his own source. This ensures that the changes are preserved.Please if you think that any changes should be required, please inform the author.Otherwise you can upload a new image with a new name. Please use one of the templates derivative or extract. — CC BY 4.0
--   • Một góc phố cổ Hội An.JPG — LÊ TẤN LỘC — CC BY-SA 3.0
--   • Ngọ môn, Huế.jpg — Bùi Thụy Đào Nguyên — CC BY-SA 3.0
--   • Ngoc Son Temple, Hanoi (15) (37780892234).jpg — Richard Mortel from Riyadh, Saudi Arabia — CC BY 2.0
--   • Nha co Binh Thuy 1.jpg — Daaé — Public domain
--   • Nhà cổ Bình Thủy 2.jpg — Thuydaonguyen — CC BY 3.0
--   • Nhà cổ Bình Thủy.jpg — Thuydaonguyen — CC BY 3.0
--   • Ninh Kieu Quay.jpg — Christophe95 — CC BY-SA 4.0
--   • Palace of Supreme Harmony (Dien Thai Hoa), Nguyen Dynasty Forbidden City, Hue (15436857392).jpg — Gary Todd from Xinzheng, China — CC0
--   • Rice noodle factory 4.jpg — Christophe95 — CC BY-SA 4.0
--   • Rice noodle factory, Can Tho (44294968960).jpg — Isabell Schulz — CC BY-SA 2.0
--   • Rice noodle factory, Can Tho (45387552894).jpg — Isabell Schulz — CC BY-SA 2.0
--   • Stelae of Doctors - Temple of Literature, Hanoi - DSC04571.JPG — Daderot — CC0
--   • Stelae of Doctors - Temple of Literature, Hanoi - DSC04680.JPG — Daderot — CC0
--   • Stelae of Doctors - Temple of Literature, Hanoi - DSC04681.JPG — Daderot — CC0
--   • Temple of the Jade Mountain, Hanoi, Vietnam, 20240204 1309 5741.jpg — Jakub Hałun — CC BY 4.0
--   • Thái Hòa Palace (I).jpg — This Photo was taken by Supanut Arunoprayote. Feel free to use any of my images, but please mention me as the author and may send me a message. (สามารถใช้ภาพได้อิสระ แต่กรุณาใส่เครดิตผู้ถ่ายและอาจส่งข้อความบอกกล่าวด้วย) Please do not upload an updated image here without consultation with the Author. The author would like to make corrections only at his own source. This ensures that the changes are preserved.Please if you think that any changes should be required, please inform the author.Otherwise you can upload a new image with a new name. Please use one of the templates derivative or extract. — CC BY 4.0
--   • Thai Hoa Palace 20190917.jpg — Suicasmo — CC BY-SA 4.0
--   • Thien Mu Pagoda in February 2025.jpg — SerChevalerie — CC0
--   • Third Courtyard, Temple of Literature, Hanoi, Vietnam, 20240123 0947 3141.jpg — Jakub Hałun — CC BY 4.0
--   • Xã Bát Tràng、鉢塲社 バチャン村 DSCF2654.JPG — 松岡明芳 — CC BY-SA 3.0
-- =====================================================================================

-- ── Bát Tràng nửa ngày: đình làng, chợ gốm và bàn xoay ────────────────────
DO $$
DECLARE
    v_provider bigint; v_moderator bigint; v_tour bigint; v_stop bigint; v_q bigint; v_exp bigint; v_review bigint; v_dep date;
BEGIN
    IF EXISTS (SELECT 1 FROM tours WHERE title = 'Bát Tràng nửa ngày: đình làng, chợ gốm và bàn xoay' AND deleted = FALSE) THEN
        RAISE NOTICE 'Bỏ qua (đã có): %', 'Bát Tràng nửa ngày: đình làng, chợ gốm và bàn xoay';
        RETURN;
    END IF;
    SELECT u.id INTO v_provider FROM users u JOIN roles r ON r.id = u.role_id JOIN provider_profiles p ON p.user_id = u.id
     WHERE r.name = 'CONTENT_PROVIDER' AND p.active AND u.active
     ORDER BY (SELECT count(*) FROM tours x WHERE x.created_by = u.id AND x.tour_format IS NOT NULL) DESC, u.id LIMIT 1;
    SELECT u.id INTO v_moderator FROM users u JOIN roles r ON r.id = u.role_id
     WHERE r.name = 'CONTENT_MODERATOR' AND u.active ORDER BY u.id LIMIT 1;
    IF v_provider IS NULL OR v_moderator IS NULL THEN
        RAISE EXCEPTION 'Thiếu tài khoản CONTENT_PROVIDER hoặc CONTENT_MODERATOR đang hoạt động.';
    END IF;
    INSERT INTO tours (title, tour_type, duration_days, duration_nights, duration_minutes, tour_format, region_id, theme_id,
        approved, status, cover_image_url, deleted, created_by, created_at, updated_at, description,
        price_includes, price_excludes, force_majeure, refund_policy, contact_info, cancellation_policy,
        max_guests_per_slot, content_rights_confirmed, version_number, submitted_at, published_at)
    VALUES ('Bát Tràng nửa ngày: đình làng, chợ gốm và bàn xoay', 'CULTURAL', 1, 0, 240, 'DAY_TRIP', 2, 1,
        TRUE, 'PUBLISHED', 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/B%C3%A1t_Tr%C3%A0ng_DSC_0096.JPG/960px-B%C3%A1t_Tr%C3%A0ng_DSC_0096.JPG', FALSE, v_provider, NOW() - INTERVAL '10 days', NOW(), 'Nửa ngày ở làng gốm Bát Tràng bên bờ sông Hồng, cách trung tâm Hà Nội khoảng 13 km. Bạn thăm ngôi đình làng dựng lại năm 1720, đi bộ qua chợ gốm với hàng nghìn món men lam, men rạn, rồi ngồi vào bàn xoay để tự tay nặn một chiếc bát hoặc lọ hoa dưới sự hướng dẫn của thợ gốm trong làng. Mỗi điểm dừng có quiz và hoạt động check-in trên ứng dụng JourneyGo.',
        'Hướng dẫn viên người địa phương
Một lượt nặn gốm trên bàn xoay (khoảng 45 phút), đất sét và dụng cụ
Một sản phẩm gốm tự làm (nung và giao lại sau)
Nước uống đóng chai', 'Phí giao sản phẩm sau khi nung (thường 3–5 ngày)
Xe đưa đón từ nội thành Hà Nội
Chi phí mua gốm tại chợ
Ăn trưa',
        'Khi có mưa bão, thiên tai hoặc di tích đóng cửa đột xuất, đối tác sẽ báo trước qua ứng dụng và đề xuất đổi ngày hoặc hoàn 100% tiền tour.',
        'Tiền hoàn về tài khoản thanh toán trong vòng 7 ngày làm việc.',
        'Nhắn tin cho đối tác qua mục Hỗ trợ trong ứng dụng JourneyGo (8:00–20:00).', 'Hủy trước 24 giờ so với giờ khởi hành: hoàn 100%.
Hủy trong vòng 24 giờ: hoàn 50%.
Không đến: không hoàn tiền.',
        15, TRUE, 1, NOW() - INTERVAL '10 days', NOW() - INTERVAL '9 days')
    RETURNING tour_id INTO v_tour;
    INSERT INTO tour_prices (tour_id, guest_type, price, counts_toward_slot) VALUES
        (v_tour, 'ADULT', 450000, TRUE), (v_tour, 'CHILD', 300000, TRUE),
        (v_tour, 'TODDLER', 80000, FALSE), (v_tour, 'INFANT', 0, FALSE);
    INSERT INTO tour_highlights (tour_id, position, content) VALUES
        (v_tour, 0, 'Thăm đình Bát Tràng dựng lại năm 1720, quay mặt ra sông Hồng'),
        (v_tour, 1, 'Dạo chợ gốm Bát Tràng, phân biệt men lam, men rạn và men nâu'),
        (v_tour, 2, 'Tự tay nặn gốm trên bàn xoay cùng thợ làng'),
        (v_tour, 3, 'Nghe chuyện người Bạch Bát theo vua Lý dời đô ra lập phường gốm');
    INSERT INTO tour_images (tour_id, position, image_url) VALUES
        (v_tour, 0, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/B%C3%A1t_Tr%C3%A0ng_DSC_0096.JPG/960px-B%C3%A1t_Tr%C3%A0ng_DSC_0096.JPG'),
        (v_tour, 1, 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Bat_Trang_communal_house_%282018%29_08.jpg/960px-Bat_Trang_communal_house_%282018%29_08.jpg'),
        (v_tour, 2, 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/B%C3%A1t_Tr%C3%A0ng_DSC_0098.JPG/960px-B%C3%A1t_Tr%C3%A0ng_DSC_0098.JPG'),
        (v_tour, 3, 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Bat_Trang_communal_house_%282018%29_05.jpg/960px-Bat_Trang_communal_house_%282018%29_05.jpg'),
        (v_tour, 4, 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/X%C3%A3_B%C3%A1t_Tr%C3%A0ng%E3%80%81%E9%89%A2%E5%A1%B2%E7%A4%BE_%E3%83%90%E3%83%81%E3%83%A3%E3%83%B3%E6%9D%91_DSCF2654.JPG/960px-X%C3%A3_B%C3%A1t_Tr%C3%A0ng%E3%80%81%E9%89%A2%E5%A1%B2%E7%A4%BE_%E3%83%90%E3%83%81%E3%83%A3%E3%83%B3%E6%9D%91_DSCF2654.JPG'),
        (v_tour, 5, 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/B%C3%A1t_Tr%C3%A0ng_DSC_0097.JPG/960px-B%C3%A1t_Tr%C3%A0ng_DSC_0097.JPG');
    INSERT INTO tour_itinerary_days (tour_id, position, title, main_activity, content, day_number)
    VALUES (v_tour, 0, 'Đình Bát Tràng – Chợ gốm – Xưởng nặn gốm', 'Nửa ngày ở làng gốm Bát Tràng', '**08:00** Gặp hướng dẫn viên tại cổng đình Bát Tràng
**08:15** Tham quan đình, nghe chuyện sáu vị thần được thờ
**09:00** Đi bộ qua chợ gốm Bát Tràng
**10:00** Nặn gốm trên bàn xoay tại xưởng trong làng
**11:30** Trang trí, ghi tên lên sản phẩm để thợ nung
**12:00** Kết thúc tour tại chợ gốm', 1);
    -- Điểm 1: Đình Bát Tràng
    INSERT INTO tour_stops (tour_id, sequence_order, name, short_description, guest_note, image_url, cultural_content, created_at, updated_at)
    VALUES (v_tour, 1, 'Đình Bát Tràng', 'Ngôi đình lớn của xứ Kinh Bắc xưa, làm lại năm 1720 đời vua Lê Dụ Tông, quay mặt ra sông Hồng.', 'Mặc trang phục kín đáo khi vào đình. Không ngồi lên bục gỗ trong gian thờ.', 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Bat_Trang_communal_house_%282018%29_08.jpg/960px-Bat_Trang_communal_house_%282018%29_08.jpg', 'Đình Bát Tràng được làm lại vào năm 1720, đời vua Lê Dụ Tông, theo kiểu chữ Nhị: phía trong là hậu cung ba gian, phía ngoài là tòa đại bái năm gian hai chái. Cột đình là những cây gỗ lim lớn, các gian bên lát bục gỗ theo bậc tam cấp làm chỗ ngồi cho các cụ trong làng khi có việc làng.

Đình thờ sáu vị thần có công giúp dân đánh giặc giữ nước, trong đó có Bạch Mã Đại Vương. Hiện đình còn giữ hơn 50 đạo sắc phong cho thành hoàng qua các đời vua Lê Cảnh Hưng, Quang Trung và Cảnh Thịnh.

Đình quay mặt ra sông Nhị Hà, tức sông Hồng. Con sông vừa là đường chở đất, chở củi, vừa là đường đưa gốm Bát Tràng đi khắp nơi.', NOW(), NOW())
    RETURNING id INTO v_stop;
    INSERT INTO tour_stop_cultural_images (stop_id, position, image_url) VALUES
        (v_stop, 0, 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Bat_Trang_communal_house_%282018%29_05.jpg/960px-Bat_Trang_communal_house_%282018%29_05.jpg'),
        (v_stop, 1, 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2d/Bat_Trang_communal_house_%282018%29_01.jpg/960px-Bat_Trang_communal_house_%282018%29_01.jpg');
    INSERT INTO tour_stop_questions (stop_id, experience_id, kind, sequence_order, content, points_reward, question_type, reference_answer)
    VALUES (v_stop, NULL, 'QUIZ', 1, 'Đình Bát Tràng được làm lại vào năm nào?', 10, 'MULTIPLE_CHOICE', NULL) RETURNING id INTO v_q;
    INSERT INTO tour_stop_answers (question_id, sequence_order, content, is_correct) VALUES
        (v_q, 1, '1720', TRUE),
        (v_q, 2, '1802', FALSE),
        (v_q, 3, '1858', FALSE),
        (v_q, 4, '1945', FALSE);
    INSERT INTO tour_stop_questions (stop_id, experience_id, kind, sequence_order, content, points_reward, question_type, reference_answer)
    VALUES (v_stop, NULL, 'QUIZ', 2, 'Đình Bát Tràng quay mặt ra con sông nào?', 10, 'MULTIPLE_CHOICE', NULL) RETURNING id INTO v_q;
    INSERT INTO tour_stop_answers (question_id, sequence_order, content, is_correct) VALUES
        (v_q, 1, 'Sông Đuống', FALSE),
        (v_q, 2, 'Sông Đáy', FALSE),
        (v_q, 3, 'Sông Hồng', TRUE),
        (v_q, 4, 'Sông Cầu', FALSE);
    INSERT INTO tour_stop_experiences (stop_id, sequence_order, activity_name, checkpoint_latitude, checkpoint_longitude,
        radius_meters, duration_seconds, points_reward, qr_token)
    VALUES (v_stop, 1, 'Đếm số gian của tòa đại bái', 20.97455, 105.91185, 200, 600, 50,
        'JGE-' || upper(substr(md5(v_tour::text || '-' || v_stop::text || '-exp'), 1, 16)))
    RETURNING id INTO v_exp;
    INSERT INTO tour_stop_questions (stop_id, experience_id, kind, sequence_order, content, points_reward, question_type, reference_answer)
    VALUES (NULL, v_exp, 'POST_EXPERIENCE', 1, 'Tòa đại bái phía ngoài của đình Bát Tràng có bao nhiêu gian (không tính chái)?', NULL, 'TEXT', '5;năm;5 gian;năm gian');
    -- Điểm 2: Chợ gốm và xưởng nặn gốm Bát Tràng
    INSERT INTO tour_stops (tour_id, sequence_order, name, short_description, guest_note, image_url, cultural_content, created_at, updated_at)
    VALUES (v_tour, 2, 'Chợ gốm và xưởng nặn gốm Bát Tràng', 'Chợ gốm của làng và xưởng nhỏ nơi bạn tự nặn gốm trên bàn xoay cùng thợ Bát Tràng.', 'Mặc quần áo dễ giặt, đất sét có thể dính lên tay áo. Xưởng có tạp dề cho khách.', 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/B%C3%A1t_Tr%C3%A0ng_DSC_0098.JPG/960px-B%C3%A1t_Tr%C3%A0ng_DSC_0098.JPG', 'Tên gọi Bát Tràng có thể hiểu là "cái đình lớn chuyên sản xuất bát". Một số tài liệu khác cho rằng tên làng bắt nguồn từ Bạch Thổ Phường, nghĩa là phường đất sét trắng.

Theo sử làng, khi nhà Lý dời đô từ Hoa Lư ra Thăng Long, những người dân làng gốm Bạch Bát (nay thuộc Ninh Bình) đã theo ra vùng đất bồi bên bờ sông Hồng, lập phường làm gốm. Từ đó, gốm Bát Tràng trở thành dòng gốm dân dụng nổi tiếng nhất miền Bắc, với các dòng men lam, men rạn và men nâu.

Trên bàn xoay, người thợ đặt khối đất vào giữa, giữ tay thật đều để đất "lên" thành thân bát. Bạn sẽ thấy chỉ một chút lệch tay là thành bát méo ngay.', NOW(), NOW())
    RETURNING id INTO v_stop;
    INSERT INTO tour_stop_cultural_images (stop_id, position, image_url) VALUES
        (v_stop, 0, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/B%C3%A1t_Tr%C3%A0ng_DSC_0096.JPG/960px-B%C3%A1t_Tr%C3%A0ng_DSC_0096.JPG'),
        (v_stop, 1, 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/B%C3%A1t_Tr%C3%A0ng_DSC_0097.JPG/960px-B%C3%A1t_Tr%C3%A0ng_DSC_0097.JPG');
    INSERT INTO tour_stop_questions (stop_id, experience_id, kind, sequence_order, content, points_reward, question_type, reference_answer)
    VALUES (v_stop, NULL, 'QUIZ', 1, 'Theo sử làng, những người lập phường gốm Bát Tràng đến từ làng gốm nào?', 10, 'MULTIPLE_CHOICE', NULL) RETURNING id INTO v_q;
    INSERT INTO tour_stop_answers (question_id, sequence_order, content, is_correct) VALUES
        (v_q, 1, 'Thổ Hà', FALSE),
        (v_q, 2, 'Bạch Bát', TRUE),
        (v_q, 3, 'Phù Lãng', FALSE),
        (v_q, 4, 'Chu Đậu', FALSE);
    INSERT INTO tour_stop_questions (stop_id, experience_id, kind, sequence_order, content, points_reward, question_type, reference_answer)
    VALUES (v_stop, NULL, 'QUIZ', 2, 'Tên gọi cổ Bạch Thổ Phường của làng có nghĩa là gì?', 10, 'MULTIPLE_CHOICE', NULL) RETURNING id INTO v_q;
    INSERT INTO tour_stop_answers (question_id, sequence_order, content, is_correct) VALUES
        (v_q, 1, 'Phường thợ mộc', FALSE),
        (v_q, 2, 'Phường buôn muối', FALSE),
        (v_q, 3, 'Phường dệt lụa', FALSE),
        (v_q, 4, 'Phường đất sét trắng', TRUE);
    INSERT INTO tour_stop_experiences (stop_id, sequence_order, activity_name, checkpoint_latitude, checkpoint_longitude,
        radius_meters, duration_seconds, points_reward, qr_token)
    VALUES (v_stop, 1, 'Nặn một sản phẩm gốm trên bàn xoay', 20.9768, 105.9135, 250, 2700, 50,
        'JGE-' || upper(substr(md5(v_tour::text || '-' || v_stop::text || '-exp'), 1, 16)))
    RETURNING id INTO v_exp;
    INSERT INTO tour_stop_questions (stop_id, experience_id, kind, sequence_order, content, points_reward, question_type, reference_answer)
    VALUES (NULL, v_exp, 'POST_EXPERIENCE', 1, 'Ngoài men lam và men rạn, hãy kể tên một dòng men khác của gốm Bát Tràng mà bạn đã nghe trong buổi nặn gốm.', NULL, 'TEXT', 'men nâu;nâu;men da lươn;da lươn;men trắng;trắng');
    -- Lịch khởi hành: mọi thứ Bảy và Chủ nhật trong 6 tuần tới
    FOR v_dep IN SELECT d::date FROM generate_series(CURRENT_DATE + 1, CURRENT_DATE + 42, INTERVAL '1 day') d
                 WHERE EXTRACT(ISODOW FROM d) IN (6, 7) LOOP
        INSERT INTO tour_departure_dates (tour_id, departure_date) VALUES (v_tour, v_dep);
        INSERT INTO tour_slots (tour_id, slot_date, capacity, booked_count, status, created_at)
        VALUES (v_tour, v_dep, 15, 0, 'OPEN', NOW());
    END LOOP;
    INSERT INTO tour_reviews (tour_id, status, submitted_at, reviewed_at, reviewer_id, tour_version, decision_note,
        crit_interactive, crit_local_expertise, crit_storytelling, crit_cultural_ratio, crit_authentic_media)
    VALUES (v_tour, 'APPROVED', NOW() - INTERVAL '10 days', NOW() - INTERVAL '9 days', v_moderator, 1,
        'Nội dung chính xác, ảnh thật có nguồn rõ ràng, checkpoint đúng vị trí.', TRUE, TRUE, TRUE, TRUE, TRUE)
    RETURNING id INTO v_review;
    INSERT INTO tour_review_history (review_id, action, created_at, actor_id, note, from_status, to_status, tour_version) VALUES
        (v_review, 'SUBMITTED', NOW() - INTERVAL '10 days', v_provider, NULL, 'DRAFT', 'PENDING_REVIEW', 1),
        (v_review, 'APPROVED', NOW() - INTERVAL '9 days', v_moderator, 'Nội dung chính xác, ảnh thật có nguồn rõ ràng, checkpoint đúng vị trí.', 'PENDING_REVIEW', 'PUBLISHED', 1);
    RAISE NOTICE 'Đã tạo tour % (id %)', 'Bát Tràng nửa ngày: đình làng, chợ gốm và bàn xoay', v_tour;
END $$;

-- ── Phố cổ Hội An: Chùa Cầu, nhà cổ Tấn Ký và hội quán Phúc Kiến ──────────
DO $$
DECLARE
    v_provider bigint; v_moderator bigint; v_tour bigint; v_stop bigint; v_q bigint; v_exp bigint; v_review bigint; v_dep date;
BEGIN
    IF EXISTS (SELECT 1 FROM tours WHERE title = 'Phố cổ Hội An: Chùa Cầu, nhà cổ Tấn Ký và hội quán Phúc Kiến' AND deleted = FALSE) THEN
        RAISE NOTICE 'Bỏ qua (đã có): %', 'Phố cổ Hội An: Chùa Cầu, nhà cổ Tấn Ký và hội quán Phúc Kiến';
        RETURN;
    END IF;
    SELECT u.id INTO v_provider FROM users u JOIN roles r ON r.id = u.role_id JOIN provider_profiles p ON p.user_id = u.id
     WHERE r.name = 'CONTENT_PROVIDER' AND p.active AND u.active
     ORDER BY (SELECT count(*) FROM tours x WHERE x.created_by = u.id AND x.tour_format IS NOT NULL) DESC, u.id LIMIT 1;
    SELECT u.id INTO v_moderator FROM users u JOIN roles r ON r.id = u.role_id
     WHERE r.name = 'CONTENT_MODERATOR' AND u.active ORDER BY u.id LIMIT 1;
    IF v_provider IS NULL OR v_moderator IS NULL THEN
        RAISE EXCEPTION 'Thiếu tài khoản CONTENT_PROVIDER hoặc CONTENT_MODERATOR đang hoạt động.';
    END IF;
    INSERT INTO tours (title, tour_type, duration_days, duration_nights, duration_minutes, tour_format, region_id, theme_id,
        approved, status, cover_image_url, deleted, created_by, created_at, updated_at, description,
        price_includes, price_excludes, force_majeure, refund_policy, contact_info, cancellation_policy,
        max_guests_per_slot, content_rights_confirmed, version_number, submitted_at, published_at)
    VALUES ('Phố cổ Hội An: Chùa Cầu, nhà cổ Tấn Ký và hội quán Phúc Kiến', 'HISTORICAL', 1, 0, 210, 'DAY_TRIP', 1, 5,
        TRUE, 'PUBLISHED', 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/H%E1%BB%99i_An%2C_Ch%C3%B9a_C%E1%BA%A7u%2C_2020-01_CN-02.jpg/960px-H%E1%BB%99i_An%2C_Ch%C3%B9a_C%E1%BA%A7u%2C_2020-01_CN-02.jpg', FALSE, v_provider, NOW() - INTERVAL '10 days', NOW(), 'Buổi đi bộ qua khu phố cổ Hội An, di sản thế giới được UNESCO ghi danh năm 1999. Bắt đầu từ Chùa Cầu do thương nhân Nhật Bản góp tiền xây, ghé nhà cổ Tấn Ký với hai mặt tiền ra phố và ra sông, rồi kết thúc ở hội quán Phúc Kiến của cộng đồng người Hoa. Tại mỗi điểm, ứng dụng JourneyGo mở câu chuyện khi bạn check-in, kèm quiz và một nhiệm vụ quan sát tại chỗ.',
        'Hướng dẫn viên tiếng Việt suốt tuyến
Vé tham quan phố cổ Hội An (gồm vé vào các điểm trong tuyến)
Nước uống đóng chai', 'Ăn uống trong phố cổ
Thả đèn hoa đăng, đi thuyền sông Hoài
Xe đưa đón khách sạn',
        'Khi có mưa bão, thiên tai hoặc di tích đóng cửa đột xuất, đối tác sẽ báo trước qua ứng dụng và đề xuất đổi ngày hoặc hoàn 100% tiền tour.',
        'Tiền hoàn về tài khoản thanh toán trong vòng 7 ngày làm việc.',
        'Nhắn tin cho đối tác qua mục Hỗ trợ trong ứng dụng JourneyGo (8:00–20:00).', 'Hủy trước 24 giờ so với giờ khởi hành: hoàn 100%.
Hủy trong vòng 24 giờ: hoàn 50%.
Không đến: không hoàn tiền.',
        20, TRUE, 1, NOW() - INTERVAL '10 days', NOW() - INTERVAL '9 days')
    RETURNING tour_id INTO v_tour;
    INSERT INTO tour_prices (tour_id, guest_type, price, counts_toward_slot) VALUES
        (v_tour, 'ADULT', 390000, TRUE), (v_tour, 'CHILD', 250000, TRUE),
        (v_tour, 'TODDLER', 60000, FALSE), (v_tour, 'INFANT', 0, FALSE);
    INSERT INTO tour_highlights (tour_id, position, content) VALUES
        (v_tour, 0, 'Qua Chùa Cầu, cây cầu được chúa Nguyễn Phúc Chu đặt tên Lai Viễn Kiều năm 1719'),
        (v_tour, 1, 'Thăm nhà cổ Tấn Ký với kết cấu gỗ kết hợp Việt, Hoa, Nhật'),
        (v_tour, 2, 'Tìm hiểu tín ngưỡng thờ Thiên Hậu tại hội quán Phúc Kiến'),
        (v_tour, 3, 'Đi bộ trong phố cổ được UNESCO ghi danh năm 1999');
    INSERT INTO tour_images (tour_id, position, image_url) VALUES
        (v_tour, 0, 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/H%E1%BB%99i_An%2C_Ch%C3%B9a_C%E1%BA%A7u%2C_2020-01_CN-02.jpg/960px-H%E1%BB%99i_An%2C_Ch%C3%B9a_C%E1%BA%A7u%2C_2020-01_CN-02.jpg'),
        (v_tour, 1, 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/2024_H%E1%BB%99i_An_-_Japanese_Covered_Bridge_%28Ch%C3%B9a_C%E1%BA%A7u%29_after_renovation_-_img_11.jpg/960px-2024_H%E1%BB%99i_An_-_Japanese_Covered_Bridge_%28Ch%C3%B9a_C%E1%BA%A7u%29_after_renovation_-_img_11.jpg'),
        (v_tour, 2, 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/DSC1057_-Vecchia_casa_di_Tan_Ky.jpg/960px-DSC1057_-Vecchia_casa_di_Tan_Ky.jpg'),
        (v_tour, 3, 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/H%E1%BB%99i_An%2C_Fujian_Assembly_Hall%2C_2020-01_CN-01.jpg/960px-H%E1%BB%99i_An%2C_Fujian_Assembly_Hall%2C_2020-01_CN-01.jpg'),
        (v_tour, 4, 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/2024-12-20_Hoi_An_Old_Town_at_night_4.jpg/960px-2024-12-20_Hoi_An_Old_Town_at_night_4.jpg'),
        (v_tour, 5, 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/M%E1%BB%99t_g%C3%B3c_ph%E1%BB%91_c%E1%BB%95_H%E1%BB%99i_An.JPG/960px-M%E1%BB%99t_g%C3%B3c_ph%E1%BB%91_c%E1%BB%95_H%E1%BB%99i_An.JPG');
    INSERT INTO tour_itinerary_days (tour_id, position, title, main_activity, content, day_number)
    VALUES (v_tour, 0, 'Chùa Cầu – Nhà cổ Tấn Ký – Hội quán Phúc Kiến', 'Đi bộ khám phá phố cổ Hội An', '**14:30** Gặp hướng dẫn viên ở đầu phía tây Chùa Cầu
**14:45** Tham quan Chùa Cầu
**15:30** Nhà cổ Tấn Ký, đường Nguyễn Thái Học
**16:30** Hội quán Phúc Kiến, đường Trần Phú
**17:30** Dạo phố cổ lúc lên đèn
**18:00** Kết thúc tour', 1);
    -- Điểm 1: Chùa Cầu (Lai Viễn Kiều)
    INSERT INTO tour_stops (tour_id, sequence_order, name, short_description, guest_note, image_url, cultural_content, created_at, updated_at)
    VALUES (v_tour, 1, 'Chùa Cầu (Lai Viễn Kiều)', 'Cây cầu gỗ có mái do thương nhân Nhật Bản góp tiền xây vào khoảng thế kỷ 17, biểu tượng của Hội An.', 'Cầu hẹp, khách đông vào cuối chiều. Đi theo một chiều và không dừng lâu giữa cầu.', 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/H%E1%BB%99i_An%2C_Ch%C3%B9a_C%E1%BA%A7u%2C_2020-01_CN-02.jpg/960px-H%E1%BB%99i_An%2C_Ch%C3%B9a_C%E1%BA%A7u%2C_2020-01_CN-02.jpg', 'Chùa Cầu được các thương nhân Nhật Bản góp tiền xây dựng vào khoảng thế kỷ 17, nên người ta còn gọi là cầu Nhật Bản. Theo truyền thuyết, cây cầu như một thanh kiếm cắm xuống lưng con quái vật Namazu, khiến nó không quẫy đuôi gây động đất.

Về sau người ta dựng thêm một ngôi chùa nhỏ nối vào lan can phía bắc, nhô ra giữa cầu, từ đó người địa phương gọi là Chùa Cầu. Năm 1719, chúa Nguyễn Phúc Chu đến Hội An và đặt tên cho cầu là Lai Viễn Kiều, nghĩa là "cầu đón khách phương xa".

Theo niên đại ghi trên xà nóc và văn bia, cầu được dựng lại năm 1817 và trùng tu nhiều lần sau đó. Hình ảnh Chùa Cầu được in trên tờ tiền polymer mệnh giá 20.000 đồng.', NOW(), NOW())
    RETURNING id INTO v_stop;
    INSERT INTO tour_stop_cultural_images (stop_id, position, image_url) VALUES
        (v_stop, 0, 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/2024_H%E1%BB%99i_An_-_Japanese_Covered_Bridge_%28Ch%C3%B9a_C%E1%BA%A7u%29_after_renovation_-_img_11.jpg/960px-2024_H%E1%BB%99i_An_-_Japanese_Covered_Bridge_%28Ch%C3%B9a_C%E1%BA%A7u%29_after_renovation_-_img_11.jpg'),
        (v_stop, 1, 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/H%E1%BB%99i_An%2C_Ch%C3%B9a_C%E1%BA%A7u%2C_2020-01_CN-03.jpg/960px-H%E1%BB%99i_An%2C_Ch%C3%B9a_C%E1%BA%A7u%2C_2020-01_CN-03.jpg');
    INSERT INTO tour_stop_questions (stop_id, experience_id, kind, sequence_order, content, points_reward, question_type, reference_answer)
    VALUES (v_stop, NULL, 'QUIZ', 1, 'Năm 1719, chúa Nguyễn Phúc Chu đặt tên cho cầu là gì?', 10, 'MULTIPLE_CHOICE', NULL) RETURNING id INTO v_q;
    INSERT INTO tour_stop_answers (question_id, sequence_order, content, is_correct) VALUES
        (v_q, 1, 'Lai Viễn Kiều', TRUE),
        (v_q, 2, 'Cẩm Nam Kiều', FALSE),
        (v_q, 3, 'An Hội Kiều', FALSE),
        (v_q, 4, 'Trường Tiền Kiều', FALSE);
    INSERT INTO tour_stop_questions (stop_id, experience_id, kind, sequence_order, content, points_reward, question_type, reference_answer)
    VALUES (v_stop, NULL, 'QUIZ', 2, 'Hình Chùa Cầu được in trên tờ tiền polymer mệnh giá nào?', 10, 'MULTIPLE_CHOICE', NULL) RETURNING id INTO v_q;
    INSERT INTO tour_stop_answers (question_id, sequence_order, content, is_correct) VALUES
        (v_q, 1, '10.000 đồng', FALSE),
        (v_q, 2, '50.000 đồng', FALSE),
        (v_q, 3, '20.000 đồng', TRUE),
        (v_q, 4, '100.000 đồng', FALSE);
    INSERT INTO tour_stop_experiences (stop_id, sequence_order, activity_name, checkpoint_latitude, checkpoint_longitude,
        radius_meters, duration_seconds, points_reward, qr_token)
    VALUES (v_stop, 1, 'Tìm tượng hai con vật ở hai đầu cầu', 15.87707, 108.32601, 100, 600, 50,
        'JGE-' || upper(substr(md5(v_tour::text || '-' || v_stop::text || '-exp'), 1, 16)))
    RETURNING id INTO v_exp;
    INSERT INTO tour_stop_questions (stop_id, experience_id, kind, sequence_order, content, points_reward, question_type, reference_answer)
    VALUES (NULL, v_exp, 'POST_EXPERIENCE', 1, 'Hai đầu Chùa Cầu có tượng thờ hai con vật nào?', NULL, 'TEXT', 'khỉ và chó;chó và khỉ;khỉ, chó;chó, khỉ;khỉ chó;chó khỉ');
    -- Điểm 2: Nhà cổ Tấn Ký
    INSERT INTO tour_stops (tour_id, sequence_order, name, short_description, guest_note, image_url, cultural_content, created_at, updated_at)
    VALUES (v_tour, 2, 'Nhà cổ Tấn Ký', 'Nhà phố gỗ hình ống trên đường Nguyễn Thái Học, mặt trước ra phố, mặt sau nhìn ra sông Hoài.', 'Đây là nhà có người ở. Giữ yên lặng và không chạm vào đồ thờ trong nhà.', 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/DSC1057_-Vecchia_casa_di_Tan_Ky.jpg/960px-DSC1057_-Vecchia_casa_di_Tan_Ky.jpg', 'Nhà cổ Tấn Ký là kiểu nhà phố hình ống điển hình của Hội An: nhà hẹp ngang và sâu, mặt trước mở ra đường Nguyễn Thái Học để buôn bán, mặt sau nhìn ra sông Hoài để tiện nhận hàng từ thuyền. Đây là dấu vết của thời Hội An còn là thương cảng sầm uất.

Kết cấu gỗ trong nhà kết hợp ba phong cách: bộ khung kiểu Việt, các chi tiết chạm trổ mang ảnh hưởng Hoa, và vì kèo kiểu Nhật. Gia đình chủ nhà đã sống ở đây qua nhiều thế hệ.

Hãy để ý trên tường và cột nhà: những vạch đánh dấu ghi lại mực nước của các trận lũ lớn từng tràn vào phố cổ.', NOW(), NOW())
    RETURNING id INTO v_stop;
    INSERT INTO tour_stop_cultural_images (stop_id, position, image_url) VALUES
        (v_stop, 0, 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/DSC1051_-Vecchia_casa_di_Tan_Ky.jpg/960px-DSC1051_-Vecchia_casa_di_Tan_Ky.jpg');
    INSERT INTO tour_stop_questions (stop_id, experience_id, kind, sequence_order, content, points_reward, question_type, reference_answer)
    VALUES (v_stop, NULL, 'QUIZ', 1, 'Mặt sau của nhà cổ Tấn Ký nhìn ra con sông nào?', 10, 'MULTIPLE_CHOICE', NULL) RETURNING id INTO v_q;
    INSERT INTO tour_stop_answers (question_id, sequence_order, content, is_correct) VALUES
        (v_q, 1, 'Sông Hàn', FALSE),
        (v_q, 2, 'Sông Hoài', TRUE),
        (v_q, 3, 'Sông Hương', FALSE),
        (v_q, 4, 'Sông Trà Khúc', FALSE);
    INSERT INTO tour_stop_questions (stop_id, experience_id, kind, sequence_order, content, points_reward, question_type, reference_answer)
    VALUES (v_stop, NULL, 'QUIZ', 2, 'Vì sao nhà phố Hội An thường có hai mặt, một mặt ra phố và một mặt ra sông?', 10, 'MULTIPLE_CHOICE', NULL) RETURNING id INTO v_q;
    INSERT INTO tour_stop_answers (question_id, sequence_order, content, is_correct) VALUES
        (v_q, 1, 'Để tránh nắng buổi chiều', FALSE),
        (v_q, 2, 'Để có hai cổng cho hai gia đình', FALSE),
        (v_q, 3, 'Do luật xây dựng thời Pháp', FALSE),
        (v_q, 4, 'Để vừa bán hàng trên phố vừa nhận hàng từ thuyền', TRUE);
    INSERT INTO tour_stop_experiences (stop_id, sequence_order, activity_name, checkpoint_latitude, checkpoint_longitude,
        radius_meters, duration_seconds, points_reward, qr_token)
    VALUES (v_stop, 1, 'Tìm vạch đánh dấu mực nước trên tường nhà', 15.87686, 108.32745, 120, 600, 50,
        'JGE-' || upper(substr(md5(v_tour::text || '-' || v_stop::text || '-exp'), 1, 16)))
    RETURNING id INTO v_exp;
    INSERT INTO tour_stop_questions (stop_id, experience_id, kind, sequence_order, content, points_reward, question_type, reference_answer)
    VALUES (NULL, v_exp, 'POST_EXPERIENCE', 1, 'Những vạch đánh dấu trên tường nhà cổ Tấn Ký ghi lại hiện tượng gì?', NULL, 'TEXT', 'lũ;lụt;lũ lụt;nước lũ;mực nước lũ');
    -- Điểm 3: Hội quán Phúc Kiến
    INSERT INTO tour_stops (tour_id, sequence_order, name, short_description, guest_note, image_url, cultural_content, created_at, updated_at)
    VALUES (v_tour, 3, 'Hội quán Phúc Kiến', 'Hội quán của cộng đồng người Hoa gốc Phúc Kiến ở Hội An, thờ Thiên Hậu Thánh Mẫu.', 'Khi thắp hương, đứng sang hai bên để không chắn lối đi chính.', 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/H%E1%BB%99i_An%2C_Fujian_Assembly_Hall%2C_2020-01_CN-01.jpg/960px-H%E1%BB%99i_An%2C_Fujian_Assembly_Hall%2C_2020-01_CN-01.jpg', 'Hội quán Phúc Kiến do cộng đồng người Hoa gốc Phúc Kiến ở Hội An lập nên, vừa là nơi sinh hoạt đồng hương, vừa là nơi thờ tự. Vị thần chính được thờ là Thiên Hậu Thánh Mẫu, vị nữ thần phù hộ cho người đi biển.

Với thương nhân vượt biển đến buôn bán ở Hội An, Thiên Hậu là chỗ dựa tinh thần trong mỗi chuyến đi. Vì vậy hội quán của người Hoa ở các thương cảng thường dành gian thờ chính cho bà.

Khi đi từ cổng vào chính điện, hãy chú ý các vòng hương xoắn treo dưới mái. Mỗi vòng có thể cháy nhiều ngày, mang theo lời cầu nguyện của người thắp.', NOW(), NOW())
    RETURNING id INTO v_stop;
    INSERT INTO tour_stop_cultural_images (stop_id, position, image_url) VALUES
        (v_stop, 0, 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Fujian_Assembly_Hall_Hoi_An_7.jpg/960px-Fujian_Assembly_Hall_Hoi_An_7.jpg'),
        (v_stop, 1, 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/H%E1%BB%99i_An_2024_-_Fujian_Assembly_Hall_%28H%E1%BB%99i_qu%C3%A1n_Ph%C3%BAc_Ki%E1%BA%BFn_%2C_%E6%9C%83%E5%AE%89%E7%A6%8F%E5%BB%BA%E6%9C%83%E9%A4%A8%29_-_img_01.jpg/960px-H%E1%BB%99i_An_2024_-_Fujian_Assembly_Hall_%28H%E1%BB%99i_qu%C3%A1n_Ph%C3%BAc_Ki%E1%BA%BFn_%2C_%E6%9C%83%E5%AE%89%E7%A6%8F%E5%BB%BA%E6%9C%83%E9%A4%A8%29_-_img_01.jpg');
    INSERT INTO tour_stop_questions (stop_id, experience_id, kind, sequence_order, content, points_reward, question_type, reference_answer)
    VALUES (v_stop, NULL, 'QUIZ', 1, 'Hội quán Phúc Kiến do cộng đồng nào ở Hội An lập nên?', 10, 'MULTIPLE_CHOICE', NULL) RETURNING id INTO v_q;
    INSERT INTO tour_stop_answers (question_id, sequence_order, content, is_correct) VALUES
        (v_q, 1, 'Thương nhân Nhật Bản', FALSE),
        (v_q, 2, 'Người Chăm', FALSE),
        (v_q, 3, 'Người Hoa gốc Phúc Kiến', TRUE),
        (v_q, 4, 'Thương nhân Bồ Đào Nha', FALSE);
    INSERT INTO tour_stop_questions (stop_id, experience_id, kind, sequence_order, content, points_reward, question_type, reference_answer)
    VALUES (v_stop, NULL, 'QUIZ', 2, 'Thiên Hậu Thánh Mẫu được tôn là vị thần phù hộ cho ai?', 10, 'MULTIPLE_CHOICE', NULL) RETURNING id INTO v_q;
    INSERT INTO tour_stop_answers (question_id, sequence_order, content, is_correct) VALUES
        (v_q, 1, 'Người đi biển', TRUE),
        (v_q, 2, 'Người trồng lúa', FALSE),
        (v_q, 3, 'Thợ gốm', FALSE),
        (v_q, 4, 'Thợ mộc', FALSE);
    INSERT INTO tour_stop_experiences (stop_id, sequence_order, activity_name, checkpoint_latitude, checkpoint_longitude,
        radius_meters, duration_seconds, points_reward, qr_token)
    VALUES (v_stop, 1, 'Tìm gian thờ chính của hội quán', 15.8773, 108.32985, 120, 600, 50,
        'JGE-' || upper(substr(md5(v_tour::text || '-' || v_stop::text || '-exp'), 1, 16)))
    RETURNING id INTO v_exp;
    INSERT INTO tour_stop_questions (stop_id, experience_id, kind, sequence_order, content, points_reward, question_type, reference_answer)
    VALUES (NULL, v_exp, 'POST_EXPERIENCE', 1, 'Vị thần chính được thờ trong hội quán Phúc Kiến là ai?', NULL, 'TEXT', 'Thiên Hậu;Thiên Hậu Thánh Mẫu;bà Thiên Hậu;Mazu;Ma Tổ');
    -- Lịch khởi hành: mọi thứ Bảy và Chủ nhật trong 6 tuần tới
    FOR v_dep IN SELECT d::date FROM generate_series(CURRENT_DATE + 1, CURRENT_DATE + 42, INTERVAL '1 day') d
                 WHERE EXTRACT(ISODOW FROM d) IN (6, 7) LOOP
        INSERT INTO tour_departure_dates (tour_id, departure_date) VALUES (v_tour, v_dep);
        INSERT INTO tour_slots (tour_id, slot_date, capacity, booked_count, status, created_at)
        VALUES (v_tour, v_dep, 20, 0, 'OPEN', NOW());
    END LOOP;
    INSERT INTO tour_reviews (tour_id, status, submitted_at, reviewed_at, reviewer_id, tour_version, decision_note,
        crit_interactive, crit_local_expertise, crit_storytelling, crit_cultural_ratio, crit_authentic_media)
    VALUES (v_tour, 'APPROVED', NOW() - INTERVAL '10 days', NOW() - INTERVAL '9 days', v_moderator, 1,
        'Nội dung chính xác, ảnh thật có nguồn rõ ràng, checkpoint đúng vị trí.', TRUE, TRUE, TRUE, TRUE, TRUE)
    RETURNING id INTO v_review;
    INSERT INTO tour_review_history (review_id, action, created_at, actor_id, note, from_status, to_status, tour_version) VALUES
        (v_review, 'SUBMITTED', NOW() - INTERVAL '10 days', v_provider, NULL, 'DRAFT', 'PENDING_REVIEW', 1),
        (v_review, 'APPROVED', NOW() - INTERVAL '9 days', v_moderator, 'Nội dung chính xác, ảnh thật có nguồn rõ ràng, checkpoint đúng vị trí.', 'PENDING_REVIEW', 'PUBLISHED', 1);
    RAISE NOTICE 'Đã tạo tour % (id %)', 'Phố cổ Hội An: Chùa Cầu, nhà cổ Tấn Ký và hội quán Phúc Kiến', v_tour;
END $$;

-- ── Đại Nội Huế và chùa Thiên Mụ trong một buổi ───────────────────────────
DO $$
DECLARE
    v_provider bigint; v_moderator bigint; v_tour bigint; v_stop bigint; v_q bigint; v_exp bigint; v_review bigint; v_dep date;
BEGIN
    IF EXISTS (SELECT 1 FROM tours WHERE title = 'Đại Nội Huế và chùa Thiên Mụ trong một buổi' AND deleted = FALSE) THEN
        RAISE NOTICE 'Bỏ qua (đã có): %', 'Đại Nội Huế và chùa Thiên Mụ trong một buổi';
        RETURN;
    END IF;
    SELECT u.id INTO v_provider FROM users u JOIN roles r ON r.id = u.role_id JOIN provider_profiles p ON p.user_id = u.id
     WHERE r.name = 'CONTENT_PROVIDER' AND p.active AND u.active
     ORDER BY (SELECT count(*) FROM tours x WHERE x.created_by = u.id AND x.tour_format IS NOT NULL) DESC, u.id LIMIT 1;
    SELECT u.id INTO v_moderator FROM users u JOIN roles r ON r.id = u.role_id
     WHERE r.name = 'CONTENT_MODERATOR' AND u.active ORDER BY u.id LIMIT 1;
    IF v_provider IS NULL OR v_moderator IS NULL THEN
        RAISE EXCEPTION 'Thiếu tài khoản CONTENT_PROVIDER hoặc CONTENT_MODERATOR đang hoạt động.';
    END IF;
    INSERT INTO tours (title, tour_type, duration_days, duration_nights, duration_minutes, tour_format, region_id, theme_id,
        approved, status, cover_image_url, deleted, created_by, created_at, updated_at, description,
        price_includes, price_excludes, force_majeure, refund_policy, contact_info, cancellation_policy,
        max_guests_per_slot, content_rights_confirmed, version_number, submitted_at, published_at)
    VALUES ('Đại Nội Huế và chùa Thiên Mụ trong một buổi', 'HISTORICAL', 1, 0, 300, 'DAY_TRIP', 1, 5,
        TRUE, 'PUBLISHED', 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Hu%E1%BA%BF_%282024%29_-_Meridian_Gate_-_Ng%E1%BB%8D_M%C3%B4n_%28Ho%C3%A0ng_th%C3%A0nh_Hu%E1%BA%BF%29_-_img_02.jpg/960px-Hu%E1%BA%BF_%282024%29_-_Meridian_Gate_-_Ng%E1%BB%8D_M%C3%B4n_%28Ho%C3%A0ng_th%C3%A0nh_Hu%E1%BA%BF%29_-_img_02.jpg', FALSE, v_provider, NOW() - INTERVAL '10 days', NOW(), 'Một buổi sáng trong quần thể di tích Cố đô Huế, di sản thế giới được UNESCO ghi danh năm 1993. Đi qua Ngọ Môn, cổng chính của Hoàng thành, vào điện Thái Hòa nơi triều Nguyễn thiết triều và cử hành đại lễ, rồi đến chùa Thiên Mụ trên đồi Hà Khê bên bờ sông Hương. Mỗi điểm dừng có câu chuyện, quiz và nhiệm vụ quan sát trên ứng dụng JourneyGo.',
        'Hướng dẫn viên tiếng Việt suốt tuyến
Vé tham quan Đại Nội
Xe đưa khách từ Đại Nội đến chùa Thiên Mụ
Nước uống đóng chai', 'Ăn trưa
Thuê áo dài, áo nhật bình chụp ảnh
Đón trả khách sạn',
        'Khi có mưa bão, thiên tai hoặc di tích đóng cửa đột xuất, đối tác sẽ báo trước qua ứng dụng và đề xuất đổi ngày hoặc hoàn 100% tiền tour.',
        'Tiền hoàn về tài khoản thanh toán trong vòng 7 ngày làm việc.',
        'Nhắn tin cho đối tác qua mục Hỗ trợ trong ứng dụng JourneyGo (8:00–20:00).', 'Hủy trước 24 giờ so với giờ khởi hành: hoàn 100%.
Hủy trong vòng 24 giờ: hoàn 50%.
Không đến: không hoàn tiền.',
        20, TRUE, 1, NOW() - INTERVAL '10 days', NOW() - INTERVAL '9 days')
    RETURNING tour_id INTO v_tour;
    INSERT INTO tour_prices (tour_id, guest_type, price, counts_toward_slot) VALUES
        (v_tour, 'ADULT', 650000, TRUE), (v_tour, 'CHILD', 420000, TRUE),
        (v_tour, 'TODDLER', 100000, FALSE), (v_tour, 'INFANT', 0, FALSE);
    INSERT INTO tour_highlights (tour_id, position, content) VALUES
        (v_tour, 0, 'Đi qua Ngọ Môn, cổng chính của Hoàng thành Huế xây năm 1833'),
        (v_tour, 1, 'Đứng trước điện Thái Hòa, nơi cử hành lễ đăng quang của các vua Nguyễn'),
        (v_tour, 2, 'Ngắm tháp Phước Duyên bảy tầng của chùa Thiên Mụ'),
        (v_tour, 3, 'Tìm hiểu quần thể Cố đô Huế, di sản thế giới từ năm 1993');
    INSERT INTO tour_images (tour_id, position, image_url) VALUES
        (v_tour, 0, 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Hu%E1%BA%BF_%282024%29_-_Meridian_Gate_-_Ng%E1%BB%8D_M%C3%B4n_%28Ho%C3%A0ng_th%C3%A0nh_Hu%E1%BA%BF%29_-_img_02.jpg/960px-Hu%E1%BA%BF_%282024%29_-_Meridian_Gate_-_Ng%E1%BB%8D_M%C3%B4n_%28Ho%C3%A0ng_th%C3%A0nh_Hu%E1%BA%BF%29_-_img_02.jpg'),
        (v_tour, 1, 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Thai_Hoa_Palace_20190917.jpg/960px-Thai_Hoa_Palace_20190917.jpg'),
        (v_tour, 2, 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Palace_of_Supreme_Harmony_%28Dien_Thai_Hoa%29%2C_Nguyen_Dynasty_Forbidden_City%2C_Hue_%2815436857392%29.jpg/960px-Palace_of_Supreme_Harmony_%28Dien_Thai_Hoa%29%2C_Nguyen_Dynasty_Forbidden_City%2C_Hue_%2815436857392%29.jpg'),
        (v_tour, 3, 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Hue_Vietnam_Thien-Mu-Temple-and-Pagoda-01.jpg/960px-Hue_Vietnam_Thien-Mu-Temple-and-Pagoda-01.jpg'),
        (v_tour, 4, 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Hue_Vietnam_Thien-Mu-Temple-and-Pagoda-04.jpg/960px-Hue_Vietnam_Thien-Mu-Temple-and-Pagoda-04.jpg'),
        (v_tour, 5, 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Meridian_Gate%2C_Hue_%28I%29.jpg/960px-Meridian_Gate%2C_Hue_%28I%29.jpg');
    INSERT INTO tour_itinerary_days (tour_id, position, title, main_activity, content, day_number)
    VALUES (v_tour, 0, 'Ngọ Môn – Điện Thái Hòa – Chùa Thiên Mụ', 'Khám phá Cố đô Huế', '**07:30** Gặp hướng dẫn viên trước quảng trường Ngọ Môn
**07:45** Qua Ngọ Môn, lên lầu Ngũ Phụng
**08:45** Sân Đại Triều Nghi và điện Thái Hòa
**10:00** Tự do tham quan các khu khác trong Đại Nội
**11:00** Xe đưa khách đến chùa Thiên Mụ
**11:30** Tham quan chùa Thiên Mụ
**12:30** Kết thúc tour tại chùa Thiên Mụ', 1);
    -- Điểm 1: Ngọ Môn
    INSERT INTO tour_stops (tour_id, sequence_order, name, short_description, guest_note, image_url, cultural_content, created_at, updated_at)
    VALUES (v_tour, 1, 'Ngọ Môn', 'Cổng chính phía nam của Hoàng thành Huế, xây năm 1833 đời vua Minh Mạng, trên có lầu Ngũ Phụng.', 'Mặc trang phục lịch sự (che vai và đầu gối). Mang nón vì sân rộng, ít bóng mát.', 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Hu%E1%BA%BF_%282024%29_-_Meridian_Gate_-_Ng%E1%BB%8D_M%C3%B4n_%28Ho%C3%A0ng_th%C3%A0nh_Hu%E1%BA%BF%29_-_img_02.jpg/960px-Hu%E1%BA%BF_%282024%29_-_Meridian_Gate_-_Ng%E1%BB%8D_M%C3%B4n_%28Ho%C3%A0ng_th%C3%A0nh_Hu%E1%BA%BF%29_-_img_02.jpg', 'Ngọ Môn là cổng chính của Hoàng thành Huế, xây năm 1833 dưới triều vua Minh Mạng. Cổng nằm ở hướng nam, hướng Ngọ theo phong thủy, nên được gọi là Ngọ Môn.

Phần đế cổng bằng gạch đá có năm lối đi. Lối chính giữa chỉ dành cho vua, hai lối bên dành cho quan văn, quan võ, và hai lối ngoài cùng cho binh lính, voi ngựa. Phía trên là lầu Ngũ Phụng bằng gỗ, nơi vua ngự trong các dịp lễ lớn như lễ Truyền lô công bố kết quả thi Đình.

Khu vực cử hành đại lễ của triều Nguyễn được tính từ Ngọ Môn vào đến điện Thái Hòa.', NOW(), NOW())
    RETURNING id INTO v_stop;
    INSERT INTO tour_stop_cultural_images (stop_id, position, image_url) VALUES
        (v_stop, 0, 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Meridian_Gate%2C_Hue_%28I%29.jpg/960px-Meridian_Gate%2C_Hue_%28I%29.jpg'),
        (v_stop, 1, 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Ng%E1%BB%8D_m%C3%B4n%2C_Hu%E1%BA%BF.jpg/960px-Ng%E1%BB%8D_m%C3%B4n%2C_Hu%E1%BA%BF.jpg');
    INSERT INTO tour_stop_questions (stop_id, experience_id, kind, sequence_order, content, points_reward, question_type, reference_answer)
    VALUES (v_stop, NULL, 'QUIZ', 1, 'Ngọ Môn được xây dựng dưới triều vua nào?', 10, 'MULTIPLE_CHOICE', NULL) RETURNING id INTO v_q;
    INSERT INTO tour_stop_answers (question_id, sequence_order, content, is_correct) VALUES
        (v_q, 1, 'Minh Mạng', TRUE),
        (v_q, 2, 'Gia Long', FALSE),
        (v_q, 3, 'Tự Đức', FALSE),
        (v_q, 4, 'Khải Định', FALSE);
    INSERT INTO tour_stop_questions (stop_id, experience_id, kind, sequence_order, content, points_reward, question_type, reference_answer)
    VALUES (v_stop, NULL, 'QUIZ', 2, 'Lầu gỗ phía trên Ngọ Môn có tên là gì?', 10, 'MULTIPLE_CHOICE', NULL) RETURNING id INTO v_q;
    INSERT INTO tour_stop_answers (question_id, sequence_order, content, is_correct) VALUES
        (v_q, 1, 'Khuê Văn Các', FALSE),
        (v_q, 2, 'Phu Văn Lâu', FALSE),
        (v_q, 3, 'Lầu Ngũ Phụng', TRUE),
        (v_q, 4, 'Nghênh Lương Đình', FALSE);
    INSERT INTO tour_stop_experiences (stop_id, sequence_order, activity_name, checkpoint_latitude, checkpoint_longitude,
        radius_meters, duration_seconds, points_reward, qr_token)
    VALUES (v_stop, 1, 'Đếm số lối đi qua Ngọ Môn', 16.4669, 107.5789, 150, 600, 50,
        'JGE-' || upper(substr(md5(v_tour::text || '-' || v_stop::text || '-exp'), 1, 16)))
    RETURNING id INTO v_exp;
    INSERT INTO tour_stop_questions (stop_id, experience_id, kind, sequence_order, content, points_reward, question_type, reference_answer)
    VALUES (NULL, v_exp, 'POST_EXPERIENCE', 1, 'Phần đế của Ngọ Môn có bao nhiêu lối đi?', NULL, 'TEXT', '5;năm;5 lối;năm lối');
    -- Điểm 2: Điện Thái Hòa
    INSERT INTO tour_stops (tour_id, sequence_order, name, short_description, guest_note, image_url, cultural_content, created_at, updated_at)
    VALUES (v_tour, 2, 'Điện Thái Hòa', 'Cung điện nơi triều Nguyễn thiết triều và cử hành các đại lễ, nằm trên trục chính của Hoàng thành.', 'Không chụp ảnh có đèn flash bên trong điện. Đi theo lối tham quan được chỉ dẫn.', 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Thai_Hoa_Palace_20190917.jpg/960px-Thai_Hoa_Palace_20190917.jpg', 'Điện Thái Hòa là cung điện dùng làm nơi thiết triều và cử hành các nghi lễ lớn của nhà Nguyễn: lễ đăng quang, lễ khánh thọ, đại triều và các nghi thức ngoại giao. Điện được xây năm 1805 thời vua Gia Long, đến năm 1833 vua Minh Mạng cho dời và làm lại như hiện nay.

Trước điện là sân Đại Triều Nghi, nơi các quan đứng chầu theo phẩm trật. Điện cùng sân nằm phía trước Tử Cấm Thành, trên trục trung tâm của hoàng cung.

Điện Thái Hòa là một hạng mục của quần thể di tích Cố đô Huế, được UNESCO ghi danh là Di sản thế giới năm 1993.', NOW(), NOW())
    RETURNING id INTO v_stop;
    INSERT INTO tour_stop_cultural_images (stop_id, position, image_url) VALUES
        (v_stop, 0, 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Palace_of_Supreme_Harmony_%28Dien_Thai_Hoa%29%2C_Nguyen_Dynasty_Forbidden_City%2C_Hue_%2815436857392%29.jpg/960px-Palace_of_Supreme_Harmony_%28Dien_Thai_Hoa%29%2C_Nguyen_Dynasty_Forbidden_City%2C_Hue_%2815436857392%29.jpg'),
        (v_stop, 1, 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Th%C3%A1i_H%C3%B2a_Palace_%28I%29.jpg/960px-Th%C3%A1i_H%C3%B2a_Palace_%28I%29.jpg');
    INSERT INTO tour_stop_questions (stop_id, experience_id, kind, sequence_order, content, points_reward, question_type, reference_answer)
    VALUES (v_stop, NULL, 'QUIZ', 1, 'Quần thể di tích Cố đô Huế được UNESCO ghi danh là Di sản thế giới năm nào?', 10, 'MULTIPLE_CHOICE', NULL) RETURNING id INTO v_q;
    INSERT INTO tour_stop_answers (question_id, sequence_order, content, is_correct) VALUES
        (v_q, 1, '1999', FALSE),
        (v_q, 2, '1993', TRUE),
        (v_q, 3, '2003', FALSE),
        (v_q, 4, '2010', FALSE);
    INSERT INTO tour_stop_questions (stop_id, experience_id, kind, sequence_order, content, points_reward, question_type, reference_answer)
    VALUES (v_stop, NULL, 'QUIZ', 2, 'Điện Thái Hòa được dùng vào việc gì?', 10, 'MULTIPLE_CHOICE', NULL) RETURNING id INTO v_q;
    INSERT INTO tour_stop_answers (question_id, sequence_order, content, is_correct) VALUES
        (v_q, 1, 'Nơi ở của hoàng hậu', FALSE),
        (v_q, 2, 'Trường học của hoàng tử', FALSE),
        (v_q, 3, 'Kho chứa lương thực', FALSE),
        (v_q, 4, 'Thiết triều và cử hành đại lễ', TRUE);
    INSERT INTO tour_stop_experiences (stop_id, sequence_order, activity_name, checkpoint_latitude, checkpoint_longitude,
        radius_meters, duration_seconds, points_reward, qr_token)
    VALUES (v_stop, 1, 'Quan sát sân chầu trước điện Thái Hòa', 16.469, 107.5789, 150, 600, 50,
        'JGE-' || upper(substr(md5(v_tour::text || '-' || v_stop::text || '-exp'), 1, 16)))
    RETURNING id INTO v_exp;
    INSERT INTO tour_stop_questions (stop_id, experience_id, kind, sequence_order, content, points_reward, question_type, reference_answer)
    VALUES (NULL, v_exp, 'POST_EXPERIENCE', 1, 'Sân rộng phía trước điện Thái Hòa, nơi các quan đứng chầu, có tên là gì?', NULL, 'TEXT', 'Đại Triều Nghi;sân Đại Triều Nghi;sân chầu');
    -- Điểm 3: Chùa Thiên Mụ
    INSERT INTO tour_stops (tour_id, sequence_order, name, short_description, guest_note, image_url, cultural_content, created_at, updated_at)
    VALUES (v_tour, 3, 'Chùa Thiên Mụ', 'Ngôi chùa cổ trên đồi Hà Khê, tả ngạn sông Hương, khởi lập năm 1601 đời chúa Nguyễn Hoàng.', 'Chùa đang có chư tăng tu hành. Ăn mặc kín đáo, nói nhỏ và không trèo lên bệ tháp.', 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Hue_Vietnam_Thien-Mu-Temple-and-Pagoda-01.jpg/960px-Hue_Vietnam_Thien-Mu-Temple-and-Pagoda-01.jpg', 'Chùa Thiên Mụ, còn gọi là chùa Linh Mụ, nằm trên đồi Hà Khê bên tả ngạn sông Hương, cách trung tâm Huế khoảng 5 km về phía tây. Chùa chính thức khởi lập năm 1601, đời chúa Tiên Nguyễn Hoàng, vị chúa Nguyễn đầu tiên ở Đàng Trong.

Truyền thuyết kể rằng người dân từng thấy một bà lão áo đỏ quần lục xuất hiện trên đồi, nói rằng sẽ có chân chúa đến lập chùa để tụ linh khí. Nguyễn Hoàng nghe chuyện liền cho dựng chùa và đặt tên Thiên Mụ, nghĩa là bà lão nhà trời.

Tháp Phước Duyên bảy tầng trước chùa được xây năm 1844 dưới triều vua Thiệu Trị và trở thành hình ảnh quen thuộc của Huế.', NOW(), NOW())
    RETURNING id INTO v_stop;
    INSERT INTO tour_stop_cultural_images (stop_id, position, image_url) VALUES
        (v_stop, 0, 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Hue_Vietnam_Thien-Mu-Temple-and-Pagoda-04.jpg/960px-Hue_Vietnam_Thien-Mu-Temple-and-Pagoda-04.jpg'),
        (v_stop, 1, 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/Thien_Mu_Pagoda_in_February_2025.jpg/960px-Thien_Mu_Pagoda_in_February_2025.jpg');
    INSERT INTO tour_stop_questions (stop_id, experience_id, kind, sequence_order, content, points_reward, question_type, reference_answer)
    VALUES (v_stop, NULL, 'QUIZ', 1, 'Chùa Thiên Mụ chính thức được khởi lập năm nào?', 10, 'MULTIPLE_CHOICE', NULL) RETURNING id INTO v_q;
    INSERT INTO tour_stop_answers (question_id, sequence_order, content, is_correct) VALUES
        (v_q, 1, '1802', FALSE),
        (v_q, 2, '1558', FALSE),
        (v_q, 3, '1601', TRUE),
        (v_q, 4, '1844', FALSE);
    INSERT INTO tour_stop_questions (stop_id, experience_id, kind, sequence_order, content, points_reward, question_type, reference_answer)
    VALUES (v_stop, NULL, 'QUIZ', 2, 'Chùa Thiên Mụ nằm trên ngọn đồi nào?', 10, 'MULTIPLE_CHOICE', NULL) RETURNING id INTO v_q;
    INSERT INTO tour_stop_answers (question_id, sequence_order, content, is_correct) VALUES
        (v_q, 1, 'Đồi Hà Khê', TRUE),
        (v_q, 2, 'Đồi Vọng Cảnh', FALSE),
        (v_q, 3, 'Núi Ngự Bình', FALSE),
        (v_q, 4, 'Đồi Thiên An', FALSE);
    INSERT INTO tour_stop_experiences (stop_id, sequence_order, activity_name, checkpoint_latitude, checkpoint_longitude,
        radius_meters, duration_seconds, points_reward, qr_token)
    VALUES (v_stop, 1, 'Đếm số tầng của tháp Phước Duyên', 16.4536, 107.54481, 150, 600, 50,
        'JGE-' || upper(substr(md5(v_tour::text || '-' || v_stop::text || '-exp'), 1, 16)))
    RETURNING id INTO v_exp;
    INSERT INTO tour_stop_questions (stop_id, experience_id, kind, sequence_order, content, points_reward, question_type, reference_answer)
    VALUES (NULL, v_exp, 'POST_EXPERIENCE', 1, 'Tháp Phước Duyên trước chùa Thiên Mụ có bao nhiêu tầng?', NULL, 'TEXT', '7;bảy;7 tầng;bảy tầng');
    -- Lịch khởi hành: mọi thứ Bảy và Chủ nhật trong 6 tuần tới
    FOR v_dep IN SELECT d::date FROM generate_series(CURRENT_DATE + 1, CURRENT_DATE + 42, INTERVAL '1 day') d
                 WHERE EXTRACT(ISODOW FROM d) IN (6, 7) LOOP
        INSERT INTO tour_departure_dates (tour_id, departure_date) VALUES (v_tour, v_dep);
        INSERT INTO tour_slots (tour_id, slot_date, capacity, booked_count, status, created_at)
        VALUES (v_tour, v_dep, 20, 0, 'OPEN', NOW());
    END LOOP;
    INSERT INTO tour_reviews (tour_id, status, submitted_at, reviewed_at, reviewer_id, tour_version, decision_note,
        crit_interactive, crit_local_expertise, crit_storytelling, crit_cultural_ratio, crit_authentic_media)
    VALUES (v_tour, 'APPROVED', NOW() - INTERVAL '10 days', NOW() - INTERVAL '9 days', v_moderator, 1,
        'Nội dung chính xác, ảnh thật có nguồn rõ ràng, checkpoint đúng vị trí.', TRUE, TRUE, TRUE, TRUE, TRUE)
    RETURNING id INTO v_review;
    INSERT INTO tour_review_history (review_id, action, created_at, actor_id, note, from_status, to_status, tour_version) VALUES
        (v_review, 'SUBMITTED', NOW() - INTERVAL '10 days', v_provider, NULL, 'DRAFT', 'PENDING_REVIEW', 1),
        (v_review, 'APPROVED', NOW() - INTERVAL '9 days', v_moderator, 'Nội dung chính xác, ảnh thật có nguồn rõ ràng, checkpoint đúng vị trí.', 'PENDING_REVIEW', 'PUBLISHED', 1);
    RAISE NOTICE 'Đã tạo tour % (id %)', 'Đại Nội Huế và chùa Thiên Mụ trong một buổi', v_tour;
END $$;

-- ── Văn Miếu – Quốc Tử Giám và đền Ngọc Sơn: nửa ngày đất học ─────────────
DO $$
DECLARE
    v_provider bigint; v_moderator bigint; v_tour bigint; v_stop bigint; v_q bigint; v_exp bigint; v_review bigint; v_dep date;
BEGIN
    IF EXISTS (SELECT 1 FROM tours WHERE title = 'Văn Miếu – Quốc Tử Giám và đền Ngọc Sơn: nửa ngày đất học' AND deleted = FALSE) THEN
        RAISE NOTICE 'Bỏ qua (đã có): %', 'Văn Miếu – Quốc Tử Giám và đền Ngọc Sơn: nửa ngày đất học';
        RETURN;
    END IF;
    SELECT u.id INTO v_provider FROM users u JOIN roles r ON r.id = u.role_id JOIN provider_profiles p ON p.user_id = u.id
     WHERE r.name = 'CONTENT_PROVIDER' AND p.active AND u.active
     ORDER BY (SELECT count(*) FROM tours x WHERE x.created_by = u.id AND x.tour_format IS NOT NULL) DESC, u.id LIMIT 1;
    SELECT u.id INTO v_moderator FROM users u JOIN roles r ON r.id = u.role_id
     WHERE r.name = 'CONTENT_MODERATOR' AND u.active ORDER BY u.id LIMIT 1;
    IF v_provider IS NULL OR v_moderator IS NULL THEN
        RAISE EXCEPTION 'Thiếu tài khoản CONTENT_PROVIDER hoặc CONTENT_MODERATOR đang hoạt động.';
    END IF;
    INSERT INTO tours (title, tour_type, duration_days, duration_nights, duration_minutes, tour_format, region_id, theme_id,
        approved, status, cover_image_url, deleted, created_by, created_at, updated_at, description,
        price_includes, price_excludes, force_majeure, refund_policy, contact_info, cancellation_policy,
        max_guests_per_slot, content_rights_confirmed, version_number, submitted_at, published_at)
    VALUES ('Văn Miếu – Quốc Tử Giám và đền Ngọc Sơn: nửa ngày đất học', 'HISTORICAL', 1, 0, 210, 'DAY_TRIP', 2, 5,
        TRUE, 'PUBLISHED', 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Constellation_of_Literature_pavilion_%28Temple_of_Literature%2C_Hanoi%29.jpg/960px-Constellation_of_Literature_pavilion_%28Temple_of_Literature%2C_Hanoi%29.jpg', FALSE, v_provider, NOW() - INTERVAL '10 days', NOW(), 'Nửa ngày đi qua hai di tích gắn với chuyện học hành, khoa cử của Thăng Long. Ở Văn Miếu – Quốc Tử Giám, trường đại học đầu tiên của Việt Nam, bạn qua Khuê Văn Các và đứng giữa hàng bia tiến sĩ đặt trên lưng rùa đá. Sau đó tour sang hồ Hoàn Kiếm, qua cầu Thê Húc vào đền Ngọc Sơn thờ Văn Xương Đế Quân, vị thần chủ việc văn chương. Mỗi điểm có quiz và nhiệm vụ quan sát trên ứng dụng JourneyGo.',
        'Hướng dẫn viên tiếng Việt suốt tuyến
Vé tham quan Văn Miếu – Quốc Tử Giám và đền Ngọc Sơn
Taxi từ Văn Miếu đến hồ Hoàn Kiếm
Nước uống đóng chai', 'Ăn uống
Xin chữ ông đồ
Đón trả khách sạn',
        'Khi có mưa bão, thiên tai hoặc di tích đóng cửa đột xuất, đối tác sẽ báo trước qua ứng dụng và đề xuất đổi ngày hoặc hoàn 100% tiền tour.',
        'Tiền hoàn về tài khoản thanh toán trong vòng 7 ngày làm việc.',
        'Nhắn tin cho đối tác qua mục Hỗ trợ trong ứng dụng JourneyGo (8:00–20:00).', 'Hủy trước 24 giờ so với giờ khởi hành: hoàn 100%.
Hủy trong vòng 24 giờ: hoàn 50%.
Không đến: không hoàn tiền.',
        20, TRUE, 1, NOW() - INTERVAL '10 days', NOW() - INTERVAL '9 days')
    RETURNING tour_id INTO v_tour;
    INSERT INTO tour_prices (tour_id, guest_type, price, counts_toward_slot) VALUES
        (v_tour, 'ADULT', 350000, TRUE), (v_tour, 'CHILD', 220000, TRUE),
        (v_tour, 'TODDLER', 50000, FALSE), (v_tour, 'INFANT', 0, FALSE);
    INSERT INTO tour_highlights (tour_id, position, content) VALUES
        (v_tour, 0, 'Qua Khuê Văn Các, biểu tượng của Hà Nội'),
        (v_tour, 1, 'Xem 82 bia tiến sĩ, di sản tư liệu được UNESCO công nhận năm 2010'),
        (v_tour, 2, 'Qua cầu Thê Húc vào đền Ngọc Sơn trên hồ Hoàn Kiếm'),
        (v_tour, 3, 'Nghe chuyện Quốc Tử Giám, trường đại học đầu tiên của Việt Nam');
    INSERT INTO tour_images (tour_id, position, image_url) VALUES
        (v_tour, 0, 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Constellation_of_Literature_pavilion_%28Temple_of_Literature%2C_Hanoi%29.jpg/960px-Constellation_of_Literature_pavilion_%28Temple_of_Literature%2C_Hanoi%29.jpg'),
        (v_tour, 1, 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Constellation_of_Literature_pavilion_-_Temple_of_Literature%2C_Hanoi_-_DSC04557.JPG/960px-Constellation_of_Literature_pavilion_-_Temple_of_Literature%2C_Hanoi_-_DSC04557.JPG'),
        (v_tour, 2, 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/Stelae_of_Doctors_-_Temple_of_Literature%2C_Hanoi_-_DSC04571.JPG/960px-Stelae_of_Doctors_-_Temple_of_Literature%2C_Hanoi_-_DSC04571.JPG'),
        (v_tour, 3, 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Third_Courtyard%2C_Temple_of_Literature%2C_Hanoi%2C_Vietnam%2C_20240123_0947_3141.jpg/960px-Third_Courtyard%2C_Temple_of_Literature%2C_Hanoi%2C_Vietnam%2C_20240123_0947_3141.jpg'),
        (v_tour, 4, 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Ngoc_Son_Temple%2C_Hanoi_%2815%29_%2837780892234%29.jpg/960px-Ngoc_Son_Temple%2C_Hanoi_%2815%29_%2837780892234%29.jpg'),
        (v_tour, 5, 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/Hanoi_-_Ngoc_Son_Temple.jpg/960px-Hanoi_-_Ngoc_Son_Temple.jpg');
    INSERT INTO tour_itinerary_days (tour_id, position, title, main_activity, content, day_number)
    VALUES (v_tour, 0, 'Văn Miếu – Khu bia tiến sĩ – Đền Ngọc Sơn', 'Hành trình đất học Thăng Long', '**08:00** Gặp hướng dẫn viên tại cổng Văn Miếu, phố Quốc Tử Giám
**08:15** Qua Đại Trung môn đến Khuê Văn Các
**09:00** Khu bia tiến sĩ và khu Thái Học
**10:00** Taxi sang hồ Hoàn Kiếm
**10:20** Qua cầu Thê Húc vào đền Ngọc Sơn
**11:30** Kết thúc tour bên hồ Hoàn Kiếm', 1);
    -- Điểm 1: Khuê Văn Các – Văn Miếu
    INSERT INTO tour_stops (tour_id, sequence_order, name, short_description, guest_note, image_url, cultural_content, created_at, updated_at)
    VALUES (v_tour, 1, 'Khuê Văn Các – Văn Miếu', 'Gác Khuê Văn trong Văn Miếu – Quốc Tử Giám, nơi thờ Khổng Tử và trường đại học đầu tiên của Việt Nam.', 'Không ngồi lên bệ đá, không xoa đầu rùa đá. Mặc trang phục lịch sự.', 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Constellation_of_Literature_pavilion_%28Temple_of_Literature%2C_Hanoi%29.jpg/960px-Constellation_of_Literature_pavilion_%28Temple_of_Literature%2C_Hanoi%29.jpg', 'Văn Miếu được xây năm 1070 dưới thời vua Lý Thánh Tông để thờ Khổng Tử. Năm 1076, vua Lý Nhân Tông cho lập Quốc Tử Giám bên cạnh, được xem là trường đại học đầu tiên của Việt Nam. Với hơn 700 năm hoạt động, nơi đây đã đào tạo hàng nghìn nhân tài cho đất nước.

Khu di tích có tường gạch vồ bao quanh, chia thành năm lớp không gian, đi qua các cổng Văn Miếu, Đại Trung, Khuê Văn Các, Đại Thành và Thái Học.

Khuê Văn Các được dựng năm 1805. Sao Khuê là ngôi sao chủ về văn chương, vì vậy gác mang ý nghĩa tôn vinh văn học. Ngày nay Khuê Văn Các là biểu tượng của thủ đô Hà Nội.', NOW(), NOW())
    RETURNING id INTO v_stop;
    INSERT INTO tour_stop_cultural_images (stop_id, position, image_url) VALUES
        (v_stop, 0, 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Constellation_of_Literature_pavilion_-_Temple_of_Literature%2C_Hanoi_-_DSC04557.JPG/960px-Constellation_of_Literature_pavilion_-_Temple_of_Literature%2C_Hanoi_-_DSC04557.JPG'),
        (v_stop, 1, 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/First_courtyard_-_Temple_of_Literature%2C_Hanoi_-_DSC04546.JPG/960px-First_courtyard_-_Temple_of_Literature%2C_Hanoi_-_DSC04546.JPG');
    INSERT INTO tour_stop_questions (stop_id, experience_id, kind, sequence_order, content, points_reward, question_type, reference_answer)
    VALUES (v_stop, NULL, 'QUIZ', 1, 'Văn Miếu được xây dựng vào năm nào?', 10, 'MULTIPLE_CHOICE', NULL) RETURNING id INTO v_q;
    INSERT INTO tour_stop_answers (question_id, sequence_order, content, is_correct) VALUES
        (v_q, 1, '1070', TRUE),
        (v_q, 2, '1010', FALSE),
        (v_q, 3, '1076', FALSE),
        (v_q, 4, '1442', FALSE);
    INSERT INTO tour_stop_questions (stop_id, experience_id, kind, sequence_order, content, points_reward, question_type, reference_answer)
    VALUES (v_stop, NULL, 'QUIZ', 2, 'Văn Miếu được lập để thờ ai?', 10, 'MULTIPLE_CHOICE', NULL) RETURNING id INTO v_q;
    INSERT INTO tour_stop_answers (question_id, sequence_order, content, is_correct) VALUES
        (v_q, 1, 'Trần Hưng Đạo', FALSE),
        (v_q, 2, 'Lý Thái Tổ', FALSE),
        (v_q, 3, 'Khổng Tử', TRUE),
        (v_q, 4, 'Quan Vũ', FALSE);
    INSERT INTO tour_stop_experiences (stop_id, sequence_order, activity_name, checkpoint_latitude, checkpoint_longitude,
        radius_meters, duration_seconds, points_reward, qr_token)
    VALUES (v_stop, 1, 'Quan sát kiến trúc Khuê Văn Các', 21.02861, 105.83556, 150, 600, 50,
        'JGE-' || upper(substr(md5(v_tour::text || '-' || v_stop::text || '-exp'), 1, 16)))
    RETURNING id INTO v_exp;
    INSERT INTO tour_stop_questions (stop_id, experience_id, kind, sequence_order, content, points_reward, question_type, reference_answer)
    VALUES (NULL, v_exp, 'POST_EXPERIENCE', 1, 'Các ô cửa ở tầng trên của Khuê Văn Các có hình gì?', NULL, 'TEXT', 'tròn;hình tròn;cửa tròn');
    -- Điểm 2: Khu bia tiến sĩ
    INSERT INTO tour_stops (tour_id, sequence_order, name, short_description, guest_note, image_url, cultural_content, created_at, updated_at)
    VALUES (v_tour, 2, 'Khu bia tiến sĩ', '82 tấm bia đá đặt trên lưng rùa, khắc tên các tiến sĩ đỗ trong các khoa thi từ năm 1442 đến 1779.', 'Bia là di sản tư liệu. Chỉ chụp ảnh, không chạm tay hay dựa vào bia.', 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/Stelae_of_Doctors_-_Temple_of_Literature%2C_Hanoi_-_DSC04571.JPG/960px-Stelae_of_Doctors_-_Temple_of_Literature%2C_Hanoi_-_DSC04571.JPG', 'Hai bên giếng Thiên Quang là hàng bia tiến sĩ. 82 tấm bia còn lại ghi tên các tiến sĩ đỗ trong các khoa thi từ năm 1442 đến năm 1779, dưới các triều Lê và Mạc.

Mỗi tấm bia đặt trên lưng một con rùa đá. Rùa là con vật sống lâu, tượng trưng cho sự trường tồn của tri thức và tên tuổi người hiền tài. Hình dáng rùa và hoa văn trên trán bia thay đổi theo từng thời kỳ, giúp các nhà nghiên cứu xác định niên đại.

Năm 2010, 82 bia tiến sĩ được UNESCO công nhận là Di sản tư liệu thế giới.', NOW(), NOW())
    RETURNING id INTO v_stop;
    INSERT INTO tour_stop_cultural_images (stop_id, position, image_url) VALUES
        (v_stop, 0, 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Third_Courtyard%2C_Temple_of_Literature%2C_Hanoi%2C_Vietnam%2C_20240123_0947_3141.jpg/960px-Third_Courtyard%2C_Temple_of_Literature%2C_Hanoi%2C_Vietnam%2C_20240123_0947_3141.jpg'),
        (v_stop, 1, 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Stelae_of_Doctors_-_Temple_of_Literature%2C_Hanoi_-_DSC04680.JPG/960px-Stelae_of_Doctors_-_Temple_of_Literature%2C_Hanoi_-_DSC04680.JPG');
    INSERT INTO tour_stop_artifacts (stop_id, sequence_order, name, image_url, short_description)
    VALUES (v_stop, 1, 'Bia tiến sĩ trên lưng rùa đá', 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7f/Stelae_of_Doctors_-_Temple_of_Literature%2C_Hanoi_-_DSC04681.JPG/960px-Stelae_of_Doctors_-_Temple_of_Literature%2C_Hanoi_-_DSC04681.JPG', 'Mỗi tấm bia khắc tên, quê quán các tiến sĩ của một khoa thi, đặt trên lưng một con rùa đá tượng trưng cho sự trường tồn.');
    INSERT INTO tour_stop_questions (stop_id, experience_id, kind, sequence_order, content, points_reward, question_type, reference_answer)
    VALUES (v_stop, NULL, 'QUIZ', 1, 'Tại Văn Miếu hiện còn bao nhiêu bia tiến sĩ?', 10, 'MULTIPLE_CHOICE', NULL) RETURNING id INTO v_q;
    INSERT INTO tour_stop_answers (question_id, sequence_order, content, is_correct) VALUES
        (v_q, 1, '100', FALSE),
        (v_q, 2, '82', TRUE),
        (v_q, 3, '54', FALSE),
        (v_q, 4, '112', FALSE);
    INSERT INTO tour_stop_questions (stop_id, experience_id, kind, sequence_order, content, points_reward, question_type, reference_answer)
    VALUES (v_stop, NULL, 'QUIZ', 2, 'Năm 2010, các bia tiến sĩ được UNESCO công nhận là gì?', 10, 'MULTIPLE_CHOICE', NULL) RETURNING id INTO v_q;
    INSERT INTO tour_stop_answers (question_id, sequence_order, content, is_correct) VALUES
        (v_q, 1, 'Di sản thiên nhiên thế giới', FALSE),
        (v_q, 2, 'Di sản văn hóa phi vật thể', FALSE),
        (v_q, 3, 'Khu dự trữ sinh quyển', FALSE),
        (v_q, 4, 'Di sản tư liệu thế giới', TRUE);
    INSERT INTO tour_stop_experiences (stop_id, sequence_order, activity_name, checkpoint_latitude, checkpoint_longitude,
        radius_meters, duration_seconds, points_reward, qr_token)
    VALUES (v_stop, 1, 'Tìm con vật đội bia tiến sĩ', 21.0287, 105.8356, 150, 600, 50,
        'JGE-' || upper(substr(md5(v_tour::text || '-' || v_stop::text || '-exp'), 1, 16)))
    RETURNING id INTO v_exp;
    INSERT INTO tour_stop_questions (stop_id, experience_id, kind, sequence_order, content, points_reward, question_type, reference_answer)
    VALUES (NULL, v_exp, 'POST_EXPERIENCE', 1, 'Mỗi tấm bia tiến sĩ được đặt trên lưng con vật nào?', NULL, 'TEXT', 'rùa;con rùa;rùa đá');
    -- Điểm 3: Đền Ngọc Sơn
    INSERT INTO tour_stops (tour_id, sequence_order, name, short_description, guest_note, image_url, cultural_content, created_at, updated_at)
    VALUES (v_tour, 3, 'Đền Ngọc Sơn', 'Ngôi đền trên đảo Ngọc của hồ Hoàn Kiếm, thờ Văn Xương Đế Quân và Trần Hưng Đạo.', 'Cầu Thê Húc đông khách vào cuối tuần. Giữ trẻ nhỏ gần bên khi qua cầu.', 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Ngoc_Son_Temple%2C_Hanoi_%2815%29_%2837780892234%29.jpg/960px-Ngoc_Son_Temple%2C_Hanoi_%2815%29_%2837780892234%29.jpg', 'Đền Ngọc Sơn nằm trên đảo Ngọc của hồ Hoàn Kiếm, là di tích quốc gia đặc biệt. Đền hiện nay được xây dựng từ thế kỷ 19. Lúc đầu nơi đây được gọi là chùa Ngọc Sơn, sau đổi thành đền vì chỉ thờ thần Văn Xương Đế Quân, ngôi sao chủ việc văn chương khoa cử, cùng Trần Hưng Đạo, vị anh hùng đánh thắng quân Nguyên thế kỷ 13.

Vì thờ thần văn chương, đền Ngọc Sơn gắn với chuyện học hành của người Thăng Long, giống như Văn Miếu. Học trò xưa thường đến đây cầu đỗ đạt trước mỗi kỳ thi.

Lối vào đền đi qua cầu Thê Húc sơn đỏ, tên cầu có nghĩa là nơi đậu ánh sáng ban mai.', NOW(), NOW())
    RETURNING id INTO v_stop;
    INSERT INTO tour_stop_cultural_images (stop_id, position, image_url) VALUES
        (v_stop, 0, 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/Hanoi_-_Ngoc_Son_Temple.jpg/960px-Hanoi_-_Ngoc_Son_Temple.jpg'),
        (v_stop, 1, 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/Temple_of_the_Jade_Mountain%2C_Hanoi%2C_Vietnam%2C_20240204_1309_5741.jpg/960px-Temple_of_the_Jade_Mountain%2C_Hanoi%2C_Vietnam%2C_20240204_1309_5741.jpg');
    INSERT INTO tour_stop_questions (stop_id, experience_id, kind, sequence_order, content, points_reward, question_type, reference_answer)
    VALUES (v_stop, NULL, 'QUIZ', 1, 'Ngoài Văn Xương Đế Quân, đền Ngọc Sơn còn thờ vị anh hùng nào?', 10, 'MULTIPLE_CHOICE', NULL) RETURNING id INTO v_q;
    INSERT INTO tour_stop_answers (question_id, sequence_order, content, is_correct) VALUES
        (v_q, 1, 'Lý Thường Kiệt', FALSE),
        (v_q, 2, 'Quang Trung', FALSE),
        (v_q, 3, 'Trần Hưng Đạo', TRUE),
        (v_q, 4, 'Lê Lợi', FALSE);
    INSERT INTO tour_stop_questions (stop_id, experience_id, kind, sequence_order, content, points_reward, question_type, reference_answer)
    VALUES (v_stop, NULL, 'QUIZ', 2, 'Cây cầu dẫn vào đền Ngọc Sơn có tên là gì?', 10, 'MULTIPLE_CHOICE', NULL) RETURNING id INTO v_q;
    INSERT INTO tour_stop_answers (question_id, sequence_order, content, is_correct) VALUES
        (v_q, 1, 'Cầu Thê Húc', TRUE),
        (v_q, 2, 'Cầu Long Biên', FALSE),
        (v_q, 3, 'Cầu Trường Tiền', FALSE),
        (v_q, 4, 'Cầu Chương Dương', FALSE);
    INSERT INTO tour_stop_experiences (stop_id, sequence_order, activity_name, checkpoint_latitude, checkpoint_longitude,
        radius_meters, duration_seconds, points_reward, qr_token)
    VALUES (v_stop, 1, 'Qua cầu Thê Húc vào đền', 21.0307, 105.8523, 120, 600, 50,
        'JGE-' || upper(substr(md5(v_tour::text || '-' || v_stop::text || '-exp'), 1, 16)))
    RETURNING id INTO v_exp;
    INSERT INTO tour_stop_questions (stop_id, experience_id, kind, sequence_order, content, points_reward, question_type, reference_answer)
    VALUES (NULL, v_exp, 'POST_EXPERIENCE', 1, 'Cầu Thê Húc được sơn màu gì?', NULL, 'TEXT', 'đỏ;màu đỏ;son;đỏ son');
    -- Lịch khởi hành: mọi thứ Bảy và Chủ nhật trong 6 tuần tới
    FOR v_dep IN SELECT d::date FROM generate_series(CURRENT_DATE + 1, CURRENT_DATE + 42, INTERVAL '1 day') d
                 WHERE EXTRACT(ISODOW FROM d) IN (6, 7) LOOP
        INSERT INTO tour_departure_dates (tour_id, departure_date) VALUES (v_tour, v_dep);
        INSERT INTO tour_slots (tour_id, slot_date, capacity, booked_count, status, created_at)
        VALUES (v_tour, v_dep, 20, 0, 'OPEN', NOW());
    END LOOP;
    INSERT INTO tour_reviews (tour_id, status, submitted_at, reviewed_at, reviewer_id, tour_version, decision_note,
        crit_interactive, crit_local_expertise, crit_storytelling, crit_cultural_ratio, crit_authentic_media)
    VALUES (v_tour, 'APPROVED', NOW() - INTERVAL '10 days', NOW() - INTERVAL '9 days', v_moderator, 1,
        'Nội dung chính xác, ảnh thật có nguồn rõ ràng, checkpoint đúng vị trí.', TRUE, TRUE, TRUE, TRUE, TRUE)
    RETURNING id INTO v_review;
    INSERT INTO tour_review_history (review_id, action, created_at, actor_id, note, from_status, to_status, tour_version) VALUES
        (v_review, 'SUBMITTED', NOW() - INTERVAL '10 days', v_provider, NULL, 'DRAFT', 'PENDING_REVIEW', 1),
        (v_review, 'APPROVED', NOW() - INTERVAL '9 days', v_moderator, 'Nội dung chính xác, ảnh thật có nguồn rõ ràng, checkpoint đúng vị trí.', 'PENDING_REVIEW', 'PUBLISHED', 1);
    RAISE NOTICE 'Đã tạo tour % (id %)', 'Văn Miếu – Quốc Tử Giám và đền Ngọc Sơn: nửa ngày đất học', v_tour;
END $$;

-- ── Cần Thơ sông nước: chợ nổi Cái Răng, lò hủ tiếu và nhà cổ Bình Thủy ───
DO $$
DECLARE
    v_provider bigint; v_moderator bigint; v_tour bigint; v_stop bigint; v_q bigint; v_exp bigint; v_review bigint; v_dep date;
BEGIN
    IF EXISTS (SELECT 1 FROM tours WHERE title = 'Cần Thơ sông nước: chợ nổi Cái Răng, lò hủ tiếu và nhà cổ Bình Thủy' AND deleted = FALSE) THEN
        RAISE NOTICE 'Bỏ qua (đã có): %', 'Cần Thơ sông nước: chợ nổi Cái Răng, lò hủ tiếu và nhà cổ Bình Thủy';
        RETURN;
    END IF;
    SELECT u.id INTO v_provider FROM users u JOIN roles r ON r.id = u.role_id JOIN provider_profiles p ON p.user_id = u.id
     WHERE r.name = 'CONTENT_PROVIDER' AND p.active AND u.active
     ORDER BY (SELECT count(*) FROM tours x WHERE x.created_by = u.id AND x.tour_format IS NOT NULL) DESC, u.id LIMIT 1;
    SELECT u.id INTO v_moderator FROM users u JOIN roles r ON r.id = u.role_id
     WHERE r.name = 'CONTENT_MODERATOR' AND u.active ORDER BY u.id LIMIT 1;
    IF v_provider IS NULL OR v_moderator IS NULL THEN
        RAISE EXCEPTION 'Thiếu tài khoản CONTENT_PROVIDER hoặc CONTENT_MODERATOR đang hoạt động.';
    END IF;
    INSERT INTO tours (title, tour_type, duration_days, duration_nights, duration_minutes, tour_format, region_id, theme_id,
        approved, status, cover_image_url, deleted, created_by, created_at, updated_at, description,
        price_includes, price_excludes, force_majeure, refund_policy, contact_info, cancellation_policy,
        max_guests_per_slot, content_rights_confirmed, version_number, submitted_at, published_at)
    VALUES ('Cần Thơ sông nước: chợ nổi Cái Răng, lò hủ tiếu và nhà cổ Bình Thủy', 'GASTRONOMY', 1, 0, 360, 'DAY_TRIP', 3, 2,
        TRUE, 'PUBLISHED', 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fb/Cai_Rang_Floating_Market_1.jpg/960px-Cai_Rang_Floating_Market_1.jpg', FALSE, v_provider, NOW() - INTERVAL '10 days', NOW(), 'Một buổi sáng sông nước ở Cần Thơ. Xuất phát từ bến Ninh Kiều lúc trời còn sớm, đi ghe ra chợ nổi Cái Răng, chợ đầu mối trái cây trên sông Cần Thơ được công nhận Di sản văn hóa phi vật thể quốc gia năm 2016, ăn sáng ngay trên ghe. Tiếp đó ghé một lò hủ tiếu truyền thống xem tráng bánh, phơi bánh, rồi lên bờ thăm nhà cổ Bình Thủy xây từ năm 1870. Mỗi điểm có quiz và nhiệm vụ trên ứng dụng JourneyGo.',
        'Hướng dẫn viên người địa phương
Ghe máy từ bến Ninh Kiều đi chợ nổi và lò hủ tiếu
Một tô hủ tiếu ăn sáng trên ghe
Vé tham quan nhà cổ Bình Thủy
Xe từ bến Ninh Kiều đến nhà cổ Bình Thủy
Nước uống đóng chai', 'Trái cây, đồ uống mua thêm trên chợ nổi
Đón trả khách sạn ngoài trung tâm Ninh Kiều',
        'Khi có mưa bão, thiên tai hoặc di tích đóng cửa đột xuất, đối tác sẽ báo trước qua ứng dụng và đề xuất đổi ngày hoặc hoàn 100% tiền tour.',
        'Tiền hoàn về tài khoản thanh toán trong vòng 7 ngày làm việc.',
        'Nhắn tin cho đối tác qua mục Hỗ trợ trong ứng dụng JourneyGo (8:00–20:00).', 'Hủy trước 24 giờ so với giờ khởi hành: hoàn 100%.
Hủy trong vòng 24 giờ: hoàn 50%.
Không đến: không hoàn tiền.
Tour có thể đổi giờ khi mưa bão, nước lớn; khách được chọn đổi ngày hoặc hoàn 100%.',
        12, TRUE, 1, NOW() - INTERVAL '10 days', NOW() - INTERVAL '9 days')
    RETURNING tour_id INTO v_tour;
    INSERT INTO tour_prices (tour_id, guest_type, price, counts_toward_slot) VALUES
        (v_tour, 'ADULT', 590000, TRUE), (v_tour, 'CHILD', 380000, TRUE),
        (v_tour, 'TODDLER', 90000, FALSE), (v_tour, 'INFANT', 0, FALSE);
    INSERT INTO tour_highlights (tour_id, position, content) VALUES
        (v_tour, 0, 'Đi ghe ra chợ nổi Cái Răng lúc bình minh'),
        (v_tour, 1, 'Xem cây bẹo treo hàng mẫu trên các ghe buôn trái cây'),
        (v_tour, 2, 'Tự tay tráng bánh tại lò hủ tiếu truyền thống'),
        (v_tour, 3, 'Thăm nhà cổ Bình Thủy xây năm 1870, còn gọi là nhà cổ vườn lan');
    INSERT INTO tour_images (tour_id, position, image_url) VALUES
        (v_tour, 0, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fb/Cai_Rang_Floating_Market_1.jpg/960px-Cai_Rang_Floating_Market_1.jpg'),
        (v_tour, 1, 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/63/Cai_Rang_Floating_Market_5.jpg/960px-Cai_Rang_Floating_Market_5.jpg'),
        (v_tour, 2, 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Rice_noodle_factory%2C_Can_Tho_%2845387552894%29.jpg/960px-Rice_noodle_factory%2C_Can_Tho_%2845387552894%29.jpg'),
        (v_tour, 3, 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/Nh%C3%A0_c%E1%BB%95_B%C3%ACnh_Th%E1%BB%A7y_2.jpg/960px-Nh%C3%A0_c%E1%BB%95_B%C3%ACnh_Th%E1%BB%A7y_2.jpg'),
        (v_tour, 4, 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/Ninh_Kieu_Quay.jpg/960px-Ninh_Kieu_Quay.jpg'),
        (v_tour, 5, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Cai_Rang_Floating_Market_4.jpg/960px-Cai_Rang_Floating_Market_4.jpg');
    INSERT INTO tour_itinerary_days (tour_id, position, title, main_activity, content, day_number)
    VALUES (v_tour, 0, 'Bến Ninh Kiều – Chợ nổi Cái Răng – Lò hủ tiếu – Nhà cổ Bình Thủy', 'Buổi sáng sông nước Cần Thơ', '**05:30** Gặp hướng dẫn viên tại bến Ninh Kiều, lên ghe
**06:00** Chợ nổi Cái Răng, ăn sáng hủ tiếu trên ghe
**07:30** Ghé lò hủ tiếu truyền thống, xem và thử tráng bánh
**09:00** Ghe đưa khách về bến Ninh Kiều
**09:30** Xe đến nhà cổ Bình Thủy
**10:45** Kết thúc tour, xe đưa khách về bến Ninh Kiều', 1);
    -- Điểm 1: Chợ nổi Cái Răng
    INSERT INTO tour_stops (tour_id, sequence_order, name, short_description, guest_note, image_url, cultural_content, created_at, updated_at)
    VALUES (v_tour, 1, 'Chợ nổi Cái Răng', 'Chợ đầu mối trái cây, rau củ trên sông Cần Thơ, gần cầu Cái Răng, họp từ lúc trời còn tối.', 'Mặc áo phao suốt thời gian trên ghe. Giữ chặt điện thoại khi chụp ảnh sát mạn ghe.', 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fb/Cai_Rang_Floating_Market_1.jpg/960px-Cai_Rang_Floating_Market_1.jpg', 'Chợ nổi Cái Răng họp trên sông Cần Thơ, đoạn gần cầu Cái Răng, cách trung tâm thành phố khoảng 7 km. Đây là chợ đầu mối chuyên mua bán trái cây và rau củ của đồng bằng sông Cửu Long.

Chợ nổi hình thành từ thời giao thông đường thủy giữ vai trò gần như độc tôn ở miền Tây. Ghe chở hàng từ các vườn theo kênh rạch đổ về đây để bán sỉ cho thương lái. Mỗi ghe dựng một cây sào cao gọi là cây bẹo, treo hàng mẫu lên đó để người mua nhìn từ xa đã biết ghe bán gì.

Năm 2016, chợ nổi Cái Răng được Bộ Văn hóa, Thể thao và Du lịch công nhận là Di sản văn hóa phi vật thể quốc gia.', NOW(), NOW())
    RETURNING id INTO v_stop;
    INSERT INTO tour_stop_cultural_images (stop_id, position, image_url) VALUES
        (v_stop, 0, 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/63/Cai_Rang_Floating_Market_5.jpg/960px-Cai_Rang_Floating_Market_5.jpg'),
        (v_stop, 1, 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Cai_Rang_Floating_Market_3.jpg/960px-Cai_Rang_Floating_Market_3.jpg');
    INSERT INTO tour_stop_questions (stop_id, experience_id, kind, sequence_order, content, points_reward, question_type, reference_answer)
    VALUES (v_stop, NULL, 'QUIZ', 1, 'Chợ nổi Cái Răng được công nhận Di sản văn hóa phi vật thể quốc gia năm nào?', 10, 'MULTIPLE_CHOICE', NULL) RETURNING id INTO v_q;
    INSERT INTO tour_stop_answers (question_id, sequence_order, content, is_correct) VALUES
        (v_q, 1, '2016', TRUE),
        (v_q, 2, '2006', FALSE),
        (v_q, 3, '2019', FALSE),
        (v_q, 4, '2001', FALSE);
    INSERT INTO tour_stop_questions (stop_id, experience_id, kind, sequence_order, content, points_reward, question_type, reference_answer)
    VALUES (v_stop, NULL, 'QUIZ', 2, 'Cây sào dựng trên ghe để treo hàng mẫu được gọi là gì?', 10, 'MULTIPLE_CHOICE', NULL) RETURNING id INTO v_q;
    INSERT INTO tour_stop_answers (question_id, sequence_order, content, is_correct) VALUES
        (v_q, 1, 'Cây nêu', FALSE),
        (v_q, 2, 'Cột buồm', FALSE),
        (v_q, 3, 'Cây bẹo', TRUE),
        (v_q, 4, 'Cây chèo', FALSE);
    INSERT INTO tour_stop_experiences (stop_id, sequence_order, activity_name, checkpoint_latitude, checkpoint_longitude,
        radius_meters, duration_seconds, points_reward, qr_token)
    VALUES (v_stop, 1, 'Ăn sáng trên ghe giữa chợ nổi', 10.0039, 105.7468, 400, 1800, 50,
        'JGE-' || upper(substr(md5(v_tour::text || '-' || v_stop::text || '-exp'), 1, 16)))
    RETURNING id INTO v_exp;
    INSERT INTO tour_stop_questions (stop_id, experience_id, kind, sequence_order, content, points_reward, question_type, reference_answer)
    VALUES (NULL, v_exp, 'POST_EXPERIENCE', 1, 'Chợ nổi Cái Răng họp trên con sông nào?', NULL, 'TEXT', 'sông Cần Thơ;Cần Thơ');
    -- Điểm 2: Lò hủ tiếu truyền thống ở Cái Răng
    INSERT INTO tour_stops (tour_id, sequence_order, name, short_description, guest_note, image_url, cultural_content, created_at, updated_at)
    VALUES (v_tour, 2, 'Lò hủ tiếu truyền thống ở Cái Răng', 'Lò làm hủ tiếu thủ công ven sông, nơi bột gạo được tráng thành bánh, phơi trên phên tre rồi cắt sợi.', 'Khu tráng bánh có hơi nóng và bếp lửa. Trẻ nhỏ cần có người lớn đi kèm.', 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Rice_noodle_factory%2C_Can_Tho_%2845387552894%29.jpg/960px-Rice_noodle_factory%2C_Can_Tho_%2845387552894%29.jpg', 'Hủ tiếu là món ăn sáng quen thuộc của người miền Tây. Ở các lò thủ công, gạo được ngâm, xay thành bột nước, rồi tráng thành từng lớp bánh mỏng trên nồi hơi.

Bánh vừa chín được trải lên những tấm phên tre và đem phơi nắng. Khi bánh đã khô vừa tới, người thợ đưa vào máy cắt thành sợi hủ tiếu. Một mẻ bánh đẹp phụ thuộc nhiều vào loại gạo, độ loãng của bột và nắng trong ngày.

Tại lò, bạn sẽ được thử tráng một chiếc bánh và thấy việc giữ lớp bột mỏng đều khó hơn nhìn rất nhiều.', NOW(), NOW())
    RETURNING id INTO v_stop;
    INSERT INTO tour_stop_cultural_images (stop_id, position, image_url) VALUES
        (v_stop, 0, 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/Rice_noodle_factory_4.jpg/960px-Rice_noodle_factory_4.jpg'),
        (v_stop, 1, 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Rice_noodle_factory%2C_Can_Tho_%2844294968960%29.jpg/960px-Rice_noodle_factory%2C_Can_Tho_%2844294968960%29.jpg');
    INSERT INTO tour_stop_questions (stop_id, experience_id, kind, sequence_order, content, points_reward, question_type, reference_answer)
    VALUES (v_stop, NULL, 'QUIZ', 1, 'Nguyên liệu chính để làm sợi hủ tiếu là gì?', 10, 'MULTIPLE_CHOICE', NULL) RETURNING id INTO v_q;
    INSERT INTO tour_stop_answers (question_id, sequence_order, content, is_correct) VALUES
        (v_q, 1, 'Bột mì', FALSE),
        (v_q, 2, 'Gạo', TRUE),
        (v_q, 3, 'Khoai mì', FALSE),
        (v_q, 4, 'Bắp', FALSE);
    INSERT INTO tour_stop_questions (stop_id, experience_id, kind, sequence_order, content, points_reward, question_type, reference_answer)
    VALUES (v_stop, NULL, 'QUIZ', 2, 'Sau khi tráng, bánh hủ tiếu được trải lên vật gì để phơi?', 10, 'MULTIPLE_CHOICE', NULL) RETURNING id INTO v_q;
    INSERT INTO tour_stop_answers (question_id, sequence_order, content, is_correct) VALUES
        (v_q, 1, 'Lưới sắt', FALSE),
        (v_q, 2, 'Khay nhựa', FALSE),
        (v_q, 3, 'Mái tôn', FALSE),
        (v_q, 4, 'Phên tre', TRUE);
    INSERT INTO tour_stop_experiences (stop_id, sequence_order, activity_name, checkpoint_latitude, checkpoint_longitude,
        radius_meters, duration_seconds, points_reward, qr_token)
    VALUES (v_stop, 1, 'Tự tay tráng một chiếc bánh hủ tiếu', 10.007, 105.748, 400, 1200, 50,
        'JGE-' || upper(substr(md5(v_tour::text || '-' || v_stop::text || '-exp'), 1, 16)))
    RETURNING id INTO v_exp;
    INSERT INTO tour_stop_questions (stop_id, experience_id, kind, sequence_order, content, points_reward, question_type, reference_answer)
    VALUES (NULL, v_exp, 'POST_EXPERIENCE', 1, 'Sau khi phơi khô, bánh được làm gì để thành sợi hủ tiếu?', NULL, 'TEXT', 'cắt;cắt sợi;xắt;xắt sợi;thái;thái sợi');
    -- Điểm 3: Nhà cổ Bình Thủy
    INSERT INTO tour_stops (tour_id, sequence_order, name, short_description, guest_note, image_url, cultural_content, created_at, updated_at)
    VALUES (v_tour, 3, 'Nhà cổ Bình Thủy', 'Phủ thờ họ Dương ở số 142–144 Bùi Hữu Nghĩa, công trình tiêu biểu cho kiến trúc Đông Dương ở Nam Kỳ.', 'Đây là nhà thờ tự của gia tộc. Không ngồi lên bàn ghế cổ, không chụp ảnh gian thờ bằng đèn flash.', 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/Nh%C3%A0_c%E1%BB%95_B%C3%ACnh_Th%E1%BB%A7y_2.jpg/960px-Nh%C3%A0_c%E1%BB%95_B%C3%ACnh_Th%E1%BB%A7y_2.jpg', 'Nhà cổ Bình Thủy có tên chính thức là Phủ thờ họ Dương, còn gọi là nhà cổ vườn lan. Ngôi nhà đầu tiên của họ Dương được xây trên đất Bình Thủy, khi đó là trung tâm làng cổ Long Tuyền, vào năm 1870. Năm 1904, ông Dương Chấn Kỷ cho sửa sang lại, và đến năm 1911 thì ngôi nhà hoàn chỉnh như ngày nay.

Nhà được xây theo lối kiến trúc Đông Dương, kết hợp bộ khung nhà năm gian truyền thống với mặt tiền, gạch hoa và cửa kính kiểu Pháp. Đây được xem là công trình kiểu mẫu của phong cách này ở Nam Kỳ đầu thế kỷ 20.

Ngôi nhà từng là bối cảnh của bộ phim Người tình (L''Amant) năm 1992.', NOW(), NOW())
    RETURNING id INTO v_stop;
    INSERT INTO tour_stop_cultural_images (stop_id, position, image_url) VALUES
        (v_stop, 0, 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/Nh%C3%A0_c%E1%BB%95_B%C3%ACnh_Th%E1%BB%A7y.jpg/960px-Nh%C3%A0_c%E1%BB%95_B%C3%ACnh_Th%E1%BB%A7y.jpg'),
        (v_stop, 1, 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Nha_co_Binh_Thuy_1.jpg/960px-Nha_co_Binh_Thuy_1.jpg');
    INSERT INTO tour_stop_questions (stop_id, experience_id, kind, sequence_order, content, points_reward, question_type, reference_answer)
    VALUES (v_stop, NULL, 'QUIZ', 1, 'Ngôi nhà đầu tiên của họ Dương ở Bình Thủy được xây vào năm nào?', 10, 'MULTIPLE_CHOICE', NULL) RETURNING id INTO v_q;
    INSERT INTO tour_stop_answers (question_id, sequence_order, content, is_correct) VALUES
        (v_q, 1, '1911', FALSE),
        (v_q, 2, '1945', FALSE),
        (v_q, 3, '1870', TRUE),
        (v_q, 4, '1802', FALSE);
    INSERT INTO tour_stop_questions (stop_id, experience_id, kind, sequence_order, content, points_reward, question_type, reference_answer)
    VALUES (v_stop, NULL, 'QUIZ', 2, 'Bộ phim nào từng quay tại nhà cổ Bình Thủy?', 10, 'MULTIPLE_CHOICE', NULL) RETURNING id INTO v_q;
    INSERT INTO tour_stop_answers (question_id, sequence_order, content, is_correct) VALUES
        (v_q, 1, 'Người tình (L''Amant)', TRUE),
        (v_q, 2, 'Cánh đồng hoang', FALSE),
        (v_q, 3, 'Áo lụa Hà Đông', FALSE),
        (v_q, 4, 'Mùa len trâu', FALSE);
    INSERT INTO tour_stop_experiences (stop_id, sequence_order, activity_name, checkpoint_latitude, checkpoint_longitude,
        radius_meters, duration_seconds, points_reward, qr_token)
    VALUES (v_stop, 1, 'Tìm khu vườn trong khuôn viên nhà cổ', 10.0726, 105.7459, 250, 600, 50,
        'JGE-' || upper(substr(md5(v_tour::text || '-' || v_stop::text || '-exp'), 1, 16)))
    RETURNING id INTO v_exp;
    INSERT INTO tour_stop_questions (stop_id, experience_id, kind, sequence_order, content, points_reward, question_type, reference_answer)
    VALUES (NULL, v_exp, 'POST_EXPERIENCE', 1, 'Nhà cổ Bình Thủy còn được gọi là nhà cổ vườn gì?', NULL, 'TEXT', 'lan;vườn lan;hoa lan');
    -- Lịch khởi hành: mọi thứ Bảy và Chủ nhật trong 6 tuần tới
    FOR v_dep IN SELECT d::date FROM generate_series(CURRENT_DATE + 1, CURRENT_DATE + 42, INTERVAL '1 day') d
                 WHERE EXTRACT(ISODOW FROM d) IN (6, 7) LOOP
        INSERT INTO tour_departure_dates (tour_id, departure_date) VALUES (v_tour, v_dep);
        INSERT INTO tour_slots (tour_id, slot_date, capacity, booked_count, status, created_at)
        VALUES (v_tour, v_dep, 12, 0, 'OPEN', NOW());
    END LOOP;
    INSERT INTO tour_reviews (tour_id, status, submitted_at, reviewed_at, reviewer_id, tour_version, decision_note,
        crit_interactive, crit_local_expertise, crit_storytelling, crit_cultural_ratio, crit_authentic_media)
    VALUES (v_tour, 'APPROVED', NOW() - INTERVAL '10 days', NOW() - INTERVAL '9 days', v_moderator, 1,
        'Nội dung chính xác, ảnh thật có nguồn rõ ràng, checkpoint đúng vị trí.', TRUE, TRUE, TRUE, TRUE, TRUE)
    RETURNING id INTO v_review;
    INSERT INTO tour_review_history (review_id, action, created_at, actor_id, note, from_status, to_status, tour_version) VALUES
        (v_review, 'SUBMITTED', NOW() - INTERVAL '10 days', v_provider, NULL, 'DRAFT', 'PENDING_REVIEW', 1),
        (v_review, 'APPROVED', NOW() - INTERVAL '9 days', v_moderator, 'Nội dung chính xác, ảnh thật có nguồn rõ ràng, checkpoint đúng vị trí.', 'PENDING_REVIEW', 'PUBLISHED', 1);
    RAISE NOTICE 'Đã tạo tour % (id %)', 'Cần Thơ sông nước: chợ nổi Cái Răng, lò hủ tiếu và nhà cổ Bình Thủy', v_tour;
END $$;

