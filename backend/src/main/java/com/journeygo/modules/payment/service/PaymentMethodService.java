package com.journeygo.modules.payment.service;

import com.journeygo.modules.payment.config.VnPayProperties;
import com.journeygo.modules.payment.dto.response.PaymentMethodResponse;
import com.journeygo.modules.payment.dto.response.VnPayBank;
import com.journeygo.modules.payment.entity.enums.VnPayPaymentMethod;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Payment Method — phương thức thanh toán khách hàng có thể chọn.
 *
 * <p>── QUY ƯỚC ĐÃ THỐNG NHẤT ──
 * Dự án CHỈ hỗ trợ <b>một</b> phương thức thanh toán:
 * <b>"Thẻ nội địa và tài khoản ngân hàng"</b> ({@code DOMESTIC_CARD} / {@code VNBANK}).
 *
 * <p>⇒ {@link #getPaymentMethods()} chỉ trả về nhóm này. Hai nhóm còn lại của VNPay
 * Sandbox — {@code QR_APP_WALLET} (quét mã QR) và {@code INTERNATIONAL_CARD}
 * (thẻ quốc tế) — bị ẨN hoàn toàn khỏi API:
 * <ul>
 *   <li>QR cần ứng dụng ngân hàng thật trên máy khách ⇒ không demo được.</li>
 *   <li>Merchant Sandbox trả {@code code=01} cho mọi giao dịch thẻ quốc tế
 *       (lỗi cấu hình phía VNPay, không phải lỗi tích hợp của ta).</li>
 * </ul>
 *
 * <p>Enum {@link VnPayPaymentMethod} vẫn giữ đủ 3 nhóm vì đó là mã cố định của
 * VNPay và còn dùng để tra cứu khi xác minh chữ ký / đối soát IPN
 * ({@code vnp_CardType} trả về có thể là {@code QRCODE}).
 *
 * <p>Danh sách ngân hàng cụ thể lấy động từ API chính thức {@code get_bank_list}
 * — KHÔNG hardcode. Tuy nhiên nhóm {@code DOMESTIC_CARD} không cần app hiển thị
 * danh sách ngân hàng: mã {@code VNBANK} đã mở thẳng trang có đúng 1 mục
 * "Thẻ nội địa và tài khoản ngân hàng" và khách chọn ngân hàng ngay trên trang VNPay.
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

    /**
     * Phương thức thanh toán DUY NHẤT được phép hiển thị cho khách.
     *
     * <p>Xem javadoc lớp để hiểu vì sao 2 nhóm còn lại bị ẩn.
     */
    public static final VnPayPaymentMethod SUPPORTED_METHOD = VnPayPaymentMethod.DOMESTIC_CARD;

    private final VnPayClient vnPayClient;
    private final VnPayProperties properties;

    /**
     * Lấy danh sách phương thức thanh toán.
     *
     * <p>Chỉ trả về <b>phương thức được hỗ trợ</b> ({@link #SUPPORTED_METHOD}) cùng nhóm
     * ngân hàng tương ứng. Danh sách ngân hàng lấy từ VNPay; nếu gọi lỗi thì danh sách
     * rỗng nhưng API vẫn dùng được (vì app không cần danh sách ngân hàng để thanh toán).
     */
    public PaymentMethodResponse getPaymentMethods() {
        List<PaymentMethodResponse.MethodOption> methods = List.of(
                PaymentMethodResponse.MethodOption.from(SUPPORTED_METHOD));

        List<VnPayBank> banks = vnPayClient.fetchBankList();

        Map<Integer, List<VnPayBank>> byType = banks.stream()
                .filter(b -> b.bankCode() != null && !b.bankCode().isBlank())
                .collect(Collectors.groupingBy(b -> b.bankType() != null ? b.bankType() : 0));

        List<PaymentMethodResponse.BankGroup> groups = new ArrayList<>();
        Integer type = bankTypeFor(SUPPORTED_METHOD);
        List<VnPayBank> groupBanks = type != null ? byType.getOrDefault(type, List.of()) : List.of();
        groups.add(PaymentMethodResponse.BankGroup.builder()
                .methodCode(SUPPORTED_METHOD.name())
                .label(SUPPORTED_METHOD.getLabel())
                .banks(groupBanks)
                .build());

        // bankCodeSent=true nghĩa là URL thanh toán LUÔN gửi vnp_BankCode = VNBANK
        // ⇒ trang VNPay mở thẳng "Thẻ nội địa và tài khoản ngân hàng",
        //   KHÔNG mở trang chọn phương thức (trang đó có cả QR + thẻ quốc tế).
        return PaymentMethodResponse.builder()
                .methods(methods)
                .bankGroups(groups)
                .bankCodeSent(true)
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
