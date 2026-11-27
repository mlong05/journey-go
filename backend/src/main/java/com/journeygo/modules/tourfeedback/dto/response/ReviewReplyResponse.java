package com.journeygo.modules.tourfeedback.dto.response;

import com.journeygo.modules.tourfeedback.entity.TourCustomerReviewReply;
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
@Schema(description = "Phản hồi của đối tác lên đánh giá tour (cần kiểm duyệt)")
public class ReviewReplyResponse {

    @Schema(description = "ID phản hồi")
    private Long id;

    @Schema(description = "ID đánh giá")
    private Long reviewId;

    @Schema(description = "Nội dung phản hồi")
    private String content;

    @Schema(description = "Trạng thái: PENDING / APPROVED / REJECTED")
    private String status;

    @Schema(description = "ID đối tác viết phản hồi")
    private Long authorId;

    @Schema(description = "Tên đối tác")
    private String authorName;

    @Schema(description = "Tên kiểm duyệt viên đã xử lý")
    private String moderatorName;

    @Schema(description = "Lý do từ chối / ghi chú xử lý")
    private String decisionReason;

    @Schema(description = "Thời điểm xử lý")
    private Instant decidedAt;

    @Schema(description = "Thời điểm gửi")
    private Instant createdAt;

    public static ReviewReplyResponse fromEntity(TourCustomerReviewReply r) {
        return ReviewReplyResponse.builder()
                .id(r.getId())
                .reviewId(r.getReview() != null ? r.getReview().getId() : null)
                .content(r.getContent())
                .status(r.getStatus() != null ? r.getStatus().name() : null)
                .authorId(r.getAuthor() != null ? r.getAuthor().getId() : null)
                .authorName(r.getAuthorName())
                .moderatorName(r.getModeratorName())
                .decisionReason(r.getDecisionReason())
                .decidedAt(r.getDecidedAt())
                .createdAt(r.getCreatedAt())
                .build();
    }
}
