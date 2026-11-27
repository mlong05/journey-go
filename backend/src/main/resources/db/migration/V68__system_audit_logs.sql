-- =====================================================================================
--  V68 - Nhat ky kiem toan he thong (System Audit Log)
--
--  MUC DO:
--    Trang /admin/audit-logs hien tai chi la "stub" UI (khong co du lieu). De "truy vet
--    duoc" cac thao tac nhay cam nhu: doi phan quyen, cap nhat diem den, thao tac tai
--    chinh, duyet duyet tour / noi dung, bao loi review... ta can mot bang ghi
--    append-only o cap HE THONG.
--
--  - Append-only: KHONG cap nhat / xoa dong da ghi.
--  - Luu actor (nguoi thuc hien), role, action, entity, ip, ket qua, chi tiet.
--  - Idempotent: CREATE TABLE IF NOT EXISTS => chay lai nhieu lan an toan.
-- =====================================================================================

CREATE TABLE IF NOT EXISTS system_audit_logs (
    id              BIGSERIAL PRIMARY KEY,
    -- Nguoi thuc hien (NULL = thao tac he thong / scheduler)
    actor_id        BIGINT       REFERENCES users (id) ON DELETE SET NULL,
    actor_email     VARCHAR(100),
    actor_role      VARCHAR(40),
    -- Nhom thao tac: AUTH / RBAC / CONTENT / FINANCE / MODERATION / REVIEW / SYSTEM
    category        VARCHAR(40)  NOT NULL,
    -- Hanh dong cu the, vi du: ROLE_CHANGED, TOUR_PUBLISHED, REFUND_APPROVED
    action          VARCHAR(60)  NOT NULL,
    -- Doi tuong bi tac dong: Tour / Booking / Payment / User...
    entity_type     VARCHAR(40),
    entity_id       VARCHAR(64),
    -- Dia chi IP cua nguon yeu cau
    ip_address      VARCHAR(45),
    -- SUCCESS / FAILURE / DENIED
    outcome         VARCHAR(20)  NOT NULL DEFAULT 'SUCCESS',
    -- Chi tiet (JSON hoac text tu do)
    detail          TEXT,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Truy van theo thoi gian (trang danh sach moi nhat truoc) va theo actor / action.
CREATE INDEX IF NOT EXISTS idx_system_audit_created_at ON system_audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_audit_actor      ON system_audit_logs (actor_id);
CREATE INDEX IF NOT EXISTS idx_system_audit_action     ON system_audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_system_audit_category   ON system_audit_logs (category);
CREATE INDEX IF NOT EXISTS idx_system_audit_entity     ON system_audit_logs (entity_type, entity_id);
