package com.journeygo.modules.finance.dto.response;

import com.journeygo.modules.finance.entity.CommissionPolicy;
import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.time.Instant;

@Schema(description = "Chính sách hoa hồng")
public record CommissionPolicyResponse(
        @Schema(description = "ID chính sách") Long id,
        @Schema(description = "Tên chính sách") String name,
        @Schema(description = "Tỷ lệ hoa hồng (0.30 = 30%)") BigDecimal commissionRate,
        @Schema(description = "Ngày bắt đầu hiệu lực") Instant effectiveFrom,
        @Schema(description = "Ngày kết thúc hiệu lực (null = chưa xác định)") Instant effectiveTo,
        @Schema(description = "Lý do thay đổi") String changeReason,
        @Schema(description = "ID người thực hiện") Long createdById,
        @Schema(description = "Tên người thực hiện") String createdByName,
        @Schema(description = "Đã hủy hay chưa") boolean cancelled,
        @Schema(description = "Đang có hiệu lực tại thời điểm hiện tại") boolean currentlyEffective,
        @Schema(description = "Chính sách tương lai (chưa tới ngày hiệu lực)") boolean future,
        @Schema(description = "Thời điểm tạo") Instant createdAt
) {

    public static CommissionPolicyResponse fromEntity(CommissionPolicy p) {
        return new CommissionPolicyResponse(
                p.getId(),
                p.getName(),
                p.getCommissionRate(),
                p.getEffectiveFrom(),
                p.getEffectiveTo(),
                p.getChangeReason(),
                p.getCreatedBy() == null ? null : p.getCreatedBy().getId(),
                p.getCreatedBy() == null ? null : p.getCreatedBy().getFullName(),
                p.isCancelled(),
                isCurrentlyEffective(p),
                p.isFuture(),
                p.getCreatedAt()
        );
    }

    /** Chính sách đang có hiệu lực: đã tới ngày bắt đầu và chưa hết ngày kết thúc. */
    public static boolean isCurrentlyEffective(CommissionPolicy p) {
        if (p == null || p.isCancelled() || p.getEffectiveFrom() == null) {
            return false;
        }
        Instant now = Instant.now();
        return !p.getEffectiveFrom().isAfter(now)
                && (p.getEffectiveTo() == null || p.getEffectiveTo().isAfter(now));
    }
}
