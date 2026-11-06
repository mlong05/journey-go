package com.journeygo.modules.providerrevenue.dto.response;

import com.journeygo.modules.providerrevenue.entity.enums.DeferredReason;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

import java.math.BigDecimal;
import java.util.List;

/**
 * Kết quả đánh giá điều kiện đủ tư cách tất toán (Mục 5 — 9 điều kiện bắt buộc).
 *
 * @param eligible        true nếu đáp ứng đủ 9 điều kiện
 * @param deferredReason  Lý do chưa đủ điều kiện (null nếu eligible)
 * @param checks          Kết quả chi tiết từng điều kiện để Admin đối soát
 */
@Builder
@Schema(description = "Kết quả đánh giá điều kiện tất toán")
public record EligibilityEvaluationResponse(

        @Schema(description = "Đủ điều kiện tất toán") boolean eligible,
        @Schema(description = "Lý do chưa đủ điều kiện") DeferredReason deferredReason,
        @Schema(description = "Chi tiết 9 điều kiện") List<CheckItem> checks
) {

    @Builder
    @Schema(description = "Kết quả một điều kiện")
    public record CheckItem(
            @Schema(description = "Mã điều kiện") String code,
            @Schema(description = "Mô tả") String description,
            @Schema(description = "Đã đạt") boolean passed,
            @Schema(description = "Chi tiết") String detail
    ) {
    }
}
