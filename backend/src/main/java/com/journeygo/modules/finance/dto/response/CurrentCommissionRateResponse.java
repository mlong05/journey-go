package com.journeygo.modules.finance.dto.response;

import com.journeygo.modules.finance.entity.CommissionPolicy;
import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Tỷ lệ chia lợi nhuận đang áp dụng — bản XEM-ONLY dành cho ĐỐI TÁC
 * (CONTENT_PROVIDER).
 *
 * <p>⚠️ Cố tình KHÔNG expose các trường nội bộ của Admin (người tạo, lý do đổi,
 * cờ cancelled/future, danh sách chính sách) — Đối tác chỉ cần biết:
 * <ol>
 *   <li>Tỷ lệ nền tảng thu bao nhiêu (phần trừ vào doanh thu của họ).</li>
 *   <li>Tỷ lệ họ thực nhận là bao nhiêu (1 − tỷ lệ nền tảng).</li>
 *   <li>Chính sách này có hiệu lực từ khi nào.</li>
 * </ol>
 *
 * <p>⚠️ BR-05 — KHÔNG áp dụng hồi tố: số tiền đã tất toán dùng commission
 * snapshot tại thời điểm duyệt, không tính lại theo tỷ lệ hiện tại. Vì vậy
 * endpoint này CHỈ mang tính thông tin tham khảo cho tour MỚI.
 */
@Schema(description = "Tỷ lệ chia lợi nhuận hiện hành (xem-only, dành cho đối tác)")
public record CurrentCommissionRateResponse(
        @Schema(description = "Tỷ lệ hoa hồng nền tảng (0.20 = 20%)") BigDecimal platformRate,
        @Schema(description = "Tỷ lệ đối tác thực nhận (1 − platformRate)") BigDecimal providerRate,
        @Schema(description = "Tên chính sách") String policyName,
        @Schema(description = "Ngày bắt đầu hiệu lực") Instant effectiveFrom,
        @Schema(description = "Ngày kết thúc hiệu lực (null = chưa xác định)") Instant effectiveTo
) {

    public static CurrentCommissionRateResponse fromEntity(CommissionPolicy p) {
        if (p == null) {
            return null;
        }
        BigDecimal platformRate = p.getCommissionRate();
        BigDecimal providerRate =
                platformRate == null ? null : BigDecimal.ONE.subtract(platformRate);
        return new CurrentCommissionRateResponse(
                platformRate,
                providerRate,
                p.getName(),
                p.getEffectiveFrom(),
                p.getEffectiveTo()
        );
    }
}
