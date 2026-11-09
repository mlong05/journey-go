-- Trải nghiệm thực tế có mã QR riêng: khách đến checkpoint → đếm ngược → quét QR tại điểm để xác nhận
-- đã hoàn thành → mới hiện câu hỏi sau trải nghiệm. Định dạng giống QR điểm đến: JGE- + 16 ký tự hex in hoa.
--
-- Không đặt UNIQUE: mỗi lần lưu nháp, trải nghiệm được ghi lại (xóa rồi thêm) và giữ nguyên mã cũ để QR đã in
-- vẫn dùng được; mã ngẫu nhiên 64 bit nên trùng nhau là gần như không thể.
ALTER TABLE tour_stop_experiences ADD COLUMN IF NOT EXISTS qr_token VARCHAR(40);

UPDATE tour_stop_experiences
SET qr_token = 'JGE-' || upper(substr(md5(random()::text || id::text || clock_timestamp()::text), 1, 16))
WHERE qr_token IS NULL;

CREATE INDEX IF NOT EXISTS idx_tour_stop_experiences_qr ON tour_stop_experiences (qr_token);
