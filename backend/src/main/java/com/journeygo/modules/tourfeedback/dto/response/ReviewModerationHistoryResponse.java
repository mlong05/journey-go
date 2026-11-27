package com.journeygo.modules.tourfeedback.dto.response;

import com.journeygo.modules.tourfeedback.entity.TourCustomerReviewModerationHistory;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Một dòng lịch sử kiểm duyệt đánh giá tour")
public class ReviewModerationHistoryResponse {

    @Schema(description = "ID dòng lịch sử")
    private Long id;

    @Schema(description = "ID đánh giá")
    private Long reviewId;

    @Schema(description = "Hành động: HIDDEN / RESTORED")
    private String action;

    @Schema(description = "Trạng thái trước thao tác")
    private String fromStatus;

    @Schema(description = "Trạng thái sau thao tác")
    private String toStatus;

    @Schema(description = "ID người thực hiện")
    private Long actorId;

    @Schema(description = "Tên người thực hiện")
    private String actorName;

    @Schema(description = "Lý do thao tác")
    private String reason;

    @Schema(description = "Thời điểm thao tác")
    private Instant createdAt;

    public static ReviewModerationHistoryResponse fromEntity(TourCustomerReviewModerationHistory h) {
        return ReviewModerationHistoryResponse.builder()
                .id(h.getId())
                .reviewId(h.getReview() != null ? h.getReview().getId() : null)
                .action(h.getAction() != null ? h.getAction().name() : null)
                .fromStatus(h.getFromStatus())
                .toStatus(h.getToStatus())
                .actorId(h.getActor() != null ? h.getActor().getId() : null)
                .actorName(h.getActorName())
                .reason(h.getReason())
                .createdAt(h.getCreatedAt())
                .build();
    }
}
