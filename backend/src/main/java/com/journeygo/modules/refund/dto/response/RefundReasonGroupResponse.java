package com.journeygo.modules.refund.dto.response;

import com.journeygo.modules.refund.entity.RefundReasonCode;
import com.journeygo.modules.refund.entity.RefundReasonGroup;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Builder
@Schema(description = "Nhóm lý do hoàn tiền + các mã lý do chi tiết")
public record RefundReasonGroupResponse(

        @Schema(description = "ID nhóm") Long id,
        @Schema(description = "Mã nhóm (PERSONAL | PLATFORM_FAULT | PROVIDER_FAULT | FORCE_MAJEURE)")
        String code,
        @Schema(description = "Tên hiển thị tiếng Việt") String name,
        @Schema(description = "Tỷ lệ hoàn tiền của nhóm (0.50 = 50%)") BigDecimal refundRate,
        @Schema(description = "Mô tả điều kiện áp dụng") String description,
        @Schema(description = "true = nhóm bất khả kháng (không hoàn tiền)") boolean forceMajeure,
        @Schema(description = "Số giờ trước ngày trải nghiệm mà tỷ lệ hoàn bị đưa xuống "
                + "mức `noShowRefundRate` (hủy quá muộn / không xuất hiện). "
                + "null = nhóm này không có mức hoàn 0% riêng.")
        Integer noShowWindowHours,
        @Schema(description = "Tỷ lệ hoàn khi rơi vào cửa sổ no-show (thường 0 = 0%). "
                + "null = nhóm này không có mức hoàn 0% riêng.")
        BigDecimal noShowRefundRate,
        @Schema(description = "Thứ tự hiển thị") int displayOrder,
        @Schema(description = "true = đang bật") boolean active,
        @Schema(description = "Số mã lý do đang bật trong nhóm") int activeCodeCount,
        @Schema(description = "Tên admin tạo / sửa") String createdByName,
        @Schema(description = "Thời điểm tạo") Instant createdAt,
        @Schema(description = "Thời điểm sửa") Instant updatedAt,
        @Schema(description = "Danh sách mã lý do chi tiết") List<RefundReasonCodeResponse> reasonCodes
) {
    public static RefundReasonGroupResponse fromEntity(RefundReasonGroup g,
                                                        List<RefundReasonCode> codes) {
        return fromEntity(g, codes, null, null);
    }

    /**
     * Bản đầy đủ — có thêm thông tin "mức hoàn 0%" của nhóm.
     *
     * @param noShowWindowHours số giờ trước ngày trải nghiệm mà nhóm này bị đưa
     *                          xuống mức hoàn 0%; null = nhóm không có mức 0% riêng
     * @param noShowRefundRate  tỷ lệ hoàn trong cửa sổ đó (thường 0)
     */
    public static RefundReasonGroupResponse fromEntity(RefundReasonGroup g,
                                                        List<RefundReasonCode> codes,
                                                        Integer noShowWindowHours,
                                                        BigDecimal noShowRefundRate) {
        if (g == null) return null;
        return RefundReasonGroupResponse.builder()
                .id(g.getId())
                .code(g.getCode())
                .name(g.getName())
                .refundRate(g.getRefundRate())
                .description(g.getDescription())
                .forceMajeure(g.isForceMajeure())
                .noShowWindowHours(noShowWindowHours)
                .noShowRefundRate(noShowRefundRate)
                .displayOrder(g.getDisplayOrder())
                .active(g.isActive())
                .activeCodeCount((int) codes.stream().filter(RefundReasonCode::isActive).count())
                .createdByName(g.getCreatedBy() != null ? g.getCreatedBy().getFullName() : null)
                .createdAt(g.getCreatedAt())
                .updatedAt(g.getUpdatedAt())
                .reasonCodes(codes.stream().map(RefundReasonCodeResponse::fromEntity).toList())
                .build();
    }

    /** Mã lý do chi tiết. */
    @Builder
    @Schema(description = "Mã lý do hoàn tiền chi tiết")
    public record RefundReasonCodeResponse(
            @Schema(description = "ID mã lý do") Long id,
            @Schema(description = "Mã lý do chi tiết") String code,
            @Schema(description = "Tên hiển thị tiếng Việt") String name,
            @Schema(description = "Điều kiện áp dụng") String conditions,
            @Schema(description = "true = bắt buộc đính kèm bằng chứng") boolean requireEvidence,
            @Schema(description = "Thứ tự hiển thị") int displayOrder,
            @Schema(description = "true = đang bật") boolean active,
            @Schema(description = "Tên admin tạo / sửa") String createdByName,
            @Schema(description = "Thời điểm tạo") Instant createdAt,
            @Schema(description = "Thời điểm sửa") Instant updatedAt
    ) {
        public static RefundReasonCodeResponse fromEntity(RefundReasonCode c) {
            if (c == null) return null;
            return RefundReasonCodeResponse.builder()
                    .id(c.getId())
                    .code(c.getCode())
                    .name(c.getName())
                    .conditions(c.getConditions())
                    .requireEvidence(c.isRequireEvidence())
                    .displayOrder(c.getDisplayOrder())
                    .active(c.isActive())
                    .createdByName(c.getCreatedBy() != null ? c.getCreatedBy().getFullName() : null)
                    .createdAt(c.getCreatedAt())
                    .updatedAt(c.getUpdatedAt())
                    .build();
        }
    }
}
