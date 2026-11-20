-- V41__achievement_system.sql
-- Achievement and User Achievement system for JourneyGo

-- 1. Ensure badges and user_badges exist (if not already created by Hibernate)
CREATE TABLE IF NOT EXISTS badges (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    description VARCHAR(500),
    icon_url VARCHAR(500),
    destination_id BIGINT,
    badge_type VARCHAR(30) NOT NULL DEFAULT 'DESTINATION_CHECKIN',
    bonus_points INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_badges (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    badge_id BIGINT NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    journey_id BIGINT,
    destination_id BIGINT,
    earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_user_badge UNIQUE (user_id, badge_id)
);

-- 2. Create achievements table
CREATE TABLE IF NOT EXISTS achievements (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    tier VARCHAR(30) NOT NULL,
    target_value INT NOT NULL DEFAULT 1,
    points_reward INT NOT NULL DEFAULT 0,
    badge_name VARCHAR(150),
    badge_icon VARCHAR(500),
    badge_id BIGINT REFERENCES badges(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create user_achievements table
CREATE TABLE IF NOT EXISTS user_achievements (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    achievement_id BIGINT NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    current_progress INT NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'LOCKED',
    achieved_at TIMESTAMP WITH TIME ZONE,
    claimed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_user_achievement UNIQUE (user_id, achievement_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_status ON user_achievements(user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement_id ON user_achievements(achievement_id);
CREATE INDEX IF NOT EXISTS idx_achievements_category ON achievements(category);
CREATE INDEX IF NOT EXISTS idx_achievements_is_active ON achievements(is_active);

-- Ensure created_at has a default even if badges was previously created by Hibernate
ALTER TABLE badges ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP;

-- Seed initial badges
INSERT INTO badges (code, name, description, icon_url, badge_type, bonus_points, is_active, created_at)
VALUES
('BADGE_FIRST_TOUR', 'Nhà Khám Phá Tập Sự 🥉', 'Huy hiệu hoàn thành chuyến đi đầu tiên', 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=200', 'TOUR_COMPLETION', 0, true, CURRENT_TIMESTAMP),
('BADGE_TEN_TOURS', 'Nhà Du Lịch Chuyên Nghiệp 🥈', 'Huy hiệu hoàn thành 10 chuyến đi khác nhau', 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=200', 'TOUR_COMPLETION', 0, true, CURRENT_TIMESTAMP),
('BADGE_HUNDRED_TOURS', 'Huyền Thoại Du Lịch 🥇', 'Huy hiệu hoàn thành 100 chuyến đi', 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=200', 'TOUR_COMPLETION', 0, true, CURRENT_TIMESTAMP),
('BADGE_FIVE_DESTINATIONS', 'Dấu Chân Muôn Nơi 🗺️', 'Huy hiệu hoàn thành các tour ở 5 địa điểm khác nhau', 'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?w=200', 'TOUR_COMPLETION', 0, true, CURRENT_TIMESTAMP),
('BADGE_FIRST_CHECKIN', 'Người Đặt Chân Đến 📍', 'Huy hiệu check-in GPS đầu tiên', 'https://images.unsplash.com/photo-1527631746610-bca00a040d60?w=200', 'DESTINATION_CHECKIN', 0, true, CURRENT_TIMESTAMP),
('BADGE_TWENTY_CHECKINS', 'Nhà Sưu Tầm 🧭', 'Huy hiệu check-in tại 20 địa điểm khác nhau', 'https://images.unsplash.com/photo-1508672019048-805b876b67e2?w=200', 'DESTINATION_CHECKIN', 0, true, CURRENT_TIMESTAMP),
('BADGE_EARLY_BIRD_CHECKIN', 'Người Đón Bình Minh 🌅', 'Huy hiệu check-in GPS trước 6:00 sáng', 'https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?w=200', 'DESTINATION_CHECKIN', 0, true, CURRENT_TIMESTAMP),
('BADGE_FIVE_SPECIAL_EXPERIENCES', 'Thợ Săn Bí Ẩn 🔍', 'Huy hiệu check-in tại 5 địa điểm có hoạt động trải nghiệm đặc biệt', 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=200', 'DESTINATION_CHECKIN', 0, true, CURRENT_TIMESTAMP),
('BADGE_READ_TEN_CULTURAL_CONTENTS', 'Người Gìn Giữ Di Sản 📜', 'Huy hiệu đọc 10 nội dung văn hóa lịch sử', 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=200', 'SPECIAL_EVENT', 0, true, CURRENT_TIMESTAMP),
('BADGE_TEN_QUIZZES_80_PERCENT', 'Bậc Thầy Tri Thức 🎓', 'Huy hiệu đạt 80% trở lên ở 10 bài quiz', 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=200', 'TASK_MASTER', 0, true, CURRENT_TIMESTAMP),
('BADGE_PERFECT_QUIZ', 'Nhà Vô Địch Quiz 🏆', 'Huy hiệu đạt điểm tuyệt đối 100% trong bài quiz', 'https://images.unsplash.com/photo-1578269174936-2709b6aeb913?w=200', 'TASK_MASTER', 0, true, CURRENT_TIMESTAMP),
('BADGE_FIVE_HERITAGE_DESTINATIONS', 'Sứ Giả Văn Hóa 🪷', 'Huy hiệu khám phá nội dung di sản tại 5 địa điểm khác nhau', 'https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=200', 'SPECIAL_EVENT', 0, true, CURRENT_TIMESTAMP),
('BADGE_FIVE_EXPERIENCE_TASKS', 'Chiến Binh Trải Nghiệm ⚔️', 'Huy hiệu hoàn thành 5 nhiệm vụ trải nghiệm', 'https://images.unsplash.com/photo-1533227268428-f9ed0900fb3b?w=200', 'TASK_MASTER', 0, true, CURRENT_TIMESTAMP),
('BADGE_FIVE_SUCCESSIVE_EXPERIENCES', 'Bậc Thầy Thử Thách ⭐', 'Huy hiệu vượt qua 5 nhiệm vụ liên tiếp không thất bại', 'https://images.unsplash.com/photo-1519834785169-98be25ec3f84?w=200', 'TASK_MASTER', 0, true, CURRENT_TIMESTAMP),
('BADGE_SPECIAL_REWARD_EXPERIENCE', 'Kẻ Săn Kho Báu 💎', 'Huy hiệu hoàn thành nhiệm vụ trải nghiệm có quà đặc biệt', 'https://images.unsplash.com/photo-1515260268569-9271009adfdb?w=200', 'TASK_MASTER', 0, true, CURRENT_TIMESTAMP),
('BADGE_TWENTY_EXPERIENCE_TASKS', 'Huyền Thoại Thử Thách 🏅', 'Huy hiệu hoàn thành 20 nhiệm vụ trải nghiệm', 'https://images.unsplash.com/photo-1569517282132-25d22f4573e6?w=200', 'TASK_MASTER', 0, true, CURRENT_TIMESTAMP),
('BADGE_THREE_DAY_STREAK', 'Ngọn Lửa Nhỏ 🔥', 'Huy hiệu chuỗi 3 ngày hoạt động liên tiếp', 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=200', 'STREAK', 0, true, CURRENT_TIMESTAMP),
('BADGE_SEVEN_DAY_STREAK', 'Ngọn Lửa Bền Bỉ 🔥', 'Huy hiệu chuỗi 7 ngày hoạt động liên tiếp', 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=200', 'STREAK', 0, true, CURRENT_TIMESTAMP),
('BADGE_THIRTY_DAY_STREAK', 'Ý Chí Vàng 🌟', 'Huy hiệu chuỗi 30 ngày hoạt động liên tiếp', 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=200', 'STREAK', 0, true, CURRENT_TIMESTAMP),
('BADGE_TEN_THOUSAND_POINTS_EARNED', 'Huyền Thoại JourneyGo 👑', 'Huy hiệu tích lũy 10.000 Journey Points', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200', 'SPECIAL_EVENT', 0, true, CURRENT_TIMESTAMP)
ON CONFLICT (code) DO NOTHING;

-- Seed initial achievements
INSERT INTO achievements (code, name, description, category, tier, target_value, points_reward, badge_name, badge_icon, badge_id, is_active, created_at, updated_at)
VALUES
('FIRST_TOUR', 'Bước Chân Đầu Tiên', 'Hoàn thành tour đầu tiên trên JourneyGo', 'TOUR', 'BRONZE', 1, 100, 'Nhà Khám Phá Tập Sự 🥉', 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=200', (SELECT id FROM badges WHERE code = 'BADGE_FIRST_TOUR'), true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('TEN_TOURS', 'Người Du Lịch Chăm Chỉ', 'Hoàn thành 10 tour khác nhau', 'TOUR', 'SILVER', 10, 500, 'Nhà Du Lịch Chuyên Nghiệp 🥈', 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=200', (SELECT id FROM badges WHERE code = 'BADGE_TEN_TOURS'), true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('HUNDRED_TOURS', 'Bậc Thầy Khám Phá', 'Hoàn thành 100 tour', 'TOUR', 'GOLD', 100, 2000, 'Huyền Thoại Du Lịch 🥇', 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=200', (SELECT id FROM badges WHERE code = 'BADGE_HUNDRED_TOURS'), true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('FIVE_DESTINATIONS', 'Kẻ Lang Thang', 'Hoàn thành 5 tour thuộc 5 địa điểm du lịch khác nhau', 'TOUR', 'SILVER', 5, 300, 'Dấu Chân Muôn Nơi 🗺️', 'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?w=200', (SELECT id FROM badges WHERE code = 'BADGE_FIVE_DESTINATIONS'), true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

('FIRST_CHECKIN', 'Dấu Chân Đầu Tiên', 'Check-in GPS hợp lệ tại địa điểm du lịch đầu tiên', 'CHECKIN', 'BRONZE', 1, 50, 'Người Đặt Chân Đến 📍', 'https://images.unsplash.com/photo-1527631746610-bca00a040d60?w=200', (SELECT id FROM badges WHERE code = 'BADGE_FIRST_CHECKIN'), true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('TWENTY_CHECKINS', 'Nhà Sưu Tầm Địa Điểm', 'Check-in hợp lệ tại 20 địa điểm khác nhau', 'CHECKIN', 'SILVER', 20, 400, 'Nhà Sưu Tầm 🧭', 'https://images.unsplash.com/photo-1508672019048-805b876b67e2?w=200', (SELECT id FROM badges WHERE code = 'BADGE_TWENTY_CHECKINS'), true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('EARLY_BIRD_CHECKIN', 'Chinh Phục Bình Minh', 'Check-in GPS hợp lệ tại địa điểm du lịch trước 06:00 sáng theo múi giờ địa điểm', 'CHECKIN', 'SILVER', 1, 150, 'Người Đón Bình Minh 🌅', 'https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?w=200', (SELECT id FROM badges WHERE code = 'BADGE_EARLY_BIRD_CHECKIN'), true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('FIVE_SPECIAL_EXPERIENCES', 'Thợ Săn Bí Ẩn', 'Check-in hợp lệ tại 5 địa điểm có hoạt động/nhiệm vụ trải nghiệm đặc biệt', 'CHECKIN', 'GOLD', 5, 350, 'Thợ Săn Bí Ẩn 🔍', 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=200', (SELECT id FROM badges WHERE code = 'BADGE_FIVE_SPECIAL_EXPERIENCES'), true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

('READ_TEN_CULTURAL_CONTENTS', 'Người Gìn Giữ Văn Hóa', 'Đọc/khám phá 10 nội dung văn hóa, lịch sử hoặc di sản', 'CULTURE_QUIZ', 'SILVER', 10, 200, 'Người Gìn Giữ Di Sản 📜', 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=200', (SELECT id FROM badges WHERE code = 'BADGE_READ_TEN_CULTURAL_CONTENTS'), true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('TEN_QUIZZES_80_PERCENT', 'Bộ Óc Tri Thức', 'Hoàn thành 10 bài quiz, mỗi bài đạt tỷ lệ đúng từ 80% trở lên', 'CULTURE_QUIZ', 'GOLD', 10, 400, 'Bậc Thầy Tri Thức 🎓', 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=200', (SELECT id FROM badges WHERE code = 'BADGE_TEN_QUIZZES_80_PERCENT'), true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('PERFECT_QUIZ', 'Không Một Lỗi Sai', 'Hoàn thành một bài quiz với 100% câu trả lời chính xác', 'CULTURE_QUIZ', 'BRONZE', 1, 150, 'Nhà Vô Địch Quiz 🏆', 'https://images.unsplash.com/photo-1578269174936-2709b6aeb913?w=200', (SELECT id FROM badges WHERE code = 'BADGE_PERFECT_QUIZ'), true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('FIVE_HERITAGE_DESTINATIONS', 'Sứ Giả Di Sản', 'Khám phá nội dung văn hóa tại 5 địa điểm di sản khác nhau', 'CULTURE_QUIZ', 'GOLD', 5, 500, 'Sứ Giả Văn Hóa 🪷', 'https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=200', (SELECT id FROM badges WHERE code = 'BADGE_FIVE_HERITAGE_DESTINATIONS'), true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

('FIVE_EXPERIENCE_TASKS', 'Người Chinh Phục Thử Thách', 'Hoàn thành 5 nhiệm vụ trải nghiệm khác nhau', 'EXPERIENCE', 'SILVER', 5, 250, 'Chiến Binh Trải Nghiệm ⚔️', 'https://images.unsplash.com/photo-1533227268428-f9ed0900fb3b?w=200', (SELECT id FROM badges WHERE code = 'BADGE_FIVE_EXPERIENCE_TASKS'), true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('FIVE_SUCCESSIVE_EXPERIENCES', 'Bách Chiến Bách Thắng', 'Hoàn thành liên tiếp 5 nhiệm vụ trải nghiệm mà không thất bại', 'EXPERIENCE', 'GOLD', 5, 400, 'Bậc Thầy Thử Thách ⭐', 'https://images.unsplash.com/photo-1519834785169-98be25ec3f84?w=200', (SELECT id FROM badges WHERE code = 'BADGE_FIVE_SUCCESSIVE_EXPERIENCES'), true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('SPECIAL_REWARD_EXPERIENCE', 'Kho Báu Bí Mật', 'Hoàn thành một nhiệm vụ trải nghiệm có phần thưởng đặc biệt', 'EXPERIENCE', 'SILVER', 1, 200, 'Kẻ Săn Kho Báu 💎', 'https://images.unsplash.com/photo-1515260268569-9271009adfdb?w=200', (SELECT id FROM badges WHERE code = 'BADGE_SPECIAL_REWARD_EXPERIENCE'), true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('TWENTY_EXPERIENCE_TASKS', 'Không Gì Là Không Thể', 'Hoàn thành 20 nhiệm vụ trải nghiệm', 'EXPERIENCE', 'LEGENDARY', 20, 700, 'Huyền Thoại Thử Thách 🏅', 'https://images.unsplash.com/photo-1569517282132-25d22f4573e6?w=200', (SELECT id FROM badges WHERE code = 'BADGE_TWENTY_EXPERIENCE_TASKS'), true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

('THREE_DAY_STREAK', 'Ngọn Lửa Khám Phá', 'Có hoạt động khám phá hợp lệ trong 3 ngày liên tiếp', 'STREAK_LOYALTY', 'BRONZE', 3, 100, 'Ngọn Lửa Nhỏ 🔥', 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=200', (SELECT id FROM badges WHERE code = 'BADGE_THREE_DAY_STREAK'), true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('SEVEN_DAY_STREAK', 'Đam Mê Bất Tận', 'Có hoạt động khám phá hợp lệ trong 7 ngày liên tiếp', 'STREAK_LOYALTY', 'SILVER', 7, 300, 'Ngọn Lửa Bền Bỉ 🔥', 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=200', (SELECT id FROM badges WHERE code = 'BADGE_SEVEN_DAY_STREAK'), true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('THIRTY_DAY_STREAK', 'Nhà Khám Phá Kiên Định', 'Có hoạt động khám phá hợp lệ trong 30 ngày liên tiếp', 'STREAK_LOYALTY', 'GOLD', 30, 1000, 'Ý Chí Vàng 🌟', 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=200', (SELECT id FROM badges WHERE code = 'BADGE_THIRTY_DAY_STREAK'), true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('TEN_THOUSAND_POINTS_EARNED', 'Huyền Thoại JourneyGo', 'Đạt tổng cộng 10.000 Journey Points từ hoạt động trên nền tảng', 'STREAK_LOYALTY', 'LEGENDARY', 10000, 2000, 'Huyền Thoại JourneyGo 👑', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200', (SELECT id FROM badges WHERE code = 'BADGE_TEN_THOUSAND_POINTS_EARNED'), true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (code) DO NOTHING;

