package com.journeygo.modules.partnerapplication.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Kết quả duyệt đơn đăng ký đối tác")
public record PartnerApplicationDecisionResponse(
        @Schema(description = "Chi tiết đơn sau khi xử lý") PartnerApplicationResponse application,
        @Schema(description = "Tài khoản đối tác đã được cấp (null nếu email đã có tài khoản)") Long grantedUserId,
        @Schema(description = "Tài khoản đã tồn tại trước đó hay không") boolean existingAccount,
        @Schema(description = "Thông báo kết quả") String message
) {
}
