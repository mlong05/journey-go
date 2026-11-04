-- =====================================================================================
--  V4 — Đổi cột request_reason thành note trong bảng destination_requests
-- =====================================================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'destination_requests' AND column_name = 'request_reason'
    ) THEN
        ALTER TABLE destination_requests RENAME COLUMN request_reason TO note;
    ELSE
        ALTER TABLE destination_requests ADD COLUMN IF NOT EXISTS note TEXT;
    END IF;
END $$;
