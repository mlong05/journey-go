-- =====================================================================================
--  V26 — Mở rộng chính sách hoàn tiền:
--    1. Tách "nhóm lý do" (reason group) khỏi "mã lý do chi tiết" (reason code).
--    2. Nhóm lý do do Admin cấu hình trong tab "Cấu hình lý do hoàn tiền" (bảng
--       refund_reason_groups + refund_reason_codes) — KHÔNG hardcode trong code.
--    3. Yêu cầu hoàn tiền lưu thêm mã lý do chi tiết mà Tourist chọn.
--    4. Yêu cầu lưu danh sách file bằng chứng đính kèm (ảnh/video).
--
--  Migrate dữ liệu cũ:
--    declared_reason / approved_reason:
--      TOURIST_FAULT   -> PERSONAL       (nhóm lý do cá nhân, hoàn 50%)
--      PLATFORM_FAULT -> PLATFORM_FAULT (nhóm lý do nền tảng, hoàn 100%)
--
--  Lưu ý: cột cũ khai báo VARCHAR(30) — các mã mới đều <= 30 ký tự nên không
--  cần đổi kiểu dữ liệu.
-- =====================================================================================

-- ── 1. Bảng nhóm lý do hoàn tiền (Admin cấu hình) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS refund_reason_groups (
    id            BIGSERIAL PRIMARY KEY,
    -- Mã nhóm: PERSONAL | PLATFORM_FAULT | PROVIDER_FAULT | FORCE_MAJEURE
    code          VARCHAR(40)  NOT NULL UNIQUE,
    -- Tên hiển thị tiếng Việt (web hiển thị tên này, không hiển thị mã)
    name          VARCHAR(150) NOT NULL,
    -- Tỷ lệ hoàn mặc định của nhóm: 0.50 | 1.00 | 0.00
    refund_rate   NUMERIC(5, 4) NOT NULL DEFAULT 0,
    -- Mô tả chính sách của nhóm (hiển thị cho Tourist ở màn hình gửi yêu cầu)
    description   TEXT,
    -- true = nhóm bất khả kháng → hoàn 0%
    force_majeure BOOLEAN      NOT NULL DEFAULT FALSE,
    -- Thứ tự hiển thị
    display_order INT          NOT NULL DEFAULT 0,
    -- true = đang bật (Admin có thể tắt để không cho chọn nữa)
    active        BOOLEAN      NOT NULL DEFAULT TRUE,
    created_by    BIGINT,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE refund_reason_groups IS 'Nhóm lý do hoàn tiền do Admin cấu hình — không hardcode';

-- ── 2. Bảng mã lý do chi tiết (thuộc một nhóm) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS refund_reason_codes (
    id            BIGSERIAL PRIMARY KEY,
    -- Mã lý do chi tiết, duy nhất toàn hệ thống (VD: HEALTH_ISSUE, PAYMENT_SYSTEM_ERROR)
    code          VARCHAR(60)  NOT NULL UNIQUE,
    -- Nhóm lý do chứa mã này
    group_id      BIGINT       NOT NULL REFERENCES refund_reason_groups (id) ON DELETE CASCADE,
    -- Tên hiển thị tiếng Việt (web hiển thị tên này, không hiển thị mã)
    name          VARCHAR(255) NOT NULL,
    -- Điều kiện áp dụng — mô tả cho Admin đối chiếu bằng chứng
    conditions    TEXT,
    -- Yêu cầu bắt buộc đính kèm bằng chứng (giấy khám bệnh, xác nhận công tác…)
    require_evidence BOOLEAN   NOT NULL DEFAULT FALSE,
    -- Thứ tự hiển thị trong nhóm
    display_order INT          NOT NULL DEFAULT 0,
    active        BOOLEAN      NOT NULL DEFAULT TRUE,
    created_by    BIGINT,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refund_reason_codes_group ON refund_reason_codes (group_id);
CREATE INDEX IF NOT EXISTS idx_refund_reason_codes_active ON refund_reason_codes (active);

COMMENT ON TABLE refund_reason_codes IS 'Mã lý do hoàn tiền chi tiết do Admin cấu hình';

-- ── 3. Yêu cầu hoàn tiền: lưu mã lý do chi tiết + file bằng chứng ────────────────
ALTER TABLE refund_requests ADD COLUMN IF NOT EXISTS declared_reason_code VARCHAR(60);
ALTER TABLE refund_requests ADD COLUMN IF NOT EXISTS approved_reason_code VARCHAR(60);
ALTER TABLE refund_requests ADD COLUMN IF NOT EXISTS evidence_attachments TEXT;

COMMENT ON COLUMN refund_requests.declared_reason_code IS 'Mã lý do chi tiết do Tourist chọn';
COMMENT ON COLUMN refund_requests.approved_reason_code IS 'Mã lý do chi tiết do Admin xác định';
COMMENT ON COLUMN refund_requests.evidence_attachments IS 'Danh sách URL file bằng chứng đính kèm (JSON)';

-- ── 4. Migrate dữ liệu cũ sang nhóm mới ───────────────────────────────────────────
UPDATE refund_requests
SET declared_reason = 'PERSONAL'
WHERE declared_reason = 'TOURIST_FAULT';

UPDATE refund_requests
SET approved_reason = 'PERSONAL'
WHERE approved_reason = 'TOURIST_FAULT';

-- ── 5. Seed 4 nhóm lý do mặc định ─────────────────────────────────────────────────
INSERT INTO refund_reason_groups (code, name, refund_rate, description, force_majeure, display_order)
VALUES
    ('PERSONAL', 'Lỗi khách hàng', 0.5000,
     'Tourist chủ động hủy vì lý do cá nhân. Hoàn 50% nếu hủy trước 3 ngày khởi hành; hoàn 0% nếu hủy trong vòng 48 giờ hoặc không xuất hiện.',
     FALSE, 1),
    ('PLATFORM_FAULT', 'Lỗi nền tảng', 1.0000,
     'JourneyGo gây ra sự cố khiến khách không thể sử dụng dịch vụ đã đặt. Hoàn 100% toàn bộ số tiền.',
     FALSE, 2),
    ('PROVIDER_FAULT', 'Lỗi đối tác', 1.0000,
     'Content Provider không tổ chức hoặc tổ chức không đúng cam kết. Hoàn 100% toàn bộ số tiền.',
     FALSE, 3),
    ('FORCE_MAJEURE', 'Lỗi bất khả kháng', 0.0000,
     'Thiên tai, bão lũ, động đất, dịch bệnh hoặc quyết định hạn chế của cơ quan nhà nước. Theo chính sách hiện hành không hoàn tiền.',
     TRUE, 4)
ON CONFLICT (code) DO NOTHING;

-- ── 6. Seed mã lý do chi tiết mặc định ───────────────────────────────────────────
-- Nhóm PERSONAL — lý do cá nhân (hoàn 50%)
INSERT INTO refund_reason_codes (code, group_id, name, conditions, require_evidence, display_order)
SELECT 'HEALTH_ISSUE', g.id, 'Bị bệnh hoặc gặp vấn đề sức khỏe',
       'Tourist hoặc người tham gia cùng bị bệnh đột xuất, không đủ điều kiện sức khỏe để tham gia tour.',
       TRUE, 1
FROM refund_reason_groups g WHERE g.code = 'PERSONAL'
ON CONFLICT (code) DO NOTHING;

INSERT INTO refund_reason_codes (code, group_id, name, conditions, require_evidence, display_order)
SELECT 'PERSONAL_ACCIDENT', g.id, 'Tai nạn cá nhân',
       'Tourist gặp tai nạn hoặc chấn thương khiến không thể di chuyển đến địa điểm tổ chức.',
       TRUE, 2
FROM refund_reason_groups g WHERE g.code = 'PERSONAL'
ON CONFLICT (code) DO NOTHING;

INSERT INTO refund_reason_codes (code, group_id, name, conditions, require_evidence, display_order)
SELECT 'WORK_EMERGENCY', g.id, 'Công việc đột xuất',
       'Bị yêu cầu làm việc, thay đổi lịch công tác hoặc phát sinh nhiệm vụ công việc không thể từ chối.',
       TRUE, 3
FROM refund_reason_groups g WHERE g.code = 'PERSONAL'
ON CONFLICT (code) DO NOTHING;

INSERT INTO refund_reason_codes (code, group_id, name, conditions, require_evidence, display_order)
SELECT 'PERSONAL_PLAN_CHANGE', g.id, 'Thay đổi kế hoạch cá nhân',
       'Thay đổi lịch trình cá nhân, lịch nghỉ phép hoặc có việc riêng khiến không thể tham gia tour.',
       FALSE, 4
FROM refund_reason_groups g WHERE g.code = 'PERSONAL'
ON CONFLICT (code) DO NOTHING;

INSERT INTO refund_reason_codes (code, group_id, name, conditions, require_evidence, display_order)
SELECT 'FAMILY_EMERGENCY', g.id, 'Vấn đề gia đình',
       'Có việc gia đình đột xuất như người thân cần chăm sóc, tang lễ hoặc sự kiện gia đình khẩn cấp.',
       FALSE, 5
FROM refund_reason_groups g WHERE g.code = 'PERSONAL'
ON CONFLICT (code) DO NOTHING;

INSERT INTO refund_reason_codes (code, group_id, name, conditions, require_evidence, display_order)
SELECT 'TRANSPORT_ISSUE', g.id, 'Không thể di chuyển đến địa điểm',
       'Phát sinh vấn đề phương tiện cá nhân, lỡ chuyến xe hoặc chuyến bay do nguyên nhân thuộc trách nhiệm cá nhân.',
       FALSE, 6
FROM refund_reason_groups g WHERE g.code = 'PERSONAL'
ON CONFLICT (code) DO NOTHING;

-- Nhóm PLATFORM_FAULT — lỗi JourneyGo (hoàn 100%)
INSERT INTO refund_reason_codes (code, group_id, name, conditions, require_evidence, display_order)
SELECT 'PAYMENT_SYSTEM_ERROR', g.id, 'Lỗi hệ thống thanh toán',
       'Hệ thống ghi nhận thanh toán thành công nhưng booking không được xác nhận hoặc không thể cung cấp dịch vụ do lỗi xử lý của JourneyGo.',
       FALSE, 1
FROM refund_reason_groups g WHERE g.code = 'PLATFORM_FAULT'
ON CONFLICT (code) DO NOTHING;

INSERT INTO refund_reason_codes (code, group_id, name, conditions, require_evidence, display_order)
SELECT 'BOOKING_SYSTEM_ERROR', g.id, 'Lỗi hệ thống booking',
       'Booking đã thanh toán nhưng bị mất, bị hủy hoặc không được ghi nhận hợp lệ do lỗi hệ thống.',
       FALSE, 2
FROM refund_reason_groups g WHERE g.code = 'PLATFORM_FAULT'
ON CONFLICT (code) DO NOTHING;

INSERT INTO refund_reason_codes (code, group_id, name, conditions, require_evidence, display_order)
SELECT 'GPS_CHECKIN_ERROR', g.id, 'Lỗi GPS check-in',
       'Hệ thống GPS bị lỗi khiến Tourist không thể xác minh vị trí và tiếp tục trải nghiệm dù Tourist đã đến đúng địa điểm, đáp ứng điều kiện thực tế.',
       FALSE, 3
FROM refund_reason_groups g WHERE g.code = 'PLATFORM_FAULT'
ON CONFLICT (code) DO NOTHING;

INSERT INTO refund_reason_codes (code, group_id, name, conditions, require_evidence, display_order)
SELECT 'EXPERIENCE_UNLOCK_ERROR', g.id, 'Lỗi mở khóa trải nghiệm',
       'Đến đúng ngày và địa điểm nhưng hệ thống không mở khóa Destination hoặc Experience theo lịch trình đã xác nhận.',
       FALSE, 4
FROM refund_reason_groups g WHERE g.code = 'PLATFORM_FAULT'
ON CONFLICT (code) DO NOTHING;

INSERT INTO refund_reason_codes (code, group_id, name, conditions, require_evidence, display_order)
SELECT 'TOUR_INFO_DISPLAY_ERROR', g.id, 'Lỗi hiển thị thông tin tour',
       'JourneyGo hiển thị sai thông tin quan trọng về ngày tổ chức, địa điểm, giá hoặc nội dung trải nghiệm khiến Tourist không thể sử dụng dịch vụ như đã đặt.',
       FALSE, 5
FROM refund_reason_groups g WHERE g.code = 'PLATFORM_FAULT'
ON CONFLICT (code) DO NOTHING;

INSERT INTO refund_reason_codes (code, group_id, name, conditions, require_evidence, display_order)
SELECT 'OVERBOOKING_ERROR', g.id, 'Lỗi quản lý booking',
       'Hệ thống cho phép nhiều khách đặt vượt quá số lượng chỗ thực tế và không thể bố trí dịch vụ thay thế tương đương.',
       FALSE, 6
FROM refund_reason_groups g WHERE g.code = 'PLATFORM_FAULT'
ON CONFLICT (code) DO NOTHING;

INSERT INTO refund_reason_codes (code, group_id, name, conditions, require_evidence, display_order)
SELECT 'SYSTEM_OUTAGE', g.id, 'Gián đoạn hệ thống nghiêm trọng',
       'Website hoặc ứng dụng gặp sự cố kéo dài trong thời gian thực hiện tour, khiến Tourist không thể truy cập các nội dung hoặc trải nghiệm bắt buộc và không có phương án thay thế.',
       FALSE, 7
FROM refund_reason_groups g WHERE g.code = 'PLATFORM_FAULT'
ON CONFLICT (code) DO NOTHING;

-- Nhóm PROVIDER_FAULT — lỗi đối tác (hoàn 100%)
INSERT INTO refund_reason_codes (code, group_id, name, conditions, require_evidence, display_order)
SELECT 'PROVIDER_CANCELLED_TOUR', g.id, 'Đối tác chủ động hủy tour',
       'Content Provider hủy tour sau khi Tourist đã thanh toán và không thể bố trí lịch thay thế phù hợp.',
       FALSE, 1
FROM refund_reason_groups g WHERE g.code = 'PROVIDER_FAULT'
ON CONFLICT (code) DO NOTHING;

INSERT INTO refund_reason_codes (code, group_id, name, conditions, require_evidence, display_order)
SELECT 'PROVIDER_ABSENT', g.id, 'Đối tác không có mặt',
       'Đối tác không đến địa điểm để tổ chức hoạt động đã xác nhận, khiến Tourist không thể tham gia.',
       FALSE, 2
FROM refund_reason_groups g WHERE g.code = 'PROVIDER_FAULT'
ON CONFLICT (code) DO NOTHING;

INSERT INTO refund_reason_codes (code, group_id, name, conditions, require_evidence, display_order)
SELECT 'VENUE_UNAVAILABLE', g.id, 'Địa điểm không thể tiếp nhận khách',
       'Destination đóng cửa, ngừng hoạt động hoặc không cho phép tham quan vào ngày tổ chức do trách nhiệm của đối tác.',
       FALSE, 3
FROM refund_reason_groups g WHERE g.code = 'PROVIDER_FAULT'
ON CONFLICT (code) DO NOTHING;

INSERT INTO refund_reason_codes (code, group_id, name, conditions, require_evidence, display_order)
SELECT 'EXPERIENCE_NOT_PROVIDED', g.id, 'Không cung cấp trải nghiệm đã cam kết',
       'Đối tác không tổ chức Experience đã được công bố và xác nhận trong booking.',
       FALSE, 4
FROM refund_reason_groups g WHERE g.code = 'PROVIDER_FAULT'
ON CONFLICT (code) DO NOTHING;

INSERT INTO refund_reason_codes (code, group_id, name, conditions, require_evidence, display_order)
SELECT 'SERIOUS_SERVICE_MISMATCH', g.id, 'Sai lệch nghiêm trọng so với mô tả',
       'Dịch vụ thực tế khác biệt đáng kể so với nội dung đã công bố, chẳng hạn quảng cáo trải nghiệm làm gốm trực tiếp nhưng thực tế không có hoạt động này.',
       FALSE, 5
FROM refund_reason_groups g WHERE g.code = 'PROVIDER_FAULT'
ON CONFLICT (code) DO NOTHING;

INSERT INTO refund_reason_codes (code, group_id, name, conditions, require_evidence, display_order)
SELECT 'UNSAFE_CONDITIONS', g.id, 'Không đảm bảo điều kiện an toàn',
       'Địa điểm hoặc hoạt động do đối tác tổ chức không đáp ứng điều kiện an toàn cần thiết, khiến Tourist không thể tiếp tục tham gia.',
       FALSE, 6
FROM refund_reason_groups g WHERE g.code = 'PROVIDER_FAULT'
ON CONFLICT (code) DO NOTHING;

INSERT INTO refund_reason_codes (code, group_id, name, conditions, require_evidence, display_order)
SELECT 'PROVIDER_UNJUSTIFIED_REFUSAL', g.id, 'Đối tác từ chối phục vụ không chính đáng',
       'Tourist có booking hợp lệ nhưng bị đối tác từ chối tiếp nhận hoặc cung cấp dịch vụ mà không có căn cứ hợp lệ.',
       FALSE, 7
FROM refund_reason_groups g WHERE g.code = 'PROVIDER_FAULT'
ON CONFLICT (code) DO NOTHING;

-- Nhóm FORCE_MAJEURE — bất khả kháng (hoàn 0%)
INSERT INTO refund_reason_codes (code, group_id, name, conditions, require_evidence, display_order)
SELECT 'NATURAL_DISASTER', g.id, 'Thiên tai, bão lũ, động đất',
       'Thiên tai, bão lũ, động đất khiến không thể tổ chức hoặc tham gia tour.',
       FALSE, 1
FROM refund_reason_groups g WHERE g.code = 'FORCE_MAJEURE'
ON CONFLICT (code) DO NOTHING;

INSERT INTO refund_reason_codes (code, group_id, name, conditions, require_evidence, display_order)
SELECT 'EPIDEMIC_GOVERNMENT_ORDER', g.id, 'Dịch bệnh hoặc quyết định hạn chế của cơ quan nhà nước',
       'Dịch bệnh hoặc quyết định hạn chế của cơ quan nhà nước khiến tour không thể tổ chức hoặc khách không thể tham gia.',
       FALSE, 2
FROM refund_reason_groups g WHERE g.code = 'FORCE_MAJEURE'
ON CONFLICT (code) DO NOTHING;
