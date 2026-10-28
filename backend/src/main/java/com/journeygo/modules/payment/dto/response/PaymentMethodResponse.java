package com.journeygo.modules.payment.dto.response;

import com.journeygo.modules.payment.entity.enums.VnPayPaymentMethod;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

import java.util.List;

/**
 * Danh sách phương thức thanh toán khách hàng có thể chọn.
 *
 * <p>Gồm 3 nhóm phương thức mà VNPay hiển thị trên trang thanh toán (Sandbox) và danh sách
 * ngân hàng / ví điện tử cụ thể lấy từ API chính thức {@code get_bank_list}.
 */
@Builder
@Schema(description = "Các phương thức thanh toán khách hàng có thể chọn")
public record PaymentMethodResponse(

        @Schema(description = "Danh sách phương thức (3 nhóm) — frontend hiển thị để khách chọn")
        List<MethodOption> methods,

        @Schema(description = "Danh sách ngân hàng / ví điện tử chi tiết theo từng nhóm phương thức")
        List<BankGroup> bankGroups,

        @Schema(description = "Có gửi vnp_BankCode hay không trong URL thanh toán — false = khách hàng "
                + "tự chọn phương thức trên trang VNPay (mặc định, đúng với 3 lựa chọn trên Sandbox)")
        boolean bankCodeSent
) {

    @Builder
    @Schema(description = "Một phương thức thanh toán")
    public record MethodOption(
            @Schema(description = "Mã vnp_BankCode tương ứng (null = để khách chọn trên trang VNPay)")
            String bankCode,
            @Schema(description = "Mã phương thức nội bộ") String code,
            @Schema(description = "Tên hiển thị") String label,
            @Schema(description = "Mô tả chi tiết") String description,
            @Schema(description = "Giá trị vnp_CardType VNPay trả về") String cardType,
            @Schema(description = "Thứ tự hiển thị") int displayOrder
    ) {
        public static MethodOption from(VnPayPaymentMethod m) {
            return MethodOption.builder()
                    .bankCode(m.getBankCode())
                    .code(m.name())
                    .label(m.getLabel())
                    .description(m.getDescription())
                    .cardType(m.getCardType())
                    .displayOrder(m.getDisplayOrder())
                    .build();
        }
    }

    @Builder
    @Schema(description = "Nhóm ngân hàng theo phương thức")
    public record BankGroup(
            @Schema(description = "Mã phương thức") String methodCode,
            @Schema(description = "Tên phương thức") String label,
            @Schema(description = "Danh sách ngân hàng cụ thể") List<VnPayBank> banks
    ) {
    }
}
