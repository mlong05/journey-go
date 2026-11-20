-- Loại khách: Admin chỉ quy định tên + độ tuổi. Giá (kể cả miễn phí = 0đ) và việc tính chỗ
-- do đối tác khai báo theo từng tour trong tour_prices.
--
-- Trước đây cờ guest_type_configs.always_free ghi đè khai báo của đối tác lúc chạy
-- (giá 0đ, không chiếm chỗ). Ghi hẳn hành vi đó vào tour_prices để tour hiện có không đổi giá / số chỗ,
-- rồi bỏ cột.

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'guest_type_configs' AND column_name = 'always_free') THEN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tour_prices') THEN
            UPDATE tour_prices tp
            SET price = 0,
                counts_toward_slot = FALSE
            FROM guest_type_configs g
            WHERE g.guest_type = tp.guest_type
              AND g.always_free = TRUE;
        END IF;

        ALTER TABLE guest_type_configs DROP COLUMN always_free;
    END IF;
END $$;
