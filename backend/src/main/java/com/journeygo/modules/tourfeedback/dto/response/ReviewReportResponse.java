package com.journeygo.modules.tourfeedback.dto.response;

import com.journeygo.modules.tourfeedback.entity.TourCustomerReviewReport;
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
@Schema(description = "Báo cáo vi phạm đối với một đánh giá tour")
public class ReviewReportResponse {

    @Schema(description = "ID báo cáo")
    private Long id;

    @Schema(description = "ID đánh giá bị báo cáo")
    private Long reviewId;

    @Schema(description = "Tên người báo cáo")
    private String reporterName;

    @Schema(description = "Lý do báo cáo")
    private String reason;

    @Schema(description = "Trạng thái: PENDING / RESOLVED / DISMISSED")
    private String status;

    @Schema(description = "Kết quả xử lý")
    private String resolution;

    @Schema(description = "Thời điểm xử lý")
    private Instant handledAt;

    @Schema(description = "Thời điểm báo cáo")
    private Instant createdAt;

    public static ReviewReportResponse fromEntity(TourCustomerReviewReport r) {
        return ReviewReportResponse.builder()
                .id(r.getId())
                .reviewId(r.getReview() != null ? r.getReview().getId() : null)
                .reporterName(r.getReporterName())
                .reason(r.getReason())
                .status(r.getStatus() != null ? r.getStatus().name() : null)
                .resolution(r.getResolution())
                .handledAt(r.getHandledAt())
                .createdAt(r.getCreatedAt())
                .build();
    }
}
