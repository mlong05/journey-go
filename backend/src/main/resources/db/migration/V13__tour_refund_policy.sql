-- "Những thông tin cần lưu ý" — thêm mục Chính sách hỗ trợ hoàn tiền.
ALTER TABLE tours ADD COLUMN IF NOT EXISTS refund_policy TEXT;
