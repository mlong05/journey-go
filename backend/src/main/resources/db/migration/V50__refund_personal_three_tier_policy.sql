-- =====================================================================================
--  V50 — Cập nhật chính sách hoàn tiền nhóm "Lỗi khách hàng" (PERSONAL) theo 3 BẬC.
--
--  ── Chính sách mới ──
--    Từ 7 ngày trở lên                → Hoàn 80%
--    Từ 3 đến 6 ngày (72 giờ – 6 ngày) → Hoàn 50%
--    Dưới 72 giờ (3 ngày) / Không đến  → Hoàn 0%
--
--  ── Vì sao UPDATE chứ không sửa file V26? ──
--  V26 có thể đã được áp dụng trên môi trường dev/prod. Flyway bật
--  `validate-on-migrate: true` ⇒ SỬA NỘI DUNG file V26 sẽ làm checksum
--  không khớp và app KHÔNG KHỞI ĐỘNG ĐƯỢC. Vì vậy mọi thay đổi dữ liệu phải
--  nằm ở migration MỚI.
--
--  ── Vì sao cột `refund_rate` của PERSONAL = 0.80? ──
--  Bảng `refund_reason_groups.refund_rate` lưu tỷ lệ MẶC ĐỊNH của nhóm. Với
--  nhóm PERSONAL, tỷ lệ thực tế được hệ thống tính theo 3 BẬC theo thời điểm
--  hủy (xem `PersonalRefundPolicy`), KHÔNG đọc từ cột này. Cột vẫn được set
--  = 0.80 để:
--    • Admin nhìn thấy đúng mức cao nhất của chính sách trong tab cấu hình;
--    • `RefundReasonConfigService.refundRateOf()` (fallback khi DB chưa có
--      cấu hình) trả về mức hợp lý.
--
--  Migration này idempotent (UPDATE theo `code`) ⇒ chạy lại nhiều lần vẫn an toàn.
-- =====================================================================================

-- ── 1. Nhóm "Lỗi khách hàng" (PERSONAL) ───────────────────────────────────────────
--    Mô tả cũ: "hoàn 50% nếu hủy trước 3 ngày khởi hành; hoàn 0% nếu hủy trong
--    vòng 48 giờ hoặc không xuất hiện" → KHÔNG còn đúng với chính sách 3 bậc.
UPDATE refund_reason_groups
SET refund_rate = 0.8000,
    description = 'Khách hàng chủ động hủy vì lý do cá nhân. Từ 7 ngày trở lên trước khởi hành hoàn 80%; từ 3 đến 6 ngày (72 giờ - 6 ngày) hoàn 50%; dưới 72 giờ (3 ngày) hoặc không xuất hiện hoàn 0%.'
WHERE code = 'PERSONAL';

-- ── 2. Nhóm "Lỗi bất khả kháng" (FORCE_MAJEURE) ───────────────────────────────────
--    Tỷ lệ vốn đã là 0.0000 — chốt lại để chắc chắn khớp với cách Admin xử lý
--    (thiên tai, dịch bệnh, quy hoạch ⇒ hoàn 0%), và mô tả nêu rõ "không hoàn".
UPDATE refund_reason_groups
SET refund_rate = 0.0000,
    description = 'Thiên tai, bão lũ, động đất, dịch bệnh hoặc quyết định hạn chế của cơ quan nhà nước. Theo chính sách hiện hành không hoàn tiền.'
WHERE code = 'FORCE_MAJEURE';
