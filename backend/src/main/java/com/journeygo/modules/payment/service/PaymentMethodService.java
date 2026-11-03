package com.journeygo.modules.payment.service;

import com.journeygo.modules.payment.config.VnPayProperties;
import com.journeygo.modules.payment.dto.response.PaymentMethodResponse;
import com.journeygo.modules.payment.dto.response.VnPayBank;
import com.journeygo.modules.payment.entity.enums.VnPayPaymentMethod;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Payment Method — phương thức thanh toán khách hàng có thể chọn.
 *
 * <p>Ba nhóm phương thức trên trang thanh toán VNPay (Sandbox):
 * <ol>
 *   <li><b>Ứng dụng Ngân hàng và Ví điện tử</b> — {@code vnp_BankCode=VNPAYQR} (quét mã QR).</li>
 *   <li><b>Thẻ nội địa và tài khoản ngân hàng</b> — {@code vnp_BankCode=VNBANK} (ATM nội địa).</li>
 *   <li><b>Thẻ thanh toán quốc tế</b> — {@code vnp_BankCode=VISA} (Visa/Master/JCB/UnionPay).</li>
 * </ol>
 *
 * <p>Đây là các mã cố định do VNPay quy định. Danh sách ngân hàng / ví điện tử cụ thể lấy
 * động từ API chính thức {@code get_bank_list} — KHÔNG hardcode.
 *
 * <p>⚠️ Về {@code INTCARD}: mã này được nhiều tài liệu nhắc tới nhưng **VNPay Sandbox
 * KHÔNG chấp nhận** — URL chứa {@code vnp_BankCode=INTCARD} bị fallback về trang chọn
 * phương thức, không mở form nhập thẻ. Mã hợp lệ cho nhóm thẻ quốc tế lấy từ
 * {@code get_bank_list} (bank_type = 3): {@code VISA}, {@code MASTERCARD}, {@code JCB},
 * {@code UPI}, {@code AMEX}. Ta dùng {@code VISA} vì trang đó nhận đủ cả 3 loại thẻ
 * phổ biến (Visa/Mastercard/JCB), còn {@code MASTERCARD}/{@code JCB} chỉ nhận đúng
 * loại thẻ tương ứng.
 *
 * <p>⚠️ Về lỗi "Có lỗi xảy ra trong quá trình xử lý" khi thanh toán THẺ QUỐC TẾ:
 * đã kiểm chứng bằng A/B test trên Sandbox (cùng thẻ test {@code 5200000000001005},
 * cùng số tiền, cùng payload, chỉ khác {@code vnp_TmnCode}):
 * <ul>
 *   <li>{@code CTTVNP01} (merchant DEMO chính thức của VNPay) → {@code code=00},
 *       có {@code notifyUrl} 3DS2 ⇒ giao dịch thành công.</li>
 *   <li>{@code G46V3SQ0} (merchant của dự án) → {@code code=01} "Có lỗi xảy ra...".</li>
 * </ul>
 * ⇒ Đây là lỗi phía VNPay Sandbox với merchant này, KHÔNG phải lỗi tích hợp của ta
 * (hashSecret đã được chứng minh đúng: hash sai → lỗi 70 "Sai chữ ký" ngay ở bước
 * mở form; hash đúng → form thẻ mở bình thường).
 * ⇒ Hành động: báo VNPay Sandbox. Trong lúc chờ, dùng thẻ nội địa / QR để test.
 *
 * <p>Về {@code bank_type}: tài liệu chính thức "Danh sách ứng dụng, ngân hàng liên kết" chia
 * thành 4 mục (QR, deep-link, ATM nội địa, thẻ quốc tế) nhưng KHÔNG nêu rõ mã số tương ứng.
 * Vì vậy mapping được cấu hình qua {@code vnpay.bank-type-mapping.*} để có thể chỉnh lại
 * mà không phải sửa code — xem {@link VnPayProperties#getQrBankType()} và các getter liên quan.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentMethodService {

    private final VnPayClient vnPayClient;
    private final VnPayProperties properties;

    /**
     * Lấy danh sách phương thức thanh toán.
     *
     * <p>Trả về cả 3 nhóm phương thức (luôn có, không phụ thuộc mạng) và danh sách ngân hàng
     * chi tiết (lấy từ VNPay; nếu gọi lỗi thì danh sách rỗng nhưng API vẫn dùng được).
     */
    public PaymentMethodResponse getPaymentMethods() {
        List<PaymentMethodResponse.MethodOption> methods = Arrays.stream(VnPayPaymentMethod.values())
                .sorted(Comparator.comparingInt(VnPayPaymentMethod::getDisplayOrder))
                .map(PaymentMethodResponse.MethodOption::from)
                .toList();

        List<VnPayBank> banks = vnPayClient.fetchBankList();

        Map<Integer, List<VnPayBank>> byType = banks.stream()
                .filter(b -> b.bankCode() != null && !b.bankCode().isBlank())
                .collect(Collectors.groupingBy(b -> b.bankType() != null ? b.bankType() : 0));

        List<PaymentMethodResponse.BankGroup> groups = new ArrayList<>();
        for (VnPayPaymentMethod method : VnPayPaymentMethod.values()) {
            Integer type = bankTypeFor(method);
            List<VnPayBank> groupBanks = type != null ? byType.getOrDefault(type, List.of()) : List.of();
            groups.add(PaymentMethodResponse.BankGroup.builder()
                    .methodCode(method.name())
                    .label(method.getLabel())
                    .banks(groupBanks)
                    .build());
        }

        // bankCodeSent=false nghĩa là URL thanh toán KHÔNG gửi vnp_BankCode →
        // khách hàng tự chọn trên trang VNPay (đúng 3 lựa chọn như Sandbox).
        return PaymentMethodResponse.builder()
                .methods(methods)
                .bankGroups(groups)
                .bankCodeSent(false)
                .build();
    }

    /**
     * Lấy mã {@code bank_type} tương ứng với một nhóm phương thức — lấy từ cấu hình.
     */
    private Integer bankTypeFor(VnPayPaymentMethod method) {
        return switch (method) {
            case QR_APP_WALLET -> properties.getQrBankType();
            case DOMESTIC_CARD -> properties.getDomesticCardBankType();
            case INTERNATIONAL_CARD -> properties.getInternationalCardBankType();
        };
    }
}
