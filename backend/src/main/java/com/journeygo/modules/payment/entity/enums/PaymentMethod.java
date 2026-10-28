package com.journeygo.modules.payment.entity.enums;

import lombok.Getter;

import java.util.Arrays;
import java.util.Optional;

/**
 * Phương thức thanh toán.
 *
 * <p>Hiện tại JourneyGo chỉ tích hợp VNPay, nhưng enum được thiết kế mở để có thể bổ sung
 * cổng khác mà không phá vỡ schema.
 *
 * <p>Trong phạm vi VNPay, phương thức cụ thể được mô tả bởi
 * {@link VnPayPaymentMethod} (3 nhóm hiển thị trên trang thanh toán) và mã ngân hàng cụ
 * thể lấy từ API {@code get_bank_list}.
 */
@Getter
public enum PaymentMethod {
    /** Thanh toán qua cổng VNPay. */
    VNPAY
}
