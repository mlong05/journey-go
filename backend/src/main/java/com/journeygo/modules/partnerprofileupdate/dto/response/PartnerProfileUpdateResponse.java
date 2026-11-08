package com.journeygo.modules.partnerprofileupdate.dto.response;

import com.journeygo.modules.partnerprofileupdate.entity.PartnerProfileUpdateHistory;
import com.journeygo.modules.partnerprofileupdate.entity.PartnerProfileUpdateRequest;
import com.journeygo.modules.partnerprofileupdate.entity.enums.PartnerProfileUpdateStatus;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@Schema(description = "Yêu cầu đổi thông tin đối tác")
public record PartnerProfileUpdateResponse(

        @Schema(description = "ID yêu cầu") Long id,
        @Schema(description = "Trạng thái yêu cầu") PartnerProfileUpdateStatus status,

        @Schema(description = "ID đối tác gửi yêu cầu") Long partnerUserId,
        @Schema(description = "Tên đối tác") String partnerName,
        @Schema(description = "Email đối tác") String partnerEmail,
        @Schema(description = "Tên doanh nghiệp") String businessName,
        @Schema(description = "ID đơn đăng ký gốc") Long applicationId,

        @Schema(description = "Thông tin hiện tại (trước khi sửa)") Map<String, String> oldData,
        @Schema(description = "Thông tin đề xuất mới") Map<String, String> newData,
        @Schema(description = "Danh sách trường thay đổi") List<String> changedFields,

        @Schema(description = "Lý do từ chối") String reason,
        @Schema(description = "Ghi chú của Admin") String adminNote,
        @Schema(description = "Ghi chú của đối tác") String partnerNote,

        @Schema(description = "Thời điểm gửi yêu cầu") Instant submittedAt,
        @Schema(description = "Thời điểm xử lý") Instant reviewedAt,
        @Schema(description = "Thời điểm tạo") Instant createdAt,

        @Schema(description = "Lịch sử thay đổi") List<PartnerProfileUpdateHistoryResponse> history
) {

    public static PartnerProfileUpdateResponse fromEntity(PartnerProfileUpdateRequest request,
                                                          Map<String, String> oldData,
                                                          Map<String, String> newData,
                                                          List<String> changedFields,
                                                          List<PartnerProfileUpdateHistory> history) {
        return new PartnerProfileUpdateResponse(
                request.getId(),
                request.getStatus(),
                request.getPartner() == null ? null : request.getPartner().getId(),
                request.getPartner() == null ? null : request.getPartner().getFullName(),
                request.getPartner() == null ? null : request.getPartner().getEmail(),
                businessNameOf(oldData, newData),
                request.getApplicationId(),
                oldData,
                newData,
                changedFields,
                request.getReason(),
                request.getAdminNote(),
                request.getPartnerNote(),
                request.getSubmittedAt(),
                request.getReviewedAt(),
                request.getCreatedAt(),
                history == null ? List.of()
                        : history.stream().map(PartnerProfileUpdateHistoryResponse::fromEntity).toList()
        );
    }

    private static String businessNameOf(Map<String, String> oldData, Map<String, String> newData) {
        if (newData != null && newData.get("businessName") != null) {
            return newData.get("businessName");
        }
        return oldData == null ? null : oldData.get("businessName");
    }
}
