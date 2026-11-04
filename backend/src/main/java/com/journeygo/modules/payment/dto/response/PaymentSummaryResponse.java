package com.journeygo.modules.payment.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

import java.math.BigDecimal;

/**
 * Tổng hợp giao dịch thanh toán TOÀN HỆ THỐNG (ADMIN).
 *
 * <p>Dùng cho các ô chỉ số ở trang "Tài chính &amp; thanh toán".
 *
 * <p>QUAN TRỌNG: các giá trị ở đây là số liệu của TOÀN BỘ hệ thống, KHÔNG phụ thuộc
 * trang hiện tại. Nếu cộng trên `page.content` thì mỗi lần đổi trang sẽ ra con số
 * khác nhau (trang 1 = 10,5 triệu, trang 2 = 6,6 triệu…) → sai lệch đối soát tài chính.
 */
@Builder
@Schema(description = "Tổng hợp giao dịch thanh toán toàn hệ thống")
public record PaymentSummaryResponse(

        @Schema(description = "Tổng số tiền các tour đã thanh toán thành công")
        BigDecimal totalSuccessAmount,

        @Schema(description = "Số giao dịch thành công")
        long successCount,

        @Schema(description = "Số giao dịch đang chờ xác minh (PENDING + PROCESSING)")
        long pendingCount,

        @Schema(description = "Số giao dịch thất bại / đã hủy / hết hạn")
        long failedCount,

        @Schema(description = "Tổng số giao dịn toàn hệ thống")
        long totalCount
) {
    public static PaymentSummaryResponse fromEntity(BigDecimal successAmount, long successCount,
                                                    long pendingCount, long failedCount, long totalCount) {
        return PaymentSummaryResponse.builder()
                .totalSuccessAmount(successAmount)
                .successCount(successCount)
                .pendingCount(pendingCount)
                .failedCount(failedCount)
                .totalCount(totalCount)
                .build();
    }
}
