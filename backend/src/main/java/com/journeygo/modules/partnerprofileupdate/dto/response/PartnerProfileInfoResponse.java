package com.journeygo.modules.partnerprofileupdate.dto.response;

import com.journeygo.modules.partnerprofileupdate.entity.PartnerProfileUpdateRequest;
import com.journeygo.modules.partnerprofileupdate.entity.enums.PartnerProfileUpdateStatus;
import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;
import java.util.Map;

/**
 * Gói dữ liệu cho tab "Thông tin đối tác" ở Dashboard của đối tác.
 *
 * @param profile        thông tin hiện tại (read-only) lấy từ hồ sơ chính thức
 * @param applicationId  ID đơn đăng ký gốc
 * @param pendingRequest yêu cầu đổi thông tin đang chờ duyệt (null nếu không có)
 * @param lastRequest    yêu cầu gần nhất (để hiển thị lý do từ chối nếu có)
 * @param history        TOÀN BỘ lịch sử thay đổi của đối tác, xuyên suốt mọi yêu cầu
 *                       (không bị mất khi gửi yêu cầu lần 2, 3…)
 * @param canRequestEdit có được phép gửi yêu cầu mới hay không
 */
@Schema(description = "Thông tin đối tác + trạng thái yêu cầu đổi thông tin")
public record PartnerProfileInfoResponse(
        @Schema(description = "Thông tin hiện tại của đối tác") Map<String, String> profile,
        @Schema(description = "ID đơn đăng ký gốc") Long applicationId,
        @Schema(description = "Yêu cầu đang chờ duyệt") PartnerProfileUpdateResponse pendingRequest,
        @Schema(description = "Yêu cầu gần nhất") PartnerProfileUpdateResponse lastRequest,
        @Schema(description = "Toàn bộ lịch sử thay đổi của đối tác (mới nhất trước)")
        List<PartnerProfileUpdateHistoryResponse> history,
        @Schema(description = "Có thể gửi yêu cầu đổi thông tin mới hay không") boolean canRequestEdit
) {
}
